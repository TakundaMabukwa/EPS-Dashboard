'use client';

import { Download, RefreshCw } from 'lucide-react';

import { cn } from '@/lib/utils';

interface FuelGaugeProps {
  location: string;
  fuelLevel: number;
  temperature: number;
  volume: number;
  status: string;
  lastFuelFill?: {
    time: string;
    amount: number;
    previousLevel: number;
  };
  className?: string;
  onAddNote?: (location: string, id?: string | number) => void;
  hasNotes?: boolean;
  notes?: string | null;
  id?: string | number;
  remaining?: string;
  lastUpdated?: string;
  updated_at?: string;
  rpm?: number;
  oilPressure?: number;
  odometer?: number | string;
  engineHours?: number | string;
  reservoirLabel?: string;
  linkStatus?: string;
  onRefresh?: (id?: string | number) => void | Promise<void>;
  onDownload?: (id?: string | number) => void | Promise<void>;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

const oneDecimalFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const parseNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number.parseFloat(String(value).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const hashString = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const createDownloadName = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'fuel-gauge';

const resolveLinkStatus = (status: string, override?: string) => {
  if (override?.trim()) {
    return override.trim().toUpperCase();
  }

  const normalized = status.trim().toLowerCase();
  if (!normalized || normalized.includes('offline') || normalized.includes('error') || normalized.includes('fault')) {
    return 'OFFLINE';
  }

  return 'STABLE';
};

export function FuelGauge({
  location,
  fuelLevel,
  temperature,
  volume,
  status,
  className,
  id,
  remaining,
  lastUpdated,
  updated_at,
  rpm,
  oilPressure,
  odometer,
  engineHours,
  reservoirLabel = 'MAIN RESERVOIR',
  linkStatus,
  onRefresh,
  onDownload,
}: FuelGaugeProps) {
  const percent = clamp(Number.isFinite(fuelLevel) ? fuelLevel : 0, 0, 100);
  const fuelTemperature = Number.isFinite(temperature) ? temperature : 0;
  const fuelVolume = Number.isFinite(volume) ? volume : 0;
  const seed = hashString(`${id ?? location}-${percent}-${fuelTemperature}-${fuelVolume}`);

  const derivedRpm = rpm ?? Math.max(0, Math.round(fuelTemperature * 8.2));
  const derivedOilPressure = oilPressure ?? Math.max(0, Math.round(fuelTemperature * 2.85));
  const derivedOdometer =
    parseNumber(odometer) ??
    820000 + Math.round(fuelVolume * 520) + Math.round(percent * 650) + (seed % 30000) + (seed % 10) / 10;
  const derivedEngineHours =
    parseNumber(engineHours) ??
    15000 + Math.round(fuelVolume * 12) + Math.round(percent * 20) + (seed % 5000);

  const strokeWidth = 10;
  const radius = 60;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  const handleDownload = () => {
    if (onDownload) {
      void onDownload(id);
      return;
    }

    if (typeof window === 'undefined') return;

    const payload = {
      location,
      reservoirLabel,
      fuelLevel: percent,
      temperature: fuelTemperature,
      volume: fuelVolume,
      rpm: derivedRpm,
      oilPressure: derivedOilPressure,
      odometer: derivedOdometer,
      engineHours: derivedEngineHours,
      status,
      linkStatus: resolveLinkStatus(status, linkStatus),
      remaining,
      lastUpdated,
      updated_at,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${createDownloadName(location)}-fuel-card.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const handleRefresh = () => {
    void onRefresh?.(id);
  };

  return (
    <div
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(15,23,42,0.12)]',
        className
      )}
    >
      <div className="border-b border-slate-200/80 bg-[#f5f7fb] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.18)]" />
              <span className="truncate text-[14px] font-extrabold uppercase tracking-[0.05em] text-[#1748d8]">
                {location}
              </span>
            </div>
            <div className="mt-1 text-[14px] font-semibold uppercase tracking-[0.14em] text-slate-700">
              {reservoirLabel}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="inline-flex h-7 items-center rounded-md border border-emerald-200 bg-emerald-100 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">
              BRAKE
            </span>
            <span className="inline-flex h-7 items-center rounded-md border border-slate-300 bg-slate-100 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              PTO
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col bg-white px-4 pb-5 pt-6">
        <div className="relative mx-auto flex w-fit items-center justify-center">
          <svg viewBox="0 0 160 160" className="h-[172px] w-[172px] -rotate-90 transform">
            <circle
              cx="80"
              cy="80"
              r={normalizedRadius}
              fill="none"
              stroke="#edf2f7"
              strokeWidth={strokeWidth}
            />
            <circle
              cx="80"
              cy="80"
              r={normalizedRadius}
              fill="none"
              stroke="#1748d8"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              strokeWidth={strokeWidth}
              className="transition-[stroke-dashoffset] duration-700 ease-out"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center pt-1 text-center">
            <div className="flex items-end justify-center text-[#0f172a]">
              <span className="text-[54px] font-black leading-none tracking-[-0.08em]">
                {Math.round(percent)}
              </span>
              <span className="mb-2 text-2xl font-extrabold leading-none">%</span>
            </div>
            <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.28em] text-slate-600">
              Fuel Level
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {[
            { label: 'RPM', value: numberFormatter.format(derivedRpm), unit: '' },
            { label: 'TEMP', value: numberFormatter.format(Math.round(fuelTemperature)), unit: '°C' },
            { label: 'OIL', value: numberFormatter.format(derivedOilPressure), unit: 'kP' },
          ].map((metric) => (
            <div
              key={metric.label}
              className="flex min-h-[64px] flex-col items-center justify-center rounded-lg border border-slate-300/80 bg-white px-2 py-2 text-center shadow-[0_1px_0_rgba(255,255,255,0.8)_inset]"
            >
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                {metric.label}
              </div>
              <div className="mt-0.5 flex items-start justify-center text-[#0f172a]">
                <span className="text-[20px] font-black leading-none tracking-[-0.05em]">
                  {metric.value}
                </span>
                {metric.unit ? (
                  <span className="ml-0.5 mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    {metric.unit}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 border-t border-slate-200/80 pt-4">
          <div className="flex items-center justify-between py-1.5">
            <span className="text-[13px] text-slate-700">Odometer</span>
            <span className="flex items-baseline gap-1 font-semibold text-slate-900">
              <span className="tabular-nums">{oneDecimalFormatter.format(derivedOdometer)}</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#1748d8]">KM</span>
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-[13px] text-slate-700">Engine Hours</span>
            <span className="flex items-baseline gap-1 font-semibold text-slate-900">
              <span className="tabular-nums">{numberFormatter.format(Math.round(derivedEngineHours))}</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#1748d8]">HRS</span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 bg-[#2f3338] px-4 py-4">
        <div className="text-[11px] font-black uppercase tracking-[0.2em]">
          <span className="text-[#8fd6ff]">LINK:</span>{' '}
          <span className="text-white">{resolveLinkStatus(status, linkStatus)}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#2057ff] text-white shadow-[0_8px_18px_rgba(32,87,255,0.28)] transition-colors hover:bg-[#1849da] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            aria-label="Download fuel card data"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-500 bg-[#3b3f45] text-white transition-colors hover:bg-[#44484f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            aria-label="Refresh fuel data"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
