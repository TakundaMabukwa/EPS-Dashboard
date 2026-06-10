"use client";

import { useState, useEffect, useRef } from "react";
import {
  Truck,
  Users,
  DollarSign,
  Map as MapIcon,
  Clock,
  Fuel,
  BarChart3,
  Activity,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Calendar,
} from "lucide-react";
import { useGoogleMaps } from "@/hooks/use-google-maps";

interface DriversCount {
  total: number;
  available: number;
  unavailable: number;
}

interface TrucksCount {
  total: number;
  booked: number;
  available: number;
}

interface RevenueData {
  months: { month: string; total_revenue: number; trip_count: number }[];
  total: number;
}

export default function ExecutiveReportTab() {
  const [drivers, setDrivers] = useState<DriversCount>({ total: 0, available: 0, unavailable: 0 });
  const [trucks, setTrucks] = useState<TrucksCount>({ total: 0, booked: 0, available: 0 });
  const [revenue, setRevenue] = useState<RevenueData>({ months: [], total: 0 });
  const [activeTrips, setActiveTrips] = useState<any[]>([]);
  const [etaVehicles, setEtaVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const { loaded: mapsLoaded } = useGoogleMaps();

  useEffect(() => {
    async function fetchData() {
      try {
        const [driversRes, revenueRes, trucksRes, tripsRes, etaRes] = await Promise.all([
          fetch('/api/executive/drivers-count'),
          fetch('/api/executive/revenue'),
          fetch('/api/executive/trucks-count'),
          fetch('/api/executive/active-trips'),
          fetch('/api/executive/eta'),
        ]);

        if (driversRes.ok) {
          const d = await driversRes.json();
          setDrivers(d);
        }

        if (revenueRes.ok) {
          const r = await revenueRes.json();
          setRevenue(r);
        }

        if (trucksRes.ok) {
          const t = await trucksRes.json();
          setTrucks(t);
        }

        if (tripsRes.ok) {
          const t = await tripsRes.json();
          setActiveTrips(t);
        }

        if (etaRes.ok) {
          const e = await etaRes.json();
          setEtaVehicles(e);
        }
      } catch (err) {
        console.error('Failed to fetch executive data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Initialize Google Map
  useEffect(() => {
    if (!mapsLoaded || !mapContainerRef.current || mapRef.current) return;

    const gm = (window as any).google.maps;
    const map = new gm.Map(mapContainerRef.current, {
      center: { lat: -30.5595, lng: 22.9375 },
      zoom: 6,
      mapTypeId: gm.MapTypeId.ROADMAP,
      disableDefaultUI: true,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
    });
    mapRef.current = map;

    // Trigger resize after init
    setTimeout(() => {
      gm.event.trigger(map, 'resize');
    }, 100);
  }, [mapsLoaded]);

  // Add vehicle markers when trips load
  useEffect(() => {
    if (!mapRef.current || !activeTrips.length) return;
    const gm = (window as any).google.maps;

    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const bounds = new gm.LatLngBounds();
    let hasValidPosition = false;

    activeTrips.forEach((trip) => {
      const lat = trip.latitude;
      const lng = trip.longitude;
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

      hasValidPosition = true;
      const latLng = new gm.LatLng(lat, lng);
      bounds.extend(latLng);

      const marker = new gm.Marker({
        position: latLng,
        map: mapRef.current,
        icon: {
          path: gm.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#2563eb",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
        title: trip.trip_id,
      });

      const info = new gm.InfoWindow({
        content: `<div style="font-size:12px;padding:4px">
          <strong>${trip.registration}</strong><br/>
          ${trip.origin?.split(',')[0] || ''} → ${trip.destination?.split(',')[0] || ''}<br/>
          <span style="color:#666">${trip.driver_name || 'No driver'} • ${trip.speed > 0 ? Math.round(trip.speed) + ' km/h' : 'Idle'}</span>
        </div>`,
      });

      marker.addListener("click", () => info.open(mapRef.current, marker));
      markersRef.current.push(marker);
    });

    if (hasValidPosition) {
      mapRef.current.fitBounds(bounds, 50);
    }
  }, [activeTrips]);

  // Build monthly revenue bars for the chart
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentYear = new Date().getFullYear();
  const monthlyMap = new Map<string, number>();
  revenue.months.forEach((m) => {
    const d = new Date(m.month);
    if (d.getFullYear() === currentYear) {
      monthlyMap.set(d.getMonth(), m.total_revenue);
    }
  });

  const maxRevenue = Math.max(...Array.from(monthlyMap.values()), 1);

  // Calculate change vs previous month
  const currentMonthIdx = new Date().getMonth();
  const currentRevenue = monthlyMap.get(currentMonthIdx) || 0;
  const prevRevenue = monthlyMap.get(currentMonthIdx - 1) || monthlyMap.get(11) || 0;
  const revenueChange = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue * 100) : 0;

  const fmt = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 0 });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Fleet Control Overview</h2>
          <p className="text-sm text-gray-500">Real-time operational status for Terminal HQ</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600">
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Top Row - Stats */}
      <div className="grid grid-cols-3 gap-4">
        {/* Trucks - live */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Truck className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Trucks</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Fleet</span>
              <span className="text-sm font-semibold text-gray-900">
                {loading ? '--' : trucks.total}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-gray-600">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Booked
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {loading ? '--' : trucks.booked}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-gray-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Available
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {loading ? '--' : trucks.available}
              </span>
            </div>
          </div>
        </div>

        {/* Drivers - live */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Drivers</span>
          </div>
          <div className="mb-3">
            <span className="text-4xl font-bold text-gray-900">
              {loading ? '--' : drivers.available}
            </span>
            <span className="ml-2 text-sm text-gray-500">Available Today</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-red-600">
            <AlertTriangle className="h-3 w-3" />
            <span>
              {loading ? '--' : drivers.unavailable} Drivers Unavailable (On Leave/Sick)
            </span>
          </div>
        </div>

        {/* Total Value of Goods - live */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Total Value of Goods</span>
            </div>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </div>
          <div className="mb-1">
            <span className="text-3xl font-bold text-gray-900">
              {loading ? '--' : `R${fmt(revenue.total)}`}
            </span>
          </div>
          <div className="mb-3 flex items-center gap-1 text-xs text-emerald-600">
            <TrendingUp className="h-3 w-3" />
            <span>{loading ? '--' : `${revenueChange >= 0 ? '+' : ''}${revenueChange.toFixed(1)}% vs last month`}</span>
          </div>
          {/* Monthly bar chart */}
          <div className="flex items-end gap-[3px]">
            {months.map((m, i) => {
              const val = monthlyMap.get(i) || 0;
              const h = val > 0 ? Math.max(4, (val / maxRevenue) * 48) : 4;
              return (
                <div key={m} className="group relative flex-1">
                  <div
                    className="rounded-sm bg-gray-800 transition-all hover:bg-gray-600"
                    style={{ height: `${h}px` }}
                  />
                  <div className="pointer-events-none absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-1.5 py-0.5 text-[10px] text-white group-hover:block">
                    R{fmt(val)}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-1 flex justify-between">
            {months.map((m) => (
              <span key={m} className="flex-1 text-center text-[8px] text-gray-400">
                {m[0]}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Middle Row - Map + Forecast */}
      <div className="grid grid-cols-3 gap-4">
        {/* En-route Status */}
        <div className="col-span-2 overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <MapIcon className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">En-route Status</span>
            </div>
            <div className="flex gap-1">
              <button className="rounded-md bg-gray-900 px-3 py-1 text-xs font-medium text-white">
                Live View
              </button>
              <button className="rounded-md px-3 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100">
                Full Map
              </button>
            </div>
          </div>
          <div className="relative" style={{ height: '320px' }}>
            {!mapsLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <p className="text-sm text-gray-500">Loading map...</p>
              </div>
            )}
            <div ref={mapContainerRef} className="absolute inset-0" style={{ height: '100%', width: '100%' }} />
            {/* Alerts overlay */}
            <div className="absolute left-3 top-3 z-10 rounded-lg bg-white/95 p-2.5 shadow-md">
              <p className="mb-1.5 text-xs font-semibold text-gray-700">Active Vehicles ({activeTrips.length})</p>
              {activeTrips.slice(0, 3).map((trip, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className={`h-2 w-2 rounded-full ${(trip.speed || 0) > 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span>{trip.registration} - {trip.speed > 0 ? `${Math.round(trip.speed)} km/h` : 'Idle'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Availability Forecast */}
        <div className="flex flex-col rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Availability Forecast</span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">Soonest arrivals first (Google Distance Matrix)</p>
          </div>
          <div className="flex-1 space-y-3 p-4 overflow-y-auto" style={{ maxHeight: '240px' }}>
            {etaVehicles.slice(0, 6).map((v, i) => {
              const eta = new Date(v.estimated_arrival_at);
              const now = new Date();
              const minsLeft = Math.max(0, Math.round((eta.getTime() - now.getTime()) / 60000));
              const hrs = Math.floor(minsLeft / 60);
              const mins = minsLeft % 60;
              const etaStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
              return (
                <div key={i} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{v.registration}</p>
                    <p className="truncate text-xs text-gray-500">
                      {v.destination_address}
                    </p>
                    <p className="text-xs text-gray-400">
                      {v.distance_text} • {v.duration_text}
                      {v.driver_name ? ` • ${v.driver_name}` : ''}
                    </p>
                  </div>
                  <span className={`ml-2 shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                    minsLeft <= 15
                      ? 'bg-emerald-50 text-emerald-700'
                      : minsLeft <= 60
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-blue-50 text-blue-700'
                  }`}>
                    {etaStr}
                  </span>
                </div>
              );
            })}
            {etaVehicles.length === 0 && (
              <p className="text-sm text-gray-400">No ETA data available</p>
            )}
          </div>
          <div className="border-t border-gray-100 px-4 py-2.5">
            <button className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900">
              View All Forecasts <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Fuel Management */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Fuel className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Fuel Management</span>
          </div>
          <div className="mb-3 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Total Used</p>
              <p className="text-xl font-bold text-gray-900">4,500L</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Refills Today</p>
              <p className="text-xl font-bold text-gray-900">18</p>
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs text-gray-500">Consumption Efficiency</span>
              <span className="flex items-center gap-0.5 text-xs text-emerald-600">
                <TrendingUp className="h-3 w-3" />+2.4%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div className="h-2 rounded-full bg-emerald-500" style={{ width: "72%" }} />
            </div>
          </div>
        </div>

        {/* CPK Efficiency */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">CPK Efficiency</span>
          </div>
          <div className="space-y-3">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs text-gray-500">Planned CPK</span>
                <span className="text-sm font-semibold text-gray-900">R1.15</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div className="h-2 rounded-full bg-gray-700" style={{ width: "85%" }} />
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs text-gray-500">Actual CPK</span>
                <span className="text-sm font-semibold text-gray-900">R1.22</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div className="h-2 rounded-full bg-red-500" style={{ width: "92%" }} />
              </div>
            </div>
          </div>
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            ⚠ Warning: Operational costs are 6.1% above projections this period
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Recent Activity</span>
            </div>
            <button className="text-xs font-medium text-gray-500 hover:text-gray-900">View All</button>
          </div>
          <div className="space-y-3">
            {[
              { type: "cancelled", trip: "Trip #TR-882 Cancelled", route: "Chicago → NY", detail: "Warehouse Lockout (15 min delay)", time: "12:12 PM" },
              { type: "modified", trip: "Modified (ETA Changed)", route: "Trip #TR-884 Arr → Wed 12:30 PM", detail: "(+2h)", time: "12:12 PM" },
              { type: "dispatched", trip: "Trip Dispatched", route: "Route: Miami → Dallas", detail: "Driver: A. King", time: "09:45 AM" },
            ].map((item, i) => (
              <div key={i} className="flex gap-2.5">
                <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  item.type === "cancelled" ? "bg-red-500" :
                  item.type === "modified" ? "bg-amber-500" :
                  "bg-emerald-500"
                }`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{item.trip}</p>
                  <p className="truncate text-xs text-gray-500">{item.route}</p>
                  <p className="text-xs text-gray-400">{item.detail}</p>
                  <p className="text-xs text-gray-400">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
