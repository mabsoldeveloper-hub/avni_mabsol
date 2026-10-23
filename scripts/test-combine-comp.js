const fs = require("fs");
const path = require("path");

function parseDbf(filePath) {
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

function combineMargCompanies(rcPath, riPath) {
  const rcRows = parseDbf(rcPath);
  const riRows = parseDbf(riPath);

  const companyMap = new Map();

  for (const rc of rcRows) {
    const ccode = (rc.CCODE || "").trim().toUpperCase();
    if (!ccode) continue;

    const gstNo = (rc.GSTNO || "").trim().toUpperCase();
    const shortCode = (rc.SHORT || "").trim().toUpperCase();
    const email = (rc.EMAIL || "").trim().toLowerCase();
    const phone = (rc.PHONE || "").trim();

    companyMap.set(ccode, {
      ccode,
      gstNo,
      shortCode,
      email: email === "my email id" ? "" : email,
      phone: phone === "landline no" ? "" : phone,
      companyName: rc.NAME || "",
      address: rc.ADD || "",
      city: rc.CITY || "",
      state: rc.STATE || "",
      country: rc.COUNTRY || "India",
      jurisdiction: rc.JURI || "",
      financialYears: []
    });
  }

  // Join riRows on CCODE
  for (const ri of riRows) {
    const ccode = (ri.CCODE || "").trim().toUpperCase();
    if (!ccode || !companyMap.has(ccode)) continue;

    const extenNum = parseInt(ri.EXTEN || "1", 10) || 1;
    const extenPad = String(extenNum).padStart(2, "0");
    const companyDataCode = `${ccode}${extenPad}`; // e.g. B01, B02

    const firdat = ri.FIRDAT ? `${ri.FIRDAT.slice(0, 4)}-${ri.FIRDAT.slice(4, 6)}-${ri.FIRDAT.slice(6, 8)}` : "";
    const lasdat = ri.LASDAT ? `${ri.LASDAT.slice(0, 4)}-${ri.LASDAT.slice(4, 6)}-${ri.LASDAT.slice(6, 8)}` : "";
    const fyName = ri.FIRDAT && ri.LASDAT ? `${ri.FIRDAT.slice(0, 4)}-${ri.LASDAT.slice(0, 4)}` : "";

    companyMap.get(ccode).financialYears.push({
      exten: extenNum,
      companyDataCode,
      startDate: firdat,
      endDate: lasdat,
      fyName,
      device: ri.DEVICE || "data"
    });
  }

  // Finalize each document
  const consolidated = [];
  for (const comp of companyMap.values()) {
    comp.totalFinancialYears = comp.financialYears.length;
    comp.activeCompanyDataCode = comp.financialYears.length > 0
      ? comp.financialYears[0].companyDataCode
      : `${comp.ccode}01`;
    consolidated.push(comp);
  }

  return consolidated;
}

const dir = path.join(__dirname, "..", "uploads", "testt");
const result = combineMargCompanies(path.join(dir, "snmanrc1.DBF"), path.join(dir, "snmanri1.DBF"));

console.log("=== COMBINED 1-DOCUMENT PER COMPANY RESULT ===");
console.log(JSON.stringify(result, null, 2));
