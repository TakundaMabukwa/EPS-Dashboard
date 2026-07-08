import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import ExcelJS from 'exceljs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let query = supabase
      .from('trips')
      .select('*')
      .in('status', ['completed', 'delivered'])
      .order('created_at', { ascending: true })

    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate + 'T23:59:59')
    }

    const { data: trips, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const allVehicleIds = new Set<number>()
    for (const trip of (trips || [])) {
      const va = parseJson(trip.vehicleassignments)
      if (!Array.isArray(va)) continue
      for (const assignment of va) {
        const vId = Number(assignment?.vehicle?.id)
        const tId = Number(assignment?.trailer?.id)
        if (vId) allVehicleIds.add(vId)
        if (tId) allVehicleIds.add(tId)
      }
    }

    const regMap = new Map<number, string>()
    if (allVehicleIds.size > 0) {
      const { data: vehicles } = await supabase
        .from('vehiclesc')
        .select('id, registration_number')
        .in('id', Array.from(allVehicleIds))
      for (const v of (vehicles || [])) {
        regMap.set(v.id, v.registration_number || '')
      }
    }

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'EPS Dashboard'
    workbook.created = new Date()

    const sheet = workbook.addWorksheet('EPS', {
      properties: { defaultColWidth: 15 },
    })

    const headers = [
      'Load nr', 'Load date', 'Debtor', 'DrName', 'Load/Del', 'Pink CV/PO',
      'Order No 3', 'Load Size', 'Commodity', 'LoadDescrip', 'OffLoadDescrip',
      'Delivery Note (EPS)', 'Own Veh #', 'Own Reg #', 'DrValue (REVENUE)',
      'Invoice no', 'Inv Date', 'Creditor', 'CrName', 'DriverName',
      'Route Km', 'OpeningKm', 'ClosingKm', 'MapKm (DISTANCE)', 'EmptyKm',
      'CPKInc', 'POD no', 'Leader Reg', 'Follower Reg',
      'TRIP STATUS 1', 'TRIP STATUS 2', 'TRIP STATUS 3', 'TRIP STATUS 4',
      'TRIP STATUS 5', 'TRIP STATUS 6', 'TRIP STATUS 7', 'TRIP STATUS 8',
      'TRIP STATUS 9', 'TRIP STATUS 10', 'TRIP STATUS 11', 'TRIP STATUS 12',
      'TRIP STATUS 13', 'TRIP STATUS 14', 'TRIP STATUS 15', 'TOTAL TIME',
    ]

    const headerRow = sheet.addRow(headers)

    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F4E79' },
      }
      cell.font = {
        color: { argb: 'FFFFFFFF' },
        bold: true,
        size: 10,
      }
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      }
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      }
    })

    headerRow.height = 30
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: headers.length },
    }

    type MileageKey = string
    const mileageRequests = new Map<MileageKey, { reg: string; from: string; to: string }>()
    for (const trip of (trips || [])) {
      const va = parseJson(trip.vehicleassignments)
      const stopsData = parseJson(trip.stops_data)
      const statusEntries = Array.isArray(stopsData) ? stopsData : []
      const horseReg = regMap.get(Number(va?.[0]?.vehicle?.id)) || va?.[0]?.vehicle?.name || ''
      const fromTs = statusEntries[1]?.timestamp || statusEntries[1]?.recorded_at || ''
      const toTs = statusEntries.length >= 2
        ? statusEntries[statusEntries.length - 1]?.timestamp || statusEntries[statusEntries.length - 1]?.recorded_at || ''
        : ''
      if (horseReg && fromTs && toTs) {
        const key = `${horseReg}|${formatMileageTime(fromTs)}|${formatMileageTime(toTs)}`
        if (!mileageRequests.has(key)) {
          mileageRequests.set(key, { reg: horseReg, from: formatMileageTime(fromTs), to: formatMileageTime(toTs) })
        }
      }
    }

    const mileageCache = new Map<MileageKey, any>()
    const entries = Array.from(mileageRequests.entries())
    let fetchErrors = 0
    let fetchHits = 0
    const BATCH = 10
    for (let i = 0; i < entries.length; i += BATCH) {
      const batch = entries.slice(i, i + BATCH)
      const results = await Promise.allSettled(
        batch.map(async ([key, req]) => {
          const data = await fetchMileage(req.reg, req.from, req.to)
          return { key, data }
        })
      )
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value.data) {
          mileageCache.set(r.value.key, r.value.data)
          fetchHits++
        } else {
          fetchErrors++
        }
      }
    }

    console.log(`Mileage: ${mileageRequests.size} unique keys, ${fetchHits} hits, ${fetchErrors} misses`)

    for (const trip of (trips || [])) {
      const vehicleassignments = parseJson(trip.vehicleassignments)
      const clientdetails = parseJson(trip.clientdetails)
      const pickuplocations = parseJson(trip.pickuplocations)
      const dropofflocations = parseJson(trip.dropofflocations)
      const stopsData = parseJson(trip.stops_data)

      const horseReg = regMap.get(Number(vehicleassignments?.[0]?.vehicle?.id)) || vehicleassignments?.[0]?.vehicle?.name || ''
      const leaderVehicle = regMap.get(Number(vehicleassignments?.[0]?.trailer?.id)) || vehicleassignments?.[0]?.trailer?.name || ''
      const followerVehicle = regMap.get(Number(vehicleassignments?.[1]?.vehicle?.id)) || vehicleassignments?.[1]?.vehicle?.name || ''
      const driverData = vehicleassignments?.[0]?.drivers?.[0]
      const driverName = driverData ? `${driverData.first_name || ''} ${driverData.surname || ''}`.trim() : ''

      const loadDescrip = pickuplocations?.[0]?.address || trip.origin || ''
      const offLoadDescrip = dropofflocations?.[0]?.address || trip.destination || ''

      const locationGeodata = parseJson(trip.location_geodata)
      const pickupTown = locationGeodata?.pickup?.town || ''
      const dropoffTown = locationGeodata?.dropoff?.town || ''

      const statusEntries = Array.isArray(stopsData) ? stopsData : []
      const tripStatuses: string[] = []
      for (let i = 0; i < 15; i++) {
        const entry = statusEntries[i]
        if (entry) {
          const ts = entry.timestamp || entry.recorded_at || ''
          const label = entry.status || ''
          const timeStr = ts ? formatTimestamp(ts) : ''
          tripStatuses.push(label && timeStr ? `${label} - ${timeStr}` : label || timeStr || '')
        } else {
          tripStatuses.push('')
        }
      }

      let openingKm = toNumber(trip.start_mileage)
      let closingKm = toNumber(trip.end_mileage)
      let routeKm = closingKm - openingKm
      let mapKm = 0

      const fromTs = statusEntries[1]?.timestamp || statusEntries[1]?.recorded_at || ''
      const toTs = statusEntries.length >= 2
        ? statusEntries[statusEntries.length - 1]?.timestamp || statusEntries[statusEntries.length - 1]?.recorded_at || ''
        : ''
      if (horseReg && fromTs && toTs) {
        const mileageKey = `${horseReg}|${formatMileageTime(fromTs)}|${formatMileageTime(toTs)}`
        const mileage = mileageCache.get(mileageKey) || null
        if (mileage) {
          const startM = toNumber(mileage.start_mileage)
          const endM = toNumber(mileage.end_mileage)
          const dist = toNumber(mileage.distance_km)
          if (startM > 0) openingKm = startM
          if (endM > 0) closingKm = endM
          if (dist > 0) {
            routeKm = dist
            mapKm = dist
          } else if (endM > startM) {
            routeKm = endM - startM
            mapKm = endM - startM
          }
        }
      }

      const emptyKm = toNumber(trip.total_distance) > 0 ? toNumber(trip.total_distance) - mapKm : 0
      const cpkInc = mapKm > 0 ? toNumber(trip.total_trip_cost) / mapKm : 0

      let totalTime = ''
      if (statusEntries.length >= 2) {
        const startTime = statusEntries[1]?.timestamp
        const endTime = statusEntries[statusEntries.length - 1]?.timestamp
        if (startTime && endTime) {
          const diffMs = new Date(endTime).getTime() - new Date(startTime).getTime()
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
          const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
          totalTime = `${diffHours}h ${diffMins}m`
        }
      }

      const rowData = [
        trip.ordernumber || '',
        trip.created_at ? formatDate(trip.created_at) : '',
        clientdetails?.client_id || '',
        clientdetails?.name || '',
        trip.trip_id || '',
        '',
        trip.ordernumber || '',
        trip.cargo_weight || '',
        trip.cargo || '',
        pickupTown || loadDescrip,
        dropoffTown || offLoadDescrip,
        trip.load_inspection_id || trip.trip_id || '',
        vehicleassignments?.length || 1,
        horseReg,
        toNumber(trip.rate) || toNumber(trip.selling_rate_per_km),
        '',
        '',
        '5000',
        'EPS COURIER SERVICES',
        driverName,
        routeKm,
        openingKm,
        closingKm,
        mapKm,
        emptyKm,
        cpkInc,
        trip.trip_id || '',
        leaderVehicle,
        followerVehicle,
        ...tripStatuses,
        totalTime,
      ]

      const row = sheet.addRow(rowData)

      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        }
        cell.font = { size: 10 }
        cell.alignment = { vertical: 'middle', wrapText: true }

        if ([15, 23, 25, 26].includes(colNumber)) {
          cell.numFmt = '#,##0.00'
        }
      })
    }

    sheet.columns.forEach((column) => {
      let maxLength = 10
      column.eachCell({ includeEmpty: false }, (cell) => {
        const cellLength = cell.value ? String(cell.value).length : 0
        if (cellLength > maxLength) {
          maxLength = cellLength
        }
      })
      column.width = Math.min(maxLength + 2, 35)
    })

    const buffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="eps_trip_loads_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    })
  } catch (err) {
    console.error('Excel export error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function parseJson(value: unknown): any {
  if (!value) return null
  if (typeof value === 'string') {
    try { return JSON.parse(value) } catch { return null }
  }
  return value
}

function toNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatDate(value: string): string {
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}/${m}/${day}`
}

function formatTimestamp(value: string): string {
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}/${m}/${day} ${h}:${min}`
}

const MILEAGE_BASE =
  (process.env.NEXT_PUBLIC_ROUTING || 'http://164.90.217.196:8800').replace(/\/$/, '')

function formatMileageTime(iso: string): string {
  if (!iso) return ''
  const clean = iso.replace('Z', '')
  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/)
  if (!match) return ''
  return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}`
}

async function fetchMileage(reg: string, from: string, to: string): Promise<any | null> {
  try {
    const url = `${MILEAGE_BASE}/api/vehicle/${encodeURIComponent(reg)}/mileage?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    })
    const json = await res.json()
    if (!json?.ok) {
      console.warn(`Mileage miss: ${reg} (${json?.error || 'unknown'})`)
      return null
    }
    return json.data
  } catch (err: any) {
    console.error(`Mileage error: ${reg} - ${err?.message || err}`)
    return null
  }
}


