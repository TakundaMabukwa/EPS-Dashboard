'use client'

import { useEffect, useRef } from 'react'
import { MapPin } from 'lucide-react'
import { loadGoogleMaps } from '@/lib/google-maps'

type RoutePoint = {
  lat?: number
  lng?: number
  latitude?: number
  longitude?: number
  datetime?: string
  timestamp?: string
  speed?: number
  plate?: string
}

type NormalizedPoint = {
  lat: number
  lng: number
  datetime: string | null
  speed: number | null
  plate: string | null
}

const normalizePoints = (routePoints: string | RoutePoint[] | null | undefined): NormalizedPoint[] => {
  if (!routePoints) return []

  try {
    const raw = typeof routePoints === 'string' ? JSON.parse(routePoints.replace(/&quot;/g, '"')) : routePoints
    if (!Array.isArray(raw)) return []

    return raw
      .map((point) => {
        const lat = Number(point?.lat ?? point?.latitude)
        const lng = Number(point?.lng ?? point?.longitude)
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

        return {
          lat,
          lng,
          datetime: point?.datetime || point?.timestamp || null,
          speed: Number.isFinite(Number(point?.speed)) ? Number(point?.speed) : null,
          plate: point?.plate ? String(point.plate) : null,
        }
      })
      .filter(Boolean) as NormalizedPoint[]
  } catch {
    return []
  }
}

export default function TripRouteMap({ routePoints }: { routePoints: string | RoutePoint[] | null | undefined }) {
  const mapRef = useRef<any>(null)
  const containerId = 'audit-trip-route-map'

  useEffect(() => {
    const points = normalizePoints(routePoints)
    if (!points.length) return

    const init = async () => {
      await loadGoogleMaps()
      const gm = (window as any).google.maps

      const map = new gm.Map(document.getElementById(containerId), {
        center: { lat: points[0].lat, lng: points[0].lng },
        zoom: 10,
        mapTypeId: 'roadmap',
        mapTypeControl: false,
        streetViewControl: false,
        zoomControl: true,
      })
      mapRef.current = map

      const routePath = points.map((p) => ({ lat: p.lat, lng: p.lng }))

      new gm.Polyline({
        path: routePath,
        map,
        strokeColor: '#3b82f6',
        strokeWeight: 4,
        strokeOpacity: 0.9,
      })

      new gm.Marker({
        position: routePath[0],
        map,
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

      new gm.Marker({
        position: routePath[routePath.length - 1],
        map,
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
      routePath.forEach((p) => bounds.extend(p))
      map.fitBounds(bounds, 50)
    }

    init()
  }, [routePoints])

  if (!routePoints) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center rounded-lg bg-slate-50">
        <div className="text-center">
          <MapPin className="mx-auto mb-2 h-10 w-10 text-slate-400" />
          <p className="text-sm text-slate-500">No route data available</p>
        </div>
      </div>
    )
  }

  return <div id={containerId} className="h-full min-h-[400px] w-full rounded-lg" />
}
