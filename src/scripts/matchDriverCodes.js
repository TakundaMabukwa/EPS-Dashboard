const XLSX = require('xlsx');
const path = require('path');

const file1 = path.join(__dirname, '../../_DRIVER20260115.xlsx');
const file2 = path.join(__dirname, '../../Drivers Details.xlsx');

console.log('=== Matching Drivers ===\n');

// Read first file
const wb1 = XLSX.readFile(file1);
const sheet1 = wb1.Sheets[wb1.SheetNames[0]];
const drivers1 = XLSX.utils.sheet_to_json(sheet1);

// Read second file
const wb2 = XLSX.readFile(file2);
const sheet2 = wb2.Sheets[wb2.SheetNames[0]];
const drivers2 = XLSX.utils.sheet_to_json(sheet2, { range: 1 }); // Skip first row

console.log(`File 1 (_DRIVER20260115.xlsx): ${drivers1.length} drivers`);
console.log(`File 2 (Drivers Details.xlsx): ${drivers2.length} drivers\n`);

// Create lookup map from file 2
const codeMap = new Map();
drivers2.forEach(d => {
  const fullName = `${d['First Name']} ${d['Last Name']}`.toLowerCase().trim().replace(/\s+/g, ' ');
  codeMap.set(fullName, d.Code);
});

// Match and show results
let matched = 0;
let unmatched = 0;
const matches = [];

drivers1.forEach(d => {
  const nickName = d['Driver Nick Name']?.toLowerCase().trim().replace(/\s+/g, ' ');
  if (codeMap.has(nickName)) {
    matched++;
    matches.push({
      name: nickName,
      oldCode: d.DriverCode,
      newCode: codeMap.get(nickName)
    });
  } else {
    unmatched++;
  }
});

console.log(`Matched: ${matched}`);
console.log(`Unmatched: ${unmatched}\n`);

console.log('First 10 matches:\n');
matches.slice(0, 10).forEach((m, idx) => {
  console.log(`${idx + 1}. ${m.name}`);
  console.log(`   Old Code: ${m.oldCode} → New Code: ${m.newCode}`);
});

if (matches.length === 0) {
  console.log('\n=== Showing sample data for debugging ===\n');
  console.log('File 1 samples:');
  drivers1.slice(0, 3).forEach(d => {
    console.log(`  "${d['Driver Nick Name']?.toLowerCase().trim()}"`);
  });
  console.log('\nFile 2 samples:');
  drivers2.slice(0, 3).forEach(d => {
    const fullName = `${d['First Name']} ${d['Last Name']}`.toLowerCase().trim();
    console.log(`  "${fullName}" (Code: ${d.Code})`);
  });
}

console.log(`\n\nTotal matches: ${matches.length}`);
