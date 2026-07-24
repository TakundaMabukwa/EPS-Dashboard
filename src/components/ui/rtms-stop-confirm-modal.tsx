"use client"

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RecommendedStop } from '@/lib/rtms-rules'

interface RTMSStopConfirmModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stops: Array<RecommendedStop & { lat: number; lng: number }>
  violations: Array<{ rule: string; limit: string; actual: string; severity: string }>
  onAccept: () => void
  onDismiss: () => void
}

export function RTMSStopConfirmModal({
  open,
  onOpenChange,
  stops,
  violations,
  onAccept,
  onDismiss,
}: RTMSStopConfirmModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            RTMS Rest Stops Recommended
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-2 space-y-3">
          <p className="text-xs text-gray-600">
            This trip exceeds RTMS driving limits. Add suggested rest stops to the route?
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

          {/* Proposed stops */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Proposed Stops</div>
            {stops.map((stop, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs bg-blue-50 border border-blue-100 rounded px-2 py-1.5"
              >
                <div
                  className={cn(
                    'w-1.5 h-1.5 rounded-full flex-shrink-0',
                    stop.type === 'rest' ? 'bg-red-500' : 'bg-amber-500'
                  )}
                />
                <span className="font-medium text-blue-800">{stop.label}</span>
                <span className="text-blue-600">{stop.kmFromOrigin} km</span>
                <span className="text-blue-400 ml-auto text-[10px]">{stop.reason}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex border-t">
          <button
            type="button"
            onClick={() => {
              onDismiss()
              onOpenChange(false)
            }}
            className="flex-1 px-4 py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
          >
            <X className="h-3 w-3" />
            Skip Stops
          </button>
          <div className="w-px bg-gray-200" />
          <button
            type="button"
            onClick={() => {
              onAccept()
              onOpenChange(false)
            }}
            className="flex-1 px-4 py-2.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5"
          >
            <CheckCircle className="h-3 w-3" />
            Add Stops
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
