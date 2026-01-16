const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

async function queryDrivers() {
  const { data: drivers, error } = await supabase
    .from('drivers')
    .select('first_name, surname, driver_code, email_address')
    .like('email_address', '%@epsdriver.com')
    .limit(1000);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${drivers.length} drivers with @epsdriver.com email\n`);
  
  drivers.forEach((d, idx) => {
    console.log(`${idx + 1}. ${d.first_name} ${d.surname} - ${d.driver_code} - ${d.email_address}`);
  });
}

queryDrivers()
  .then(() => console.log('\nDone'))
  .catch(err => console.error('Error:', err));
