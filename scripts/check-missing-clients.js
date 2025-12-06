const { createClient } = require('@supabase/supabase-js')
const XLSX = require('xlsx')

const supabaseUrl = 'https://ihegfiqnobewpwcewrae.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloZWdmaXFub2Jld3B3Y2V3cmFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNzAzNjAsImV4cCI6MjA3NTg0NjM2MH0.xaxkB2Br7cQTQRD-PSheiKTY3Rg3jvqsA_pQn1JWS2I'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkMissingClients() {
  try {
    // Read Excel file
    const filePath = '../DrmasterExport20251024 (2).xlsx'
    const workbook = XLSX.readFile(filePath)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

    // Check Excel structure first
    console.log('Excel headers:', data[0])
    console.log('First few rows:', data.slice(1, 5))
    
    // Find the correct column for Acc No
    const headers = data[0] || []
    const accNoColumnIndex = headers.findIndex(header => 
      header && header.toString().toLowerCase().includes('acc')
    )
    
    console.log(`Acc No column found at index: ${accNoColumnIndex}`)
    
    if (accNoColumnIndex === -1) {
      console.error('Could not find Acc No column in Excel headers')
      return
    }
    
    // Extract Acc No from correct column
    const excelAccNos = data.slice(1)
      .map(row => row[accNoColumnIndex]?.toString().trim())
      .filter(accNo => accNo && accNo !== '' && !accNo.includes('/'))

    console.log(`Found ${excelAccNos.length} Acc No entries in Excel`)
    console.log('Sample Acc Nos:', excelAccNos.slice(0, 10))

    // Get all client_codes from eps_client_list starting from id 7234
    const { data: epsClients, error } = await supabase
      .from('eps_client_list')
      .select('client_id')
      .gte('id', 7234)

    if (error) throw error

    const epsClientCodes = new Set(
      epsClients
        .map(client => client.client_id?.toString().trim())
        .filter(id => id)
    )

    console.log(`Found ${epsClientCodes.size} client codes in eps_client_list`)
    console.log('Sample client codes:', Array.from(epsClientCodes).slice(0, 10))

    // Find missing clients
    const missingClients = excelAccNos.filter(accNo => !epsClientCodes.has(accNo))

    console.log('\n=== MISSING CLIENTS ===')
    console.log(`${missingClients.length} clients from Excel are NOT in eps_clients_list:`)
    
    if (missingClients.length > 0) {
      missingClients.forEach((accNo, index) => {
        console.log(`${index + 1}. ${accNo}`)
      })
    } else {
      console.log('All Excel clients are present in eps_clients_list!')
    }

    // Find extra clients in database
    const excelAccNoSet = new Set(excelAccNos)
    const extraClients = Array.from(epsClientCodes).filter(clientId => !excelAccNoSet.has(clientId))

    console.log('\n=== EXTRA CLIENTS ===')
    console.log(`${extraClients.length} clients in eps_clients_list are NOT in Excel:`)
    
    if (extraClients.length > 0) {
      extraClients.slice(0, 10).forEach((clientId, index) => {
        console.log(`${index + 1}. ${clientId}`)
      })
      if (extraClients.length > 10) {
        console.log(`... and ${extraClients.length - 10} more`)
      }
    }

  } catch (error) {
    console.error('Check failed:', error)
  }
}

checkMissingClients()