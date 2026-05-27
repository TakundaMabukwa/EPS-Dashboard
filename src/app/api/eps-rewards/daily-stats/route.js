import { NextResponse } from 'next/server'

export async function GET() {
  try {
const HTTP_SERVER_ENDPOINT = process.env.NEXT_PUBLIC_CAN_BUS_ENDPOINT || process.env.NEXT_PUBLIC_EPS_HTTP_SERVER_ENDPOINT || 'http://209.38.217.58:3001'
    const url = `${HTTP_SERVER_ENDPOINT}/api/eps-rewards/daily-stats`
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)
    
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store'
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching daily stats:', error.message)
    return NextResponse.json([], { status: 200 })
  }
}
