'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, BarChart3, CheckCircle2, FileDown, Plus, Route, Trash2, User } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import TripRouteMap from '@/components/audit/TripRouteMap'
import {
  AFRICAN_CURRENCY_OPTIONS,
  AuditCurrencyCode,
  AuditFinanceEntry,
  buildActualCostSummary,
  currency,
  defaultFinanceCategoryCatalog,
  fmtDateTime,
  getClientName,
  minutesToText,
  normalizeCurrency,
  numberFmt,
  toNumber,
} from '@/lib/audit-utils'

function WorkspaceTabButton({
  active,
  index,
  label,
  onClick,
}: {
  active: boolean
  index: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex-1 rounded-xl px-4 py-3 text-xs font-semibold transition-all',
        'flex items-center justify-center gap-2',
        active ? 'bg-white text-[#001e42] shadow-sm' : 'text-slate-500 hover:bg-slate-100',
      ].join(' ')}
    >
      <span
        className={[
          'flex h-5 w-5 items-center justify-center rounded-full text-[10px]',
          active ? 'bg-[#001e42] text-white' : 'border border-slate-300 text-slate-500',
        ].join(' ')}
      >
        {index}
      </span>
      {label}
    </button>
  )
}

function FundsBar({ label, amount, total, tone }: { label: string; amount: number; total: number; tone: string }) {
  const pct = total > 0 ? (Math.abs(amount) / total) * 100 : 0
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-bold text-[#001e42]">{label}</div>
          <div className="text-xs text-slate-500">{pct.toFixed(1)}% of actual cost</div>
        </div>
        <div className="text-sm font-black tabular-nums text-slate-900">{currency(amount)}</div>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

type Props = {
  record: any
  initialFinanceEntries: AuditFinanceEntry[]
  routeData?: any
  routeLoading?: boolean
  initialTab?: 'summary' | 'finance' | 'route'
  onBack?: () => void
  onSaveAudit?: (payload: {
    amountToSplit: number
    actualRate: number
    actualCurrency: AuditCurrencyCode
    invoiceRate: number
    invoiceCurrency: AuditCurrencyCode
    financeEntries: AuditFinanceEntry[]
  }) => Promise<void>
  onExport?: () => void
  onFinalAudit?: () => void
}

export default function AuditTripWorkspace({
  record,
  initialFinanceEntries,
  routeData,
  routeLoading,
  initialTab = 'summary',
  onBack,
  onSaveAudit,
  onExport,
  onFinalAudit,
}: Props) {
  const [activeTab, setActiveTab] = useState<'summary' | 'finance' | 'route'>(initialTab)
  const [financeEntries, setFinanceEntries] = useState<AuditFinanceEntry[]>(initialFinanceEntries)
  const [isSaving, setIsSaving] = useState(false)

  const actualCurrency = normalizeCurrency(record?.actual_currency)
  const invoiceCurrency = normalizeCurrency(record?.invoice_currency)

  const plannedRate = toNumber(record?.planned_rate || record?.rate)
  const actualRate = toNumber(record?.actual_rate)
  const invoiceRate = toNumber(record?.invoice_rate)

  const plannedFuelCost = toNumber(record?.planned_fuel_cost)
  const plannedVehicleCost = toNumber(record?.planned_vehicle_cost)
  const plannedDriverCost = toNumber(record?.planned_driver_cost)
  const plannedTotalCost = toNumber(record?.planned_total_cost)
  const fuelUsedLiters = toNumber(record?.fuel_used_liters)
  const fuelFilledLiters = toNumber(record?.fuel_filled_liters)
  const fuelLitersPerHour = toNumber(record?.fuel_liters_per_hour)
  const fuelLitersPerKm = toNumber(record?.fuel_liters_per_km)
  const fuelOperatingHours = toNumber(record?.fuel_operating_hours)

  const actualCostSummary = useMemo(() => buildActualCostSummary(financeEntries), [financeEntries])
  const fuelCostTotal = actualCostSummary.actualFuelCost

  const myRate = plannedRate > 0 && actualCurrency === 'ZAR'
    ? plannedRate - (actualRate + fuelCostTotal)
    : null
  const actualTotalCost = actualCostSummary.total

  const effectiveFinanceEntries = useMemo(() => financeEntries, [financeEntries])

  const fundsBreakdown = useMemo(() => {
    return effectiveFinanceEntries
      .filter((e) => Math.abs(e.actualAmount) > 0.01)
      .map((e) => ({
        key: e.categoryKey,
        label: e.label,
        amount: e.actualAmount,
        widthPercent: actualTotalCost > 0 ? (Math.abs(e.actualAmount) / actualTotalCost) * 100 : 0,
        tone:
          e.group === 'fuel' ? 'bg-rose-500' :
          e.group === 'vehicle' ? 'bg-sky-500' :
          e.group === 'driver' ? 'bg-emerald-500' :
          'bg-slate-500',
      }))
  }, [effectiveFinanceEntries, actualTotalCost])

  const amountToSplit = toNumber(record?.amount_to_split) || actualRate || plannedRate
  const unallocated = amountToSplit - actualTotalCost

  const handleSaveAudit = async () => {
    if (!onSaveAudit) return
    setIsSaving(true)
    try {
      await onSaveAudit({
        amountToSplit,
        actualRate,
        actualCurrency,
        invoiceRate,
        invoiceCurrency,
        financeEntries,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddFinanceCategory = () => {
    const key = `custom-${Date.now()}`
    setFinanceEntries((prev) => [
      ...prev,
      {
        id: key,
        categoryKey: key,
        label: 'New Category',
        group: 'other',
        plannedAmount: 0,
        actualAmount: 0,
        source: 'custom',
        notes: '',
      },
    ])
  }

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="flex items-start justify-between gap-4 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            {onBack ? (
              <Button variant="ghost" size="icon" onClick={onBack} className="mt-0.5 h-8 w-8 shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : null}
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
                Financial Reporting
              </div>
              <div className="truncate text-lg font-extrabold text-[#001e42]">
                {record?.trip_id || 'Trip Audit'}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span>{record?.ordernumber || 'No order number'}</span>
                <span>{getClientName(record)}</span>
                <span>{record?.origin || 'N/A'} to {record?.destination || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button variant="outline" size="sm" onClick={onExport}>
              <FileDown className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button size="sm" className="bg-[#001e42] text-white hover:bg-[#0b2955]" onClick={onFinalAudit}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Final Audit
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <section className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-6">
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Planned Rate</div>
            <div className="mt-1 text-lg font-extrabold text-[#001e42]">{currency(plannedRate)}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Actual Rate</div>
            <div className="mt-1 text-lg font-extrabold text-amber-700">{currency(actualRate, actualCurrency)}</div>
            <div className="text-xs text-slate-500">{actualCurrency}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Invoice Rate</div>
            <div className="mt-1 text-lg font-extrabold text-slate-900">{currency(invoiceRate, invoiceCurrency)}</div>
            <div className="text-xs text-slate-500">{invoiceCurrency}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">My Rate</div>
            {myRate == null ? (
              <div className="mt-1 text-sm font-bold text-slate-500">Currency mismatch</div>
            ) : (
              <div className={`mt-1 text-lg font-extrabold ${myRate >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {currency(myRate, actualCurrency)}
              </div>
            )}
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Actual Fuel</div>
            <div className="mt-1 text-lg font-extrabold text-rose-700">{currency(fuelCostTotal)}</div>
            <div className="text-xs text-slate-500">{numberFmt(fuelUsedLiters, ' L')} used</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Total Actual</div>
            <div className="mt-1 text-lg font-extrabold text-[#001e42]">{currency(actualTotalCost)}</div>
            <div className={`text-xs ${unallocated === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
              Remaining {currency(unallocated)}
            </div>
          </div>
        </section>

        <nav className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 p-1.5">
          <WorkspaceTabButton active={activeTab === 'summary'} index="01" label="SUMMARY" onClick={() => setActiveTab('summary')} />
          <WorkspaceTabButton active={activeTab === 'finance'} index="02" label="FINANCES" onClick={() => setActiveTab('finance')} />
          <WorkspaceTabButton active={activeTab === 'route'} index="03" label="ROUTE" onClick={() => setActiveTab('route')} />
        </nav>

        {activeTab === 'summary' && (
          <div className="space-y-4">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-8">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Profitability Index</p>
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-black tracking-tighter text-[#001e42]">{currency(actualRate - actualTotalCost)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${actualRate - actualTotalCost >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {actualRate - actualTotalCost >= 0 ? 'Positive Margin' : 'Negative Margin'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Operating Ratio</p>
                    <p className="text-xl font-bold text-slate-900">
                      {actualRate > 0 ? (actualTotalCost / actualRate).toFixed(2) : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 md:grid-cols-4">
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Planned Rate</p>
                    <p className="text-lg font-bold text-slate-900">{currency(plannedRate)}</p>
                  </div>
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Invoice Rate</p>
                    <p className="text-lg font-bold text-slate-900">{currency(invoiceRate, invoiceCurrency)}</p>
                  </div>
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Actual Rate</p>
                    <p className="text-lg font-bold text-amber-700">{currency(actualRate, actualCurrency)}</p>
                  </div>
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">My Rate</p>
                    <p className={`text-lg font-bold ${myRate != null && myRate >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {myRate == null ? 'Currency mismatch' : currency(myRate, actualCurrency)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="col-span-12 flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-5 lg:col-span-4">
                <div>
                  <h3 className="mb-3 text-lg font-extrabold tracking-tight text-[#001e42]">Order Snapshot</h3>
                  <ul className="space-y-3">
                    <li className="flex items-center justify-between border-b border-slate-200 pb-2 text-sm">
                      <span className="text-slate-500">Origin</span>
                      <span className="font-bold text-slate-900">{record?.origin || 'N/A'}</span>
                    </li>
                    <li className="flex items-center justify-between border-b border-slate-200 pb-2 text-sm">
                      <span className="text-slate-500">Destination</span>
                      <span className="font-bold text-slate-900">{record?.destination || 'N/A'}</span>
                    </li>
                    <li className="flex items-center justify-between border-b border-slate-200 pb-2 text-sm">
                      <span className="text-slate-500">Distance</span>
                      <span className="font-bold text-slate-900">{numberFmt(record?.actual_distance || record?.planned_distance, ' km')}</span>
                    </li>
                    <li className="flex items-center justify-between border-b border-slate-200 pb-2 text-sm">
                      <span className="text-slate-500">Cargo</span>
                      <span className="font-bold text-slate-900">{record?.cargo || 'N/A'}</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                      <User className="h-5 w-5 text-[#001e42]" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Primary Dispatcher</p>
                      <p className="text-sm font-bold text-[#001e42]">{record?.dispatcher_name || record?.dispatch_name || 'Not Assigned'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black tracking-tight text-[#001e42]">Cost And Fuel Breakdown</h3>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Planned vs Actual</div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Fuel Cost</div>
                  <div className="mt-3 text-sm text-slate-500">Planned</div>
                  <div className="text-xl font-black text-slate-900">{currency(plannedFuelCost)}</div>
                  <div className="mt-3 text-sm text-slate-500">Actual</div>
                  <div className="text-xl font-black text-rose-700">{currency(fuelCostTotal)}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Vehicle Cost</div>
                  <div className="mt-3 text-sm text-slate-500">Planned</div>
                  <div className="text-xl font-black text-slate-900">{currency(plannedVehicleCost)}</div>
                  <div className="mt-3 text-sm text-slate-500">Actual</div>
                  <div className="text-xl font-black text-sky-700">{currency(actualCostSummary.actualVehicleCost)}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Driver Cost</div>
                  <div className="mt-3 text-sm text-slate-500">Planned</div>
                  <div className="text-xl font-black text-slate-900">{currency(plannedDriverCost)}</div>
                  <div className="mt-3 text-sm text-slate-500">Actual</div>
                  <div className="text-xl font-black text-emerald-700">{currency(actualCostSummary.actualDriverCost)}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Trip Total</div>
                  <div className="mt-3 text-sm text-slate-500">Planned</div>
                  <div className="text-xl font-black text-slate-900">{currency(plannedTotalCost)}</div>
                  <div className="mt-3 text-sm text-slate-500">Actual</div>
                  <div className="text-xl font-black text-[#001e42]">{currency(actualTotalCost)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.75fr]">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-black tracking-tight text-[#001e42]">Funds Overview</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Saved finance values roll up here automatically when you return.
                      </p>
                    </div>
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      {fundsBreakdown.length} categories
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    {fundsBreakdown.length ? (
                      fundsBreakdown.map((item) => (
                        <FundsBar key={item.key} label={item.label} amount={item.amount} total={actualTotalCost} tone={item.tone} />
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                        Save the finance lines and the funds chart will auto-fill here.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                  <h3 className="text-lg font-black tracking-tight text-[#001e42]">Saved Snapshot</h3>
                  <div className="mt-5 space-y-4">
                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Allocated Split</div>
                      <div className="mt-2 text-2xl font-black text-[#001e42]">{currency(actualTotalCost, actualCurrency)}</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Unallocated Funds</div>
                      <div className={`mt-2 text-2xl font-black ${unallocated >= 0 ? 'text-amber-600' : 'text-emerald-700'}`}>
                        {currency(Math.abs(unallocated), actualCurrency)}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Finance Categories</div>
                      <div className="mt-2 text-2xl font-black text-[#001e42]">{effectiveFinanceEntries.length}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Planned Fuel</div>
                  <div className="mt-3 text-2xl font-black text-slate-900">{currency(plannedFuelCost)}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Actual Fuel Used</div>
                  <div className="mt-3 text-2xl font-black text-rose-700">{numberFmt(fuelUsedLiters, ' L')}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Fuel Filled</div>
                  <div className="mt-3 text-2xl font-black text-emerald-700">{numberFmt(fuelFilledLiters, ' L')}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Burn Rate</div>
                  <div className="mt-3 text-2xl font-black text-[#001e42]">{numberFmt(fuelLitersPerHour, ' L/h')}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Fuel Per KM</div>
                  <div className="mt-3 text-2xl font-black text-[#001e42]">{numberFmt(fuelLitersPerKm, ' L/km')}</div>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 bg-white shadow-sm">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                      <th className="px-6 py-4">Fuel Metric</th>
                      <th className="px-6 py-4">Planned</th>
                      <th className="px-6 py-4">Actual</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    <tr className="border-t border-slate-100">
                      <td className="px-6 py-4 font-medium">Fuel Cost</td>
                      <td className="px-6 py-4">{currency(plannedFuelCost)}</td>
                      <td className="px-6 py-4">{currency(fuelCostTotal)}</td>
                    </tr>
                    <tr className="border-t border-slate-100">
                      <td className="px-6 py-4 font-medium">Fuel Used</td>
                      <td className="px-6 py-4">N/A</td>
                      <td className="px-6 py-4">{numberFmt(fuelUsedLiters, ' L')}</td>
                    </tr>
                    <tr className="border-t border-slate-100">
                      <td className="px-6 py-4 font-medium">Fuel Filled</td>
                      <td className="px-6 py-4">N/A</td>
                      <td className="px-6 py-4">{numberFmt(fuelFilledLiters, ' L')}</td>
                    </tr>
                    <tr className="border-t border-slate-100">
                      <td className="px-6 py-4 font-medium">Operating Hours</td>
                      <td className="px-6 py-4">{minutesToText(record?.planned_duration_minutes)}</td>
                      <td className="px-6 py-4">{numberFmt(fuelOperatingHours, ' h')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'finance' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#001e42]">
                  <BarChart3 className="h-4 w-4" />
                  Excel-Aligned Categories
                </div>
                <h2 className="text-xl font-black tracking-tight text-[#001e42]">Financial Categories</h2>
                <p className="mt-1 max-w-2xl text-sm text-slate-600">
                  Update actual finance lines here. Default rows include the Excel-style cost categories, and you can add your own custom lines as needed.
                </p>
              </div>
              <Button variant="outline" onClick={handleAddFinanceCategory}>
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full border-collapse text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Category</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Group</th>
                    <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Planned</th>
                    <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Actual</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Notes</th>
                    <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {effectiveFinanceEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <Input
                          value={entry.label}
                          onChange={(e) => {
                            const next = e.target.value
                            setFinanceEntries((prev) =>
                              prev.map((item) => (item.categoryKey === entry.categoryKey ? { ...item, label: next } : item))
                            )
                          }}
                          className="border-0 bg-transparent px-0 font-semibold text-[#001e42] shadow-none"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <Select
                          value={entry.group}
                          onValueChange={(value: AuditFinanceEntry['group']) => {
                            setFinanceEntries((prev) =>
                              prev.map((item) => (item.categoryKey === entry.categoryKey ? { ...item, group: value } : item))
                            )
                          }}
                        >
                          <SelectTrigger className="h-9 border-0 bg-transparent px-0 text-sm capitalize text-slate-600 shadow-none focus:ring-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fuel">Fuel</SelectItem>
                            <SelectItem value="vehicle">Vehicle</SelectItem>
                            <SelectItem value="driver">Driver</SelectItem>
                            <SelectItem value="finance">Finance</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-slate-700">{currency(entry.plannedAmount)}</td>
                      <td className="px-6 py-4 text-right">
                        <Input
                          type="number"
                          step="0.01"
                          value={entry.actualAmount}
                          onChange={(e) => {
                            const next = Number(e.target.value || 0)
                            setFinanceEntries((prev) =>
                              prev.map((item) => (item.categoryKey === entry.categoryKey ? { ...item, actualAmount: next } : item))
                            )
                          }}
                          className="ml-auto w-32 border-0 bg-transparent text-right font-bold shadow-none"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <Input
                          value={entry.notes || ''}
                          onChange={(e) => {
                            const next = e.target.value
                            setFinanceEntries((prev) =>
                              prev.map((item) => (item.categoryKey === entry.categoryKey ? { ...item, notes: next } : item))
                            )
                          }}
                          placeholder="Optional note"
                          className="border-0 bg-transparent px-0 text-sm shadow-none"
                        />
                      </td>
                      <td className="px-6 py-4 text-right">
                        {entry.source === 'custom' ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setFinanceEntries((prev) => prev.filter((item) => item.categoryKey !== entry.categoryKey))
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-slate-500" />
                          </Button>
                        ) : (
                          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                            {entry.source}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Fuel Cost</div>
                <div className="mt-3 text-2xl font-black text-rose-700">{currency(actualCostSummary.actualFuelCost)}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Vehicle Cost</div>
                <div className="mt-3 text-2xl font-black text-sky-700">{currency(actualCostSummary.actualVehicleCost)}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Driver Cost</div>
                <div className="mt-3 text-2xl font-black text-emerald-700">{currency(actualCostSummary.actualDriverCost)}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Actual Cost</div>
                <div className="mt-3 text-2xl font-black text-[#001e42]">{currency(actualTotalCost)}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'route' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#001e42]">
                  <Route className="h-4 w-4" />
                  Accepted To Delivered Window
                </div>
                <h2 className="text-xl font-black tracking-tight text-[#001e42]">Tracked Route</h2>
                <p className="mt-1 max-w-2xl text-sm text-slate-600">
                  Route points are pulled from the tracking server and filtered to this trip&apos;s audit window so the map reflects only the accepted-to-completed journey.
                </p>
              </div>
              <div className="text-right text-xs font-bold uppercase tracking-widest text-slate-500">
                {routeLoading ? 'Loading route...' : `${(routeData?.route_points || []).length} tracked points`}
              </div>
            </div>

            <TripRouteMap routePoints={routeData?.route_points || null} />

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Trip Window Start</div>
                <div className="mt-3 text-sm font-bold text-slate-900">{fmtDateTime(routeData?.trip_window?.start_at || record?.accepted_at)}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Trip Window End</div>
                <div className="mt-3 text-sm font-bold text-slate-900">{fmtDateTime(routeData?.trip_window?.end_at || record?.actual_finish_time)}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Actual Distance</div>
                <div className="mt-3 text-2xl font-black text-[#001e42]">{numberFmt(record?.actual_distance || record?.planned_distance, ' km')}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Duration</div>
                <div className="mt-3 text-2xl font-black text-[#001e42]">{minutesToText(record?.actual_duration_minutes)}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="border-t border-slate-200 bg-white px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-5">
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-slate-500">Amount To Split</div>
              <div className="text-lg font-black text-[#001e42]">{currency(amountToSplit, actualCurrency)}</div>
            </div>
            <div className="hidden h-8 w-px bg-slate-200 sm:block" />
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-slate-500">Total Actual Cost</div>
              <div className="text-lg font-black text-[#001e42]">{currency(actualTotalCost)}</div>
            </div>
            <div className="hidden h-8 w-px bg-slate-200 sm:block" />
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-slate-500">Unallocated Funds</div>
              <div className={`text-lg font-black ${unallocated >= 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{currency(Math.abs(unallocated), actualCurrency)}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {Math.abs(unallocated) >= 0.01 ? (
              <div className="text-sm font-medium text-amber-700">
                Remaining {currency(unallocated, actualCurrency)} will be saved under Unallocated Funds.
              </div>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => setActiveTab('summary')}>Summary</Button>
            <Button variant="outline" size="sm" onClick={() => setActiveTab('route')}>Route</Button>
            <Button size="sm" className="bg-[#001e42] text-white hover:bg-[#0b2955]" onClick={handleSaveAudit} disabled={isSaving || !onSaveAudit}>
              {isSaving ? 'Saving...' : 'Save Audit'}
            </Button>
          </div>
        </div>
      </footer>
    </div>
  )
}
