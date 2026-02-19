const { createClient } = require('@supabase/supabase-js')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
)

async function checkDriversInAuth() {
  console.log('🔍 Checking if unlinked drivers exist in auth.users...\n')

  // Fetch drivers without user_id
  const { data: drivers, error: driversError } = await supabase
    .from('drivers')
    .select('id, first_name, surname, email_address')
    .is('user_id', null)

  if (driversError) {
    console.error('❌ Error fetching drivers:', driversError)
    return
  }

  console.log(`📊 Checking ${drivers.length} drivers...\n`)

  const results = {
    inAuth: [],
    notInAuth: [],
    noEmail: []
  }

  for (const driver of drivers) {
    const driverName = `${driver.first_name} ${driver.surname}`.trim()

    if (!driver.email_address) {
      results.noEmail.push({ ...driver, name: driverName })
      continue
    }

    // Check auth.users
    const { data: authUsers, error } = await supabase.auth.admin.listUsers()
    
    if (error) {
      console.error('❌ Error fetching auth users:', error)
      continue
    }

    const authUser = authUsers.users.find(u => u.email?.toLowerCase() === driver.email_address.toLowerCase())

    if (authUser) {
      results.inAuth.push({ ...driver, name: driverName, authId: authUser.id })
      console.log(`✅ ${driverName} - EXISTS in auth (${authUser.email})`)
    } else {
      results.notInAuth.push({ ...driver, name: driverName })
      console.log(`❌ ${driverName} - NOT in auth (${driver.email_address})`)
    }
  }

  console.log('\n📈 SUMMARY:')
  console.log(`   In auth.users: ${results.inAuth.length}`)
  console.log(`   Not in auth.users: ${results.notInAuth.length}`)
  console.log(`   No email: ${results.noEmail.length}`)

  if (results.inAuth.length > 0) {
    console.log('\n✅ DRIVERS IN AUTH (can be linked):')
    results.inAuth.forEach(d => {
      console.log(`   - ${d.name} (${d.email_address}) → auth_id: ${d.authId}`)
    })
  }

  if (results.notInAuth.length > 0) {
    console.log('\n❌ DRIVERS NOT IN AUTH (need to create accounts):')
    results.notInAuth.forEach(d => {
      console.log(`   - ${d.name} (${d.email_address})`)
    })
  }
}

checkDriversInAuth().catch(console.error)
