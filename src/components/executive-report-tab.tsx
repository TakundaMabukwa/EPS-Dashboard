"use client";

import { useState, useEffect } from "react";
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

interface DriversCount {
  total: number;
  available: number;
  unavailable: number;
}

interface RevenueData {
  months: { month: string; total_revenue: number; trip_count: number }[];
  total: number;
}

export default function ExecutiveReportTab() {
  const [drivers, setDrivers] = useState<DriversCount>({ total: 0, available: 0, unavailable: 0 });
  const [revenue, setRevenue] = useState<RevenueData>({ months: [], total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [driversRes, revenueRes] = await Promise.all([
          fetch('/api/executive/drivers-count'),
          fetch('/api/executive/revenue'),
        ]);

        if (driversRes.ok) {
          const d = await driversRes.json();
          setDrivers(d);
        }

        if (revenueRes.ok) {
          const r = await revenueRes.json();
          setRevenue(r);
        }
      } catch (err) {
        console.error('Failed to fetch executive data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

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
        {/* Trucks - placeholder for now */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Truck className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Trucks</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Fleet</span>
              <span className="text-sm font-semibold text-gray-900">--</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-gray-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Available
              </span>
              <span className="text-sm font-semibold text-gray-900">--</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-gray-600">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                Unavailable
              </span>
              <span className="text-sm font-semibold text-gray-900">--</span>
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
              {loading ? '--' : `$${fmt(revenue.total)}`}
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
                    ${fmt(val)}
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
          <div className="relative h-52 bg-[#e8ecf1]">
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
            <div className="absolute left-[20%] top-[30%] h-3 w-3 rounded-full bg-blue-500 ring-2 ring-white" />
            <div className="absolute left-[35%] top-[45%] h-3 w-3 rounded-full bg-blue-500 ring-2 ring-white" />
            <div className="absolute left-[50%] top-[25%] h-3 w-3 rounded-full bg-blue-500 ring-2 ring-white" />
            <div className="absolute left-[65%] top-[55%] h-3 w-3 rounded-full bg-blue-500 ring-2 ring-white" />
            <div className="absolute left-[45%] top-[60%] h-4 w-4 rounded-full bg-blue-600 ring-2 ring-white" />
            <div className="absolute left-[55%] top-[40%] h-3 w-3 rounded-full bg-blue-500 ring-2 ring-white" />
            <div className="absolute left-[30%] top-[65%] h-3 w-3 rounded-full bg-blue-500 ring-2 ring-white" />
            <div className="absolute left-3 top-3 rounded-lg bg-white/95 p-2.5 shadow-md">
              <p className="mb-1.5 text-xs font-semibold text-gray-700">Active Alerts (2)</p>
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                <span>Truck #452 - Engine Malfunction</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                <span>Truck #180 - Weather Delay</span>
              </div>
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
            {[
              { route: "Route AX-901", vehicle: "Trailer / Freightliner", driver: "Driver S. Miller", time: "45m" },
              { route: "Route BD-214", vehicle: "Trailer / Refrigerated", driver: "Driver J. Doe", time: "2h 15m" },
              { route: "Route ZX-102", vehicle: "Trailer / Flatbed", driver: "Driver B. Chan", time: "4h 50m" },
            ].map((item, i) => (
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
                <span className="text-sm font-semibold text-gray-900">$1.15</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div className="h-2 rounded-full bg-gray-700" style={{ width: "85%" }} />
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs text-gray-500">Actual CPK</span>
                <span className="text-sm font-semibold text-gray-900">$1.22</span>
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
