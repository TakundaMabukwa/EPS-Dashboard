"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Search, MapPin, Navigation, Loader2, Video, Fuel, FileText, User, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadGoogleMaps } from "@/lib/google-maps";

interface VideoDevice {
  plateName: string;
  deviceId: string;
  deviceType: string;
  cameras: number;
  activeTime: string;
  expirationTime: string;
  timezone: string;
  customerName: string;
}

interface Vehicle {
  id: string;
  plate: string;
  driver?: string;
  status: "online" | "offline" | "idle";
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  speed?: number;
  lastUpdate?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  timestamp?: string;
  hasVideo?: boolean;
  cameraOnline?: boolean;
  cameraExpired?: boolean;
  cameraActiveTime?: string;
  cameraCount?: number;
  deviceId?: string;
  iteminstalled?: string;
}

interface FuelData {
  plate: string;
  fuelLevel: number;
  fuelPercentage: number;
  engineTemperature: number;
  totalFuelUsed: number;
  timestamp: string;
  driverName?: string;
}

function createTruckIcon(gm: any, statusColor: string): string {
  const svg = `<svg width="40" height="40" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));">
    <circle cx="16" cy="16" r="14" fill="white" stroke="${statusColor}" stroke-width="2"/>
    <rect x="7" y="12" width="10" height="6" rx="0.5" fill="${statusColor}"/>
    <path d="M17 13.5h2.5l2 2v2h-1.5" stroke="${statusColor}" stroke-width="1.5" fill="none"/>
    <circle cx="11" cy="19" r="1.5" fill="white" stroke="${statusColor}" stroke-width="1"/>
    <circle cx="19.5" cy="19" r="1.5" fill="white" stroke="${statusColor}" stroke-width="1"/>
    <rect x="8" y="13" width="3" height="2" fill="white" opacity="0.8" rx="0.3"/>
    <rect x="12" y="13" width="3" height="2" fill="white" opacity="0.8" rx="0.3"/>
  </svg>`;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

export default function LiveMapView() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vehiclesWithVideo, setVehiclesWithVideo] = useState<Map<string, VideoDevice>>(new Map());
  const [fuelView, setFuelView] = useState(false);
  const [fuelData, setFuelData] = useState<FuelData | null>(null);
  const [fuelLoading, setFuelLoading] = useState(false);
  const [fuelError, setFuelError] = useState<string | null>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const markers = useRef<any[]>([]);
  const fetchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mapInitialized = useRef(false);
  const boundsSet = useRef(false);

  // Fetch vehicles with video availability
  useEffect(() => {
    async function fetchVideoAvailability() {
      try {
        const videoApiUrl = '/api/video/streams';
        console.log('Fetching video availability from proxy:', videoApiUrl);
        
        const response = await fetch(videoApiUrl, {
          method: 'GET'
        });

        console.log('Video API response status:', response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log('Video API response data:', result);
          const devices = result.data?.devices || result.data || result || [];
          const videoDeviceMap = new Map<string, VideoDevice>();
          const now = new Date();
          
          devices.forEach((v: any) => {
            const plate = v.plateName?.toUpperCase();
            if (plate) {
              const expirationTime = v.expirationTime ? new Date(v.expirationTime) : null;
              const activeTime = v.activeTime ? new Date(v.activeTime) : null;
              const isExpired = expirationTime ? expirationTime < now : false;
              const isActiveRecently = activeTime ? (now.getTime() - activeTime.getTime()) < 5 * 60 * 1000 : false;
              
              videoDeviceMap.set(plate, {
                plateName: v.plateName,
                deviceId: v.deviceId,
                deviceType: v.deviceType,
                cameras: v.cameras,
                activeTime: v.activeTime,
                expirationTime: v.expirationTime,
                timezone: v.timezone,
                customerName: v.customerName,
              });
              
              console.log(`Plate ${plate}: active=${v.activeTime}, expires=${v.expirationTime}, expired=${isExpired}, recentlyActive=${isActiveRecently}`);
            }
          });
          
          console.log('Video devices map:', Array.from(videoDeviceMap.keys()));
          setVehiclesWithVideo(videoDeviceMap);
        } else {
          console.error('Video API returned non-OK status:', response.status, response.statusText);
        }
      } catch (err) {
        console.error('Error fetching video availability:', err);
      }
    }

    fetchVideoAvailability();
    const interval = setInterval(fetchVideoAvailability, 60000);
    return () => clearInterval(interval);
  }, []);

  // Check if vehicle has cameras based on iteminstalled field
  const hasCamerasInstalled = (iteminstalled: string | null | undefined): boolean => {
    if (!iteminstalled) return false;
    const lower = iteminstalled.toLowerCase();
    return lower.includes('skycam') || lower.includes('sky cam') || lower.includes('cam');
  };

  // Fetch vehicle data from API - only called after map loads
  const processEpsVehicles = (epsData: any, existingPlates: Set<string>): Vehicle[] => {
    if (!epsData) return [];
    let data = epsData;
    if (data?.data) data = data.data;
    else if (data?.vehicles) data = data.vehicles;
    const vehicles = Array.isArray(data) ? data : data?.vehicles || data?.data || [];
    const now = new Date();
    
    return vehicles.map((v: any) => {
      const plate = v.plate || v.registration || v.registrationNumber || 'Unknown';
      existingPlates.add(plate);
      const normalizedPlate = plate.trim().toUpperCase();
      const videoDevice = vehiclesWithVideo.get(normalizedPlate);
      const installedHasCameras = hasCamerasInstalled(v.iteminstalled);
      const hasVideo = installedHasCameras && !!videoDevice;
      const isExpired = videoDevice?.expirationTime ? new Date(videoDevice.expirationTime) < now : false;
      const isActiveRecently = videoDevice?.activeTime ? (now.getTime() - new Date(videoDevice.activeTime).getTime()) < 5 * 60 * 1000 : false;
      const cameraOnline = hasVideo && !isExpired && isActiveRecently;
      
      const vehicle: Vehicle = {
        id: v.id || v.vehicle_id || plate || Math.random().toString(),
        plate,
        driver: v.driver || v.driver_name || v.driverName || 'Unassigned',
        status: v.status || v.online === true ? 'online' :
                v.online === false ? 'offline' : 'idle',
        speed: v.speed != null ? Number(v.speed) : (v.gps_speed || 0),
        lastUpdate: v.lastUpdate || v.gps_time || v.loc_time || v.timestamp || new Date().toISOString(),
        address: v.address || v.locationAddress || '',
        hasVideo,
        cameraOnline,
        cameraExpired: isExpired,
        cameraActiveTime: videoDevice?.activeTime,
        cameraCount: videoDevice?.cameras,
        deviceId: videoDevice?.deviceId,
        iteminstalled: v.iteminstalled || '',
      };
      
      const lat = parseFloat(v.latitude || v.lat);
      const lng = parseFloat(v.longitude || v.lng);
      if (!isNaN(lat) && !isNaN(lng)) {
        vehicle.location = { lat, lng, address: vehicle.address };
        vehicle.latitude = lat;
        vehicle.longitude = lng;
      }
      return vehicle;
    }).filter((v: Vehicle) => v.location);
  };

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const vehicles = await fetch('/api/vehicle/live/all').then(async (res) => {
        const data = await res.json();
        return processEpsVehicles(data, new Set<string>());
      }).catch((e) => {
        console.error('Error fetching EPS vehicles:', e);
        return [] as Vehicle[];
      });
      setVehicles(vehicles);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load vehicle data only after map is ready
  useEffect(() => {
    if (mapLoaded && !fetchIntervalRef.current) {
      fetchVehicles();
      fetchIntervalRef.current = setInterval(fetchVehicles, 30000);
    }
    return () => {
      if (fetchIntervalRef.current) {
        clearInterval(fetchIntervalRef.current);
        fetchIntervalRef.current = null;
      }
    };
  }, [mapLoaded]);

  // Update vehicles with video availability when it changes (without re-fetching)
  useEffect(() => {
    if (vehicles.length > 0) {
      console.log('Video availability updated, updating vehicle flags...');
      const now = new Date();
      setVehicles(prevVehicles => 
        prevVehicles.map(v => {
          const normalizedPlate = v.plate?.trim().toUpperCase() || '';
          const videoDevice = vehiclesWithVideo.get(normalizedPlate);
          const installedHasCameras = hasCamerasInstalled(v.iteminstalled);
          const hasVideo = installedHasCameras && !!videoDevice;
          const isExpired = videoDevice?.expirationTime ? new Date(videoDevice.expirationTime) < now : false;
          const isActiveRecently = videoDevice?.activeTime ? (now.getTime() - new Date(videoDevice.activeTime).getTime()) < 5 * 60 * 1000 : false;
          const cameraOnline = hasVideo && !isExpired && isActiveRecently;
          
          return {
            ...v,
            hasVideo,
            cameraOnline,
            cameraExpired: isExpired,
            cameraActiveTime: videoDevice?.activeTime,
            cameraCount: videoDevice?.cameras,
            deviceId: videoDevice?.deviceId,
          };
        })
      );
    }
  }, [vehiclesWithVideo]);

  // Load Google Maps and initialize map
  useEffect(() => {
    if (!mapContainer.current || mapInitialized.current) return;

    const init = async () => {
      await loadGoogleMaps()
      const gm = (window as any).google.maps
      
      if (!mapContainer.current || mapInitialized.current) return
      mapInitialized.current = true

      try {
        map.current = new gm.Map(mapContainer.current, {
          center: { lat: -26.2041, lng: 28.0473 }, // Johannesburg
          zoom: 10,
          mapTypeId: 'roadmap',
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          zoomControl: true,
        })

        gm.event.addListenerOnce(map.current, 'idle', () => {
          setMapLoaded(true)
        })
      } catch (error) {
        console.error("Error initializing map:", error)
        setMapLoaded(true)
      }
    }

    init()

    return () => {
      markers.current.forEach((marker) => marker.setMap(null))
      markers.current = []
      if (map.current) {
        map.current = null
        mapInitialized.current = false
      }
    }
  }, [])

  // Update markers when vehicles change
  useEffect(() => {
    if (!map.current || !mapLoaded || vehicles.length === 0) return

    const gm = (window as any).google.maps

    markers.current.forEach((marker) => marker.setMap(null))
    markers.current = []

    vehicles.forEach((vehicle) => {
      if (vehicle.location) {
        let statusColor = "#1e3a8a"
        if (vehicle.hasVideo && vehicle.cameraOnline) statusColor = "#059669"
        else if (vehicle.hasVideo && vehicle.cameraExpired) statusColor = "#dc2626"
        else if (vehicle.hasVideo) statusColor = "#d97706"
        const iconUrl = createTruckIcon(gm, statusColor)

        const marker = new gm.Marker({
          position: vehicle.location,
          map: map.current,
          icon: {
            url: iconUrl,
            anchor: new gm.Point(20, 20),
          },
          title: vehicle.plate,
        })

        marker.addListener("click", () => {
          setSelectedVehicle(vehicle)
          setSidebarOpen(true)
          map.current.panTo(vehicle.location)
          map.current.setZoom(16)
        })

        markers.current.push(marker)
      }
    })

    if (vehicles.length > 0 && markers.current.length > 0 && map.current && !boundsSet.current) {
      try {
        const validLocations = vehicles
          .filter(v => v.location && 
                      typeof v.location.lng === 'number' && 
                      typeof v.location.lat === 'number' &&
                      !isNaN(v.location.lng) && 
                      !isNaN(v.location.lat) &&
                      Math.abs(v.location.lng) <= 180 &&
                      Math.abs(v.location.lat) <= 90)
          .map(v => v.location!)
        
        if (validLocations.length > 1) {
          try {
            const bounds = new gm.LatLngBounds()
            validLocations.forEach(loc => bounds.extend(loc))
            map.current.fitBounds(bounds, { padding: 50, maxZoom: 12 })
            boundsSet.current = true
          } catch (fitError) {
            console.log('Could not fit bounds, using default view')
            boundsSet.current = true
          }
        } else {
          boundsSet.current = true
        }
      } catch (error) {
        console.error('Error processing vehicle locations:', error)
        boundsSet.current = true
      }
    }
  }, [vehicles, mapLoaded])

  // Filter and sort vehicles - video available and online first
  const filteredVehicles = vehicles
    .filter((vehicle) =>
      vehicle.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.driver?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (a.cameraOnline && !b.cameraOnline) return -1;
      if (!a.cameraOnline && b.cameraOnline) return 1;
      if (a.hasVideo && !b.hasVideo) return -1;
      if (!a.hasVideo && b.hasVideo) return 1;
      return a.plate.localeCompare(b.plate);
    });

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      {/* Loading State */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 z-50">
          <div className="text-center">
            <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-700">
              Initializing map...
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Setting up map view
            </p>
          </div>
        </div>
      )}
      
      {/* Vehicle Loading Indicator (smaller, in corner) */}
      {mapLoaded && loading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg px-4 py-2 flex items-center gap-2 border border-gray-200">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Loading vehicles...</span>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* Right Sidebar */}
      <div
        className={cn(
          "absolute top-28 right-8 w-72 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-200 transition-transform duration-300 max-h-[calc(100%-8rem)] flex flex-col",
          !sidebarOpen && "translate-x-[calc(100%+1rem)]"
        )}
      >
        {/* Compact Sidebar Header */}
        <div className="p-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-blue-600 rounded-lg">
              <MapPin className="w-3.5 h-3.5 text-white" />
            </div>
            <h3 className="font-bold text-sm text-gray-900">
              {selectedVehicle ? "Vehicle Info" : "All Vehicles"}
            </h3>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        {!selectedVehicle && (
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search plate or driver..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 h-9 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {selectedVehicle ? (
            <div className="space-y-2 p-2">
              <div className="p-3 bg-white rounded-lg border-2 border-blue-200">
                <div className="mb-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-lg text-blue-900">
                      {selectedVehicle.plate}
                    </h4>
                    {selectedVehicle.hasVideo && (
                      selectedVehicle.cameraOnline ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          <Video className="w-3 h-3" />
                          Camera Online ({selectedVehicle.cameraCount} cam)
                        </span>
                      ) : selectedVehicle.cameraExpired ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-300">
                          <Video className="w-3 h-3" />
                          Camera Expired
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-300">
                          <Video className="w-3 h-3" />
                          Camera Offline
                        </span>
                      )
                    )}
                  </div>
                  <span
                    className={cn(
                      "inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium",
                      selectedVehicle.status === "online"
                        ? "bg-green-100 text-green-700"
                        : selectedVehicle.status === "idle"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-gray-100 text-gray-700"
                    )}
                  >
                    {selectedVehicle.status}
                  </span>
                </div>
                
                {selectedVehicle.location && (
                  <div className="space-y-1.5 text-xs text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>{selectedVehicle.speed !== undefined ? Number(selectedVehicle.speed).toFixed(1) : '0.0'} km/h</span>
                    </div>
                    
                    <div className="flex items-start gap-1.5">
                      <svg className="w-3.5 h-3.5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="line-clamp-1">{selectedVehicle.driver}</span>
                    </div>
                    
                    <div className="flex items-start gap-1.5">
                      <svg className="w-3.5 h-3.5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="flex-1 line-clamp-2">
                        {selectedVehicle.location.address || selectedVehicle.address || "Unknown location"}
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-500 mt-1">
                      {Number(selectedVehicle.location.lat).toFixed(6)}, {Number(selectedVehicle.location.lng).toFixed(6)}
                    </div>
                    
                    <div className="text-xs text-gray-500 mt-1">
                      Last Update: {selectedVehicle.lastUpdate ? new Date(selectedVehicle.lastUpdate).toLocaleString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit', 
                        minute: '2-digit',
                        second: '2-digit'
                      }) : 'N/A'}
                    </div>
                  </div>
                )}

                {selectedVehicle.hasVideo && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <div className="text-xs font-medium text-gray-700 mb-1">Camera Details</div>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Status</span>
                        <span className={cn("font-medium", 
                          selectedVehicle.cameraOnline ? "text-green-600" : 
                          selectedVehicle.cameraExpired ? "text-red-600" : "text-gray-500"
                        )}>
                          {selectedVehicle.cameraOnline ? "Online" : selectedVehicle.cameraExpired ? "Expired" : "Offline"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cameras</span>
                        <span className="font-medium">{selectedVehicle.cameraCount || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Device</span>
                        <span className="font-medium text-[10px]">{selectedVehicle.deviceId || 'N/A'}</span>
                      </div>
                      {selectedVehicle.cameraActiveTime && (
                        <div className="flex justify-between">
                          <span>Last Seen</span>
                          <span className="font-medium">{new Date(selectedVehicle.cameraActiveTime).toLocaleString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions Buttons */}
              {!fuelView && (
              <div className="space-y-2">
                <button
                  onClick={() => {
                    router.push(`/video-feeds?driver=${encodeURIComponent(selectedVehicle.driver || 'Unassigned')}&vehicle=${encodeURIComponent(selectedVehicle.plate)}`);
                  }}
                  disabled={!selectedVehicle.hasVideo || !selectedVehicle.cameraOnline}
                  className="w-full inline-flex items-center justify-start gap-3 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4"
                >
                  <Video className="w-4 h-4" />
                  <span>
                    {selectedVehicle.hasVideo 
                      ? selectedVehicle.cameraOnline 
                        ? 'Watch Live Feed' 
                        : selectedVehicle.cameraExpired 
                          ? 'Camera Expired' 
                          : 'Camera Offline'
                      : 'No Camera'}
                  </span>
                  {selectedVehicle.hasVideo && selectedVehicle.cameraOnline && (
                    <span className="ml-auto px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Live</span>
                  )}
                  {selectedVehicle.hasVideo && !selectedVehicle.cameraOnline && (
                    <span className="ml-auto px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                      {selectedVehicle.cameraExpired ? 'Expired' : 'Offline'}
                    </span>
                  )}
                </button>

                <button
                  onClick={async () => {
                    setFuelView(true);
                    setFuelData(null);
                    setFuelError(null);
                    setFuelLoading(true);
                    const normalizedTarget = selectedVehicle.plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
                    let found = false;
                    try {
                      const res = await fetch('/api/energy-rite/vehicles', { cache: 'no-store' });
                      if (res.ok) {
                        const json = await res.json();
                        const list: any[] = Array.isArray(json) ? json : json?.data || [];
                        const match = list.find((v: any) => {
                          const p = String(v.Plate || v.plate || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
                          return p === normalizedTarget;
                        });
                        if (match) {
                          const t1pct = parseFloat(match.fuel_probe_1_level_percentage ?? match.tank1Percent ?? match.fuelLevelPercent ?? 0) || 0;
                          const t2pct = parseFloat(match.fuel_probe_2_level_percentage ?? match.tank2Percent ?? 0) || 0;
                          const t1vol = parseFloat(match.fuel_probe_1_volume_in_tank ?? match.tank1Volume ?? match.fuelVolume ?? 0) || 0;
                          const t1temp = parseFloat(match.fuel_probe_1_temperature ?? match.tank1Temp ?? match.engineTemp ?? match.engineTemperature ?? 0) || 0;
                          setFuelData({
                            plate: match.Plate || match.plate || match.registration || '',
                            fuelLevel: t1vol,
                            fuelPercentage: t2pct > 0 ? (t1pct + t2pct) / 2 : t1pct,
                            engineTemperature: t1temp,
                            totalFuelUsed: parseFloat(match.totalFuelUsed ?? 0) || 0,
                            timestamp: match.last_message_date || match.LocTime || match.timestamp || match.lastUpdated || '',
                            driverName: match.DriverName || match.drivername || match.driver || '',
                          });
                          found = true;
                        }
                      }
                    } catch {}
                    if (!found) {
                      try {
                        const res = await fetch('/api/canbus/fuel', { cache: 'no-store' });
                        if (res.ok) {
                          const json = await res.json();
                          const list: any[] = json?.data || [];
                          const match = list.find((v: any) => {
                            const p = String(v.plate || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
                            return p === normalizedTarget;
                          });
                          if (match) {
                            setFuelData({
                              plate: match.plate,
                              fuelLevel: match.fuelLevel || 0,
                              fuelPercentage: match.fuelPercentage || 0,
                              engineTemperature: match.engineTemperature || 0,
                              totalFuelUsed: match.totalFuelUsed || 0,
                              timestamp: match.timestamp || '',
                            });
                            found = true;
                          }
                        }
                      } catch {}
                    }
                    if (!found) setFuelError(`No fuel data found for ${selectedVehicle.plate}`);
                    setFuelLoading(false);
                  }}
                  className="w-full inline-flex items-center justify-start gap-3 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4"
                >
                  <Fuel className="w-4 h-4" />
                  <span>Fuel</span>
                </button>

                <button
                  onClick={() => {
                    console.log('Reports clicked for', selectedVehicle.plate);
                  }}
                  className="w-full inline-flex items-center justify-start gap-3 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4"
                >
                  <FileText className="w-4 h-4" />
                  <span>Reports</span>
                </button>

                <button
                  onClick={() => {
                    console.log('Driver clicked for', selectedVehicle.plate);
                  }}
                  className="w-full inline-flex items-center justify-start gap-3 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4"
                >
                  <User className="w-4 h-4" />
                  <span>Driver</span>
                </button>
              </div>
              )}

              {/* Fuel data panel */}
              {fuelView && (
                <div className="space-y-2">
                  {fuelLoading && (
                    <div className="flex justify-center py-6">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                    </div>
                  )}
                  {!fuelLoading && fuelError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                      <p className="text-xs text-red-600">{fuelError}</p>
                      <button
                        onClick={async () => {
                          setFuelData(null);
                          setFuelError(null);
                          setFuelLoading(true);
                          const normalizedTarget = selectedVehicle.plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
                          let found = false;
                          try {
                            const res = await fetch('/api/energy-rite/vehicles', { cache: 'no-store' });
                            if (res.ok) {
                              const json = await res.json();
                              const list: any[] = Array.isArray(json) ? json : json?.data || [];
                              const match = list.find((v: any) => {
                                const p = String(v.Plate || v.plate || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
                                return p === normalizedTarget;
                              });
                              if (match) {
                                const t1pct = parseFloat(match.fuel_probe_1_level_percentage ?? match.tank1Percent ?? match.fuelLevelPercent ?? 0) || 0;
                                const t2pct = parseFloat(match.fuel_probe_2_level_percentage ?? match.tank2Percent ?? 0) || 0;
                                setFuelData({
                                  plate: match.Plate || match.plate || match.registration || '',
                                  fuelLevel: parseFloat(match.fuel_probe_1_volume_in_tank ?? match.tank1Volume ?? match.fuelVolume ?? 0) || 0,
                                  fuelPercentage: t2pct > 0 ? (t1pct + t2pct) / 2 : t1pct,
                                  engineTemperature: parseFloat(match.fuel_probe_1_temperature ?? match.tank1Temp ?? match.engineTemp ?? match.engineTemperature ?? 0) || 0,
                                  totalFuelUsed: parseFloat(match.totalFuelUsed ?? 0) || 0,
                                  timestamp: match.last_message_date || match.LocTime || match.timestamp || match.lastUpdated || '',
                                  driverName: match.DriverName || match.drivername || match.driver || '',
                                });
                                found = true;
                              }
                            }
                          } catch {}
                          if (!found) {
                            try {
                              const res = await fetch('/api/canbus/fuel', { cache: 'no-store' });
                              if (res.ok) {
                                const json = await res.json();
                                const list: any[] = json?.data || [];
                                const match = list.find((v: any) => {
                                  const p = String(v.plate || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
                                  return p === normalizedTarget;
                                });
                                if (match) {
                                  setFuelData({
                                    plate: match.plate,
                                    fuelLevel: match.fuelLevel || 0,
                                    fuelPercentage: match.fuelPercentage || 0,
                                    engineTemperature: match.engineTemperature || 0,
                                    totalFuelUsed: match.totalFuelUsed || 0,
                                    timestamp: match.timestamp || '',
                                  });
                                  found = true;
                                }
                              }
                            } catch {}
                          }
                          if (!found) setFuelError(`No fuel data found for ${selectedVehicle.plate}`);
                          setFuelLoading(false);
                        }}
                        className="mt-2 w-full rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                  {!fuelLoading && !fuelError && !fuelData && (
                    <p className="text-xs text-center text-gray-400 py-4">No fuel data available.</p>
                  )}
                  {!fuelLoading && fuelData && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="p-0.5 bg-green-600 rounded">
                          <Fuel className="w-3 h-3 text-white" />
                        </div>
                        <h3 className="font-bold text-xs text-gray-900">Fuel Data</h3>
                      </div>
                      <div className="rounded-lg border bg-white p-3 shadow-sm">
                        <div className="space-y-2 text-sm">
                          {fuelData.driverName && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Driver</span>
                              <span className="font-semibold">{fuelData.driverName}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-500">Fuel Level</span>
                            <span className="font-semibold">{fuelData.fuelLevel.toFixed(1)} L</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Fuel %</span>
                            <span className="font-semibold">{fuelData.fuelPercentage.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Temp</span>
                            <span className="font-semibold">{fuelData.engineTemperature.toFixed(1)}°</span>
                          </div>
                          {fuelData.totalFuelUsed > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Total Used</span>
                              <span className="font-semibold">{fuelData.totalFuelUsed.toFixed(1)} L</span>
                            </div>
                          )}
                          {fuelData.timestamp && (
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-400">Updated</span>
                              <span className="text-gray-500">{new Date(fuelData.timestamp).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2 pt-1">
                {fuelView && (
                  <Button variant="outline" className="w-full" onClick={() => { setFuelView(false); setFuelData(null); }}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Actions
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSelectedVehicle(null);
                    setFuelView(false);
                    setFuelData(null);
                    map.current?.panTo({ lat: -26.2041, lng: 28.0473 })
                    map.current?.setZoom(10)
                  }}
                >
                  Back to All Vehicles
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 p-2">
              {filteredVehicles.length > 0 ? (
                filteredVehicles.map((vehicle) => (
                  <button
                    key={vehicle.id}
                    onClick={() => {
                      setSelectedVehicle(vehicle);
                      if (vehicle.location) {
                        map.current?.panTo(vehicle.location)
                        map.current?.setZoom(16)
                      }
                    }}
                    className="w-full p-3 text-left bg-white rounded-lg border-2 border-blue-100 hover:border-blue-300 transition-all duration-200 hover:shadow-md"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="font-bold text-lg text-blue-900">
                        {vehicle.plate}
                      </h4>
                      <div className="flex items-center gap-1.5">
                        {vehicle.hasVideo ? (
                          vehicle.cameraOnline ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                              <Video className="w-3 h-3" />
                              Online ({vehicle.cameraCount} cam)
                            </span>
                          ) : vehicle.cameraExpired ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-300">
                              <Video className="w-3 h-3" />
                              Expired
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-300">
                              <Video className="w-3 h-3" />
                              Offline
                            </span>
                          )
                        ) : null}
                      </div>
                    </div>
                    
                    {vehicle.location ? (
                      <div className="space-y-1.5 text-xs text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span>{Number(vehicle.speed).toFixed(1)} km/h</span>
                        </div>
                        
                        <div className="flex items-start gap-1.5">
                          <svg className="w-3.5 h-3.5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="line-clamp-1">{vehicle.driver}</span>
                        </div>
                        
                        <div className="flex items-start gap-1.5">
                          <svg className="w-3.5 h-3.5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="flex-1 line-clamp-2">{vehicle.address}</span>
                        </div>
                        
                        <div className="text-xs text-gray-500 mt-1">
                          Last seen: {vehicle.lastUpdate ? new Date(vehicle.lastUpdate).toLocaleString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          }) : 'Live'}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500">
                        No live data.
                      </div>
                    )}
                  </button>
                ))
              ) : (
                <div className="p-8 text-center">
                  <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No vehicles found</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toggle Button (when sidebar is closed) */}
      {!sidebarOpen && (
        <Button
          onClick={() => setSidebarOpen(true)}
          className="absolute top-20 right-8 h-10 w-10 p-0 rounded-full shadow-2xl bg-blue-600 hover:bg-blue-700 border-2 border-white"
          variant="default"
        >
          <Navigation className="h-5 w-5" />
        </Button>
      )}


    </div>
  );
}
