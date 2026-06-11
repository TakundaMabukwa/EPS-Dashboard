'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Truck, Users, DollarSign, Clock, Fuel, Activity, TrendingUp,
  Calendar, CheckCircle, AlertTriangle, ArrowLeft, User, Route
} from 'lucide-react'
import { RollingNumber } from '@/components/ui/rolling-number'

const toNum = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
const fmt = (v: number) => v.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtInt = (v: number) => v.toLocaleString('en-ZA', { maximumFractionDigits: 0 })

export default function AuditTripDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [driver, setDriver] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const tripRes = await fetch(`/api/audit/trip/${params.id}`)
        const tripJson = await tripRes.json()
        if (!tripJson.ok) throw new Error(tripJson.error || 'Failed to load')
        setData(tripJson.data)

        try {
          const driverRes = await fetch(`/api/trip/${tripJson.data.id}/driver`)
          const driverJson = await driverRes.json()
          if (driverJson.ok && driverJson.data) setDriver(driverJson.data)
        } catch {}
      } catch (e: any) {
        setError(e.message || 'Failed to load trip')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id])

  if (loading) return <div className="flex min-h-screen items-center justify-center text-lg text-gray-500">Loading trip financials...</div>
  if (error) return <div className="flex min-h-screen items-center justify-center text-lg text-red-500">{error}</div>
  if (!data) return <div className="flex min-h-screen items-center justify-center text-lg text-gray-500">No data found</div>

  const { planned, actual } = data
  const rate = toNum(data.rate)
  const profit = rate - actual.totalCost
  const profitMargin = rate > 0 ? (profit / rate) * 100 : 0
  const totalDiff = actual.totalCost - (planned?.totalPlanned || 0)
  const cpkPlanned = planned?.costPerKm || 0
  const cpkActual = actual.costPerKm
  const cpkDiff = cpkPlanned > 0 ? ((cpkActual - cpkPlanned) / cpkPlanned) * 100 : 0

  // Cost breakdown for donut / bars
  const costItems = [
    { label: 'Diesel', planned: planned?.dieselCost || 0, actual: actual.dieselCost, color: '#e74c3c' },
    { label: 'Maintenance', planned: planned?.maintenanceCost || 0, actual: actual.maintenanceCost, color: '#3498db' },
    { label: 'Breakdown', planned: planned?.breakdownCost || 0, actual: actual.breakdownCost, color: '#f39c12' },
    { label: 'Tolls', planned: planned?.tollCost || 0, actual: actual.tollCost, color: '#2ecc71' },
    { label: 'Allowance', planned: planned?.allowanceCost || 0, actual: actual.allowanceCost, color: '#9b59b6' },
    { label: 'Fixed', planned: planned?.fixedCost || 0, actual: actual.fixedCost, color: '#1abc9c' },
    { label: 'Loading', planned: planned?.loadingCost || 0, actual: actual.loadingCost, color: '#e67e22' },
    { label: 'Packing', planned: planned?.packingCost || 0, actual: actual.packingCost, color: '#34495e' },
  ].filter(c => c.actual > 0 || c.planned > 0)

  const maxCostItem = Math.max(...costItems.map(c => Math.max(c.planned, c.actual)), 1)

  // Donut
  const pieData = costItems.map(c => c.actual)
  const pieLabels = costItems.map(c => c.label)
  const pieColors = costItems.map(c => c.color)
  const pieTotal = pieData.reduce((s, d) => s + d, 0)
  let cumAngle = -90

  // Trip timeline from stops_data
  const stopsData: any[] = data.stopsData || []

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-3">
          <button onClick={() => router.push('/audit')} className="mt-1 h-8 w-8 shrink-0 rounded-lg border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50">
            <ArrowLeft className="h-4 w-4 text-gray-600" />
          </button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Trip Financial Dashboard</h2>
            <p className="text-sm text-gray-500">
              {data.clientName || 'N/A'} — {data.origin} → {data.destination}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {driver && (
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5">
              <div className="w-7 h-7 rounded-full bg-[#001e42] flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#001e42]">{driver.full_name}</p>
                {driver.driver_code && <p className="text-[9px] text-gray-500">{driver.driver_code}</p>}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              {data.startDate ? new Date(data.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Top Row - 4 Stats */}
      <div className="grid grid-cols-4 gap-4">
        {/* Trip Info */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Truck className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Trip Info</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Trip ID</span>
              <span className="text-sm font-semibold text-gray-900">{data.tripId || `#${data.id}`}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Order</span>
              <span className="text-sm font-semibold text-gray-900">{data.orderNumber || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Cargo</span>
              <span className="text-sm font-semibold text-gray-900 truncate ml-2">{data.cargo || '—'}{data.cargoWeight ? ` (${data.cargoWeight})` : ''}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-gray-600">
                <span className={`h-2 w-2 rounded-full ${data.status === 'delivered' ? 'bg-emerald-500' : data.status === 'completed' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                Status
              </span>
              <span className="text-sm font-semibold text-gray-900 uppercase">{data.status}</span>
            </div>
          </div>
        </div>

        {/* Driver */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Driver</span>
          </div>
          {driver ? (
            <>
              <div className="mb-3">
                <span className="text-2xl font-bold text-gray-900">{driver.full_name || 'Unknown'}</span>
              </div>
              <div className="space-y-1.5">
                {driver.phone_number && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Phone</span>
                    <span className="text-xs font-semibold text-gray-900">{driver.phone_number}</span>
                  </div>
                )}
                {driver.driver_code && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Code</span>
                    <span className="text-xs font-semibold text-gray-900">{driver.driver_code}</span>
                  </div>
                )}
                {driver.license_expiry && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">License Expiry</span>
                    <span className={`text-xs font-semibold ${new Date(driver.license_expiry) < new Date() ? 'text-red-600' : 'text-gray-900'}`}>
                      {new Date(driver.license_expiry).toLocaleDateString('en-ZA')}
                    </span>
                  </div>
                )}
              </div>
              {driver.ignitionEvent && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600">
                  <CheckCircle className="h-3 w-3" />
                  <span>{driver.ignitionEvent.linkedAt}</span>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-4">
              <span className="text-2xl font-bold text-gray-400">—</span>
              <span className="text-xs text-gray-400 mt-1">No driver assigned</span>
            </div>
          )}
        </div>

        {/* Cost Efficiency */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Cost Per KM</span>
          </div>
          <div className="mb-3">
            <span className="text-4xl font-bold text-gray-900">R{fmtInt(Math.round(cpkActual))}</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                Planned CPK
              </span>
              <span className="text-xs font-semibold text-gray-900">R{fmt(cpkPlanned)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Actual CPK
              </span>
              <span className="text-xs font-semibold text-gray-900">R{fmt(cpkActual)}</span>
            </div>
          </div>
          <div className="mt-2">
            <div className="h-1.5 w-full rounded-full bg-gray-200">
              <div className={`h-1.5 rounded-full transition-all duration-1000 ${cpkDiff <= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(100, cpkActual > 0 && cpkPlanned > 0 ? (cpkActual / cpkPlanned) * 100 : 0)}%` }} />
            </div>
          </div>
          {cpkDiff > 0 && (
            <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertTriangle className="inline h-3 w-3 mr-1" />
              Costs {cpkDiff.toFixed(1)}% above projection
            </div>
          )}
        </div>

        {/* Revenue / Profit */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Trip Revenue</span>
            </div>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </div>
          <div className="mb-1">
            <span className="text-3xl font-bold text-gray-900">
              <span className="text-lg">R</span><RollingNumber value={rate} />
            </span>
          </div>
          <div className={`mb-3 flex items-center gap-1 text-xs ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {profit >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingUp className="h-3 w-3 rotate-180" />}
            <span>{profitMargin >= 0 ? '+' : ''}{profitMargin.toFixed(1)}% margin</span>
          </div>
          {/* Mini cost bars */}
          <div className="flex items-end gap-[3px]">
            {costItems.slice(0, 12).map((c, i) => {
              const h = pieTotal > 0 ? Math.max(4, (c.actual / pieTotal) * 48) : 4
              return (
                <div key={i} className="group relative flex-1">
                  <div className="rounded-sm transition-all hover:opacity-80"
                    style={{ height: `${h}px`, backgroundColor: c.color }} />
                  <div className="pointer-events-none absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-1.5 py-0.5 text-[10px] text-white group-hover:block">
                    {c.label}: R{fmtInt(Math.round(c.actual))}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-1 flex justify-between">
            {costItems.slice(0, 12).map((c, i) => (
              <span key={i} className="flex-1 text-center text-[7px] text-gray-400 truncate">{c.label.substring(0, 3)}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Middle Row - Cost Distribution + Trip Summary stacked | Planned vs Actual */}
      <div className="grid grid-cols-3 gap-4">
        {/* Left column - Cost Distribution + Trip Summary stacked */}
        <div className="col-span-1 flex flex-col gap-4">
          {/* Cost Distribution Donut - compact */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <Fuel className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Cost Distribution</span>
            </div>
            {pieTotal > 0 ? (
              <div className="flex items-center gap-3">
                <svg viewBox="0 0 100 100" className="w-[130px] h-[130px] shrink-0">
                  {pieData.map((val, i) => {
                    const angle = (val / pieTotal) * 360
                    const startAngle = cumAngle
                    cumAngle += angle
                    const endAngle = cumAngle
                    const startRad = (startAngle * Math.PI) / 180
                    const endRad = (endAngle * Math.PI) / 180
                    const x1 = 50 + 42 * Math.cos(startRad)
                    const y1 = 50 + 42 * Math.sin(startRad)
                    const x2 = 50 + 42 * Math.cos(endRad)
                    const y2 = 50 + 42 * Math.sin(endRad)
                    const ix1 = 50 + 25 * Math.cos(startRad)
                    const iy1 = 50 + 25 * Math.sin(startRad)
                    const ix2 = 50 + 25 * Math.cos(endRad)
                    const iy2 = 50 + 25 * Math.sin(endRad)
                    const largeArc = angle > 180 ? 1 : 0
                    return (
                      <path key={i} d={`M ${x1} ${y1} A 42 42 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A 25 25 0 ${largeArc} 0 ${ix1} ${iy1} Z`}
                        fill={pieColors[i]} stroke="#fff" strokeWidth="1" />
                    )
                  })}
                  <text x="50" y="48" textAnchor="middle" className="fill-gray-800 text-[9px] font-black">R{fmtInt(Math.round(pieTotal))}</text>
                  <text x="50" y="56" textAnchor="middle" className="fill-gray-500 text-[4px] font-semibold uppercase">Total</text>
                </svg>
                <div className="space-y-1">
                  {costItems.map((c, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[9px]">
                      <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: c.color }} />
                      <span className="text-gray-700 font-medium uppercase truncate max-w-[70px]">{c.label}</span>
                      <span className="text-gray-400 ml-auto">{((c.actual / pieTotal) * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-400 text-center py-4">No cost data</div>
            )}
          </div>

          {/* Trip Summary - compact */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <Route className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Trip Summary</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-gray-100 pb-1.5 text-xs">
                <span className="text-gray-500">Origin</span>
                <span className="font-bold text-gray-900 truncate ml-2">{data.origin || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-1.5 text-xs">
                <span className="text-gray-500">Destination</span>
                <span className="font-bold text-gray-900 truncate ml-2">{data.destination || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-1.5 text-xs">
                <span className="text-gray-500">Est. Distance</span>
                <span className="font-bold text-gray-900">{fmtInt(data.estimatedDistance)} km</span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-1.5 text-xs">
                <span className="text-gray-500">Actual Distance</span>
                <span className="font-bold text-gray-900">{fmtInt(actual.distanceKm || data.estimatedDistance)} km</span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-1.5 text-xs">
                <span className="text-gray-500">Fixed Monthly</span>
                <span className="font-bold text-gray-900">R{fmtInt(planned?.fixedMonthly || actual.fixedMonthly)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-1.5 text-xs">
                <span className="text-gray-500">Trip Days</span>
                <span className="font-bold text-gray-900">{planned?.tripDays || 1}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Total Cost</span>
                <span className="font-black text-[#001e42]">R{fmt(actual.totalCost)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Planned vs Actual Bars */}
        <div className="col-span-2 rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Planned vs Actual</span>
          </div>
          <div className="space-y-3">
            {costItems.map((c, i) => {
              const barMax = Math.max(c.planned, c.actual, 1)
              const diff = c.actual - c.planned
              const diffPct = c.planned > 0 ? ((c.actual - c.planned) / c.planned) * 100 : 0
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{c.label}</span>
                    <span className={`text-[10px] font-bold ${diff <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {diff <= 0 ? '▼' : '▲'} {Math.abs(diffPct).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-blue-500 w-8 text-right">Plan</span>
                    <div className="flex-1 h-2 bg-blue-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(c.planned / barMax) * 100}%` }} />
                    </div>
                    <span className="text-[9px] font-medium text-gray-600 w-16 text-right">R{fmtInt(Math.round(c.planned))}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-emerald-500 w-8 text-right">Act</span>
                    <div className="flex-1 h-2 bg-emerald-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${c.actual <= c.planned ? 'bg-emerald-500' : 'bg-red-500'}`}
                        style={{ width: `${(c.actual / barMax) * 100}%` }} />
                    </div>
                    <span className="text-[9px] font-medium text-gray-600 w-16 text-right">R{fmtInt(Math.round(c.actual))}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
