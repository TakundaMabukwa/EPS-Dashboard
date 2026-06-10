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
  engineTemperature: number
  totalFuelUsed: number
  odometer: number
  engineSpeed: number
  oilPressure: number
  oilTemp: number
  engineHours: number
}

export default function FuelCanBusDisplay() {
  const [vehicles, setVehicles] = useState<Map<string, FuelData>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const notifiedVehicles = useRef<Set<string>>(new Set())

  const LOW_FUEL_THRESHOLD = 100 // litres

  const fetchFuelData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/fuel')
      if (!response.ok) throw new Error('Failed to fetch fuel data')

      const data = await response.json()

      const vehicleMap = new Map()
      data.forEach((vehicle: FuelData) => {
        vehicleMap.set(vehicle.plate, vehicle)
      })
      setVehicles(vehicleMap)
    } catch (err) {
      console.error('Fetch error:', err)
      setError('Failed to fetch fuel data')
    } finally {
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
      const litres = vehicle.fuelLevel || 0
      if (litres > 0 && litres <= LOW_FUEL_THRESHOLD && !notifiedVehicles.current.has(vehicle.plate)) {
        lowFuelVehicles.push(vehicle.plate)
        notifiedVehicles.current.add(vehicle.plate)
      }
    })

    if (lowFuelVehicles.length === 1) {
      toast({
        title: 'Low Fuel Alert',
        description: `${lowFuelVehicles[0]} has ${vehicles.get(lowFuelVehicles[0])?.fuelLevel}L remaining`,
        variant: 'destructive',
      })
    } else if (lowFuelVehicles.length > 1) {
      toast({
        title: 'Low Fuel Alert',
        description: `${lowFuelVehicles.length} vehicles have fuel at or below ${LOW_FUEL_THRESHOLD}L`,
        variant: 'destructive',
      })
    }
  }, [vehicles])

  const getFuelGaugeData = () => {
    return Array.from(vehicles.values()).map((vehicle) => {
      const engineTemp = vehicle.engineTemperature || 0
      const isEngineOn = engineTemp > 40 || (vehicle.engineSpeed || 0) > 0

      return {
        id: vehicle.plate,
        plate: vehicle.plate,
        fuelLitres: vehicle.fuelLevel || 0,
        temperature: engineTemp,
        rpm: vehicle.engineSpeed || 0,
        oilPressure: vehicle.oilPressure || 0,
        odometer: vehicle.odometer || 0,
        engineHours: vehicle.engineHours || 0,
        totalFuelUsed: vehicle.totalFuelUsed || 0,
        status: isEngineOn ? 'Active' : 'Engine Off',
        lastUpdated: vehicle.timestamp,
      }
    }).sort((a, b) => a.fuelLitres - b.fuelLitres)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-[#001e42]" />
          <p className="text-sm text-slate-600">Loading fuel data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50">
        <div className="text-center">
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

  const gaugeData = getFuelGaugeData()

  return (
    <div className="h-full bg-slate-50">
      <div className="flex items-center justify-between p-4 pb-0">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-[#1748d8] px-2 text-xs font-bold text-white">
            {gaugeData.length}
          </span>
          <p className="text-xs text-slate-400">
            vehicles &middot; Sorted by litres (lowest first)
          </p>
        </div>
        <Button onClick={fetchFuelData} variant="outline" size="sm" className="h-8 text-xs">
          <RefreshCw className="mr-1 h-3 w-3" />
          Refresh
        </Button>
      </div>

      <div className="p-4">
        {gaugeData.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {gaugeData.map((data) => (
              <FuelGauge
                key={data.id}
                id={data.id}
                location={data.plate}
                fuelLitres={data.fuelLitres}
                temperature={data.temperature}
                rpm={data.rpm}
                oilPressure={data.oilPressure}
                odometer={data.odometer}
                engineHours={data.engineHours}
                totalFuelUsed={data.totalFuelUsed}
                status={data.status}
                lastUpdated={data.lastUpdated}
                onRefresh={fetchFuelData}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Fuel className="mx-auto mb-4 h-16 w-16 text-slate-300" />
              <p className="text-base font-medium text-slate-500">No fuel data available</p>
              <p className="mt-1 text-xs text-slate-400">Check your connection to the vehicle API</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
