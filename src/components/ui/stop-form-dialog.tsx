'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, RotateCcw, Trash2, X } from 'lucide-react'
import * as DialogPrimitive from '@radix-ui/react-dialog'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { LocationAutocomplete } from '@/components/ui/location-autocomplete'
import { useGoogleMaps } from '@/hooks/use-google-maps'

type Point = { lng: number; lat: number }
type LocationLookupSelection = {
  id?: string
  name?: string
  address?: string
  coordinates?: [number, number] | null
  city?: string
  state?: string
  country?: string
  type?: string
}

function StopFormContent({
  onCancel,
  onSaved,
  initialRecord = null,
}: {
  onCancel?: () => void
  onSaved: (record?: any) => void
  initialRecord?: any | null
}) {
  const { loaded: mapsLoaded } = useGoogleMaps()
  const mapRef = useRef<google.maps.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const centerMarkerRef = useRef<google.maps.Marker | null>(null)
  const drawModeRef = useRef<'station' | 'polygon'>('station')
  const centerPointRef = useRef<Point | null>(null)
  const overlaysRef = useRef<(google.maps.Polygon | google.maps.Polyline | google.maps.Marker)[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [locationQuery, setLocationQuery] = useState('')
  const [selectedLocation, setSelectedLocation] = useState<LocationLookupSelection | null>(null)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [country, setCountry] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [operatingHours, setOperatingHours] = useState('')
  const [notes, setNotes] = useState('')
  const [facilities, setFacilities] = useState('')
  const [centerPoint, setCenterPoint] = useState<Point | null>(null)
  const [polygonPoints, setPolygonPoints] = useState<Point[]>([])
  const [drawMode, setDrawMode] = useState<'station' | 'polygon'>('station')
  const [error, setError] = useState<string | null>(null)
  const isEditing = Boolean(initialRecord?.id)

  const applySelectedLocation = (selection: LocationLookupSelection | null) => {
    if (!selection?.coordinates || selection.coordinates.length < 2) {
      setSelectedLocation(null)
      return
    }

    const [lng, lat] = selection.coordinates
    setSelectedLocation(selection)
    setLocationQuery(selection.type === 'place' && selection.name ? selection.name : selection.address || selection.name || '')
    setCenterPoint({ lng, lat })
    setDrawMode('polygon')
    setAddress(selection.address || '')
    setCity(selection.city || '')
    setState(selection.state || '')
    setCountry(selection.country || '')
    if (!name) {
      setName(selection.name || 'Stop')
    }
    reverseGeocode(lat, lng)
  }

  useEffect(() => {
    drawModeRef.current = drawMode
  }, [drawMode])

  useEffect(() => {
    centerPointRef.current = centerPoint
  }, [centerPoint])

  const clearOverlays = () => {
    overlaysRef.current.forEach((o) => o.setMap(null))
    overlaysRef.current = []
  }

  const geocodeRef = useRef<google.maps.Geocoder | null>(null)

  const reverseGeocode = async (lat: number, lng: number) => {
    if (!geocodeRef.current) {
      geocodeRef.current = new google.maps.Geocoder()
    }
    try {
      const result = await geocodeRef.current.geocode({ location: { lat, lng } })
      const res = result.results[0]
      if (!res) return
      const addr = res.formatted_address || ''
      let city = '', state = '', country = ''
      for (const comp of res.address_components || []) {
        if (comp.types.includes('locality') || comp.types.includes('sublocality')) city = comp.long_name
        if (comp.types.includes('administrative_area_level_1')) state = comp.long_name
        if (comp.types.includes('country')) country = comp.long_name
      }
      setAddress(addr)
      if (city) setCity(city)
      if (state) setState(state)
      if (country) setCountry(country)
    } catch {
      // silent
    }
  }

  useEffect(() => {
    if (!mapsLoaded || !mapContainerRef.current || !open) return

    if (!mapRef.current) {
      mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
        center: { lat: -26.2041, lng: 28.0473 },
        zoom: 4.8,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      })

      mapRef.current.addListener('click', (event: google.maps.MapMouseEvent) => {
        if (!event.latLng) return
        const clickLat = Number(event.latLng.lat().toFixed(6))
        const clickLng = Number(event.latLng.lng().toFixed(6))
        const clickedPoint = { lng: clickLng, lat: clickLat }

        if (drawModeRef.current === 'station' || !centerPointRef.current) {
          setCenterPoint(clickedPoint)
          setLocationQuery(`${clickLat}, ${clickLng}`)
          if (!name) setName('Stop')
          reverseGeocode(clickLat, clickLng)
          return
        }

        setPolygonPoints((prev) => [...prev, clickedPoint])
      })
    }
  }, [mapsLoaded])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapsLoaded) return

    if (centerMarkerRef.current) {
      centerMarkerRef.current.setMap(null)
      centerMarkerRef.current = null
    }

    if (centerPoint) {
      centerMarkerRef.current = new google.maps.Marker({
        position: { lat: centerPoint.lat, lng: centerPoint.lng },
        map,
        draggable: false,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#dc2626',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      })
      map.setCenter({ lat: centerPoint.lat, lng: centerPoint.lng })
      map.setZoom(12)
    }
  }, [centerPoint, mapsLoaded])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapsLoaded) return

    clearOverlays()

    const points = polygonPoints
    if (points.length === 0) return

    const latLngs = points.map((p) => new google.maps.LatLng(p.lat, p.lng))

    points.forEach((point, index) => {
      const marker = new google.maps.Marker({
        position: { lat: point.lat, lng: point.lng },
        map,
        label: {
          text: String(index + 1),
          color: '#1d4ed8',
          fontSize: '11px',
          fontWeight: 'bold',
        },
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: '#ffffff',
          fillOpacity: 1,
          strokeColor: '#1d4ed8',
          strokeWeight: 2,
        },
      })
      overlaysRef.current.push(marker as any)
    })

    if (points.length >= 2) {
      const path = points.map((p) => ({ lat: p.lat, lng: p.lng }))
      const polyline = new google.maps.Polyline({
        path,
        map,
        strokeColor: '#2563eb',
        strokeWeight: 2,
        strokeOpacity: 0.8,
      })
      overlaysRef.current.push(polyline as any)
    }

    if (points.length >= 3) {
      const path = points.map((p) => ({ lat: p.lat, lng: p.lng }))
      const polygon = new google.maps.Polygon({
        paths: path,
        map,
        fillColor: '#2563eb',
        fillOpacity: 0.18,
        strokeColor: '#1d4ed8',
        strokeWeight: 3,
      })
      overlaysRef.current.push(polygon as any)
    }

    const bounds = new google.maps.LatLngBounds()
    latLngs.forEach((ll) => bounds.extend(ll))
    if (centerPoint) bounds.extend({ lat: centerPoint.lat, lng: centerPoint.lng })
    map.fitBounds(bounds, 60)
  }, [polygonPoints, mapsLoaded, centerPoint])

  const handleLocate = async () => {
    if (!locationQuery) return
    setIsLocating(true)
    setError(null)

    try {
      if (
        selectedLocation &&
        (selectedLocation.address === locationQuery || selectedLocation.name === locationQuery)
      ) {
        applySelectedLocation(selectedLocation)
        return
      }

      const response = await fetch(`/api/location-lookup?q=${encodeURIComponent(locationQuery)}`)
      const data = await response.json()
      const selection = Array.isArray(data?.results) ? data.results[0] : null

      if (!response.ok) {
        throw new Error(data?.error || 'Location lookup failed')
      }

      if (!selection?.coordinates || selection.coordinates.length < 2) {
        throw new Error('Location not found')
      }
      applySelectedLocation(selection)
    } catch (locateError: any) {
      console.error('Stop geocode error:', locateError)
      setError(locateError?.message || 'Failed to locate stop')
    } finally {
      setIsLocating(false)
    }
  }

  const resetForm = () => {
    setLocationQuery('')
    setSelectedLocation(null)
    setName('')
    setAddress('')
    setCity('')
    setState('')
    setCountry('')
    setContactPerson('')
    setContactPhone('')
    setContactEmail('')
    setOperatingHours('')
    setNotes('')
    setFacilities('')
    setCenterPoint(null)
    setPolygonPoints([])
    setDrawMode('station')
    setError(null)
  }

  useEffect(() => {
    if (!open) return
    if (!initialRecord) {
      resetForm()
      return
    }

    setLocationQuery(initialRecord.name || initialRecord.name2 || '')
    setSelectedLocation(null)
    setName(initialRecord.name || initialRecord.name2 || '')
    setAddress(initialRecord.address || '')
    setCity(initialRecord.city || '')
    setState(initialRecord.state || '')
    setCountry(initialRecord.country || '')
    setContactPerson(initialRecord.contact_person || '')
    setContactPhone(initialRecord.contact_phone || '')
    setContactEmail(initialRecord.contact_email || '')
    setOperatingHours(initialRecord.operating_hours || '')
    setNotes(initialRecord.notes || '')
    setFacilities(Array.isArray(initialRecord.facilities) ? initialRecord.facilities.join(', ') : (initialRecord.facilities || ''))

    let pp: Point[] = []
    if (initialRecord.coordinates) {
      const str = String(initialRecord.coordinates).trim()
      const triplets = str.split(/\s+/).filter(Boolean)
      pp = triplets
        .map((t) => {
          const parts = t.split(',').map(Number)
          if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            return { lng: parts[0], lat: parts[1] }
          }
          return null
        })
        .filter((p): p is Point => p !== null)
    }
    setPolygonPoints(pp)

    if (pp.length > 0) {
      const centroid = {
        lng: pp.reduce((s, p) => s + p.lng, 0) / pp.length,
        lat: pp.reduce((s, p) => s + p.lat, 0) / pp.length,
      }
      setCenterPoint(centroid)
      setDrawMode('polygon')
    }
    setError(null)
  }, [initialRecord, open])

  const handleSave = async () => {
    if (!name || !centerPoint) {
      setError('Name and station location are required.')
      return
    }
    if (polygonPoints.length < 3) {
      setError('Please draw at least 3 points for the geozone area.')
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      // Save coordinates as space-separated "lng,lat,0" triplets
      const coordsStr = polygonPoints.map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)},0`).join(' ')
      const payload: Record<string, any> = {
        name,
        name2: name,
        type: 'client',
        address,
        city,
        state,
        country,

        coordinates: coordsStr,
        contact_person: contactPerson || null,
        contact_phone: contactPhone || null,
        contact_email: contactEmail || null,
        operating_hours: operatingHours || null,
        notes: notes || null,
        facilities: facilities
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        updated_at: new Date().toISOString(),
      }

      const url = '/api/stops'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEditing ? { ...payload, id: initialRecord.id } : payload),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to save stop')

      onSaved(result.data)
      if (!isEditing) resetForm()
    } catch (saveError: any) {
      console.error('Error saving stop:', saveError)
      setError(saveError?.message || 'Failed to save stop')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex min-h-[80vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            {isEditing ? 'Edit Stop' : 'New Stop'}
          </h1>
          <p className="text-sm text-slate-500">Save a stop point and polygon geozone area.</p>
        </div>
      </div>

      <div className="grid flex-1 gap-5 overflow-hidden px-6 py-5 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-4 overflow-y-auto pr-1">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Search Location</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <LocationAutocomplete
                      value={locationQuery}
                      onChange={(value) => {
                        setLocationQuery(value)
                        setSelectedLocation(null)
                      }}
                      onSelect={(suggestion) => {
                        applySelectedLocation(suggestion)
                      }}
                      placeholder="Search a stop or address"
                    />
                  </div>
                  <Button type="button" variant="outline" onClick={handleLocate} disabled={isLocating}>
                    {isLocating ? 'Locating...' : 'Locate'}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Stop Name</Label>
                <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Stop name" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Address</Label>
                <Input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Full address" />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={city} onChange={(event) => setCity(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>State / Province</Label>
                <Input value={state} onChange={(event) => setState(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input value={country} onChange={(event) => setCountry(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Operating Hours</Label>
                <Input value={operatingHours} onChange={(event) => setOperatingHours(event.target.value)} placeholder="24/7" />
              </div>
              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input value={contactPerson} onChange={(event) => setContactPerson(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Contact Email</Label>
                <Input value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Facilities</Label>
                <Input value={facilities} onChange={(event) => setFacilities(event.target.value)} placeholder="Parking, showers, food" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Anything useful about this stop" rows={3} />
              </div>
            </div>

            {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
          </div>

          <div className="space-y-3 overflow-y-auto">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Geozone Editor</div>
                  <div className="text-xs text-slate-500">
                    Set the station point first, then switch to polygon mode and click around the area to create the zone.
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={drawMode === 'station' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDrawMode('station')}
                  >
                    Station Point
                  </Button>
                  <Button
                    type="button"
                    variant={drawMode === 'polygon' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDrawMode('polygon')}
                    disabled={!centerPoint}
                  >
                    Draw Zone
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setPolygonPoints((prev) => prev.slice(0, -1))} disabled={polygonPoints.length === 0}>
                    <RotateCcw className="mr-1 h-4 w-4" />
                    Undo
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => { setCenterPoint(null); setPolygonPoints([]) }}>
                    <Trash2 className="mr-1 h-4 w-4" />
                    Clear
                  </Button>
                </div>
              </div>

              <div ref={mapContainerRef} className="h-[420px] w-full rounded-xl border border-slate-200" />
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Station Point</div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {centerPoint ? `${centerPoint.lat.toFixed(5)}, ${centerPoint.lng.toFixed(5)}` : 'Not set'}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Polygon Points</div>
                <div className="mt-1 text-sm font-medium text-slate-900">{polygonPoints.length}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Mode</div>
                <div className="mt-1 text-sm font-medium text-slate-900">{drawMode === 'station' ? 'Setting station point' : 'Drawing polygon zone'}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Type</div>
                <div className="mt-1 text-sm font-medium text-slate-900">Stop</div>
              </div>
            </div>
          </div>
        </div>

      <div className="flex justify-between border-t border-slate-200 px-6 py-4">
          <Button type="button" variant="ghost" onClick={resetForm}>
            <Plus className="mr-2 h-4 w-4" />
            Reset Form
          </Button>
          <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
              Close
            </Button>
            <Button type="button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : isEditing ? 'Update Stop' : 'Save Stop'}
            </Button>
          </div>
      </div>
    </div>
  )
}

export function StopFormDialog({
  open,
  onOpenChange,
  onSaved,
  initialRecord = null,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (record?: any) => void
  initialRecord?: any | null
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] w-[95vw] h-[95vh] bg-white shadow-xl border border-gray-200 rounded-lg overflow-y-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <DialogPrimitive.Title className="sr-only">{initialRecord ? 'Edit Stop' : 'New Stop'}</DialogPrimitive.Title>
          <DialogPrimitive.Close className="absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2">
            <X className="h-5 w-5" />
          </DialogPrimitive.Close>
          {open && (
            <StopFormContent
              initialRecord={initialRecord}
              onCancel={() => onOpenChange(false)}
              onSaved={(record) => {
                onOpenChange(false)
                onSaved(record)
              }}
            />
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
