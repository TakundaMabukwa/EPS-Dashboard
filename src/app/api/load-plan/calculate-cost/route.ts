import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { calculateTripCost } from '@/lib/cost-engine'

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      vehicleType,
      distanceKm,
      tripDays = 1,
      monthLabel = '',
    } = body

    if (!vehicleType || !distanceKm) {
      return NextResponse.json(
        { error: 'vehicleType and distanceKm are required' },
        { status: 400 }
      )
    }

    let fuelLinkRate = 0

    if (monthLabel) {
      const supabase = await getSupabase()
      const { data: fuelRow } = await supabase
        .from('fuel_prices_history')
        .select('link_rate')
        .eq('month_label', monthLabel)
        .single()

      if (fuelRow) {
        fuelLinkRate = Number(fuelRow.link_rate)
      }
    }

    const result = calculateTripCost({
      vehicleType,
      distanceKm,
      tripDays,
      fuelLinkRate,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Calculate cost error:', error)
    return NextResponse.json({ error: 'Failed to calculate trip cost' }, { status: 500 })
  }
}
