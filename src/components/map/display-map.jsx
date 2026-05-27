'use client'

import { useEffect, useRef, useState } from 'react'
import { loadGoogleMaps } from '@/lib/google-maps'

export default function MapView({ center = [28.0473, -26.2041], zoom = 12, tripId }) {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const [routeCoordinates, setRouteCoordinates] = useState(null)

  useEffect(() => {
    if (tripId) {
      fetch(`/api/trip-route?tripId=${tripId}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.coordinates) {
            setRouteCoordinates(data.coordinates)
          }
        })
        .catch(err => console.error('Error fetching trip route:', err))
    }
  }, [tripId])

  useEffect(() => {
    if (map.current) return

    const init = async () => {
      await loadGoogleMaps()
      const gm = window.google?.maps

      map.current = new gm.Map(mapContainer.current, {
        center: { lat: center[1], lng: center[0] },
        zoom: zoom,
        mapTypeId: 'roadmap',
        mapTypeControl: false,
        streetViewControl: false,
        zoomControl: true,
      })
    }

    init()
  }, [])

  useEffect(() => {
    if (!map.current || !routeCoordinates || routeCoordinates.length === 0) return

    const gm = window.google?.maps
    const coordinates = routeCoordinates.map(coord => ({
      lat: coord.latitude ?? coord[1],
      lng: coord.longitude ?? coord[0]
    }))

    new gm.Polyline({
      path: coordinates,
      map: map.current,
      strokeColor: '#3b82f6',
      strokeWeight: 4,
      strokeOpacity: 0.9,
    })

    const bounds = new gm.LatLngBounds()
    coordinates.forEach(p => bounds.extend(p))
    map.current.fitBounds(bounds, 50)
  }, [routeCoordinates])

  return (
    <div
      ref={mapContainer}
      className="w-full h-[500px] rounded-lg"
    />
  )
}
