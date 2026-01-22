import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tripId = searchParams.get('tripId')
    
    if (!tripId) {
      return NextResponse.json({ error: 'Trip ID required' }, { status: 400 })
    }

    const response = await fetch(`http://64.227.126.176:3001/api/trips/${tripId}/route?company=eps`)
    
    if (!response.ok) {
      const error = await response.text()
      console.error('Routing server error:', error)
      return NextResponse.json({ error: 'Failed to fetch route from server' }, { status: response.status })
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching trip route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
