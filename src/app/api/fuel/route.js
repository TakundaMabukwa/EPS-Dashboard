import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const endpoint = process.env.NEXT_PUBLIC_CAN_BUS_ENDPOINT
    const key = process.env.NEXT_PUBLIC_CANBUS_KEY
    
    if (!endpoint || !key) {
      console.error('CAN bus endpoint or key not configured')
      return NextResponse.json({ error: 'CAN bus not configured' }, { status: 500 })
    }

    console.log('Fetching fuel data from:', `${endpoint}/canbus/snapshot?key=${key}&company=eps`)
    const response = await fetch(`${endpoint}/canbus/snapshot?key=${key}&company=eps`)
    
    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`)
      throw new Error(`API error: ${response.status}`)
    }
    
    const vehicles = await response.json()
    
    // Get unique vehicles with latest timestamp
    const uniqueVehicles = new Map()
    vehicles.forEach(vehicle => {
      const existing = uniqueVehicles.get(vehicle.plate)
      if (!existing || new Date(vehicle.timestamp) > new Date(existing.timestamp)) {
        uniqueVehicles.set(vehicle.plate, vehicle)
      }
    })
    
    // Process fuel data from CAN bus snapshot
    const processedData = Array.from(uniqueVehicles.values()).map(vehicle => {
      const fuelLevelItem = vehicle.data?.find(item => 
        item.name === 'fuel Level Liter' || item.code === '96'
      )
      const fuelPercentItem = vehicle.data?.find(item => 
        item.name === 'fuel level %' || item.code === '60'
      )
      const totalFuelUsedItem = vehicle.data?.find(item => 
        item.name === 'total fuel used' || item.code === 'FA'
      )
      const engineTempItem = vehicle.data?.find(item => 
        item.name === 'engine temperature' || item.code === '6E'
      )

      console.log(`${vehicle.plate}:`, {
        fuelLevel: fuelLevelItem,
        fuelPercent: fuelPercentItem,
        engineTemp: engineTempItem
      })

      return {
        plate: vehicle.plate,
        timestamp: vehicle.timestamp,
        fuelLevel: fuelLevelItem?.value || 0,
        fuelPercentage: fuelPercentItem?.value || 0,
        totalFuelUsed: totalFuelUsedItem?.value || 0,
        engineTemperature: engineTempItem?.value || 0
      }
    })
    
    console.log('Fuel data processed:', processedData.length, 'vehicles')
    return NextResponse.json(processedData)
  } catch (error) {
    console.error('Fuel proxy error:', error)
    return NextResponse.json({ error: 'Failed to fetch fuel data' }, { status: 500 })
  }
}