import { NextResponse } from 'next/server'

export async function GET() {
  try {
const HTTP_SERVER_ENDPOINT = process.env.NEXT_PUBLIC_CAN_BUS_ENDPOINT || process.env.NEXT_PUBLIC_EPS_HTTP_SERVER_ENDPOINT || 'http://209.38.217.58:3001'
    const url = `${HTTP_SERVER_ENDPOINT}/api/eps-rewards/daily-performance`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`EPS API error: ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching daily performance data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch daily performance data' },
      { status: 500 }
    )
  }
}
