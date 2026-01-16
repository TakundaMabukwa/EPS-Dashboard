const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

const file1 = path.join(__dirname, '../../_DRIVER20260115.xlsx');
const file2 = path.join(__dirname, '../../Drivers Details.xlsx');

async function updateDriverCodes() {
  console.log('Reading Excel files...\n');

  // Read first file
  const wb1 = XLSX.readFile(file1);
  const sheet1 = wb1.Sheets[wb1.SheetNames[0]];
  const drivers1 = XLSX.utils.sheet_to_json(sheet1);

  // Read second file
  const wb2 = XLSX.readFile(file2);
  const sheet2 = wb2.Sheets[wb2.SheetNames[0]];
  const drivers2 = XLSX.utils.sheet_to_json(sheet2, { range: 1 });

  // Create lookup map from file 2
  const codeMap = new Map();
  drivers2.forEach(d => {
    const fullName = `${d['First Name']} ${d['Last Name']}`.toLowerCase().trim().replace(/\s+/g, ' ');
    codeMap.set(fullName, d.Code);
  });

  // Find matches and prepare updates
  const updates = [];
  drivers1.forEach(d => {
    const nickName = d['Driver Nick Name']?.toLowerCase().trim().replace(/\s+/g, ' ');
    const idNumber = d['ID Number']?.toString().trim();
    if (codeMap.has(nickName) && idNumber) {
      updates.push({
        id_number: idNumber,
        new_code: `EPS${codeMap.get(nickName)}`,
        name: nickName
      });
    }
  });

  console.log(`Found ${updates.length} drivers to update\n`);

  if (updates.length === 0) {
    console.log('No updates needed');
    return;
  }

  // Update each driver in database
  let updated = 0;
  let failed = 0;

  for (const update of updates) {
    const { error } = await supabase
      .from('drivers')
      .update({ driver_code: update.new_code })
      .eq('id_or_passport_number', update.id_number);

    if (error) {
      console.error(`Failed to update ${update.name}: ${error.message}`);
      failed++;
    } else {
      updated++;
    }
  }

  console.log(`\nUpdate complete:`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Failed: ${failed}`);
}

updateDriverCodes()
  .then(() => console.log('\nDone'))
  .catch(err => console.error('Error:', err));
