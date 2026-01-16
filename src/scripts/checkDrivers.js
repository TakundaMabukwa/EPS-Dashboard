const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '../../_DRIVER20260115.xlsx');

console.log('=== Checking Driver Excel File ===\n');

const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);

console.log('Headers:');
if (data.length > 0) {
  console.log(Object.keys(data[0]).join(', '));
}

console.log(`\nTotal rows: ${data.length}`);
console.log('\nFirst 5 drivers:\n');

data.slice(0, 5).forEach((row, idx) => {
  console.log(`Driver ${idx + 1}:`);
  console.log(JSON.stringify(row, null, 2));
  console.log('---\n');
});
