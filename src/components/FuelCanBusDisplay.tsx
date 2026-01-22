'use client'

import { useState, useEffect } from 'react'
import { FuelGauge } from '@/components/ui/fuel-gauge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Fuel } from 'lucide-react'
import { formatForDisplay } from '@/lib/utils/date-formatter'

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

  // Convert CAN bus fuel data to fuel gauge format
  const getFuelGaugeData = () => {
    console.log('Vehicles Map size:', vehicles.size)
    console.log('Sample vehicle from Map:', Array.from(vehicles.values())[0])
    
    const gaugeData = Array.from(vehicles.values()).map((vehicle) => {
      const fuelLevel = vehicle.fuelLevel || 0
      const fuelPercent = vehicle.fuelPercentage || 0
      const engineTemp = vehicle.engineTemperature || 0
      const isEngineOn = engineTemp > 40

      // Use liters as main, percentage as fallback
      const displayPercent = fuelLevel > 0 ? fuelLevel : fuelPercent

      const result = {
        id: vehicle.plate,
        location: vehicle.plate,
        fuelLevel: displayPercent,
        temperature: engineTemp,
        volume: fuelLevel,

        status: isEngineOn ? 'Active' : 'Engine Off',
        lastUpdated: formatForDisplay(vehicle.timestamp),
        updated_at: vehicle.timestamp
      }

      console.log(`Gauge ${vehicle.plate}:`, { fuelLevel: result.fuelLevel, volume: result.volume, temp: result.temperature })
      return result
    })
    
    // Sort by latest update first, then move 0 fuel level vehicles to the end
    return gaugeData.sort((a, b) => {
      if (a.volume === 0 && b.volume !== 0) return 1
      if (a.volume !== 0 && b.volume === 0) return -1
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
  }



  if (loading) {
    return (
      <div className="flex justify-center items-center bg-gray-50 h-full">
        <div className="text-center">
          <div className="mx-auto mb-4 border-b-2 border-blue-600 rounded-full w-12 h-12 animate-spin"></div>
          <p className="text-gray-600">Loading fuel data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center bg-gray-50 h-full">
        <div className="text-center">
          <div className="mx-auto mb-4 text-red-500 text-6xl">⚠️</div>
          <p className="mb-4 text-red-600">Error loading fuel data</p>
          <p className="mb-4 text-gray-600">{error}</p>
          <Button onClick={fetchFuelData} variant="outline">
            <RefreshCw className="mr-2 w-4 h-4" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 h-full">
      <div className="p-4">

        
        {vehicles.size > 0 ? (
          <div className="gap-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 xl:grid-cols-5">
            {getFuelGaugeData().map((data) => (
              <FuelGauge
                key={data.id}
                id={data.id}
                location={data.location}
                fuelLevel={data.fuelLevel}
                temperature={data.temperature}
                volume={data.volume}

                status={data.status}
                lastUpdated={data.lastUpdated}
                updated_at={data.updated_at}

                className="hover:scale-105 transition-transform duration-200 transform"
              />
            ))}
          </div>
        ) : (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <Fuel className="mx-auto mb-4 w-16 h-16 text-gray-400" />
              <p className="text-gray-500 text-lg">No fuel data available</p>
              <p className="text-gray-400 text-sm">Check your connection to the EPS server</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}