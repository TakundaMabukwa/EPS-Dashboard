'use client'

import { useState, useEffect } from 'react'
import { FuelGauge } from '@/components/ui/fuel-gauge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Fuel } from 'lucide-react'

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

  const getFuelGaugeData = () => {
    const gaugeData = Array.from(vehicles.values()).map((vehicle) => {
      const fuelLevel = vehicle.fuelLevel || 0
      const fuelPercent = vehicle.fuelPercentage || 0
      const engineTemp = vehicle.engineTemperature || 0
      const isEngineOn = engineTemp > 40

      const displayPercent = fuelLevel > 0 ? fuelLevel : fuelPercent

      return {
        id: vehicle.plate,
        location: vehicle.plate,
        fuelLevel: displayPercent,
        temperature: engineTemp,
        volume: fuelLevel,
        status: isEngineOn ? 'Active' : 'Engine Off',
      }
    })

    return gaugeData.sort((a, b) => {
      if (a.volume === 0 && b.volume !== 0) return 1
      if (a.volume !== 0 && b.volume === 0) return -1
      return 0
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
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
