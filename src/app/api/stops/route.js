import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('stop_points')
      .select('*')
      .order('name', { ascending: true, nullsLast: true })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
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
      name, name2, type, address, street, city, state, country,
      coords, coordinates, style_url, color, outline, value, radius,
      contact_person, contact_phone, contact_email,
      operating_hours, capacity, notes, facilities,
    } = body

    const insertPayload = {
      name: name || null,
      name2: name2 || name || null,
      type: type || 'client',
      address: address || null,
      street: street || null,
      city: city || null,
      state: state || null,
      country: country || null,
      coords: coords || null,
      coordinates: coordinates || null,
      style_url: style_url || null,
      color: color || null,
      outline: outline || null,
      value: value || null,
      radius: radius ? Number(radius) : 100,
      contact_person: contact_person || null,
      contact_phone: contact_phone || null,
      contact_email: contact_email || null,
      operating_hours: operating_hours || null,
      capacity: capacity || null,
      notes: notes || null,
      facilities: facilities || null,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('stop_points')
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
      return NextResponse.json({ error: 'Stop ID is required' }, { status: 400 })
    }

    const {
      name, name2, type, address, street, city, state, country,
      coords, coordinates, style_url, color, outline, value, radius,
      contact_person, contact_phone, contact_email,
      operating_hours, capacity, notes, facilities,
    } = body

    const updatePayload = {
      name: name || null,
      name2: name2 || name || null,
      type: type || 'client',
      address: address || null,
      street: street || null,
      city: city || null,
      state: state || null,
      country: country || null,
      coords: coords || null,
      coordinates: coordinates || null,
      style_url: style_url || null,
      color: color || null,
      outline: outline || null,
      value: value || null,
      radius: radius ? Number(radius) : 100,
      contact_person: contact_person || null,
      contact_phone: contact_phone || null,
      contact_email: contact_email || null,
      operating_hours: operating_hours || null,
      capacity: capacity || null,
      notes: notes || null,
      facilities: facilities || null,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('stop_points')
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
