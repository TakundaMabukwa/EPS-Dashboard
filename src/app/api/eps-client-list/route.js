import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    let allData = []
    let from = 0
    const batchSize = 1000
    
    while (true) {
      const { data, error } = await supabase
        .from('eps_client_list')
        .select('*')
        .not('name', 'is', null)
        .order('name')
        .range(from, from + batchSize - 1)
      
      if (error) {
        console.error('Supabase error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      
      if (!data || data.length === 0) break
      
      allData = [...allData, ...data]
      
      if (data.length < batchSize) break
      
      from += batchSize
    }
    
    return NextResponse.json({ data: allData })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      name, client_id, address, city, state, country,
      coords, coordinates,
      contact_person, contact_phone, contact_email,
      email, phone, industry, ck_number, tax_number, vat_number,
      status, postal_code, fax_number, registration_number, registration_name,
      type, operating_hours, capacity, notes, credit_limit,
      vat_registered, dormant_flag, facilities,
      pickup_locations, dropoff_locations,
    } = body

    const insertPayload = {
      name: name || null,
      client_id: client_id || null,
      address: address || null,
      city: city || null,
      state: state || null,
      country: country || null,
      coords: coords || null,
      coordinates: coordinates || null,
      contact_person: contact_person || null,
      contact_phone: contact_phone || null,
      contact_email: contact_email || null,
      email: email || null,
      phone: phone || null,
      industry: industry || null,
      ck_number: ck_number || null,
      tax_number: tax_number || null,
      vat_number: vat_number || null,
      status: status || 'Active',
      postal_code: postal_code || null,
      fax_number: fax_number || null,
      registration_number: registration_number || null,
      registration_name: registration_name || null,
      type: type || 'warehouse',
      operating_hours: operating_hours || null,
      capacity: capacity || null,
      notes: notes || null,
      credit_limit: credit_limit ? Number(credit_limit) : 0,
      vat_registered: vat_registered || false,
      dormant_flag: dormant_flag || false,
      facilities: facilities || null,
      pickup_locations: pickup_locations || [],
      dropoff_locations: dropoff_locations || [],
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('eps_client_list')
      .insert([insertPayload])
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { id } = body
    if (!id) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 })
    }

    const {
      name, client_id, address, city, state, country,
      coords, coordinates,
      contact_person, contact_phone, contact_email,
      email, phone, industry, ck_number, tax_number, vat_number,
      status, postal_code, fax_number, registration_number, registration_name,
      type, operating_hours, capacity, notes, credit_limit,
      vat_registered, dormant_flag, facilities,
      pickup_locations, dropoff_locations,
    } = body

    const updatePayload = {
      name: name || null,
      client_id: client_id || null,
      address: address || null,
      city: city || null,
      state: state || null,
      country: country || null,
      coords: coords || null,
      coordinates: coordinates || null,
      contact_person: contact_person || null,
      contact_phone: contact_phone || null,
      contact_email: contact_email || null,
      email: email || null,
      phone: phone || null,
      industry: industry || null,
      ck_number: ck_number || null,
      tax_number: tax_number || null,
      vat_number: vat_number || null,
      status: status || 'Active',
      postal_code: postal_code || null,
      fax_number: fax_number || null,
      registration_number: registration_number || null,
      registration_name: registration_name || null,
      type: type || 'warehouse',
      operating_hours: operating_hours || null,
      capacity: capacity || null,
      notes: notes || null,
      credit_limit: credit_limit ? Number(credit_limit) : 0,
      vat_registered: vat_registered || false,
      dormant_flag: dormant_flag || false,
      facilities: facilities || null,
      pickup_locations: pickup_locations || [],
      dropoff_locations: dropoff_locations || [],
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('eps_client_list')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Supabase update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
