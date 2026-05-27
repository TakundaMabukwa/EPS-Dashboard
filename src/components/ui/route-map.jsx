'use client'

import { useEffect, useRef, useState } from 'react'
import { loadGoogleMaps } from '@/lib/google-maps'

export function RouteMap({ 
  driverLocation, 
  loadingLocation, 
  dropoffLocation, 
  driverName = "Driver",
  className = "w-full h-[300px]",
  onRouteCalculated
}) {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const [loading, setLoading] = useState(true)
  const [routeInfo, setRouteInfo] = useState({ distance: 0, duration: 0 })

  const geocodeLocation = async (location) => {
    if (!location) return null
    try {
      const gm = (window as any).google?.maps
      if (!gm) return null
      const geocoder = new gm.Geocoder()
      const result = await new Promise((resolve, reject) => {
        geocoder.geocode({ address: location, region: 'za' }, (results, status) => {
          if (status === 'OK' && results?.[0]?.geometry?.location) {
            const loc = results[0].geometry.location
            resolve({ lat: loc.lat(), lng: loc.lng() })
          } else {
            resolve(null)
          }
        })
      })
      return result
    } catch (error) {
      console.error('Geocoding error:', error)
    }
    return null
  }

  useEffect(() => {
    if (map.current || !mapContainer.current) return

    const init = async () => {
      await loadGoogleMaps()
      const gm = (window as any).google.maps

      map.current = new gm.Map(mapContainer.current, {
        center: driverLocation ? { lat: driverLocation.lat, lng: driverLocation.lng } : { lat: -26.2041, lng: 28.0473 },
        zoom: 10,
        mapTypeId: 'roadmap',
        mapTypeControl: false,
        streetViewControl: false,
        zoomControl: true,
      })

      setLoading(false)

      try {
        const [loadingCoords, dropoffCoords] = await Promise.all([
          geocodeLocation(loadingLocation),
          geocodeLocation(dropoffLocation)
        ])

        if (driverLocation) {
          new gm.Marker({
            position: { lat: driverLocation.lat, lng: driverLocation.lng },
            map: map.current,
            icon: {
              path: gm.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#3b82f6',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
            title: driverName,
          })
        }

        if (loadingCoords) {
          new gm.Marker({
            position: loadingCoords,
            map: map.current,
            icon: {
              path: gm.SymbolPath.CIRCLE,
              scale: 6,
              fillColor: '#10b981',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
            title: loadingLocation,
          })
        }

        if (dropoffCoords) {
          new gm.Marker({
            position: dropoffCoords,
            map: map.current,
            icon: {
              path: gm.SymbolPath.CIRCLE,
              scale: 6,
              fillColor: '#ef4444',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
            title: dropoffLocation,
          })
        }

        const routePoints = []
        const bounds = new gm.LatLngBounds()

        if (driverLocation) {
          routePoints.push({ lat: driverLocation.lat, lng: driverLocation.lng })
          bounds.extend({ lat: driverLocation.lat, lng: driverLocation.lng })
        }
        if (loadingCoords) {
          routePoints.push(loadingCoords)
          bounds.extend(loadingCoords)
        }
        if (dropoffCoords) {
          routePoints.push(dropoffCoords)
          bounds.extend(dropoffCoords)
        }

        if (routePoints.length >= 2) {
          const directionsService = new gm.DirectionsService()
          const waypoints = routePoints.slice(1, -1).map(p => ({
            location: p,
            stopover: true
          }))

          directionsService.route(
            {
              origin: routePoints[0],
              destination: routePoints[routePoints.length - 1],
              waypoints: waypoints,
              travelMode: gm.TravelMode.DRIVING,
            },
            (result, status) => {
              if (status === 'OK' && result.routes?.[0]) {
                const route = result.routes[0]
                const totalDistance = Math.round(route.legs.reduce((sum, leg) => sum + leg.distance.value, 0) / 1000 * 10) / 10
                const totalDuration = Math.round(route.legs.reduce((sum, leg) => sum + leg.duration.value, 0) / 60)

                setRouteInfo({ distance: totalDistance, duration: totalDuration })
                onRouteCalculated?.({ distance: totalDistance, duration: totalDuration })

                new gm.DirectionsRenderer({
                  map: map.current,
                  directions: result,
                  suppressMarkers: true,
                  polylineOptions: {
                    strokeColor: '#3b82f6',
                    strokeWeight: 4,
                    strokeOpacity: 0.7,
                  },
                })
              } else {
                new gm.Polyline({
                  path: routePoints,
                  map: map.current,
                  strokeColor: '#3b82f6',
                  strokeWeight: 4,
                  strokeOpacity: 0.7,
                })
              }

              if (routePoints.length > 0) {
                map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 })
              }
            }
          )
        }
      } catch (error) {
        console.error('Error setting up map:', error)
      }
    }

    init()

    return () => {
      if (map.current) {
        map.current = null
      }
    }
  }, [driverLocation, loadingLocation, dropoffLocation, driverName])

  return (
    <div className={`relative ${className} rounded-lg overflow-hidden`}>
      <div ref={mapContainer} className="w-full h-full" />
      
      {loading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      <div className="absolute top-4 left-4 bg-white p-3 rounded-lg shadow-md text-xs space-y-2">
        <h4 className="font-semibold">Route Information</h4>
        {routeInfo.distance > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between gap-4">
              <span>Distance:</span>
              <span className="font-medium">{routeInfo.distance} km</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Duration:</span>
              <span className="font-medium">
                {Math.floor(routeInfo.duration / 60)}h {routeInfo.duration % 60}m
              </span>
            </div>
          </div>
        )}
        <div className="border-t pt-2 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Driver</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Loading</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Drop-off</span>
          </div>
        </div>
      </div>
    </div>
  )
}
