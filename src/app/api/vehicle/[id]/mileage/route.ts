import { NextRequest, NextResponse } from 'next/server'

const MILEAGE_BASE = 'http://164.90.217.196:8800'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    let url = `${MILEAGE_BASE}/api/vehicle/${encodeURIComponent(id)}/mileage`
    const qs = new URLSearchParams()
    if (from) qs.set('from', from)
    if (to) qs.set('to', to)
    const qsStr = qs.toString()
    if (qsStr) url += `?${qsStr}`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    clearTimeout(timeout)

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    console.error('Mileage proxy error:', err)
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch mileage' },
      { status: 500 }
    )
  }
}
