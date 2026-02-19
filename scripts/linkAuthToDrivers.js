const { createClient } = require('@supabase/supabase-js')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
)

async function linkAuthToDrivers() {
  console.log('🔗 Linking auth.users to drivers table...\n')

  // Fetch all auth users
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers()
  
  if (authError) {
    console.error('❌ Error fetching auth users:', authError)
    return
  }

  const authUsers = authData.users

  // Fetch all drivers
  const { data: drivers, error: driversError } = await supabase
    .from('drivers')
    .select('id, first_name, surname, email_address, user_id, driver_code')

  if (driversError) {
    console.error('❌ Error fetching drivers:', driversError)
    return
  }

  console.log(`📊 Auth users: ${authUsers.length}`)
  console.log(`📊 Drivers: ${drivers.length}\n`)

  const results = {
    linked: [],
    alreadyLinked: [],
    notFound: [],
    noDriverCode: []
  }

  for (const authUser of authUsers) {
    const authEmail = authUser.email?.toLowerCase()

    // Find matching driver by email
    const driver = drivers.find(d => d.email_address?.toLowerCase() === authEmail)

    if (!driver) {
      results.notFound.push({ email: authUser.email, authId: authUser.id })
      continue
    }

    const driverName = `${driver.first_name} ${driver.surname}`.trim()

    // Check if driver has driver_code
    if (!driver.driver_code) {
      results.noDriverCode.push({ ...driver, name: driverName })
    }

    // Check if already linked
    if (driver.user_id === authUser.id) {
      results.alreadyLinked.push({ ...driver, name: driverName })
      continue
    }

    // Link driver to auth user
    const { error: updateError } = await supabase
      .from('drivers')
      .update({ user_id: authUser.id })
      .eq('id', driver.id)

    if (updateError) {
      console.error(`❌ Failed to link ${driverName}:`, updateError)
    } else {
      results.linked.push({ ...driver, name: driverName, authEmail: authUser.email })
      console.log(`✅ Linked: ${driverName} (${driver.driver_code || 'NO CODE'}) → ${authUser.email}`)
    }
  }

  console.log('\n📈 SUMMARY:')
  console.log(`   Newly linked: ${results.linked.length}`)
  console.log(`   Already linked: ${results.alreadyLinked.length}`)
  console.log(`   Auth users not in drivers: ${results.notFound.length}`)
  console.log(`   Drivers without driver_code: ${results.noDriverCode.length}`)

  if (results.noDriverCode.length > 0) {
    console.log('\n⚠️  DRIVERS WITHOUT DRIVER_CODE:')
    results.noDriverCode.forEach(d => {
      console.log(`   - ${d.name} (ID: ${d.id})`)
    })
  }

  if (results.notFound.length > 0) {
    console.log('\n❌ AUTH USERS NOT IN DRIVERS TABLE:')
    results.notFound.forEach(u => {
      console.log(`   - ${u.email} (auth_id: ${u.authId})`)
    })
  }
}

linkAuthToDrivers().catch(console.error)
