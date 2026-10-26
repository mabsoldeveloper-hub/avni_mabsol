const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");

function parseDbf(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const buf = fs.readFileSync(filePath);
  const recordCount = buf.readUInt32LE(4);
  const headerLength = buf.readUInt16LE(8);
  const recordLength = buf.readUInt16LE(10);
  const fields = [];

  let offset = 32;
  while (offset < headerLength - 1) {
    if (buf[offset] === 0x0d) break;
    const nameBytes = buf.slice(offset, offset + 11);
    const zeroIndex = nameBytes.indexOf(0);
    const rawName = (zeroIndex >= 0 ? nameBytes.slice(0, zeroIndex) : nameBytes).toString("ascii").trim();
    const type = String.fromCharCode(buf[offset + 11]);
    const length = buf[offset + 16];
    fields.push({ name: rawName, type, length });
    offset += 32;
  }

  const rows = [];
  for (let i = 0; i < recordCount; i++) {
    const recOffset = headerLength + i * recordLength;
    if (recOffset + recordLength > buf.length) break;
    if (buf[recOffset] === 0x2a) continue;
    let fOffset = recOffset + 1;
    const row = {};
    for (const f of fields) {
      const v = buf.slice(fOffset, fOffset + f.length).toString("latin1").trim();
      fOffset += f.length;
      row[f.name] = v;
    }
    rows.push(row);
  }
  return rows;
}

function parseXls(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const wb = XLSX.readFile(filePath);
  const firstSheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(firstSheet);
}

async function seed() {
  const envPath = path.join(__dirname, "..", ".env");
  if (fs.existsSync(envPath)) {
    const envLines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
    for (const l of envLines) {
      const [k, ...v] = l.split("=");
      if (k && v.length) process.env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
    }
  }

  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/crm_mabsol";
  console.log("Connecting to Mongo:", mongoUri.split("@").pop());
  await mongoose.connect(mongoUri);

  const db = mongoose.connection.db;
  const col = db.collection("companycatalogs");

  // Load des.xls (clean names, emails, phones, gst)
  const desXlsPath = path.join(__dirname, "..", "uploads", "des.xls");
  const desRows = parseXls(desXlsPath);

  // Load snmanrc1.DBF and snmanri1.DBF
  const dir = path.join(__dirname, "..", "uploads", "testt");
  const rc1Rows = parseDbf(path.join(dir, "snmanrc1.DBF"));
  const ri1Rows = parseDbf(path.join(dir, "snmanri1.DBF"));

  console.log(`Loaded ${desRows.length} rows from des.xls, ${rc1Rows.length} from rc1, ${ri1Rows.length} from ri1.`);

  const compMap = new Map();

  // First, seed from des.xls
  for (const r of desRows) {
    const ccode = String(r.ccode || "").trim().toUpperCase();
    if (!ccode) continue;
    const gstNo = String(r.gstno || "").trim().toUpperCase();
    const shortCode = String(r.short || "").trim().toUpperCase();
    const email = String(r.email || "").trim().toLowerCase();
    const phone = String(r.phone || "").trim();
    let mobile = "";
    if (phone) {
      const match = phone.match(/\b\d{10}\b/);
      if (match) mobile = match[0];
    }

    compMap.set(ccode, {
      ccode,
      gstNo,
      companyName: r.name && !r.name.includes("Ç") ? r.name : (shortCode ? `${shortCode} Pharma` : `Company ${ccode}`),
      shortCode,
      email: email.includes("my email") ? "" : email,
      phone: phone.includes("landline") ? "" : phone,
      mobile,
      website: r.website || "",
      address: r.add && !r.add.includes("î") ? r.add : "",
      city: r.city && !r.city.includes("î") ? r.city : (r.juri || ""),
      state: r.state || "",
      country: r.country || "India",
      jurisdiction: r.juri || "",
      financialYears: [],
    });
  }

  // Also check rc1Rows
  for (const r of rc1Rows) {
    const ccode = String(r.CCODE || "").trim().toUpperCase();
    if (!ccode) continue;
    if (!compMap.has(ccode)) {
      const gstNo = String(r.GSTNO || "").trim().toUpperCase();
      const shortCode = String(r.SHORT || "").trim().toUpperCase();
      compMap.set(ccode, {
        ccode,
        gstNo,
        companyName: shortCode ? `${shortCode} Pharma` : `Company ${ccode}`,
        shortCode,
        email: "",
        phone: "",
        mobile: "",
        financialYears: []
      });
    }
  }

  // Attach financial years from ri1Rows
  for (const r of ri1Rows) {
    const ccode = String(r.CCODE || "").trim().toUpperCase();
    if (!ccode || !compMap.has(ccode)) continue;

    const exten = parseInt(r.EXTEN || "1", 10) || 1;
    const extenPad = String(exten).padStart(2, "0");
    const companyDataCode = `${ccode}${extenPad}`;

    const startDate = r.FIRDAT ? `${r.FIRDAT.slice(0, 4)}-${r.FIRDAT.slice(4, 6)}-${r.FIRDAT.slice(6, 8)}` : "";
    const endDate = r.LASDAT ? `${r.LASDAT.slice(0, 4)}-${r.LASDAT.slice(4, 6)}-${r.LASDAT.slice(6, 8)}` : "";
    const fyName = r.FIRDAT && r.LASDAT ? `${r.FIRDAT.slice(0, 4)}-${r.LASDAT.slice(0, 4)}` : "";

    compMap.get(ccode).financialYears.push({
      exten,
      companyDataCode,
      startDate,
      endDate,
      fyName,
      device: r.DEVICE || "data"
    });
  }

  // If no FY found from ri1, generate default exten 1
  for (const comp of compMap.values()) {
    if (comp.financialYears.length === 0) {
      comp.financialYears.push({
        exten: 1,
        companyDataCode: `${comp.ccode}01`,
        startDate: "2025-04-01",
        endDate: "2026-03-31",
        fyName: "2025-2026",
        device: "data"
      });
    }
    comp.totalFinancialYears = comp.financialYears.length;
    comp.activeCompanyDataCode = comp.financialYears[0].companyDataCode;
    comp.lastSyncedAt = new Date();

    const filter = comp.gstNo ? { gstNo: comp.gstNo } : { ccode: comp.ccode };
    await col.findOneAndUpdate(filter, { $set: comp }, { upsert: true });
    console.log(`Upserted Company: ${comp.ccode} | GST: ${comp.gstNo} | Short: ${comp.shortCode} | FYs: ${comp.financialYears.map(f => f.companyDataCode).join(", ")}`);
  }

  console.log("Seeding complete!");
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error("Seed error:", err);
  process.exit(1);
});
