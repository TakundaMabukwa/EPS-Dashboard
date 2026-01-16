const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function signupDrivers() {
  console.log('Fetching drivers without user accounts...\n');

  const { data: drivers, error: fetchError } = await supabase
    .from('drivers')
    .select('id, email_address, cell_number, driver_code')
    .is('user_id', null)
    .like('email_address', '%@epsdriver.com');

  if (fetchError) {
    console.error('Error fetching drivers:', fetchError);
    return;
  }

  console.log(`Found ${drivers.length} drivers to sign up\n`);

  let created = 0;
  let failed = 0;

  for (const driver of drivers) {
    const password = driver.driver_code || 'EPS12345';
    
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: driver.email_address,
      password: password,
      email_confirm: true,
      user_metadata: {
        role: 'driver',
      },
    });

    if (authError) {
      console.error(`Failed to create auth user for ${driver.email_address}: ${authError.message}`);
      failed++;
      continue;
    }

    const userId = authUser.user?.id;
    if (!userId) {
      console.error(`No user ID returned for ${driver.email_address}`);
      failed++;
      continue;
    }

    const { error: userError } = await supabase.from('users').insert({
      id: userId,
      email: driver.email_address,
      phone: driver.cell_number,
      role: 'driver',
      tech_admin: false,
      first_login: true,
      energyrite: false,
      company: 'EPS Courier Services',
      is_active: true
    });

    if (userError) {
      console.error(`Failed to insert user for ${driver.email_address}: ${userError.message}`);
      failed++;
      continue;
    }

    const { error: updateError } = await supabase
      .from('drivers')
      .update({ user_id: userId })
      .eq('id', driver.id);

    if (updateError) {
      console.error(`Failed to update driver ${driver.email_address}: ${updateError.message}`);
      failed++;
      continue;
    }

    created++;
    console.log(`✓ Created user for ${driver.email_address}`);
  }

  console.log(`\n\nComplete:`);
  console.log(`  Created: ${created}`);
  console.log(`  Failed: ${failed}`);
}

signupDrivers()
  .then(() => console.log('\nDone'))
  .catch(err => console.error('Error:', err));
