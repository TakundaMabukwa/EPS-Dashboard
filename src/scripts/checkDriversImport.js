const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

function parseDate(value) {
  if (!value) return null;
  const str = String(value).trim();
  if (str === '01/02/2010') return null;
  if (value instanceof Date) return value.toISOString().split('T')[0];
  const parts = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (parts) {
    const [, day, month, year] = parts;
    return `${year}-${month}-${day}`;
  }
  return null;
}

function cleanPhone(value) {
  if (!value) return null;
  const str = String(value).trim();
  if (str.includes('TERM') || str.includes('term')) return null;
  return str.replace(/[GWC]\+/, '+');
}

function splitName(fullName) {
  if (!fullName) return { first_name: null, surname: null, email: null };
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) return { first_name: parts[0], surname: null, email: `${parts[0].toLowerCase()}@epsdriver.com` };
  const surname = parts[parts.length - 1];
  const first_name = parts.slice(0, -1).join(' ');
  const email = `${surname.toLowerCase()}@epsdriver.com`;
  return { first_name, surname, email };
}

async function checkDrivers(filePath) {
  console.log('Reading Excel file...');
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);

  console.log(`Found ${data.length} drivers in Excel file\n`);

  const { data: existingDrivers } = await supabase
    .from('drivers')
    .select('id_or_passport_number');

  const existingIds = new Set(
    existingDrivers?.map(d => d.id_or_passport_number?.trim()) || []
  );

  console.log(`Existing drivers in DB: ${existingIds.size}\n`);

  const newDrivers = data
    .filter(row => {
      const idNum = row['ID Number']?.toString().trim();
      return idNum && !existingIds.has(idNum);
    })
    .map(row => {
      const { first_name, surname, email } = splitName(row['Driver Nick Name']);
      return {
        driver_code: row.DriverCode ? `EPS${row.DriverCode}` : null,
        first_name,
        surname,
        email_address: email,
        id_or_passport_number: row['ID Number']?.toString().trim() || null,
        cell_number: cleanPhone(row.CellNumber),
        sa_issued: true,
        license_expiry_date: parseDate(row['License Date']),
        professional_driving_permit: !!row['PDP Date'],
        pdp_expiry_date: parseDate(row['PDP Date']),
        appointment_date: parseDate(row['Appointment Date']),
        hazCamDate: parseDate(row['HazChem Date']),
        medic_exam_date: parseDate(row['Medical Examination Date']),
        passport_expiry: parseDate(row['Passport Date']),
        available: true
      };
    });

  console.log(`${newDrivers.length} new drivers to import\n`);

  if (newDrivers.length === 0) {
    console.log('No new drivers to import');
    return;
  }

  console.log('First 5 drivers that will be imported:\n');
  newDrivers.slice(0, 5).forEach((driver, idx) => {
    console.log(`Driver ${idx + 1}:`);
    console.log(JSON.stringify(driver, null, 2));
    console.log('---\n');
  });

  console.log(`\nREADY TO IMPORT ${newDrivers.length} DRIVERS`);
  console.log('Run: node src/scripts/importDrivers.js');
}

const filePath = path.join(__dirname, '../../_DRIVER20260115.xlsx');
checkDrivers(filePath)
  .then(() => console.log('\nCheck complete'))
  .catch(err => console.error('Check failed:', err));
