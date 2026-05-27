import { NextResponse } from 'next/server'

const API_BASE = 'http://209.38.217.58:8000/api/vehicles/account/EPSC-0001'

export async function GET(request) {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)
    
    const response = await fetch(API_BASE, {
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Error fetching vehicles:', error)
    
    return NextResponse.json(
      { 
        message: 'Failed to fetch vehicles',
        data: [],
        error: error.message 
      },
      { status: 500 }
    )
  }
}