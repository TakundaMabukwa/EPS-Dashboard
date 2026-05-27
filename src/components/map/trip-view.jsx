'use client'

import { useEffect, useRef } from 'react'
import { loadGoogleMaps } from '@/lib/google-maps'
import DetailCard from '../ui/detail-card'
import { ScrollArea, ScrollBar } from '../ui/scroll-area'

const TripViewMap = ({ trips }) => {
  console.log('trips :>> ', trips)
  const mapContainerRef = useRef(null)
  useEffect(() => {
    if (!mapContainerRef.current) return

    const init = async () => {
      await loadGoogleMaps()
      const gm = (window as any).google.maps

      const map = new gm.Map(mapContainerRef.current, {
        center: { lat: -26.2041, lng: 28.0473 },
        zoom: 12,
        mapTypeId: 'roadmap',
        mapTypeControl: false,
        streetViewControl: false,
        zoomControl: true,
      })

      new gm.Marker({
        position: { lat: -26.2041, lng: 28.0473 },
        map: map,
        title: 'test',
      })
    }

    init()

    return () => {}
  }, [])

  return (
    <div className="relative w-full h-screen rounded-md overflow-hidden">
      <div ref={mapContainerRef} className="w-full h-full" />
      <ScrollArea className="w-full ">
        <div className="absolute bottom-0 left-0 right-0  flex flex-row  overflow-x-auto gap-4  z-2 p-4 space-y-4 whitespace-nowrap">
          {trips.map((trip) => (
            <div key={trip.id} className="w-[350px]">
              <DetailCard
                title={`${trip.id} - ${trip.status}`}
                description={trip.clientDetails.name}
              >
              </DetailCard>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}

export default TripViewMap
