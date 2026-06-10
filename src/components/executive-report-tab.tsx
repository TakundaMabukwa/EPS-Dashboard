"use client";

import {
  Truck,
  Users,
  DollarSign,
  Map,
  Clock,
  Fuel,
  BarChart3,
  Activity,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Calendar,
  TrendingDown,
} from "lucide-react";

const mockData = {
  trucks: { booked: 24, available: 12, unavailable: 4 },
  drivers: { available: 38, unavailable: 6 },
  totalValue: { value: 1248300, change: 12.4 },
  enRouteAlerts: [
    { id: 1, truck: "Truck #452", issue: "Engine Malfunction" },
    { id: 2, truck: "Truck #180", issue: "Weather Delay" },
  ],
  availabilityForecast: [
    { route: "Route AX-901", vehicle: "Trailer / Freightliner", driver: "Driver S. Miller", time: "45m" },
    { route: "Route BD-214", vehicle: "Trailer / Refrigerated", driver: "Driver J. Doe", time: "2h 15m" },
    { route: "Route ZX-102", vehicle: "Trailer / Flatbed", driver: "Driver B. Chan", time: "4h 50m" },
  ],
  fuel: { totalUsed: 4500, refillsToday: 18, efficiency: 2.4 },
  cpk: { planned: 1.15, actual: 1.22, warning: "Operational costs are 6.1% above projections this period" },
  recentActivity: [
    { type: "cancelled", trip: "Trip #TR-882 Cancelled", route: "Chicago → NY", detail: "Warehouse Lockout (15 min delay)", time: "12:12 PM" },
    { type: "modified", trip: "Modified (ETA Changed)", route: "Trip #TR-884 Arr → Wed 12:30 PM", detail: "(+2h)", time: "12:12 PM" },
    { type: "dispatched", trip: "Trip Dispatched", route: "Route: Miami → Dallas", detail: "Driver: A. King", time: "09:45 AM" },
  ],
};

const barData = [35, 55, 40, 70, 50, 80, 60, 85, 55, 75, 65, 90];

export default function ExecutiveReportTab() {
  const data = mockData;

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
          <span className="text-sm text-gray-600">Jun 10, 2026</span>
        </div>
      </div>

      {/* Top Row - Stats */}
      <div className="grid grid-cols-3 gap-4">
        {/* Trucks */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Truck className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Trucks</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Booked</span>
              <span className="text-sm font-semibold text-gray-900">{data.trucks.booked}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-gray-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Available
              </span>
              <span className="text-sm font-semibold text-gray-900">{data.trucks.available}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-gray-600">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                Unavailable
              </span>
              <span className="text-sm font-semibold text-gray-900">{data.trucks.unavailable}</span>
            </div>
          </div>
        </div>

        {/* Drivers */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Drivers</span>
          </div>
          <div className="mb-3">
            <span className="text-4xl font-bold text-gray-900">{data.drivers.available}</span>
            <span className="ml-2 text-sm text-gray-500">Available Today</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-red-600">
            <AlertTriangle className="h-3 w-3" />
            <span>{data.drivers.unavailable} Drivers Unavailable (On Leave/Sick)</span>
          </div>
        </div>

        {/* Total Value of Goods */}
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
              ${data.totalValue.value.toLocaleString()}
            </span>
          </div>
          <div className="mb-3 flex items-center gap-1 text-xs text-emerald-600">
            <TrendingUp className="h-3 w-3" />
            <span>+{data.totalValue.change}% vs last month</span>
          </div>
          {/* Mini bar chart */}
          <div className="flex items-end gap-[3px]">
            {barData.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-gray-800"
                style={{ height: `${h * 0.4}px` }}
              />
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
              <Map className="h-4 w-4 text-gray-500" />
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
          <div className="relative h-52 bg-[#e8ecf1]">
            {/* Map grid lines */}
            <div className="absolute inset-0 opacity-20">
              <svg width="100%" height="100%">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#94a3b8" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>
            {/* Map markers */}
            <div className="absolute left-[20%] top-[30%] h-3 w-3 rounded-full bg-blue-500 ring-2 ring-white" />
            <div className="absolute left-[35%] top-[45%] h-3 w-3 rounded-full bg-blue-500 ring-2 ring-white" />
            <div className="absolute left-[50%] top-[25%] h-3 w-3 rounded-full bg-blue-500 ring-2 ring-white" />
            <div className="absolute left-[65%] top-[55%] h-3 w-3 rounded-full bg-blue-500 ring-2 ring-white" />
            <div className="absolute left-[45%] top-[60%] h-4 w-4 rounded-full bg-blue-600 ring-2 ring-white" />
            <div className="absolute left-[55%] top-[40%] h-3 w-3 rounded-full bg-blue-500 ring-2 ring-white" />
            <div className="absolute left-[70%] top-[35%] h-3 w-3 rounded-full bg-blue-500 ring-2 ring-white" />
            <div className="absolute left-[30%] top-[65%] h-3 w-3 rounded-full bg-blue-500 ring-2 ring-white" />
            {/* Alerts overlay */}
            <div className="absolute left-3 top-3 rounded-lg bg-white/95 p-2.5 shadow-md">
              <p className="mb-1.5 text-xs font-semibold text-gray-700">Active Alerts ({data.enRouteAlerts.length})</p>
              {data.enRouteAlerts.map((alert) => (
                <div key={alert.id} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                  <span>{alert.truck} - {alert.issue}</span>
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
            <p className="mt-0.5 text-xs text-gray-500">Fleet freeing up within next 5 hours</p>
          </div>
          <div className="flex-1 space-y-3 p-4">
            {data.availabilityForecast.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{item.route}</p>
                  <p className="truncate text-xs text-gray-500">{item.vehicle} • {item.driver}</p>
                </div>
                <span className="ml-2 shrink-0 rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                  {item.time}
                </span>
              </div>
            ))}
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
              <p className="text-xl font-bold text-gray-900">{data.fuel.totalUsed.toLocaleString()}L</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Refills Today</p>
              <p className="text-xl font-bold text-gray-900">{data.fuel.refillsToday}</p>
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs text-gray-500">Consumption Efficiency</span>
              <span className="flex items-center gap-0.5 text-xs text-emerald-600">
                <TrendingUp className="h-3 w-3" />+{data.fuel.efficiency}%
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
                <span className="text-sm font-semibold text-gray-900">${data.cpk.planned}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div className="h-2 rounded-full bg-gray-700" style={{ width: "85%" }} />
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs text-gray-500">Actual CPK</span>
                <span className="text-sm font-semibold text-gray-900">${data.cpk.actual}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div className="h-2 rounded-full bg-red-500" style={{ width: "92%" }} />
              </div>
            </div>
          </div>
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            ⚠ Warning: {data.cpk.warning}
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
            {data.recentActivity.map((item, i) => (
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
