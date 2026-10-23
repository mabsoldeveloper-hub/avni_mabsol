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
      if (v) row[f.name] = v;
    }
    rows.push(row);
  }
  return { fields, rows };
}

const dir = path.join(__dirname, "..", "uploads", "testt");
const rc1 = parseDbf(path.join(dir, "snmanrc1.DBF"));
console.log("Non-empty fields in snmanrc1.DBF:");
rc1.rows.forEach((r, i) => {
  console.log(`\n--- Record ${i} ---`);
  console.log(r);
});
