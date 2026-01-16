const XLSX = require('xlsx');
const path = require('path');

function checkExcelFile(filePath) {
  console.log(`\n=== Checking: ${path.basename(filePath)} ===\n`);
  
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  console.log('Headers:');
  if (data.length > 0) {
    console.log(Object.keys(data[0]).join(', '));
  }
  
  console.log(`\nTotal rows: ${data.length}`);
  console.log('\nFirst 5 rows:\n');
  
  data.slice(0, 5).forEach((row, idx) => {
    console.log(`Row ${idx + 1}:`);
    console.log(JSON.stringify(row, null, 2));
    console.log('---');
  });
}

const file1 = path.join(__dirname, '../../Vehicle Export20251120.xlsx');
const file2 = path.join(__dirname, '../../Vehicle Export20260115.xlsx');

try {
  checkExcelFile(file1);
} catch (err) {
  console.error('Error reading first file:', err.message);
}

try {
  checkExcelFile(file2);
} catch (err) {
  console.error('Error reading second file:', err.message);
}
