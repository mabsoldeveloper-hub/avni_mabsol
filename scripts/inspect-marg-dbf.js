const fs = require("fs");
const path = require("path");

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
    const decimalCount = buffer[offset + 17];
    fields.push({ name: rawName, type, length, decimalCount, offset });
    offset += 32;
  }
  return { fields, recordCount, headerLength, recordLength };
}

function parseRows(buffer, headerLength, recordLength, fields, recordCount) {
  const rows = [];
  for (let i = 0; i < Math.min(recordCount, 10); i++) {
    const recOffset = headerLength + i * recordLength;
    if (recOffset + recordLength > buffer.length) break;
    const isDeleted = buffer[recOffset] === 0x2a;
    if (isDeleted) continue;
    let fieldOffset = recOffset + 1;
    const row = {};
    for (const f of fields) {
      const valBuf = buffer.slice(fieldOffset, fieldOffset + f.length);
      fieldOffset += f.length;
      row[f.name] = valBuf.toString("latin1").trim();
    }
    rows.push(row);
  }
  return rows;
}

const dir = path.join(__dirname, "..", "uploads", "testt");
const files = fs.readdirSync(dir).filter(f => f.endsWith(".DBF"));

console.log("=== MARG DBF INSPECTION ===");
for (const file of files) {
  const filePath = path.join(dir, file);
  const buf = fs.readFileSync(filePath);
  const { fields, recordCount } = parseDbfHeader(buf);
  console.log(`\nFILE: ${file} (Total Records: ${recordCount})`);
  console.log("Fields:", fields.map(f => `${f.name}(${f.type},${f.length})`).join(", "));
  const sample = parseRows(buf, parseDbfHeader(buf).headerLength, parseDbfHeader(buf).recordLength, fields, recordCount);
  console.log("Sample Rows (up to 3):");
  sample.slice(0, 3).forEach((r, idx) => console.log(` [${idx}]:`, JSON.stringify(r)));
}
