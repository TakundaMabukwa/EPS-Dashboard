// RTMS (Road Traffic Management System) driving rules for South Africa
// Source: National Road Traffic Act

export interface RTMSRuleConfig {
  id: string
  name: string
  description: string
  defaultValue: number
  unit: string
  enabled: boolean
  value: number
}

export const DEFAULT_RTMS_RULES: RTMSRuleConfig[] = [
  { id: 'continuous_driving_hours', name: 'Continuous Driving (Hours)', description: 'Max hours of continuous driving before mandatory rest', defaultValue: 5, unit: 'hours', enabled: true, value: 5 },
  { id: 'continuous_driving_km', name: 'Continuous Driving (KM)', description: 'Max km of continuous driving before mandatory rest', defaultValue: 400, unit: 'km', enabled: true, value: 400 },
  { id: 'mandatory_break', name: 'Mandatory Break', description: 'Minimum rest break duration after continuous driving', defaultValue: 30, unit: 'min', enabled: true, value: 30 },
  { id: 'daily_driving_limit', name: 'Daily Driving Limit', description: 'Max driving hours in a 24-hour period', defaultValue: 10, unit: 'hours', enabled: true, value: 10 },
  { id: 'max_total_driving', name: 'Max Total Driving', description: 'Maximum total driving hours in any single trip', defaultValue: 15, unit: 'hours', enabled: true, value: 15 },
  { id: 'daily_rest_hours', name: 'Daily Rest Period', description: 'Consecutive rest hours required after daily driving limit', defaultValue: 8, unit: 'hours', enabled: true, value: 8 },
  { id: 'rest_stop_interval_km', name: 'Rest Stop Interval (KM)', description: 'Suggest a rest stop every N km', defaultValue: 350, unit: 'km', enabled: true, value: 350 },
  { id: 'rest_stop_interval_hours', name: 'Rest Stop Interval (Hours)', description: 'Suggest a rest stop every N hours', defaultValue: 4.5, unit: 'hours', enabled: true, value: 4.5 },
]

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

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function checkRTMSCompliance(input: TripInput, rules: RTMSRuleConfig[] = DEFAULT_RTMS_RULES): RTMSResult {
  const distanceKm = input.distanceKm
  const durationHours = input.durationSeconds / 3600
  const violations: Violation[] = []
  const recommendedStops: RecommendedStop[] = []

  // Build a lookup from enabled rules
  const cfg = (id: string) => rules.find(r => r.id === id && r.enabled)
  const val = (id: string) => cfg(id)?.value ?? 0

  const CONTINUOUS_DRIVING_LIMIT_HOURS = val('continuous_driving_hours')
  const CONTINUOUS_DRIVING_LIMIT_KM = val('continuous_driving_km')
  const MANDATORY_BREAK_MINUTES = val('mandatory_break')
  const DAILY_DRIVING_LIMIT_HOURS = val('daily_driving_limit')
  const MAX_TOTAL_DRIVING_HOURS = val('max_total_driving')
  const DAILY_REST_HOURS = val('daily_rest_hours')
  const REST_STOP_INTERVAL_KM = val('rest_stop_interval_km')
  const REST_STOP_INTERVAL_HOURS = val('rest_stop_interval_hours')

  // Rule 1: Continuous driving limit
  if ((CONTINUOUS_DRIVING_LIMIT_HOURS > 0 || CONTINUOUS_DRIVING_LIMIT_KM > 0) &&
      (durationHours > (CONTINUOUS_DRIVING_LIMIT_HOURS || Infinity) || distanceKm > (CONTINUOUS_DRIVING_LIMIT_KM || Infinity))) {
    const limitingFactor = distanceKm > (CONTINUOUS_DRIVING_LIMIT_KM || 0) ? `${CONTINUOUS_DRIVING_LIMIT_KM} km` : `${CONTINUOUS_DRIVING_LIMIT_HOURS} hours`
    violations.push({
      rule: 'Continuous Driving Limit',
      limit: `Max ${limitingFactor}`,
      actual: `${durationHours.toFixed(1)} hours / ${distanceKm.toFixed(0)} km`,
      severity: 'critical',
    })
  }

  // Rule 2: Daily driving limit (10h)
  if (DAILY_DRIVING_LIMIT_HOURS > 0 && durationHours > DAILY_DRIVING_LIMIT_HOURS) {
    violations.push({
      rule: 'Daily Driving Time',
      limit: `Max ${DAILY_DRIVING_LIMIT_HOURS} hours in 24h period`,
      actual: `${durationHours.toFixed(1)} hours`,
      severity: MAX_TOTAL_DRIVING_HOURS > 0 && durationHours > MAX_TOTAL_DRIVING_HOURS ? 'critical' : 'warning',
    })
  }

  // Rule 3: Total driving time (15h max)
  if (MAX_TOTAL_DRIVING_HOURS > 0 && durationHours > MAX_TOTAL_DRIVING_HOURS) {
    violations.push({
      rule: 'Maximum Total Driving Time',
      limit: `Max ${MAX_TOTAL_DRIVING_HOURS} hours total`,
      actual: `${durationHours.toFixed(1)} hours`,
      severity: 'critical',
    })
  }

  // Rule 4: Daily rest period
  const totalCycleHours = durationHours + (MANDATORY_BREAK_MINUTES > 0 ? MANDATORY_BREAK_MINUTES / 60 : 0)
  if (DAILY_REST_HOURS > 0 && DAILY_DRIVING_LIMIT_HOURS > 0 && totalCycleHours > DAILY_DRIVING_LIMIT_HOURS + DAILY_REST_HOURS) {
    violations.push({
      rule: 'Daily Rest Period',
      limit: `${DAILY_REST_HOURS} consecutive hours of rest required`,
      actual: `Trip requires ${(totalCycleHours).toFixed(1)}h cycle`,
      severity: 'warning',
    })
  }

  // Generate recommended stops
  const kmInterval = REST_STOP_INTERVAL_KM || Infinity
  const hourInterval = REST_STOP_INTERVAL_HOURS || Infinity

  const numStopsByKm = kmInterval < Infinity ? Math.floor(distanceKm / kmInterval) : 0
  const numStopsByTime = hourInterval < Infinity ? Math.floor(durationHours / hourInterval) : 0
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
