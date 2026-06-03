"use client"

import { useEffect, useRef, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { LocationAutocomplete } from "@/components/ui/location-autocomplete"
import { Loader2, MapPin, Undo2, Trash2, Save } from "lucide-react"
import { useGoogleMaps } from "@/hooks/use-google-maps"

type Point = { lng: number; lat: number }

interface QuickGeozoneDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client: any
  onSaved: (coordinatesJson: string) => void
}

export function QuickGeozoneDialog({ open, onOpenChange, client, onSaved }: QuickGeozoneDialogProps) {
  const { loaded: mapsLoaded, error: mapsError } = useGoogleMaps()
  const [centerPoint, setCenterPoint] = useState<Point | null>(null)
  const [polygonPoints, setPolygonPoints] = useState<Point[]>([])
  const [drawMode, setDrawMode] = useState<"station" | "polygon">("station")
  const [isSaving, setIsSaving] = useState(false)
  const [locationQuery, setLocationQuery] = useState("")

  const drawModeRef = useRef(drawMode)
  const centerPointRef = useRef<Point | null>(null)
  const geocoderRef = useRef<google.maps.Geocoder | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const centerMarkerRef = useRef<google.maps.Marker | null>(null)
  const overlaysRef = useRef<(google.maps.Polygon | google.maps.Polyline | google.maps.Marker)[]>([])

  useEffect(() => { drawModeRef.current = drawMode }, [drawMode])
  useEffect(() => { centerPointRef.current = centerPoint }, [centerPoint])

  const clearOverlays = () => {
    overlaysRef.current.forEach((o) => o.setMap(null))
    overlaysRef.current = []
  }

  const initTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)

  const cleanupMap = () => {
    if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current)
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect()
      resizeObserverRef.current = null
    }
    clearOverlays()
    if (centerMarkerRef.current) { centerMarkerRef.current.setMap(null); centerMarkerRef.current = null }
    if (mapRef.current) {
      google.maps.event.clearInstanceListeners(mapRef.current)
      mapRef.current = null
    }
  }

  useEffect(() => {
    if (!open) {
      cleanupMap()
      setCenterPoint(null)
      setPolygonPoints([])
      setDrawMode("station")
      return
    }
    if (!mapsLoaded) return
    initTimeoutRef.current = setTimeout(() => {
      const container = mapContainerRef.current
      if (!container) return
      if (mapRef.current) {
        google.maps.event.trigger(mapRef.current, 'resize')
        return
      }
      const defaultCenter = client?.latitude && client?.longitude
        ? { lat: Number(client.latitude), lng: Number(client.longitude) }
        : { lat: -26.2041, lng: 28.0473 }
      mapRef.current = new window.google.maps.Map(container, {
        center: defaultCenter,
        zoom: 12,
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
          setDrawMode("polygon")
          reverseGeocode(clickLat, clickLng)
          return
        }
        setPolygonPoints((prev) => [...prev, clickedPoint])
      })
      resizeObserverRef.current = new ResizeObserver(() => {
        if (mapRef.current) google.maps.event.trigger(mapRef.current, 'resize')
      })
      resizeObserverRef.current.observe(container)
    }, 300)
    return cleanupMap
  }, [open, mapsLoaded, client])

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
      map.setZoom(14)
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

  const handleSave = async () => {
    if (polygonPoints.length < 3) return
    setIsSaving(true)
    try {
      const coordinates = JSON.stringify(polygonPoints.map((p) => [p.lng, p.lat]))
      onSaved(coordinates)
    } catch (err) {
      console.error("Error saving geozone:", err)
    } finally {
      setIsSaving(false)
    }
  }

  const reverseGeocode = async (lat: number, lng: number) => {
    if (!geocoderRef.current) geocoderRef.current = new google.maps.Geocoder()
    try {
      const result = await geocoderRef.current.geocode({ location: { lat, lng } })
      const res = result.results[0]
      if (res) setLocationQuery(res.formatted_address)
    } catch { /* silent */ }
  }

  const handleClear = () => {
    setCenterPoint(null)
    setPolygonPoints([])
    setDrawMode("station")
    setLocationQuery("")
  }

  const handleUndo = () => {
    setPolygonPoints((prev) => prev.slice(0, -1))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Draw Geozone for {client?.name || "Client"}
          </DialogTitle>
        </DialogHeader>

        {mapsError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            Failed to load map: {mapsError}
          </div>
        )}

        {!mapsLoaded && !mapsError && (
          <div className="flex items-center justify-center h-[400px]">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        )}

        {mapsLoaded && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <LocationAutocomplete
                  value={locationQuery}
                  onChange={setLocationQuery}
                  onSelect={(suggestion) => {
                    if (!suggestion?.coordinates || suggestion.coordinates.length < 2) return
                    const [lng, lat] = suggestion.coordinates
                    setLocationQuery(suggestion.type === "place" && suggestion.name ? suggestion.name : suggestion.address || suggestion.name || "")
                    setCenterPoint({ lng, lat })
                    setDrawMode("polygon")
                  }}
                  placeholder="Search address or place"
                />
              </div>
            </div>
            <div className="relative">
              <div ref={mapContainerRef} className="w-full h-[400px] rounded-lg border" />
              <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border px-3 py-2 text-xs text-slate-600 space-y-1 z-10">
                {!centerPoint ? (
                  <p>Search a location above or click on the map to set the <span className="font-semibold text-red-600">station point</span></p>
                ) : (
                  <p>Click around the area to draw the <span className="font-semibold text-blue-600">geozone polygon</span></p>
                )}
                <p className="text-[10px] text-slate-400">Click each corner of the zone area</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Polygon points:</span>
                <span className="text-sm font-semibold text-slate-900">{polygonPoints.length}</span>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleUndo} disabled={polygonPoints.length === 0}>
                <Undo2 className="h-3.5 w-3.5 mr-1" /> Undo
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleClear}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
              <Button type="button" size="sm" onClick={handleSave} disabled={polygonPoints.length < 3 || isSaving}>
                {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                Save Geozone
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
