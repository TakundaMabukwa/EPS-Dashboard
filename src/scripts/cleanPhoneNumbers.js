const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

async function cleanPhoneNumbers() {
  const { data: drivers, error } = await supabase
    .from('drivers')
    .select('id, cell_number')
    .not('cell_number', 'is', null);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${drivers.length} drivers with phone numbers\n`);

  let updated = 0;
  let skipped = 0;

  for (const driver of drivers) {
    const cleaned = driver.cell_number.replace(/^[A-Z]+\+/, '+');
    
    if (cleaned !== driver.cell_number) {
      const { error: updateError } = await supabase
        .from('drivers')
        .update({ cell_number: cleaned })
        .eq('id', driver.id);

      if (updateError) {
        console.error(`Failed to update driver ${driver.id}: ${updateError.message}`);
      } else {
        console.log(`✓ ${driver.cell_number} → ${cleaned}`);
        updated++;
      }
    } else {
      skipped++;
    }
  }

  console.log(`\n\nComplete:`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
}

cleanPhoneNumbers()
  .then(() => console.log('\nDone'))
  .catch(err => console.error('Error:', err));
