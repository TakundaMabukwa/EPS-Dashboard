'use client'

import { useEffect, useRef } from 'react'
import { loadGoogleMaps } from '@/lib/google-maps'

interface RouteMapProps {
  coordinates?: number[][]
}

export default function RouteMap({ coordinates }: RouteMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)

  const defaultCoordinates = [
    [31.018885, -29.903031], [31.018965, -29.903105], [31.019861, -29.903916],
    [31.019896, -29.903952], [31.019838, -29.904015], [31.019804, -29.904061],
    [31.019794, -29.904114], [31.019791, -29.904189], [31.019771, -29.904245],
    [31.019699, -29.904317], [31.019262, -29.904699], [31.019117, -29.904801],
    [31.018908, -29.904952], [31.01885, -29.905009], [31.018821, -29.905076],
    [31.018811, -29.90515], [31.018817, -29.905255], [31.018811, -29.905348],
    [31.018779, -29.905427], [31.018714, -29.905534], [31.018638, -29.905625],
    [31.018552, -29.90569], [31.018501, -29.905724], [31.018438, -29.905824],
    [31.018139, -29.906092], [28.042224, -26.205459], [28.042114, -26.204677]
  ]

  const routeCoords = coordinates || defaultCoordinates

  useEffect(() => {
    if (map.current || !mapContainer.current) return

    const init = async () => {
      await loadGoogleMaps()
      const gm = (window as any).google.maps

      const lngs = routeCoords.map(coord => coord[0])
      const lats = routeCoords.map(coord => coord[1])
      const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2

      map.current = new gm.Map(mapContainer.current, {
        center: { lat: centerLat, lng: centerLng },
        zoom: 10,
        mapTypeId: 'roadmap',
        mapTypeControl: false,
        streetViewControl: false,
        zoomControl: true,
      })

      const routePath = routeCoords.map(coord => ({ lat: coord[1], lng: coord[0] }))

      new gm.Polyline({
        path: routePath,
        map: map.current,
        strokeColor: '#3b82f6',
        strokeWeight: 4,
        strokeOpacity: 0.9,
      })

      new gm.Marker({
        position: routePath[0],
        map: map.current,
        icon: {
          path: gm.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#22c55e',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        title: 'Start',
      })

      new gm.Marker({
        position: routePath[routePath.length - 1],
        map: map.current,
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
      map.current.fitBounds(bounds, 50)
    }

    init()

    return () => {
      if (map.current) {
        map.current = null
      }
    }
  }, [])

  return (
    <div
      ref={mapContainer}
      className="w-full h-[500px] rounded-lg"
    />
  )
}
