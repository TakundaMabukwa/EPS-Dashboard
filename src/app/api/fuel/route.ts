import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function parseNum(val: unknown): number {
  if (val === null || val === undefined) return 0
  const n = Number(val)
  return Number.isFinite(n) ? n : 0
}

export async function GET() {
  try {
    const endpoint = process.env.NEXT_PUBLIC_ROUTING

    if (!endpoint) {
      console.error('Vehicle API endpoint not configured')
      return NextResponse.json({ error: 'Vehicle API not configured' }, { status: 500 })
    }

    const url = endpoint.replace(/\/+$/, '') + '/api/vehicle/fuel'
    console.log('Fetching fuel data from:', url)
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`)
      throw new Error(`API error: ${response.status}`)
    }

    const json = await response.json()
    const vehicles: any[] = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : []

    const processedData = vehicles
      .filter((v) => v?.data?.['96'])
      .map((vehicle) => {
        const d = vehicle.data || {}

        const fuelLevelPercent = parseNum(d['96']?.value)
        const fuelLevelLitres = fuelLevelPercent > 0 ? Math.round((fuelLevelPercent / 100) * 1000) : 0
        const totalOdometer = parseNum(d['395']?.value)
        const engineSpeed = parseNum(d['BE']?.value)
        const engineTemp = parseNum(d['6E']?.value)
        const totalFuelUsed = parseNum(d['FA']?.value)
        const oilPressure = parseNum(d['2329']?.value)
        const oilTemp = parseNum(d['175C']?.value)
        const engineHours = parseNum(d['247']?.value)

        return {
          plate: vehicle.registration || vehicle.vehicle_id || 'Unknown',
          driverName: vehicle.driver_name || '',
          timestamp: vehicle.updated_at || new Date().toISOString(),
          fuelLevel: fuelLevelLitres,
          engineTemperature: engineTemp,
          totalFuelUsed,
          odometer: totalOdometer,
          engineSpeed,
          oilPressure,
          oilTemp,
          engineHours,
        }
      })

    console.log('Fuel data processed:', processedData.length, 'vehicles')
    return NextResponse.json(processedData)
  } catch (error) {
    console.error('Fuel proxy error:', error)
    return NextResponse.json({ error: 'Failed to fetch fuel data' }, { status: 500 })
  }
}
