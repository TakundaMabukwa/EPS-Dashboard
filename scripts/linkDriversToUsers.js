const { createClient } = require('@supabase/supabase-js')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
)

async function linkDriversToUsers() {
  console.log('🔗 Linking drivers to users...\n')

  // Fetch drivers without user_id
  const { data: drivers, error: driversError } = await supabase
    .from('drivers')
    .select('id, first_name, surname, email_address, user_id')
    .is('user_id', null)

  if (driversError) {
    console.error('❌ Error fetching drivers:', driversError)
    return
  }

  // Fetch all users
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, role')

  if (usersError) {
    console.error('❌ Error fetching users:', usersError)
    return
  }

  console.log(`📊 Drivers without user_id: ${drivers.length}`)
  console.log(`📊 Total users: ${users.length}\n`)

  const results = {
    linked: [],
    notFound: []
  }

  for (const driver of drivers) {
    const driverName = `${driver.first_name} ${driver.surname}`.trim()
    const driverEmail = driver.email_address?.toLowerCase()

    if (!driverEmail) {
      results.notFound.push({ ...driver, name: driverName, reason: 'No email' })
      continue
    }

    // Find matching user by email
    const user = users.find(u => u.email?.toLowerCase() === driverEmail)

    if (user) {
      // Update driver with user_id
      const { error: updateError } = await supabase
        .from('drivers')
        .update({ user_id: user.id })
        .eq('id', driver.id)

      if (updateError) {
        console.error(`❌ Failed to link ${driverName}:`, updateError)
        results.notFound.push({ ...driver, name: driverName, reason: 'Update failed' })
      } else {
        results.linked.push({ ...driver, name: driverName, userEmail: user.email })
        console.log(`✅ Linked: ${driverName} → ${user.email}`)
      }
    } else {
      results.notFound.push({ ...driver, name: driverName, reason: 'No matching user' })
    }
  }

  console.log('\n📈 SUMMARY:')
  console.log(`   Successfully linked: ${results.linked.length}`)
  console.log(`   Not found: ${results.notFound.length}`)

  if (results.notFound.length > 0) {
    console.log('\n⚠️  DRIVERS NOT LINKED:')
    results.notFound.forEach(d => {
      console.log(`   - ${d.name} (${d.email_address}) - ${d.reason}`)
    })
  }
}

linkDriversToUsers().catch(console.error)
