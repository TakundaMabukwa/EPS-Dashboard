import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const res = await fetch('http://164.90.217.196:8800/api/vehicle/eta', {
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) throw new Error(`ETA API error: ${res.status}`)

    const json = await res.json()
    const vehicles = json?.data || []

    // Sort by soonest arrival
    const sorted = vehicles
      .filter((v: any) => v.status === 'en_route' && v.estimated_arrival_at)
      .sort((a: any, b: any) => new Date(a.estimated_arrival_at).getTime() - new Date(b.estimated_arrival_at).getTime())

    return NextResponse.json(sorted)
  } catch (error) {
    console.error('ETA fetch error:', error)
    return NextResponse.json([], { status: 500 })
  }
}
