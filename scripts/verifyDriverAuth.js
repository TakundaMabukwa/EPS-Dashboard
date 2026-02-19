const { createClient } = require('@supabase/supabase-js')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
)

async function verifyDriverAuth() {
  console.log('🔍 Verifying driver authentication links...\n')

  // Fetch all drivers
  const { data: drivers, error: driversError } = await supabase
    .from('drivers')
    .select('id, first_name, surname, user_id, email_address')
    .order('id')

  if (driversError) {
    console.error('❌ Error fetching drivers:', driversError)
    return
  }

  // Fetch all users
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, role, is_active')

  if (usersError) {
    console.error('❌ Error fetching users:', usersError)
    return
  }

  console.log(`📊 Total drivers: ${drivers.length}`)
  console.log(`📊 Total users: ${users.length}\n`)

  const results = {
    linked: [],
    notLinked: [],
    invalidUserId: [],
    noEmail: []
  }

  for (const driver of drivers) {
    const driverName = `${driver.first_name} ${driver.surname}`.trim()

    // Check if driver has email
    if (!driver.email_address) {
      results.noEmail.push({ ...driver, name: driverName })
      continue
    }

    // Check if driver has user_id
    if (!driver.user_id) {
      results.notLinked.push({ ...driver, name: driverName })
      continue
    }

    // Verify user_id exists in users table
    const user = users.find(u => u.id === driver.user_id)

    if (!user) {
      results.invalidUserId.push({ ...driver, name: driverName })
    } else {
      results.linked.push({ ...driver, name: driverName, userEmail: user.email, isActive: user.is_active })
    }
  }

  // Print results
  console.log('✅ LINKED DRIVERS:', results.linked.length)
  results.linked.forEach(d => {
    console.log(`   - ${d.name} (ID: ${d.id}) → ${d.userEmail} [Active: ${d.isActive}]`)
  })

  console.log('\n⚠️  NOT LINKED (No user_id):', results.notLinked.length)
  results.notLinked.forEach(d => {
    console.log(`   - ${d.name} (ID: ${d.id}) - Email: ${d.email_address}`)
  })

  console.log('\n❌ INVALID user_id:', results.invalidUserId.length)
  results.invalidUserId.forEach(d => {
    console.log(`   - ${d.name} (ID: ${d.id}) - user_id: ${d.user_id}`)
  })

  console.log('\n📧 NO EMAIL:', results.noEmail.length)
  results.noEmail.forEach(d => {
    console.log(`   - ${d.name} (ID: ${d.id})`)
  })

  console.log('\n📈 SUMMARY:')
  console.log(`   Total: ${drivers.length}`)
  console.log(`   Linked: ${results.linked.length}`)
  console.log(`   Not Linked: ${results.notLinked.length}`)
  console.log(`   Invalid user_id: ${results.invalidUserId.length}`)
  console.log(`   No Email: ${results.noEmail.length}`)
}

verifyDriverAuth().catch(console.error)
