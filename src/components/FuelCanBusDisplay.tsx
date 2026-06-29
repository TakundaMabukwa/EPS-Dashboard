'use client'

import { useState, useEffect, useRef } from 'react'
import { FuelGauge } from '@/components/ui/fuel-gauge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RefreshCw, Fuel, Search } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'

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

interface VehicleHorse {
  registration_number: string
  make: string | null
  model: string | null
  branch_name: string | null
}

export default function FuelCanBusDisplay() {
  const [horses, setHorses] = useState<VehicleHorse[]>([])
  const [fuelMap, setFuelMap] = useState<Map<string, FuelData>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [staleWarning, setStaleWarning] = useState(false)
  const notifiedVehicles = useRef<Set<string>>(new Set())
  const lastGoodFuelMap = useRef<Map<string, FuelData>>(new Map())
  const fetchedRef = useRef(false)

  const LOW_FUEL_THRESHOLD = 100 // litres

  const fetchData = async () => {
    try {
      setLoading(true)

      const supabase = createClient()

      // Fetch all horses (non-TR vehicle types, not sold)
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('vehiclesc')
        .select('registration_number, make, model, branch_name, vehicle_type')
        .not('branch_name', 'is', null)
        .neq('branch_name', 'SOLD')
        .not('registration_number', 'is', null)

      if (vehicleError) throw vehicleError

      // Filter to horses only (non-TR vehicle_type) in JS
      const horseList = (vehicleData || []).filter(
        (v) => !(v.vehicle_type || '').toUpperCase().startsWith('TR')
      )
      setHorses(horseList)

      // Single fetch to fuel endpoint
      const response = await fetch('/api/fuel')
      if (!response.ok) {
        console.warn('Fuel API returned', response.status, '— using cached data if available')
        if (lastGoodFuelMap.current.size > 0) {
          setStaleWarning(true)
          setFuelMap(lastGoodFuelMap.current)
        } else {
          setError('Fuel data temporarily unavailable. Try again in a moment.')
        }
        return
      }

      const fuelData: FuelData[] = await response.json()

      const map = new Map<string, FuelData>()
      fuelData.forEach((v) => {
        map.set(v.plate.toUpperCase(), v)
      })
      setFuelMap(map)
      lastGoodFuelMap.current = map
      setStaleWarning(false)
      setError(null)
    } catch (err) {
      console.error('Fetch error:', err)
      if (lastGoodFuelMap.current.size > 0) {
        setStaleWarning(true)
        setFuelMap(lastGoodFuelMap.current)
      } else {
        setError('Failed to fetch data')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    fetchData()
  }, [])

  useEffect(() => {
    if (fuelMap.size === 0) return

    const lowFuelVehicles: string[] = []

    fuelMap.forEach((vehicle) => {
      const litres = vehicle.fuelLevel || 0
      if (litres > 0 && litres <= LOW_FUEL_THRESHOLD && !notifiedVehicles.current.has(vehicle.plate)) {
        lowFuelVehicles.push(vehicle.plate)
        notifiedVehicles.current.add(vehicle.plate)
      }
    })

    if (lowFuelVehicles.length === 1) {
      toast({
        title: 'Low Fuel Alert',
        description: `${lowFuelVehicles[0]} has ${fuelMap.get(lowFuelVehicles[0])?.fuelLevel}L remaining`,
        variant: 'destructive',
      })
    } else if (lowFuelVehicles.length > 1) {
      toast({
        title: 'Low Fuel Alert',
        description: `${lowFuelVehicles.length} vehicles have fuel at or below ${LOW_FUEL_THRESHOLD}L`,
        variant: 'destructive',
      })
    }
  }, [fuelMap])

  // Build merged list: all horses, with fuel data where available
  const allGaugeData = horses
    .map((horse) => {
      const reg = (horse.registration_number || '').toUpperCase()
      const fuel = fuelMap.get(reg)

      if (fuel) {
        const engineTemp = fuel.engineTemperature || 0
        const isEngineOn = engineTemp > 40 || (fuel.engineSpeed || 0) > 0
        return {
          id: reg,
          plate: reg,
          fuelLitres: fuel.fuelLevel || 0,
          temperature: engineTemp,
          rpm: fuel.engineSpeed || 0,
          oilPressure: fuel.oilPressure || 0,
          odometer: fuel.odometer || 0,
          engineHours: fuel.engineHours || 0,
          totalFuelUsed: fuel.totalFuelUsed || 0,
          status: isEngineOn ? 'Active' : 'Engine Off',
          lastUpdated: fuel.timestamp,
          hasData: true,
        }
      }

      // No fuel data
      return {
        id: reg,
        plate: reg,
        fuelLitres: 0,
        temperature: 0,
        rpm: 0,
        oilPressure: 0,
        odometer: 0,
        engineHours: 0,
        totalFuelUsed: 0,
        status: 'No Data',
        lastUpdated: null,
        hasData: false,
      }
    })
    .sort((a, b) => {
      if (a.hasData !== b.hasData) return a.hasData ? -1 : 1
      return a.fuelLitres - b.fuelLitres
    })

  const gaugeData = allGaugeData.filter((g) =>
    g.plate.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-slate-50">
      <div className="flex items-center justify-between p-4 pb-0 gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-[#1748d8] px-2 text-xs font-bold text-white">
            {gaugeData.length}
          </span>
          <p className="text-xs text-slate-400">
            horses &middot; {allGaugeData.filter((g) => g.hasData).length} with fuel data &middot; {allGaugeData.filter((g) => !g.hasData).length} no data
          </p>
          {staleWarning && (
            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full border border-amber-200">
              Showing cached data — fuel API temporarily unavailable
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search by reg..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 w-48 pl-7 text-xs"
            />
          </div>
          <Button onClick={fetchData} variant="outline" size="sm" className="h-8 text-xs">
            <RefreshCw className="mr-1 h-3 w-3" />
            Refresh
          </Button>
        </div>
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
                onRefresh={fetchData}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Fuel className="mx-auto mb-4 h-16 w-16 text-slate-300" />
              <p className="text-base font-medium text-slate-500">No horses found</p>
              <p className="mt-1 text-xs text-slate-400">No vehicles in the fleet</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
