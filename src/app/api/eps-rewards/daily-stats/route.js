import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const url = 'http://64.227.138.235:3000/api/eps-rewards/daily-stats'
    
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
