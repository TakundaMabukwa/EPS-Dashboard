const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

async function verifyDriverSignup() {
  console.log('Fetching drivers without user accounts...\n');

  const { data: drivers, error: fetchError } = await supabase
    .from('drivers')
    .select('id, first_name, surname, email_address, cell_number, driver_code, user_id')
    .is('user_id', null)
    .like('email_address', '%@epsdriver.com');

  if (fetchError) {
    console.error('Error fetching drivers:', fetchError);
    return;
  }

  console.log(`Found ${drivers.length} drivers to sign up\n`);

  console.log('First 10 drivers that will be created:\n');
  drivers.slice(0, 10).forEach((d, idx) => {
    console.log(`${idx + 1}. ${d.first_name} ${d.surname}`);
    console.log(`   Email: ${d.email_address}`);
    console.log(`   Phone: ${d.cell_number}`);
    console.log(`   Driver Code (Password): ${d.driver_code}`);
    console.log(`   Driver ID: ${d.id}`);
    console.log('---');
  });

  console.log(`\n\nTotal: ${drivers.length} drivers will be signed up`);
  console.log('\nRun: node src/scripts/signupDrivers.js');
}

verifyDriverSignup()
  .then(() => console.log('\nVerification complete'))
  .catch(err => console.error('Error:', err));
