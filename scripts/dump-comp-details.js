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
    if (buf[recOffset] === 0x2a) continue; // deleted
    let fOffset = recOffset + 1;
    const row = {};
    for (const f of fields) {
      const v = buf.slice(fOffset, fOffset + f.length).toString("latin1").trim();
      fOffset += f.length;
      row[f.name] = v;
    }
    rows.push(row);
  }
  return { fields, rows };
}

const dir = path.join(__dirname, "..", "uploads", "testt");
console.log("=== SNMANRC1.DBF ALL ROWS ===");
const rc1 = parseDbf(path.join(dir, "snmanrc1.DBF"));
rc1.rows.forEach((r, i) => {
  console.log(`Row ${i}: CCODE=${r.CCODE}, GSTNO=${r.GSTNO}, EMAIL=${r.EMAIL}, PHONE=${r.PHONE}, NAME=${r.NAME}`);
});

console.log("\n=== SNMANRI1.DBF ALL ROWS ===");
const ri1 = parseDbf(path.join(dir, "snmanri1.DBF"));
ri1.rows.forEach((r, i) => {
  console.log(`Row ${i}: CCODE=${r.CCODE}, FIRDAT=${r.FIRDAT}, LASDAT=${r.LASDAT}, CODE=${r.CODE}, EXTEN=${r.EXTEN}, DEVICE=${r.DEVICE}, DELETE=${r.DELETE}`);
});
