/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Download, MapPin, Paperclip, Route, Truck } from 'lucide-react'

import { SecureButton } from '@/components/SecureButton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { loadGoogleMaps } from '@/lib/google-maps'

function RouteMap({ routePoints }: { routePoints: string | Array<{ lng: number; lat: number; datetime?: string }> | null }) {
  const mapRef = useRef<any>(null)

  useEffect(() => {
    if (!routePoints) return

    let points: Array<{ lng: number; lat: number; datetime?: string }> = []

    try {
      if (typeof routePoints === 'string') {
        points = JSON.parse(routePoints.replace(/&quot;/g, '"'))
      } else if (Array.isArray(routePoints)) {
        points = routePoints
      }
    } catch (error) {
      console.error('Error parsing route points:', error)
      return
    }

    if (!points.length) return

    const init = async () => {
      await loadGoogleMaps()
      const gm = (window as any).google.maps

      const map = new gm.Map(document.getElementById('audit-route-map'), {
        center: { lat: points[0].lat, lng: points[0].lng },
        zoom: 10,
        mapTypeId: 'roadmap',
        mapTypeControl: false,
        streetViewControl: false,
        zoomControl: true,
      })
      mapRef.current = map

      const routePath = points.map(p => ({ lat: p.lat, lng: p.lng }))

      new gm.Polyline({
        path: routePath,
        map: map,
        strokeColor: '#2563eb',
        strokeWeight: 4,
        strokeOpacity: 0.9,
      })

      new gm.Marker({
        position: routePath[0],
        map: map,
        icon: {
          path: gm.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#10b981',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        title: 'Start',
      })

      const lastPoint = routePath[routePath.length - 1]
      new gm.Marker({
        position: lastPoint,
        map: map,
        icon: {
          path: gm.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#ef4444',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        title: 'End',
      })

      const bounds = new gm.LatLngBounds()
      routePath.forEach(p => bounds.extend(p))
      map.fitBounds(bounds, 50)
    }

    init()
  }, [routePoints])

  if (!routePoints) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg bg-slate-50">
        <div className="text-center">
          <MapPin className="mx-auto mb-2 h-10 w-10 text-slate-400" />
          <p className="text-sm text-slate-500">No route data available</p>
        </div>
      </div>
    )
  }

  return <div id="audit-route-map" className="h-full w-full rounded-lg" />
}

const toNumber = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const currency = (value: number) =>
  `R${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const getClientName = (record: any) => {
  if (record.selectedclient || record.selected_client) return record.selectedclient || record.selected_client

  const clientDetails = record.clientdetails || record.client_details
  if (!clientDetails) return 'N/A'

  try {
    const parsed = typeof clientDetails === 'string' ? JSON.parse(clientDetails) : clientDetails
    return parsed?.name || 'N/A'
  } catch {
    return 'N/A'
  }
}

const formatDateTime = (value: unknown) => {
  if (!value) return 'N/A'
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)

  return date.toLocaleString('en-ZA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatDurationMinutes = (value: unknown) => {
  const minutes = toNumber(value)
  if (!minutes) return 'N/A'

  const hours = Math.floor(minutes / 60)
  const remainder = Math.round(minutes % 60)

  if (!hours) return `${remainder}m`
  if (!remainder) return `${hours}h`
  return `${hours}h ${remainder}m`
}

export default function AuditPage() {
  const supabase = useMemo(
    () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    []
  )

  const [records, setRecords] = useState<any[]>([])
  const [filteredRecords, setFilteredRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [documentsOpen, setDocumentsOpen] = useState(false)
  const [selectedDocumentRecord, setSelectedDocumentRecord] = useState<any>(null)
  const [tripDocuments, setTripDocuments] = useState<any[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [routeModalOpen, setRouteModalOpen] = useState(false)
  const [selectedRouteRecord, setSelectedRouteRecord] = useState<any>(null)
  const [routeLoadingId, setRouteLoadingId] = useState<number | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [exporting, setExporting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const loadRecords = async () => {
      try {
        setLoading(true)

        const { data: auditData, error: auditError } = await supabase
          .from('audit')
          .select('*')
          .order('updated_at', { ascending: false })

        if (auditError) throw auditError

        const tripIds = (auditData || []).map((record) => record.trip_id).filter(Boolean)
        let tripsData: any[] = []

        if (tripIds.length > 0) {
          const { data: trips } = await supabase
            .from('trips')
            .select(
              'id, trip_id, rate, approximate_fuel_cost, approximated_vehicle_cost, approximated_driver_cost, total_vehicle_cost, estimated_distance, fuel_cost_total, fuel_used_liters, fuel_liters_per_km, origin, destination, cargo, selectedclient, clientdetails, pickuplocations, dropofflocations, fuel_price_per_liter, actual_start_time, actual_end_time'
            )
            .in('trip_id', tripIds)

          tripsData = trips || []
        }

        const enriched = (auditData || []).map((auditRecord) => {
          const tripData = tripsData.find((trip) => trip.trip_id === auditRecord.trip_id)
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
          const plannedDurationMinutes = plannedStartTime && plannedFinishTime
            ? Math.round((new Date(plannedFinishTime).getTime() - new Date(plannedStartTime).getTime()) / (1000 * 60))
            : null

          const actualDistance = toNumber(auditRecord.actual_distance || auditRecord.distance)
          const fuelPriceUsed = toNumber(auditRecord.fuel_price_used || tripData.fuel_price_per_liter)
          const actualFuelCost = actualDistance > 0 && fuelPriceUsed > 0
            ? Math.round(actualDistance * fuelPriceUsed * 100) / 100
            : toNumber(auditRecord.actual_fuel_cost)

          return {
            ...auditRecord,
            trip_row_id: tripData.id,
            planned_fuel_cost: tripData.approximate_fuel_cost || 0,
            planned_vehicle_cost: tripData.approximated_vehicle_cost || 0,
            planned_driver_cost: tripData.approximated_driver_cost || 0,
            planned_total_cost: tripData.total_vehicle_cost || 0,
            planned_distance: tripData.estimated_distance || 0,
            planned_start_time: plannedStartTime,
            planned_finish_time: plannedFinishTime,
            planned_duration_minutes: plannedDurationMinutes,
            actual_fuel_cost: actualFuelCost,
            actual_total_cost: actualFuelCost + toNumber(auditRecord.actual_vehicle_cost) + toNumber(auditRecord.actual_driver_cost),
            actual_start_time: tripData.actual_start_time || auditRecord.actual_start_time,
            actual_finish_time: tripData.actual_end_time || auditRecord.actual_finish_time,
            fuel_used_liters: tripData.fuel_used_liters ?? auditRecord.fuel_used_liters ?? 0,
            fuel_liters_per_km: tripData.fuel_liters_per_km ?? auditRecord.fuel_liters_per_km ?? 0,
            fuel_cost_total: tripData.fuel_cost_total ?? auditRecord.fuel_cost_total ?? 0,
            origin: auditRecord.origin || tripData.origin,
            destination: auditRecord.destination || tripData.destination,
            cargo: auditRecord.cargo || tripData.cargo,
            selectedclient: auditRecord.selectedclient || tripData.selectedclient,
            clientdetails: auditRecord.clientdetails || tripData.clientdetails,
          }
        })

        setRecords(enriched)
      } catch (error) {
        console.error('Error fetching audit records:', error)
      } finally {
        setLoading(false)
      }
    }

    loadRecords()
  }, [supabase])

  useEffect(() => {
    let next = records

    if (statusFilter !== 'all') {
      next = next.filter((record) => record.status === statusFilter)
    } else {
      next = next.filter((record) => record.status === 'delivered' || record.status === 'completed')
    }

    if (searchTerm) {
      const query = searchTerm.toLowerCase()
      next = next.filter(
        (record) =>
          record.trip_id?.toLowerCase().includes(query) ||
          record.ordernumber?.toLowerCase().includes(query) ||
          record.origin?.toLowerCase().includes(query) ||
          record.destination?.toLowerCase().includes(query)
      )
    }

    setFilteredRecords(next)
  }, [records, searchTerm, statusFilter])

  const summary = useMemo(() => {
    const totalTrips = filteredRecords.length
    const totalPlannedCost = filteredRecords.reduce((sum, record) => sum + toNumber(record.planned_total_cost), 0)
    const totalActualCost = filteredRecords.reduce((sum, record) => sum + toNumber(record.actual_total_cost), 0)
    const totalDistance = filteredRecords.reduce((sum, record) => sum + toNumber(record.planned_distance || record.actual_distance || record.distance), 0)

    return { totalTrips, totalPlannedCost, totalActualCost, totalDistance }
  }, [filteredRecords])

  const openDocuments = async (record: any) => {
    try {
      setSelectedDocumentRecord(record)
      setDocumentsOpen(true)
      setTripDocuments([])
      setDocumentsLoading(true)

      if (!record?.trip_row_id) return

      const { data, error } = await supabase
        .from('trip_documents')
        .select('id, trip_id, doc_type, file_path, created_at')
        .eq('trip_id', record.trip_row_id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTripDocuments(data || [])
    } catch (error) {
      console.error('Error fetching trip documents:', error)
      setTripDocuments([])
    } finally {
      setDocumentsLoading(false)
    }
  }

  const exportToExcel = async () => {
    try {
      setExporting(true)
      const params = new URLSearchParams()
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)

      const res = await fetch(`/api/audit/excel-export?${params.toString()}`)
      if (!res.ok) throw new Error('Export failed')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `trip_export_${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export error:', error)
    } finally {
      setExporting(false)
    }
  }

  const downloadDocument = async (doc: any) => {
    const filePath = String(doc?.file_path || '').trim()
    if (!filePath) return

    setDownloadingId(doc.id)

    try {
      if (/^https?:\/\//i.test(filePath)) {
        window.open(filePath, '_blank')
        return
      }

      const parts = filePath.split('/').filter(Boolean)
      const candidates: Array<{ bucket: string; path: string }> = []

      if (parts.length > 1) {
        candidates.push({ bucket: parts[0], path: parts.slice(1).join('/') })
      }

      candidates.push(
        { bucket: 'trip-documents', path: filePath },
        { bucket: 'documents', path: filePath },
        { bucket: 'uploads', path: filePath }
      )

      for (const candidate of candidates) {
        const { data } = await supabase.storage.from(candidate.bucket).createSignedUrl(candidate.path, 60)
        if (data?.signedUrl) {
          window.open(data.signedUrl, '_blank')
          return
        }
      }

      window.open(filePath, '_blank')
    } catch (error) {
      console.error('Error downloading document:', error)
    } finally {
      setDownloadingId(null)
    }
  }

  const openRoute = async (record: any) => {
    try {
      setRouteLoadingId(record.id)

      const response = await fetch(`/api/trip-route?tripId=${record.id}`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch route')
      }

      const routeData = await response.json()
      setSelectedRouteRecord({ ...record, route_points: routeData.route_points })
      setRouteModalOpen(true)
    } catch (error: any) {
      console.error('Error fetching route:', error)
      window.alert(error.message || 'Failed to load route data')
    } finally {
      setRouteLoadingId(null)
    }
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-lg">Loading audit records...</div>
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Audit Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalTrips}</div>
            <p className="text-xs text-muted-foreground">Delivered and completed trips in audit scope.</p>
          </CardContent>
        </Card>


        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actual Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currency(summary.totalActualCost)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Distance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalDistance.toLocaleString('en-ZA')} km</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-col gap-4 md:flex-row">
            <Input
              placeholder="Search by trip, order, origin, or destination..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="md:max-w-sm"
            />

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Delivered + Completed</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="md:w-40"
              placeholder="Start date"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="md:w-40"
              placeholder="End date"
            />

            <Button
              onClick={exportToExcel}
              disabled={exporting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Download className="mr-2 h-4 w-4" />
              {exporting ? 'Exporting...' : 'Export Excel'}
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full border-collapse text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Trip</th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Client</th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Cargo</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="border-t hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900">{record.trip_id}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs text-slate-500">{record.ordernumber || 'No order number'}</span>
                        <Badge variant={record.status === 'completed' ? 'default' : 'secondary'} className="capitalize">
                          {record.status || 'pending'}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-700">{getClientName(record)}</td>
                    <td className="px-3 py-2 text-sm text-slate-700">{record.cargo || 'N/A'}</td>
                    <td className="px-3 py-2 text-sm text-slate-700">
                      <div className="max-w-xs">
                        <div className="truncate">{record.origin || 'N/A'}</div>
                        <div className="truncate text-xs text-slate-500">to {record.destination || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={() => router.push(`/audit/${record.trip_id}`)}
                        >
                          View
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">No audit records found matching your filters.</div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={documentsOpen} onOpenChange={setDocumentsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Trip Documents</DialogTitle>
            <DialogDescription>
              {selectedDocumentRecord?.trip_id ? `Files attached to ${selectedDocumentRecord.trip_id}` : 'Files attached to this trip'}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border">
            <div className="grid grid-cols-12 gap-2 border-b bg-slate-50 px-3 py-2 text-xs font-semibold">
              <div className="col-span-3">Type</div>
              <div className="col-span-5">File Path</div>
              <div className="col-span-2">Created</div>
              <div className="col-span-2 text-right">Action</div>
            </div>

            <ScrollArea className="h-[380px]">
              {documentsLoading ? (
                <div className="p-4 text-sm text-slate-600">Loading documents...</div>
              ) : tripDocuments.length === 0 ? (
                <div className="p-4 text-sm text-slate-600">No documents attached to this trip.</div>
              ) : (
                <div className="divide-y">
                  {tripDocuments.map((doc) => (
                    <div key={doc.id} className="grid grid-cols-12 items-center gap-2 px-3 py-2 text-sm">
                      <div className="col-span-3">
                        <Badge variant="secondary">{doc.doc_type || 'document'}</Badge>
                      </div>
                      <div className="col-span-5 truncate" title={doc.file_path}>
                        {doc.file_path}
                      </div>
                      <div className="col-span-2 text-xs text-slate-500">
                        {doc.created_at ? new Date(doc.created_at).toLocaleDateString('en-ZA') : 'N/A'}
                      </div>
                      <div className="col-span-2 flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2"
                          disabled={downloadingId === doc.id}
                          onClick={() => downloadDocument(doc)}
                        >
                          <Download className="mr-1 h-3.5 w-3.5" />
                          {downloadingId === doc.id ? '...' : 'Download'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={routeModalOpen} onOpenChange={setRouteModalOpen}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>{selectedRouteRecord?.trip_id ? `Actual Route - ${selectedRouteRecord.trip_id}` : 'Actual Route'}</DialogTitle>
            <DialogDescription>GPS tracking points visualisation for this trip.</DialogDescription>
          </DialogHeader>

          <div className="h-[70vh]">
            <RouteMap routePoints={selectedRouteRecord?.route_points || null} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
