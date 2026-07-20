"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SecureButton } from "@/components/SecureButton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Truck,
  Phone,
  DollarSign,
  User,
  AlertTriangle,
  Clock,
  CheckCircle,
  TrendingUp,
  Users,
  MapPin,
  FileText,
  ChartBar,
  Briefcase,
  Car,
  Building2,
  Building,
  Settings,
  PlusSquare,
  Wrench,
  User2,
  ChevronDown,
  ChevronRight,
  Video,
  Moon,
  Sun,
  Search,
  Fuel,
} from "lucide-react";
import { getDashboardStats } from "@/lib/stats/dashboard";
import { createClient } from "@/lib/supabase/client";
import JobAssignmentsDashboard from "@/components/jobs/jobsStat";
import RecentActivityList from "@/components/dashboard/recentActivities";
import FinancialsPanel from "@/components/financials/FinancialsPanel";
import ExecutiveReportTab from "@/components/executive-report-tab";
import { SlidingNumber } from "@/components/ui/sliding-number";
import CardDemo from "@/components/userAvatar";
import Link from "next/link";
import DetailCard from "@/components/ui/detail-card";
import { onCreate } from "@/hooks/use-auth";
import { useGlobalContext } from "@/context/global-context/context";
import { ProgressWithWaypoints } from '@/components/ui/progress-with-waypoints'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import VehicleCameraModal from "@/components/dashboard/vehicle-camera-modal";
import { FuelGaugesView } from "@/components/fuelGauge/FuelGaugesView";
import FuelCanBusDisplay from "@/components/FuelCanBusDisplay";
import DriverPerformanceDashboard from "@/components/dashboard/DriverPerformanceDashboard";
import TestRouteMap from "@/components/map/test-route-map";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { EditTripModal } from "@/components/ui/edit-trip-modal";
import LiveMapView from "@/components/map/live-map-view";

// Global vehicle data cache to prevent redundant API calls
const vehicleDataCache = {
  data: null as any,
  timestamp: 0,
  cacheDuration: 30000, // 30 seconds
  isLoading: false,
  pendingCallbacks: [] as Array<(data: any) => void>,
  
  async fetch(): Promise<any> {
    const now = Date.now();
    
    // Return cached data if still fresh
    if (this.data && now - this.timestamp < this.cacheDuration) {
      return this.data;
    }
    
    // If already loading, wait for that request
    if (this.isLoading) {
      return new Promise((resolve) => {
        this.pendingCallbacks.push(resolve);
      });
    }
    
    // Start new fetch with 4-second timeout
    this.isLoading = true;
    
    try {
      const response = await Promise.race([
        fetch('/api/vehicle/live/all'),
        new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 4000)
        ),
      ]);
      
      let vehicles: any[] = [];
      
      try {
        const data = await response.json();
        vehicles = Array.isArray(data) ? data : (data.data || []);
      } catch (e) {}
      
      this.data = vehicles;
      this.timestamp = now;
      
      // Resolve pending callbacks
      this.pendingCallbacks.forEach(cb => cb(this.data));
      this.pendingCallbacks = [];
      
      return this.data;
    } finally {
      this.isLoading = false;
    }
  },
  
  findVehicle(plate: string): any {
    if (!this.data) return null;
    const lower = plate.toLowerCase();
    return this.data.find((v: any) =>
      v.plate?.toLowerCase() === lower ||
      v.registration?.toLowerCase() === lower ||
      v.reg?.toLowerCase() === lower
    );
  }
};

// Shared fuel data cache (same pattern as vehicleDataCache)
const fuelDataCache = {
  data: null as any[] | null,
  timestamp: 0,
  cacheDuration: 60_000,
  isLoading: false,
  pendingCallbacks: [] as ((data: any[]) => void)[],

  async fetch(): Promise<any[]> {
    const now = Date.now();
    if (this.data && now - this.timestamp < this.cacheDuration) {
      return this.data;
    }
    if (this.isLoading) {
      return new Promise((resolve) => {
        this.pendingCallbacks.push(resolve);
      });
    }
    this.isLoading = true;
    try {
      const response = await fetch('/api/fuel');
      const data = await response.json();
      this.data = Array.isArray(data) ? data : [];
      this.timestamp = now;
      this.pendingCallbacks.forEach(cb => cb(this.data!));
      this.pendingCallbacks = [];
      return this.data;
    } catch {
      return this.data || [];
    } finally {
      this.isLoading = false;
    }
  },

  findByPlate(plate: string): any {
    if (!this.data) return null;
    return this.data.find((v: any) => v.plate?.toLowerCase() === plate.toLowerCase());
  }
};

// Driver Card Component with fetched driver info
function DriverCard({ trip, userRole, handleViewMap, setCurrentTripForNote, setNoteText, setNoteOpen, setAvailableDrivers, setCurrentTripForChange, setChangeDriverOpen, setCurrentTripForClose, setCloseReason, setCloseTripOpen, setCurrentTripForEdit, setEditTripOpen, setCurrentTripForApproval, setApprovalModalOpen, setVideoModalOpen, setCurrentTripForVideo, onlineDevices, isVisible = true, driversMap }: any) {
  const router = useRouter()
  const [driverInfo, setDriverInfo] = useState<any>(null)
  const [vehicleInfo, setVehicleInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [vehicleLocation, setVehicleLocation] = useState<any>(null)
  const [fuelData, setFuelData] = useState<any>(null)
  const [isFlashing, setIsFlashing] = useState(false)
  const [assignment, setAssignment] = useState<any>(null)

  // Check for unauthorized stops and trigger flash animation
  useEffect(() => {
    if (trip.unauthorized_stops_count > 0) {
      setIsFlashing(true)
      const timer = setTimeout(() => setIsFlashing(false), 3000) // Flash for 3 seconds
      return () => clearTimeout(timer)
    }
  }, [trip.unauthorized_stops_count])

  useEffect(() => {
    if (!isVisible) return;

    async function fetchAssignmentInfo() {
      const assignments = trip.vehicleassignments || trip.vehicle_assignments || []
      if (!assignments.length) {
        setLoading(false)
        return
      }

      const assignment = assignments[0]
      setAssignment(assignment)

      // Set vehicle info from assignment immediately
      if (assignment.vehicle?.name) {
        setVehicleInfo({
          id: assignment.vehicle.id,
          registration_number: assignment.vehicle.name
        })
      }

      // Build initial driver info from assignment data (no await)
      let driverToFetch = assignment.drivers?.[0]
      if (trip.status?.toLowerCase() === 'handover' && assignment.drivers?.[1]) {
        driverToFetch = assignment.drivers[1]
      }

      if (driverToFetch) {
        setDriverInfo({
          id: driverToFetch.id,
          first_name: driverToFetch.first_name || driverToFetch.name?.split(' ')[0] || '',
          surname: driverToFetch.surname || driverToFetch.name || 'Unknown',
          phone_number: driverToFetch.phone_number || '',
          available: true
        })
      }

      // Render card now, fill in details later
      setLoading(false)

      // Fire vehicle location in parallel (driver from batch map, no query needed)
      const promises: Promise<any>[] = []

      // Use pre-fetched drivers map instead of individual query
      if (driverToFetch?.id && driversMap?.has(driverToFetch.id)) {
        const driver = driversMap.get(driverToFetch.id)
        setDriverInfo(driver)
      }

      if (assignment.vehicle?.name) {
        promises.push(
          vehicleDataCache.fetch()
            .then(() => {
              const found = vehicleDataCache.findVehicle(assignment.vehicle.name)
              if (found?.latitude && found?.longitude) setVehicleLocation(found)
            })
            .catch(() => {})
        )
        // Fetch fuel data for this vehicle (shared cache)
        promises.push(
          fuelDataCache.fetch()
            .then((fuelVehicles: any[]) => {
              const match = fuelVehicles.find((v: any) => v.plate === assignment.vehicle.name)
              if (match) setFuelData(match)
            })
            .catch(() => {})
        )
      }

      await Promise.allSettled(promises)
    }

    fetchAssignmentInfo()
  }, [trip.id, JSON.stringify(trip.vehicleassignments || trip.vehicle_assignments), isVisible, driversMap])

  const driverName = driverInfo ? `${driverInfo.first_name || ''} ${driverInfo.surname || ''}`.trim() || 'Unassigned' : 'Unassigned'
  const initials = driverName !== 'Unassigned' ? driverName.split(' ').map((s: string) => s[0]).slice(0,2).join('') : 'DR'

  if (loading) {
    return (
      <div className="w-[30%] bg-white rounded-lg border border-slate-200 shadow-sm p-3 animate-pulse">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-slate-200"></div>
          <div className="flex-1">
            <div className="h-3 bg-slate-200 rounded w-3/4 mb-1"></div>
            <div className="h-2 bg-slate-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "w-[30%] rounded-xl p-3 bg-white/30 backdrop-blur-md border border-white/10 shadow-lg transition-transform duration-200 hover:scale-[1.02] hover:shadow-2xl",
      trip.unauthorized_stops_count > 0 && trip.status?.toLowerCase() !== 'delivered'
        ? isFlashing
          ? "ring-2 ring-red-400 animate-pulse"
          : "ring-1 ring-red-300"
        : "border-slate-200/30"
    )}>
      {/* Top accent */}
      <div className="h-1 w-full rounded-full bg-gradient-to-r from-blue-400 via-blue-400  to-indigo-500 mb-3 opacity-90" />

      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold text-white"
          style={{
            background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
            boxShadow: "0 6px 18px rgba(59,130,246,0.18)"
          }}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-slate-900 truncate">{typeof driverInfo?.surname === 'string' ? driverInfo.surname : String(driverInfo?.surname || 'Unassigned')}</div>
          <div className="text-xs text-slate-600">{driverInfo ? driverInfo.phone_number : 'No driver assigned'}</div>
        </div>
        <div className="flex-shrink-0">
          <span className={cn(
            "px-1.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide",
            driverInfo?.available ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
          )}>
            {driverInfo?.available ? 'Available' : 'Unavailable'}
          </span>
        </div>
      </div>

      {/* Rate + Fuel */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="p-2 rounded-lg bg-white/20 border border-white/5">
          <div className="flex items-center gap-1 mb-1">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            <span className="text-xs font-medium text-slate-700 uppercase">Rate</span>
          </div>
          <div className="text-xs font-medium text-green-600">
            {(() => {
              const displayRate = trip.selling_rate_per_km
              return displayRate ? `R${parseFloat(displayRate).toLocaleString()}` : '—'
            })()}
          </div>
        </div>
        <div className="p-2 rounded-lg bg-white/20 border border-white/5">
          <div className="flex items-center gap-1 mb-1">
            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
            <span className="text-xs font-medium text-slate-700 uppercase">Fuel</span>
          </div>
          {fuelData && fuelData.fuelLevel > 0 ? (
            <div className="flex items-center gap-2">
              {(() => {
                const MAX_TANK = 1000;
                const litres = Math.max(0, fuelData.fuelLevel || 0);
                const fillPct = Math.min(100, (litres / MAX_TANK) * 100);
                const fuelColor = fillPct <= 10 ? '#ef4444' : fillPct <= 25 ? '#f97316' : fillPct <= 50 ? '#eab308' : '#10b981';
                const sw = 4;
                const r = 16;
                const nr = r - sw / 2;
                const circ = nr * 2 * Math.PI;
                const dashoff = circ - (fillPct / 100) * circ;
                return (
                  <>
                    <div className="relative shrink-0">
                      <svg viewBox="0 0 36 36" className="h-[32px] w-[32px] -rotate-90">
                        <circle cx="18" cy="18" r={nr} fill="none" stroke="#e2e8f0" strokeWidth={sw} />
                        <circle
                          cx="18" cy="18" r={nr} fill="none" stroke={fuelColor}
                          strokeDasharray={`${circ} ${circ}`} strokeDashoffset={dashoff}
                          strokeLinecap="round" strokeWidth={sw}
                          className="transition-[stroke-dashoffset] duration-700 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[9px] font-black leading-none text-[#1748d8]">{Math.round(litres)}</span>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-medium text-slate-700">{Math.round(litres)}L</div>
                      <div className="text-[9px] text-slate-500">Used: {fuelData.totalFuelUsed ? `${(fuelData.totalFuelUsed / 1000).toFixed(1)}k` : '—'}L</div>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="text-xs text-slate-400">No data</div>
          )}
        </div>
      </div>

      {/* Unauthorized Stop Alert */}
      {trip.unauthorized_stops_count > 0 && trip.status?.toLowerCase() !== 'delivered' && (
        <div className="mb-3 p-3 rounded-lg bg-red-50/70 border border-red-200/40 backdrop-blur-sm">
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-red-800 uppercase">Unauthorized Stop Alert</div>
              <div className="text-sm font-medium text-red-900">
                {trip.unauthorized_stops_count} unauthorized stop{trip.unauthorized_stops_count > 1 ? 's' : ''} detected
              </div>
              {trip.route_points && trip.route_points.length > 0 && (
                <div className="text-xs text-red-700 mt-1">
                  Last: {(() => {
                    const last = trip.route_points[trip.route_points.length - 1]
                    return last ? `${last.lat?.toFixed(4)}, ${last.lng?.toFixed(4)}` : 'Unknown'
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mb-2 p-2 rounded-lg bg-white/20 border border-white/5">
        <div className="flex items-center gap-1 mb-1">
          <div className="w-1.5 h-1.5 bg-slate-500 rounded-full" />
          <span className="text-xs font-medium text-slate-700 uppercase">Note</span>
        </div>
        <div className="text-xs text-slate-900">{trip.status_notes || 'No notes added'}</div>
      </div>

      <div className="mb-2 p-2 rounded-lg bg-white/20 border border-white/5">
        <div className="flex items-center gap-1 mb-1">
          <div className="w-1.5 h-1.5 bg-slate-500 rounded-full" />
          <span className="text-xs font-medium text-slate-700 uppercase">Vehicle</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-medium text-slate-900 truncate">
              {vehicleLocation?.plate || vehicleInfo?.registration_number || assignment?.vehicle?.name || 'Not assigned'}
            </span>
            {(() => {
              const reg = (vehicleInfo?.registration_number || assignment?.vehicle?.name || '').toUpperCase().trim();
              const deviceInfo = onlineDevices?.get?.(reg);
              if (!deviceInfo) return null;
              return deviceInfo.online ? (
                <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium shrink-0">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  Online
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-red-500 font-medium shrink-0">
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                  Offline
                </span>
              );
            })()}
          </div>
          <span className="text-xs text-slate-500">{vehicleLocation ? `${vehicleLocation.speed} km/h` : ''}</span>
        </div>
        {vehicleLocation && (
          <>
            {vehicleLocation.address && (
              <div className="mt-1 text-xs text-slate-600 truncate">
                {vehicleLocation.address}
              </div>
            )}
            {vehicleLocation.geozone && (
              <div className="mt-0.5 text-xs text-blue-600 truncate">
                Geozone: {vehicleLocation.geozone}
              </div>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <SecureButton
          page="dashboard"
          action="edit"
          size="sm"
          variant="link"
          className="h-8 text-xs border"
          onClick={async () => {
            // Use existing vehicle location or pass plate info for map to handle
            let matchedVehicleLocation = vehicleLocation;
            if (!matchedVehicleLocation && vehicleInfo?.registration_number) {
              // Create a placeholder with plate info for the map to handle
              matchedVehicleLocation = {
                plate: vehicleInfo.registration_number,
                needsLookup: true
              };
            }
            
            const tripData = {
              ...trip,
              vehicleInfo,
              driverInfo,
              vehicleLocation: matchedVehicleLocation
            };
            setCurrentTripForEdit(tripData);
            setEditTripOpen(true);
          }}
        >
          <FileText className="w-3 h-3" /> Edit
        </SecureButton>

        <SecureButton
          page="dashboard"
          action="view"
          size="sm"
          variant="link"
          className="h-8 text-xs border"
          onClick={async () => {
            const supabase = createClient();
            let routeCoords = null;
            let stopPoints = [];
            let vehicleLocationData = vehicleLocation;

            if (!vehicleLocationData && vehicleInfo?.registration_number) {
              try {
                await vehicleDataCache.fetch();
                const found = vehicleDataCache.findVehicle(vehicleInfo.registration_number);
                
                if (found && found.latitude && found.longitude) {
                  vehicleLocationData = {
                    latitude: parseFloat(found.latitude),
                    longitude: parseFloat(found.longitude),
                    plate: found.plate || found.registration || vehicleInfo.registration_number,
                    speed: found.speed || 0,
                    address: found.address || 'GPS location available',
                    loc_time: found.loc_time || found.gps_time || new Date().toISOString(),
                    mileage: found.mileage || found.odometer || 0,
                    geozone: found.geozone || found.zone || null,
                    company: found.company || 'EPS'
                  };
                  console.log('Track button: Found vehicle GPS from cache:', vehicleLocationData);
                }
              } catch (error) {
                console.log('Track button: Vehicle cache lookup failed:', error.message);
              }
            }

            // Always generate preplanned route
            const pickupLocs = trip.pickup_locations || trip.pickuplocations || [];
            const dropoffLocs = trip.dropoff_locations || trip.dropofflocations || [];
            
            const pickup = pickupLocs[0]?.address || trip.origin;
            const dropoff = dropoffLocs[0]?.address || trip.destination;
            
            if (pickup && dropoff) {
              try {
                const geocodeAddress = async (address) => {
                  const gm = window.google?.maps;
                  if (!gm) return null;
                  const geocoder = new gm.Geocoder();
                  return new Promise((resolve) => {
                    geocoder.geocode({ address, region: 'za' }, (results, status) => {
                      if (status === 'OK' && results?.[0]?.geometry?.location) {
                        const loc = results[0].geometry.location;
                        resolve([loc.lng(), loc.lat()]);
                      } else {
                        resolve(null);
                      }
                    });
                  });
                };
                
                const pickupCoords = await geocodeAddress(pickup);
                const dropoffCoords = await geocodeAddress(dropoff);
                
                if (!pickupCoords || !dropoffCoords) {
                  console.warn('Geocoding failed — showing vehicle location without route');
                }
                
                let waypoints = [];
                if (pickupCoords && dropoffCoords) {
                  waypoints = [{ location: { lat: pickupCoords[1], lng: pickupCoords[0] }, stopover: true }];
                  
                  const selectedStopPoints = trip.selected_stop_points || trip.selectedstoppoints || [];
                  if (selectedStopPoints.length > 0) {
                    const stopPointIds = selectedStopPoints.map(stop => typeof stop === 'object' ? stop.id : stop);
                    const { data: stopPointsData } = await supabase
                      .from('stop_points')
                      .select('coordinates')
                      .in('id', stopPointIds);
                    
                    (stopPointsData || []).forEach(point => {
                      if (point.coordinates) {
                        const coords = point.coordinates.split(' ')[0].split(',');
                        waypoints.push({ location: { lat: parseFloat(coords[1]), lng: parseFloat(coords[0]) }, stopover: true });
                      }
                    });
                  }
                  
                  waypoints.push({ location: { lat: dropoffCoords[1], lng: dropoffCoords[0] }, stopover: true });
                }
                
                if (waypoints.length >= 2) {
                  // Use Google Directions Service
                  const gm = window.google?.maps;
                  if (gm) {
                    const directionsService = new gm.DirectionsService();
                    const result = await new Promise((resolve) => {
                      directionsService.route(
                        {
                          origin: waypoints[0].location,
                          destination: waypoints[waypoints.length - 1].location,
                          waypoints: waypoints.slice(1, -1),
                          travelMode: gm.TravelMode.DRIVING,
                        },
                        (res, status) => {
                          if (status === 'OK' && res.routes?.[0]) {
                            const path = res.routes[0].overview_path.map(p => [p.lng(), p.lat()]);
                            resolve(path);
                          } else {
                            resolve(null);
                          }
                        }
                      );
                    });
                    if (result) {
                      routeCoords = result;
                      console.log('Generated preplanned route with', routeCoords.length, 'points');
                    }
                  }
                }
              } catch (error) {
                console.error('Error generating preplanned route:', error);
              }
            }
            
            // Fallback to stored route if generation fails
            if (!routeCoords && trip.route) {
              const { data: route } = await supabase
                .from('routes')
                .select('route_geometry, route_data')
                .eq('id', trip.route)
                .single();

              if (route) {
                if (route?.route_geometry?.coordinates) {
                  routeCoords = route.route_geometry.coordinates;
                } else if (route?.route_data?.geometry?.coordinates) {
                  routeCoords = route.route_data.geometry.coordinates;
                }
              }
            }
            
            // Generate best route if no route available
            if (!routeCoords && (pickup || dropoff || trip.origin || trip.destination)) {
              try {
                const origin = pickup || trip.origin;
                const destination = dropoff || trip.destination;
                
                if (origin && destination) {
                  const gm = window.google?.maps;
                  if (!gm) throw new Error('Google Maps not loaded');
                  
                  const geocodeAddress = async (address) => {
                    const geocoder = new gm.Geocoder();
                    return new Promise((resolve) => {
                      geocoder.geocode({ address, region: 'za' }, (results, status) => {
                        if (status === 'OK' && results?.[0]?.geometry?.location) {
                          const loc = results[0].geometry.location;
                          resolve({ lat: loc.lat(), lng: loc.lng() });
                        } else {
                          resolve(null);
                        }
                      });
                    });
                  };
                  
                  const originCoords = await geocodeAddress(origin);
                  const destCoords = await geocodeAddress(destination);
                  
                  if (originCoords && destCoords) {
                    const directionsService = new gm.DirectionsService();
                    const result = await new Promise((resolve) => {
                      directionsService.route(
                        { origin: originCoords, destination: destCoords, travelMode: gm.TravelMode.DRIVING, provideRouteAlternatives: true },
                        (res, status) => {
                          if (status === 'OK' && res.routes?.[0]) {
                            const path = res.routes[0].overview_path.map(p => [p.lng(), p.lat()]);
                            resolve(path);
                          } else {
                            resolve(null);
                          }
                        }
                      );
                    });
                    if (result) {
                      routeCoords = result;
                      console.log('Generated fallback route:', routeCoords.length, 'points');
                    }
                  }
                }
              } catch (error) {
                console.error('Error generating fallback route:', error);
              }
            }

            const selectedStopPoints = trip.selected_stop_points || trip.selectedstoppoints || [];
            if (selectedStopPoints.length > 0) {
              const stopPointIds = selectedStopPoints.map((stop: any) => typeof stop === 'object' ? stop.id : stop);
              const { data: stopPointsData } = await supabase
                .from('stop_points')
                .select('id, name, coordinates')
                .in('id', stopPointIds);

              stopPoints = (stopPointsData || []).map(point => {
                if (point.coordinates) {
                  const coordPairs = point.coordinates.split(' ')
                    .filter(coord => coord.trim())
                    .map(coord => {
                      const [lng, lat] = coord.split(',');
                      return [parseFloat(lng), parseFloat(lat)];
                    })
                    .filter(pair => !isNaN(pair[0]) && !isNaN(pair[1]));

                  if (coordPairs.length > 0) {
                    const avgLng = coordPairs.reduce((sum, coord) => sum + coord[0], 0) / coordPairs.length;
                    const avgLat = coordPairs.reduce((sum, coord) => sum + coord[1], 0) / coordPairs.length;
                    return {
                      name: point.name,
                      coordinates: [avgLng, avgLat],
                      polygon: coordPairs
                    };
                  }
                }
                return null;
              }).filter(Boolean);
            }

            // Fetch high risk zones
            let highRiskZones = [];
            try {
              const { data: riskZones } = await supabase
                .from('high_risk')
                .select('id, name, coordinates');
              
              highRiskZones = (riskZones || []).map(zone => {
                if (zone.coordinates) {
                  const coordPairs = zone.coordinates.split(' ')
                    .filter(coord => coord.trim())
                    .map(coord => {
                      const [lng, lat, z] = coord.split(',');
                      return [parseFloat(lng), parseFloat(lat)];
                    })
                    .filter(pair => !isNaN(pair[0]) && !isNaN(pair[1]));

                  if (coordPairs.length > 2) {
                    return {
                      name: zone.name,
                      polygon: coordPairs
                    };
                  }
                }
                return null;
              }).filter(Boolean);
            } catch (error) {
              console.error('Error fetching high risk zones:', error);
            }

            console.log('Final vehicle location data for map:', vehicleLocationData);
            console.log('Route coordinates for map:', routeCoords ? routeCoords.length : 'none');
            console.log('Stop points for map:', stopPoints.length);
            
            handleViewMap(driverName, { 
              ...trip, 
              vehicleLocation: vehicleLocationData, 
              routeCoords, 
              stopPoints, 
              highRiskZones 
            });
          }}
        >
          <MapPin className="w-3 h-3" /> Track
        </SecureButton>

        <SecureButton
          page="dashboard"
          action="view"
          size="sm"
          variant="link"
          className="h-8 text-xs border"
          onClick={() => {
            setCurrentTripForNote(trip);
            setNoteText(trip.status_notes || '');
            setNoteOpen(true);
          }}
        >
          <FileText className="w-3 h-3" /> Note
        </SecureButton>

        <SecureButton
          page="dashboard"
          action="edit"
          size="sm"
          variant="link"
          className="h-8 text-xs border"
          onClick={() => {
            setAvailableDrivers(Array.from(driversMap?.values() || []));
            setCurrentTripForChange(trip);
            setChangeDriverOpen(true);
          }}
        >
          <User className="w-3 h-3" /> Change
        </SecureButton>

        <SecureButton
          page="dashboard"
          action="view"
          size="sm"
          variant="link"
          className="h-8 text-xs border"
          onClick={() => {
            setCurrentTripForEdit({ ...trip, showHistoryOnly: true });
            setEditTripOpen(true);
          }}
        >
          <Clock className="w-3 h-3" /> History
        </SecureButton>

        <SecureButton
          page="dashboard"
          action="edit"
          size="sm"
          variant="destructive"
          className="h-8 text-xs border"
          onClick={() => {
            setCurrentTripForClose(trip);
            setCloseReason('');
            setCloseTripOpen(true);
          }}
        >
          <X className="w-3 h-3" /> Close
        </SecureButton>

      </div>

      {/* Full-width Video Button */}
      {(() => {
        const reg = (vehicleInfo?.registration_number || assignment?.vehicle?.name || '').toUpperCase().trim();
        const deviceInfo = onlineDevices?.get?.(reg);
        const isOnline = deviceInfo?.online === true;
        const hasDevice = !!deviceInfo?.deviceId;

        return (
          <Button
            size="sm"
            variant="default"
            disabled={!hasDevice || !isOnline}
            className={`h-10 text-sm font-semibold w-full mt-2 border-0 ${
              isOnline
                ? "bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                : "bg-slate-200 text-slate-500 cursor-not-allowed"
            }`}
            onClick={() => {
              if (!isOnline || !hasDevice) return;
              setCurrentTripForVideo({
                deviceId: deviceInfo.deviceId,
                registration: vehicleInfo?.registration_number || assignment?.vehicle?.name || '',
                vehicleName: `${vehicleInfo?.registration_number || assignment?.vehicle?.name || 'Vehicle'}`,
              });
              setVideoModalOpen(true);
            }}
          >
            <Video className="w-4 h-4 mr-2" />
            {isOnline ? "View Cameras" : "Offline"}
          </Button>
        );
      })()}

    </div>
  )
}

const getExpectedDuration = (statusValue: string, trip?: any): number => {
  const s = statusValue?.toLowerCase().replace(/_/g, '-') || ''
  const DURATIONS: Record<string, number> = {
    pending: 1800,
    accepted: 3600,
    departing: 3600,
    'arrived-at-loading': 1800,
    'queuing-at-loading': 3600,
    'staging-at-loading': 3600,
    loading: 7200,
    'on-trip': 0,
    'truck-stop': 18000,
    refueling: 3600,
    'arrived-at-offloading': 1800,
    'queuing-at-offloading': 3600,
    offloading: 7200,
    weighing: 1800,
    depot: 3600,
    handover: 3600,
    delivered: Infinity,
  }
  if (s === 'on-trip' && trip) {
    const distKm = trip.estimated_distance || trip.distance_km || 0
    if (distKm > 0) return Math.ceil((distKm / 60) * 3600)
    return 14400
  }
  return DURATIONS[s] ?? 0
}

const getElapsedColor = (elapsed: number, expected: number) => {
  if (expected <= 0 || expected === Infinity) return 'green'
  if (elapsed > expected) return 'red'
  if (elapsed > expected / 2) return 'orange'
  return 'green'
}

// Enhanced routing components with proper waypoints
function RoutingSection({ userRole, handleViewMap, setCurrentTripForNote, setNoteText, setNoteOpen, setAvailableDrivers, setCurrentTripForChange, setChangeDriverOpen, refreshTrigger, setRefreshTrigger, setPickupTimeOpen, setDropoffTimeOpen, setCurrentTripForTime, setTimeType, setSelectedTime, currentUnauthorizedTrip, setCurrentUnauthorizedTrip, setUnauthorizedStopModalOpen, loadingPhotos, setLoadingPhotos, setCurrentTripPhotos, setPhotosModalOpen, setCurrentTripAlerts, setAlertsModalOpen, setCurrentTripForClose, setCloseReason, setCloseTripOpen, setCurrentTripForEdit, setEditTripOpen, setCurrentTripForApproval, setApprovalModalOpen, setVideoModalOpen, setCurrentTripForVideo, onlineDevices, isVisible = true }: any) {
  const [trips, setTrips] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tripSearch, setTripSearch] = useState('')
  const [operatorFilter, setOperatorFilter] = useState('all')
  const [vehicleOperators, setVehicleOperators] = useState<Map<string, string>>(new Map())
  const [driversMap, setDriversMap] = useState<Map<string, any>>(new Map())

  useEffect(() => {
    async function fetchTrips() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.from('trips').select('*')
        if (error) throw error
        setTrips(data || [])

        // Batch-fetch all drivers in one query
        try {
          const { data: allDrivers } = await supabase.from('drivers').select('*')
          if (allDrivers) {
            const map = new Map<string, any>()
            for (const d of allDrivers) {
              if (d.id) map.set(d.id, d)
            }
            setDriversMap(map)
          }
        } catch (e) {
          console.error('Error batch-fetching drivers:', e)
        }
        
        // Check for most recent unauthorized stop
        const recentUnauthorized = (data || [])
          .filter(trip => trip.unauthorized_stops_count > 0)
          .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())[0]
        
        if (recentUnauthorized && !currentUnauthorizedTrip) {
          setCurrentUnauthorizedTrip(recentUnauthorized)
          // Removed automatic modal opening
        }
      } catch (err) {
        console.error('Error fetching trips:', err)
        setTrips([])
      } finally {
        setLoading(false)
      }
    }

    async function fetchVehicleOperators() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('vehiclesc')
          .select('registration_number, slmn_name')
          .not('registration_number', 'is', null)
        if (error) throw error
        const map = new Map<string, string>()
        for (const v of data || []) {
          if (v.registration_number && v.slmn_name) {
            map.set(v.registration_number.toUpperCase(), v.slmn_name)
          }
        }
        setVehicleOperators(map)
      } catch (err) {
        console.error('Error fetching vehicle operators:', err)
      }
    }
    
    fetchTrips()
    fetchVehicleOperators()
    
    // Real-time subscription
    const supabase = createClient()
    const channel = supabase
      .channel('trips-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'trips' },
        () => fetchTrips()
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [refreshTrigger])

  // Sort trips to put unauthorized stops at the top
  const tripsList = trips
    .filter(trip => trip.status?.toLowerCase() !== 'delivered' && trip.status?.toLowerCase() !== 'completed')
    .filter(trip => {
      if (operatorFilter === 'all') return true
      const assignments = trip.vehicleassignments || trip.vehicle_assignments || []
      const firstAssignment = Array.isArray(assignments) ? assignments[0] : assignments
      const vehiclePlate = (firstAssignment?.vehicle?.name || '').toUpperCase()
      const operator = vehicleOperators.get(vehiclePlate) || ''
      return operator === operatorFilter
    })
    .filter(trip => {
      if (!tripSearch.trim()) return true
      const q = tripSearch.toLowerCase()
      const assignments = trip.vehicleassignments || trip.vehicle_assignments || []
      const firstAssignment = Array.isArray(assignments) ? assignments[0] : assignments
      const driverArr = firstAssignment?.drivers
      const driver = Array.isArray(driverArr) ? driverArr[0] : driverArr
      const driverName = driver ? `${driver.first_name || ''} ${driver.surname || ''}`.trim() : ''
      const vehiclePlate = firstAssignment?.vehicle?.name || firstAssignment?.vehicle?.registration_number || ''
      const pickupAddr = trip.pickup_locations?.[0]?.address || trip.pickuplocations?.[0]?.address || ''
      const dropoffAddr = trip.dropoff_locations?.[0]?.address || trip.dropofflocations?.[0]?.address || ''
      const clientDetails = typeof trip.clientdetails === 'string' ? JSON.parse(trip.clientdetails) : trip.clientdetails
      const clientName = clientDetails?.name || trip.selectedclient || trip.selected_client || ''
      const searchable = [
        trip.trip_id, trip.id, trip.ordernumber, trip.route,
        trip.origin, trip.destination, trip.cargo, trip.cargo_weight,
        trip.vehicle_type, trip.status,
        driverName, vehiclePlate, pickupAddr, dropoffAddr, clientName
      ].filter(Boolean).join(' ').toLowerCase()
      return searchable.includes(q)
    })
    .sort((a, b) => {
      // First sort by unauthorized stops (descending)
      const aUnauthorized = a.unauthorized_stops_count || 0
      const bUnauthorized = b.unauthorized_stops_count || 0
      if (aUnauthorized !== bUnauthorized) {
        return bUnauthorized - aUnauthorized
      }
      // Then by creation date (newest first)
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    })

  const STATUS_OPTIONS = [
    { label: "Pending", value: "pending" },
    { label: "Accept", value: "accepted" },
    { label: "Departing", value: "departing" },
    { label: "Reject", value: "rejected" },
    { label: "Arrived at Loading", value: "arrived-at-loading" },
    { label: "Queuing at Loading", value: "queuing-at-loading" },
    { label: "Staging at Loading", value: "staging-at-loading" },
    { label: "Loading", value: "loading" },
    { label: "On Trip", value: "on-trip" },
    { label: "Arrived at Offloading", value: "arrived-at-offloading" },
    { label: "Completed", value: "completed" },
    { label: "Cancelled", value: "cancelled" },
    { label: "Stopped", value: "stopped" },
    { label: "Offloading", value: "offloading" },
    { label: "Weighing In/Out", value: "weighing" },
    { label: "Delivered", value: "delivered" },
  ]


  // Haversine distance between two lat/lng points (km)
  const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Extract coordinates from status_history
  const getCoordsFromHistory = (trip: any) => {
    const history = trip.status_history || []
    const coordsMap: Record<string, { lat: number; lng: number }> = {}
    for (const entry of history) {
      try {
        const parsed = typeof entry === 'string' ? JSON.parse(entry) : entry
        if (parsed.status && parsed.coordinates?.latitude && parsed.coordinates?.longitude) {
          coordsMap[parsed.status.toLowerCase()] = {
            lat: parsed.coordinates.latitude,
            lng: parsed.coordinates.longitude,
          }
        }
      } catch {}
    }
    return coordsMap
  }

  const getWaypointsWithStops = (trip: any) => {
    let effectiveStatus = trip.status?.toLowerCase()
    const stopsData = trip.stops_data || []

    // For "stopped", find the last status that was actually recorded in stops_data
    let isStopped = effectiveStatus === 'stopped'
    if (isStopped && stopsData.length > 0) {
      const lastRecorded = stopsData[stopsData.length - 1]
      effectiveStatus = lastRecorded.status?.toLowerCase() || effectiveStatus
    }

    // Use trip's progress_stops as the single source, always prepend Pending
    let tripStops = trip.progress_stops || []
    if (!tripStops.some((s: any) => s.value === 'pending')) {
      tripStops = [{ order: 0, label: 'Pending', value: 'pending', isComplete: false }, ...tripStops]
    }

    // Build timestamp map from stops_data and recorded order
    const timestampMap: Record<string, string> = {}
    const recordedOrder: string[] = []
    for (const entry of stopsData) {
      const s = entry.status?.toLowerCase()
      if (s && !recordedOrder.includes(s)) recordedOrder.push(s)
      if (s && entry.timestamp) timestampMap[s] = entry.timestamp
    }

    // Calculate elapsed from timestamps: time to get from previous stop to this one
    const elapsedFromTimestamps: Record<string, number> = {}
    for (let i = 0; i < recordedOrder.length; i++) {
      const currentStatus = recordedOrder[i]
      const currentTs = timestampMap[currentStatus]
      if (!currentTs) continue
      if (i > 0) {
        // Elapsed = this stop's timestamp - previous stop's timestamp
        const prevTs = timestampMap[recordedOrder[i - 1]]
        if (prevTs) {
          elapsedFromTimestamps[currentStatus] = Math.floor(
            (new Date(currentTs).getTime() - new Date(prevTs).getTime()) / 1000
          )
        }
      } else {
        // First stop: elapsed = 0 (start point)
        elapsedFromTimestamps[currentStatus] = 0
      }
    }

    // Extract coordinates from status_history
    const coordsMap = getCoordsFromHistory(trip)

    // Calculate elapsed time for current status (since last change)
    const currentElapsed = effectiveStatus && timestampMap[effectiveStatus]
      ? Math.floor((Date.now() - new Date(timestampMap[effectiveStatus]).getTime()) / 1000)
      : 0

    // Order is fixed from progress_stops — never sort
    const orderedStatuses = [...tripStops]

    // Build base waypoints in the dynamic order
    const baseWaypoints = orderedStatuses.map((status: any, index: number) => ({
      position: (index / (orderedStatuses.length - 1)) * 100,
      label: status.label,
      value: status.value,
      completed: status.isComplete === true || (recordedOrder.includes(status.value) && status.value !== effectiveStatus),
      current: status.value === effectiveStatus,
      isStop: false,
      elapsedSeconds: recordedOrder.includes(status.value) ? (elapsedFromTimestamps[status.value] ?? null) : null,
      isCurrent: status.value === effectiveStatus,
      currentElapsed: status.value === effectiveStatus ? currentElapsed : null,
      coords: coordsMap[status.value] || null,
      recordedTimestamp: timestampMap[status.value] || null,
    }))

    // Insert stops between Loading (index 4) and On Trip (index 5)
    const stops = trip.selected_stop_points || trip.selectedstoppoints || []
    if (stops.length > 0) {
      const loadingIdx = orderedStatuses.findIndex(s => s.value === 'loading')
      const onTripIdx = orderedStatuses.findIndex(s => s.value === 'on-trip')
      const loadingPos = loadingIdx >= 0 ? baseWaypoints[loadingIdx]?.position ?? 36 : 36
      const onTripPos = onTripIdx >= 0 ? baseWaypoints[onTripIdx]?.position ?? 45 : 45
      const stopSpacing = (onTripPos - loadingPos) / (stops.length + 1)
      
      const stopWaypoints = stops.map((stop: any, index: number) => ({
        position: loadingPos + (stopSpacing * (index + 1)),
        label: `Stop ${index + 1}`,
        value: `stop-${index + 1}`,
        completed: recordedOrder.includes('loading') && !recordedOrder.includes('on-trip'),
        current: false,
        isStop: true,
        stopId: stop,
        recordedTimestamp: null,
      }))

      // Rebuild base waypoints with adjusted positions for stops after loading
      const loadingWaypoints = baseWaypoints.filter((_, i) => i <= (loadingIdx >= 0 ? loadingIdx : 4))
      const afterLoadingWaypoints = baseWaypoints.filter((_, i) => i > (loadingIdx >= 0 ? loadingIdx : 4))
      const lastLoadingPos = loadingWaypoints[loadingWaypoints.length - 1]?.position ?? loadingPos
      afterLoadingWaypoints.forEach((wp, i) => {
        wp.position = onTripPos + ((i + 1) / (afterLoadingWaypoints.length + stops.length)) * (100 - onTripPos)
      })
      stopWaypoints.forEach((swp, i) => {
        swp.position = lastLoadingPos + ((i + 1) / (afterLoadingWaypoints.length + stops.length + 1)) * (100 - lastLoadingPos)
      })
      
      const allWaypoints = [...loadingWaypoints, ...stopWaypoints, ...afterLoadingWaypoints]
      // Add distances to all waypoints
      const allWithDistances = allWaypoints.map((wp, i) => {
        if (i === 0) return { ...wp, distanceKm: null }
        const prev = allWaypoints[i - 1]
        if (prev.coords && wp.coords) {
          const km = haversineKm(prev.coords.lat, prev.coords.lng, wp.coords.lat, wp.coords.lng)
          return { ...wp, distanceKm: km >= 0.1 ? Math.round(km) : null }
        }
        return { ...wp, distanceKm: null }
      })
      return { waypoints: allWithDistances, isStopped }
    }
    
    // Calculate distances between consecutive waypoints that have coordinates
    const withDistances = baseWaypoints.map((wp, i) => {
      if (i === 0) return { ...wp, distanceKm: null }
      const prev = baseWaypoints[i - 1]
      if (prev.coords && wp.coords) {
        const km = haversineKm(prev.coords.lat, prev.coords.lng, wp.coords.lat, wp.coords.lng)
        return { ...wp, distanceKm: km >= 0.1 ? Math.round(km) : null }
      }
      return { ...wp, distanceKm: null }
    })

    return { waypoints: withDistances, isStopped }
  }



  const getTripProgress = (status: string, stopsData?: any[], progressStops?: any[]) => {
    let effectiveStatus = status?.toLowerCase()
    // For "stopped", use the last recorded status from stops_data
    if (effectiveStatus === 'stopped' && stopsData && stopsData.length > 0) {
      effectiveStatus = stopsData[stopsData.length - 1]?.status?.toLowerCase() || effectiveStatus
    }
    // Count unique recorded statuses in order
    const recordedOrder: string[] = []
    for (const entry of (stopsData || [])) {
      const s = entry.status?.toLowerCase()
      if (s && !recordedOrder.includes(s)) recordedOrder.push(s)
    }
    // Use progress_stops as the single source
    const totalStops = (progressStops && progressStops.length > 0)
      ? progressStops.length
      : 0
    if (totalStops === 0) return 0
    // Count completed: isComplete from progress_stops OR recorded in stops_data
    const isCompleteCount = (progressStops || []).filter((s: any) => s.isComplete === true).length
    const completedCount = Math.max(recordedOrder.length, isCompleteCount)
    return (completedCount / totalStops) * 100
  }

  const formatElapsed = (seconds: number | null | undefined) => {
    if (seconds === null || seconds === undefined) return null
    if (seconds <= 0) return '0m'
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) {
      const m = Math.floor(seconds / 60)
      const s = seconds % 60
      return s > 0 ? `${m}m ${s}s` : `${m}m`
    }
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }

  const getAcceptanceWarning = (trip: any) => {
    const status = trip.status?.toLowerCase()
    if (status !== 'pending' && status !== 'accepted') return null
    const stopsData = trip.stops_data || []
    const acceptedEntry = stopsData.find((s: any) => s.status === 'accepted')
    let elapsedSeconds: number
    if (acceptedEntry) {
      elapsedSeconds = acceptedEntry.elapsed_seconds || 0
    } else {
      const createdAt = trip.created_at ? new Date(trip.created_at).getTime() : Date.now()
      elapsedSeconds = (Date.now() - createdAt) / 1000
    }
    const duration = formatElapsed(elapsedSeconds)
    if (!duration) return null
    const expected = getExpectedDuration(status, trip)
    const color = getElapsedColor(elapsedSeconds, expected)
    if (color === 'red') return { level: 'red', bg: 'bg-red-50 border-red-200', text: 'text-red-700', icon: 'text-red-500', label: 'Overdue', message: `Not accepted for ${duration}` }
    if (color === 'orange') return { level: 'orange', bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700', icon: 'text-orange-500', label: 'Delayed', message: `Awaiting acceptance for ${duration}` }
    return null
  }

  if (loading) {
    return <div className="text-center py-8">Loading trips...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by trip ID, order, driver, vehicle, destination, client..."
            value={tripSearch}
            onChange={(e) => setTripSearch(e.target.value)}
            className="pl-10 h-10"
          />
          {tripSearch && (
            <button
              onClick={() => setTripSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <select
          value={operatorFilter}
          onChange={(e) => setOperatorFilter(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-colors text-gray-700 h-10"
        >
          <option value="all">All Operators</option>
          {Array.from(new Set(Array.from(vehicleOperators.values()))).sort().map(op => (
            <option key={op} value={op}>{op}</option>
          ))}
        </select>
      </div>
      {tripSearch && (
        <div className="text-sm text-muted-foreground">
          {tripsList.length} trip{tripsList.length !== 1 ? 's' : ''} found
        </div>
      )}
      {tripsList.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {tripSearch ? 'No trips match your search' : 'No trips available in database'}
        </div>
      ) : (
      <div className="space-y-6">
      {tripsList.map((trip: any) => {
        const { waypoints, isStopped } = getWaypointsWithStops(trip)
        const progress = getTripProgress(trip.status, trip.stops_data, trip.progress_stops)

        const clientDetails = typeof trip.clientdetails === 'string' ? JSON.parse(trip.clientdetails) : trip.clientdetails
        const title = clientDetails?.name || trip.selectedClient || trip.clientDetails?.name || `Trip ${trip.trip_id || trip.id}`
        const hasUnauthorizedStops = trip.unauthorized_stops_count > 0

        return (
          <div key={trip.id || trip.trip_id} className="flex gap-4 border-b-gray-500 border-b-2 pb-10">
            {/* Driver Card - 30% */}
            <DriverCard 
              trip={trip} 
              userRole={userRole}
              isVisible={isVisible}
              handleViewMap={handleViewMap}
              setCurrentTripForNote={setCurrentTripForNote}
              setNoteText={setNoteText}
              setNoteOpen={setNoteOpen}
              setAvailableDrivers={setAvailableDrivers}
              setCurrentTripForChange={setCurrentTripForChange}
              setChangeDriverOpen={setChangeDriverOpen}
              setCurrentTripForClose={setCurrentTripForClose}
              setCloseReason={setCloseReason}
              setCloseTripOpen={setCloseTripOpen}
              setCurrentTripForEdit={setCurrentTripForEdit}
              setEditTripOpen={setEditTripOpen}
              setCurrentTripForApproval={setCurrentTripForApproval}
              setApprovalModalOpen={setApprovalModalOpen}
              driversMap={driversMap}
              setVideoModalOpen={setVideoModalOpen}
              setCurrentTripForVideo={setCurrentTripForVideo}
              onlineDevices={onlineDevices}
            />
            {/* Trip Card - 70% */}
            <div className={cn(
              "w-[70%] rounded-xl p-3 bg-white shadow-sm border border-slate-200 transition-transform duration-200 hover:scale-[1.01] text-black",
              trip.unauthorized_stops_count > 0 && trip.status?.toLowerCase() !== 'delivered'
              ? "ring-2 ring-red-400"
              : "ring-0"
            )} style={{ backgroundImage: "linear-gradient(180deg, rgba(255,255,255,1), rgba(249,250,251,1))" }}>
              {/* Top accent */}
              <div className="h-1 w-full rounded-full bg-gradient-to-r from-blue-500 via-blue-400 to-blue-400 mb-3 opacity-100" />

              {/* Elevation Alert Banner */}
              {trip.elevate && (
                <div className="flex items-center justify-between p-2 mb-3 text-xs bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 text-orange-600 flex-shrink-0" />
                    <span className="font-semibold text-orange-700 uppercase tracking-wide">Pending Approval</span>
                    <span className="text-orange-600">•</span>
                    <span className="text-orange-600">Requires management approval</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-xs border-orange-300 text-orange-700 hover:bg-orange-100"
                    onClick={() => {
                      setCurrentTripForApproval(trip);
                      setApprovalModalOpen(true);
                    }}
                  >
                    Review
                  </Button>
                </div>
              )}

              {/* Alert Banner */}
              {(() => {
                return ((trip.unauthorized_stops_count > 0 && trip.status?.toLowerCase() !== 'delivered') || 
                        (trip.alert_message && ((Array.isArray(trip.alert_message) && trip.alert_message.length > 0) || 
                         (typeof trip.alert_message === 'string' && trip.alert_message.trim() !== ''))));
              })() && (
              <div className="rounded-md p-2 mb-2 text-xs bg-red-50 border border-red-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3 text-red-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    {(() => {
                      if (trip.alert_message) {
                        let latestAlert = null;
                        if (Array.isArray(trip.alert_message) && trip.alert_message.length > 0) {
                          latestAlert = trip.alert_message[trip.alert_message.length - 1];
                        } else if (typeof trip.alert_message === 'string' && trip.alert_message.trim() !== '') {
                          latestAlert = trip.alert_message;
                        }
                        
                        if (latestAlert) {
                          const message = typeof latestAlert === 'object' ? latestAlert.message : latestAlert;
                          const shortMessage = message.length > 60 ? message.substring(0, 60) + '...' : message;
                          return (
                            <div className="text-red-700 font-medium truncate">
                              {shortMessage}
                            </div>
                          );
                        }
                      }
                      
                      return (
                        <div className="text-red-700 font-medium">
                          Unauthorized Stop — {trip.unauthorized_stops_count} detected
                        </div>
                      );
                    })()
                    }
                  </div>
                  {trip.alert_message && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-5 px-2 text-xs border-red-300 text-red-700 hover:bg-red-100"
                      onClick={() => {
                        let alerts = [];
                        if (Array.isArray(trip.alert_message)) {
                          alerts = trip.alert_message;
                        } else if (typeof trip.alert_message === 'string' && trip.alert_message.trim() !== '') {
                          alerts = [trip.alert_message];
                        }
                        if (alerts.length > 0) {
                          setCurrentTripAlerts({ tripId: trip.trip_id || trip.id, alerts });
                          setAlertsModalOpen(true);
                        }
                      }}
                    >
                      View
                    </Button>
                  )}
                </div>
              </div>
              )}

              <div className="p-2">
              {/* Header Section */}
              <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center border border-indigo-200">
              <Truck className="w-3 h-3 text-indigo-700" />
              </div>
              <div className="min-w-0">
              <h3 className="font-semibold text-black text-xs truncate">{title}</h3>
              <p className="text-xs text-gray-700">Trip #{trip.trip_id || trip.id}</p>
              </div>
              </div>
              </div>
              <div className="flex flex-col items-end">
              <span className={cn(
              "px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide",
              trip.status?.toLowerCase() === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
              trip.status?.toLowerCase() === 'on-trip' ? 'bg-sky-100 text-sky-800' :
              ['pending', 'accepted'].includes(trip.status?.toLowerCase()) ? 'bg-amber-100 text-amber-800' :
              ['rejected', 'cancelled', 'stopped'].includes(trip.status?.toLowerCase()) ? 'bg-rose-100 text-rose-800' :
              ['completed', 'depo', 'handover'].includes(trip.status?.toLowerCase()) ? 'bg-lime-100 text-lime-800' :
              'bg-slate-100 text-slate-800'
              )}>
              {trip.status || 'Unknown'}
              </span>
              </div>
              </div>

              {/* Route Information */}
              <div className="grid grid-cols-2 gap-1 mb-2">
              <div className="bg-white rounded-lg p-1.5 border border-slate-100">
              <div className="flex items-center gap-1 mb-0.5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
              <span className="text-xs font-medium text-gray-700 uppercase">Pickup</span>
              </div>
              <p className="text-xs font-medium text-black truncate">{trip.origin || 'Not specified'}</p>
              </div>
              <div className="bg-white rounded-lg p-1.5 border border-slate-100">
              <div className="flex items-center gap-1 mb-0.5">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
              <span className="text-xs font-medium text-gray-700 uppercase">Drop-off</span>
              </div>
              <p className="text-xs font-medium text-black truncate">{trip.destination || 'Not specified'}</p>
              </div>
              </div>

              {/* Enhanced Timeline */}
              <div className={cn("mb-3 mt-1", isStopped && "opacity-50 grayscale pointer-events-none")}>
              {/* Trip Progress Bar */}
              <div className="relative">
              {/* Waypoint circles — positioned on the bar line */}
              <div className="flex justify-between items-center relative z-10">
              {waypoints.map((waypoint, index) => (
              <div key={index} className="flex flex-col items-center relative">
              {/* Elapsed time — absolutely positioned so it never shifts the circles */}
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 h-4 flex items-end justify-center">
              {waypoint.completed && waypoint.elapsedSeconds !== null && (() => {
                const expected = getExpectedDuration(waypoint.value, trip)
                const color = getElapsedColor(waypoint.elapsedSeconds, expected)
                return (
                <span className={cn(
                  "text-[9px] whitespace-nowrap font-medium",
                  color === 'red' ? "text-red-500" :
                  color === 'orange' ? "text-orange-500" :
                  "text-gray-500"
                )}>
                  {waypoint.elapsedSeconds === 0 && index === 0 ? 'Start' : formatElapsed(waypoint.elapsedSeconds) || '0m'}
                </span>
                )
              })()}
              {waypoint.isCurrent && waypoint.currentElapsed !== null && (() => {
                const expected = getExpectedDuration(waypoint.value, trip)
                const color = getElapsedColor(waypoint.currentElapsed, expected)
                return (
                <span className={cn(
                  "text-[9px] whitespace-nowrap font-semibold",
                  color === 'red' ? "text-red-500" :
                  color === 'orange' ? "text-orange-500" :
                  "text-blue-500"
                )}>
                  {formatElapsed(waypoint.currentElapsed) || '0m'}
                </span>
                )
              })()}
              </div>
              <div className={cn(
              "w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-300",
              waypoint.current ? (() => {
                const expected = getExpectedDuration(waypoint.value, trip)
                const color = getElapsedColor(waypoint.currentElapsed || 0, expected)
                return color === 'red' ? "bg-red-500 border-red-600 text-white" :
                       color === 'orange' ? "bg-orange-500 border-orange-600 text-white" :
                       "bg-blue-500 border-blue-700 text-white"
              })() :
              waypoint.completed ? (() => {
                const expected = getExpectedDuration(waypoint.value, trip)
                const color = getElapsedColor(waypoint.elapsedSeconds || 0, expected)
                return color === 'red' ? "bg-red-500 border-red-600 text-white" :
                       color === 'orange' ? "bg-orange-500 border-orange-600 text-white" :
                       "bg-emerald-600 border-emerald-700 text-white"
              })() :
              "bg-slate-100 border-slate-200 text-slate-600"
              )}>
              {waypoint.completed ? <CheckCircle className="w-3 h-3" /> :
               waypoint.current ? <div className="w-2 h-2 bg-white rounded-full animate-pulse" /> :
               <span className="text-[9px]">{index + 1}</span>}
              </div>
              <span className={cn(
              "text-[10px] mt-1 text-center max-w-[52px] leading-tight",
              waypoint.current ? (() => {
                const expected = getExpectedDuration(waypoint.value, trip)
                const color = getElapsedColor(waypoint.currentElapsed || 0, expected)
                return color === 'red' ? "text-red-600 font-semibold" :
                       color === 'orange' ? "text-orange-600 font-semibold" :
                       "text-blue-600 font-semibold"
              })() :
              waypoint.completed ? (() => {
                const expected = getExpectedDuration(waypoint.value, trip)
                const color = getElapsedColor(waypoint.elapsedSeconds || 0, expected)
                return color === 'red' ? "text-red-600 font-medium" :
                       color === 'orange' ? "text-orange-600 font-medium" :
                       "text-emerald-700 font-medium"
              })() : "text-gray-500"
              )}>
              {waypoint.label.split(' ')[0]}
              </span>
              {/* Distance to next waypoint */}
              {waypoint.distanceKm !== null && waypoint.distanceKm > 0 && (
                <span className="text-[8px] text-blue-500 font-semibold whitespace-nowrap mt-0.5">
                  {waypoint.distanceKm} km
                </span>
              )}
              </div>
              ))}
              </div>
              {/* Bar line behind the circles — always passes through circle center */}
              <div className="absolute top-[10px] left-[14px] right-[14px] h-1.5 bg-slate-200 -z-0 rounded">
                <div
                  className="h-full rounded bg-gradient-to-r from-emerald-500 via-blue-500 to-blue-400 transition-all duration-500"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              </div>
              </div>

              {/* Cargo Information */}
              {trip.cargo && (
              <div className="bg-white rounded-lg p-2 mb-3 border border-slate-100">
              <div className="flex items-center gap-1 mb-1">
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
              <span className="text-xs font-medium text-gray-700 uppercase">Cargo</span>
              </div>
              <p className="text-sm font-medium text-black">
              {trip.cargo}{trip.cargo_weight && ` (${trip.cargo_weight})`}
              </p>
              </div>
              )}



              {/* Time Information */}
              {(() => {
              const pickupTime = trip.pickup_locations?.[0]?.scheduled_time || trip.pickuplocations?.[0]?.scheduled_time;
              const dropoffTime = trip.dropoff_locations?.[0]?.scheduled_time || trip.dropofflocations?.[0]?.scheduled_time;
              return (pickupTime || dropoffTime) && (
              <div className="bg-white rounded p-2 mb-2 border border-slate-100">
              <div className="flex items-center gap-1 mb-1">
              <Clock className="w-3 h-3 text-sky-500" />
              <span className="text-xs font-medium text-gray-700">Schedule</span>
              </div>
              <div className="space-y-1">
              {pickupTime && (
              <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                <span className="font-medium text-gray-800">Pickup</span>
              </div>
              <span className="font-semibold text-black">
                {new Date(pickupTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} {new Date(pickupTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
              </div>
              )}
              {dropoffTime && (
              <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                <span className="font-medium text-gray-800">Drop-off</span>
              </div>
              <span className="font-semibold text-black">
                {new Date(dropoffTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} {new Date(dropoffTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
              </div>
              )}
              </div>
              </div>
              );
              })()}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 mt-1">
              <SecureButton 
              page="dashboard"
              action="edit"
              size="sm" 
              variant="outline" 
              className="h-8 text-xs"
              onClick={() => {
              setCurrentTripForTime(trip);
              setTimeType('pickup');
              const pickupLocs = trip.pickup_locations || trip.pickuplocations || [];
              setSelectedTime(pickupLocs[0]?.scheduled_time || '');
              setPickupTimeOpen(true);
              }}
              >
              <Clock className="w-3 h-3 mr-1" />
              {(trip.pickup_locations?.[0]?.scheduled_time || trip.pickuplocations?.[0]?.scheduled_time) ? 'Update Pickup' : 'Set Pickup'}
              </SecureButton>
              <SecureButton 
              page="dashboard"
              action="edit"
              size="sm" 
              variant="outline" 
              className="h-8 text-xs"
              onClick={() => {
              setCurrentTripForTime(trip);
              setTimeType('dropoff');
              const dropoffLocs = trip.dropoff_locations || trip.dropofflocations || [];
              setSelectedTime(dropoffLocs[0]?.scheduled_time || '');
              setDropoffTimeOpen(true);
              }}
              >
              <Clock className="w-3 h-3 mr-1" />
              {(trip.dropoff_locations?.[0]?.scheduled_time || trip.dropofflocations?.[0]?.scheduled_time) ? 'Update Drop-off' : 'Set Drop-off'}
              </SecureButton>
              <Button 
              size="sm"
              variant="link"
              className="h-8 text-xs ml-auto border border-gray-300"
              onClick={async () => {
              setLoadingPhotos(true);
              try {
              const supabase = createClient();
              const tripId = trip.id || trip.trip_id;
              
              // Fetch photos from both folders
              const { data: beforePhotos } = await supabase.storage
              .from('trip-photos')
              .list(`${tripId}/loadBefore`);
              
              const { data: duringPhotos } = await supabase.storage
              .from('trip-photos')
              .list(`${tripId}/loadDuring`);
              
              // Get Supabase URL and construct direct URLs
              const supabaseUrl = supabase.supabaseUrl;
              
              const beforeUrls = beforePhotos?.filter(item => item.name && !item.name.endsWith('/'))
              .map(photo => ({
              url: `${supabaseUrl}/storage/v1/object/public/trip-photos/${tripId}/loadBefore/${photo.name}`,
              name: photo.name
              })) || [];
              
              const duringUrls = duringPhotos?.filter(item => item.name && !item.name.endsWith('/'))
              .map(photo => ({
              url: `${supabaseUrl}/storage/v1/object/public/trip-photos/${tripId}/loadDuring/${photo.name}`,
              name: photo.name
              })) || [];
              
              console.log('Generated URLs:', { beforeUrls, duringUrls });
              
              setCurrentTripPhotos({ 
              tripId, 
              before: beforeUrls, 
              during: duringUrls 
              });
              setPhotosModalOpen(true);
              } catch (err) {
              console.error('Failed to load photos:', err);
              alert('Failed to load photos');
              } finally {
              setLoadingPhotos(false);
              }
              }}
              disabled={loadingPhotos}
              >
              <FileText className="w-3 h-3 mr-1" />
              {loadingPhotos ? 'Loading...' : 'View Loading Pictures'}
              </Button>
              </div>
              </div>
            </div>
          </div>
        )
      })}
      </div>
      )}
    </div>
  )
}

// Trip Reports Section Component
function TripReportsSection() {
  const [completedTrips, setCompletedTrips] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedTrip, setExpandedTrip] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCompletedTrips() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('trips')
          .select('*')
          .not('status', 'eq', 'pending')
          .order('updated_at', { ascending: false })
        
        if (error) throw error
        setCompletedTrips(data || [])
      } catch (err) {
        console.error('Error fetching completed trips:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchCompletedTrips()
  }, [])

  const getTimingStatus = (scheduledTime: string, actualTime: string) => {
    if (!scheduledTime || !actualTime) return 'Unknown'
    
    const scheduled = new Date(scheduledTime)
    const actual = new Date(actualTime)
    const diffMinutes = (actual.getTime() - scheduled.getTime()) / (1000 * 60)
    
    if (diffMinutes <= -15) return 'Early'
    if (diffMinutes >= 15) return 'Late'
    return 'On Time'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Early': return 'text-blue-700 bg-blue-50'
      case 'Late': return 'text-red-700 bg-red-50'
      case 'On Time': return 'text-green-700 bg-green-50'
      default: return 'text-gray-700 bg-gray-50'
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading trip reports...</div>
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h2 className="text-3xl font-bold tracking-tight">Trip Reports</h2>
        <p className="text-muted-foreground">Performance analysis for active, completed and delivered trips</p>
      </div>

      <div className="space-y-3">
        {completedTrips.map((trip) => {
          const clientDetails = typeof trip.clientdetails === 'string' ? JSON.parse(trip.clientdetails) : trip.clientdetails
          const pickupLocations = trip.pickup_locations || trip.pickuplocations || []
          const dropoffLocations = trip.dropoff_locations || trip.dropofflocations || []
          
          const scheduledPickup = pickupLocations[0]?.scheduled_time
          const scheduledDropoff = dropoffLocations[0]?.scheduled_time
          const actualStart = trip.actual_start_time
          const actualEnd = trip.actual_end_time
          
          const startStatus = getTimingStatus(scheduledPickup, actualStart)
          const arrivalStatus = getTimingStatus(scheduledDropoff, actualEnd)
          
          // Check if trip is late based on estimated arrival
          const estimatedArrival = trip.dropoff_locations?.[0]?.scheduled_time || trip.dropofflocations?.[0]?.scheduled_time
          const isLate = estimatedArrival && !actualEnd && new Date() > new Date(estimatedArrival)
          const displayArrivalStatus = isLate ? 'Late' : arrivalStatus
          
          // Check for unauthorized stops in alert_message
          let unauthorizedStops = trip.unauthorized_stops_count || 0
          if (trip.alert_message && Array.isArray(trip.alert_message)) {
            const unauthorizedAlerts = trip.alert_message.filter(alert => 
              typeof alert === 'object' && alert.type && 
              alert.type.toLowerCase().includes('unauthorized')
            )
            unauthorizedStops = Math.max(unauthorizedStops, unauthorizedAlerts.length)
          }
          
          const isExpanded = expandedTrip === trip.id
          
          return (
            <Card key={trip.id} className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader 
                className="cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedTrip(isExpanded ? null : trip.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                      <Truck className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-slate-900">
                        {clientDetails?.name || 'Unknown Client'} - Trip #{trip.trip_id || trip.id}
                      </CardTitle>
                      <p className="text-sm text-slate-600">
                        {trip.origin} → {trip.destination}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={cn('px-2 py-1 text-xs font-medium', 
                      trip.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    )}>
                      {trip.status}
                    </Badge>
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 w-4" />}
                  </div>
                </div>
              </CardHeader>
              
              {isExpanded && (
                <CardContent className="pt-0">
                  {(() => {
                    const stopsData = trip.stops_data || []
                    let WORKFLOW = trip.progress_stops || []
                    if (!WORKFLOW.some((s: any) => s.value === 'pending')) {
                      WORKFLOW = [{ order: 0, label: 'Pending', value: 'pending', isComplete: false }, ...WORKFLOW]
                    }
                    const timestampMap: Record<string, string> = {}
                    const recordedOrder: string[] = []
                    for (const entry of stopsData) {
                      const s = entry.status?.toLowerCase()
                      if (s && !recordedOrder.includes(s)) recordedOrder.push(s)
                      if (s && entry.timestamp) timestampMap[s] = entry.timestamp
                    }
                    // Calculate elapsed from timestamps: time between this stop and the next
                    const elapsedFromTimestamps: Record<string, number> = {}
                    for (let i = 0; i < recordedOrder.length; i++) {
                      const currentStatus = recordedOrder[i]
                      const currentTs = timestampMap[currentStatus]
                      if (!currentTs) continue
                      if (i < recordedOrder.length - 1) {
                        const nextTs = timestampMap[recordedOrder[i + 1]]
                        if (nextTs) {
                          elapsedFromTimestamps[currentStatus] = Math.floor(
                            (new Date(nextTs).getTime() - new Date(currentTs).getTime()) / 1000
                          )
                        }
                      } else {
                        elapsedFromTimestamps[currentStatus] = Math.floor(
                          (Date.now() - new Date(currentTs).getTime()) / 1000
                        )
                      }
                    }
                    const currentIdx = WORKFLOW.findIndex(s => s.value === trip.status?.toLowerCase())
                    const totalTime = Object.values(elapsedFromTimestamps).reduce((sum, secs) => sum + secs, 0)
                    const stepsCompleted = recordedOrder.length
                    const progress = recordedOrder.length > 0 ? (recordedOrder.length / WORKFLOW.length) * 100 : (currentIdx >= 0 ? ((currentIdx + 1) / WORKFLOW.length) * 100 : 0)
                    const fmtElapsed = (secs: number | null | undefined) => {
                      if (secs === null || secs === undefined) return 'No data'
                      if (secs <= 0) return '0m'
                      if (secs < 60) return `${secs}s`
                      if (secs < 3600) { const m = Math.floor(secs / 60); const s = secs % 60; return s > 0 ? `${m}m ${s}s` : `${m}m` }
                      const h = Math.floor(secs / 3600); const m = Math.floor((secs % 3600) / 60); return m > 0 ? `${h}h ${m}m` : `${h}h`
                    }
                    const segColor = (secs: number, statusValue: string) => {
                      const expected = getExpectedDuration(statusValue, trip)
                      const c = getElapsedColor(secs, expected)
                      return c === 'red' ? '#ef4444' : c === 'orange' ? '#f97316' : '#10b981'
                    }
                    const segLabel = (secs: number, statusValue: string) => {
                      const expected = getExpectedDuration(statusValue, trip)
                      const c = getElapsedColor(secs, expected)
                      return c === 'red' ? 'Overdue' : c === 'orange' ? 'Delayed' : 'On Time'
                    }
                    // Order is fixed from progress_stops — never sort
                    const wpData = WORKFLOW.map((w: any) => ({
                      ...w,
                      completed: w.isComplete === true || (recordedOrder.includes(w.value) && w.value !== trip.status?.toLowerCase()),
                      current: w.value === trip.status?.toLowerCase(),
                      elapsed: recordedOrder.includes(w.value) ? (elapsedFromTimestamps[w.value] ?? null) : null,
                      timestamp: recordedOrder.includes(w.value) ? (timestampMap[w.value] ?? null) : null,
                    }))
                    return (
                    <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">{clientDetails?.name || 'Unknown Client'}</h3>
                          <p className="text-sm text-slate-500">{trip.origin} → {trip.destination}</p>
                        </div>
                        <Badge className={cn('px-3 py-1 text-xs font-semibold',
                          trip.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                          trip.status === 'on-trip' ? 'bg-blue-100 text-blue-800' :
                          trip.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-800'
                        )}>{trip.status}</Badge>
                      </div>
                      {/* Summary Metrics */}
                      <div className="grid grid-cols-4 gap-3 mb-5">
                        <div className="bg-slate-50 rounded-lg p-3 text-center">
                          <p className="text-[10px] uppercase text-slate-500 font-medium mb-1">Total Time</p>
                          <p className="text-xl font-bold text-slate-900">{fmtElapsed(totalTime)}</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3 text-center">
                          <p className="text-[10px] uppercase text-slate-500 font-medium mb-1">Steps Done</p>
                          <p className="text-xl font-bold text-slate-900">{stepsCompleted}<span className="text-sm text-slate-400">/{WORKFLOW.length}</span></p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3 text-center">
                          <p className="text-[10px] uppercase text-slate-500 font-medium mb-1">Distance</p>
                          <p className="text-xl font-bold text-slate-900">{trip.estimated_distance ? `${Math.round(trip.estimated_distance)}km` : '—'}</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3 text-center">
                          <p className="text-[10px] uppercase text-slate-500 font-medium mb-1">Compliance</p>
                          <p className={cn("text-xl font-bold", (trip.unauthorized_stops_count || 0) === 0 ? 'text-emerald-600' : 'text-red-600')}>
                            {(trip.unauthorized_stops_count || 0) === 0 ? '100%' : '0%'}
                          </p>
                        </div>
                      </div>
                      {/* Trip Progress Bar — same style as routing tab */}
                      <div className="mb-5">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-semibold text-black">Trip Progress</h4>
                          <span className="text-xs text-gray-700">{Math.round(progress)}% Complete</span>
                        </div>
                        <div className="relative">
                          {/* Waypoint circles — positioned on the bar line */}
                          <div className="flex justify-between items-center relative z-10">
                            {wpData.map((wp, i) => (
                              <div key={i} className="flex flex-col items-center relative">
                                {/* Elapsed time — absolutely positioned above */}
                                <div className="absolute -top-5 left-1/2 -translate-x-1/2 h-4 flex items-end justify-center">
                                  {wp.elapsed !== null && wp.elapsed > 0 && (() => {
                                    const expected = getExpectedDuration(wp.value, trip)
                                    const color = getElapsedColor(wp.elapsed, expected)
                                    return (
                                    <span className={cn(
                                      "text-[9px] whitespace-nowrap font-medium",
                                      color === 'red' ? "text-red-500" :
                                      color === 'orange' ? "text-orange-500" :
                                      "text-gray-500"
                                    )}>{fmtElapsed(wp.elapsed)}</span>
                                    )
                                  })()}
                                  {wp.elapsed === 0 && i === 0 && (
                                    <span className="text-[9px] whitespace-nowrap font-medium text-gray-500">Start</span>
                                  )}
                                </div>
                                <div className={cn(
                                  "w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-300",
                                  wp.current ? (() => {
                                    const expected = getExpectedDuration(wp.value, trip)
                                    const color = getElapsedColor(wp.elapsed || 0, expected)
                                    return color === 'red' ? "bg-red-500 border-red-600 text-white" :
                                           color === 'orange' ? "bg-orange-500 border-orange-600 text-white" :
                                           "bg-blue-500 border-blue-700 text-white"
                                  })() :
                                  wp.completed ? (() => {
                                    const expected = getExpectedDuration(wp.value, trip)
                                    const color = getElapsedColor(wp.elapsed || 0, expected)
                                    return color === 'red' ? "bg-red-500 border-red-600 text-white" :
                                           color === 'orange' ? "bg-orange-500 border-orange-600 text-white" :
                                           "bg-emerald-600 border-emerald-700 text-white"
                                  })() :
                                  "bg-slate-100 border-slate-200 text-slate-600"
                                )}>
                                  {wp.completed ? <CheckCircle className="w-3 h-3" /> :
                                   wp.current ? <div className="w-2 h-2 bg-white rounded-full animate-pulse" /> :
                                   <span className="text-[9px]">{i + 1}</span>}
                                </div>
                                <span className={cn(
                                  "text-[10px] mt-1 text-center max-w-[52px] leading-tight",
                                  wp.current ? (() => {
                                    const expected = getExpectedDuration(wp.value, trip)
                                    const color = getElapsedColor(wp.elapsed || 0, expected)
                                    return color === 'red' ? "text-red-600 font-semibold" :
                                           color === 'orange' ? "text-orange-600 font-semibold" :
                                           "text-blue-600 font-semibold"
                                  })() :
                                  wp.completed ? (() => {
                                    const expected = getExpectedDuration(wp.value, trip)
                                    const color = getElapsedColor(wp.elapsed || 0, expected)
                                    return color === 'red' ? "text-red-600 font-medium" :
                                           color === 'orange' ? "text-orange-600 font-medium" :
                                           "text-emerald-700 font-medium"
                                  })() : "text-gray-500"
                                )}>{wp.label}</span>
                              </div>
                            ))}
                          </div>
                          {/* Bar line behind the circles */}
                          <div className="absolute top-[10px] left-[14px] right-[14px] h-1.5 bg-slate-200 -z-0 rounded">
                            <div
                              className="h-full rounded bg-gradient-to-r from-emerald-500 via-blue-500 to-blue-400 transition-all duration-500"
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      {/* Timing Breakdown */}
                      <div>
                        <h4 className="text-xs font-semibold text-black uppercase tracking-wide mb-3">Timing Breakdown</h4>
                        <div className="space-y-2">
                          {wpData.map((wp, i) => (
                            <div key={i} className="flex items-center gap-3">
                              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: wp.elapsed !== null && wp.elapsed > 0 ? segColor(wp.elapsed, wp.value) : '#cbd5e1' }} />
                              <span className="text-xs font-medium text-slate-700 w-20">{wp.label}</span>
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: wp.elapsed !== null && wp.elapsed > 0 && totalTime > 0 ? `${(wp.elapsed / totalTime) * 100}%` : '0%',
                                    backgroundColor: wp.elapsed !== null && wp.elapsed > 0 ? segColor(wp.elapsed, wp.value) : '#e2e8f0'
                                  }}
                                />
                              </div>
                              <span className={cn("text-xs font-semibold w-16 text-right", wp.elapsed !== null && wp.elapsed > 0 ? "text-slate-900" : "text-slate-400")}>
                                {fmtElapsed(wp.elapsed)}
                              </span>
                              <span className={cn(
                                "text-[10px] font-medium px-1.5 py-0.5 rounded min-w-[60px] text-center",
                                wp.elapsed !== null && wp.elapsed > 0 ? (() => {
                                  const expected = getExpectedDuration(wp.value, trip)
                                  const c = getElapsedColor(wp.elapsed, expected)
                                  return c === 'red' ? 'bg-red-50 text-red-600' :
                                         c === 'orange' ? 'bg-orange-50 text-orange-600' :
                                         'bg-emerald-50 text-emerald-600'
                                })() : 'bg-slate-50 text-slate-400'
                              )}>{wp.elapsed !== null && wp.elapsed > 0 ? segLabel(wp.elapsed, wp.value) : 'No data'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Notes */}
                      {trip.notes && (
                        <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <h5 className="text-[10px] uppercase text-slate-500 font-medium mb-1">Notes</h5>
                          <p className="text-xs text-slate-700">{trip.notes}</p>
                        </div>
                      )}
                    </div>
                    )
                  })()}
                </CardContent>
              )}
            </Card>
          )
        })}
        
        {completedTrips.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No trips found</p>
            <p className="text-sm">Trip reports will appear here for active and completed trips</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<string>("routing");
  const [auditData, setAuditData] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [mapOpen, setMapOpen] = useState(false);
  const [mapData, setMapData] = useState<any>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [currentTripForNote, setCurrentTripForNote] = useState<any>(null);
  const [noteText, setNoteText] = useState('');
  const [changeDriverOpen, setChangeDriverOpen] = useState(false);
  const [currentTripForChange, setCurrentTripForChange] = useState<any>(null);
  const [availableDrivers, setAvailableDrivers] = useState<any[]>([]);
  const [allVehicles, setAllVehicles] = useState<any[]>([]);
  const [driverSearchTerm, setDriverSearchTerm] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [pickupTimeOpen, setPickupTimeOpen] = useState(false);
  const [dropoffTimeOpen, setDropoffTimeOpen] = useState(false);
  const [currentTripForTime, setCurrentTripForTime] = useState<any>(null);
  const [timeType, setTimeType] = useState<'pickup' | 'dropoff'>('pickup');
  const [selectedTime, setSelectedTime] = useState('');
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [tripDetailsOpen, setTripDetailsOpen] = useState(false);
  const [unauthorizedStopModalOpen, setUnauthorizedStopModalOpen] = useState(false);
  const [currentUnauthorizedTrip, setCurrentUnauthorizedTrip] = useState<any>(null);
  const [unauthorizedStopNote, setUnauthorizedStopNote] = useState('');
  const [photosModalOpen, setPhotosModalOpen] = useState(false);
  const [currentTripPhotos, setCurrentTripPhotos] = useState<any>(null);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [trips, setTrips] = useState<any[]>([]);
  const [alertsModalOpen, setAlertsModalOpen] = useState(false);
  const [currentTripAlerts, setCurrentTripAlerts] = useState<any>(null);
  const [closeTripOpen, setCloseTripOpen] = useState(false);
  const [currentTripForClose, setCurrentTripForClose] = useState<any>(null);
  const [closeReason, setCloseReason] = useState('');
  const [editTripOpen, setEditTripOpen] = useState(false);
  const [currentTripForEdit, setCurrentTripForEdit] = useState<any>(null);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [currentTripForApproval, setCurrentTripForApproval] = useState<any>(null);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [currentTripForVideo, setCurrentTripForVideo] = useState<any>(null);
  const [onlineDevices, setOnlineDevices] = useState<Map<string, { deviceId: string; online: boolean }>>(new Map());
  useEffect(() => {
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(";").shift();
      return null;
    };
    const role = decodeURIComponent(getCookie("role") || "");
    setUserRole(role);
  }, []);

  // Fetch online devices from streaming server
  useEffect(() => {
    let cancelled = false;
    async function fetchOnlineDevices() {
      try {
        const res = await fetch("/api/video-server/eps/stream/online", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
          cache: "no-store",
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data.success && data.data?.devices) {
          const map = new Map<string, { deviceId: string; online: boolean }>();
          for (const d of data.data.devices) {
            if (!d.deviceId) continue;
            const plate = (d.plateName || "").trim();
            const parts = plate.split(" - ");
            const fleetNum = (parts[0] || "").trim().toUpperCase();
            const regNum = (parts[1] || "").trim().toUpperCase();
            const info = { deviceId: d.deviceId, online: d.online === true };
            if (fleetNum) map.set(fleetNum, info);
            if (regNum) map.set(regNum, info);
          }
          if (!cancelled) setOnlineDevices(map);
        }
      } catch {
        // silently fail — online status is non-critical
      }
    }
    fetchOnlineDevices();
    return () => { cancelled = true; };
  }, []);

  // Fetch trips for alerts
  useEffect(() => {
    async function fetchTrips() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from('trips').select('*');
        if (error) throw error;
        setTrips(data || []);
      } catch (err) {
        console.error('Error fetching trips:', err);
      }
    }
    fetchTrips();
  }, []);

  const handleViewMap = async (driverName: string, trip?: any) => {
    // Fetch high risk zones
    let highRiskZones = [];
    try {
      const supabase = createClient();
      const { data: riskZones } = await supabase
        .from('high_risk')
        .select('id, name, coordinates');
      
      highRiskZones = (riskZones || []).map(zone => {
        if (zone.coordinates) {
          const coordPairs = zone.coordinates.split(' ')
            .filter(coord => coord.trim())
            .map(coord => {
              const [lng, lat, z] = coord.split(',');
              return [parseFloat(lng), parseFloat(lat)];
            })
            .filter(pair => !isNaN(pair[0]) && !isNaN(pair[1]));

          if (coordPairs.length > 2) {
            return {
              name: zone.name,
              polygon: coordPairs
            };
          }
        }
        return null;
      }).filter(Boolean);
    } catch (error) {
      console.error('Error fetching high risk zones:', error);
    }

    if (trip?.vehicleLocation && trip.vehicleLocation.latitude && trip.vehicleLocation.longitude) {
      const vehicleData = {
        ...trip.vehicleLocation,
        trip,
        routeCoordinates: trip.routeCoords,
        stopPoints: trip.stopPoints,
        highRiskZones,
        driverDetails: {
          fullName: driverName,
          plate: trip.vehicleLocation.plate,
          speed: trip.vehicleLocation.speed,
          mileage: trip.vehicleLocation.mileage,
          address: trip.vehicleLocation.address,
          geozone: trip.vehicleLocation.geozone,
          company: trip.vehicleLocation.company,
          lastUpdate: trip.vehicleLocation.loc_time
        }
      };
      setMapData(vehicleData);
      setMapOpen(true);
    } else if (trip?.vehicleLocation) {
      const vehicleData = {
        ...trip.vehicleLocation,
        latitude: trip.vehicleLocation.latitude,
        longitude: trip.vehicleLocation.longitude,
        highRiskZones,
        driverDetails: {
          fullName: driverName,
          plate: trip.vehicleLocation.plate,
          speed: trip.vehicleLocation.speed,
          mileage: trip.vehicleLocation.mileage,
          address: trip.vehicleLocation.address,
          geozone: trip.vehicleLocation.geozone,
          company: trip.vehicleLocation.company,
          lastUpdate: trip.vehicleLocation.loc_time
        }
      };
      setMapData(vehicleData);
      setMapOpen(true);
    } else if (trip.routeCoords && trip.routeCoords.length > 0) {
      // Show pre-planned route when no vehicle coordinates available
      const routeOnlyData = {
        routeCoordinates: trip.routeCoords,
        stopPoints: trip.stopPoints,
        highRiskZones,
        showRouteOnly: true,
        driverDetails: {
          fullName: driverName,
          plate: 'No vehicle data',
          speed: 0,
          address: 'Location unavailable'
        }
      };
      setMapData(routeOnlyData);
      setMapOpen(true);
    } else if (trip?.origin || trip?.destination) {
      const basicMapData = {
        showBasicRoute: true,
        origin: trip.origin,
        destination: trip.destination,
        highRiskZones,
        driverDetails: {
          fullName: driverName,
          plate: trip.vehicleInfo?.registration_number || 'Unknown vehicle',
          speed: 0,
          address: 'No GPS data - showing trip route'
        }
      };
      console.log('Opening map with basic route:', basicMapData);
      setMapData(basicMapData);
      setMapOpen(true);
    } else {
      alert(`No location, route, or trip data available for ${driverName}. Please ensure the trip has origin/destination or GPS tracking is enabled.`);
    }
  };

  useEffect(() => {
    async function fetchAuditData() {
      try {
        const supabase = createClient()
        const { data: auditTrips, error } = await supabase
          .from('audit')
          .select('*')
          .ilike('status', 'delivered')
        if (error) throw error
        
        const formattedData = (auditTrips || []).map(trip => {
          const clientDetails = typeof trip.clientdetails === 'string' ? JSON.parse(trip.clientdetails) : trip.clientdetails
          return {
            id: trip.id,
            client: clientDetails?.name || 'Unknown Client',
            commodity: trip.cargo || 'N/A',
            rate: trip.selling_rate_per_km || 'N/A',
            pickup: trip.origin || 'N/A',
            dropOff: trip.destination || 'N/A',
            status: trip.status || 'Unknown'
          }
        })
        setAuditData(formattedData)
      } catch (err) {
        console.error('Error fetching audit data:', err)
      } finally {
        setAuditLoading(false)
      }
    }
    
    if (activeTab === 'audit') {
      fetchAuditData()
    }
  }, [activeTab])

  // Full-page map view with overlay tabs
  if (activeTab === "live-map") {
    return (
      <>
        <div className="absolute inset-0 -m-6 z-0">
          <LiveMapView />
        </div>
        
        {/* Overlay Tabs */}
        <div className="relative z-10 mb-4">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v)}
            className="w-full"
          >
            <TabsList className="flex w-fit items-center rounded-lg bg-white/90 backdrop-blur-sm p-1 shadow-lg">
              {userRole === 'admin' && (
              <TabsTrigger
                value="executive-report"
                className="px-6 py-2 text-sm font-medium rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Executive Report
              </TabsTrigger>
              )}
              <TabsTrigger
                value="routing"
                className="px-6 py-2 text-sm font-medium rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Trip Routing
              </TabsTrigger>
              <TabsTrigger
                value="live-map"
                className="px-6 py-2 text-sm font-medium rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Live Map
              </TabsTrigger>
              <TabsTrigger
                value="reports"
                className="px-6 py-2 text-sm font-medium rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Trip Reports
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex-1 space-y-4 p-4 pt-6">
        {/* Top Tabs Navigation */}
        {/* <div className="flex items-center justify-between">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v)}
            className="w-full"
          >
            <TabsList className="flex w-fit items-center rounded-full bg-white/80 dark:bg-slate-800 p-1.5 shadow-lg ring-1 ring-slate-200 dark:ring-slate-700">
              <TabsTrigger
                value="routing"
                className="px-4 py-2 text-sm font-medium rounded-full data-[state=active]:bg-primary data-[state=active]:text-white hover:brightness-95"
              >
                Routing
              </TabsTrigger>
              <TabsTrigger
                value="financials"
                className="px-4 py-2 text-sm font-medium rounded-full data-[state=active]:bg-primary data-[state=active]:text-white hover:brightness-95"
              >
                Financials
              </TabsTrigger>
              <TabsTrigger
                value="audit"
                className="px-4 py-2 text-sm font-medium rounded-full data-[state=active]:bg-primary data-[state=active]:text-white hover:brightness-95"
              >
                Audit
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div> */}



        {/* Top Tabs Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v)}
            className="w-full"
          >
            <TabsList className="flex w-fit items-center rounded-lg bg-slate-100 p-1 shadow-sm">
              {userRole === 'admin' && (
              <TabsTrigger
                value="executive-report"
                className="px-6 py-2 text-sm font-medium rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Executive Report
              </TabsTrigger>
              )}
              <TabsTrigger
                value="routing"
                className="px-6 py-2 text-sm font-medium rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Trip Routing
              </TabsTrigger>
              <TabsTrigger
                value="live-map"
                className="px-6 py-2 text-sm font-medium rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Live Map
              </TabsTrigger>
              <TabsTrigger
                value="reports"
                className="px-6 py-2 text-sm font-medium rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Trip Reports
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Conditionally render the main views */}
        {activeTab === "executive-report" && userRole === 'admin' && (
          <ExecutiveReportTab />
        )}

        {activeTab === "routing" && (
          <div className="space-y-4">
            <div className="mb-4 flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Trip Routing</h2>
                <p className="text-muted-foreground">Monitor all trips with progress tracking and waypoints</p>
              </div>
            </div>
            <RoutingSection 
              userRole={userRole}
              isVisible={activeTab === "routing"}
              handleViewMap={handleViewMap}
              setCurrentTripForNote={setCurrentTripForNote}
              setNoteText={setNoteText}
              setNoteOpen={setNoteOpen}
              setAvailableDrivers={setAvailableDrivers}
              setCurrentTripForChange={setCurrentTripForChange}
              setChangeDriverOpen={setChangeDriverOpen}
              refreshTrigger={refreshTrigger}
              setRefreshTrigger={setRefreshTrigger}
              setPickupTimeOpen={setPickupTimeOpen}
              setDropoffTimeOpen={setDropoffTimeOpen}
              setCurrentTripForTime={setCurrentTripForTime}
              setTimeType={setTimeType}
              setSelectedTime={setSelectedTime}
              currentUnauthorizedTrip={currentUnauthorizedTrip}
              setCurrentUnauthorizedTrip={setCurrentUnauthorizedTrip}
              setUnauthorizedStopModalOpen={setUnauthorizedStopModalOpen}
              loadingPhotos={loadingPhotos}
              setLoadingPhotos={setLoadingPhotos}
              setCurrentTripPhotos={setCurrentTripPhotos}
              setPhotosModalOpen={setPhotosModalOpen}
              setCurrentTripAlerts={setCurrentTripAlerts}
              setAlertsModalOpen={setAlertsModalOpen}
              setCurrentTripForClose={setCurrentTripForClose}
              setCloseReason={setCloseReason}
              setCloseTripOpen={setCloseTripOpen}
              setCurrentTripForEdit={setCurrentTripForEdit}
              setEditTripOpen={setEditTripOpen}
              setCurrentTripForApproval={setCurrentTripForApproval}
              setApprovalModalOpen={setApprovalModalOpen}
              setVideoModalOpen={setVideoModalOpen}
              setCurrentTripForVideo={setCurrentTripForVideo}
              onlineDevices={onlineDevices}
            />
          </div>
        )}

        {activeTab === "reports" && (
          <TripReportsSection />
        )}

        {activeTab === "financials" && (
          <div className="space-y-4">
            <div className="mb-4">
              <h2 className="text-3xl font-bold tracking-tight">Financials</h2>
              <p className="text-muted-foreground">Track revenue, expenses, and financial performance</p>
            </div>
            <FinancialsPanel />
          </div>
        )}

        {activeTab === "audit" && (
          <div className="space-y-4">
            <div className="mb-4 flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Audit</h2>
                <p className="text-muted-foreground">Transportation audit logs and history</p>
              </div>
              <Dialog.Root>
                <Dialog.Trigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Summary
                  </Button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                  <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto z-50">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <Dialog.Title className="text-2xl font-bold">Audit Summary</Dialog.Title>
                        <Dialog.Close asChild>
                          <Button variant="ghost" size="sm">
                            <X className="h-4 w-4" />
                          </Button>
                        </Dialog.Close>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
                            <Truck className="h-4 w-4 text-muted-foreground" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">{auditData.length}</div>
                            <p className="text-xs text-muted-foreground">
                              {auditData.filter(r => r.status?.toLowerCase() === 'delivered').length} delivered
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">
                              R{auditData.reduce((sum, record) => {
                                const rate = parseFloat(record.selling_rate_per_km?.toString().replace(/[^0-9.-]/g, '') || record.rate?.toString().replace(/[^0-9.-]/g, '') || '0')
                                return sum + rate
                              }, 0).toLocaleString('en-ZA')}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Avg: R{auditData.length > 0 ? (auditData.reduce((sum, record) => {
                                const rate = parseFloat(record.rate?.toString().replace(/[^0-9.-]/g, '') || '0')
                                return sum + rate
                              }, 0) / auditData.length).toLocaleString('en-ZA') : '0'} per trip
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Clients Served</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">
                              {new Set(auditData.map(r => r.client)).size}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Unique clients
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">
                              {auditData.length > 0 ? Math.round((auditData.filter(r => r.status?.toLowerCase() === 'delivered').length / auditData.length) * 100) : 0}%
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Delivered trips
                            </p>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Top Clients by Revenue</h3>
                        <div className="space-y-2">
                          {Object.entries(
                            auditData.reduce((acc, record) => {
                              const client = record.client
                              const rate = parseFloat(record.selling_rate_per_km?.toString().replace(/[^0-9.-]/g, '') || record.rate?.toString().replace(/[^0-9.-]/g, '') || '0')
                              acc[client] = (acc[client] || 0) + rate
                              return acc
                            }, {})
                          )
                          .sort(([,a], [,b]) => b - a)
                          .slice(0, 5)
                          .map(([client, revenue]) => (
                            <div key={client} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                              <span className="font-medium">{client}</span>
                              <span className="text-green-600 font-semibold">R{revenue.toLocaleString('en-ZA')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
            </div>
            <Card className="rounded-2xl shadow-md">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Audit Table</CardTitle>
                <CardDescription>Transportation audit logs and history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-blue-100">
                        <TableHead>Client</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Pickup Point</TableHead>
                        <TableHead>Drop Off Point</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            Loading audit data...
                          </TableCell>
                        </TableRow>
                      ) : auditData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            No trips found
                          </TableCell>
                        </TableRow>
                      ) : auditData.map((row) => (
                        <TableRow 
                          key={row.id} 
                          className="hover:bg-muted/50 cursor-pointer" 
                          onClick={async () => {
                            try {
                              const supabase = createClient()
                              const { data: tripData, error } = await supabase
                                .from('audit')
                                .select('*')
                                .eq('id', row.id)
                                .single()
                              
                              if (error) throw error
                              setSelectedTrip(tripData)
                              setTripDetailsOpen(true)
                            } catch (error) {
                              console.error('Error fetching trip details:', error)
                            }
                          }}
                        >
                          <TableCell className="font-medium">{row.client}</TableCell>
                          <TableCell>{row.commodity}</TableCell>
                          <TableCell>{row.selling_rate_per_km || row.rate}</TableCell>
                          <TableCell className="max-w-32 truncate" title={row.pickup}>{row.pickup}</TableCell>
                          <TableCell className="max-w-32 truncate" title={row.dropOff}>{row.dropOff}</TableCell>
                          <TableCell>
                            <span className={cn(
                              "px-3 py-1 rounded-full text-xs font-medium",
                              row.status?.toLowerCase() === "delivered" || row.status?.toLowerCase() === "complete" ? "bg-green-100 text-green-800" :
                              row.status?.toLowerCase() === "on trip" || row.status?.toLowerCase() === "in transit" ? "bg-blue-100 text-blue-800" :
                              row.status?.toLowerCase() === "pending" ? "bg-yellow-100 text-yellow-800" :
                              "bg-gray-100 text-gray-800"
                            )}>
                              {row.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <EditTripModal
        isOpen={editTripOpen}
        onClose={() => {
          setEditTripOpen(false)
          setCurrentTripForEdit(null)
        }}
        trip={currentTripForEdit}
        onUpdate={() => {
          setRefreshTrigger(prev => prev + 1)
        }}
      />

      {/* Change Driver Modal */}
      {changeDriverOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Change Driver</h3>
              <Button variant="ghost" size="sm" onClick={() => {
                setChangeDriverOpen(false);
                setDriverSearchTerm('');
              }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Current Trip: {currentTripForChange?.trip_id || currentTripForChange?.id}</p>
                <p className="text-sm text-gray-600 mb-2">Select a new driver:</p>
                <input
                  type="text"
                  placeholder="Search by surname..."
                  value={driverSearchTerm}
                  onChange={(e) => setDriverSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {availableDrivers
                  .filter(driver => 
                    driver.surname?.toLowerCase().includes(driverSearchTerm.toLowerCase()) ||
                    driver.first_name?.toLowerCase().includes(driverSearchTerm.toLowerCase())
                  )
                  .map((driver) => (
                  <div
                    key={driver.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={async () => {
                      if (!confirm(`Assign ${driver.first_name} ${driver.surname} to this trip?`)) return;
                      try {
                        const supabase = createClient();
                        const currentAssignments = currentTripForChange.vehicleassignments || currentTripForChange.vehicle_assignments || [];
                        const updatedAssignments = currentAssignments.map(assignment => ({
                          ...assignment,
                          drivers: [{ id: driver.id, name: `${driver.first_name} ${driver.surname}` }]
                        }));
                        
                        const { error } = await supabase
                          .from('trips')
                          .update({ 
                            vehicleassignments: updatedAssignments,
                            vehicle_assignments: updatedAssignments 
                          })
                          .eq('id', currentTripForChange.id);
                        
                        if (error) throw error;
                        alert('Driver changed successfully');
                        setChangeDriverOpen(false);
                        setRefreshTrigger(prev => prev + 1);
                      } catch (err) {
                        console.error('Failed to change driver:', err);
                        alert('Failed to change driver');
                      }
                    }}
                  >
                    <div>
                      <div className="font-medium">{driver.first_name} {driver.surname}</div>
                      <div className="text-sm text-gray-500">{driver.phone_number}</div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      driver.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {driver.available ? 'Available' : 'Busy'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Time Setting Modal */}
      {(pickupTimeOpen || dropoffTimeOpen) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">
                Set {timeType === 'pickup' ? 'Pickup' : 'Drop-off'} Time
              </h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setPickupTimeOpen(false);
                  setDropoffTimeOpen(false);
                  setSelectedTime('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Trip: {currentTripForTime?.trip_id || currentTripForTime?.id}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Select {timeType === 'pickup' ? 'pickup' : 'drop-off'} date and time:
                </p>
                <DateTimePicker
                  value={selectedTime}
                  onChange={setSelectedTime}
                  placeholder={`Select ${timeType} time`}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setPickupTimeOpen(false);
                    setDropoffTimeOpen(false);
                    setSelectedTime('');
                  }}
                >
                  Cancel
                </Button>
                {selectedTime && (
                  <Button 
                    variant="destructive" 
                    onClick={async () => {
                      try {
                        const supabase = createClient();
                        const field = timeType === 'pickup' ? 'pickup_locations' : 'dropoff_locations';
                        const locations = currentTripForTime[field] || currentTripForTime[field.replace('_', '')] || [];
                        
                        const updatedLocations = locations.length > 0 
                          ? locations.map((loc, index) => index === 0 ? { ...loc, scheduled_time: null } : loc)
                          : [];
                        
                        const { error } = await supabase
                          .from('trips')
                          .update({ [field]: updatedLocations })
                          .eq('id', currentTripForTime.id);
                        
                        if (error) throw error;
                        
                        alert(`${timeType === 'pickup' ? 'Pickup' : 'Drop-off'} time removed successfully`);
                        setPickupTimeOpen(false);
                        setDropoffTimeOpen(false);
                        setSelectedTime('');
                        setRefreshTrigger(prev => prev + 1);
                      } catch (err) {
                        console.error(`Failed to remove ${timeType} time:`, err);
                        alert(`Failed to remove ${timeType} time`);
                      }
                    }}
                  >
                    Remove
                  </Button>
                )}
                <Button 
                  onClick={async () => {
                    if (!selectedTime) {
                      alert('Please select a time');
                      return;
                    }
                    try {
                      const supabase = createClient();
                      const field = timeType === 'pickup' ? 'pickup_locations' : 'dropoff_locations';
                      const locations = currentTripForTime[field] || currentTripForTime[field.replace('_', '')] || [];
                      
                      const updatedLocations = locations.length > 0 
                        ? locations.map((loc, index) => index === 0 ? { ...loc, scheduled_time: selectedTime } : loc)
                        : [{ scheduled_time: selectedTime }];
                      
                      const { error } = await supabase
                        .from('trips')
                        .update({ [field]: updatedLocations })
                        .eq('id', currentTripForTime.id);
                      
                      if (error) throw error;
                      
                      alert(`${timeType === 'pickup' ? 'Pickup' : 'Drop-off'} time set successfully`);
                      setPickupTimeOpen(false);
                      setDropoffTimeOpen(false);
                      setSelectedTime('');
                      setRefreshTrigger(prev => prev + 1);
                    } catch (err) {
                      console.error(`Failed to set ${timeType} time:`, err);
                      alert(`Failed to set ${timeType} time`);
                    }
                  }}
                >
                  Save Time
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pre-define Google Maps Night Style */}
      {(() => {
        if (typeof window !== 'undefined' && !(window as any).__googleMapsNightStyle) {
          (window as any).__googleMapsNightStyle = [
            { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
            { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
            { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
            { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
            { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
            { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
            { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
            { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
            { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
            { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
            { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
            { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
            { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
            { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
            { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
          ];
        }
        return null;
      })()}

      {/* Map Modal */}
      {mapOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-7xl h-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 flex-shrink-0">
              <h3 className="text-lg font-semibold dark:text-white">Driver Location</h3>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const isDark = document.documentElement.classList.contains("dark");
                    if (isDark) {
                      document.documentElement.classList.remove("dark");
                    } else {
                      document.documentElement.classList.add("dark");
                    }
                    const gMap = (window as any).__gMapInstance;
                    if (gMap) {
                      const isNight = document.documentElement.classList.contains("dark");
                      gMap.setOptions({ styles: isNight ? (window as any).__googleMapsNightStyle : [] });
                    }
                  }}
                  className="gap-1"
                >
                  {(() => {
                    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains("dark");
                    return isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />;
                  })()}
                  <span className="hidden sm:inline">Map Theme</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setMapOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex flex-col lg:flex-row gap-4 p-4 flex-1 min-h-0">
              {/* Render Map First - Priority Loading */}
              <div className="flex-1 min-h-0 order-1 lg:order-2">
                <div 
                  id="driver-map" 
                  className="w-full h-full min-h-[400px] rounded border dark:border-gray-700 bg-slate-100 dark:bg-gray-800"
                  ref={(el) => {
                    if (el && mapData) {
                      el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;font-size:14px;"><div>Loading map...</div></div>';
                      
                      const initMap = () => {
                        if (!(window as any).google?.maps) {
                          const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
                          if (!existingScript) {
                            const script = document.createElement('script');
                            script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_TOKEN}&libraries=places`;
                            script.async = true;
                            script.onload = () => renderGoogleMap(el);
                            document.head.appendChild(script);
                          } else {
                            const checkGoogle = setInterval(() => {
                              if ((window as any).google?.maps) {
                                clearInterval(checkGoogle);
                                renderGoogleMap(el);
                              }
                            }, 100);
                          }
                        } else {
                          renderGoogleMap(el);
                        }
                      };

                      const renderGoogleMap = (container: HTMLElement) => {
                        container.innerHTML = '';
                        
                        const isNight = document.documentElement.classList.contains("dark");
                        const map = new (window as any).google.maps.Map(container, {
                          center: mapData.longitude && mapData.latitude ? 
                            { lat: parseFloat(mapData.latitude), lng: parseFloat(mapData.longitude) } : 
                            { lat: -26.2041, lng: 28.0473 },
                          zoom: mapData.showBasicRoute ? 10 : 15,
                          mapTypeId: 'roadmap',
                          styles: isNight ? (window as any).__googleMapsNightStyle : [],
                          mapTypeControl: false,
                          fullscreenControl: true,
                          streetViewControl: false,
                          zoomControl: true,
                        });
                        
                        (window as any).__gMapInstance = map;
                        const bounds = new (window as any).google.maps.LatLngBounds();
                        const infoWindows: any[] = [];

                        // Vehicle marker
                        let vehicleMarker: any = null;
                        if (!mapData.showRouteOnly && !mapData.showBasicRoute && mapData.longitude && mapData.latitude) {
                          const vehiclePos = { lat: parseFloat(mapData.latitude), lng: parseFloat(mapData.longitude) };
                          vehicleMarker = new (window as any).google.maps.Marker({
                            position: vehiclePos,
                            map: map,
                            icon: {
                              path: (window as any).google.maps.SymbolPath.CIRCLE,
                              scale: 10,
                              fillColor: '#3b82f6',
                              fillOpacity: 1,
                              strokeColor: '#ffffff',
                              strokeWeight: 3,
                            },
                            title: 'Vehicle',
                          });
                          bounds.extend(vehiclePos);
                        }

                        // Add high risk zones
                        if (mapData.highRiskZones?.length > 0) {
                          mapData.highRiskZones.forEach((area: any) => {
                            if (!area.polygon || area.polygon.length < 3) return;
                            const paths = area.polygon.map((coord: number[]) => ({
                              lat: coord[1],
                              lng: coord[0]
                            }));
                            new (window as any).google.maps.Polygon({
                              paths: paths,
                              map: map,
                              fillColor: '#ef4444',
                              fillOpacity: 0.3,
                              strokeColor: '#dc2626',
                              strokeWeight: 2,
                            });
                          });
                        }

                        // Add route coordinates
                        if (mapData.routeCoordinates?.length > 1) {
                          const routePath = mapData.routeCoordinates.map((coord: number[]) => ({
                            lat: coord[1],
                            lng: coord[0]
                          }));
                          
                          new (window as any).google.maps.Polyline({
                            path: routePath,
                            map: map,
                            strokeColor: '#3b82f6',
                            strokeWeight: 4,
                            strokeOpacity: 0.9,
                          });

                          // Start marker
                          const startPos = routePath[0];
                          new (window as any).google.maps.Marker({
                            position: startPos,
                            map: map,
                            icon: {
                              path: (window as any).google.maps.SymbolPath.CIRCLE,
                              scale: 8,
                              fillColor: '#22c55e',
                              fillOpacity: 1,
                              strokeColor: '#ffffff',
                              strokeWeight: 2,
                            },
                            title: 'Start',
                          });
                          bounds.extend(startPos);

                          // End marker
                          const endPos = routePath[routePath.length - 1];
                          new (window as any).google.maps.Marker({
                            position: endPos,
                            map: map,
                            icon: {
                              path: (window as any).google.maps.SymbolPath.CIRCLE,
                              scale: 8,
                              fillColor: '#ef4444',
                              fillOpacity: 1,
                              strokeColor: '#ffffff',
                              strokeWeight: 2,
                            },
                            title: 'End',
                          });
                          bounds.extend(endPos);

                          // Extend bounds for all route points
                          routePath.forEach((p: any) => bounds.extend(p));
                        }

                        // Add stop points
                        if (mapData.stopPoints?.length > 0) {
                          mapData.stopPoints.forEach((stopPoint: any, index: number) => {
                            if (stopPoint.polygon?.length > 2) {
                              const paths = stopPoint.polygon.map((coord: number[]) => ({
                                lat: coord[1],
                                lng: coord[0]
                              }));
                              new (window as any).google.maps.Polygon({
                                paths: paths,
                                map: map,
                                fillColor: '#fbbf24',
                                fillOpacity: 0.3,
                                strokeColor: '#f59e0b',
                                strokeWeight: 2,
                              });
                            }
                            
                            if (stopPoint.coordinates) {
                              const pos = { lat: stopPoint.coordinates[1], lng: stopPoint.coordinates[0] };
                              const marker = new (window as any).google.maps.Marker({
                                position: pos,
                                map: map,
                                label: `${index + 1}`,
                                icon: {
                                  path: (window as any).google.maps.SymbolPath.CIRCLE,
                                  scale: 7,
                                  fillColor: '#f59e0b',
                                  fillOpacity: 1,
                                  strokeColor: '#ffffff',
                                  strokeWeight: 2,
                                },
                                title: stopPoint.name,
                              });
                              bounds.extend(pos);
                              
                              const iw = new (window as any).google.maps.InfoWindow({
                                content: `<div style="padding:8px;font-size:13px"><strong>Stop Point ${index + 1}</strong><br/>${stopPoint.name}</div>`,
                              });
                              marker.addListener('click', () => iw.open(map, marker));
                              infoWindows.push(iw);
                            }
                          });
                        }

                        // Fit bounds
                        if (mapData.routeCoordinates?.length > 1) {
                          map.fitBounds(bounds, 50);
                        } else if (vehicleMarker) {
                          map.setCenter(vehicleMarker.getPosition());
                          map.setZoom(15);
                        }

                        // Info window for vehicle
                        if (mapData.driverDetails && vehicleMarker) {
                          const iw = new (window as any).google.maps.InfoWindow({
                            content: `
                              <div style="padding:12px;max-width:250px;font-family:sans-serif;">
                                <div style="font-weight:bold;color:#1e3a5f;margin-bottom:8px;font-size:14px;">${mapData.driverDetails.fullName}</div>
                                <div style="font-size:13px;line-height:1.6;">
                                  <div><strong>Vehicle:</strong> ${mapData.driverDetails.plate}</div>
                                  <div><strong>Speed:</strong> ${mapData.driverDetails.speed} km/h</div>
                                  <div><strong>Company:</strong> ${mapData.driverDetails.company || 'N/A'}</div>
                                  <div style="font-size:11px;color:#666;margin-top:8px;">
                                    Last updated: ${new Date(mapData.driverDetails.lastUpdate).toLocaleTimeString()}
                                  </div>
                                </div>
                              </div>
                            `,
                          });
                          vehicleMarker.addListener('click', () => iw.open(map, vehicleMarker));
                          infoWindows.push(iw);
                        }

                        // Route overlay info for route-only / basic route
                        if (mapData.showRouteOnly || mapData.showBasicRoute) {
                          const infoDiv = document.createElement('div');
                          infoDiv.style.cssText = 'position:absolute;top:10px;left:10px;background:white;padding:12px;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.15);font-size:13px;z-index:1;max-width:250px;';
                          if (mapData.showRouteOnly) {
                            infoDiv.innerHTML = `
                              <div style="font-weight:bold;color:#1e3a5f;margin-bottom:4px;">${mapData.driverDetails?.fullName || 'Driver'}</div>
                              <div style="color:#666;">Pre-planned route</div>
                              <div style="font-size:11px;color:#999;margin-top:4px;">Vehicle location unavailable</div>
                            `;
                          } else {
                            infoDiv.innerHTML = `
                              <div style="font-weight:bold;color:#1e3a5f;margin-bottom:4px;">${mapData.driverDetails?.fullName || 'Driver'}</div>
                              <div style="color:#666;">Trip Route</div>
                              <div style="font-size:11px;color:#999;margin-top:4px;">No GPS tracking available</div>
                            `;
                          }
                          map.controls[(window as any).google.maps.ControlPosition.TOP_LEFT].push(infoDiv);
                        }

                        // Basic route via Google Maps Directions Service
                        if (mapData.showBasicRoute && mapData.origin && mapData.destination) {
                          const directionsService = new (window as any).google.maps.DirectionsService();
                          const directionsRenderer = new (window as any).google.maps.DirectionsRenderer({
                            map: map,
                            suppressMarkers: true,
                            polylineOptions: {
                              strokeColor: '#3b82f6',
                              strokeWeight: 4,
                              strokeOpacity: 0.9,
                            },
                          });
                          
                          directionsService.route(
                            {
                              origin: mapData.origin,
                              destination: mapData.destination,
                              travelMode: (window as any).google.maps.TravelMode.DRIVING,
                            },
                            (result: any, status: string) => {
                              if (status === 'OK') {
                                directionsRenderer.setDirections(result);
                                const route = result.routes[0];
                                const path = route.overview_path;
                                const routeBounds = new (window as any).google.maps.LatLngBounds();
                                path.forEach((p: any) => routeBounds.extend(p));
                                map.fitBounds(routeBounds, 50);

                                // Origin marker
                                new (window as any).google.maps.Marker({
                                  position: path[0],
                                  map: map,
                                  icon: {
                                    path: (window as any).google.maps.SymbolPath.CIRCLE,
                                    scale: 8,
                                    fillColor: '#22c55e',
                                    fillOpacity: 1,
                                    strokeColor: '#ffffff',
                                    strokeWeight: 2,
                                  },
                                  title: 'Origin',
                                });

                                // Destination marker
                                new (window as any).google.maps.Marker({
                                  position: path[path.length - 1],
                                  map: map,
                                  icon: {
                                    path: (window as any).google.maps.SymbolPath.CIRCLE,
                                    scale: 8,
                                    fillColor: '#ef4444',
                                    fillOpacity: 1,
                                    strokeColor: '#ffffff',
                                    strokeWeight: 2,
                                  },
                                  title: 'Destination',
                                });
                              }
                            }
                          );
                        }
                      };

                      if ('requestIdleCallback' in window) {
                        requestIdleCallback(initMap);
                      } else {
                        initMap();
                      }
                    }
                  }}
                />
              </div>
              
              {/* Driver Information Panel - Load After Map */}
              <div className="w-full lg:w-80 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg flex-shrink-0 max-h-64 lg:max-h-none overflow-y-auto order-2 lg:order-1">
                <h4 className="font-semibold mb-3 dark:text-white">Driver Information</h4>
                {mapData?.driverDetails && (
                  <div className="space-y-3 text-sm">
                    <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg">
                      <div className="font-medium text-blue-900 dark:text-blue-300">{mapData.driverDetails.fullName}</div>
                      <div className="text-blue-700 dark:text-blue-400 text-xs">Vehicle: {mapData.driverDetails.plate}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Speed:</span>
                        <span className="font-medium dark:text-white">{mapData.driverDetails.speed} km/h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Mileage:</span>
                        <span className="font-medium dark:text-white">{parseFloat(mapData.driverDetails.mileage || 0).toLocaleString()} km</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        <div className="font-medium mb-1">Current Location:</div>
                        <div>{mapData.driverDetails.address}</div>
                      </div>
                      {mapData.driverDetails.geozone && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          <div className="font-medium mb-1">Geozone:</div>
                          <div>{mapData.driverDetails.geozone}</div>
                        </div>
                      )}
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        <div className="font-medium mb-1">Last Update:</div>
                        <div>{new Date(mapData.driverDetails.lastUpdate).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trip Details Modal */}
      {tripDetailsOpen && selectedTrip && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
              <h3 className="text-lg font-semibold">Trip Summary - {selectedTrip.trip_id}</h3>
              <Button variant="ghost" size="sm" onClick={() => {
                setTripDetailsOpen(false)
                setSelectedTrip(null)
              }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Trip Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Order #:</span>
                      <span className="font-medium">{selectedTrip.ordernumber || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Status:</span>
                      <Badge variant={selectedTrip.status === 'delivered' ? 'default' : 'secondary'}>
                        {selectedTrip.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Distance:</span>
                      <span className="font-medium">{selectedTrip.actual_distance?.toFixed(1) || 'N/A'} km</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Financial</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Rate:</span>
                      <span className="font-medium text-green-600">
                        {selectedTrip.selling_rate_per_km ? `R${parseFloat(selectedTrip.selling_rate_per_km).toLocaleString('en-ZA')}` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Cost:</span>
                      <span className="font-medium text-green-600">
                        R{selectedTrip.actual_total_cost?.toLocaleString('en-ZA', { minimumFractionDigits: 2 }) || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Fuel Price:</span>
                      <span className="font-medium">R{selectedTrip.fuel_price_used || 'N/A'}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Vehicle & Driver</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Vehicle Type:</span>
                      <span className="font-medium">{selectedTrip.vehicle_type || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Updated:</span>
                      <span className="font-medium">
                        {selectedTrip.updated_at ? new Date(selectedTrip.updated_at).toLocaleDateString('en-ZA') : 'N/A'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Route Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-gray-600">Origin</h4>
                      <p className="text-sm bg-green-50 p-2 rounded border-l-2 border-green-500">
                        {selectedTrip.origin || 'N/A'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-gray-600">Destination</h4>
                      <p className="text-sm bg-red-50 p-2 rounded border-l-2 border-red-500">
                        {selectedTrip.destination || 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Client Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Client:</span>
                      <p className="text-sm font-medium">{selectedTrip.selectedclient || selectedTrip.selected_client || 'N/A'}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Cargo Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Cargo Type:</span>
                      <p className="text-sm font-medium">{selectedTrip.cargo || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Weight:</span>
                      <p className="text-sm font-medium">{selectedTrip.cargo_weight || selectedTrip.cargoweight || 'N/A'}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {selectedTrip.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Trip Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm bg-blue-50 p-3 rounded">{selectedTrip.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Unauthorized Stop Note Modal */}
      {unauthorizedStopModalOpen && currentUnauthorizedTrip && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-red-800">Unauthorized Stop Detected</h3>
              <Button variant="ghost" size="sm" onClick={() => {
                setUnauthorizedStopModalOpen(false)
                setCurrentUnauthorizedTrip(null)
                setUnauthorizedStopNote('')
              }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-red-50 p-3 rounded border-l-4 border-red-500">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="font-medium text-red-800">Trip #{currentUnauthorizedTrip.trip_id || currentUnauthorizedTrip.id}</span>
                </div>
                <p className="text-sm text-red-700">
                  {currentUnauthorizedTrip.unauthorized_stops_count} unauthorized stop{currentUnauthorizedTrip.unauthorized_stops_count > 1 ? 's' : ''} detected
                </p>
                {(() => {
                  const routePoints = currentUnauthorizedTrip.route_points || []
                  const lastPoint = routePoints[routePoints.length - 1]
                  return lastPoint && (
                    <div className="mt-2 text-xs text-red-600">
                      <div>Last Location: {lastPoint.lat?.toFixed(6)}, {lastPoint.lng?.toFixed(6)}</div>
                      <div>Time: {new Date(lastPoint.datetime).toLocaleString()}</div>
                      <div>Speed: {lastPoint.speed} km/h</div>
                    </div>
                  )
                })()}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add Note for Unauthorized Stop:
                </label>
                <textarea
                  value={unauthorizedStopNote}
                  onChange={(e) => setUnauthorizedStopNote(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={3}
                  placeholder="Enter details about the unauthorized stop..."
                />
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  onClick={async () => {
                    try {
                      const supabase = createClient()
                      // Clear unauthorized stops count when dismissing
                      const { error } = await supabase
                        .from('trips')
                        .update({ unauthorized_stops_count: 0 })
                        .eq('id', currentUnauthorizedTrip.id)
                      
                      if (error) throw error
                      
                      setUnauthorizedStopModalOpen(false)
                      setCurrentUnauthorizedTrip(null)
                      setUnauthorizedStopNote('')
                      setRefreshTrigger(prev => prev + 1)
                    } catch (err) {
                      console.error('Failed to dismiss alert:', err)
                      alert('Failed to dismiss alert')
                    }
                  }}
                >
                  Dismiss
                </Button>
                <Button 
                  onClick={async () => {
                    try {
                      const supabase = createClient()
                      const noteToAdd = `[UNAUTHORIZED STOP] ${new Date().toLocaleString()}: ${unauthorizedStopNote}`
                      const existingNotes = currentUnauthorizedTrip.status_notes || ''
                      const updatedNotes = existingNotes ? `${existingNotes}\n${noteToAdd}` : noteToAdd
                      
                      // Clear unauthorized stops count when adding note
                      const { error } = await supabase
                        .from('trips')
                        .update({ 
                          status_notes: updatedNotes,
                          unauthorized_stops_count: 0
                        })
                        .eq('id', currentUnauthorizedTrip.id)
                      
                      if (error) throw error
                      
                      setUnauthorizedStopModalOpen(false)
                      setCurrentUnauthorizedTrip(null)
                      setUnauthorizedStopNote('')
                      setRefreshTrigger(prev => prev + 1)
                    } catch (err) {
                      console.error('Failed to add note:', err)
                      alert('Failed to add note')
                    }
                  }}
                >
                  Add Note
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Photos Modal */}
      {photosModalOpen && currentTripPhotos && (
        <div className="fixed inset-0 bg-gray-900/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="bg-gray-50 border-b px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Loading Documentation</h2>
                  <p className="text-sm text-gray-600">Trip #{currentTripPhotos.tripId}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => {
                  setPhotosModalOpen(false);
                  setCurrentTripPhotos(null);
                }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="overflow-y-auto max-h-[calc(90vh-80px)] bg-gray-50">
              {(currentTripPhotos.before.length > 0 || currentTripPhotos.during.length > 0) ? (
                <div className="grid grid-cols-1 lg:grid-cols-2">
                  <div className="p-6 border-r border-gray-200">
                    <div className="mb-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-1">Before Loading</h3>
                      <p className="text-sm text-gray-500">{currentTripPhotos.before.length} photos</p>
                    </div>
                    {currentTripPhotos.before.length > 0 ? (
                      <div className="grid grid-cols-2 gap-4">
                        {currentTripPhotos.before.map((photo, index) => (
                          <div key={index} className="group cursor-pointer" onClick={() => window.open(photo.url, '_blank')}>
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                              <img 
                                src={photo.url} 
                                alt={`Before ${index + 1}`}
                                className="w-full h-32 object-cover"
                              />
                              <div className="p-3">
                                <p className="text-xs text-gray-600 truncate">{photo.name}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p className="text-sm">No photos available</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-1">During Loading</h3>
                      <p className="text-sm text-gray-500">{currentTripPhotos.during.length} photos</p>
                    </div>
                    {currentTripPhotos.during.length > 0 ? (
                      <div className="grid grid-cols-2 gap-4">
                        {currentTripPhotos.during.map((photo, index) => (
                          <div key={index} className="group cursor-pointer" onClick={() => window.open(photo.url, '_blank')}>
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                              <img 
                                src={photo.url} 
                                alt={`During ${index + 1}`}
                                className="w-full h-32 object-cover"
                              />
                              <div className="p-3">
                                <p className="text-xs text-gray-600 truncate">{photo.name}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p className="text-sm">No photos available</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="text-gray-400 mb-4">
                    <FileText className="w-12 h-12 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Photos Available</h3>
                  <p className="text-gray-500">No loading documentation found for this trip.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Alerts Modal */}
      {alertsModalOpen && currentTripAlerts && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-200 w-full max-w-3xl max-h-[85vh] overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">Alerts</h2>
                    <p className="text-xs text-gray-500">Trip #{currentTripAlerts.tripId}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setAlertsModalOpen(false);
                    setCurrentTripAlerts(null);
                  }}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
            
            {/* Alerts List */}
            <div className="overflow-y-auto max-h-[calc(85vh-80px)]">
              {currentTripAlerts.alerts && currentTripAlerts.alerts.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {currentTripAlerts.alerts.map((alert, index) => {
                    const isLatest = index === currentTripAlerts.alerts.length - 1;
                    const alertMessage = typeof alert === 'object' ? alert.message : alert;
                    
                    // Parse vehicle and location from message
                    const vehicleMatch = alertMessage.match(/Vehicle ([A-Z0-9]+)/);
                    const locationMatch = alertMessage.match(/at ([^:]+): ([^|]+)/);
                    const geozoneMatch = alertMessage.match(/Geozone: ([^,]+)/);
                    
                    const vehicle = vehicleMatch ? vehicleMatch[1] : null;
                    const location = locationMatch ? locationMatch[2].trim() : null;
                    const geozone = geozoneMatch ? geozoneMatch[1].trim() : null;
                    
                    return (
                      <div key={index} className={cn(
                        "p-4 transition-colors hover:bg-gray-50",
                        isLatest && "bg-red-50"
                      )}>
                        <div className="flex gap-3">
                          {/* Avatar */}
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                            isLatest ? "bg-red-500" : "bg-gray-400"
                          )}>
                            <span className="text-white text-xs font-bold">
                              {vehicle ? vehicle.slice(-2) : "!"}
                            </span>
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {vehicle && (
                                <span className="text-sm font-semibold text-gray-900">
                                  {vehicle}
                                </span>
                              )}
                              {isLatest && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                                  New
                                </span>
                              )}
                              <span className="text-xs text-gray-500 ml-auto">
                                {typeof alert === 'object' && alert.timestamp ? 
                                  new Date(alert.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) :
                                  'now'
                                }
                              </span>
                            </div>
                            
                            <p className="text-sm text-gray-700 mb-2">
                              {location || 'At toll gate'}
                            </p>
                            
                            {geozone && (
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <MapPin className="w-3 h-3" />
                                <span className="truncate">{geozone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 px-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No alerts</h3>
                  <p className="text-xs text-gray-500">All clear for this trip</p>
                </div>
              )}
            </div>
            
            {/* Action Bar */}
            <div className="border-t border-gray-100 p-4 bg-gray-50">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Add reason for delay..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      const reason = e.target.value.trim();
                      console.log('Delay reason:', reason);
                      e.target.value = '';
                    }
                  }}
                />
                <button
                  onClick={(e) => {
                    const input = e.target.parentElement.querySelector('input');
                    if (input.value.trim()) {
                      const reason = input.value.trim();
                      console.log('Delay reason:', reason);
                      input.value = '';
                    }
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                >
                  Add Reason
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Close Trip Modal */}
      {closeTripOpen && currentTripForClose && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-red-800">Close Trip</h3>
              <Button variant="ghost" size="sm" onClick={() => {
                setCloseTripOpen(false);
                setCurrentTripForClose(null);
                setCloseReason('');
              }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-yellow-50 p-3 rounded border-l-4 border-yellow-500">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span className="font-medium text-yellow-800">Trip #{currentTripForClose.trip_id || currentTripForClose.id}</span>
                </div>
                <p className="text-sm text-yellow-700">
                  This will mark the trip as completed before all steps are finished.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for closing trip early: *
                </label>
                <textarea
                  value={closeReason}
                  onChange={(e) => setCloseReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={3}
                  placeholder="Please provide a detailed reason for closing this trip early..."
                  required
                />
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setCloseTripOpen(false);
                    setCurrentTripForClose(null);
                    setCloseReason('');
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  disabled={!closeReason.trim()}
                  onClick={async () => {
                    if (!closeReason.trim()) return;
                    
                    try {
                      const supabase = createClient();
                      
                      // Get user email from cookies
                      const getCookie = (name: string) => {
                        const value = `; ${document.cookie}`;
                        const parts = value.split(`; ${name}=`);
                        if (parts.length === 2) return parts.pop()?.split(";").shift();
                        return null;
                      };
                      const userEmail = decodeURIComponent(getCookie("email") || "unknown@user.com");
                      
                      const closeNote = `Completed by: ${userEmail}\nReason: ${closeReason.trim()}`;
                      const existingNotes = currentTripForClose.statusnotes || currentTripForClose.status_notes || '';
                      const updatedNotes = existingNotes ? `${existingNotes}\n\n[TRIP COMPLETED EARLY] ${new Date().toLocaleString()}\n${closeNote}` : `[TRIP COMPLETED EARLY] ${new Date().toLocaleString()}\n${closeNote}`;
                      
                      // Update status history
                      const currentHistory = currentTripForClose.status_history || [];
                      const newHistory = [...currentHistory, `${new Date().toISOString()}: completed (early closure by ${userEmail})`];
                      
                      const { error } = await supabase
                        .from('trips')
                        .update({ 
                          status: 'completed',
                          statusnotes: updatedNotes,
                          status_history: newHistory,
                          updated_at: new Date().toISOString()
                        })
                        .eq('id', currentTripForClose.id);
                      
                      if (error) throw error;
                      
                      setCloseTripOpen(false);
                      setCurrentTripForClose(null);
                      setCloseReason('');
                      setRefreshTrigger(prev => prev + 1);
                      
                      // Success dialog
                      setTimeout(() => {
                        const successDialog = document.createElement('div');
                        successDialog.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4';
                        successDialog.innerHTML = `
                          <div class="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
                            <div class="text-center">
                              <div class="w-12 h-12 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                              </div>
                              <h3 class="text-lg font-semibold text-gray-900 mb-2">Trip Completed</h3>
                              <p class="text-sm text-gray-600 mb-4">The trip has been marked as completed successfully.</p>
                              <button onclick="this.parentElement.parentElement.parentElement.remove()" class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                                OK
                              </button>
                            </div>
                          </div>
                        `;
                        document.body.appendChild(successDialog);
                      }, 100);
                      
                    } catch (err) {
                      console.error('Failed to close trip:', err);
                      
                      // Error dialog
                      const errorDialog = document.createElement('div');
                      errorDialog.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4';
                      errorDialog.innerHTML = `
                        <div class="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
                          <div class="text-center">
                            <div class="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                              <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                              </svg>
                            </div>
                            <h3 class="text-lg font-semibold text-gray-900 mb-2">Error</h3>
                            <p class="text-sm text-gray-600 mb-4">Failed to close the trip. Please try again.</p>
                            <button onclick="this.parentElement.parentElement.parentElement.remove()" class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
                              OK
                            </button>
                          </div>
                        </div>
                      `;
                      document.body.appendChild(errorDialog);
                    }
                  }}
                >
                  Complete Trip
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <EditTripModal
        isOpen={approvalModalOpen}
        onClose={() => {
          setApprovalModalOpen(false)
          setCurrentTripForApproval(null)
        }}
        trip={currentTripForApproval}
        onUpdate={() => {
          setRefreshTrigger(prev => prev + 1)
        }}
        readOnly={true}
        showApprovalButtons={true}
        onApprove={async () => {
          try {
            const supabase = createClient();

            // Fetch pending changes from trip history
            const { data: historyData } = await supabase
              .from('trip_history')
              .select('new_data')
              .eq('trip_id', currentTripForApproval.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            const pendingRate = historyData?.new_data?._pending_rate;
            const pendingProgressStops = historyData?.new_data?._pending_progress_stops;

            const updatePayload: any = { elevate: false };
            if (pendingRate != null) {
              updatePayload.selling_rate_per_km = pendingRate;
            }
            if (pendingProgressStops != null) {
              updatePayload.progress_stops = pendingProgressStops;
            }

            const { error } = await supabase
              .from('trips')
              .update(updatePayload)
              .eq('id', currentTripForApproval.id);
            
            if (error) throw error;
            
            setApprovalModalOpen(false);
            setCurrentTripForApproval(null);
            setRefreshTrigger(prev => prev + 1);
          } catch (err) {
            console.error('Error approving trip:', err);
            alert('Failed to approve trip');
          }
        }}
        onDecline={async () => {
          try {
            const supabase = createClient();
            
            // Get the most recent history entry to restore previous data
            const { data: historyData } = await supabase
              .from('trip_history')
              .select('previous_data')
              .eq('trip_id', currentTripForApproval.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            
            let updateData = {
              elevate: false,
              status_notes: (currentTripForApproval.status_notes || '') + '\n[DECLINED] Trip edit declined by management'
            };
            
            // If we have previous data, restore it
            if (historyData?.previous_data) {
              updateData = {
                ...historyData.previous_data,
                elevate: false,
                status_notes: (historyData.previous_data.status_notes || '') + '\n[DECLINED] Trip edit declined - reverted to previous version'
              };
            }
            
            const { error } = await supabase
              .from('trips')
              .update(updateData)
              .eq('id', currentTripForApproval.id);
            
            if (error) throw error;
            
            setApprovalModalOpen(false);
            setCurrentTripForApproval(null);
            setRefreshTrigger(prev => prev + 1);
          } catch (err) {
            console.error('Error declining trip:', err);
            alert('Failed to decline trip');
          }
        }}
      />

      <VehicleCameraModal
        open={videoModalOpen}
        onOpenChange={setVideoModalOpen}
        deviceId={currentTripForVideo?.deviceId || null}
        registration={currentTripForVideo?.registration || ''}
        vehicleName={currentTripForVideo?.vehicleName || ''}
      />
    </>
  );
}