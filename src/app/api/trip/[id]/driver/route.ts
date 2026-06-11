import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    )

    // Get trip to find driver assignment
    const { data: trip } = await supabase
      .from('trips')
      .select('id, trip_id, drivers, vehicleassignments, vehicle_assignments, driver, status')
      .eq('id', Number(id))
      .single()

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    // Extract driver id from vehicleassignments JSON
    let driverId: number | null = null
    let assignmentSource = ''

    // Try vehicleassignments first
    const va = trip.vehicleassignments || trip.vehicle_assignments || {}
    const vaParsed = typeof va === 'string' ? JSON.parse(va) : va
    const driversArr = vaParsed?.drivers || []

    if (driversArr.length > 0 && driversArr[0].id) {
      driverId = driversArr[0].id
      assignmentSource = 'vehicleassignments'
    }

    // Fallback: try the drivers column
    if (!driverId && trip.drivers) {
      const driversCol = typeof trip.drivers === 'string' ? JSON.parse(trip.drivers) : trip.drivers
      if (Array.isArray(driversCol) && driversCol.length > 0 && driversCol[0].id) {
        driverId = driversCol[0].id
        assignmentSource = 'drivers_column'
      }
    }

    // Fallback: try the driver column (text)
    if (!driverId && trip.driver) {
      // Try as numeric id
      const numericId = Number(trip.driver)
      if (Number.isFinite(numericId) && numericId > 0) {
        driverId = numericId
        assignmentSource = 'driver_column'
      }
    }

    if (!driverId) {
      return NextResponse.json({
        ok: true,
        data: null,
        message: 'No driver assigned to this trip',
      })
    }

    // Fetch full driver details
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('id, first_name, surname, phone_number, driver_code, email, license_number, license_expiry, id_or_passport_number, available')
      .eq('id', driverId)
      .single()

    if (driverError || !driver) {
      // Don't break - return what we have from assignment
      const assignmentDriver = driversArr.find((d: any) => d.id === driverId)
      return NextResponse.json({
        ok: true,
        data: {
          id: driverId,
          first_name: assignmentDriver?.first_name || assignmentDriver?.name?.split(' ')[0] || '',
          surname: assignmentDriver?.surname || assignmentDriver?.name?.split(' ').slice(1).join(' ') || '',
          full_name: assignmentDriver?.name || `${assignmentDriver?.first_name || ''} ${assignmentDriver?.surname || ''}`.trim(),
          phone_number: assignmentDriver?.phone_number || '',
          driver_code: null,
          source: assignmentSource,
          fromAssignment: true,
        },
      })
    }

    // Build ignition event context
    let ignitionEvent = null
    if (trip.status === 'on-trip' || trip.status === 'delivered' || trip.status === 'completed') {
      ignitionEvent = {
        status: 'ignited',
        linkedAt: trip.status === 'on-trip' ? 'Trip started' : 'Trip completed',
      }
    } else if (trip.status === 'accepted' || trip.status === 'departing') {
      ignitionEvent = {
        status: 'pending',
        linkedAt: 'Awaiting trip start',
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        id: driver.id,
        first_name: driver.first_name,
        surname: driver.surname,
        full_name: `${driver.first_name || ''} ${driver.surname || ''}`.trim(),
        phone_number: driver.phone_number,
        driver_code: driver.driver_code,
        email: driver.email,
        license_number: driver.license_number,
        license_expiry: driver.license_expiry,
        id_number: driver.id_or_passport_number,
        available: driver.available,
        source: assignmentSource,
        ignitionEvent,
      },
    })
  } catch (error) {
    console.error('Trip driver API error:', error)
    return NextResponse.json({ error: 'Failed to fetch driver' }, { status: 500 })
  }
}
