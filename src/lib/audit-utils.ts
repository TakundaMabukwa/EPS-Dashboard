export type AuditCurrencyCode =
  | 'DZD' | 'AOA' | 'BWP' | 'BIF' | 'XOF' | 'CVE' | 'XAF' | 'CDF' | 'DJF' | 'EGP' | 'ERN'
  | 'SZL' | 'ETB' | 'GMD' | 'GHS' | 'GNF' | 'KES' | 'LSL' | 'LRD' | 'LYD' | 'MGA' | 'MWK'
  | 'MRU' | 'MUR' | 'MAD' | 'MZN' | 'NAD' | 'NGN' | 'RWF' | 'STN' | 'SCR' | 'SLE' | 'SOS'
  | 'ZAR' | 'SSP' | 'SDG' | 'TZS' | 'TND' | 'UGX' | 'ZMW' | 'ZWL' | 'USD' | 'EUR' | 'GBP'

export const AFRICAN_CURRENCY_OPTIONS: Array<{ code: AuditCurrencyCode; label: string }> = [
  { code: 'ZAR', label: 'ZAR - South African Rand' },
  { code: 'USD', label: 'USD - US Dollar' },
  { code: 'EUR', label: 'EUR - Euro' },
  { code: 'GBP', label: 'GBP - British Pound' },
  { code: 'BWP', label: 'BWP - Botswana Pula' },
  { code: 'NAD', label: 'NAD - Namibian Dollar' },
  { code: 'NGN', label: 'NGN - Nigerian Naira' },
  { code: 'KES', label: 'KES - Kenyan Shilling' },
  { code: 'TZS', label: 'TZS - Tanzanian Shilling' },
  { code: 'UGX', label: 'UGX - Ugandan Shilling' },
  { code: 'ZMW', label: 'ZMW - Zambian Kwacha' },
  { code: 'MZN', label: 'MZN - Mozambican Metical' },
  { code: 'AOA', label: 'AOA - Angolan Kwanza' },
  { code: 'CDF', label: 'CDF - Congolese Franc' },
  { code: 'GHS', label: 'GHS - Ghanaian Cedi' },
  { code: 'MAD', label: 'MAD - Moroccan Dirham' },
  { code: 'EGP', label: 'EGP - Egyptian Pound' },
]

export type AuditFinanceEntry = {
  id: string
  categoryKey: string
  label: string
  group: 'fuel' | 'vehicle' | 'driver' | 'finance' | 'other'
  plannedAmount: number
  actualAmount: number
  source: 'load_plan' | 'excel' | 'custom'
  notes?: string
}

export const parseJsonArray = (value: any) => {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

export const parseJsonObject = (value: any) => {
  if (!value) return null
  if (typeof value === 'object' && !Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
    } catch {
      return null
    }
  }
  return null
}

export const toNumber = (value: any) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export const normalizeCurrency = (value: any): AuditCurrencyCode => {
  const next = String(value || 'ZAR').toUpperCase()
  if (AFRICAN_CURRENCY_OPTIONS.some((item) => item.code === next)) {
    return next as AuditCurrencyCode
  }
  return 'ZAR'
}

export const defaultFinanceCategoryCatalog = [
  { categoryKey: 'fuel_cost', label: 'Fuel Cost', group: 'fuel', source: 'load_plan' },
  { categoryKey: 'vehicle_cost', label: 'Vehicle Cost', group: 'vehicle', source: 'load_plan' },
  { categoryKey: 'driver_cost', label: 'Driver Cost', group: 'driver', source: 'load_plan' },
  { categoryKey: 'depreciation', label: 'Depreciation', group: 'finance', source: 'excel' },
  { categoryKey: 'insurance_vehicles', label: 'Insurance - Vehicles', group: 'finance', source: 'excel' },
  { categoryKey: 'interest_instalment', label: 'Interest Expense - Instalment Sales', group: 'finance', source: 'excel' },
  { categoryKey: 'licensing_roadworthy', label: 'Licensing / Roadworthy', group: 'finance', source: 'excel' },
  { categoryKey: 'repairs_maintenance', label: 'Repairs & Maintenance', group: 'finance', source: 'excel' },
  { categoryKey: 'parking', label: 'Parking', group: 'finance', source: 'excel' },
  { categoryKey: 'tolls', label: 'Tolls', group: 'other', source: 'custom' },
  { categoryKey: 'unallocated_funds', label: 'Unallocated Funds', group: 'other', source: 'custom' },
  { categoryKey: 'other', label: 'Other', group: 'other', source: 'custom' },
] as const

export const buildFinanceEntries = (record: any): AuditFinanceEntry[] => {
  const savedEntries = parseJsonArray(record?.finance_entries)

  const defaults: AuditFinanceEntry[] = defaultFinanceCategoryCatalog.map((item) => {
    let plannedAmount = 0
    let actualAmount = 0

    if (item.categoryKey === 'fuel_cost') {
      plannedAmount = toNumber(record?.planned_fuel_cost)
      actualAmount = toNumber(record?.fuel_cost_total ?? record?.actual_fuel_cost)
    } else if (item.categoryKey === 'vehicle_cost') {
      plannedAmount = toNumber(record?.planned_vehicle_cost)
      actualAmount = toNumber(record?.actual_vehicle_cost)
    } else if (item.categoryKey === 'driver_cost') {
      plannedAmount = toNumber(record?.planned_driver_cost)
      actualAmount = toNumber(record?.actual_driver_cost)
    }

    return {
      id: item.categoryKey,
      categoryKey: item.categoryKey,
      label: item.label,
      group: item.group,
      plannedAmount,
      actualAmount,
      source: item.source,
      notes: '',
    }
  })

  if (!savedEntries.length) return defaults

  const savedByKey = new Map(savedEntries.map((entry: any) => [entry?.categoryKey || entry?.id, entry]))
  const mergedDefaults = defaults.map((entry) => {
    const saved = savedByKey.get(entry.categoryKey)
    if (!saved) return entry

    return {
      ...entry,
      id: saved.id || entry.id,
      label: saved.label || entry.label,
      actualAmount: toNumber(saved.actualAmount),
      plannedAmount: saved.plannedAmount != null ? toNumber(saved.plannedAmount) : entry.plannedAmount,
      notes: saved.notes || '',
    }
  })

  const customEntries = savedEntries
    .filter((entry: any) => !defaultFinanceCategoryCatalog.some((item) => item.categoryKey === entry?.categoryKey))
    .map((entry: any, index: number) => ({
      id: entry?.id || `custom-${index}`,
      categoryKey: entry?.categoryKey || `custom-${index}`,
      label: entry?.label || 'Custom Category',
      group: entry?.group || 'other',
      plannedAmount: toNumber(entry?.plannedAmount),
      actualAmount: toNumber(entry?.actualAmount),
      source: entry?.source || 'custom',
      notes: entry?.notes || '',
    }))

  return [...mergedDefaults, ...customEntries]
}

export const buildActualCostSummary = (financeEntries: AuditFinanceEntry[]) => {
  const totals = financeEntries.reduce(
    (acc, entry) => {
      acc.total += toNumber(entry.actualAmount)
      if (entry.categoryKey === 'fuel_cost') acc.actualFuelCost = toNumber(entry.actualAmount)
      if (entry.categoryKey === 'vehicle_cost') acc.actualVehicleCost = toNumber(entry.actualAmount)
      if (entry.categoryKey === 'driver_cost') acc.actualDriverCost = toNumber(entry.actualAmount)
      return acc
    },
    { total: 0, actualFuelCost: 0, actualVehicleCost: 0, actualDriverCost: 0 }
  )
  return totals
}

export const currency = (value: number | null | undefined, currencyCode: AuditCurrencyCode = 'ZAR') =>
  new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0))

export const numberFmt = (value: number | null | undefined, suffix = '') =>
  `${Number(value || 0).toLocaleString('en-ZA', { maximumFractionDigits: 2 })}${suffix}`

export const getClientName = (record: any) => {
  if (record?.selectedclient || record?.selected_client) return record.selectedclient || record.selected_client
  const source = record?.clientdetails || record?.client_details
  if (!source) return 'N/A'
  try {
    const parsed = typeof source === 'string' ? JSON.parse(source) : source
    return parsed?.name || 'N/A'
  } catch {
    return 'N/A'
  }
}

export const fmtDateTime = (val: any) => {
  if (!val) return 'N/A'
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return String(val)
  return d.toLocaleString('en-ZA', {
    year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

export const minutesToText = (minutes?: number | null) => {
  if (minutes == null || Number.isNaN(Number(minutes))) return 'N/A'
  const abs = Math.abs(Number(minutes))
  const h = Math.floor(abs / 60)
  const m = abs % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}
