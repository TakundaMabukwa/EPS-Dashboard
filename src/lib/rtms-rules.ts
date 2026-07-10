// RTMS (Road Traffic Management System) driving rules for South Africa
// Source: National Road Traffic Act

export interface TripInput {
  distanceKm: number
  durationSeconds: number
  departureTime?: Date
}

export interface Violation {
  rule: string
  limit: string
  actual: string
  severity: 'warning' | 'critical'
}

export interface RecommendedStop {
  kmFromOrigin: number
  reason: string
  type: 'rest' | 'break' | 'fuel'
  label: string
}

export interface RTMSResult {
  isCompliant: boolean
  violations: Violation[]
  recommendedStops: RecommendedStop[]
}

const CONTINUOUS_DRIVING_LIMIT_HOURS = 5
const CONTINUOUS_DRIVING_LIMIT_KM = 400
const MANDATORY_BREAK_MINUTES = 30
const DAILY_DRIVING_LIMIT_HOURS = 10
const MAX_TOTAL_DRIVING_HOURS = 15
const DAILY_REST_HOURS = 8
const REST_STOP_INTERVAL_KM = 350
const REST_STOP_INTERVAL_HOURS = 4.5

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function checkRTMSCompliance(input: TripInput): RTMSResult {
  const distanceKm = input.distanceKm
  const durationHours = input.durationSeconds / 3600
  const violations: Violation[] = []
  const recommendedStops: RecommendedStop[] = []

  // Rule 1: Continuous driving limit (5h or 400km)
  if (durationHours > CONTINUOUS_DRIVING_LIMIT_HOURS || distanceKm > CONTINUOUS_DRIVING_LIMIT_KM) {
    const limitingFactor = distanceKm > CONTINUOUS_DRIVING_LIMIT_KM ? `${CONTINUOUS_DRIVING_LIMIT_KM} km` : `${CONTINUOUS_DRIVING_LIMIT_HOURS} hours`
    violations.push({
      rule: 'Continuous Driving Limit',
      limit: `Max ${limitingFactor}`,
      actual: `${durationHours.toFixed(1)} hours / ${distanceKm.toFixed(0)} km`,
      severity: 'critical',
    })
  }

  // Rule 2: Daily driving limit (10h)
  if (durationHours > DAILY_DRIVING_LIMIT_HOURS) {
    violations.push({
      rule: 'Daily Driving Time',
      limit: `Max ${DAILY_DRIVING_LIMIT_HOURS} hours in 24h period`,
      actual: `${durationHours.toFixed(1)} hours`,
      severity: durationHours > MAX_TOTAL_DRIVING_HOURS ? 'critical' : 'warning',
    })
  }

  // Rule 3: Total driving time (15h max)
  if (durationHours > MAX_TOTAL_DRIVING_HOURS) {
    violations.push({
      rule: 'Maximum Total Driving Time',
      limit: `Max ${MAX_TOTAL_DRIVING_HOURS} hours total`,
      actual: `${durationHours.toFixed(1)} hours`,
      severity: 'critical',
    })
  }

  // Rule 4: Daily rest period (8h rest needed if trip > 16h total cycle)
  const totalCycleHours = durationHours + MANDATORY_BREAK_MINUTES / 60
  if (totalCycleHours > DAILY_DRIVING_LIMIT_HOURS + DAILY_REST_HOURS) {
    violations.push({
      rule: 'Daily Rest Period',
      limit: `${DAILY_REST_HOURS} consecutive hours of rest required`,
      actual: `Trip requires ${(totalCycleHours).toFixed(1)}h cycle`,
      severity: 'warning',
    })
  }

  // Generate recommended stops
  // Stop every ~350 km or ~4.5 hours, whichever comes first
  const kmInterval = REST_STOP_INTERVAL_KM
  const hourInterval = REST_STOP_INTERVAL_HOURS

  const numStopsByKm = Math.floor(distanceKm / kmInterval)
  const numStopsByTime = Math.floor(durationHours / hourInterval)
  const numStops = Math.max(numStopsByKm, numStopsByTime)

  if (numStops > 0) {
    const kmPerStop = distanceKm / (numStops + 1)
    const hoursPerStop = durationHours / (numStops + 1)

    for (let i = 1; i <= numStops; i++) {
      const km = Math.round(kmPerStop * i)
      const hours = hoursPerStop * i
      const isRest = hours >= CONTINUOUS_DRIVING_LIMIT_HOURS * 0.9 || km >= CONTINUOUS_DRIVING_LIMIT_KM * 0.9

      recommendedStops.push({
        kmFromOrigin: km,
        reason: isRest
          ? `Mandatory rest — approaching ${CONTINUOUS_DRIVING_LIMIT_HOURS}h continuous driving limit`
          : `Scheduled break — after ${hours.toFixed(1)}h driving`,
        type: isRest ? 'rest' : 'break',
        label: isRest ? `Rest Stop ${i}` : `Break Stop ${i}`,
      })
    }
  }

  return {
    isCompliant: violations.length === 0,
    violations,
    recommendedStops,
  }
}

export function interpolateStopPositions(
  geometry: GeoJSON.LineString,
  stops: RecommendedStop[]
): Array<RecommendedStop & { lat: number; lng: number }> {
  const coords = geometry.coordinates as [number, number][]
  if (coords.length < 2) return []

  // Calculate total route distance
  let totalDistance = 0
  const segmentDistances: number[] = []
  for (let i = 1; i < coords.length; i++) {
    const d = haversineKm(coords[i - 1][1], coords[i - 1][0], coords[i][1], coords[i][0])
    segmentDistances.push(d)
    totalDistance += d
  }

  return stops.map((stop) => {
    const targetKm = stop.kmFromOrigin
    let accumulated = 0

    for (let i = 0; i < segmentDistances.length; i++) {
      if (accumulated + segmentDistances[i] >= targetKm) {
        const fraction = (targetKm - accumulated) / segmentDistances[i]
        const lat = coords[i][1] + (coords[i + 1][1] - coords[i][1]) * fraction
        const lng = coords[i][0] + (coords[i + 1][0] - coords[i][0]) * fraction
        return { ...stop, lat, lng }
      }
      accumulated += segmentDistances[i]
    }

    // Fallback: return last coordinate
    const last = coords[coords.length - 1]
    return { ...stop, lat: last[1], lng: last[0] }
  })
}
