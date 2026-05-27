import { NextRequest, NextResponse } from 'next/server'

const API_BASE = 'http://209.38.217.58:8000/api/vehicles'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const endpoint = searchParams.get('endpoint')
  const plate = searchParams.get('plate')
  const driver = searchParams.get('driver')

  let url: string
  if (endpoint === 'by-plate' && plate) {
    url = `${API_BASE}/reg/${encodeURIComponent(plate)}`
  } else if (endpoint === 'by-driver' && driver) {
    // New API doesn't support by-driver; fetch all and filter server-side
    url = API_BASE
  } else {
    url = API_BASE
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000)

      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json', 'Connection': 'close' },
      })

      clearTimeout(timeoutId)
      const data = await response.json()

      // If by-driver, filter the results
      if (endpoint === 'by-driver' && driver && Array.isArray(data)) {
        const filtered = data.filter((v: any) => {
          const d = String(v.DriverName || v.driverName || v.driver || '').toLowerCase()
          return d.includes(driver.toLowerCase())
        })
        return NextResponse.json(filtered.length > 0 ? filtered[0] : { error: 'No match', data: [] }, { status: 200 })
      }

      return NextResponse.json(data, { status: response.status })

    } catch (error: any) {
      if (attempt === 3) {
        return NextResponse.json({ error: 'Failed to connect', data: [] }, { status: 500 })
      }
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  return NextResponse.json({ error: 'Failed after retries', data: [] }, { status: 500 })
}
