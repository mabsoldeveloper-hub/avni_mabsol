const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

function parseDbfHeader(buffer) {
  const recordCount = buffer.readUInt32LE(4);
  const headerLength = buffer.readUInt16LE(8);
  const recordLength = buffer.readUInt16LE(10);
  const fields = [];

  let offset = 32;
  while (offset < headerLength - 1) {
    if (buffer[offset] === 0x0d) break;
    const nameBytes = buffer.slice(offset, offset + 11);
    const zeroIndex = nameBytes.indexOf(0);
    const rawName = (zeroIndex >= 0 ? nameBytes.slice(0, zeroIndex) : nameBytes).toString("ascii").trim();
    const type = String.fromCharCode(buffer[offset + 11]);
    const length = buffer[offset + 16];
    fields.push({ name: rawName, type, length, offset });
    offset += 32;
  }
  return { fields, recordCount, headerLength, recordLength };
}

function parseDbfRows(buffer, headerLength, recordLength, fields, recordCount) {
  const rows = [];
  for (let i = 0; i < recordCount; i++) {
    const recOffset = headerLength + i * recordLength;
    if (recOffset + recordLength > buffer.length) break;
    if (buffer[recOffset] === 0x2a) continue; // deleted record
    let fOffset = recOffset + 1;
    const row = {};
    for (const f of fields) {
      const v = buffer.slice(fOffset, fOffset + f.length).toString("latin1").trim();
      fOffset += f.length;
      row[f.name] = v;
    }
    rows.push(row);
  }
  return rows;
}

function readDbfSafe(filePath) {
  if (!fs.existsSync(filePath)) return [];
  try {
    const buf = fs.readFileSync(filePath);
    const { fields, recordCount, headerLength, recordLength } = parseDbfHeader(buf);
    return parseDbfRows(buf, headerLength, recordLength, fields, recordCount);
  } catch (err) {
    console.warn(`[margMasterCombiner] Failed to read DBF: ${filePath}`, err.message);
    return [];
  }
}

/**
 * Headless decryption of Marg master company files using 2.prg logic & MabsolCRM.EXE
 */
async function runMargMasterDecryption(sourceDir, engineDir, outputDir) {
  if (!fs.existsSync(sourceDir)) return false;
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const targetIniFiles = ["snmanrc1.ini", "snmanri1.ini"];
  const presentInis = targetIniFiles.filter(f => fs.existsSync(path.join(sourceDir, f)));

  if (presentInis.length === 0) {
    // If DBFs are already in sourceDir or outputDir, no need to decrypt
    const hasExistingDbfs = fs.existsSync(path.join(sourceDir, "snmanrc1.DBF")) || fs.existsSync(path.join(outputDir, "snmanrc1.DBF"));
    return hasExistingDbfs;
  }

  // Copy INI files to outputDir
  for (const f of presentInis) {
    try {
      const src = path.join(sourceDir, f);
      const dst = path.join(outputDir, f);
      fs.copyFileSync(src, dst);
      try { fs.chmodSync(dst, 0o666); } catch {}
    } catch {}
  }

  // Copy or find efwin11.fll
  let fllPath = path.join(engineDir, "efwin11.fll");
  if (!fs.existsSync(fllPath)) {
    fllPath = path.join(sourceDir, "efwin11.fll");
  }

  const engineBinary = path.join(engineDir, "MabsolCRM.EXE");
  if (!fs.existsSync(engineBinary) || !fs.existsSync(fllPath)) {
    return false;
  }

  const prgPath = path.join(outputDir, "marg_master_decrypt.prg");
  const fpwPath = path.join(outputDir, "marg_master_decrypt.fpw");
  const escapedFll = fllPath.replace(/\\/g, "\\\\");
  const escapedOut = outputDir.replace(/\\/g, "\\\\");

  let prg =
    `ON ERROR QUIT\r\n` +
    `SET NOTIFY OFF\r\n` +
    `SET CONFIRM OFF\r\n` +
    `SET TALK OFF\r\n` +
    `SET SAFETY OFF\r\n` +
    `SET ESCAPE OFF\r\n` +
    `SET DEVELOPMENT OFF\r\n` +
    `SET ECHO OFF\r\n` +
    `_SCREEN.Visible = .F.\r\n` +
    `_SCREEN.Left = -32000\r\n` +
    `CLOSE ALL\r\n` +
    `CLEAR\r\n` +
    `SET DEFAULT TO ("${escapedOut}")\r\n` +
    `LOCAL fllfile, srcfile, outdbf\r\n` +
    `fllfile = "${escapedFll}"\r\n` +
    `IF FILE(fllfile)\r\n` +
    `    TRY\r\n` +
    `        SET LIBRARY TO (fllfile) ADDITIVE\r\n` +
    `    CATCH\r\n` +
    `    ENDTRY\r\n` +
    `ENDIF\r\n\r\n`;

  for (const iniName of presentInis) {
    const baseName = iniName.slice(0, -4);
    prg +=
      `srcfile = "${iniName}"\r\n` +
      `outdbf = "${baseName}.DBF"\r\n` +
      `IF FILE(srcfile)\r\n` +
      `    TRY\r\n` +
      `        = efwdecrypt(srcfile, "THYFGXWREZBDCVAS")\r\n` +
      `        SELECT * FROM (srcfile) INTO CURSOR curdata READWRITE\r\n` +
      `        SELECT curdata\r\n` +
      `        COPY TO (outdbf) TYPE FOX2X\r\n` +
      `        USE IN curdata\r\n` +
      `    CATCH\r\n` +
      `    ENDTRY\r\n` +
      `ENDIF\r\n\r\n`;
  }

  prg +=
    `ON ERROR *\r\n` +
    `SET LIBRARY TO\r\n` +
    `CLOSE ALL\r\n` +
    `QUIT\r\n`;

  const fpw =
    `SCREEN = OFF\r\n` +
    `RESOURCE = OFF\r\n` +
    `TITLE = \r\n` +
    `SYSMENU = OFF\r\n` +
    `STATUS BAR = OFF\r\n` +
    `TALK = OFF\r\n` +
    `SAFETY = OFF\r\n` +
    `COMMAND = DO "${prgPath}"\r\n`;

  fs.writeFileSync(prgPath, prg, "utf8");
  fs.writeFileSync(fpwPath, fpw, "utf8");

  return new Promise((resolve) => {
    try {
      const proc = spawn(engineBinary, ["-t", `-C${fpwPath}`], {
        cwd: outputDir,
        stdio: "ignore",
        windowsHide: true,
      });

      const timer = setTimeout(() => {
        try { proc.kill(); } catch {}
        resolve(true);
      }, 30000);

      proc.on("close", () => {
        clearTimeout(timer);
        resolve(true);
      });

      proc.on("error", () => {
        clearTimeout(timer);
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

/**
 * Combines decrypted snmanrc1.DBF and snmanri1.DBF into unified company documents
 */
function combineMasterDbfs(targetDir) {
  // Check targetDir, fallback to test folder if exists
  let rcPath = path.join(targetDir, "snmanrc1.DBF");
  let riPath = path.join(targetDir, "snmanri1.DBF");

  if (!fs.existsSync(rcPath)) {
    const parentDir = path.dirname(targetDir);
    if (fs.existsSync(path.join(parentDir, "snmanrc1.DBF"))) {
      rcPath = path.join(parentDir, "snmanrc1.DBF");
      riPath = path.join(parentDir, "snmanri1.DBF");
    }
  }

  const rcRows = readDbfSafe(rcPath);
  const riRows = readDbfSafe(riPath);

  if (rcRows.length === 0 && riRows.length === 0) {
    return [];
  }

  const companyMap = new Map();

  for (const rc of rcRows) {
    const ccode = String(rc.CCODE || "").trim().toUpperCase();
    if (!ccode) continue;

    const gstNo = String(rc.GSTNO || "").trim().toUpperCase();
    const shortCode = String(rc.SHORT || "").trim().toUpperCase();
    const rawEmail = String(rc.EMAIL || "").trim().toLowerCase();
    const email = rawEmail.includes("my email") ? "" : rawEmail;
    const rawPhone = String(rc.PHONE || "").trim();
    const phone = rawPhone.includes("landline") ? "" : rawPhone;
    let mobile = "";
    if (phone) {
      const m = phone.match(/\b\d{10}\b/);
      if (m) mobile = m[0];
    }

    const rawName = String(rc.NAME || "").trim();
    const cleanName = rawName && !rawName.includes("Ç") ? rawName : (shortCode ? `${shortCode} Pharma` : `Company ${ccode}`);

    companyMap.set(ccode, {
      ccode,
      gstNo,
      companyName: cleanName,
      shortCode,
      email,
      phone,
      mobile,
      website: String(rc.WEBSITE || "").trim(),
      address: String(rc.ADD || "").trim(),
      city: String(rc.CITY || rc.JURI || "").trim(),
      state: String(rc.STATE || "").trim(),
      country: String(rc.COUNTRY || "India").trim(),
      jurisdiction: String(rc.JURI || "").trim(),
      financialYears: [],
      sourceFiles: ["snmanrc1.DBF", "snmanri1.DBF"]
    });
  }

  // Join snmanri1 rows on CCODE
  for (const ri of riRows) {
    const ccode = String(ri.CCODE || "").trim().toUpperCase();
    if (!ccode) continue;

    if (!companyMap.has(ccode)) {
      companyMap.set(ccode, {
        ccode,
        gstNo: "",
        companyName: `Company ${ccode}`,
        shortCode: ccode,
        email: "",
        phone: "",
        mobile: "",
        financialYears: [],
        sourceFiles: ["snmanri1.DBF"]
      });
    }

    const exten = parseInt(ri.EXTEN || "1", 10) || 1;
    const extenPad = String(exten).padStart(2, "0");
    const companyDataCode = `${ccode}${extenPad}`;

    const startDate = ri.FIRDAT && ri.FIRDAT.length === 8 ? `${ri.FIRDAT.slice(0, 4)}-${ri.FIRDAT.slice(4, 6)}-${ri.FIRDAT.slice(6, 8)}` : "";
    const endDate = ri.LASDAT && ri.LASDAT.length === 8 ? `${ri.LASDAT.slice(0, 4)}-${ri.LASDAT.slice(4, 6)}-${ri.LASDAT.slice(6, 8)}` : "";
    const fyName = ri.FIRDAT && ri.LASDAT ? `${ri.FIRDAT.slice(0, 4)}-${ri.LASDAT.slice(0, 4)}` : "";

    companyMap.get(ccode).financialYears.push({
      exten,
      companyDataCode,
      startDate,
      endDate,
      fyName,
      device: String(ri.DEVICE || "data").trim()
    });
  }

  // Finalize unified documents
  const result = [];
  for (const comp of companyMap.values()) {
    if (comp.financialYears.length === 0) {
      comp.financialYears.push({
        exten: 1,
        companyDataCode: `${comp.ccode}01`,
        startDate: "",
        endDate: "",
        fyName: "Current FY",
        device: "data"
      });
    }
    comp.financialYears.sort((a, b) => a.exten - b.exten);
    comp.totalFinancialYears = comp.financialYears.length;
    comp.activeCompanyDataCode = comp.financialYears[0].companyDataCode;
    result.push(comp);
  }

  return result;
}

module.exports = {
  runMargMasterDecryption,
  combineMasterDbfs,
  readDbfSafe
};
