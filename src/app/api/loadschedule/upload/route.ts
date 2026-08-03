import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    if (ext !== 'xlsx' && ext !== 'xls')
      return NextResponse.json({ error: 'Only .xlsx or .xls files accepted' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buffer)

    const ws = wb.getWorksheet('DATA')
    if (!ws || ws.rowCount < 2) {
      return NextResponse.json({ error: 'Sheet "DATA" not found or empty.' }, { status: 400 })
    }

    const colMapping: Record<number, string> = {}
    const rawHeaders: string[] = []
    const headerRow = ws.getRow(1)
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const raw = String(cell.value || '').trim().toLowerCase()
      rawHeaders.push(`[${colNumber}] "${raw}"`)
      const mapped = COLUMN_MAP[raw]
      if (mapped) colMapping[colNumber] = mapped
    })

    const mappedCols = Object.keys(colMapping).map(Number)
    if (mappedCols.length === 0) {
      return NextResponse.json({ error: 'No matching columns found.', rawHeaders }, { status: 400 })
    }

    const mappedColumnNames = mappedCols.map(c => colMapping[c])
    const BATCH_SIZE = 500
    let inserted = 0, errors = 0, skipped = 0
    const errorMessages: string[] = []

    // Collect all rows from DATA sheet only (~15k rows is fine)
    const allRows: Record<string, any>[] = []
    ws.eachRow((row, rowNumber) => {
      if (rowNumber <= 1) return
      let hasData = false
      const record: Record<string, any> = {}
      for (const col of mappedCols) {
        const dbCol = colMapping[col]
        const cellVal = row.getCell(col).value
        if (cellVal !== null && cellVal !== undefined && cellVal !== '') hasData = true
        record[dbCol] = NUMERIC_COLS.has(dbCol) ? parseNumeric(cellVal) : parseString(cellVal)
      }
      if (!hasData) { skipped++; return }
      allRows.push(record)
    })

    // Batch insert
    for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
      const batch = allRows.slice(i, i + BATCH_SIZE)
      const { error, count } = await supabase.from('loadschedule').insert(batch, { count: 'exact' })
      if (error) {
        errors += batch.length
        errorMessages.push(error.message)
      } else {
        inserted += count || batch.length
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
