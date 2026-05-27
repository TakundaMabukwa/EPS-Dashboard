import { NextResponse } from 'next/server'

const BASE_URL = `${process.env.NEXT_PUBLIC_CAN_BUS_ENDPOINT || process.env.NEXT_PUBLIC_EPS_HTTP_SERVER_ENDPOINT || 'http://209.38.217.58:3001'}/api/eps-rewards`

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get('endpoint') || ''
    const forwardedParams = new URLSearchParams(searchParams)
    forwardedParams.delete('endpoint')
    const forwardedQuery = forwardedParams.toString()

    const baseUrl = endpoint ? `${BASE_URL}/${endpoint}` : BASE_URL
    const url = forwardedQuery
      ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${forwardedQuery}`
      : baseUrl
    
    console.log('Fetching from:', url)
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      console.error(`API error: ${response.status} for ${url}`)
      throw new Error(`API error: ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Error fetching EPS rewards data:', error.message)
    
    // Return empty data structure instead of error to prevent UI crashes
    return NextResponse.json(
      { 
        drivers: [],
        error: error.message,
        message: 'Failed to fetch EPS rewards data'
      },
      { status: 200 } // Return 200 to prevent error propagation
    )
  }
}
