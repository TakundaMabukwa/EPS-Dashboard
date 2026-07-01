'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Truck, Users, Fuel, Activity, TrendingUp,
  Calendar, CheckCircle, ArrowLeft, User, Route
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
  const [tab, setTab] = useState<'planned' | 'actual'>('planned')

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

  const d = tab === 'planned' ? data.planned : data.actual
  const rate = d?.sellingRatePerKm || 0
  const hasRate = rate > 0
  const distance = d?.distance || 0
  const totalCost = d?.totalCost || 0
  const cpk = d?.costPerKm || 0
  const revenue = d?.revenue || 0
  const profitLoss = d?.profit || 0

  const costBreakdown = d ? [
    { label: 'Driver', value: d.driverCost, color: '#3b82f6', detail: `${d.tripDays} days × R${fmt(23453.14 / 25 / d.tripDays * d.tripDays)}` },
    { label: 'Fixed - Asset', value: d.fixedAssetCost, color: '#1abc9c', detail: `R${fmt(d.fixedAssetCost / d.tripDays)}/day × ${d.tripDays}d` },
    { label: 'Fuel', value: d.fuelCost, color: '#e74c3c', detail: `R${fmt(d.fuelLinkRate)}/km × ${fmtInt(distance)}km` },
    { label: 'R&M', value: d.rmCost, color: '#e67e22', detail: `R${fmt(d.rmRatePerKm)}/km × ${fmtInt(distance)}km` },
    ...(d.crossBorderCost > 0 ? [{ label: 'Cross Border', value: d.crossBorderCost, color: '#9b59b6', detail: 'One-time trip charge' }] : []),
  ].filter(c => c.value > 0) : []

  const pieTotal = costBreakdown.reduce((s, c) => s + c.value, 0)
  let cumAngle = -90

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

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1 w-fit">
        <button
          onClick={() => setTab('planned')}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'planned' ? 'bg-[#001e42] text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <CheckCircle className="h-4 w-4" />
          Planned
        </button>
        <button
          onClick={() => setTab('actual')}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'actual' ? 'bg-[#001e42] text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Fuel className="h-4 w-4" />
          Actual
        </button>
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
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-4">
              <span className="text-2xl font-bold text-gray-400">—</span>
              <span className="text-xs text-gray-400 mt-1">No driver assigned</span>
            </div>
          )}
        </div>

        {/* Cost Per KM */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Cost Per KM</span>
          </div>
          <div className="mb-3">
            <span className="text-4xl font-bold text-gray-900">{distance > 0 ? `R${fmt(cpk)}` : '—'}</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Distance</span>
              <span className="text-xs font-semibold text-gray-900">{distance > 0 ? `${fmtInt(distance)} km` : '—'}</span>
            </div>
            {tab === 'actual' && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Source</span>
                <span className={`text-xs font-semibold ${d?.distanceSource !== 'none' ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {d?.distanceSource === 'mapbox' ? 'Mapbox' : d?.distanceSource === 'trip_report' ? 'Trip Report' : 'No data'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Revenue */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Trip Revenue</span>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </div>
          <div className="mb-1">
            {hasRate ? (
              <span className="text-3xl font-bold text-gray-900">
                <span className="text-lg">R</span><RollingNumber value={revenue} />
              </span>
            ) : (
              <span className="text-3xl font-bold text-gray-400">—</span>
            )}
          </div>
          {hasRate && (
            <div className={`flex items-center gap-1 text-xs ${profitLoss >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              <span>{profitLoss >= 0 ? '+' : ''}R{fmt(Math.abs(profitLoss))}</span>
            </div>
          )}
        </div>
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Cost Distribution Donut */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-2 flex items-center gap-2">
            <Fuel className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Cost Distribution</span>
          </div>
          {pieTotal > 0 ? (
            <div className="flex items-center gap-3">
              <svg viewBox="0 0 100 100" className="w-[130px] h-[130px] shrink-0">
                {costBreakdown.map((c, i) => {
                  const angle = (c.value / pieTotal) * 360
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
                      fill={c.color} stroke="#fff" strokeWidth="1" />
                  )
                })}
                <text x="50" y="48" textAnchor="middle" className="fill-gray-800 text-[9px] font-black">R{fmtInt(Math.round(pieTotal))}</text>
                <text x="50" y="56" textAnchor="middle" className="fill-gray-500 text-[4px] font-semibold uppercase">Total</text>
              </svg>
              <div className="space-y-1.5">
                {costBreakdown.map((c, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[9px]">
                    <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: c.color }} />
                    <span className="text-gray-700 font-medium uppercase truncate max-w-[60px]">{c.label}</span>
                    <span className="text-gray-400 ml-auto">{((c.value / pieTotal) * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-400 text-center py-4">No cost data</div>
          )}
        </div>

        {/* Trip Summary */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
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
              <span className="text-gray-500">Distance</span>
              <span className="font-bold text-gray-900">{distance > 0 ? `${fmtInt(distance)} km` : '—'}</span>
            </div>
            {tab === 'actual' && d?.durationHours > 0 && (
              <div className="flex items-center justify-between border-b border-gray-100 pb-1.5 text-xs">
                <span className="text-gray-500">Drive Time</span>
                <span className="font-bold text-gray-900">{d.durationHours.toFixed(1)} hrs</span>
              </div>
            )}
            <div className="flex items-center justify-between border-b border-gray-100 pb-1.5 text-xs">
              <span className="text-gray-500">Trip Days</span>
              <span className="font-bold text-gray-900">{d?.tripDays || '—'}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Total Cost</span>
              <span className="font-black text-[#001e42]">R{fmt(totalCost)}</span>
            </div>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Cost Breakdown</span>
          </div>
          <div className="space-y-3">
            {costBreakdown.map((c, i) => {
              const barMax = Math.max(...costBreakdown.map(x => x.value), 1)
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{c.label}</span>
                    <span className="text-[10px] font-bold text-gray-700">R{fmt(Math.round(c.value))}</span>
                  </div>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${(c.value / barMax) * 100}%`, backgroundColor: c.color }} />
                  </div>
                  <span className="text-[9px] text-gray-400">{c.detail}</span>
                </div>
              )
            })}

            {/* Total */}
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-gray-700">Total Cost</span>
                <span className="text-sm font-black text-[#001e42]">R{fmt(totalCost)}</span>
              </div>
            </div>

            {/* Revenue vs Cost */}
            {hasRate && (
              <div className="border-t border-gray-200 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-gray-700">Revenue</span>
                  <span className="text-sm font-black text-gray-900">R{fmt(revenue)}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-bold uppercase text-gray-700">Profit / Loss</span>
                  <span className={`text-sm font-black ${profitLoss >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {profitLoss >= 0 ? '+' : ''}R{fmt(Math.abs(profitLoss))}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
