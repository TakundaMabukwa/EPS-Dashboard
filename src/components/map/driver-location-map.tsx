'use client'

import { useEffect, useRef, useState } from 'react'
import { loadGoogleMaps } from '@/lib/google-maps'

interface DriverLocationMapProps {
  driverLocation?: {
    lat: number
    lng: number
  }
  tripRoute?: {
    origin: string
    destination: string
    waypoints?: Array<{
      lat: number
      lng: number
      address: string
    }>
  }
  driverName: string
  className?: string
}

export default function DriverLocationMap({ 
  driverLocation, 
  tripRoute, 
  driverName,
  className = "w-full h-[400px]" 
}: DriverLocationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const [loading, setLoading] = useState(true)

  const defaultLocation = { lat: -26.2041, lng: 28.0473 }
  const currentLocation = driverLocation || defaultLocation

  useEffect(() => {
    if (map.current || !mapContainer.current) return

    const init = async () => {
      await loadGoogleMaps()
      const gm = (window as any).google.maps

      map.current = new gm.Map(mapContainer.current, {
        center: currentLocation,
        zoom: 12,
        mapTypeId: 'roadmap',
        mapTypeControl: false,
        streetViewControl: false,
        zoomControl: true,
      })

      setLoading(false)

      new gm.Marker({
        position: currentLocation,
        map: map.current,
        icon: {
          path: gm.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#3b82f6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        title: driverName,
      })

      if (tripRoute && tripRoute.waypoints && tripRoute.waypoints.length > 0) {
        const bounds = new gm.LatLngBounds()
        bounds.extend(currentLocation)

        new gm.Marker({
          position: { lat: tripRoute.waypoints[0].lat, lng: tripRoute.waypoints[0].lng },
          map: map.current,
          icon: {
            path: gm.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: '#10b981',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
          title: 'Origin',
        })
        bounds.extend({ lat: tripRoute.waypoints[0].lat, lng: tripRoute.waypoints[0].lng })

        const lastWp = tripRoute.waypoints[tripRoute.waypoints.length - 1]
        new gm.Marker({
          position: { lat: lastWp.lat, lng: lastWp.lng },
          map: map.current,
          icon: {
            path: gm.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: '#ef4444',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
          title: 'Destination',
        })
        bounds.extend({ lat: lastWp.lat, lng: lastWp.lng })

        tripRoute.waypoints.slice(1, -1).forEach((wp) => {
          new gm.Marker({
            position: { lat: wp.lat, lng: wp.lng },
            map: map.current,
            icon: {
              path: gm.SymbolPath.CIRCLE,
              scale: 5,
              fillColor: '#f59e0b',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
            title: wp.address,
          })
          bounds.extend({ lat: wp.lat, lng: wp.lng })
        })

        const routePath = tripRoute.waypoints.map(wp => ({ lat: wp.lat, lng: wp.lng }))
        new gm.Polyline({
          path: routePath,
          map: map.current,
          strokeColor: '#3b82f6',
          strokeWeight: 4,
          strokeOpacity: 0.7,
        })

        map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 })
      }
    }

    init()

    return () => {
      if (map.current) {
        map.current = null
      }
    }
  }, [currentLocation, tripRoute, driverName])

  return (
    <div className={`relative ${className} rounded-lg overflow-hidden`}>
      <div ref={mapContainer} className="w-full h-full" />
      
      {loading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      <div className="absolute top-4 left-4 bg-white p-3 rounded-lg shadow-md text-xs">
        <h4 className="font-semibold mb-2">Legend</h4>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Driver Location</span>
          </div>
          {tripRoute && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Origin</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>Destination</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span>Waypoints</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-blue-500 rounded"></div>
                <span>Route</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
