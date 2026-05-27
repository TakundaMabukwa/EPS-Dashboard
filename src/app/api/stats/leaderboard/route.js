import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '20'
    const endpoint = process.env.NEXT_PUBLIC_CAN_BUS_ENDPOINT || 'http://165.227.134.97:3001'
    const url = `${endpoint}/api/stats/leaderboard?limit=${limit}`
    
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    })
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching leaderboard:', error.message)
    return NextResponse.json({
      fleet_summary: { total_drivers: 0, average_points: 0, total_violations: 0 },
      best_performers: [],
      worst_performers: [],
      top_speeders: [],
      top_distance: [],
      all_drivers: []
    }, { status: 200 })
  }
}
