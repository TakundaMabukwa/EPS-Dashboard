import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const COLUMN_MAP: Record<string, string> = {
  'load nr': 'load_nr', 'load date': 'load_date', 'month': 'month', 'year': 'year',
  'month+yr': 'month_yr', 'country': 'country', 'debtor': 'debtor',
  'drname': 'dr_name',
  'load/del': 'load_del',
  'pink cv/po': 'pink_cv_po', 'order no 3': 'order_no_3', 'load size': 'load_size',
  'commodity': 'commodity',
  'loaddescrip': 'load_descrip',
  'offloaddescrip': 'offload_descrip',
  'dnote': 'd_note', 'vehicle no': 'vehicle_no',
  'own veh #': 'own_veh',
  'own reg #': 'own_reg',
  'qty': 'qty', 'rate': 'rate', 'drvalue': 'dr_value',
  'from': 'from_loc', 'to': 'to_loc',
  'adhoc veh #': 'adhoc_veh', 'adhoc veh reg #': 'adhoc_veh_reg',
  's': 's', 'invoice no': 'invoice_no', 'inv date': 'inv_date',
  'creditor': 'creditor', 'subbie2': 'subbie2',
  'crname': 'cr_name', 'drivername': 'driver_name', 'crvalue': 'cr_value',
  'profit': 'profit', '% profit': 'pct_profit',
  'route km': 'route_km', 'openingkm': 'opening_km', 'closingkm': 'closing_km',
  'mapkm': 'map_km', 'emptykm': 'empty_km', 'cpkinc': 'cpk_inc',
  'pod no': 'pod_no', 'tax inv no': 'tax_inv_no',
  'loadregion': 'load_region', 'offloadregion': 'offload_region',
  'leader reg': 'leader_reg', 'follower reg': 'follower_reg',
  'route description': 'route_description',
}

const NUMERIC_COLS = new Set(['qty', 'rate', 'dr_value', 'cr_value', 'profit', 'pct_profit', 'route_km', 'opening_km', 'closing_km', 'map_km', 'empty_km', 'cpk_inc', 'year'])

function parseNumeric(val: any): number | null {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'number') return val
  const n = parseFloat(String(val).replace(/[R,%\s]/g, ''))
  return isNaN(n) ? null : n
}

function parseString(val: any): string | null {
  if (val === null || val === undefined) return null
  const s = String(val).trim()
  return s === '' ? null : s
}

export const config = { api: { bodyParser: false } }

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'xlsx' && ext !== 'xls' && ext !== 'csv')
      return NextResponse.json({ error: 'Only .xlsx, .xls, or .csv files accepted' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buffer, { type: 'buffer', sheetRows: 0 })

    if (!wb.SheetNames.includes('DATA')) {
      return NextResponse.json({ error: `Sheet "DATA" not found. Available: ${wb.SheetNames.join(', ')}` }, { status: 400 })
    }

    const sheet = wb.Sheets['DATA']
    const raw = XLSX.utils.sheet_to_json<any>(sheet, { header: 1, defval: null })
    if (raw.length < 2) {
      return NextResponse.json({ error: 'DATA sheet has no data rows.' }, { status: 400 })
    }

    const headerRow = raw[0] as any[]
    const colMapping: Record<number, string> = {}
    const rawHeaders: string[] = []
    for (let col = 0; col < headerRow.length; col++) {
      const h = String(headerRow[col] || '').trim().toLowerCase()
      rawHeaders.push(`[${col}] "${h}"`)
      const mapped = COLUMN_MAP[h]
      if (mapped) colMapping[col] = mapped
    }

    const mappedCols = Object.keys(colMapping).map(Number)
    if (mappedCols.length === 0) {
      return NextResponse.json({ error: 'No matching columns found.', rawHeaders }, { status: 400 })
    }

    const mappedColumnNames = mappedCols.map(c => colMapping[c])
    const BATCH_SIZE = 500
    let inserted = 0, errors = 0, skipped = 0
    const errorMessages: string[] = []

    for (let i = 1; i < raw.length; i += BATCH_SIZE) {
      const chunk = raw.slice(i, i + BATCH_SIZE)
      const batch: Record<string, any>[] = []
      for (const row of chunk) {
        let hasData = false
        const record: Record<string, any> = {}
        for (const col of mappedCols) {
          const dbCol = colMapping[col]
          const cellVal = (row as any[])[col] ?? null
          if (cellVal !== null && cellVal !== undefined && cellVal !== '') hasData = true
          record[dbCol] = NUMERIC_COLS.has(dbCol) ? parseNumeric(cellVal) : parseString(cellVal)
        }
        if (!hasData) { skipped++; continue }
        batch.push(record)
      }
      if (batch.length > 0) {
        const { error, count } = await supabase.from('loadschedule').insert(batch, { count: 'exact' })
        if (error) {
          errors += batch.length
          errorMessages.push(error.message)
        } else {
          inserted += count || batch.length
        }
      }
    }

    return NextResponse.json({
      success: true, totalRows: inserted + errors + skipped,
      inserted, errors, skipped, mappedColumns: mappedColumnNames,
      errorMessages: errorMessages.length > 0 ? errorMessages : undefined,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 })
  }
}
