"use client"

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertTriangle, CheckCircle, X, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RecommendedStop } from '@/lib/rtms-rules'

interface NearbyOption {
  id: number
  name: string
  name2: string
  distanceKm: number
  centroidLat: number
  centroidLng: number
}

interface ProposedStop {
  proposedLabel: string
  proposedKm: number
  proposedLat: number
  proposedLng: number
  options: NearbyOption[]
}

interface RTMSStopConfirmModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stops: Array<RecommendedStop & { lat: number; lng: number }>
  nearbyOptions: ProposedStop[]
  violations: Array<{ rule: string; limit: string; actual: string; severity: string }>
  selectedStops: Record<number, { id: number; name: string } | null>
  onSelectStop: (stopIndex: number, option: NearbyOption | null) => void
  onAccept: () => void
  onDismiss: () => void
}

export function RTMSStopConfirmModal({
  open,
  onOpenChange,
  stops,
  nearbyOptions,
  violations,
  selectedStops,
  onSelectStop,
  onAccept,
  onDismiss,
}: RTMSStopConfirmModalProps) {
  const allSelected = stops.every((_, i) => selectedStops[i] !== undefined)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 max-h-[85vh] flex flex-col">
        <DialogHeader className="px-4 pt-4 pb-2 flex-shrink-0">
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            RTMS Rest Stops — Pick Locations
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-2 space-y-3 overflow-y-auto flex-1 min-h-0">
          <p className="text-xs text-gray-600">
            This trip exceeds RTMS driving limits. Pick a stop point from your database for each suggested rest stop.
          </p>

          {/* Violations summary */}
          {violations.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded p-2">
              <div className="text-[10px] font-medium text-red-800 mb-1">Violations</div>
              {violations.map((v, i) => (
                <div key={i} className="text-[10px] text-red-700">
                  {v.rule}: {v.actual} exceeds {v.limit}
                </div>
              ))}
            </div>
          )}

          {/* Proposed stops with nearby options */}
          <div className="space-y-3">
            <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Suggested Rest Stops</div>
            {nearbyOptions.map((stop, i) => {
              const selected = selectedStops[i]
              const hasOptions = stop.options.length > 0
              return (
                <div key={i} className="border border-blue-100 rounded bg-blue-50/50 overflow-hidden">
                  {/* Stop header */}
                  <div className="flex items-center gap-2 px-2.5 py-1.5 text-xs">
                    <div className={cn(
                      'w-2 h-2 rounded-full flex-shrink-0',
                      stops[i]?.type === 'rest' ? 'bg-red-500' : 'bg-amber-500'
                    )} />
                    <span className="font-medium text-blue-800">{stop.proposedLabel}</span>
                    <span className="text-blue-500">{stop.proposedKm} km</span>
                    {selected && (
                      <span className="ml-auto text-[10px] text-green-600 font-medium flex items-center gap-0.5">
                        <CheckCircle className="w-2.5 h-2.5" /> {selected.name}
                      </span>
                    )}
                  </div>

                  {/* Nearby options */}
                  {hasOptions ? (
                    <div className="border-t border-blue-100 px-2.5 py-1.5 space-y-1">
                      <div className="text-[9px] text-gray-400 uppercase tracking-wide">Nearby Stop Points</div>
                      {stop.options.map((opt) => (
                        <label
                          key={opt.id}
                          className={cn(
                            "flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-[11px] transition-colors",
                            selected?.id === opt.id
                              ? "bg-green-100 border border-green-300 text-green-800"
                              : "hover:bg-white border border-transparent"
                          )}
                        >
                          <input
                            type="radio"
                            name={`rtms-stop-${i}`}
                            checked={selected?.id === opt.id}
                            onChange={() => onSelectStop(i, opt)}
                            className="w-3 h-3 text-green-600"
                          />
                          <MapPin className="w-2.5 h-2.5 text-gray-400 flex-shrink-0" />
                          <span className="font-medium">{opt.name}</span>
                          {opt.name2 && opt.name2 !== 'Comment1' && (
                            <span className="text-gray-400">{opt.name2}</span>
                          )}
                          <span className="ml-auto text-gray-400">{opt.distanceKm} km away</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="border-t border-blue-100 px-2.5 py-2 text-[10px] text-gray-400">
                      No nearby stop points found within 50 km. Skip this stop.
                    </div>
                  )}

                  {/* Skip option */}
                  {hasOptions && (
                    <div className="border-t border-blue-100 px-2.5 py-1">
                      <label className="flex items-center gap-2 cursor-pointer text-[11px] text-gray-400 hover:text-gray-600">
                        <input
                          type="radio"
                          name={`rtms-stop-${i}`}
                          checked={selected === null}
                          onChange={() => onSelectStop(i, null)}
                          className="w-3 h-3"
                        />
                        Skip this stop
                      </label>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex border-t flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              onDismiss()
              onOpenChange(false)
            }}
            className="flex-1 px-4 py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
          >
            <X className="h-3 w-3" />
            Skip All
          </button>
          <div className="w-px bg-gray-200" />
          <button
            type="button"
            onClick={() => {
              onAccept()
              onOpenChange(false)
            }}
            disabled={!allSelected}
            className={cn(
              "flex-1 px-4 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5",
              allSelected
                ? "text-blue-700 bg-blue-50 hover:bg-blue-100"
                : "text-gray-400 bg-gray-50 cursor-not-allowed"
            )}
          >
            <CheckCircle className="h-3 w-3" />
            Add Selected Stops
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
