const { createClient } = require('@supabase/supabase-js')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
)

// Driver codes to update
const driverCodes = {
  'bannanamakua@gmail.com': '31357',
  'Snehopesnethemba34@gmail.com': '31522',
  'luyolo.saziwa@eps-driver.com': '31360',
  'muziwakheewart@gmail.com': '29509',
  'Lazarusmofokeng600@gmail.com': '31301',
  'mchunu@epsdriver.com': '29251'
}

async function updateAndLinkDrivers() {
  console.log('🔄 Updating driver codes and linking drivers...\n')

  // Fetch all auth users
  const { data: authData } = await supabase.auth.admin.listUsers()
  const authUsers = authData.users

  const results = {
    updated: [],
    linked: [],
    created: [],
    failed: []
  }

  for (const [email, code] of Object.entries(driverCodes)) {
    const emailLower = email.toLowerCase()

    // Find driver by email
    const { data: drivers } = await supabase
      .from('drivers')
      .select('*')
      .ilike('email_address', emailLower)
      .single()

    if (!drivers) {
      console.log(`❌ Driver not found: ${email}`)
      results.failed.push({ email, reason: 'Driver not found' })
      continue
    }

    const driverName = `${drivers.first_name} ${drivers.surname}`.trim()

    // Update driver code
    const { error: updateCodeError } = await supabase
      .from('drivers')
      .update({ driver_code: code })
      .eq('id', drivers.id)

    if (updateCodeError) {
      console.log(`❌ Failed to update code for ${driverName}:`, updateCodeError)
      results.failed.push({ email, reason: 'Code update failed' })
      continue
    }

    results.updated.push({ name: driverName, code })
    console.log(`✅ Updated code: ${driverName} → ${code}`)

    // Check if auth user exists
    const authUser = authUsers.find(u => u.email?.toLowerCase() === emailLower)

    if (authUser) {
      // Update password to driver code
      const { error: pwdError } = await supabase.auth.admin.updateUserById(authUser.id, {
        password: code
      })

      if (pwdError) {
        console.log(`⚠️  Failed to update password for ${driverName}`)
      } else {
        console.log(`🔑 Updated password: ${driverName} → ${code}`)
      }

      // Link driver to auth user
      const { error: linkError } = await supabase
        .from('drivers')
        .update({ user_id: authUser.id })
        .eq('id', drivers.id)

      if (linkError) {
        console.log(`❌ Failed to link ${driverName}`)
        results.failed.push({ email, reason: 'Link failed' })
      } else {
        results.linked.push({ name: driverName, email })
        console.log(`🔗 Linked: ${driverName}`)
      }
    } else {
      // Create new auth user with driver code as password
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: emailLower,
        password: code,
        email_confirm: true,
        user_metadata: {
          first_name: drivers.first_name,
          surname: drivers.surname,
          driver_code: code,
          phone: drivers.cell_number
        }
      })

      if (createError) {
        console.log(`❌ Failed to create auth for ${driverName}:`, createError.message)
        results.failed.push({ email, reason: createError.message })
        continue
      }

      // Create user in users table
      await supabase.from('users').insert({
        id: newUser.user.id,
        email: emailLower,
        role: 'driver',
        phone: drivers.cell_number,
        company: 'EPS Courier Services',
        is_active: true,
        first_login: true
      })

      // Link driver to auth user
      const { error: linkError } = await supabase
        .from('drivers')
        .update({ user_id: newUser.user.id })
        .eq('id', drivers.id)

      if (linkError) {
        console.log(`❌ Failed to link ${driverName}`)
        results.failed.push({ email, reason: 'Link failed' })
      } else {
        results.created.push({ name: driverName, email, code })
        console.log(`✅ Created & Linked: ${driverName} (password: ${code})`)
      }
    }

    console.log('')
  }

  console.log('📈 SUMMARY:')
  console.log(`   Codes updated: ${results.updated.length}`)
  console.log(`   Linked existing: ${results.linked.length}`)
  console.log(`   Created new: ${results.created.length}`)
  console.log(`   Failed: ${results.failed.length}`)

  if (results.created.length > 0) {
    console.log('\n🔑 NEW ACCOUNTS (password = driver code):')
    results.created.forEach(d => {
      console.log(`   - ${d.name} (${d.email}) → ${d.code}`)
    })
  }
}

updateAndLinkDrivers().catch(console.error)
