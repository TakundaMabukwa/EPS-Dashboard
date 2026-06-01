import { NextRequest, NextResponse } from 'next/server'

type LookupResult = {
  id: string
  name: string
  address: string
  coordinates: [number, number] | null
  type: 'geocode' | 'place'
  city?: string
  state?: string
  country?: string
}

const GOOGLE_GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json'
const GOOGLE_TEXT_SEARCH_URL = 'https://maps.googleapis.com/maps/api/place/textsearch/json'
const COUNTRY_BIAS = ['za', 'bw', 'zw', 'zm', 'mz', 'mw', 'na', 'sz', 'ls', 'ao', 'cd', 'tz', 'ke', 'ug']

const normalizeResultKey = (result: LookupResult) =>
  `${result.name.toLowerCase()}|${result.address.toLowerCase()}|${result.coordinates?.join(',') || ''}`

const normalizeLookupText = (value: string) =>
  String(value || '')
    .toLowerCase()
    .replace(/[+/,-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const isPlusCodeLike = (value: string) => /\b[A-Z0-9]{4}\+[A-Z0-9]{2,}\b/i.test(String(value || ''))

const scoreLookupResult = (query: string, result: LookupResult) => {
  const normalizedQuery = normalizeLookupText(query)
  const queryParts = normalizedQuery.split(' ').filter(Boolean)
  const normalizedName = normalizeLookupText(result.name)
  const normalizedAddress = normalizeLookupText(result.address)
  const haystack = `${normalizedName} ${normalizedAddress}`.trim()

  let score = result.type === 'place' ? 80 : 35

  if (normalizedName === normalizedQuery) score += 220
  if (normalizedAddress === normalizedQuery) score += 180
  if (normalizedName.includes(normalizedQuery)) score += 120
  if (normalizedAddress.includes(normalizedQuery)) score += 90

  queryParts.forEach((part) => {
    if (normalizedName.includes(part)) score += 40
    if (normalizedAddress.includes(part)) score += 25
  })

  if (queryParts.length > 1 && queryParts.every((part) => haystack.includes(part))) {
    score += 100
  }

  if (normalizedName === 'south africa' || normalizedAddress === 'south africa') score -= 200
  if (isPlusCodeLike(result.name) && !isPlusCodeLike(query)) score -= 160
  if (isPlusCodeLike(result.address) && !isPlusCodeLike(query)) score -= 120
  if (normalizedName.length <= 4 && queryParts.length > 1) score -= 80

  return score
}

const toLookupResult = (
  raw: {
    place_id?: string
    formatted_address?: string
    name?: string
    geometry?: { location?: { lat?: number; lng?: number } }
    address_components?: Array<{ long_name?: string; short_name?: string; types?: string[] }>
  },
  type: 'geocode' | 'place'
): LookupResult | null => {
  const lat = raw.geometry?.location?.lat
  const lng = raw.geometry?.location?.lng
  const address = String(raw.formatted_address || '').trim()
  const name = String(raw.name || address.split(',')[0] || address || '').trim()
  const components = Array.isArray(raw.address_components) ? raw.address_components : []
  const findComponent = (...wantedTypes: string[]) =>
    components.find((component) =>
      Array.isArray(component.types) && wantedTypes.some((wantedType) => component.types?.includes(wantedType))
    )?.long_name || ''

  if (!name && !address) return null

  return {
    id: String(raw.place_id || `${type}:${name}:${address}`),
    name: name || address,
    address: address || name,
    coordinates:
      Number.isFinite(lat) && Number.isFinite(lng)
        ? [Number(lng), Number(lat)]
        : null,
    type,
    city: findComponent('locality', 'postal_town', 'administrative_area_level_2'),
    state: findComponent('administrative_area_level_1'),
    country: findComponent('country'),
  }
}

async function fetchGoogleGeocode(query: string, apiKey: string) {
  const params = new URLSearchParams({
    address: query,
    key: apiKey,
    language: 'en',
    region: 'za',
    components: COUNTRY_BIAS.map((country) => `country:${country}`).join('|'),
  })

  const response = await fetch(`${GOOGLE_GEOCODE_URL}?${params.toString()}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })

  const data = await response.json()

  if (!response.ok || (data?.status && !['OK', 'ZERO_RESULTS'].includes(data.status))) {
    throw new Error(data?.error_message || data?.status || 'Google geocode lookup failed')
  }

  return Array.isArray(data?.results) ? data.results : []
}

async function fetchGoogleTextSearch(query: string, apiKey: string) {
  const params = new URLSearchParams({
    query,
    key: apiKey,
    language: 'en',
    region: 'za',
  })

  const response = await fetch(`${GOOGLE_TEXT_SEARCH_URL}?${params.toString()}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })

  const data = await response.json()

  if (!response.ok || (data?.status && !['OK', 'ZERO_RESULTS'].includes(data.status))) {
    throw new Error(data?.error_message || data?.status || 'Google text search failed')
  }

  return Array.isArray(data?.results) ? data.results : []
}

async function reverseGoogleLookup(lat: string, lng: string, apiKey: string) {
  const params = new URLSearchParams({
    latlng: `${lat},${lng}`,
    key: apiKey,
    language: 'en',
  })

  const response = await fetch(`${GOOGLE_GEOCODE_URL}?${params.toString()}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })

  const data = await response.json()

  if (!response.ok || (data?.status && !['OK', 'ZERO_RESULTS'].includes(data.status))) {
    throw new Error(data?.error_message || data?.status || 'Google reverse lookup failed')
  }

  return Array.isArray(data?.results) ? data.results : []
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = String(searchParams.get('q') || '').trim()
  const lat = String(searchParams.get('lat') || '').trim()
  const lng = String(searchParams.get('lng') || '').trim()
  const apiKey = process.env.GOOGLE_MAPS_API_TOKEN

  if (!apiKey) {
    return NextResponse.json({ error: 'GOOGLE_MAPS_API_TOKEN is not configured' }, { status: 500 })
  }

  if (lat && lng) {
    try {
      const results = await reverseGoogleLookup(lat, lng, apiKey)
      const formatted = results
        .map((result) => toLookupResult(result, 'geocode'))
        .filter((result): result is LookupResult => Boolean(result))

      return NextResponse.json({ results: formatted })
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Reverse lookup failed' },
        { status: 502 }
      )
    }
  }

  if (!q) {
    return NextResponse.json({ results: [] })
  }

  try {
    const [geocodeResults, textSearchResults] = await Promise.allSettled([
      fetchGoogleGeocode(q, apiKey),
      fetchGoogleTextSearch(q, apiKey),
    ])

    const merged = new Map<string, LookupResult>()

    if (geocodeResults.status === 'fulfilled') {
      geocodeResults.value
        .map((result) => toLookupResult(result, 'geocode'))
        .filter((result): result is LookupResult => Boolean(result))
        .forEach((result) => merged.set(normalizeResultKey(result), result))
    }

    if (textSearchResults.status === 'fulfilled') {
      textSearchResults.value
        .map((result) =>
          toLookupResult(
            {
              place_id: result?.place_id,
              formatted_address: result?.formatted_address,
              name: result?.name,
              geometry: result?.geometry,
            },
            'place'
          )
        )
        .filter((result): result is LookupResult => Boolean(result))
        .forEach((result) => {
          const key = normalizeResultKey(result)
          if (!merged.has(key)) merged.set(key, result)
        })
    }

    const ranked = Array.from(merged.values())
      .map((result) => ({ result, score: scoreLookupResult(q, result) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ result }) => result)
      .slice(0, 8)

    return NextResponse.json({ results: ranked })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Location lookup failed' },
      { status: 502 }
    )
  }
}
