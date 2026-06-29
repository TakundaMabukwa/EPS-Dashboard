import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const response = await fetch('http://164.90.217.196:8800/api/vehicle/live/all', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      console.error(`Live API error: ${response.status} ${response.statusText}`)
      return NextResponse.json([], { status: response.status })
    }

    const json = await response.json()
    const vehicles = json?.data || json || []

    return NextResponse.json(vehicles)
  } catch (error: any) {
    console.error('Vehicle live all error:', error?.message || error)
    return NextResponse.json([], { status: 500 })
  }
}
