import { NextRequest, NextResponse } from 'next/server'

const API_BASE = 'http://209.38.217.58:8000/api/vehicles'

let cachedData: any = null
let cachedTime = 0
const CACHE_TTL = 30_000

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const endpoint = searchParams.get('endpoint')
  const plate = searchParams.get('plate')
  const driver = searchParams.get('driver')

  if (!endpoint && cachedData && Date.now() - cachedTime < CACHE_TTL) {
    return NextResponse.json(cachedData, { status: 200 })
  }

  let url: string
  if (endpoint === 'by-plate' && plate) {
    url = `${API_BASE}/reg/${encodeURIComponent(plate)}`
  } else if (endpoint === 'by-driver' && driver) {
    url = API_BASE
  } else {
    url = API_BASE
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 45000)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json', 'Connection': 'close' },
    })

    clearTimeout(timeoutId)
    const data = await response.json()

    if (endpoint === 'by-driver' && driver && Array.isArray(data)) {
      const filtered = data.filter((v: any) => {
        const d = String(v.DriverName || v.driverName || v.driver || '').toLowerCase()
        return d.includes(driver.toLowerCase())
      })
      return NextResponse.json(filtered.length > 0 ? filtered[0] : { error: 'No match', data: [] }, { status: 200 })
    }

    if (!endpoint) {
      cachedData = data
      cachedTime = Date.now()
    }

    return NextResponse.json(data, { status: response.status })
  } catch (error: any) {
    if (cachedData) {
      return NextResponse.json(cachedData, { status: 200 })
    }
    return NextResponse.json({ error: 'Failed to connect', data: [] }, { status: 500 })
  }
}
