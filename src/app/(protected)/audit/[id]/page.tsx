'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

import AuditTripWorkspace from '@/components/audit/AuditTripWorkspace'
import {
  AuditCurrencyCode,
  buildActualCostSummary,
  buildFinanceEntries,
  normalizeCurrency,
  toNumber,
} from '@/lib/audit-utils'

const mergeAuditWithTrip = (auditRecord: any, tripData: any) => {
  if (!tripData) return auditRecord

  let pickupLocs: any[] = []
  let dropoffLocs: any[] = []

  try {
    pickupLocs = typeof tripData.pickuplocations === 'string' ? JSON.parse(tripData.pickuplocations) : tripData.pickuplocations || []
    dropoffLocs = typeof tripData.dropofflocations === 'string' ? JSON.parse(tripData.dropofflocations) : tripData.dropofflocations || []
  } catch {
    pickupLocs = []
    dropoffLocs = []
  }

  const plannedStartTime = pickupLocs[0]?.scheduled_time || null
  const plannedFinishTime = dropoffLocs[0]?.scheduled_time || null
  const plannedDurationMinutes =
    plannedStartTime && plannedFinishTime
      ? Math.round((new Date(plannedFinishTime).getTime() - new Date(plannedStartTime).getTime()) / (1000 * 60))
      : null

  const actualFuelCost = toNumber(auditRecord.actual_fuel_cost ?? tripData.fuel_cost_total ?? 0)
  const actualVehicleCost = toNumber(auditRecord.actual_vehicle_cost)
  const actualDriverCost = toNumber(auditRecord.actual_driver_cost)

  return {
    ...auditRecord,
    rate: auditRecord.rate || tripData.rate || 0,
    planned_rate: tripData.rate || auditRecord.rate || 0,
    actual_rate: auditRecord.actual_rate ?? 0,
    invoice_rate: auditRecord.invoice_rate ?? auditRecord.rate ?? tripData.rate ?? 0,
    actual_currency: normalizeCurrency(auditRecord.actual_currency ?? 'ZAR'),
    invoice_currency: normalizeCurrency(auditRecord.invoice_currency ?? auditRecord.actual_currency ?? 'ZAR'),
    origin: auditRecord.origin || tripData.origin,
    destination: auditRecord.destination || tripData.destination,
    cargo: auditRecord.cargo || tripData.cargo,
    selectedclient: auditRecord.selectedclient || tripData.selectedclient,
    clientdetails: auditRecord.clientdetails || tripData.clientdetails,
    planned_fuel_cost: tripData.approximate_fuel_cost,
    planned_vehicle_cost: tripData.approximated_vehicle_cost,
    planned_driver_cost: tripData.approximated_driver_cost,
    planned_total_cost: tripData.total_vehicle_cost,
    planned_distance: tripData.estimated_distance,
    planned_start_time: plannedStartTime,
    planned_finish_time: plannedFinishTime,
    planned_duration_minutes: plannedDurationMinutes,
    actual_fuel_cost: actualFuelCost,
    actual_vehicle_cost: actualVehicleCost,
    actual_driver_cost: actualDriverCost,
    actual_total_cost: Math.round((actualFuelCost + actualVehicleCost + actualDriverCost) * 100) / 100,
    fuel_used_liters: tripData.fuel_used_liters ?? auditRecord.fuel_used_liters ?? 0,
    fuel_filled_liters: tripData.fuel_filled_liters ?? auditRecord.fuel_filled_liters ?? 0,
    fuel_operating_hours: tripData.fuel_operating_hours ?? auditRecord.fuel_operating_hours ?? 0,
    fuel_liters_per_hour: tripData.fuel_liters_per_hour ?? auditRecord.fuel_liters_per_hour ?? 0,
    fuel_liters_per_km: tripData.fuel_liters_per_km ?? auditRecord.fuel_liters_per_km ?? 0,
    fuel_cost_total: tripData.fuel_cost_total ?? auditRecord.fuel_cost_total ?? actualFuelCost,
    actual_start_time: tripData.actual_start_time || auditRecord.actual_start_time,
    actual_finish_time: tripData.actual_end_time || auditRecord.actual_finish_time,
    accepted_at: tripData.accepted_at || auditRecord.accepted_at,
    trip_row_id: tripData.id,
  }
}

export default function AuditTripDetailPage() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [routeLoading, setRouteLoading] = useState(false)
  const [record, setRecord] = useState<any>(null)
  const [routeData, setRouteData] = useState<any>(null)

  const supabase = useMemo(
    () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    []
  )

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const { data: auditRecord, error: auditError } = await supabase
          .from('audit')
          .select('*')
          .eq('id', Number(params.id))
          .single()

        if (auditError) throw auditError

        let tripData = null
        if (auditRecord?.trip_id) {
          const { data: trip } = await supabase
            .from('trips')
            .select('id, trip_id, rate, approximate_fuel_cost, approximated_vehicle_cost, approximated_driver_cost, total_vehicle_cost, estimated_distance, pickuplocations, dropofflocations, fuel_price_per_liter, actual_start_time, actual_end_time, accepted_at, origin, destination, cargo, selectedclient, clientdetails, fuel_used_liters, fuel_filled_liters, fuel_operating_hours, fuel_liters_per_hour, fuel_liters_per_km, fuel_cost_total')
            .eq('trip_id', auditRecord.trip_id)
            .maybeSingle()

          tripData = trip
        }

        const merged = mergeAuditWithTrip(auditRecord, tripData)
        setRecord(merged)

        if (tripData?.id) {
          setRouteLoading(true)
          const response = await fetch(`/api/trip-route?tripId=${tripData.id}`)
          if (response.ok) {
            const routePayload = await response.json()
            setRouteData(routePayload)
          }
          setRouteLoading(false)
        }
      } catch (error) {
        console.error('Error loading audit record:', error)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [params.id, supabase])

  const saveAudit = async (payload: {
    amountToSplit: number
    actualRate: number
    actualCurrency: AuditCurrencyCode
    invoiceRate: number
    invoiceCurrency: AuditCurrencyCode
    financeEntries: any[]
  }) => {
    if (!record?.id) throw new Error('No audit record selected')

    const financeSummary = buildActualCostSummary(payload.financeEntries)

    const auditPayload = {
      amount_to_split: payload.amountToSplit,
      actual_rate: payload.actualRate,
      actual_currency: payload.actualCurrency,
      invoice_rate: payload.invoiceRate,
      invoice_currency: payload.invoiceCurrency,
      finance_entries: payload.financeEntries,
      actual_fuel_cost: financeSummary.actualFuelCost,
      actual_vehicle_cost: financeSummary.actualVehicleCost,
      actual_driver_cost: financeSummary.actualDriverCost,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('audit').update(auditPayload).eq('id', record.id)
    if (error) throw error

    const nextRecord = {
      ...record,
      ...auditPayload,
      actual_total_cost: financeSummary.total,
    }
    setRecord(nextRecord)
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-lg">Loading trip audit...</div>
  }

  if (!record) {
    return <div className="flex min-h-screen items-center justify-center text-lg">Audit record not found.</div>
  }

  const financeEntries = buildFinanceEntries(record)
  const tabParam = searchParams.get('tab')
  const initialTab = tabParam === 'route' || tabParam === 'finance' ? tabParam : 'summary'

  return (
    <AuditTripWorkspace
      record={record}
      initialFinanceEntries={financeEntries}
      routeData={routeData}
      routeLoading={routeLoading}
      initialTab={initialTab}
      onBack={() => router.push('/audit')}
      onSaveAudit={saveAudit}
    />
  )
}
