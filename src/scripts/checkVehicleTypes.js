const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

async function checkVehicleTypes() {
  const { data: vehicles, error } = await supabase
    .from('vehiclesc')
    .select('id, registration_number, vehicle_type')
    .limit(100);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Sample vehicles:\n');
  vehicles.forEach(v => {
    console.log(`${v.registration_number} - Type: "${v.vehicle_type}"`);
  });

  // Get unique types
  const types = [...new Set(vehicles.map(v => v.vehicle_type))];
  console.log('\n\nUnique vehicle types found:');
  types.forEach(t => console.log(`  - "${t}"`));
}

checkVehicleTypes()
  .then(() => console.log('\nDone'))
  .catch(err => console.error('Error:', err));
