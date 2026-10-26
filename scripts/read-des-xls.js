const XLSX = require("xlsx");
const path = require("path");

const wb = XLSX.readFile(path.join(__dirname, "..", "uploads", "des.xls"));
console.log("Sheet Names:", wb.SheetNames);

for (const name of wb.SheetNames) {
  console.log(`\n=== SHEET: ${name} ===`);
  const sheet = wb.Sheets[name];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log("Total rows:", data.length);
  data.slice(0, 10).forEach((r, idx) => {
    console.log(`Row ${idx}:`, JSON.stringify(r));
  });
}
