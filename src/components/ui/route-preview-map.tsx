"use client"

import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Route } from 'lucide-react';
import { loadGoogleMaps } from '@/lib/google-maps';

interface RoutePreviewMapProps {
  origin: string;
  destination: string;
  routeData?: any;
  stopPoints?: Array<{
    id: number;
    name: string;
    coordinates: number[][];
  }> | string;
  getStopPointsData?: () => Promise<any[]>;
  driverLocation?: {
    lat: number;
    lng: number;
    name: string;
  };
  clientLocation?: {
    lat: number;
    lng: number;
    name: string;
  };
  selectedClient?: any;
  tripId?: string;
  preserveOrder?: boolean;
  loadingGeozoneCoords?: number[][];
  dropoffGeozoneCoords?: number[][];
}

export function RoutePreviewMap({ origin, destination, routeData, stopPoints = [], getStopPointsData, driverLocation, clientLocation, selectedClient, tripId, preserveOrder = false, loadingGeozoneCoords, dropoffGeozoneCoords }: RoutePreviewMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const lastUpdateRef = useRef<string>('');
  const cacheRef = useRef<Map<string, any>>(new Map());
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const markersRef = useRef<any[]>([]);
  const overlaysRef = useRef<any[]>([]);

  useEffect(() => {
    const initializeMap = async () => {
      if (!mapContainer.current || map.current) return;

      await loadGoogleMaps()
      const gm = (window as any).google.maps

      map.current = new gm.Map(mapContainer.current, {
        center: { lat: -26.2041, lng: 28.0473 },
        zoom: 6,
        mapTypeId: 'roadmap',
        mapTypeControl: false,
        streetViewControl: false,
        zoomControl: true,
      })

      gm.event.addListenerOnce(map.current, 'idle', () => {
        setMapLoaded(true)
      })
    }

    const timer = setTimeout(initializeMap, 100)

    return () => {
      clearTimeout(timer)
      if (map.current) {
        map.current = null
        setMapLoaded(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!mapLoaded || (!origin && !destination && !selectedClient?.coordinates)) return

    const stopPointsKey = Array.isArray(stopPoints) ? stopPoints.map(p => p?.id || p).join(',') : stopPoints || ''
    const driverKey = driverLocation ? `${driverLocation.lat}-${driverLocation.lng}-${driverLocation.name}` : ''
    const getStopPointsKey = getStopPointsData ? 'hasStopPoints' : 'noStopPoints'
    const preserveOrderKey = preserveOrder ? 'preserve' : 'optimize'
    const cacheKey = `${origin}-${destination}-${stopPointsKey}-${selectedClient?.id || ''}-${tripId || ''}-${driverKey}-${getStopPointsKey}-${preserveOrderKey}`
    
    const shouldUpdate = lastUpdateRef.current !== cacheKey || stopPoints === 'async'
    if (!shouldUpdate) return

    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current)
    }

    updateTimeoutRef.current = setTimeout(() => {
      lastUpdateRef.current = cacheKey
      updateRoute()
    }, 200)

    const updateRoute = async () => {
      if (!map.current || !mapLoaded) return

      const gm = (window as any).google.maps

      // Clear existing markers and overlays
      markersRef.current.forEach(marker => marker.setMap && marker.setMap(null))
      markersRef.current = []
      overlaysRef.current.forEach(o => o.setMap && o.setMap(null))
      overlaysRef.current = []

      try {
        let originCoords = null
        let destCoords = null

        if (origin && destination) {
          [originCoords, destCoords] = await Promise.all([
            geocodeLocation(origin),
            geocodeLocation(destination)
          ])
        }

        // Draw loading geozone polygon
        if (loadingGeozoneCoords && loadingGeozoneCoords.length >= 3) {
          const path = loadingGeozoneCoords.map(c => ({ lat: c[1], lng: c[0] }))
          const polygon = new gm.Polygon({
            paths: path,
            map: map.current,
            fillColor: '#22c55e',
            fillOpacity: 0.2,
            strokeColor: '#16a34a',
            strokeWeight: 2,
          })
          overlaysRef.current.push(polygon)
        }

        // Draw dropoff geozone polygon
        if (dropoffGeozoneCoords && dropoffGeozoneCoords.length >= 3) {
          const path = dropoffGeozoneCoords.map(c => ({ lat: c[1], lng: c[0] }))
          const polygon = new gm.Polygon({
            paths: path,
            map: map.current,
            fillColor: '#3b82f6',
            fillOpacity: 0.2,
            strokeColor: '#2563eb',
            strokeWeight: 2,
          })
          overlaysRef.current.push(polygon)
        }

        // Add client route if available
        if (selectedClient?.coordinates) {
          try {
            let coords: number[][] = []
            if (typeof selectedClient.coordinates === 'string') {
              try {
                const parsed = JSON.parse(selectedClient.coordinates)
                if (Array.isArray(parsed)) {
                  coords = parsed.map((c: any) => [Number(c[0]), Number(c[1])]).filter((c) => Number.isFinite(c[0]) && Number.isFinite(c[1]))
                }
              } catch {
                coords = selectedClient.coordinates.split(' ')
                  .filter((coord: string) => coord.trim())
                  .map((coord: string) => {
                    const [lng, lat] = coord.split(',')
                    return [parseFloat(lng), parseFloat(lat)]
                  })
                  .filter((coord: number[]) => !isNaN(coord[0]) && !isNaN(coord[1]))
              }
            }
            if (coords.length >= 3) {
              const path = coords.map(c => ({ lat: c[1], lng: c[0] }))
              const polygon = new gm.Polygon({
                paths: path,
                map: map.current,
                fillColor: '#8b5cf6',
                fillOpacity: 0.15,
                strokeColor: '#7c3aed',
                strokeWeight: 2,
              })
              overlaysRef.current.push(polygon)
            } else if (coords.length > 1) {
              const path = coords.map(c => ({ lat: c[1], lng: c[0] }))
              const polyline = new gm.Polyline({
                path,
                map: map.current,
                strokeColor: '#8b5cf6',
                strokeWeight: 4,
                strokeOpacity: 0.9,
              })
              overlaysRef.current.push(polyline)
            }
          } catch (error) {
            console.error('Error plotting client route:', error)
          }
        }

        // Add driver location marker
        if (driverLocation) {
          const marker = new gm.Marker({
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
            title: `Driver: ${driverLocation.name}`,
          })
          markersRef.current.push(marker)

          if (originCoords) {
            const driverRoute = await getGoogleRoute(
              { lat: driverLocation.lat, lng: driverLocation.lng },
              originCoords
            )
            if (driverRoute) {
              const polyline = new gm.Polyline({
                path: driverRoute,
                map: map.current,
                strokeColor: '#1e40af',
                strokeWeight: 3,
                strokeOpacity: 0.8,
                icons: [{
                  icon: { path: gm.SymbolPath.FORWARD_CLOSED_ARROW },
                  offset: '100%',
                  repeat: '20px',
                }],
              })
              overlaysRef.current.push(polyline)
            }
          }
        }

        // Add markers for origin/destination
        if (originCoords && origin) {
          const marker = new gm.Marker({
            position: originCoords,
            map: map.current,
            icon: {
              path: gm.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#22c55e',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
            title: origin,
          })
          markersRef.current.push(marker)
        }

        if (destCoords && destination) {
          const marker = new gm.Marker({
            position: destCoords,
            map: map.current,
            icon: {
              path: gm.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#3b82f6',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
            title: destination,
          })
          markersRef.current.push(marker)
        }

        // Add stop point markers
        if (Array.isArray(stopPoints) && stopPoints.length > 0) {
          stopPoints.forEach((stopPoint, index) => {
            const coords = stopPoint.coordinates
            const avgLng = coords.reduce((sum, coord) => sum + coord[0], 0) / coords.length
            const avgLat = coords.reduce((sum, coord) => sum + coord[1], 0) / coords.length

            const marker = new gm.Marker({
              position: { lat: avgLat, lng: avgLng },
              map: map.current,
              icon: {
                path: gm.SymbolPath.CIRCLE,
                scale: 7,
                fillColor: '#f97316',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
              },
              title: `Stop ${index + 1}: ${stopPoint.name}`,
            })
            markersRef.current.push(marker)

            const polygonPath = coords.map(c => ({ lat: c[1], lng: c[0] }))
            const polygon = new gm.Polygon({
              paths: polygonPath,
              map: map.current,
              fillColor: `hsl(${(index * 60) % 360}, 70%, 50%)`,
              fillOpacity: 0.3,
              strokeColor: `hsl(${(index * 60) % 360}, 70%, 40%)`,
              strokeWeight: 2,
            })
            overlaysRef.current.push(polygon)

            // Directional arrow from previous stop
            if (index > 0) {
              const prevStop = stopPoints[index - 1]
              const prevCoords = prevStop.coordinates
              const prevAvgLng = prevCoords.reduce((sum, coord) => sum + coord[0], 0) / prevCoords.length
              const prevAvgLat = prevCoords.reduce((sum, coord) => sum + coord[1], 0) / prevCoords.length

              const arrow = new gm.Polyline({
                path: [{ lat: prevAvgLat, lng: prevAvgLng }, { lat: avgLat, lng: avgLng }],
                map: map.current,
                strokeColor: '#ff6b35',
                strokeWeight: 3,
                strokeOpacity: 0.8,
                icons: [{
                  icon: { path: gm.SymbolPath.FORWARD_CLOSED_ARROW },
                  offset: '100%',
                  repeat: '20px',
                }],
              })
              overlaysRef.current.push(arrow)
            }
          })
        }

        // Load overlays (cached)
        if (!cacheRef.current.has('overlays-loaded')) {
          await loadMapOverlays()
          cacheRef.current.set('overlays-loaded', true)
        }

        // Fetch route
        let mainRoutePath = null

        if (routeData?.coordinates) {
          mainRoutePath = routeData.coordinates.map((c: any) => ({
            lat: c[1] ?? c.latitude,
            lng: c[0] ?? c.longitude
          }))
        }

        if (tripId && !mainRoutePath) {
          try {
            const response = await fetch(`/api/trip-route?tripId=${tripId}`)
            if (response.ok) {
              const data = await response.json()
              if (data.coordinates?.length > 0) {
                mainRoutePath = data.coordinates.map((c: any) => ({
                  lat: c.latitude ?? c[1],
                  lng: c.longitude ?? c[0]
                }))
              }
            }
          } catch (error) {
            console.error('Error fetching trip route:', error)
          }
        }

        if (!mainRoutePath && originCoords && destCoords) {
          let routeStopPoints = []
          if (stopPoints === 'async' && getStopPointsData) {
            routeStopPoints = await getStopPointsData()
          } else if (Array.isArray(stopPoints)) {
            routeStopPoints = stopPoints
          }
          mainRoutePath = await getGoogleRoute(originCoords, destCoords, routeStopPoints)
        }

        if (mainRoutePath) {
          const routeLine = new gm.Polyline({
            path: mainRoutePath,
            map: map.current,
            strokeColor: '#3b82f6',
            strokeWeight: 6,
            strokeOpacity: 0.9,
          })
          overlaysRef.current.push(routeLine)

          const bounds = new gm.LatLngBounds()
          mainRoutePath.forEach((p: any) => bounds.extend(p))

          if (driverLocation) {
            bounds.extend({ lat: driverLocation.lat, lng: driverLocation.lng })
          }
          if (clientLocation) {
            bounds.extend({ lat: clientLocation.lat, lng: clientLocation.lng })
          }

          map.current.fitBounds(bounds, 50)
        } else if (selectedClient?.coordinates) {
          let coords: number[][] = []
          if (typeof selectedClient.coordinates === 'string') {
            try {
              const parsed = JSON.parse(selectedClient.coordinates)
              if (Array.isArray(parsed)) {
                coords = parsed.map((c: any) => [Number(c[0]), Number(c[1])]).filter((c) => Number.isFinite(c[0]) && Number.isFinite(c[1]))
              }
            } catch {
              coords = selectedClient.coordinates.split(' ')
                .filter((coord: string) => coord.trim())
                .map((coord: string) => {
                  const [lng, lat] = coord.split(',')
                  return [parseFloat(lng), parseFloat(lat)]
                })
                .filter((coord: number[]) => !isNaN(coord[0]) && !isNaN(coord[1]))
            }
          }
          if (coords.length > 0) {
            const bounds = new gm.LatLngBounds()
            coords.forEach((c: number[]) => bounds.extend({ lat: c[1], lng: c[0] }))
            map.current.fitBounds(bounds, 50)
          }
        }

        // Async stop points
        if (stopPoints === 'async' && getStopPointsData) {
          try {
            const asyncStopPoints = await getStopPointsData()
            if (asyncStopPoints?.length > 0) {
              asyncStopPoints.forEach((stopPoint, index) => {
                if (stopPoint.coordinates?.length > 0) {
                  const coords = stopPoint.coordinates
                  const avgLng = coords.reduce((sum, coord) => sum + coord[0], 0) / coords.length
                  const avgLat = coords.reduce((sum, coord) => sum + coord[1], 0) / coords.length

                  const marker = new gm.Marker({
                    position: { lat: avgLat, lng: avgLng },
                    map: map.current,
                    icon: {
                      path: gm.SymbolPath.CIRCLE,
                      scale: 7,
                      fillColor: '#f97316',
                      fillOpacity: 1,
                      strokeColor: '#ffffff',
                      strokeWeight: 2,
                    },
                    title: `Stop: ${stopPoint.name}`,
                  })
                  markersRef.current.push(marker)
                }
              })
            }
          } catch (error) {
            console.error('Error loading async stop points:', error)
          }
        }
      } catch (error) {
        console.error('Error updating route:', error)
      }
    }

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
    }
  }, [mapLoaded, origin, destination, selectedClient, tripId, stopPoints, driverLocation, getStopPointsData, preserveOrder, routeData])

  const geocodeLocation = async (location: string) => {
    const cacheKey = `geocode-${location}`
    if (cacheRef.current.has(cacheKey)) {
      return cacheRef.current.get(cacheKey)
    }

    try {
      const gm = (window as any).google?.maps
      if (!gm) return null
      const geocoder = new gm.Geocoder()
      const result = await new Promise((resolve) => {
        geocoder.geocode({ address: location, region: 'za' }, (results: any, status: string) => {
          if (status === 'OK' && results?.[0]?.geometry?.location) {
            const loc = results[0].geometry.location
            resolve({ lat: loc.lat(), lng: loc.lng() })
          } else {
            resolve(null)
          }
        })
      })
      cacheRef.current.set(cacheKey, result)
      return result
    } catch (error) {
      console.error('Geocoding error:', error)
      return null
    }
  }

  const loadMapOverlays = async () => {
    if (!map.current) return

    const gm = (window as any).google.maps

    // Traffic overlay
    const trafficLayer = new gm.TrafficLayer()
    trafficLayer.setMap(map.current)
    overlaysRef.current.push(trafficLayer)

    // High-risk areas
    try {
      const response = await fetch('/api/high-risk-areas')
      if (response.ok) {
        const { data: areas } = await response.json()
        areas?.forEach((area: any) => {
          if (!area.coordinates || !map.current) return

          const coords = area.coordinates
            .split(' ')
            .filter((coord: string) => coord.trim())
            .map((coord: string) => {
              const [lng, lat] = coord.split(',')
              return [parseFloat(lng), parseFloat(lat)]
            })
            .filter((coord: number[]) => !isNaN(coord[0]) && !isNaN(coord[1]))

          if (coords.length >= 3) {
            const path = coords.map(c => ({ lat: c[1], lng: c[0] }))
            const polygon = new gm.Polygon({
              paths: path,
              map: map.current,
              fillColor: '#ef4444',
              fillOpacity: 0.3,
              strokeColor: '#dc2626',
              strokeWeight: 2,
            })
            overlaysRef.current.push(polygon)
          }
        })
      }
    } catch (error) {
      console.error('Map overlays error:', error)
    }
  }

  const getGoogleRoute = async (origin: any, destination: any, stopPoints: any[] = []) => {
    try {
      const gm = (window as any).google.maps
      const directionsService = new gm.DirectionsService()

      const waypoints = stopPoints.map(point => {
        const coords = point.coordinates
        const avgLng = coords.reduce((sum: number, coord: number[]) => sum + coord[0], 0) / coords.length
        const avgLat = coords.reduce((sum: number, coord: number[]) => sum + coord[1], 0) / coords.length
        return { location: { lat: avgLat, lng: avgLng }, stopover: true }
      })

      const result = await new Promise<any>((resolve) => {
        directionsService.route(
          {
            origin,
            destination,
            waypoints,
            travelMode: gm.TravelMode.DRIVING,
            optimizeWaypoints: !preserveOrder,
          },
          (res: any, status: string) => {
            if (status === 'OK' && res.routes?.[0]) {
              const path = res.routes[0].overview_path.map((p: any) => ({
                lat: p.lat(),
                lng: p.lng(),
              }))
              resolve(path)
            } else {
              resolve(null)
            }
          }
        )
      })

      return result
    } catch (error) {
      console.error('Route error:', error)
      return null
    }
  }

  if (!origin && !destination && !selectedClient?.coordinates) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Select a client or set loading and drop-off locations to preview route</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Route className="h-5 w-5" />
          Route Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          ref={mapContainer} 
          className="w-full h-96 rounded-lg border"
          style={{ minHeight: '384px' }}
        />
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Loading: {origin}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Drop-off: {destination}</span>
            </div>
            {Array.isArray(stopPoints) && stopPoints.length > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span>Stop Points: {stopPoints.length} zones</span>
              </div>
            )}
            {selectedClient && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span>Client Geozone: {selectedClient.name}</span>
              </div>
            )}
            {loadingGeozoneCoords && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Loading Geozone</span>
              </div>
            )}
            {dropoffGeozoneCoords && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Drop-off Geozone</span>
              </div>
            )}
            {driverLocation && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Driver: {driverLocation.name}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Main Route (Optimized)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded-full opacity-60"></div>
              <span>High-Risk Areas</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>Live Traffic</span>
            </div>
          </div>
          
          {Array.isArray(stopPoints) && stopPoints.length > 0 && (
            <div className="mt-2">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Stop Points:</h4>
              <div className="flex flex-wrap gap-2">
                {stopPoints.map((point, index) => (
                  <span 
                    key={point.id} 
                    className="px-2 py-1 text-xs rounded"
                    style={{ 
                      backgroundColor: `hsl(${(index * 60) % 360}, 70%, 90%)`,
                      color: `hsl(${(index * 60) % 360}, 70%, 30%)`
                    }}
                  >
                    {point.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
