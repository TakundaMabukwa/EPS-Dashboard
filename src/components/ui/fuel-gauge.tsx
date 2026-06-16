'use client';

import { Download, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FuelGaugeProps {
  location: string;
  fuelLitres: number;
  temperature: number;
  rpm?: number;
  oilPressure?: number;
  odometer?: number;
  engineHours?: number;
  totalFuelUsed?: number;
  status: string;
  lastUpdated?: string;
  className?: string;
  id?: string | number;
  onRefresh?: (id?: string | number) => void | Promise<void>;
  onDownload?: (id?: string | number) => void | Promise<void>;
}

const fmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const fmt1 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const MAX_TANK = 1000;

function getFuelColor(litres: number) {
  const pct = (litres / MAX_TANK) * 100;
  if (pct <= 10) return '#ef4444';
  if (pct <= 25) return '#f97316';
  if (pct <= 50) return '#eab308';
  return '#10b981';
}

export function FuelGauge({
  location,
  fuelLitres,
  temperature,
  rpm,
  oilPressure,
  odometer,
  engineHours,
  totalFuelUsed,
  status,
  lastUpdated,
  className,
  id,
  onRefresh,
  onDownload,
}: FuelGaugeProps) {
  const litres = Math.max(0, fuelLitres || 0);
  const fillPct = Math.min(100, (litres / MAX_TANK) * 100);
  const color = getFuelColor(litres);

  const sw = 8;
  const r = 52;
  const nr = r - sw / 2;
  const circ = nr * 2 * Math.PI;
  const dashoff = circ - (fillPct / 100) * circ;

  const handleDownload = () => {
    if (onDownload) { void onDownload(id); return; }
    if (typeof window === 'undefined') return;
    const payload = { plate: location, fuelLitres: litres, rpm, oilPressure, odometer, engineHours, totalFuelUsed, temperature, status };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${location.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-fuel.json`; a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <div className={cn(
      'flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
      className
    )}>
      {/* Header */}
      <div className="border-b border-slate-100 bg-slate-50/80 px-3 py-2">
        <p className="truncate text-sm font-bold text-[#1748d8]">{location}</p>
      </div>

      {/* Gauge + Litres */}
      <div className="flex flex-col items-center px-3 pt-3 pb-2">
        <div className="relative flex items-center justify-center">
          <svg viewBox="0 0 120 120" className="h-[100px] w-[100px] -rotate-90">
            <circle cx="60" cy="60" r={nr} fill="none" stroke="#e2e8f0" strokeWidth={sw} />
            <circle
              cx="60" cy="60" r={nr} fill="none" stroke={color}
              strokeDasharray={`${circ} ${circ}`} strokeDashoffset={dashoff}
              strokeLinecap="round" strokeWidth={sw}
              className="transition-[stroke-dashoffset] duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-black leading-none text-[#1748d8]">{fmt.format(litres)}</span>
            <span className="text-[10px] font-bold text-slate-500">LITRES</span>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-1.5 px-3 pb-2">
        <Metric label="RPM" value={rpm != null ? fmt.format(rpm) : '--'} />
        <Metric label="TEMP" value={temperature != null ? `${fmt.format(temperature)}°` : '--'} />
        <Metric label="OIL" value={oilPressure != null ? fmt.format(oilPressure) : '--'} sub="kPa" />
      </div>

      {/* Details */}
      <div className="space-y-1 border-t border-slate-100 px-3 py-2">
        {odometer != null && odometer > 0 && (
          <Detail label="Odometer" value={`${fmt1.format(odometer)} km`} />
        )}
        {engineHours != null && engineHours > 0 && (
          <Detail label="Engine Hrs" value={`${fmt.format(engineHours)} h`} />
        )}
        {totalFuelUsed != null && totalFuelUsed > 0 && (
          <Detail label="Total Used" value={`${fmt.format(totalFuelUsed)} L`} />
        )}
        {lastUpdated && (
          <Detail label="Updated" value={new Date(lastUpdated).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })} />
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-end gap-1.5 bg-slate-50/80 px-3 py-2">
        <button
          type="button" onClick={() => void onRefresh?.(id)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-100 hover:text-slate-700"
          title="Refresh"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
        <button
          type="button" onClick={handleDownload}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-100 hover:text-slate-700"
          title="Download"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center rounded-md bg-slate-50 py-1.5">
      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
      <span className="text-sm font-bold text-slate-800">{value}</span>
      {sub && <span className="text-[8px] text-slate-400">{sub}</span>}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-slate-500">{label}</span>
      <span className="text-[11px] font-semibold text-slate-700">{value}</span>
    </div>
  );
}
