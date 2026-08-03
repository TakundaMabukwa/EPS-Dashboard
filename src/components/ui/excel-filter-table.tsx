"use client"

import React, { useState, useMemo, useCallback, useRef, useEffect, memo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, Filter, X } from 'lucide-react'
import { TableVirtuoso } from 'react-virtuoso'

interface ExcelFilterTableProps {
  headers: string[]
  rows: any[][]
  totals?: any[]
  maxHeight?: string
  className?: string
}

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

const Cell = memo(({ children, align }: { children: any; align?: string }) => (
  <td className={`text-xs py-1.5 px-2 border-b border-slate-100 ${align === 'right' ? 'text-right' : ''}`}>
    {children ?? ''}
  </td>
))
Cell.displayName = 'Cell'

const HeaderCell = memo(({ h, i, sortCol, sortDir, onSort, children }: {
  h: string; i: number; sortCol: number | null; sortDir: string; onSort: (i: number) => void; children: React.ReactNode
}) => (
  <th className="text-xs font-bold text-slate-700 py-2 px-2 select-none bg-slate-100 sticky top-0 z-20">
    <div className="flex items-center gap-1 group">
      <button className="flex items-center gap-1 hover:text-blue-600 transition-colors flex-1 text-left" onClick={() => onSort(i)}>
        {h}
        {sortCol === i ? (
          sortDir === 'asc' ? <ChevronUp className="w-3 h-3 shrink-0" /> : <ChevronDown className="w-3 h-3 shrink-0" />
        ) : (
          <ChevronsUpDown className="w-3 h-3 shrink-0 opacity-30" />
        )}
      </button>
      {children}
    </div>
  </th>
))
HeaderCell.displayName = 'HeaderCell'

export function ExcelFilterTable({ headers, rows, totals, maxHeight = '70vh', className = '' }: ExcelFilterTableProps) {
  const [sortCol, setSortCol] = useState<number | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [colFilters, setColFilters] = useState<Record<number, Set<string>>>({})
  const [rawSearch, setRawSearch] = useState('')
  const globalSearch = useDebounced(rawSearch, 150)

  const handleSort = useCallback((colIdx: number) => {
    setSortCol(prev => {
      if (prev === colIdx) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        return colIdx
      }
      setSortDir('asc')
      return colIdx
    })
  }, [])

  const toggleColFilter = useCallback((colIdx: number, value: string) => {
    setColFilters(prev => {
      const next = { ...prev }
      const set = new Set(next[colIdx] || [])
      if (set.has(value)) set.delete(value)
      else set.add(value)
      next[colIdx] = set
      return next
    })
  }, [])

  const setAllColFilter = useCallback((colIdx: number, values: string[]) => {
    setColFilters(prev => ({ ...prev, [colIdx]: new Set(values) }))
  }, [])

  const clearColFilter = useCallback((colIdx: number) => {
    setColFilters(prev => {
      const next = { ...prev }
      delete next[colIdx]
      return next
    })
  }, [])

  const uniqueValues = useMemo(() => {
    const map: Record<number, string[]> = {}
    const sets: Record<number, Set<string>> = {}
    headers.forEach((_, i) => { sets[i] = new Set() })
    rows.forEach(r => {
      headers.forEach((_, i) => {
        const v = String(r[i] ?? '')
        if (v) sets[i].add(v)
      })
    })
    headers.forEach((_, i) => { map[i] = [...sets[i]].sort() })
    return map
  }, [headers, rows])

  const activeFilterCount = useMemo(() => Object.values(colFilters).filter(s => s.size > 0).length, [colFilters])

  const processedRows = useMemo(() => {
    let result = rows

    if (globalSearch) {
      const q = globalSearch.toLowerCase()
      result = result.filter(r => r.some(c => String(c ?? '').toLowerCase().includes(q)))
    }

    const activeFilters = Object.entries(colFilters)
    if (activeFilters.length > 0) {
      result = result.filter(r => {
        for (const [colStr, set] of activeFilters) {
          if (set.size > 0 && !set.has(String(r[Number(colStr)] ?? ''))) return false
        }
        return true
      })
    }

    if (sortCol !== null) {
      const col = sortCol
      const dir = sortDir === 'asc' ? 1 : -1
      result = [...result].sort((a, b) => {
        const av = a[col]
        const bv = b[col]
        const aNum = typeof av === 'number' ? av : parseFloat(String(av).replace(/[R,%]/g, ''))
        const bNum = typeof bv === 'number' ? bv : parseFloat(String(bv).replace(/[R,%]/g, ''))
        if (!isNaN(aNum) && !isNaN(bNum)) return (aNum - bNum) * dir
        return String(av ?? '').localeCompare(String(bv ?? '')) * dir
      })
    }

    return result
  }, [rows, globalSearch, colFilters, sortCol, sortDir])

  return (
    <div className={`flex flex-col min-h-0 ${className}`} style={{ maxHeight }}>
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-slate-50 flex-shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search all columns..."
            value={rawSearch}
            onChange={e => setRawSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
        <span className="text-xs text-slate-500">{processedRows.length.toLocaleString()} of {rows.length.toLocaleString()} rows</span>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-500" onClick={() => { setColFilters({}); setRawSearch('') }}>
            <X className="w-3 h-3 mr-1" />Clear all filters
          </Button>
        )}
      </div>

      <div className="flex-1 min-h-0" style={{ height: 'calc(100% - 44px)' }}>
        <TableVirtuoso
          style={{ height: '100%' }}
          data={processedRows}
          overscan={20}
          fixedHeaderContent={() => (
            <tr>
              {headers.map((h, i) => (
                <HeaderCell key={i} h={h} i={i} sortCol={sortCol} sortDir={sortDir} onSort={handleSort}>
                  <ColumnFilterPopover
                    values={uniqueValues[i] || []}
                    selected={colFilters[i]}
                    onToggle={v => toggleColFilter(i, v)}
                    onSetAll={vals => setAllColFilter(i, vals)}
                    onClear={() => clearColFilter(i)}
                  />
                </HeaderCell>
              ))}
            </tr>
          )}
          itemContent={(index, row) => (
            <>
              {row.map((cell, j) => (
                <Cell key={j} align={j > 0 && j < 4 ? undefined : undefined}>
                  {cell}
                </Cell>
              ))}
            </>
          )}
          components={{
            Table: (props) => (
              <table {...props} className="w-full text-sm" style={{ ...props.style, borderCollapse: 'collapse' }} />
            ),
            TableHead: React.forwardRef<HTMLTableSectionElement>((props, ref) => (
              <thead {...props} ref={ref} />
            )),
            TableBody: React.forwardRef<HTMLTableSectionElement>((props, ref) => (
              <tbody {...props} ref={ref} />
            )),
            TableRow: (props) => {
              const { ...rest } = props
              return <tr {...rest} className={props.context?.index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} />
            },
          }}
          context={{ index: 0 }}
        />
      </div>

      {totals && (
        <div className="flex-shrink-0 border-t-2 border-slate-300 bg-slate-200 font-bold">
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                {totals.map((cell, j) => (
                  <td key={j} className="text-xs py-3 px-2">{cell}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const ColumnFilterPopover = memo(({ values, selected, onToggle, onSetAll, onClear }: {
  values: string[]
  selected: Set<string> | undefined
  onToggle: (v: string) => void
  onSetAll: (vals: string[]) => void
  onClear: () => void
}) => {
  const [rawSearch, setRawSearch] = useState('')
  const [open, setOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50)
    else setRawSearch('')
  }, [open])

  const filtered = useMemo(() => {
    if (!rawSearch) return values
    const q = rawSearch.toLowerCase()
    return values.filter(v => v.toLowerCase().includes(q))
  }, [values, rawSearch])

  const allVisibleSelected = filtered.length > 0 && filtered.every(v => selected?.has(v))
  const hasActiveFilter = selected && selected.size > 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`shrink-0 p-0.5 rounded hover:bg-slate-200 transition-colors ${hasActiveFilter ? 'text-blue-600' : 'text-slate-400 opacity-0 group-hover:opacity-100'}`}
          onClick={e => e.stopPropagation()}
        >
          <Filter className="w-3 h-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={2} className="w-64 p-0" onClick={e => e.stopPropagation()}>
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
            <input
              ref={searchRef}
              placeholder="Filter..."
              value={rawSearch}
              onChange={e => setRawSearch(e.target.value)}
              className="w-full h-7 pl-7 pr-2 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-1 px-2 py-1.5 border-b text-xs">
          <button className="text-blue-600 hover:underline" onClick={() => onSetAll(filtered)}>Select All</button>
          <span className="text-slate-300">|</span>
          <button className="text-blue-600 hover:underline" onClick={onClear}>Clear</button>
        </div>
        <div className="max-h-56 overflow-y-auto p-1">
          <label className="flex items-center gap-2 px-2 py-1 text-xs hover:bg-slate-100 rounded cursor-pointer">
            <input type="checkbox" checked={allVisibleSelected} onChange={() => allVisibleSelected ? onSetAll([]) : onSetAll(filtered)} className="w-3 h-3 rounded border-slate-300" />
            <span className="font-medium">({filtered.length})</span>
          </label>
          {filtered.map(v => (
            <label key={v} className="flex items-center gap-2 px-2 py-1 text-xs hover:bg-slate-100 rounded cursor-pointer">
              <input type="checkbox" checked={selected?.has(v) ?? false} onChange={() => onToggle(v)} className="w-3 h-3 rounded border-slate-300" />
              <span className="truncate">{v || '(blank)'}</span>
            </label>
          ))}
          {filtered.length === 0 && (
            <div className="px-2 py-3 text-xs text-slate-400 text-center">No matches</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
})
ColumnFilterPopover.displayName = 'ColumnFilterPopover'
