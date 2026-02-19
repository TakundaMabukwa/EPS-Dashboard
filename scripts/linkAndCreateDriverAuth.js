const { createClient } = require('@supabase/supabase-js')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
)

async function linkAndCreateDriverAuth() {
  console.log('🔗 Linking and creating driver auth accounts...\n')

  // Fetch drivers without user_id
  const { data: drivers, error: driversError } = await supabase
    .from('drivers')
    .select('id, first_name, surname, email_address, user_id, driver_code, cell_number')
    .is('user_id', null)

  if (driversError) {
    console.error('❌ Error fetching drivers:', driversError)
    return
  }

  // Fetch all auth users
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers()
  
  if (authError) {
    console.error('❌ Error fetching auth users:', authError)
    return
  }

  const authUsers = authData.users

  console.log(`📊 Drivers to process: ${drivers.length}\n`)

  const results = {
    linked: [],
    created: [],
    failed: [],
    skipped: []
  }

  for (const driver of drivers) {
    const driverName = `${driver.first_name} ${driver.surname}`.trim()
    const driverEmail = driver.email_address?.toLowerCase()

    if (!driverEmail) {
      results.skipped.push({ ...driver, name: driverName, reason: 'No email' })
      continue
    }

    // Skip test accounts
    if (driverEmail.includes('test@driver')) {
      results.skipped.push({ ...driver, name: driverName, reason: 'Test account' })
      continue
    }

    // Check if auth user exists
    const authUser = authUsers.find(u => u.email?.toLowerCase() === driverEmail)

    if (authUser) {
      // Link existing auth user
      const { error: updateError } = await supabase
        .from('drivers')
        .update({ user_id: authUser.id })
        .eq('id', driver.id)

      if (updateError) {
        console.error(`❌ Failed to link ${driverName}:`, updateError)
        results.failed.push({ ...driver, name: driverName, reason: updateError.message })
      } else {
        results.linked.push({ ...driver, name: driverName })
        console.log(`✅ Linked: ${driverName} → ${driverEmail}`)
      }
    } else {
      // Create new auth user
      const defaultPassword = 'Driver@2025'
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: driverEmail,
        password: defaultPassword,
        email_confirm: true,
        user_metadata: {
          first_name: driver.first_name,
          surname: driver.surname,
          driver_code: driver.driver_code,
          phone: driver.cell_number
        }
      })

      if (createError) {
        console.error(`❌ Failed to create auth for ${driverName}:`, createError)
        results.failed.push({ ...driver, name: driverName, reason: createError.message })
        continue
      }

      // Create user in users table
      const { error: userTableError } = await supabase
        .from('users')
        .insert({
          id: newUser.user.id,
          email: driverEmail,
          role: 'driver',
          phone: driver.cell_number,
          company: 'EPS Courier Services',
          is_active: true,
          first_login: true
        })

      if (userTableError) {
        console.error(`⚠️  Auth created but users table failed for ${driverName}:`, userTableError)
      }

      // Link driver to auth user
      const { error: updateError } = await supabase
        .from('drivers')
        .update({ user_id: newUser.user.id })
        .eq('id', driver.id)

      if (updateError) {
        console.error(`❌ Failed to link ${driverName}:`, updateError)
        results.failed.push({ ...driver, name: driverName, reason: updateError.message })
      } else {
        results.created.push({ ...driver, name: driverName, email: driverEmail })
        console.log(`✅ Created & Linked: ${driverName} → ${driverEmail} (password: ${defaultPassword})`)
      }
    }
  }

  console.log('\n📈 SUMMARY:')
  console.log(`   Linked existing: ${results.linked.length}`)
  console.log(`   Created new: ${results.created.length}`)
  console.log(`   Failed: ${results.failed.length}`)
  console.log(`   Skipped: ${results.skipped.length}`)

  if (results.created.length > 0) {
    console.log('\n🔑 NEW ACCOUNTS CREATED (Default password: Driver@2025):')
    results.created.forEach(d => {
      console.log(`   - ${d.name} (${d.email})`)
    })
  }

  if (results.failed.length > 0) {
    console.log('\n❌ FAILED:')
    results.failed.forEach(d => {
      console.log(`   - ${d.name}: ${d.reason}`)
    })
  }
}

linkAndCreateDriverAuth().catch(console.error)
