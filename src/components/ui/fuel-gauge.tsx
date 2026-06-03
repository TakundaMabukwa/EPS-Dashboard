'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Thermometer, Droplets, Gauge, NotebookPen } from 'lucide-react';

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
}

export function FuelGauge({
  location,
  fuelLevel,
  temperature,
  volume,
  status,
  lastFuelFill,
  className,
  onAddNote,
  hasNotes,
  notes,
  id
}: FuelGaugeProps) {
  const radius = 72;
  const strokeWidth = 10;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (fuelLevel / 100) * circumference;

  const getFuelColor = (level: number) => {
    if (level < 20) return '#ef4444';
    if (level < 40) return '#f97316';
    if (level < 65) return '#eab308';
    return '#22c55e';
  };

  const fuelColor = getFuelColor(fuelLevel);

  return (
    <div className={cn(
      "rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md",
      className
    )}>
      <div className="mb-3">
        <h3 className="truncate text-sm font-bold text-[#001e42]">{location}</h3>
      </div>

      <div className="flex justify-center">
        <div className="relative w-full max-w-[160px]">
          <svg
            viewBox="0 0 144 144"
            className="w-full h-auto -rotate-90 transform"
          >
            <circle
              stroke="#f1f5f9"
              fill="transparent"
              strokeWidth={strokeWidth}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
            <circle
              stroke={fuelColor}
              fill="transparent"
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              style={{ strokeDashoffset }}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
              className="transition-all duration-1000 ease-out"
              strokeLinecap="round"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Gauge className="mb-1 h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
            <span className="text-lg sm:text-2xl font-black text-[#001e42]">{fuelLevel}</span>
            <span className="text-[8px] sm:text-[10px] font-semibold uppercase tracking-wider text-slate-500">Percentage</span>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Thermometer className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-700">{temperature}°</span>
          </div>
          <span className="text-[10px] text-slate-500">Temp</span>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Droplets className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-700">{volume.toFixed(1)}</span>
          </div>
          <span className="text-[10px] text-slate-500">Volume</span>
        </div>
      </div>

      {lastFuelFill && (
        <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Last Fill</span>
            <span className="text-sm font-bold text-emerald-800">{lastFuelFill.amount.toFixed(1)}L</span>
          </div>
          <div className="mt-0.5 text-[10px] text-emerald-600">
            {lastFuelFill.previousLevel.toFixed(1)}% → {fuelLevel.toFixed(1)}%
          </div>
        </div>
      )}

      {onAddNote && (
        <button
          onClick={() => onAddNote(location, id)}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-200 py-1.5 text-[10px] font-medium text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
        >
          <NotebookPen className="h-3 w-3" />
          {hasNotes ? (notes ? notes.substring(0, 30) : 'View Note') : 'Add Note'}
        </button>
      )}
    </div>
  );
}
