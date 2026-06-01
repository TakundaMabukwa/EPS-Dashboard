"use client"

import { useEffect, useRef, useState } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X, Loader2, RotateCcw, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { LocationAutocomplete } from "@/components/ui/location-autocomplete"
import { useGoogleMaps } from "@/hooks/use-google-maps"
import { toast } from "sonner"

type Point = { lng: number; lat: number }

interface ClientFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  initialRecord?: any | null
}

const defaultFormState = {
  name: "",
  client_id: "",
  address: "",
  city: "",
  state: "",
  country: "",
  contact_person: "",
  contact_phone: "",
  contact_email: "",
  email: "",
  phone: "",
  industry: "",
  credit_limit: "",
  status: "Active",
  postal_code: "",
  registration_number: "",
  registration_name: "",
  ck_number: "",
  tax_number: "",
  vat_number: "",
  fax_number: "",
  operating_hours: "",
  capacity: "",
  notes: "",
}

function ClientFormContent({
  initialRecord,
  onDone,
}: {
  initialRecord?: any | null
  onDone: () => void
}) {
  const { loaded: mapsLoaded, error: mapsError } = useGoogleMaps()
  const isEditing = Boolean(initialRecord?.id)

  const [formState, setFormState] = useState(defaultFormState)
  const [centerPoint, setCenterPoint] = useState<Point | null>(null)
  const [polygonPoints, setPolygonPoints] = useState<Point[]>([])
  const [drawMode, setDrawMode] = useState<"station" | "polygon">("station")
  const [locationQuery, setLocationQuery] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const drawModeRef = useRef(drawMode)
  const centerPointRef = useRef<Point | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const centerMarkerRef = useRef<google.maps.Marker | null>(null)
  const overlaysRef = useRef<(google.maps.Polygon | google.maps.Polyline | google.maps.Marker)[]>([])
  const geocodeRef = useRef<google.maps.Geocoder | null>(null)

  useEffect(() => { drawModeRef.current = drawMode }, [drawMode])
  useEffect(() => { centerPointRef.current = centerPoint }, [centerPoint])

  useEffect(() => {
    if (initialRecord) {
      setFormState({
        name: initialRecord.name || "",
        client_id: initialRecord.client_id || "",
        address: initialRecord.address || "",
        city: initialRecord.city || "",
        state: initialRecord.state || "",
        country: initialRecord.country || "",
        contact_person: initialRecord.contact_person || "",
        contact_phone: initialRecord.contact_phone || "",
        contact_email: initialRecord.contact_email || "",
        email: initialRecord.email || "",
        phone: initialRecord.phone || "",
        industry: initialRecord.industry || "",
        credit_limit: initialRecord.credit_limit?.toString() || "",
        status: initialRecord.status || "Active",
        postal_code: initialRecord.postal_code || "",
        registration_number: initialRecord.registration_number || "",
        registration_name: initialRecord.registration_name || "",
        ck_number: initialRecord.ck_number || "",
        tax_number: initialRecord.tax_number || "",
        vat_number: initialRecord.vat_number || "",
        fax_number: initialRecord.fax_number || "",
        operating_hours: initialRecord.operating_hours || "",
        capacity: initialRecord.capacity || "",
        notes: initialRecord.notes || "",
      })
      const parsedCoords = parsePoint(initialRecord.coords || initialRecord.location_coordinates)
      if (parsedCoords) setCenterPoint(parsedCoords)
      const parsedPoly = parsePolygon(initialRecord.coordinates || initialRecord.geozone_coordinates)
      if (parsedPoly.length > 0) setPolygonPoints(parsedPoly)
      if (parsedPoly.length > 0 || parsedCoords) setDrawMode("polygon")
    }
  }, [initialRecord])

  const updateField = (field: string, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const clearOverlays = () => {
    overlaysRef.current.forEach((o) => o.setMap(null))
    overlaysRef.current = []
  }

  const reverseGeocode = async (lat: number, lng: number) => {
    if (!geocodeRef.current) geocodeRef.current = new google.maps.Geocoder()
    try {
      const result = await geocodeRef.current.geocode({ location: { lat, lng } })
      const res = result.results[0]
      if (!res) return
      let city = "", state = "", country = ""
      for (const comp of res.address_components || []) {
        if (comp.types.includes("locality") || comp.types.includes("sublocality")) city = comp.long_name
        if (comp.types.includes("administrative_area_level_1")) state = comp.long_name
        if (comp.types.includes("country")) country = comp.long_name
      }
      setFormState((prev) => ({
        ...prev,
        address: res.formatted_address || prev.address,
        city: city || prev.city,
        state: state || prev.state,
        country: country || prev.country,
      }))
    } catch { /* silent */ }
  }

  useEffect(() => {
    if (!mapsLoaded || !mapContainerRef.current || mapRef.current) return
    mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
      center: { lat: -26.2041, lng: 28.0473 },
      zoom: 4.8,
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    })
    mapRef.current.addListener("click", (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return
      const clickLat = Number(event.latLng.lat().toFixed(6))
      const clickLng = Number(event.latLng.lng().toFixed(6))
      const clickedPoint = { lng: clickLng, lat: clickLat }

      if (drawModeRef.current === "station" || !centerPointRef.current) {
        setCenterPoint(clickedPoint)
        setLocationQuery(`${clickLat}, ${clickLng}`)
        reverseGeocode(clickLat, clickLng)
        return
      }
      setPolygonPoints((prev) => [...prev, clickedPoint])
    })
  }, [mapsLoaded])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapsLoaded) return
    if (centerMarkerRef.current) { centerMarkerRef.current.setMap(null); centerMarkerRef.current = null }
    if (centerPoint) {
      centerMarkerRef.current = new google.maps.Marker({
        position: { lat: centerPoint.lat, lng: centerPoint.lng },
        map,
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: "#dc2626", fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2 },
      })
      map.setCenter({ lat: centerPoint.lat, lng: centerPoint.lng })
      map.setZoom(12)
    }
  }, [centerPoint, mapsLoaded])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapsLoaded) return
    clearOverlays()
    if (polygonPoints.length === 0) return

    polygonPoints.forEach((point, index) => {
      const marker = new google.maps.Marker({
        position: { lat: point.lat, lng: point.lng },
        map,
        label: { text: String(index + 1), color: "#1d4ed8", fontSize: "11px", fontWeight: "bold" },
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 6, fillColor: "#ffffff", fillOpacity: 1, strokeColor: "#1d4ed8", strokeWeight: 2 },
      })
      overlaysRef.current.push(marker as any)
    })

    const path = polygonPoints.map((p) => ({ lat: p.lat, lng: p.lng }))
    if (polygonPoints.length >= 2) {
      overlaysRef.current.push(new google.maps.Polyline({ path, map, strokeColor: "#2563eb", strokeWeight: 2, strokeOpacity: 0.8 }) as any)
    }
    if (polygonPoints.length >= 3) {
      overlaysRef.current.push(new google.maps.Polygon({ paths: path, map, fillColor: "#2563eb", fillOpacity: 0.18, strokeColor: "#1d4ed8", strokeWeight: 3 }) as any)
    }
  }, [polygonPoints, mapsLoaded])

  const parsePoint = (value: any): Point | null => {
    if (!value) return null
    if (typeof value === "string") {
      const trimmed = value.trim()
      if (!trimmed) return null
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) { try { return parsePoint(JSON.parse(trimmed)) } catch { return null } }
      const parts = trimmed.split(",").map((p) => Number.parseFloat(p.trim()))
      if (parts.length === 2 && parts.every(Number.isFinite)) return { lat: parts[0], lng: parts[1] }
      return null
    }
    if (Array.isArray(value)) {
      if (value.length === 2 && value.every((i) => Number.isFinite(Number(i)))) return { lng: Number(value[0]), lat: Number(value[1]) }
      return null
    }
    if (typeof value === "object") {
      const lat = Number(value.lat); const lng = Number(value.lng)
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
    }
    return null
  }

  const parsePolygon = (value: any): Point[] => {
    if (!value) return []
    let parsed = value
    if (typeof value === "string") { try { parsed = JSON.parse(value.trim()) } catch { return [] } }
    if (!Array.isArray(parsed)) return []
    const coords = Array.isArray(parsed[0]?.[0]) ? parsed[0] : parsed
    return coords.map((c: any) => parsePoint(c)).filter(Boolean)
  }

  const handleSave = async () => {
    if (!formState.name.trim() && !formState.client_id.trim()) {
      toast.error("Enter at least a client name or client ID")
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      const polygon = polygonPoints.map((p) => [p.lng, p.lat])
      const body: any = {
        ...formState,
        credit_limit: formState.credit_limit || "0",
        coordinates: polygon.length >= 3 ? JSON.stringify(polygon) : null,
        coords: centerPoint ? `${centerPoint.lat},${centerPoint.lng}` : null,
      }
      if (isEditing) body.id = initialRecord.id

      const res = await fetch("/api/eps-client-list", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || "Failed to save client")

      toast.success(isEditing ? "Client updated" : "Client added")
      onDone()
    } catch (err: any) {
      console.error("Failed to save client:", err)
      setError(err?.message || "Failed to save client")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex min-h-[80vh] flex-col overflow-hidden">
      <div className="border-b border-slate-200 px-6 py-4">
        <h1 className="text-lg font-semibold text-slate-900">{isEditing ? "Edit Client" : "Add Client"}</h1>
        <p className="text-sm text-slate-500">Manage client details and geozone area.</p>
      </div>

      <div className="grid flex-1 gap-5 overflow-hidden px-6 py-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-5 overflow-y-auto pr-1">
          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Basic Details</h3>
              <p className="text-xs text-slate-500">Core client identity and location details.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-slate-600">Client Name</Label>
                <Input value={formState.name} onChange={(e) => updateField("name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-slate-600">Client ID</Label>
                <Input value={formState.client_id} onChange={(e) => updateField("client_id", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-slate-600">Status</Label>
                <Input value={formState.status} onChange={(e) => updateField("status", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-slate-600">Industry</Label>
                <Input value={formState.industry} onChange={(e) => updateField("industry", e.target.value)} />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Address</h3>
              <p className="text-xs text-slate-500">Physical address and location details.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-slate-600">Search Location</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <LocationAutocomplete
                    value={locationQuery}
                    onChange={(value) => { setLocationQuery(value) }}
                    onSelect={(suggestion) => {
                      if (!suggestion?.coordinates || suggestion.coordinates.length < 2) return
                      const [lng, lat] = suggestion.coordinates
                      setLocationQuery(suggestion.type === "place" && suggestion.name ? suggestion.name : suggestion.address || suggestion.name || "")
                      setCenterPoint({ lng, lat })
                      setDrawMode("polygon")
                      setFormState((prev) => ({
                        ...prev,
                        address: suggestion.address || prev.address,
                        city: suggestion.city || prev.city,
                        state: suggestion.state || prev.state,
                        country: suggestion.country || prev.country,
                      }))
                      reverseGeocode(lat, lng)
                    }}
                    placeholder="Search address or place"
                  />
                </div>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-slate-600">Address</Label>
                <Input value={formState.address} onChange={(e) => updateField("address", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-slate-600">City</Label>
                <Input value={formState.city} onChange={(e) => updateField("city", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-slate-600">State</Label>
                <Input value={formState.state} onChange={(e) => updateField("state", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-slate-600">Country</Label>
                <Input value={formState.country} onChange={(e) => updateField("country", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-slate-600">Postal Code</Label>
                <Input value={formState.postal_code} onChange={(e) => updateField("postal_code", e.target.value)} />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Contacts</h3>
              <p className="text-xs text-slate-500">Primary people and communication channels.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-slate-600">Contact Person</Label>
                <Input value={formState.contact_person} onChange={(e) => updateField("contact_person", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-slate-600">Contact Phone</Label>
                <Input value={formState.contact_phone} onChange={(e) => updateField("contact_phone", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-slate-600">Contact Email</Label>
                <Input value={formState.contact_email} onChange={(e) => updateField("contact_email", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-slate-600">General Email</Label>
                <Input value={formState.email} onChange={(e) => updateField("email", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-slate-600">General Phone</Label>
                <Input value={formState.phone} onChange={(e) => updateField("phone", e.target.value)} />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Business Info</h3>
              <p className="text-xs text-slate-500">Commercial, tax, and registration details.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-slate-600">Credit Limit</Label>
                <Input value={formState.credit_limit} onChange={(e) => updateField("credit_limit", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-slate-600">Operating Hours</Label>
                <Input value={formState.operating_hours} onChange={(e) => updateField("operating_hours", e.target.value)} placeholder="24/7" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-slate-600">Capacity</Label>
                <Input value={formState.capacity} onChange={(e) => updateField("capacity", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-slate-600">CK Number</Label>
                <Input value={formState.ck_number} onChange={(e) => updateField("ck_number", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-slate-600">Tax Number</Label>
                <Input value={formState.tax_number} onChange={(e) => updateField("tax_number", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-slate-600">VAT Number</Label>
                <Input value={formState.vat_number} onChange={(e) => updateField("vat_number", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-slate-600">Registration Number</Label>
                <Input value={formState.registration_number} onChange={(e) => updateField("registration_number", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-slate-600">Registration Name</Label>
                <Input value={formState.registration_name} onChange={(e) => updateField("registration_name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-slate-600">Fax Number</Label>
                <Input value={formState.fax_number} onChange={(e) => updateField("fax_number", e.target.value)} />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Additional Notes</h3>
              <p className="text-xs text-slate-500">Operational notes and other details.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-slate-600">Notes</Label>
              <Textarea value={formState.notes} onChange={(e) => updateField("notes", e.target.value)} rows={3} />
            </div>
          </section>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
          )}
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
                <Button type="button" variant={drawMode === "station" ? "default" : "outline"} size="sm" onClick={() => setDrawMode("station")}>Station Point</Button>
                <Button type="button" variant={drawMode === "polygon" ? "default" : "outline"} size="sm" onClick={() => setDrawMode("polygon")} disabled={!centerPoint}>Draw Zone</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setPolygonPoints((prev) => prev.slice(0, -1))} disabled={polygonPoints.length === 0}>
                  <RotateCcw className="mr-1 h-4 w-4" /> Undo
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => { setCenterPoint(null); setPolygonPoints([]) }}>
                  <Trash2 className="mr-1 h-4 w-4" /> Clear
                </Button>
              </div>
            </div>
            {mapsError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 mb-2">
                Map failed to load: {mapsError}
              </div>
            )}
            <div ref={mapContainerRef} className="h-[420px] w-full rounded-xl border border-slate-200" />
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Station Point</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {centerPoint ? `${centerPoint.lat.toFixed(5)}, ${centerPoint.lng.toFixed(5)}` : "Not set"}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Polygon Points</div>
              <div className="mt-1 text-sm font-medium text-slate-900">{polygonPoints.length}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Mode</div>
              <div className="mt-1 text-sm font-medium text-slate-900">{drawMode === "station" ? "Setting station point" : "Drawing polygon zone"}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Type</div>
              <div className="mt-1 text-sm font-medium text-slate-900">Client</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between border-t border-slate-200 px-6 py-4">
        <Button type="button" variant="ghost" onClick={() => { setCenterPoint(null); setPolygonPoints([]); setLocationQuery(""); setError(null) }}>
          Reset
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : isEditing ? "Update Client" : "Save Client"}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function ClientFormDialog({ open, onOpenChange, onSaved, initialRecord = null }: ClientFormDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] w-[95vw] h-[95vh] bg-white shadow-xl border border-gray-200 rounded-lg overflow-y-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <DialogPrimitive.Title className="sr-only">{initialRecord ? "Edit Client" : "Add Client"}</DialogPrimitive.Title>
          <DialogPrimitive.Close className="absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2">
            <X className="h-5 w-5" />
          </DialogPrimitive.Close>
          {open && (
            <ClientFormContent
              initialRecord={initialRecord}
              onDone={() => {
                onOpenChange(false)
                onSaved()
              }}
            />
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
