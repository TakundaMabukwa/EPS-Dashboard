const { createClient } = require('@supabase/supabase-js')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
)

async function checkDriverCodes() {
  const { data: drivers } = await supabase
    .from('drivers')
    .select('id, first_name, surname, email_address, driver_code')
    .is('user_id', null)

  console.log('UNLINKED DRIVERS:\n')
  drivers.forEach(d => {
    const name = `${d.first_name} ${d.surname}`.trim()
    const code = d.driver_code || 'NO CODE'
    console.log(`- ${name} (${d.email_address}) - Code: ${code}`)
  })
}

checkDriverCodes()
