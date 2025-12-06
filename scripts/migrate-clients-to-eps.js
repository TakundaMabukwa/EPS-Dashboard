const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://ihegfiqnobewpwcewrae.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloZWdmaXFub2Jld3B3Y2V3cmFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNzAzNjAsImV4cCI6MjA3NTg0NjM2MH0.xaxkB2Br7cQTQRD-PSheiKTY3Rg3jvqsA_pQn1JWS2I'

const supabase = createClient(supabaseUrl, supabaseKey)

// Mapbox geocoding for South African addresses
async function geocodeAddress(address) {
  if (!address || address.trim() === '') return null
  
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?` +
      `access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&` +
      `country=za&` +
      `limit=1`
    )
    
    const data = await response.json()
    
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center
      console.log(`✓ Geocoded: ${address} -> ${lng},${lat}`)
      return `${lng},${lat}`
    }
    
    await new Promise(resolve => setTimeout(resolve, 100))
  } catch (error) {
    console.error(`Geocoding failed for: ${address}`, error.message)
  }
  
  console.warn(`⚠ Could not geocode: ${address}`)
  return null
}

async function migrateClientsToEps() {
  try {
    // Fetch all clients
    const { data: clients, error } = await supabase
      .from('clients')
      .select('*')
    
    if (error) throw error
    
    console.log(`Found ${clients.length} clients to migrate`)
    
    const migratedData = []
    
    for (const client of clients) {
      // Convert address to coordinates
      const coords = await geocodeAddress(client.address)
      
      const epsClient = {
        name: client.name || client.customer,
        email: client.email,
        phone: client.phone,
        address: client.address,
        street: client.street,
        city: client.city,
        state: client.state,
        country: client.country,
        coords: coords || client.coords,
        coordinates: coords || client.coords,
        industry: client.industry,
        ck_number: client.ck_number,
        tax_number: client.tax_number,
        vat_number: client.vat_number,
        status: client.status,
        client_id: client.client_id,
        pickup_locations: client.pickup_locations,
        dropoff_locations: client.dropoff_locations,
        credit_limit: client.credit_limit,
        postal_code: client.postal_code,
        fax_number: client.fax_number,
        vat_registered: client.vat_registered,
        dormant_flag: client.dormant_flag,
        registration_number: client.registration_number,
        registration_name: client.registration_name,
        contact_person: client.contact_person,
        type: 'client'
      }
      
      migratedData.push(epsClient)
      
      if (migratedData.length % 10 === 0) {
        console.log(`Processed ${migratedData.length}/${clients.length} clients`)
      }
    }
    
    // Insert in batches
    const batchSize = 50
    let successCount = 0
    
    for (let i = 0; i < migratedData.length; i += batchSize) {
      const batch = migratedData.slice(i, i + batchSize)
      
      const { error } = await supabase
        .from('eps_client_list')
        .insert(batch)
      
      if (error) {
        console.error(`Error inserting batch ${Math.floor(i/batchSize) + 1}:`, error)
      } else {
        successCount += batch.length
        console.log(`Inserted batch ${Math.floor(i/batchSize) + 1} (${batch.length} records)`)
      }
    }
    
    console.log(`Migration completed: ${successCount}/${clients.length} clients migrated`)
    
  } catch (error) {
    console.error('Migration failed:', error)
  }
}

// Usage: node migrate-clients-to-eps.js (reads from .env.local)
require('dotenv').config({ path: '../.env.local' })

if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
  console.log('Please set NEXT_PUBLIC_MAPBOX_TOKEN in .env.local')
  process.exit(1)
}

migrateClientsToEps()