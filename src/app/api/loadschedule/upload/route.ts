import { NextRequest, NextResponse } from 'next/server'
import { Readable } from 'stream'
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

function extractCellValue(cell: any): any {
  if (cell === null || cell === undefined) return null
  if (typeof cell === 'object') return cell.value ?? cell.result ?? null
  return cell
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
    const stream = Readable.from(buffer)

    const ExcelJS = (await import('exceljs')).default
    const workbookReader = new (ExcelJS as any).stream.xlsx.WorkbookReader(stream, {
      entries: true, sharedStrings: true, styles: true,
    })

    let colMapping: Record<number, string> = {}
    let mappedCols: number[] = []
    let mappedColumnNames: string[] = []
    let batch: Record<string, any>[] = []
    let inserted = 0, errors = 0, skipped = 0, batchNum = 0
    const errorMessages: string[] = []
    const rawHeaders: string[] = []
    const BATCH_SIZE = 500

    const flushBatch = async () => {
      if (batch.length === 0) return
      batchNum++
      const { error, count } = await supabase.from('loadschedule').insert(batch, { count: 'exact' })
      if (error) {
        errors += batch.length
        errorMessages.push(`Batch ${batchNum}: ${error.message}`)
      } else {
        inserted += count || batch.length
      }
      batch = []
    }

    let dataSheetFound = false

    for await (const worksheetReader of workbookReader) {
      console.log('Sheet:', worksheetReader.name)
      if (worksheetReader.name !== 'DATA') continue
      dataSheetFound = true

      let rowNumber = 0
      for await (const row of worksheetReader) {
        rowNumber++

        if (rowNumber === 1) {
          const values = row.values as any[]
          for (let col = 1; col < values.length; col++) {
            const raw = extractCellValue(values[col])
            const rawHeader = String(raw).trim().toLowerCase()
            rawHeaders.push(`[${col}] "${String(raw)}" -> "${rawHeader}"`)
            console.log(`Col ${col}: "${rawHeader}"`)
            const mapped = COLUMN_MAP[rawHeader]
            if (mapped) {
              colMapping[col] = mapped
              console.log(`  -> ${mapped}`)
            }
          }
          mappedCols = Object.keys(colMapping).map(Number)
          mappedColumnNames = mappedCols.map(c => colMapping[c])
          console.log(`Matched ${mappedCols.length} columns:`, mappedColumnNames)
          continue
        }

        if (mappedCols.length === 0) continue

        let hasData = false
        const record: Record<string, any> = {}
        const values = row.values as any[]
        for (const col of mappedCols) {
          const dbCol = colMapping[col]
          const cellVal = extractCellValue(values[col])
          if (cellVal !== null && cellVal !== undefined && cellVal !== '') hasData = true
          record[dbCol] = NUMERIC_COLS.has(dbCol) ? parseNumeric(cellVal) : parseString(cellVal)
        }
        if (!hasData) { skipped++; continue }
        batch.push(record)
        if (batch.length >= BATCH_SIZE) await flushBatch()
      }
    }

    if (!dataSheetFound) {
      return NextResponse.json({ error: 'Sheet "DATA" not found in workbook.' }, { status: 400 })
    }

    if (mappedCols.length === 0) {
      return NextResponse.json({ error: 'No matching columns found in DATA sheet.', rawHeaders }, { status: 400 })
    }

    await flushBatch()

    return NextResponse.json({
      success: true, totalRows: inserted + errors + skipped,
      inserted, errors, skipped, mappedColumns: mappedColumnNames,
      errorMessages: errorMessages.length > 0 ? errorMessages : undefined,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 })
  }
}
