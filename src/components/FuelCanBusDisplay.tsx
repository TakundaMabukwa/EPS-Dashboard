'use client'

import { useState, useEffect, useRef } from 'react'
import { FuelGauge } from '@/components/ui/fuel-gauge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Fuel } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface FuelData {
  plate: string
  timestamp: string
  fuelLevel: number
  fuelPercentage: number
  engineTemperature: number
  totalFuelUsed: number
}

export default function FuelCanBusDisplay() {
  const [vehicles, setVehicles] = useState<Map<string, FuelData>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const notifiedVehicles = useRef<Set<string>>(new Set())

  const LOW_FUEL_THRESHOLD = 25

  const fetchFuelData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/fuel')
      if (!response.ok) throw new Error('Failed to fetch fuel data')
      
      const data = await response.json()
      
      const vehicleMap = new Map()
      data.forEach((vehicle: any) => {
        vehicleMap.set(vehicle.plate, vehicle)
      })
      setVehicles(vehicleMap)
      setLoading(false)
    } catch (err) {
      console.error('Fetch error:', err)
      setError('Failed to fetch fuel data')
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFuelData()
  }, [])

  useEffect(() => {
    if (vehicles.size === 0) return

    const lowFuelVehicles: string[] = []

    vehicles.forEach((vehicle) => {
      const pct = vehicle.fuelPercentage || 0
      if (pct > 0 && pct <= LOW_FUEL_THRESHOLD && !notifiedVehicles.current.has(vehicle.plate)) {
        lowFuelVehicles.push(vehicle.plate)
        notifiedVehicles.current.add(vehicle.plate)
      }
    })

    if (lowFuelVehicles.length === 1) {
      toast({
        title: 'Low Fuel Alert',
        description: `${lowFuelVehicles[0]} has ${vehicles.get(lowFuelVehicles[0])?.fuelPercentage}% fuel remaining`,
        variant: 'destructive',
      })
    } else if (lowFuelVehicles.length > 1) {
      toast({
        title: 'Low Fuel Alert',
        description: `${lowFuelVehicles.length} vehicles have fuel at or below ${LOW_FUEL_THRESHOLD}%`,
        variant: 'destructive',
      })
    }
  }, [vehicles])

  const getFuelGaugeData = () => {
    const gaugeData = Array.from(vehicles.values()).map((vehicle) => {
      const fuelVolLitres = vehicle.fuelLevel || 0
      const fuelPct = vehicle.fuelPercentage || 0
      const engineTemp = vehicle.engineTemperature || 0
      const isEngineOn = engineTemp > 40

      const percentage = fuelPct > 0
        ? fuelPct
        : fuelVolLitres > 450
          ? Math.round((fuelVolLitres / 500) * 100)
          : fuelVolLitres > 0
            ? Math.round((fuelVolLitres / 400) * 100)
            : 0

      return {
        id: vehicle.plate,
        location: vehicle.plate,
        plate: vehicle.plate,
        fuelLevel: percentage,
        fuelPercent: fuelPct,
        temperature: engineTemp,
        volume: fuelVolLitres,
        status: isEngineOn ? 'Active' : 'Engine Off',
      }
    })

    return gaugeData.sort((a, b) => {
      const aPct = a.fuelPercent
      const bPct = b.fuelPercent
      if (aPct !== bPct) return aPct - bPct
      return a.volume - b.volume
    })
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-[#001e42]"></div>
          <p className="text-sm text-slate-600">Loading fuel data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 text-5xl text-red-400">⚠</div>
          <p className="mb-2 text-sm font-medium text-red-600">Error loading fuel data</p>
          <p className="mb-4 text-xs text-slate-500">{error}</p>
          <Button onClick={fetchFuelData} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-slate-50">
      <div className="p-4">
        {vehicles.size > 0 ? (
          <div className="grid grid-cols-1 gap-2 sm:gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {getFuelGaugeData().map((data) => (
              <FuelGauge
                key={data.id}
                id={data.id}
                location={data.location}
                fuelLevel={data.fuelLevel}
                temperature={data.temperature}
                volume={data.volume}
                status={data.status}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Fuel className="mx-auto mb-4 h-16 w-16 text-slate-300" />
              <p className="text-base font-medium text-slate-500">No fuel data available</p>
              <p className="mt-1 text-xs text-slate-400">Check your connection to the EPS server</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
