import { NextRequest, NextResponse } from 'next/server'

const OPENWEATHER_BASE = 'https://api.openweathermap.org/data/2.5'

interface WeatherData {
  temp: number
  description: string
  icon: string
  wind: number
  humidity: number
  precipitation: number
  time: string
}

interface WeatherResponse {
  current: WeatherData
  forecast: WeatherData[]
  location: { name: string; country: string }
}

function mapWeatherEntry(data: any, time?: string): WeatherData {
  return {
    temp: Math.round(data.main.temp),
    description: data.weather[0]?.description || '',
    icon: data.weather[0]?.icon || '01d',
    wind: Math.round(data.wind.speed * 3.6),
    humidity: data.main.humidity,
    precipitation: data.rain?.['3h'] || data.snow?.['3h'] || 0,
    time: time || data.dt_txt || new Date().toISOString(),
  }
}

async function fetchCurrentWeather(lat: number, lng: number, apiKey: string): Promise<WeatherData> {
  const res = await fetch(
    `${OPENWEATHER_BASE}/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`
  )
  if (!res.ok) throw new Error(`Current weather fetch failed: ${res.status}`)
  const data = await res.json()
  return mapWeatherEntry(data)
}

async function fetchForecast(
  lat: number,
  lng: number,
  apiKey: string
): Promise<WeatherData[]> {
  const res = await fetch(
    `${OPENWEATHER_BASE}/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`
  )
  if (!res.ok) throw new Error(`Forecast fetch failed: ${res.status}`)
  const data = await res.json()
  return (data.list || []).map((entry: any) => mapWeatherEntry(entry, entry.dt_txt))
}

async function reverseGeocode(
  lat: number,
  lng: number,
  apiKey: string
): Promise<{ name: string; country: string }> {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/geo/reverse?lat=${lat}&lon=${lng}&limit=1&appid=${apiKey}`
    )
    if (!res.ok) return { name: '', country: '' }
    const data = await res.json()
    return { name: data[0]?.name || '', country: data[0]?.country || '' }
  } catch {
    return { name: '', country: '' }
  }
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.OPENWEATHER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENWEATHER_API_KEY not configured' }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') || '')
  const lng = parseFloat(searchParams.get('lng') || '')

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
  }

  try {
    const [current, forecast, location] = await Promise.all([
      fetchCurrentWeather(lat, lng, apiKey),
      fetchForecast(lat, lng, apiKey),
      reverseGeocode(lat, lng, apiKey),
    ])

    const response: WeatherResponse = { current, forecast, location }
    return NextResponse.json(response)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Weather fetch failed' }, { status: 500 })
  }
}
