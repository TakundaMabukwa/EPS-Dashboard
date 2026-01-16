const XLSX = require('xlsx');
const path = require('path');

const file1 = path.join(__dirname, '../../_DRIVER20260115.xlsx');
const file2 = path.join(__dirname, '../../Drivers Details.xlsx');

// Read first file
const wb1 = XLSX.readFile(file1);
const sheet1 = wb1.Sheets[wb1.SheetNames[0]];
const drivers1 = XLSX.utils.sheet_to_json(sheet1);

// Read second file
const wb2 = XLSX.readFile(file2);
const sheet2 = wb2.Sheets[wb2.SheetNames[0]];
const drivers2 = XLSX.utils.sheet_to_json(sheet2);

console.log('=== File 1 Sample Names ===\n');
drivers1.slice(0, 5).forEach((d, i) => {
  console.log(`${i + 1}. "${d['Driver Nick Name']}"`);
});

console.log('\n=== File 2 Sample Names ===\n');
drivers2.slice(0, 5).forEach((d, i) => {
  const fullName = `${d['First Name']} ${d['Last Name']}`;
  console.log(`${i + 1}. First: "${d['First Name']}" Last: "${d['Last Name']}" → "${fullName}"`);
  console.log(`   Code: ${d.Code}`);
});
