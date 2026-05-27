'use client';

import { useEffect, useRef } from 'react';
import { loadGoogleMaps } from '@/lib/google-maps';

interface TechMapProps {
    lat: number;
    lng: number;
    name: string;
    routeCoordinates?: number[][];
}

export const TechMap = ({ lat, lng, name, routeCoordinates }: TechMapProps) => {
    const mapContainer = useRef<HTMLDivElement | null>(null);
    const map = useRef<any>(null);

    useEffect(() => {
        if (map.current || !mapContainer.current) return;

        const init = async () => {
            await loadGoogleMaps()
            const gm = (window as any).google.maps

            const mapCenter = routeCoordinates && routeCoordinates.length > 0
                ? { lat: routeCoordinates[0][1], lng: routeCoordinates[0][0] }
                : { lat, lng };

            map.current = new gm.Map(mapContainer.current, {
                center: mapCenter,
                zoom: 12,
                mapTypeId: 'roadmap',
                mapTypeControl: false,
                streetViewControl: false,
                zoomControl: true,
            });

            new gm.Marker({
                position: { lat, lng },
                map: map.current,
                icon: {
                    path: gm.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: '#22c55e',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                },
                title: name,
            });

            if (routeCoordinates && routeCoordinates.length > 0) {
                const routePath = routeCoordinates.map(coord => ({ lat: coord[1], lng: coord[0] }));

                new gm.Polyline({
                    path: routePath,
                    map: map.current,
                    strokeColor: '#3b82f6',
                    strokeWeight: 6,
                    strokeOpacity: 0.8,
                });

                new gm.Marker({
                    position: routePath[0],
                    map: map.current,
                    label: 'S',
                    title: 'Route Start',
                });

                new gm.Marker({
                    position: routePath[routePath.length - 1],
                    map: map.current,
                    label: 'E',
                    title: 'Route End',
                });
            }
        }

        init()

        return () => {
            if (map.current) {
                map.current = null
            }
        }
    }, [lat, lng, name, routeCoordinates]);

    return <div ref={mapContainer} className="w-full h-[500px] rounded-lg" />;
};
