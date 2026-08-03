"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createClient } from '@/lib/supabase/client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, Line, ComposedChart } from 'recharts'
import { Search, Check, ChevronDown, X, PanelLeftClose } from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ExcelFilterTable } from '@/components/ui/excel-filter-table'

/* ─── Multi-Select Commodity Filter ─── */
function CommodityFilter({ commodities, selected, onChange, label }: { commodities: string[], selected: string[], onChange: (v: string[]) => void, label?: string }) {
  const [search, setSearch] = React.useState('')
  const allSelected = selected.length === 0
  const filtered = search ? commodities.filter(c => c.toLowerCase().includes(search.toLowerCase())) : commodities
  const toggle = (c: string) => {
    if (selected.includes(c)) {
      onChange(selected.filter(x => x !== c))
    } else {
      onChange([...selected, c])
    }
  }
  const clearAll = () => onChange([])
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-slate-300">
          <span className="font-medium">{label || 'Commodity'}</span>
          <span className="text-slate-500">({allSelected ? 'All' : `${selected.length}`})</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
        <div className="p-2 border-b">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-7 text-xs px-2 border rounded"
          />
        </div>
        <div className="p-1.5 border-b">
          <label className="flex items-center gap-2 text-xs cursor-pointer px-1 py-1 hover:bg-slate-100 rounded">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={clearAll}
              className="h-3.5 w-3.5 rounded"
            />
            <span className="font-medium">(All)</span>
          </label>
        </div>
        <div className="max-h-56 overflow-y-auto p-1">
          {filtered.map(c => (
            <label key={c} className="flex items-center gap-2 text-xs px-2 py-1.5 cursor-pointer hover:bg-slate-100 rounded">
              <input
                type="checkbox"
                checked={selected.includes(c)}
                onChange={() => toggle(c)}
                className="h-3.5 w-3.5 rounded"
              />
              <span className="truncate">{c}</span>
            </label>
          ))}
          {filtered.length === 0 && <div className="text-xs text-slate-400 px-2 py-2">No matches</div>}
        </div>
        {selected.length > 0 && (
          <div className="p-2 border-t">
            <Button variant="ghost" size="sm" className="h-6 text-xs w-full" onClick={clearAll}>Show All</Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

const BLUE = '#4472C4'
const fmt = (n: number) => n?.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'
const fmtR = (n: number) => `R${fmt(n)}`

async function fetchAll(supabase: any, table: string, filter?: (q: any) => any, columns = '*', onProgress?: (loaded: number) => void) {
  const PAGE = 1000
  let q0 = supabase.from(table).select(columns, { count: 'exact', head: true })
  if (filter) q0 = filter(q0)
  const { count } = await q0
  const total = count || 0
  const pages = Math.ceil(total / PAGE)
  if (pages <= 1) {
    let q = supabase.from(table).select(columns).range(0, PAGE - 1)
    if (filter) q = filter(q)
    const { data } = await q
    onProgress?.(data?.length || 0)
    return data || []
  }
  const fetchPage = async (from: number) => {
    let q = supabase.from(table).select(columns).range(from, from + PAGE - 1)
    if (filter) q = filter(q)
    const { data } = await q
    return data || []
  }
  const batchSize = 5
  let all: any[] = []
  for (let i = 0; i < pages; i += batchSize) {
    const batch = Array.from({ length: Math.min(batchSize, pages - i) }, (_, j) => fetchPage((i + j) * PAGE))
    const results = await Promise.all(batch)
    for (const d of results) all = all.concat(d)
    onProgress?.(all.length)
  }
  return all
}

export default function ReportsPage() {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
      <Tabs defaultValue="exec">
        <TabsList>
          <TabsTrigger value="exec">EXEC</TabsTrigger>
          <TabsTrigger value="data">DATA</TabsTrigger>
          <TabsTrigger value="subbie">SUBBIE</TabsTrigger>
          <TabsTrigger value="topclient">TOP CLIENT</TabsTrigger>
        </TabsList>
        <TabsContent value="exec"><ExecTab /></TabsContent>
        <TabsContent value="data"><DataTab /></TabsContent>
        <TabsContent value="subbie"><SubbieTab /></TabsContent>
        <TabsContent value="topclient"><TopClientTab /></TabsContent>
      </Tabs>
    </div>
  )
}

/* ─── DATA TAB ─── */
const DATA_COLUMNS = ['Load Nr', 'Date', 'Month', 'Client', 'Load/Del', 'Commodity', 'From', 'To', 'Driver', 'Reg', 'Qty', 'Dr Value', 'Cr Value', 'Profit', 'Route Km', 'Map Km', 'Region', 'Subbie']
const DATA_DB_COLUMNS = 'load_nr,load_date,month,dr_name,load_del,commodity,from_loc,to_loc,driver_name,own_reg,qty,dr_value,cr_value,profit,route_km,map_km,load_region,cr_name'

function DataTab() {
  const supabase = createClient()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const data = await fetchAll(supabase, 'loadschedule', undefined, DATA_DB_COLUMNS)
      setRows(data)
      setLoading(false)
    }
    load()
  }, [])

  const tableRows = useMemo(() => {
    return rows.map(r => [
      r.load_nr,
      r.load_date,
      r.month,
      r.dr_name,
      r.load_del,
      r.commodity,
      r.from_loc,
      r.to_loc,
      r.driver_name,
      r.own_reg,
      r.qty,
      fmtR(r.dr_value),
      fmtR(r.cr_value),
      fmtR(r.profit),
      r.route_km,
      r.map_km,
      r.load_region,
      r.cr_name,
    ])
  }, [rows])

  return (
    <div className="mt-4">
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading all records...</div>
      ) : (
        <ExcelFilterTable
          headers={DATA_COLUMNS}
          rows={tableRows}
          maxHeight="calc(100vh - 200px)"
        />
      )}
    </div>
  )
}

/* ─── EXECUTIVE TAB ─── */
const EXEC_COLUMNS = 'month,month_yr,year,dr_name,cr_name,dr_value,cr_value,profit,subbie2,commodity,load_descrip,offload_descrip,own_reg,from_loc,to_loc,debtor,load_region,offload_region,qty'

function ExecTab() {
  const supabase = createClient()
  const [allRows, setAllRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadProgress, setLoadProgress] = useState(0)
  const [loadTotal, setLoadTotal] = useState(0)
  const [commodityFilter, setCommodityFilter] = useState<string[]>([])
  const [monthFilter, setMonthFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState('all')
  const [drillDown, setDrillDown] = useState<{ title: string; headers: string[]; rows: any[][]; totals?: any[] } | null>(null)

  const openDrillDown = (title: string, filterFn: (r: any) => boolean, headers: string[], mapRow: (r: any) => any[], totalsFn?: (rows: any[][]) => any[]) => {
    const filtered = allRows.filter(filterFn)
    const rows = filtered.map(mapRow)
    const totals = totalsFn ? totalsFn(rows) : undefined
    setDrillDown({ title, headers, rows, totals })
  }

  useEffect(() => {
    async function load() {
      const countQ = supabase.from('loadschedule').select('*', { count: 'exact', head: true })
      const { count } = await countQ
      setLoadTotal(count || 0)
      const data = await fetchAll(supabase, 'loadschedule', undefined, EXEC_COLUMNS, (loaded) => setLoadProgress(loaded))
      setAllRows(data)
      setLoading(false)
    }
    load()
  }, [])

  const allCommodities = useMemo(() => {
    const s = new Set<string>()
    allRows.forEach(r => { if (r.commodity) s.add(r.commodity) })
    return [...s].sort()
  }, [allRows])

  const months = useMemo(() => {
    const s = new Set<string>()
    allRows.forEach(r => { if (r.month) s.add(r.month) })
    return [...s].sort((a, b) => MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b))
  }, [allRows])

  const allYears = useMemo(() => {
    const s = new Set<string>()
    allRows.forEach(r => { if (r.year) s.add(String(r.year)) })
    return [...s].sort().reverse()
  }, [allRows])

  const filterByCommodity = (rows: any[], selected: string[]) => {
    if (selected.length === 0) return rows
    return rows.filter(r => selected.includes(r.commodity))
  }

  const monthRows = useMemo(() => {
    if (monthFilter === 'all') return allRows
    return allRows.filter(r => r.month === monthFilter)
  }, [allRows, monthFilter])

  const allFiltered = useMemo(() => {
    let d = allRows
    if (yearFilter !== 'all') d = d.filter(r => String(r.year) === yearFilter)
    return filterByCommodity(d, commodityFilter)
  }, [allRows, yearFilter, commodityFilter])
  const monthFiltered = useMemo(() => filterByCommodity(monthRows, commodityFilter), [monthRows, commodityFilter])

  // ── Chart 1: Broker Revenue YTD ──
  const revenueByMonth = useMemo(() => {
    const map = new Map<string, number>()
    allFiltered.filter(r => r.subbie2 === 'BROKER').forEach(r => {
      const m = r.month || 'Unknown'
      map.set(m, (map.get(m) || 0) + (r.dr_value || 0))
    })
    return MONTH_ORDER.filter(m => map.has(m)).map(m => ({ month: m, value: Math.round(map.get(m) || 0) }))
  }, [allFiltered])

  // ── Chart 2: Broker Profit by Month ──
  const profitByMonth = useMemo(() => {
    const map = new Map<string, number>()
    allFiltered.filter(r => r.subbie2 === 'BROKER').forEach(r => {
      const m = r.month || 'Unknown'
      map.set(m, (map.get(m) || 0) + (r.profit || 0))
    })
    return MONTH_ORDER.filter(m => map.has(m)).map(m => ({ month: m, value: Math.round(map.get(m) || 0) }))
  }, [allFiltered])

  // ── Chart 3: Load Count by Month ──
  const loadCountByMonth = useMemo(() => {
    const map = new Map<string, number>()
    allFiltered.filter(r => r.subbie2 === 'BROKER').forEach(r => {
      const m = r.month || 'Unknown'
      map.set(m, (map.get(m) || 0) + 1)
    })
    return MONTH_ORDER.filter(m => map.has(m)).map(m => ({ month: m, count: map.get(m) || 0 }))
  }, [allFiltered])

  // ── Chart 4: Transporter Revenue (Top 15) ──
  const transporterData = useMemo(() => {
    const map = new Map<string, { crValue: number; count: number }>()
    monthFiltered.forEach(r => {
      const key = r.cr_name || 'Unknown'
      const existing = map.get(key) || { crValue: 0, count: 0 }
      existing.crValue += r.cr_value || 0
      existing.count += 1
      map.set(key, existing)
    })
    return [...map.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.crValue - a.crValue)
      .slice(0, 15)
  }, [monthFiltered])

  // ── Chart 5: Top Clients EPS ──
  const epsRows = useMemo(() => allFiltered.filter(r => r.subbie2 === 'EPS'), [allFiltered])
  const topClientData = useMemo(() => {
    const map = new Map<string, { drValue: number; count: number }>()
    epsRows.forEach(r => {
      const key = r.dr_name || 'Unknown'
      const existing = map.get(key) || { drValue: 0, count: 0 }
      existing.drValue += r.dr_value || 0
      existing.count += 1
      map.set(key, existing)
    })
    return [...map.entries()]
      .map(([name, v]) => ({ name, ...v, avg: v.count > 0 ? Math.round(v.drValue / v.count) : 0 }))
      .sort((a, b) => b.drValue - a.drValue)
      .slice(0, 20)
  }, [epsRows])

  // ── Chart 6: Open Network Monthly Revenue ──
  const openNetworkData = useMemo(() => {
    const map = new Map<string, { revenue: number; fleetCount: number }>()
    allFiltered.filter(r => r.subbie2 === 'BROKER').forEach(r => {
      const m = r.month || 'Unknown'
      if (!map.has(m)) map.set(m, { revenue: 0, fleetCount: 0 })
      map.get(m)!.revenue += r.dr_value || 0
      map.get(m)!.fleetCount += 1
    })
    return MONTH_ORDER.filter(m => map.has(m)).map(m => {
      const v = map.get(m)!
      return { month: m, revenue: Math.round(v.revenue), fleetCount: v.fleetCount, avg: Math.round(v.revenue / v.fleetCount) }
    })
  }, [allFiltered])

  // ── Chart 7: Total Loads per Month (year-filtered) ──
  const totalLoadsByMonth = useMemo(() => {
    const map = new Map<string, number>()
    allFiltered.forEach(r => {
      const m = r.month || 'Unknown'
      map.set(m, (map.get(m) || 0) + 1)
    })
    return MONTH_ORDER.filter(m => map.has(m)).map(m => ({ month: m, count: map.get(m) || 0 }))
  }, [allFiltered])

  // ── Chart 8: Open Network Load Count (year-filtered) ──
  const openNetLoadCount = useMemo(() => {
    const map = new Map<string, number>()
    allFiltered.filter(r => r.subbie2 === 'BROKER').forEach(r => {
      const m = r.month || 'Unknown'
      map.set(m, (map.get(m) || 0) + 1)
    })
    return MONTH_ORDER.filter(m => map.has(m)).map(m => ({ month: m, count: map.get(m) || 0 }))
  }, [allFiltered])

  // ── Chart 9: Closed Network (EPS) Load Count ──
  const closedNetLoadCount = useMemo(() => {
    const map = new Map<string, number>()
    allFiltered.filter(r => r.subbie2 === 'EPS').forEach(r => {
      const m = r.month || 'Unknown'
      map.set(m, (map.get(m) || 0) + 1)
    })
    return MONTH_ORDER.filter(m => map.has(m)).map(m => ({ month: m, count: map.get(m) || 0 }))
  }, [allFiltered])

  // ── Chart 10: Revenue by Commodity Matrix ──
  const commodityMatrix = useMemo(() => {
    const rowMap = new Map<string, Map<string, number>>()
    const colSet = new Set<string>()
    allFiltered.forEach(r => {
      const commodity = r.commodity || 'Unknown'
      const m = r.month || 'Unknown'
      colSet.add(m)
      if (!rowMap.has(commodity)) rowMap.set(commodity, new Map())
      const inner = rowMap.get(commodity)!
      inner.set(m, (inner.get(m) || 0) + (r.dr_value || 0))
    })
    const cols = MONTH_ORDER.filter(m => colSet.has(m))
    const rows = [...rowMap.entries()]
      .map(([commodity, inner]) => {
        const total = cols.reduce((s, m) => s + (inner.get(m) || 0), 0)
        return { commodity, values: cols.map(m => inner.get(m) || 0), total }
      })
      .sort((a, b) => b.total - a.total)
    const colTotals = cols.map(m => rows.reduce((s, r) => s + r.values[cols.indexOf(m)], 0))
    return { cols, rows, colTotals, grandTotal: colTotals.reduce((s, v) => s + v, 0) }
  }, [allFiltered])

  // ── Chart 11: Massmart DC Load Count ──
  const massmartDCData = useMemo(() => {
    const map = new Map<string, number>()
    allFiltered.filter(r => {
      const dn = (r.dr_name || '').toUpperCase()
      return dn.includes('MASSMART') || dn.includes('MASSTORES')
    }).forEach(r => {
      const dc = r.load_descrip || r.dr_name || 'Unknown'
      map.set(dc, (map.get(dc) || 0) + 1)
    })
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [allFiltered])

  // ── Chart 12: Citrus Revenue by Client ──
  const citrusClientData = useMemo(() => {
    const map = new Map<string, { revenue: number; count: number }>()
    allFiltered.filter(r => (r.commodity || '').toUpperCase() === 'CITRUS').forEach(r => {
      const key = r.dr_name || 'Unknown'
      const existing = map.get(key) || { revenue: 0, count: 0 }
      existing.revenue += r.dr_value || 0
      existing.count += 1
      map.set(key, existing)
    })
    return [...map.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 15)
  }, [allFiltered])

  // ── Chart 13: Polokwane Lid Monthly ──
  const polokwaneData = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>()
    allFiltered.filter(r => (r.dr_name || '').toUpperCase().includes('POLOKWANE')).forEach(r => {
      const m = r.month || 'Unknown'
      const existing = map.get(m) || { count: 0, revenue: 0 }
      existing.count += 1
      existing.revenue += r.dr_value || 0
      map.set(m, existing)
    })
    return MONTH_ORDER.filter(m => map.has(m)).map(m => {
      const v = map.get(m)!
      return { month: m, count: v.count, revenue: Math.round(v.revenue) }
    })
  }, [allFiltered])

  // ── Chart 14: Top Brokers by Revenue ──
  const topBrokerData = useMemo(() => {
    const map = new Map<string, { revenue: number; count: number }>()
    allFiltered.filter(r => r.subbie2 === 'BROKER').forEach(r => {
      const key = r.dr_name || 'Unknown'
      const existing = map.get(key) || { revenue: 0, count: 0 }
      existing.revenue += r.dr_value || 0
      existing.count += 1
      map.set(key, existing)
    })
    return [...map.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 15)
  }, [allFiltered])

  // ── Chart 15: Top Routes by Load Count ──
  const topRoutesData = useMemo(() => {
    const map = new Map<string, number>()
    allFiltered.forEach(r => {
      const from = r.load_descrip || r.from_loc || 'Unknown'
      const to = r.offload_descrip || r.to_loc || 'Unknown'
      const key = `${from} → ${to}`
      map.set(key, (map.get(key) || 0) + 1)
    })
    return [...map.entries()]
      .map(([route, count]) => ({ route, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
  }, [allFiltered])

  // ── Chart 16: Revenue by Region ──
  const regionRevenueData = useMemo(() => {
    const map = new Map<string, { revenue: number; count: number }>()
    allFiltered.filter(r => r.load_region && r.load_region.trim()).forEach(r => {
      const region = r.load_region
      const existing = map.get(region) || { revenue: 0, count: 0 }
      existing.revenue += r.dr_value || 0
      existing.count += 1
      map.set(region, existing)
    })
    return [...map.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [allFiltered])

  // ── Chart 17: New Clients Onboarded ──
  const newClientData = useMemo(() => {
    const clientFirstYear = new Map<string, string>()
    allRows.forEach(r => {
      const name = r.dr_name || 'Unknown'
      const yr = String(r.year || '')
      if (!clientFirstYear.has(name) || yr < clientFirstYear.get(name)!) {
        clientFirstYear.set(name, yr)
      }
    })
    const currentYear = yearFilter === 'all' ? String(new Date().getFullYear()) : yearFilter
    const map = new Map<string, { revenue: number; count: number }>()
    allFiltered.filter(r => {
      const name = r.dr_name || 'Unknown'
      return clientFirstYear.get(name) === currentYear
    }).forEach(r => {
      const key = r.dr_name || 'Unknown'
      const existing = map.get(key) || { revenue: 0, count: 0 }
      existing.revenue += r.dr_value || 0
      existing.count += 1
      map.set(key, existing)
    })
    return [...map.entries()]
      .map(([name, v]) => ({ name, ...v, avg: v.count > 0 ? Math.round(v.revenue / v.count) : 0 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 15)
  }, [allRows, allFiltered, yearFilter])

  // ── Chart 18: Revenue by Offload Region ──
  const offloadRegionData = useMemo(() => {
    const map = new Map<string, { revenue: number; count: number }>()
    allFiltered.filter(r => r.offload_region && r.offload_region.trim()).forEach(r => {
      const region = r.offload_region
      const existing = map.get(region) || { revenue: 0, count: 0 }
      existing.revenue += r.dr_value || 0
      existing.count += 1
      map.set(region, existing)
    })
    return [...map.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [allFiltered])

  // ── Chart 19: Chinas Clients ──
  const CHINAS_CLIENTS = ['GOODWILL SA CERAMIC', 'STRIDE LOGISTIC', 'SUNBROMATE']
  const CHINAS_SHORT: Record<string, string> = {
    'GOODWILL SA CERAMIC (PTY) LTD': 'GOODWILL CERAMIC',
    'STRIDE LOGISTIC (PTY) LTD': 'STRIDE LOGISTIC',
    'SUNBROMATE (PTY) LTD': 'SUNBROMATE',
  }
  const chinasData = useMemo(() => {
    const map = new Map<string, { revenue: number; count: number; rawName: string }>()
    allFiltered.filter(r => {
      const dn = (r.dr_name || '').toUpperCase()
      return CHINAS_CLIENTS.some(c => dn.includes(c))
    }).forEach(r => {
      const key = r.dr_name || 'Unknown'
      const existing = map.get(key) || { revenue: 0, count: 0, rawName: key }
      existing.revenue += r.dr_value || 0
      existing.count += 1
      map.set(key, existing)
    })
    return [...map.entries()]
      .map(([name, v]) => ({ name: CHINAS_SHORT[name] || name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [allFiltered])

  // ── Chart 20: Special Projects ──
  const specialProjectsData = useMemo(() => {
    const map = new Map<string, { revenue: number; count: number }>()
    allFiltered.filter(r => (r.commodity || '').toUpperCase().includes('SPECIAL PROJECT')).forEach(r => {
      const m = r.month || 'Unknown'
      const existing = map.get(m) || { revenue: 0, count: 0 }
      existing.revenue += r.dr_value || 0
      existing.count += 1
      map.set(m, existing)
    })
    return MONTH_ORDER.filter(m => map.has(m)).map(m => {
      const v = map.get(m)!
      return { month: m, revenue: Math.round(v.revenue), count: v.count }
    })
  }, [allFiltered])

  // ── Chart 21: Loading by Destination (Bloemfontein) ──
  const loadingDestData = useMemo(() => {
    const map = new Map<string, { revenue: number; count: number }>()
    allFiltered.filter(r => {
      const offload = (r.offload_descrip || '').toUpperCase()
      return offload.includes('BLOEM')
    }).forEach(r => {
      const key = r.dr_name || 'Unknown'
      const existing = map.get(key) || { revenue: 0, count: 0 }
      existing.revenue += r.dr_value || 0
      existing.count += 1
      map.set(key, existing)
    })
    return [...map.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)
  }, [allFiltered])

  // ── Chart 22: Durban↔JHB Route Stats ──
  const routeStatsData = useMemo(() => {
    const map = new Map<string, { toJhb: number; fromJhb: number }>()
    allFiltered.forEach(r => {
      const fromDesc = (r.load_descrip || '').toUpperCase()
      const toDesc = (r.offload_descrip || '').toUpperCase()
      if (!fromDesc && !toDesc) return
      const m = r.month || 'Unknown'
      if (!map.has(m)) map.set(m, { toJhb: 0, fromJhb: 0 })
      const entry = map.get(m)!
      if (fromDesc.includes('DURBAN') && toDesc.includes('JHB')) entry.toJhb += 1
      if (fromDesc.includes('JHB') && toDesc.includes('DURBAN')) entry.fromJhb += 1
    })
    return MONTH_ORDER.filter(m => map.has(m)).map(m => {
      const v = map.get(m)!
      return { month: m, toJhb: v.toJhb, fromJhb: v.fromJhb, total: v.toJhb + v.fromJhb }
    })
  }, [allFiltered])

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="text-slate-500 text-sm">Loading executive data...</div>
      <div className="w-64 bg-slate-200 rounded-full h-2 overflow-hidden">
        <div className="bg-[#1A245E] h-2 rounded-full transition-all duration-300" style={{ width: loadTotal > 0 ? `${Math.min((loadProgress / loadTotal) * 100, 100)}%` : '30%' }} />
      </div>
      <div className="text-xs text-slate-400">{loadProgress.toLocaleString()} / {loadTotal.toLocaleString()} records</div>
    </div>
  )

  return (
    <div className="space-y-6 mt-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 flex items-center gap-2 text-xs text-amber-700">
        <PanelLeftClose className="w-3.5 h-3.5 shrink-0" />
        <span>For the best experience, close the sidebar to give charts more room to display properly.</span>
      </div>
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Year" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {allYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Month" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <CommodityFilter commodities={allCommodities} selected={commodityFilter} onChange={setCommodityFilter} />
      </div>

      {/* ROW 1: Revenue YTD + Profit by Month */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            const cf = commodityFilter
            openDrillDown(
              'Broker Revenue YTD',
              r => r.subbie2 === 'BROKER' && (cf.length === 0 || cf.includes(r.commodity)),
              ['Load Nr', 'Client', 'Month', 'Revenue'],
              r => [r.load_nr, r.dr_name, r.month, fmtR(r.dr_value)],
              rows => ['Grand Total', '', '', fmtR(rows.reduce((s, r) => s + (Number(String(r[3]).replace(/[R,]/g, '')) || 0), 0))]
            )
          }}
        >
          <CardHeader className="pb-1"><CardTitle className="text-sm font-semibold">Broker Revenue YTD 2026</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueByMonth} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000000).toFixed(0)}M`} />
                <Tooltip formatter={(v: number) => fmtR(v)} />
                <Bar dataKey="value" fill={BLUE} barSize={40}>
                  <LabelList dataKey="value" position="top" formatter={(v: number) => fmt(v)} style={{ fontSize: 9 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            const cf = commodityFilter
            openDrillDown(
              'Broker Profit by Month',
              r => r.subbie2 === 'BROKER' && (cf.length === 0 || cf.includes(r.commodity)),
              ['Load Nr', 'Client', 'Month', 'Revenue', 'Cost', 'Profit'],
              r => [r.load_nr, r.dr_name, r.month, fmtR(r.dr_value), fmtR(r.cr_value), fmtR(r.profit)],
              rows => ['Grand Total', '', '', '', '', fmtR(rows.reduce((s, r) => s + (Number(String(r[5]).replace(/[R,]/g, '')) || 0), 0))]
            )
          }}
        >
          <CardHeader className="pb-1"><CardTitle className="text-sm font-semibold">Broker Profit per Month 2026</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={profitByMonth} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number) => fmtR(v)} />
                <Bar dataKey="value" fill={BLUE} barSize={40}>
                  <LabelList dataKey="value" position="top" formatter={(v: number) => fmtR(v)} style={{ fontSize: 9 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ROW 2: Load Count + Transporter Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            const cf = commodityFilter
            openDrillDown(
              'Brokerage Load Count per Month',
              r => r.subbie2 === 'BROKER' && (cf.length === 0 || cf.includes(r.commodity)),
              ['Load Nr', 'Client', 'Month', 'Commodity'],
              r => [r.load_nr, r.dr_name, r.month, r.commodity],
              rows => ['Grand Total', '', `${rows.length} loads`, '']
            )
          }}
        >
          <CardHeader className="pb-1"><CardTitle className="text-sm font-semibold">Brokerage Load Count per Month 2026</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={loadCountByMonth} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill={BLUE} barSize={40}>
                  <LabelList dataKey="count" position="top" style={{ fontSize: 9 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            const mf = monthFilter
            const cf = commodityFilter
            openDrillDown(
              'Transporter Revenue Distribution',
              r => (mf === 'all' || r.month === mf) && (cf.length === 0 || cf.includes(r.commodity)),
              ['Load Nr', 'Transporter', 'Revenue'],
              r => [r.load_nr, r.cr_name, fmtR(r.cr_value)],
              rows => ['Grand Total', '', fmtR(rows.reduce((s, r) => s + (Number(String(r[2]).replace(/[R,]/g, '')) || 0), 0))]
            )
          }}
        >
          <CardHeader className="pb-1"><CardTitle className="text-sm font-semibold">Transporter Revenue Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={transporterData} layout="vertical" margin={{ left: 150, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={150} />
                <Tooltip formatter={(v: number) => fmtR(v)} />
                <Bar dataKey="crValue" fill={BLUE} barSize={12}>
                  <LabelList dataKey="crValue" position="right" formatter={(v: number) => fmtR(v)} style={{ fontSize: 9 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ROW 3: Top Clients EPS + Open Network Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            const mf = monthFilter
            const cf = commodityFilter
            openDrillDown(
              'Top Clients - Own EPS Trucks',
              r => r.subbie2 === 'EPS' && (mf === 'all' || r.month_yr === mf) && (cf.length === 0 || cf.includes(r.commodity)),
              ['Load Nr', 'Client', 'Month', 'Revenue'],
              r => [r.load_nr, r.dr_name, r.month || r.month_yr, fmtR(r.dr_value)],
              rows => ['Grand Total', '', '', fmtR(rows.reduce((s, r) => s + (Number(String(r[3]).replace(/[R,]/g, '')) || 0), 0))]
            )
          }}
        >
          <CardHeader className="pb-1"><CardTitle className="text-sm font-semibold">Top Clients - Own EPS Trucks (YTD 2026)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topClientData} layout="vertical" margin={{ top: 5, right: 60, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 8 }} width={200} />
                <Tooltip formatter={(v: number, name: string) => name === 'drValue' ? fmtR(v) : v} />
                <Bar dataKey="drValue" name="Revenue" fill={BLUE} barSize={12}>
                  <LabelList dataKey="drValue" position="right" formatter={(v: number) => fmt(v)} style={{ fontSize: 9 }} />
                </Bar>
                <Bar dataKey="count" name="Loads" fill="#ED7D31" barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            const cf = commodityFilter
            openDrillDown(
              'Open Network Monthly Revenue',
              r => r.subbie2 === 'BROKER' && (cf.length === 0 || cf.includes(r.commodity)),
              ['Load Nr', 'Client', 'Month', 'Revenue'],
              r => [r.load_nr, r.dr_name, r.month, fmtR(r.dr_value)],
              rows => ['Grand Total', '', '', fmtR(rows.reduce((s, r) => s + (Number(String(r[3]).replace(/[R,]/g, '')) || 0), 0))]
            )
          }}
        >
          <CardHeader className="pb-1"><CardTitle className="text-sm font-semibold">Open Network Monthly Revenue 2026</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={openNetworkData} margin={{ top: 20, right: 50, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000000).toFixed(0)}M`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number, name: string) => name === 'revenue' ? fmtR(v) : v} />
                <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#70AD47" barSize={35}>
                  <LabelList dataKey="revenue" position="top" formatter={(v: number) => fmtR(v)} style={{ fontSize: 9 }} />
                </Bar>
                <Line yAxisId="right" type="monotone" dataKey="fleetCount" name="Fleet Count" stroke={BLUE} strokeWidth={2} dot={{ fill: BLUE, r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ═══ ROW 4: Total Loads + Open Network Load Count ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            const cf = commodityFilter
            const yf = yearFilter
            openDrillDown(
              `Total Loads per Month ${yf === 'all' ? '' : yf}`,
              r => (yf === 'all' || String(r.year) === yf) && (cf.length === 0 || cf.includes(r.commodity)),
              ['Load Nr', 'Client', 'Month', 'Commodity', 'Revenue'],
              r => [r.load_nr, r.dr_name, r.month, r.commodity, fmtR(r.dr_value)],
              rows => ['Grand Total', '', `${rows.length} loads`, '', '']
            )
          }}
        >
          <CardHeader className="pb-1"><CardTitle className="text-sm font-semibold">Total Loads per Month {yearFilter === 'all' ? '(All Years)' : yearFilter}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={totalLoadsByMonth} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#5B9BD5" barSize={40}>
                  <LabelList dataKey="count" position="top" style={{ fontSize: 9 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            const cf = commodityFilter
            const yf = yearFilter
            openDrillDown(
              `Open Network Load Count ${yf === 'all' ? '' : yf}`,
              r => r.subbie2 === 'BROKER' && (yf === 'all' || String(r.year) === yf) && (cf.length === 0 || cf.includes(r.commodity)),
              ['Load Nr', 'Client', 'Month', 'Transporter'],
              r => [r.load_nr, r.dr_name, r.month, r.cr_name],
              rows => ['Grand Total', '', `${rows.length} loads`, '']
            )
          }}
        >
          <CardHeader className="pb-1"><CardTitle className="text-sm font-semibold">Open Network Load Count {yearFilter === 'all' ? '(All Years)' : yearFilter}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={openNetLoadCount} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#5B9BD5" barSize={40}>
                  <LabelList dataKey="count" position="top" style={{ fontSize: 9 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ═══ ROW 5: Closed Network + Commodity Matrix ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            const cf = commodityFilter
            const yf = yearFilter
            openDrillDown(
              `Closed Network (EPS) Load Count ${yf === 'all' ? '' : yf}`,
              r => r.subbie2 === 'EPS' && (yf === 'all' || String(r.year) === yf) && (cf.length === 0 || cf.includes(r.commodity)),
              ['Load Nr', 'Client', 'Month', 'Vehicle Reg'],
              r => [r.load_nr, r.dr_name, r.month, r.own_reg],
              rows => ['Grand Total', '', `${rows.length} loads`, '']
            )
          }}
        >
          <CardHeader className="pb-1"><CardTitle className="text-sm font-semibold">Closed Network (EPS) Load Count {yearFilter === 'all' ? '(All Years)' : yearFilter}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={closedNetLoadCount} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#ED7D31" barSize={40}>
                  <LabelList dataKey="count" position="top" style={{ fontSize: 9 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            const yf = yearFilter
            openDrillDown(
              `Revenue by Commodity ${yf === 'all' ? '' : yf}`,
              r => (yf === 'all' || String(r.year) === yf),
              ['Load Nr', 'Commodity', 'Month', 'Revenue'],
              r => [r.load_nr, r.commodity, r.month, fmtR(r.dr_value)],
              rows => ['Grand Total', '', '', fmtR(rows.reduce((s, r) => s + (Number(String(r[3]).replace(/[R,]/g, '')) || 0), 0))]
            )
          }}
        >
          <CardHeader className="pb-1"><CardTitle className="text-sm font-semibold">Revenue by Commodity {yearFilter === 'all' ? '(All Years)' : yearFilter}</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-[320px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-200">
                    <TableHead className="text-xs text-slate-700 sticky left-0 bg-slate-200">Commodity</TableHead>
                    {commodityMatrix.cols.map(m => (
                      <TableHead key={m} className="text-xs text-slate-700 text-right">{m.substring(0, 3)}</TableHead>
                    ))}
                    <TableHead className="text-xs text-slate-700 text-right font-bold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commodityMatrix.rows.map((r, i) => (
                    <TableRow key={i} className="hover:bg-slate-50">
                      <TableCell className="text-xs font-medium sticky left-0 bg-white max-w-[180px] truncate" title={r.commodity}>{r.commodity}</TableCell>
                      {r.values.map((v, j) => (
                        <TableCell key={j} className="text-xs text-right">{v > 0 ? fmtR(v) : ''}</TableCell>
                      ))}
                      <TableCell className="text-xs text-right font-semibold">{fmtR(r.total)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-slate-100">
                    <TableCell className="text-xs sticky left-0 bg-slate-100">Grand Total</TableCell>
                    {commodityMatrix.colTotals.map((v, j) => (
                      <TableCell key={j} className="text-xs text-right">{fmtR(v)}</TableCell>
                    ))}
                    <TableCell className="text-xs text-right">{fmtR(commodityMatrix.grandTotal)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ ROW 6: Massmart DC + Citrus Client ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            const yf = yearFilter
            openDrillDown(
              `Massmart DC Load Count ${yf === 'all' ? '' : yf}`,
              r => {
                const dn = (r.dr_name || '').toUpperCase()
                return (dn.includes('MASSMART') || dn.includes('MASSTORES')) && (yf === 'all' || String(r.year) === yf)
              },
              ['Load Nr', 'DC', 'Client', 'Month', 'Vehicle Reg'],
              r => [r.load_nr, r.load_descrip || r.dr_name, r.dr_name, r.month, r.own_reg],
              rows => ['Grand Total', '', `${rows.length} loads`, '', '']
            )
          }}
        >
          <CardHeader className="pb-1"><CardTitle className="text-sm font-semibold">Massmart DC Load Count {yearFilter === 'all' ? '(All Years)' : yearFilter}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(200, massmartDCData.length * 30 + 40)}>
              <BarChart data={massmartDCData} layout="vertical" margin={{ left: 120, right: 30, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={120} />
                <Tooltip />
                <Bar dataKey="count" fill="#70AD47" barSize={16}>
                  <LabelList dataKey="count" position="right" style={{ fontSize: 9 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            const yf = yearFilter
            openDrillDown(
              `Citrus Revenue by Client ${yf === 'all' ? '' : yf}`,
              r => (r.commodity || '').toUpperCase() === 'CITRUS' && (yf === 'all' || String(r.year) === yf),
              ['Load Nr', 'Client', 'Month', 'Revenue'],
              r => [r.load_nr, r.dr_name, r.month, fmtR(r.dr_value)],
              rows => ['Grand Total', '', '', fmtR(rows.reduce((s, r) => s + (Number(String(r[3]).replace(/[R,]/g, '')) || 0), 0))]
            )
          }}
        >
          <CardHeader className="pb-1"><CardTitle className="text-sm font-semibold">Citrus Revenue by Client {yearFilter === 'all' ? '(All Years)' : yearFilter}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(200, citrusClientData.length * 28 + 40)}>
              <BarChart data={citrusClientData} layout="vertical" margin={{ left: 200, right: 30, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 8 }} width={200} />
                <Tooltip formatter={(v: number) => fmtR(v)} />
                <Bar dataKey="revenue" fill="#70AD47" barSize={14}>
                  <LabelList dataKey="revenue" position="right" formatter={(v: number) => fmtR(v)} style={{ fontSize: 9 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ═══ ROW 7: Polokwane Lid + Top Brokers ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            const yf = yearFilter
            openDrillDown(
              `Polokwane Lid Monthly ${yf === 'all' ? '' : yf}`,
              r => (r.dr_name || '').toUpperCase().includes('POLOKWANE') && (yf === 'all' || String(r.year) === yf),
              ['Load Nr', 'Vehicle Reg', 'Month', 'Revenue'],
              r => [r.load_nr, r.own_reg, r.month, fmtR(r.dr_value)],
              rows => ['Grand Total', '', `${rows.length} loads`, fmtR(rows.reduce((s, r) => s + (Number(String(r[3]).replace(/[R,]/g, '')) || 0), 0))]
            )
          }}
        >
          <CardHeader className="pb-1"><CardTitle className="text-sm font-semibold">Polokwane Lid Monthly {yearFilter === 'all' ? '(All Years)' : yearFilter}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={polokwaneData} margin={{ top: 20, right: 50, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number, name: string) => name === 'revenue' ? fmtR(v) : v} />
                <Bar yAxisId="left" dataKey="count" name="Loads" fill="#5B9BD5" barSize={35}>
                  <LabelList dataKey="count" position="top" style={{ fontSize: 9 }} />
                </Bar>
                <Line yAxisId="right" type="monotone" dataKey="revenue" name="Revenue" stroke="#ED7D31" strokeWidth={2} dot={{ fill: '#ED7D31', r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            const yf = yearFilter
            const cf = commodityFilter
            openDrillDown(
              `Top Brokers by Revenue ${yf === 'all' ? '' : yf}`,
              r => r.subbie2 === 'BROKER' && (yf === 'all' || String(r.year) === yf) && (cf.length === 0 || cf.includes(r.commodity)),
              ['Load Nr', 'Broker', 'Month', 'Revenue'],
              r => [r.load_nr, r.dr_name, r.month, fmtR(r.dr_value)],
              rows => ['Grand Total', '', '', fmtR(rows.reduce((s, r) => s + (Number(String(r[3]).replace(/[R,]/g, '')) || 0), 0))]
            )
          }}
        >
          <CardHeader className="pb-1"><CardTitle className="text-sm font-semibold">Top Brokers by Revenue {yearFilter === 'all' ? '(All Years)' : yearFilter}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(280, topBrokerData.length * 30 + 40)}>
              <BarChart data={topBrokerData} layout="vertical" margin={{ left: 20, right: 60, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={200} interval={0} />
                <Tooltip formatter={(v: number, name: string) => name === 'revenue' ? fmtR(v) : v} />
                <Bar dataKey="revenue" name="Revenue" fill={BLUE} barSize={18}>
                  <LabelList dataKey="revenue" position="right" formatter={(v: number) => fmtR(v)} style={{ fontSize: 9 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ═══ ROW 8: Top Routes + Revenue by Region ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            const yf = yearFilter
            openDrillDown(
              `Top Routes ${yf === 'all' ? '' : yf}`,
              r => (yf === 'all' || String(r.year) === yf),
              ['Load Nr', 'From', 'To', 'Client', 'Month'],
              r => [r.load_nr, r.load_descrip || r.from_loc, r.offload_descrip || r.to_loc, r.dr_name, r.month],
              rows => ['Grand Total', '', '', `${rows.length} loads`, '']
            )
          }}
        >
          <CardHeader className="pb-1"><CardTitle className="text-sm font-semibold">Top Routes by Load Count {yearFilter === 'all' ? '(All Years)' : yearFilter}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(280, topRoutesData.length * 26 + 40)}>
              <BarChart data={topRoutesData} layout="vertical" margin={{ left: 20, right: 40, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="route" tick={{ fontSize: 9 }} width={180} interval={0} />
                <Tooltip />
                <Bar dataKey="count" fill="#5B9BD5" barSize={14}>
                  <LabelList dataKey="count" position="right" style={{ fontSize: 9 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            const yf = yearFilter
            openDrillDown(
              `Revenue by Origin Region ${yf === 'all' ? '' : yf}`,
              r => (yf === 'all' || String(r.year) === yf),
              ['Load Nr', 'Region', 'Client', 'Month', 'Revenue'],
              r => [r.load_nr, r.load_region, r.dr_name, r.month, fmtR(r.dr_value)],
              rows => ['Grand Total', '', '', '', fmtR(rows.reduce((s, r) => s + (Number(String(r[4]).replace(/[R,]/g, '')) || 0), 0))]
            )
          }}
        >
          <CardHeader className="pb-1"><CardTitle className="text-sm font-semibold">Revenue by Origin Region {yearFilter === 'all' ? '(All Years)' : yearFilter}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(280, regionRevenueData.length * 30 + 40)}>
              <BarChart data={regionRevenueData} layout="vertical" margin={{ left: 60, right: 60, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000000).toFixed(0)}M`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={60} interval={0} />
                <Tooltip formatter={(v: number) => fmtR(v)} />
                <Bar dataKey="revenue" fill="#70AD47" barSize={16}>
                  <LabelList dataKey="revenue" position="right" formatter={(v: number) => fmtR(v)} style={{ fontSize: 9 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ═══ ROW 9: New Clients + Offload Region ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            const yf = yearFilter
            openDrillDown(
              `New Clients Onboarded ${yf === 'all' ? '' : yf}`,
              r => {
                const dn = (r.dr_name || '').toUpperCase()
                const firstYear = allRows.filter(x => x.dr_name === r.dr_name).reduce((min, x) => {
                  const yr = String(x.year || '9999')
                  return yr < min ? yr : min
                }, '9999')
                return firstYear === (yf === 'all' ? String(new Date().getFullYear()) : yf)
              },
              ['Load Nr', 'Client', 'Month', 'Revenue'],
              r => [r.load_nr, r.dr_name, r.month, fmtR(r.dr_value)],
              rows => ['Grand Total', '', `${rows.length} loads`, fmtR(rows.reduce((s, r) => s + (Number(String(r[3]).replace(/[R,]/g, '')) || 0), 0))]
            )
          }}
        >
          <CardHeader className="pb-1"><CardTitle className="text-sm font-semibold">New Clients Onboarded {yearFilter === 'all' ? 'This Year' : yearFilter}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(280, newClientData.length * 30 + 40)}>
              <BarChart data={newClientData} layout="vertical" margin={{ left: 20, right: 60, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 8 }} width={200} interval={0} />
                <Tooltip formatter={(v: number, name: string) => name === 'revenue' ? fmtR(v) : v} />
                <Bar dataKey="revenue" name="Revenue" fill="#70AD47" barSize={18}>
                  <LabelList dataKey="revenue" position="right" formatter={(v: number) => fmtR(v)} style={{ fontSize: 9 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            const yf = yearFilter
            openDrillDown(
              `Revenue by Destination Region ${yf === 'all' ? '' : yf}`,
              r => (yf === 'all' || String(r.year) === yf),
              ['Load Nr', 'Destination Region', 'Client', 'Month', 'Revenue'],
              r => [r.load_nr, r.offload_region, r.dr_name, r.month, fmtR(r.dr_value)],
              rows => ['Grand Total', '', '', '', fmtR(rows.reduce((s, r) => s + (Number(String(r[4]).replace(/[R,]/g, '')) || 0), 0))]
            )
          }}
        >
          <CardHeader className="pb-1"><CardTitle className="text-sm font-semibold">Revenue by Destination Region {yearFilter === 'all' ? '(All Years)' : yearFilter}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(280, offloadRegionData.length * 30 + 40)}>
              <BarChart data={offloadRegionData} layout="vertical" margin={{ left: 60, right: 60, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000000).toFixed(0)}M`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={60} interval={0} />
                <Tooltip formatter={(v: number) => fmtR(v)} />
                <Bar dataKey="revenue" fill="#ED7D31" barSize={16}>
                  <LabelList dataKey="revenue" position="right" formatter={(v: number) => fmtR(v)} style={{ fontSize: 9 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ═══ ROW 10: Chinas Clients + Special Projects ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            const yf = yearFilter
            openDrillDown(
              `Chinas Clients ${yf === 'all' ? '' : yf}`,
              r => {
                const dn = (r.dr_name || '').toUpperCase()
                return CHINAS_CLIENTS.some(c => dn.includes(c)) && (yf === 'all' || String(r.year) === yf)
              },
              ['Load Nr', 'Client', 'Month', 'Revenue'],
              r => [r.load_nr, r.dr_name, r.month, fmtR(r.dr_value)],
              rows => ['Grand Total', '', `${rows.length} loads`, fmtR(rows.reduce((s, r) => s + (Number(String(r[3]).replace(/[R,]/g, '')) || 0), 0))]
            )
          }}
        >
          <CardHeader className="pb-1"><CardTitle className="text-sm font-semibold">Chinas Clients {yearFilter === 'all' ? '(All Years)' : yearFilter}</CardTitle></CardHeader>
          <CardContent>
            {chinasData.length === 0 ? (
              <div className="flex items-center justify-center h-[280px] text-sm text-slate-400">No chinas client data</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chinasData} margin={{ top: 20, right: 60, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={0} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number, name: string) => name === 'revenue' ? fmtR(v) : v} />
                  <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill={BLUE} barSize={30}>
                    <LabelList dataKey="revenue" position="top" formatter={(v: number) => fmtR(v)} style={{ fontSize: 9 }} />
                  </Bar>
                  <Bar yAxisId="right" dataKey="count" name="Loads" fill="#ED7D31" barSize={30}>
                    <LabelList dataKey="count" position="top" style={{ fontSize: 9 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            const yf = yearFilter
            openDrillDown(
              `Special Projects ${yf === 'all' ? '' : yf}`,
              r => (r.commodity || '').toUpperCase().includes('SPECIAL PROJECT') && (yf === 'all' || String(r.year) === yf),
              ['Load Nr', 'Client', 'Month', 'Revenue'],
              r => [r.load_nr, r.dr_name, r.month, fmtR(r.dr_value)],
              rows => ['Grand Total', '', `${rows.length} loads`, fmtR(rows.reduce((s, r) => s + (Number(String(r[3]).replace(/[R,]/g, '')) || 0), 0))]
            )
          }}
        >
          <CardHeader className="pb-1"><CardTitle className="text-sm font-semibold">Special Projects Revenue {yearFilter === 'all' ? '(All Years)' : yearFilter}</CardTitle></CardHeader>
          <CardContent>
            {specialProjectsData.length === 0 ? (
              <div className="flex items-center justify-center h-[280px] text-sm text-slate-400">No special projects data</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={specialProjectsData} margin={{ top: 20, right: 50, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number, name: string) => name === 'revenue' ? fmtR(v) : v} />
                  <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#70AD47" barSize={35}>
                    <LabelList dataKey="revenue" position="top" formatter={(v: number) => fmtR(v)} style={{ fontSize: 9 }} />
                  </Bar>
                  <Line yAxisId="right" type="monotone" dataKey="count" name="Loads" stroke={BLUE} strokeWidth={2} dot={{ fill: BLUE, r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══ ROW 11: Loading by Dest + Durban↔JHB Route ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            const yf = yearFilter
            openDrillDown(
              `Loading into Bloemfontein ${yf === 'all' ? '' : yf}`,
              r => {
                const offload = (r.offload_descrip || '').toUpperCase()
                return offload.includes('BLOEM') && (yf === 'all' || String(r.year) === yf)
              },
              ['Load Nr', 'Client', 'Dest', 'Month', 'Revenue'],
              r => [r.load_nr, r.dr_name, r.offload_descrip, r.month, fmtR(r.dr_value)],
              rows => ['Grand Total', '', '', `${rows.length} loads`, fmtR(rows.reduce((s, r) => s + (Number(String(r[4]).replace(/[R,]/g, '')) || 0), 0))]
            )
          }}
        >
          <CardHeader className="pb-1"><CardTitle className="text-sm font-semibold">Loading into Bloemfontein {yearFilter === 'all' ? '(All Years)' : yearFilter}</CardTitle></CardHeader>
          <CardContent>
            {loadingDestData.length === 0 ? (
              <div className="flex items-center justify-center h-[280px] text-sm text-slate-400">No Bloemfontein loading data</div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(280, loadingDestData.length * 30 + 40)}>
                <BarChart data={loadingDestData} layout="vertical" margin={{ left: 20, right: 40, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 8 }} width={200} interval={0} />
                  <Tooltip />
                  <Bar dataKey="count" name="Loads" fill="#5B9BD5" barSize={16}>
                    <LabelList dataKey="count" position="right" style={{ fontSize: 9 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            const yf = yearFilter
            openDrillDown(
              `Durban ↔ JHB Route ${yf === 'all' ? '' : yf}`,
              r => {
                const fromDesc = (r.load_descrip || '').toUpperCase()
                const toDesc = (r.offload_descrip || '').toUpperCase()
                const isRoute = fromDesc.includes('DURBAN') || toDesc.includes('DURBAN') || fromDesc.includes('JHB') || toDesc.includes('JHB')
                return isRoute && (yf === 'all' || String(r.year) === yf)
              },
              ['Load Nr', 'From', 'To', 'Client', 'Month'],
              r => [r.load_nr, r.load_descrip || r.from_loc, r.offload_descrip || r.to_loc, r.dr_name, r.month],
              rows => ['Grand Total', '', '', `${rows.length} loads`, '']
            )
          }}
        >
          <CardHeader className="pb-1"><CardTitle className="text-sm font-semibold">Durban ↔ JHB Route Stats {yearFilter === 'all' ? '(All Years)' : yearFilter}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={routeStatsData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="toJhb" name="Durban → JHB" fill="#5B9BD5" barSize={25}>
                  <LabelList dataKey="toJhb" position="top" style={{ fontSize: 9 }} />
                </Bar>
                <Bar dataKey="fromJhb" name="JHB → Durban" fill="#ED7D31" barSize={25}>
                  <LabelList dataKey="fromJhb" position="top" style={{ fontSize: 9 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Drill-down Modal */}
      <Dialog open={!!drillDown} onOpenChange={() => setDrillDown(null)}>
        <DialogContent
          className="sm:!max-w-[90vw] !max-w-[90vw] w-[90vw] h-[90vh] overflow-hidden flex flex-col p-0"
          style={{ maxWidth: '90vw', width: '90vw', height: '90vh' }}
        >
          <div className="px-6 pt-6 pb-3 border-b bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-bold">{drillDown?.title}</DialogTitle>
                <DialogDescription className="mt-1">
                  {drillDown ? `${drillDown.rows.length} records` : ''} — Click any column header to sort
                </DialogDescription>
              </div>
            </div>
          </div>
          {drillDown && (
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              {drillDown.rows.length === 0 ? (
                <div className="flex items-center justify-center flex-1 text-sm text-slate-400">No data found for this filter.</div>
              ) : (
                <ExcelFilterTable
                  headers={drillDown.headers}
                  rows={drillDown.rows}
                  totals={drillDown.totals}
                  maxHeight="calc(90vh - 120px)"
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ─── SUBBIE TAB ─── */
const MONTH_ORDER = ['January','February','March','April','May','June','July','August','September','October','November','December']

function SubbieTab() {
  const supabase = createClient()
  const [allRows, setAllRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [monthFilter, setMonthFilter] = useState('May')

  // Per-section commodity filters
  const [companyCommodities, setCompanyCommodities] = useState<string[]>([])
  const [revenueCommodities, setRevenueCommodities] = useState<string[]>([])
  const [profitCommodities, setProfitCommodities] = useState<string[]>([])
  const [loadCountCommodities, setLoadCountCommodities] = useState<string[]>([])
  const [subbieCommodities, setSubbieCommodities] = useState<string[]>([])

  useEffect(() => {
    async function load() {
      const data = await fetchAll(supabase, 'loadschedule')
      setAllRows(data)
      setLoading(false)
    }
    load()
  }, [])

  const allCommodities = useMemo(() => {
    const s = new Set<string>()
    allRows.forEach(r => { if (r.commodity) s.add(r.commodity) })
    return [...s].sort()
  }, [allRows])

  const months = useMemo(() => {
    const s = new Set<string>()
    allRows.forEach(r => { if (r.month) s.add(r.month) })
    return [...s].sort((a, b) => MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b))
  }, [allRows])

  // Helper: filter rows by commodity set (empty = all)
  const filterByCommodity = (rows: any[], selected: string[]) => {
    if (selected.length === 0) return rows
    return rows.filter(r => selected.includes(r.commodity))
  }

  // Base filtered by month
  const monthRows = useMemo(() => {
    if (monthFilter === 'all') return allRows
    return allRows.filter(r => r.month === monthFilter)
  }, [allRows, monthFilter])

  // All broker loads — no month filter (for monthly charts)
  const allBroker = allRows
  // Month-filtered broker loads (for company table and subbie table)
  const monthBroker = useMemo(() => {
    if (monthFilter === 'all') return allRows
    return allRows.filter(r => r.month === monthFilter)
  }, [allRows, monthFilter])

  // ── 1. Broker Revenue by Company (FILTERED by month + commodity) ──
  const brokerCompanyData = useMemo(() => {
    const filtered = filterByCommodity(monthBroker, companyCommodities)
    const map = new Map<string, { drValue: number; crValue: number; profit: number; count: number }>()
    filtered.forEach(r => {
      const key = r.dr_name || 'Unknown'
      const existing = map.get(key) || { drValue: 0, crValue: 0, profit: 0, count: 0 }
      existing.drValue += r.dr_value || 0
      existing.crValue += r.cr_value || 0
      existing.profit += r.profit || 0
      existing.count += 1
      map.set(key, existing)
    })
    return [...map.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.drValue - a.drValue)
  }, [monthBroker, companyCommodities])

  const brokerCompanyTotals = useMemo(() => {
    return brokerCompanyData.reduce((acc, r) => ({
      drValue: acc.drValue + r.drValue,
      crValue: acc.crValue + r.crValue,
      profit: acc.profit + r.profit,
      count: acc.count + r.count,
    }), { drValue: 0, crValue: 0, profit: 0, count: 0 })
  }, [brokerCompanyData])

  // ── 2. Broker Revenue YTD by Month (ALL months + commodity filter) ──
  const brokerRevenueByMonth = useMemo(() => {
    const filtered = filterByCommodity(allBroker, revenueCommodities)
    const map = new Map<string, number>()
    filtered.forEach(r => {
      const m = r.month || 'Unknown'
      map.set(m, (map.get(m) || 0) + (r.dr_value || 0))
    })
    return MONTH_ORDER
      .filter(m => map.has(m))
      .map(m => ({ month: m, value: Math.round(map.get(m) || 0) }))
  }, [allBroker, revenueCommodities])

  const brokerRevenueGrandTotal = brokerRevenueByMonth.reduce((s, r) => s + r.value, 0)

  // ── 3. Broker Profit by Month (ALL months + commodity filter) ──
  const brokerProfitByMonth = useMemo(() => {
    const filtered = filterByCommodity(allBroker, profitCommodities)
    const map = new Map<string, number>()
    filtered.forEach(r => {
      const m = r.month || 'Unknown'
      map.set(m, (map.get(m) || 0) + (r.profit || 0))
    })
    return MONTH_ORDER
      .filter(m => map.has(m))
      .map(m => ({ month: m, value: Math.round(map.get(m) || 0) }))
  }, [allBroker, profitCommodities])

  const brokerProfitGrandTotal = brokerProfitByMonth.reduce((s, r) => s + r.value, 0)

  // ── 4. Brokerage Load Count by Month (ALL months + commodity filter) ──
  const brokerLoadCount = useMemo(() => {
    const filtered = filterByCommodity(allBroker, loadCountCommodities)
    const map = new Map<string, number>()
    filtered.forEach(r => {
      const m = r.month || 'Unknown'
      map.set(m, (map.get(m) || 0) + 1)
    })
    return MONTH_ORDER
      .filter(m => map.has(m))
      .map(m => ({ month: m, count: map.get(m) || 0 }))
  }, [allBroker, loadCountCommodities])

  const brokerLoadCountTotal = brokerLoadCount.reduce((s, r) => s + r.count, 0)

  // ── 5. Subcontractors / Transporters Used (FILTERED by month + commodity) ──
  const subbieData = useMemo(() => {
    const filtered = filterByCommodity(monthBroker, subbieCommodities)
    const map = new Map<string, { crValue: number; count: number }>()
    filtered.forEach(r => {
      const key = r.cr_name || 'Unknown'
      const existing = map.get(key) || { crValue: 0, count: 0 }
      existing.crValue += r.cr_value || 0
      existing.count += 1
      map.set(key, existing)
    })
    return [...map.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.crValue - a.crValue)
  }, [monthBroker, subbieCommodities])

  const subbieTotals = useMemo(() => {
    return subbieData.reduce((acc, r) => ({
      crValue: acc.crValue + r.crValue,
      count: acc.count + r.count,
    }), { crValue: 0, count: 0 })
  }, [subbieData])

  if (loading) return <div className="text-center py-12 text-slate-500">Loading all records...</div>

  return (
    <div className="space-y-6 mt-4">
      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-500">Filter tables by month:</span>
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ═══ ROW 1: Company Table + Revenue YTD Bar Chart ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Broker Revenue by Company</CardTitle>
              <CommodityFilter commodities={allCommodities} selected={companyCommodities} onChange={setCompanyCommodities} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-200">
                    <TableHead className="text-xs text-slate-700">Row Labels</TableHead>
                    <TableHead className="text-xs text-slate-700 text-right">Sum of DrValue</TableHead>
                    <TableHead className="text-xs text-slate-700 text-right">Sum of CrValue</TableHead>
                    <TableHead className="text-xs text-slate-700 text-right">Sum of Profit</TableHead>
                    <TableHead className="text-xs text-slate-700 text-right">Count of Load nr</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {brokerCompanyData.map((r, i) => (
                    <TableRow key={i} className="hover:bg-slate-50">
                      <TableCell className="text-xs font-medium max-w-[220px] truncate" title={r.name}>{r.name}</TableCell>
                      <TableCell className="text-xs text-right">{fmt(r.drValue)}</TableCell>
                      <TableCell className="text-xs text-right">{fmt(r.crValue)}</TableCell>
                      <TableCell className="text-xs text-right">{fmt(r.profit)}</TableCell>
                      <TableCell className="text-xs text-right">{r.count}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-slate-100">
                    <TableCell className="text-xs">Grand Total</TableCell>
                    <TableCell className="text-xs text-right">{fmt(brokerCompanyTotals.drValue)}</TableCell>
                    <TableCell className="text-xs text-right">{fmt(brokerCompanyTotals.crValue)}</TableCell>
                    <TableCell className="text-xs text-right">{fmt(brokerCompanyTotals.profit)}</TableCell>
                    <TableCell className="text-xs text-right">{brokerCompanyTotals.count}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Broker Revenue YTD May 2026</CardTitle>
              <CommodityFilter commodities={allCommodities} selected={revenueCommodities} onChange={setRevenueCommodities} />
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={brokerRevenueByMonth} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000000).toFixed(0)} 000 000`} />
                <Tooltip formatter={(v: number) => fmtR(v)} />
                <Bar dataKey="value" fill={BLUE} radius={[0, 0, 0, 0]} barSize={50}>
                  <LabelList dataKey="value" position="top" formatter={(v: number) => fmt(v)} style={{ fontSize: 10 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ═══ ROW 2: Profit Table + Profit Bar Chart ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Broker Profit per Month 2026</CardTitle>
              <CommodityFilter commodities={allCommodities} selected={profitCommodities} onChange={setProfitCommodities} />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-200">
                  <TableHead className="text-xs text-slate-700">Row</TableHead>
                  <TableHead className="text-xs text-slate-700 text-right">Sum of Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brokerProfitByMonth.map((r, i) => (
                  <TableRow key={i} className="hover:bg-slate-50">
                    <TableCell className="text-xs font-medium">{r.month}</TableCell>
                    <TableCell className="text-xs text-right">{fmtR(r.value)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-slate-100">
                  <TableCell className="text-xs">Grand</TableCell>
                  <TableCell className="text-xs text-right">{fmtR(brokerProfitGrandTotal)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Broker Profit per Month 2026</CardTitle>
              <CommodityFilter commodities={allCommodities} selected={profitCommodities} onChange={setProfitCommodities} />
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={brokerProfitByMonth} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)} 000`} />
                <Tooltip formatter={(v: number) => fmtR(v)} />
                <Bar dataKey="value" fill={BLUE} barSize={50}>
                  <LabelList dataKey="value" position="top" formatter={(v: number) => fmtR(v)} style={{ fontSize: 10 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ═══ ROW 3: Load Count Table + Load Count Bar Chart ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Brokerage load count per Month - 2026</CardTitle>
              <CommodityFilter commodities={allCommodities} selected={loadCountCommodities} onChange={setLoadCountCommodities} />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-200">
                  <TableHead className="text-xs text-slate-700">Row</TableHead>
                  <TableHead className="text-xs text-slate-700 text-right">Count of Load date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brokerLoadCount.map((r, i) => (
                  <TableRow key={i} className="hover:bg-slate-50">
                    <TableCell className="text-xs font-medium">{r.month}</TableCell>
                    <TableCell className="text-xs text-right">{r.count}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-slate-100">
                  <TableCell className="text-xs">Grand</TableCell>
                  <TableCell className="text-xs text-right">{brokerLoadCountTotal}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Brokerage load count per Month - 2026</CardTitle>
              <CommodityFilter commodities={allCommodities} selected={loadCountCommodities} onChange={setLoadCountCommodities} />
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={brokerLoadCount} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill={BLUE} barSize={50}>
                  <LabelList dataKey="count" position="top" style={{ fontSize: 10 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ═══ ROW 4: Subcontractors Table (month-filtered) + Transporter Bar Chart ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Subcontractors / Transporters Used</CardTitle>
              <CommodityFilter commodities={allCommodities} selected={subbieCommodities} onChange={setSubbieCommodities} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-200">
                    <TableHead className="text-xs text-slate-700">Row Labels</TableHead>
                    <TableHead className="text-xs text-slate-700 text-right">Sum of CrValue</TableHead>
                    <TableHead className="text-xs text-slate-700 text-right">Count of Load nr</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subbieData.map((r, i) => (
                    <TableRow key={i} className="hover:bg-slate-50">
                      <TableCell className="text-xs font-medium max-w-[280px] truncate" title={r.name}>{r.name}</TableCell>
                      <TableCell className="text-xs text-right">{fmtR(r.crValue)}</TableCell>
                      <TableCell className="text-xs text-right">{r.count}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-slate-100">
                    <TableCell className="text-xs">Grand Total</TableCell>
                    <TableCell className="text-xs text-right">{fmtR(subbieTotals.crValue)}</TableCell>
                    <TableCell className="text-xs text-right">{subbieTotals.count}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Transporter Revenue Distribution</CardTitle>
              <CommodityFilter commodities={allCommodities} selected={subbieCommodities} onChange={setSubbieCommodities} />
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={subbieData.slice(0, 15)} layout="vertical" margin={{ left: 200, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={200} />
                <Tooltip formatter={(v: number) => fmtR(v)} />
                <Bar dataKey="crValue" fill={BLUE} barSize={14}>
                  <LabelList dataKey="crValue" position="right" formatter={(v: number) => fmtR(v)} style={{ fontSize: 9 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/* ─── TOP CLIENT TAB ─── */
function TopClientTab() {
  const supabase = createClient()
  const [allRows, setAllRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [monthFilter, setMonthFilter] = useState('all')
  const [commodityFilter, setCommodityFilter] = useState<string[]>([])

  useEffect(() => {
    async function load() {
      const data = await fetchAll(supabase, 'loadschedule', (q) => q.eq('subbie2', 'EPS'))
      setAllRows(data)
      setLoading(false)
    }
    load()
  }, [])

  const monthYrs = useMemo(() => {
    const s = new Set<string>()
    allRows.forEach(r => { if (r.month_yr) s.add(r.month_yr) })
    return [...s].sort()
  }, [allRows])

  const allCommodities = useMemo(() => {
    const s = new Set<string>()
    allRows.forEach(r => { if (r.commodity) s.add(r.commodity) })
    return [...s].sort()
  }, [allRows])

  const filtered = useMemo(() => {
    let d = allRows
    if (monthFilter !== 'all') d = d.filter(r => r.month_yr === monthFilter)
    if (commodityFilter.length > 0) d = d.filter(r => commodityFilter.includes(r.commodity))
    return d
  }, [allRows, monthFilter, commodityFilter])

  const topClientData = useMemo(() => {
    const map = new Map<string, { drValue: number; count: number }>()
    filtered.forEach(r => {
      const key = r.dr_name || 'Unknown'
      const existing = map.get(key) || { drValue: 0, count: 0 }
      existing.drValue += r.dr_value || 0
      existing.count += 1
      map.set(key, existing)
    })
    return [...map.entries()]
      .map(([name, v]) => ({ name, ...v, avg: v.count > 0 ? Math.round(v.drValue / v.count) : 0 }))
      .sort((a, b) => b.drValue - a.drValue)
  }, [filtered])

  const topClientTotals = useMemo(() => {
    const totalDr = topClientData.reduce((s, r) => s + r.drValue, 0)
    const totalCt = topClientData.reduce((s, r) => s + r.count, 0)
    return { drValue: totalDr, count: totalCt, avg: totalCt > 0 ? Math.round(totalDr / totalCt) : 0 }
  }, [topClientData])

  const openNetworkData = useMemo(() => {
    const map = new Map<string, { revenue: number; fleetCount: number }>()
    allRows.forEach(r => {
      const m = r.month || 'Unknown'
      if (!map.has(m)) map.set(m, { revenue: 0, fleetCount: 0 })
      map.get(m)!.revenue += r.dr_value || 0
      map.get(m)!.fleetCount += 1
    })
    return MONTH_ORDER
      .filter(m => map.has(m))
      .map(m => {
        const v = map.get(m)!
        return { month: m, revenue: Math.round(v.revenue), fleetCount: v.fleetCount, avg: Math.round(v.revenue / v.fleetCount) }
      })
  }, [allRows])

  const openNetworkTotals = useMemo(() => {
    const totalRev = openNetworkData.reduce((s, r) => s + r.revenue, 0)
    const totalFleet = openNetworkData.reduce((s, r) => s + r.fleetCount, 0)
    return { revenue: totalRev, fleetCount: totalFleet, avg: totalFleet > 0 ? Math.round(totalRev / totalFleet) : 0 }
  }, [openNetworkData])

  if (loading) return <div className="text-center py-12 text-slate-500">Loading all records...</div>

  return (
    <div className="space-y-8 mt-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Month+Yr" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {monthYrs.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <CommodityFilter commodities={allCommodities} selected={commodityFilter} onChange={setCommodityFilter} />
      </div>

      {/* SECTION 1: TOP CLIENTS */}
      <div>
        <div className="mb-3 text-sm font-semibold text-slate-700">TOP CLIENTS - OWN EPS TRUCKS (YEAR TO DATE 2026)</div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="pt-4">
              <div className="overflow-auto max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-200">
                      <TableHead className="text-xs text-slate-700">Row Labels</TableHead>
                      <TableHead className="text-xs text-slate-700 text-right">Sum of DrValue</TableHead>
                      <TableHead className="text-xs text-slate-700 text-right">FLEET COUNT</TableHead>
                      <TableHead className="text-xs text-slate-700 text-right">Ave p.M</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topClientData.map((r, i) => (
                      <TableRow key={i} className="hover:bg-slate-50">
                        <TableCell className="text-xs font-medium max-w-[250px] truncate" title={r.name}>{r.name}</TableCell>
                        <TableCell className="text-xs text-right">{fmtR(r.drValue)}</TableCell>
                        <TableCell className="text-xs text-right">{r.count}</TableCell>
                        <TableCell className="text-xs text-right">{fmtR(r.avg)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-slate-100">
                      <TableCell className="text-xs">Grand Total</TableCell>
                      <TableCell className="text-xs text-right">{fmtR(topClientTotals.drValue)}</TableCell>
                      <TableCell className="text-xs text-right">{topClientTotals.count}</TableCell>
                      <TableCell className="text-xs text-right">{fmtR(topClientTotals.avg)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <ResponsiveContainer width="100%" height={Math.max(500, topClientData.length * 28)}>
                <BarChart data={topClientData} layout="vertical" margin={{ top: 5, right: 60, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 8 }} width={250} />
                  <Tooltip formatter={(v: number, name: string) => name === 'drValue' ? fmtR(v) : v} />
                  <Bar dataKey="drValue" name="Sum of DrValue" fill={BLUE} barSize={14}>
                    <LabelList dataKey="drValue" position="right" formatter={(v: number) => fmt(v)} style={{ fontSize: 9 }} />
                  </Bar>
                  <Bar dataKey="count" name="Count of Load nr" fill="#ED7D31" barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SECTION 2: OPEN NETWORK MONTHLY REVENUE */}
      <div>
        <div className="mb-3 text-sm font-semibold text-slate-700">Open Network Monthly Revenue - 2026</div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="pt-4">
              <div className="overflow-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-200">
                      <TableHead className="text-xs text-slate-700">Row Labels</TableHead>
                      <TableHead className="text-xs text-slate-700 text-right">Sum of DrValue</TableHead>
                      <TableHead className="text-xs text-slate-700 text-right">FLEET COUNT</TableHead>
                      <TableHead className="text-xs text-slate-700 text-right">Ave p.M</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {openNetworkData.map((r, i) => (
                      <TableRow key={i} className="hover:bg-slate-50">
                        <TableCell className="text-xs font-medium">{r.month}</TableCell>
                        <TableCell className="text-xs text-right">{fmtR(r.revenue)}</TableCell>
                        <TableCell className="text-xs text-right">{r.fleetCount}</TableCell>
                        <TableCell className="text-xs text-right">{fmtR(r.avg)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-slate-100">
                      <TableCell className="text-xs">Grand Total</TableCell>
                      <TableCell className="text-xs text-right">{fmtR(openNetworkTotals.revenue)}</TableCell>
                      <TableCell className="text-xs text-right">{openNetworkTotals.fleetCount}</TableCell>
                      <TableCell className="text-xs text-right">{fmtR(openNetworkTotals.avg)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={openNetworkData} margin={{ top: 20, right: 50, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000000).toFixed(0)}M`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number, name: string) => name === 'revenue' ? fmtR(v) : v} />
                  <Bar yAxisId="left" dataKey="revenue" name="Sum of DrValue" fill="#70AD47" barSize={40}>
                    <LabelList dataKey="revenue" position="top" formatter={(v: number) => fmtR(v)} style={{ fontSize: 9 }} />
                  </Bar>
                  <Line yAxisId="right" type="monotone" dataKey="fleetCount" name="FLEET COUNT" stroke={BLUE} strokeWidth={2} dot={{ fill: BLUE, r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
