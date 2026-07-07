import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import ExcelJS from 'exceljs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'EPS Dashboard'
    workbook.created = new Date()

    const sheet = workbook.addWorksheet('Premier Logistics ZA', {
      properties: { defaultColWidth: 15 },
    })

    const headers = [
      'Load nr', 'Load date', 'Debtor', 'DrName', 'Load/Del', 'Pink CV/PO',
      'Order No 3', 'Load Size', 'Commodity', 'LoadDescrip', 'OffLoadDescrip',
      'Delivery Note (EPS)', 'Own Veh #', 'Own Reg #', 'DrValue (REVENUE)',
      'Invoice no', 'Inv Date', 'Creditor', 'CrName', 'DriverName',
      'Route Km', 'OpeningKm', 'ClosingKm', 'MapKm (DISTANCE)', 'EmptyKm',
      'CPKInc', 'POD no', 'Leader Reg', 'Follower Reg',
      'DRIVE TIME (IDLE)', 'DRIVE TIME (MOTION)',
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

    for (const trip of (trips || [])) {
      const vehicleassignments = parseJson(trip.vehicleassignments)
      const clientdetails = parseJson(trip.clientdetails)
      const pickuplocations = parseJson(trip.pickuplocations)
      const dropofflocations = parseJson(trip.dropofflocations)
      const stopsData = parseJson(trip.stops_data)

      const leaderVehicle = vehicleassignments?.[0]?.vehicle?.name || ''
      const followerVehicle = vehicleassignments?.[1]?.vehicle?.name || ''
      const driverData = vehicleassignments?.[0]?.drivers?.[0]
      const driverName = driverData ? `${driverData.first_name || ''} ${driverData.surname || ''}`.trim() : ''

      const openingKm = toNumber(trip.start_mileage)
      const closingKm = toNumber(trip.end_mileage)
      const routeKm = closingKm - openingKm
      const mapKm = toNumber(trip.estimated_distance)
      const emptyKm = toNumber(trip.total_distance) > 0 ? toNumber(trip.total_distance) - mapKm : 0
      const cpkInc = mapKm > 0 ? toNumber(trip.total_trip_cost) / mapKm : 0

      const loadDescrip = pickuplocations?.[0]?.address || trip.origin || ''
      const offLoadDescrip = dropofflocations?.[0]?.address || trip.destination || ''

      const statusEntries = Array.isArray(stopsData) ? stopsData : []
      const tripStatuses: string[] = []
      for (let i = 0; i < 15; i++) {
        const entry = statusEntries[i]
        if (entry) {
          const ts = entry.timestamp || entry.recorded_at || ''
          tripStatuses.push(ts ? formatTimestamp(ts) : '')
        } else {
          tripStatuses.push('')
        }
      }

      let totalTime = ''
      let driveTimeIdle = ''
      let driveTimeMotion = ''
      if (statusEntries.length >= 2) {
        const startTime = statusEntries[1]?.timestamp
        const endTime = statusEntries[statusEntries.length - 1]?.timestamp
        if (startTime && endTime) {
          const diffMs = new Date(endTime).getTime() - new Date(startTime).getTime()
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
          const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
          totalTime = `${diffHours}h ${diffMins}m`
        }

        let idleMs = 0
        let motionMs = 0
        for (let i = 1; i < statusEntries.length; i++) {
          const prev = statusEntries[i - 1]
          const curr = statusEntries[i]
          if (prev?.timestamp && curr?.timestamp) {
            const segMs = new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()
            if (curr.elapsed_seconds && curr.elapsed_seconds > 300) {
              idleMs += segMs
            } else {
              motionMs += segMs
            }
          }
        }
        driveTimeIdle = formatDurationMs(idleMs)
        driveTimeMotion = formatDurationMs(motionMs)
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
        loadDescrip,
        offLoadDescrip,
        trip.load_inspection_id || trip.trip_id || '',
        vehicleassignments?.length || 1,
        leaderVehicle,
        toNumber(trip.rate),
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
        driveTimeIdle,
        driveTimeMotion,
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
        'Content-Disposition': `attachment; filename="premier_logistics_${new Date().toISOString().slice(0, 10)}.xlsx"`,
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

function formatDurationMs(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}h ${mins}m`
}
