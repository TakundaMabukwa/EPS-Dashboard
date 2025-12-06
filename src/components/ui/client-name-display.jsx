"use client"

import React from 'react'
import { Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ClientNameDisplay({ selectedClient, placeholder = "Client name will appear here" }) {
  const displayValue = selectedClient?.name || ''

  return (
    <div className="relative">
      <div
        className={cn(
          "flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm",
          !displayValue && "text-muted-foreground"
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="truncate">{displayValue || placeholder}</span>
        </div>
      </div>
    </div>
  )
}