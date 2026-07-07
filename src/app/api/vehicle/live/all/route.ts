import { NextResponse } from 'next/server'

const MILEAGE_BASE = 'http://164.90.217.196:8800'

export async function GET() {
  try {
    const res = await fetch(`${MILEAGE_BASE}/api/vehicle/live/all`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(60000),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    console.error('Live vehicles proxy error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to fetch live vehicles' }, { status: 500 })
  }
}
