"use client"

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, Filter, X, Check } from 'lucide-react'

interface ExcelFilterTableProps {
  headers: string[]
  rows: any[][]
  totals?: any[]
  maxHeight?: string
  className?: string
}

export function ExcelFilterTable({ headers, rows, totals, maxHeight = '70vh', className = '' }: ExcelFilterTableProps) {
  const [sortCol, setSortCol] = useState<number | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [colFilters, setColFilters] = useState<Record<number, Set<string>>>({})
  const [globalSearch, setGlobalSearch] = useState('')

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
    setColFilters(prev => {
      const next = { ...prev }
      next[colIdx] = new Set(values)
      return next
    })
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
    headers.forEach((_, colIdx) => {
      const s = new Set<string>()
      rows.forEach(r => {
        const v = String(r[colIdx] ?? '')
        if (v) s.add(v)
      })
      map[colIdx] = [...s].sort()
    })
    return map
  }, [headers, rows])

  const processedRows = useMemo(() => {
    let result = rows

    if (globalSearch) {
      const q = globalSearch.toLowerCase()
      result = result.filter(r => r.some(c => String(c ?? '').toLowerCase().includes(q)))
    }

    Object.entries(colFilters).forEach(([colStr, set]) => {
      const colIdx = Number(colStr)
      if (set.size > 0) {
        result = result.filter(r => set.has(String(r[colIdx] ?? '')))
      }
    })

    if (sortCol !== null) {
      result = [...result].sort((a, b) => {
        const av = a[sortCol]
        const bv = b[sortCol]
        const aNum = typeof av === 'number' ? av : parseFloat(String(av).replace(/[R,%]/g, ''))
        const bNum = typeof bv === 'number' ? bv : parseFloat(String(bv).replace(/[R,%]/g, ''))
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortDir === 'asc' ? aNum - bNum : bNum - aNum
        }
        const aStr = String(av ?? '')
        const bStr = String(bv ?? '')
        return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
      })
    }

    return result
  }, [rows, globalSearch, colFilters, sortCol, sortDir])

  const activeFilterCount = useMemo(() => {
    return Object.values(colFilters).filter(s => s.size > 0).length
  }, [colFilters])

  return (
    <div className={`flex flex-col min-h-0 ${className}`} style={{ maxHeight }}>
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-slate-50 flex-shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search all columns..."
            value={globalSearch}
            onChange={e => setGlobalSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
        <span className="text-xs text-slate-500">{processedRows.length.toLocaleString()} of {rows.length.toLocaleString()} rows</span>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-500" onClick={() => { setColFilters({}); setGlobalSearch('') }}>
            <X className="w-3 h-3 mr-1" />Clear all filters
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-auto min-h-0">
        <Table className="text-sm">
          <TableHeader>
            <TableRow className="bg-slate-100 hover:bg-slate-100 sticky top-0 z-20">
              {headers.map((h, i) => (
                <TableHead key={i} className="text-xs font-bold text-slate-700 py-2 px-2 select-none">
                  <div className="flex items-center gap-1">
                    <button
                      className="flex items-center gap-1 hover:text-blue-600 transition-colors flex-1 text-left"
                      onClick={() => handleSort(i)}
                    >
                      {h}
                      {sortCol === i ? (
                        sortDir === 'asc' ? <ChevronUp className="w-3 h-3 shrink-0" /> : <ChevronDown className="w-3 h-3 shrink-0" />
                      ) : (
                        <ChevronsUpDown className="w-3 h-3 shrink-0 opacity-30" />
                      )}
                    </button>
                    <ColumnFilterPopover
                      values={uniqueValues[i] || []}
                      selected={colFilters[i]}
                      onToggle={v => toggleColFilter(i, v)}
                      onSetAll={vals => setAllColFilter(i, vals)}
                      onClear={() => clearColFilter(i)}
                    />
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {processedRows.map((row, i) => (
              <TableRow key={i} className={i % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-slate-50/50 hover:bg-blue-50'}>
                {row.map((cell, j) => (
                  <TableCell key={j} className="text-xs py-2 px-2">{cell ?? ''}</TableCell>
                ))}
              </TableRow>
            ))}
            {totals && (
              <TableRow className="font-bold bg-slate-200 hover:bg-slate-200 sticky bottom-0 z-10 border-t-2 border-slate-300">
                {totals.map((cell, j) => (
                  <TableCell key={j} className="text-xs py-3 px-2">{cell}</TableCell>
                ))}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function ColumnFilterPopover({ values, selected, onToggle, onSetAll, onClear }: {
  values: string[]
  selected: Set<string> | undefined
  onToggle: (v: string) => void
  onSetAll: (vals: string[]) => void
  onClear: () => void
}) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50)
    } else {
      setSearch('')
    }
  }, [open])

  const filtered = useMemo(() => {
    if (!search) return values
    const q = search.toLowerCase()
    return values.filter(v => v.toLowerCase().includes(q))
  }, [values, search])

  const allVisibleSelected = filtered.length > 0 && filtered.every(v => selected?.has(v))
  const someSelected = filtered.some(v => selected?.has(v))
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
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-7 pl-7 pr-2 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-1 px-2 py-1.5 border-b text-xs">
          <button
            className="text-blue-600 hover:underline"
            onClick={() => onSetAll(filtered)}
          >
            Select All
          </button>
          <span className="text-slate-300">|</span>
          <button
            className="text-blue-600 hover:underline"
            onClick={onClear}
          >
            Clear
          </button>
        </div>
        <div className="max-h-56 overflow-y-auto p-1">
          <label className="flex items-center gap-2 px-2 py-1 text-xs hover:bg-slate-100 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={() => allVisibleSelected ? onSetAll([]) : onSetAll(filtered)}
              className="w-3 h-3 rounded border-slate-300"
            />
            <span className="font-medium">({filtered.length})</span>
          </label>
          {filtered.map(v => (
            <label key={v} className="flex items-center gap-2 px-2 py-1 text-xs hover:bg-slate-100 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={selected?.has(v) ?? false}
                onChange={() => onToggle(v)}
                className="w-3 h-3 rounded border-slate-300"
              />
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
}
