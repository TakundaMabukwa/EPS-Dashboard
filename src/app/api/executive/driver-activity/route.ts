import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()

    // Fetch only completed/delivered trips with vehicleassignments and stops_data
    const { data: trips, error } = await supabase
      .from('trips')
      .select('id, trip_id, vehicleassignments, stops_data, status, created_at')
      .in('status', ['completed', 'delivered'])
      .not('vehicleassignments', 'is', null)

    if (error) throw error

    // Build driver activity map
    const driverMap = new Map<string, {
      driverId: string
      firstName: string
      surname: string
      tripCount: number
      activeTrips: number
      totalStops: number
      updatedStops: number
    }>()

    // Standard stops per trip
    const STANDARD_STOPS = 12

    for (const trip of trips || []) {
      const va = trip.vehicleassignments
      if (!va) continue

      const arr = Array.isArray(va) ? va : JSON.parse(va)
      if (!Array.isArray(arr)) continue

      // Skip trips with empty stops_data
      const stopsData = trip.stops_data
      if (!Array.isArray(stopsData) || stopsData.length === 0) continue

      for (const assignment of arr) {
        const drivers = assignment?.drivers
        if (!Array.isArray(drivers)) continue

        for (const driver of drivers) {
          if (!driver?.id) continue

          const key = String(driver.id)
          const existing = driverMap.get(key) || {
            driverId: key,
            firstName: driver.first_name || driver.name?.split(' ')[0] || '',
            surname: driver.surname || driver.name || '',
            tripCount: 0,
            activeTrips: 0,
            totalStops: 0,
            updatedStops: 0,
          }

          existing.tripCount++
          existing.totalStops += STANDARD_STOPS

          // Count non-pending stops for granular usage
          const nonPendingCount = stopsData.filter((s: any) => {
            const status = s.status?.toLowerCase()
            return status && status !== 'pending'
          }).length
          existing.updatedStops += nonPendingCount

          // Mark as active if any stop was updated
          if (nonPendingCount > 0) {
            existing.activeTrips++
          }

          driverMap.set(key, existing)
        }
      }
    }

    // Convert to array and calculate usage percentage based on stops updated
    const drivers = Array.from(driverMap.values()).map(d => ({
      ...d,
      usagePercent: d.totalStops > 0 ? Math.round((d.updatedStops / d.totalStops) * 100) : 0,
      // Active = has updated at least one stop across their trips
      isActive: d.updatedStops > 0,
    }))

    // Sort: active first, then by usage percent descending
    drivers.sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
      return b.usagePercent - a.usagePercent
    })

    const activeCount = drivers.filter(d => d.isActive).length
    const inactiveCount = drivers.filter(d => !d.isActive).length

    return NextResponse.json({
      drivers,
      activeCount,
      inactiveCount,
      total: drivers.length,
    })
  } catch (error: any) {
    console.error('Driver activity error:', error)
    return NextResponse.json({ drivers: [], activeCount: 0, inactiveCount: 0, total: 0 }, { status: 500 })
  }
}
