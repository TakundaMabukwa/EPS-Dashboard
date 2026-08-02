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
import { Search, Check, ChevronDown, X } from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

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

async function fetchAll(supabase: any, table: string, filter?: (q: any) => any) {
  let query = supabase.from(table).select('*')
  if (filter) query = filter(query)
  const { count } = await query.then((r: any) => r, () => ({ count: 0 }))
  const PAGE = 1000
  let all: any[] = []
  for (let from = 0; ; from += PAGE) {
    let q = supabase.from(table).select('*').range(from, from + PAGE - 1)
    if (filter) q = filter(q)
    const { data } = await q
    if (!data || data.length === 0) break
    all = all.concat(data)
    if (data.length < PAGE) break
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
function DataTab() {
  const supabase = createClient()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [monthFilter, setMonthFilter] = useState('all')
  const [page, setPage] = useState(0)
  const PAGE = 100

  useEffect(() => {
    async function load() {
      const data = await fetchAll(supabase, 'loadschedule')
      setRows(data)
      setLoading(false)
    }
    load()
  }, [])

  const months = useMemo(() => {
    const s = new Set<string>()
    const order = ['January','February','March','April','May','June','July','August','September','October','November','December']
    rows.forEach(r => { if (r.month) s.add(r.month) })
    return [...s].sort((a, b) => order.indexOf(a) - order.indexOf(b))
  }, [rows])

  const filtered = useMemo(() => {
    let d = rows
    if (monthFilter !== 'all') d = d.filter(r => r.month === monthFilter)
    if (search) {
      const q = search.toLowerCase()
      d = d.filter(r =>
        String(r.dr_name || '').toLowerCase().includes(q) ||
        String(r.load_nr || '').toLowerCase().includes(q) ||
        String(r.driver_name || '').toLowerCase().includes(q) ||
        String(r.own_reg || '').toLowerCase().includes(q) ||
        String(r.load_descrip || '').toLowerCase().includes(q) ||
        String(r.offload_descrip || '').toLowerCase().includes(q) ||
        String(r.commodity || '').toLowerCase().includes(q)
      )
    }
    return d
  }, [rows, monthFilter, search])

  const paged = filtered.slice(page * PAGE, (page + 1) * PAGE)
  const totalPages = Math.ceil(filtered.length / PAGE)

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search load nr, client, driver, reg..." value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} className="pl-9" />
        </div>
        <Select value={monthFilter} onValueChange={v => { setMonthFilter(v); setPage(0) }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Months" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-sm text-slate-500">{filtered.length.toLocaleString()} records</span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading all records...</div>
      ) : (
        <>
          <div className="overflow-auto max-h-[70vh] border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-slate-800 to-slate-900">
                  <TableHead className="text-white text-xs">Load Nr</TableHead>
                  <TableHead className="text-white text-xs">Date</TableHead>
                  <TableHead className="text-white text-xs">Month</TableHead>
                  <TableHead className="text-white text-xs">Client</TableHead>
                  <TableHead className="text-white text-xs">Load/Del</TableHead>
                  <TableHead className="text-white text-xs">Commodity</TableHead>
                  <TableHead className="text-white text-xs">From</TableHead>
                  <TableHead className="text-white text-xs">To</TableHead>
                  <TableHead className="text-white text-xs">Driver</TableHead>
                  <TableHead className="text-white text-xs">Reg</TableHead>
                  <TableHead className="text-white text-xs text-right">Qty</TableHead>
                  <TableHead className="text-white text-xs text-right">Dr Value</TableHead>
                  <TableHead className="text-white text-xs text-right">Cr Value</TableHead>
                  <TableHead className="text-white text-xs text-right">Profit</TableHead>
                  <TableHead className="text-white text-xs text-right">Route Km</TableHead>
                  <TableHead className="text-white text-xs text-right">Map Km</TableHead>
                  <TableHead className="text-white text-xs">Region</TableHead>
                  <TableHead className="text-white text-xs">Subbie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((r, i) => (
                  <TableRow key={r.id || i} className="hover:bg-slate-50">
                    <TableCell className="text-xs">{r.load_nr}</TableCell>
                    <TableCell className="text-xs">{r.load_date}</TableCell>
                    <TableCell className="text-xs">{r.month}</TableCell>
                    <TableCell className="text-xs max-w-[150px] truncate" title={r.dr_name}>{r.dr_name}</TableCell>
                    <TableCell className="text-xs max-w-[120px] truncate" title={r.load_del}>{r.load_del}</TableCell>
                    <TableCell className="text-xs max-w-[120px] truncate" title={r.commodity}>{r.commodity}</TableCell>
                    <TableCell className="text-xs">{r.from_loc}</TableCell>
                    <TableCell className="text-xs">{r.to_loc}</TableCell>
                    <TableCell className="text-xs max-w-[120px] truncate" title={r.driver_name}>{r.driver_name}</TableCell>
                    <TableCell className="text-xs">{r.own_reg}</TableCell>
                    <TableCell className="text-xs text-right">{r.qty}</TableCell>
                    <TableCell className="text-xs text-right">{fmtR(r.dr_value)}</TableCell>
                    <TableCell className="text-xs text-right">{fmtR(r.cr_value)}</TableCell>
                    <TableCell className="text-xs text-right">{fmtR(r.profit)}</TableCell>
                    <TableCell className="text-xs text-right">{r.route_km}</TableCell>
                    <TableCell className="text-xs text-right">{r.map_km}</TableCell>
                    <TableCell className="text-xs">{r.load_region}</TableCell>
                    <TableCell className="text-xs max-w-[120px] truncate" title={r.cr_name}>{r.cr_name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Page {page + 1} of {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* ─── EXECUTIVE TAB ─── */
function ExecTab() {
  const supabase = createClient()
  const [allRows, setAllRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [commodityFilter, setCommodityFilter] = useState<string[]>([])
  const [monthFilter, setMonthFilter] = useState('all')
  const [drillDown, setDrillDown] = useState<{ title: string; headers: string[]; rows: any[][]; totals?: any[] } | null>(null)

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

  const monthYrs = useMemo(() => {
    const s = new Set<string>()
    allRows.forEach(r => { if (r.month_yr) s.add(r.month_yr) })
    return [...s].sort()
  }, [allRows])

  const filterByCommodity = (rows: any[], selected: string[]) => {
    if (selected.length === 0) return rows
    return rows.filter(r => selected.includes(r.commodity))
  }

  const monthRows = useMemo(() => {
    if (monthFilter === 'all') return allRows
    return allRows.filter(r => r.month === monthFilter || r.month_yr === monthFilter)
  }, [allRows, monthFilter])

  const allFiltered = useMemo(() => filterByCommodity(allRows, commodityFilter), [allRows, commodityFilter])
  const monthFiltered = useMemo(() => filterByCommodity(monthRows, commodityFilter), [monthRows, commodityFilter])

  // ── Chart 1: Broker Revenue YTD ──
  const revenueByMonth = useMemo(() => {
    const map = new Map<string, number>()
    allFiltered.forEach(r => {
      const m = r.month || 'Unknown'
      map.set(m, (map.get(m) || 0) + (r.dr_value || 0))
    })
    return MONTH_ORDER.filter(m => map.has(m)).map(m => ({ month: m, value: Math.round(map.get(m) || 0) }))
  }, [allFiltered])

  // ── Chart 2: Broker Profit by Month ──
  const profitByMonth = useMemo(() => {
    const map = new Map<string, number>()
    allFiltered.forEach(r => {
      const m = r.month || 'Unknown'
      map.set(m, (map.get(m) || 0) + (r.profit || 0))
    })
    return MONTH_ORDER.filter(m => map.has(m)).map(m => ({ month: m, value: Math.round(map.get(m) || 0) }))
  }, [allFiltered])

  // ── Chart 3: Load Count by Month ──
  const loadCountByMonth = useMemo(() => {
    const map = new Map<string, number>()
    allFiltered.forEach(r => {
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
    allFiltered.forEach(r => {
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

  if (loading) return <div className="text-center py-12 text-slate-500">Loading executive data...</div>

  return (
    <div className="space-y-6 mt-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
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
            const headers = ['Month', 'Revenue']
            const rows = revenueByMonth.map(r => [r.month, fmtR(r.value)])
            const totals = ['Grand Total', fmtR(revenueByMonth.reduce((s, r) => s + r.value, 0))]
            setDrillDown({ title: 'Broker Revenue YTD', headers, rows, totals })
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
            const headers = ['Month', 'Profit']
            const rows = profitByMonth.map(r => [r.month, fmtR(r.value)])
            const totals = ['Grand Total', fmtR(profitByMonth.reduce((s, r) => s + r.value, 0))]
            setDrillDown({ title: 'Broker Profit by Month', headers, rows, totals })
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
            const headers = ['Month', 'Load Count']
            const rows = loadCountByMonth.map(r => [r.month, String(r.count)])
            const totals = ['Grand Total', String(loadCountByMonth.reduce((s, r) => s + r.count, 0))]
            setDrillDown({ title: 'Brokerage Load Count per Month', headers, rows, totals })
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
            const headers = ['Transporter', 'Revenue', 'Loads']
            const rows = transporterData.map(r => [r.name, fmtR(r.crValue), String(r.count)])
            const totals = ['Grand Total', fmtR(transporterData.reduce((s, r) => s + r.crValue, 0)), String(transporterData.reduce((s, r) => s + r.count, 0))]
            setDrillDown({ title: 'Transporter Revenue Distribution (Top 15)', headers, rows, totals })
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
            const headers = ['Client', 'Revenue', 'Loads', 'Avg p.Load']
            const rows = topClientData.map(r => [r.name, fmtR(r.drValue), String(r.count), fmtR(r.avg)])
            const totDr = topClientData.reduce((s, r) => s + r.drValue, 0)
            const totCt = topClientData.reduce((s, r) => s + r.count, 0)
            const totals = ['Grand Total', fmtR(totDr), String(totCt), fmtR(totCt > 0 ? Math.round(totDr / totCt) : 0)]
            setDrillDown({ title: 'Top Clients - Own EPS Trucks', headers, rows, totals })
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
            const headers = ['Month', 'Revenue', 'Fleet Count', 'Avg p.Load']
            const rows = openNetworkData.map(r => [r.month, fmtR(r.revenue), String(r.fleetCount), fmtR(r.avg)])
            const totRev = openNetworkData.reduce((s, r) => s + r.revenue, 0)
            const totFl = openNetworkData.reduce((s, r) => s + r.fleetCount, 0)
            const totals = ['Grand Total', fmtR(totRev), String(totFl), fmtR(totFl > 0 ? Math.round(totRev / totFl) : 0)]
            setDrillDown({ title: 'Open Network Monthly Revenue', headers, rows, totals })
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

      {/* Drill-down Modal */}
      <Dialog open={!!drillDown} onOpenChange={() => setDrillDown(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{drillDown?.title}</DialogTitle>
            <DialogDescription>Underlying data for this chart</DialogDescription>
          </DialogHeader>
          {drillDown && (
            <div className="overflow-auto flex-1">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-200">
                    {drillDown.headers.map((h, i) => (
                      <TableHead key={i} className={`text-xs text-slate-700 ${i > 0 ? 'text-right' : ''}`}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drillDown.rows.map((row, i) => (
                    <TableRow key={i} className="hover:bg-slate-50">
                      {row.map((cell, j) => (
                        <TableCell key={j} className={`text-xs ${j === 0 ? 'font-medium' : 'text-right'}`}>{cell}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {drillDown.totals && (
                    <TableRow className="font-bold bg-slate-100">
                      {drillDown.totals.map((cell, j) => (
                        <TableCell key={j} className={`text-xs ${j === 0 ? '' : 'text-right'}`}>{cell}</TableCell>
                      ))}
                    </TableRow>
                  )}
                </TableBody>
              </Table>
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
