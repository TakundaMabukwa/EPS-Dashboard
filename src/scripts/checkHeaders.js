const XLSX = require('xlsx');
const path = require('path');

const file2 = path.join(__dirname, '../../Drivers Details.xlsx');

const wb2 = XLSX.readFile(file2);
const sheet2 = wb2.Sheets[wb2.SheetNames[0]];
const drivers2 = XLSX.utils.sheet_to_json(sheet2);

console.log('Headers in Drivers Details.xlsx:');
if (drivers2.length > 0) {
  console.log(Object.keys(drivers2[0]));
}

console.log('\nFirst row data:');
console.log(drivers2[0]);
