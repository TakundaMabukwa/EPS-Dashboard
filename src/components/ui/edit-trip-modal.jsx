"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { X, FileText, CheckCircle, AlertTriangle, Clock, TrendingUp, Plus, Route, MapPin } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { LocationAutocomplete } from '@/components/ui/location-autocomplete'
import { RoutePreviewMap } from '@/components/ui/route-preview-map'
import { DateTimePicker } from '@/components/ui/datetime-picker'
import { CommodityDropdown } from '@/components/ui/commodity-dropdown'
import { ClientDropdown } from '@/components/ui/client-dropdown'
import { ClientNameDisplay } from '@/components/ui/client-name-display'
import { DriverDropdown } from '@/components/ui/driver-dropdown'
import { VehicleDropdown } from '@/components/ui/vehicle-dropdown'
import { TrailerDropdown } from '@/components/ui/trailer-dropdown'
import { StopPointDropdown } from '@/components/ui/stop-point-dropdown'
import { ElevationModal } from '@/components/ui/elevation-modal'
import { TripHistoryModal } from '@/components/ui/trip-history-modal'

export function EditTripModal({ isOpen, onClose, trip, onUpdate, readOnly = false, showApprovalButtons = false, onApprove, onDecline }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [showElevationModal, setShowElevationModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [userRole, setUserRole] = useState('')
  const [clients, setClients] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [drivers, setDrivers] = useState([])
  const [availableDrivers, setAvailableDrivers] = useState([])
  const [vehicleTrackingData, setVehicleTrackingData] = useState([])
  const [availableStopPoints, setAvailableStopPoints] = useState([])
  const [isLoadingStopPoints, setIsLoadingStopPoints] = useState(false)

  // Form state
  const [client, setClient] = useState('')
  const [selectedClient, setSelectedClient] = useState(null)
  const [commodity, setCommodity] = useState('')
  const [rate, setRate] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [comment, setComment] = useState('')
  const [etaPickup, setEtaPickup] = useState('')
  const [loadingLocation, setLoadingLocation] = useState('')
  const [etaDropoff, setEtaDropoff] = useState('')
  const [dropOffPoint, setDropOffPoint] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [cargoWeight, setCargoWeight] = useState('')
  const [optimizedRoute, setOptimizedRoute] = useState(null)
  const [isOptimizing, setIsOptimizing] = useState(false)

  // Driver assignments state
  const [driverAssignments, setDriverAssignments] = useState([{ id: '', name: '' }])
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [selectedTrailerId, setSelectedTrailerId] = useState('')
  const [selectedVehicleType, setSelectedVehicleType] = useState('')
  const [selectedDriverLocation, setSelectedDriverLocation] = useState(null)
  
  // Cost calculation state
  const [fuelPricePerLiter, setFuelPricePerLiter] = useState('21.55')
  const [estimatedDistance, setEstimatedDistance] = useState(0)
  const [approximateFuelCost, setApproximateFuelCost] = useState(0)
  const [approximatedCPK, setApproximatedCPK] = useState(0)
  const [approximatedVehicleCost, setApproximatedVehicleCost] = useState(0)
  const [approximatedDriverCost, setApproximatedDriverCost] = useState(0)
  const [totalVehicleCost, setTotalVehicleCost] = useState(0)
  const [goodsInTransitPremium, setGoodsInTransitPremium] = useState('')
  const [tripType, setTripType] = useState('local')
  const [stopPoints, setStopPoints] = useState([])
  const [customStopPoints, setCustomStopPoints] = useState([])
  const [tripDays, setTripDays] = useState(1)

  // Cost engine state
  const [costBreakdown, setCostBreakdown] = useState(null)
  const [sellingRatePerKm, setSellingRatePerKm] = useState('')
  const [detectedVehicleType, setDetectedVehicleType] = useState('')
  const [fuelMonthLabel, setFuelMonthLabel] = useState('')
  const [fuelMonths, setFuelMonths] = useState([])

  // Progress stops state
  const DEFAULT_PROGRESS_STOPS = [
    { label: "Departing", value: "departing" },
    { label: "Arrived", value: "arrived-at-loading" },
    { label: "Queuing", value: "queuing-at-loading" },
    { label: "Staging", value: "staging-at-loading" },
    { label: "Loading", value: "loading" },
    { label: "On Trip", value: "on-trip" },
    { label: "Truck Stop", value: "truck-stop" },
    { label: "Refueling", value: "refueling" },
    { label: "Arrived", value: "arrived-at-offloading" },
    { label: "Offloading", value: "offloading" },
    { label: "Weighing", value: "weighing" },
    { label: "Depot", value: "depot" },
    { label: "Handover", value: "handover" },
    { label: "Delivered", value: "delivered" },
  ]
  const [selectedStops, setSelectedStops] = useState(new Set())

  // Rate Card System - Variable Costs
  const RATE_CARD_SYSTEM = {
    'TAUTLINER': {
      fuel_rate: 4070,      // R4,070 fuel component
      base_rate: 7280,      // R7,280 base rate
      ppk: 3.00,           // R3.00 per km
      profit_margin: 0.111, // 11.1%
      extra_stop: 0,       // No extra stop cost
    },
    'TAUT X-BRDER - BOTSWANA': {
      fuel_rate: 3500,
      base_rate: 6500,
      ppk: 2.80,
      profit_margin: 0.10,
      extra_stop: 500,
    },
    'TAUT X-BRDER - NAMIBIA': {
      fuel_rate: 3800,
      base_rate: 7000,
      ppk: 2.90,
      profit_margin: 0.10,
      extra_stop: 500,
    },
    'CITRUS LOAD (+1 DAY STANDING FPT)': {
      fuel_rate: 4070,
      base_rate: 7280,
      ppk: 3.00,
      profit_margin: 0.111,
      extra_stop: 0,
      standing_day_cost: 2000, // Extra standing day cost
    },
    '14M/15M COMBO (NEW)': {
      fuel_rate: 3200,
      base_rate: 6800,
      ppk: 2.50,
      profit_margin: 0.12,
      extra_stop: 300,
    },
    '14M/15M REEFER': {
      fuel_rate: 3500,
      base_rate: 7500,
      ppk: 2.80,
      profit_margin: 0.12,
      extra_stop: 400,
    },
    '9 METER (NEW)': {
      fuel_rate: 2800,
      base_rate: 5500,
      ppk: 2.20,
      profit_margin: 0.11,
      extra_stop: 250,
    },
    '8T JHB (NEW - EPS)': {
      fuel_rate: 2200,
      base_rate: 4800,
      ppk: 1.80,
      profit_margin: 0.10,
      extra_stop: 200,
    },
    '8T JHB (NEW) - X-BRDER - MOZ': {
      fuel_rate: 2400,
      base_rate: 5200,
      ppk: 1.90,
      profit_margin: 0.10,
      extra_stop: 300,
    },
    '8T JHB (OLD)': {
      fuel_rate: 2000,
      base_rate: 4200,
      ppk: 1.60,
      profit_margin: 0.09,
      extra_stop: 150,
    },
    '14 TON CURTAIN': {
      fuel_rate: 3400,
      base_rate: 6200,
      ppk: 2.60,
      profit_margin: 0.11,
      extra_stop: 350,
    },
    '1TON BAKKIE': {
      fuel_rate: 1200,
      base_rate: 2800,
      ppk: 1.20,
      profit_margin: 0.08,
      extra_stop: 100,
    },
  }

  // Fetch stop points function
  const fetchStopPoints = async () => {
    if (availableStopPoints.length > 0) return // Already loaded
    
    setIsLoadingStopPoints(true)
    try {
      const { data: stopPointsData, error: stopPointsError } = await supabase
        .from('stop_points')
        .select('id, name, name2, coordinates')
        .order('name')
      
      if (stopPointsError) {
        console.error('Stop points error:', stopPointsError)
      } else {
        setAvailableStopPoints(stopPointsData || [])
      }
    } catch (err) {
      console.error('Error fetching stop points:', err)
    }
    setIsLoadingStopPoints(false)
  }

  // Get selected stop points with coordinates including custom locations
  const getSelectedStopPointsData = useCallback(async () => {
    const results = []
    
    for (let i = 0; i < stopPoints.length; i++) {
      const pointId = stopPoints[i]
      const customLocation = customStopPoints[i]
      
      if (customLocation) {
        // Geocode custom location using Google
        try {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(customLocation)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_TOKEN}&region=za`
          )
          const data = await response.json()
          if (data.status === 'OK' && data.results?.[0]) {
            const { lat, lng } = data.results[0].geometry.location
            results.push({
              id: `custom_${i}`,
              name: customLocation,
              coordinates: [[lng, lat]]
            })
          }
        } catch (error) {
          console.error('Error geocoding custom location:', error)
        }
      } else if (pointId) {
        // Use existing stop point
        let point = availableStopPoints.find(p => p.id.toString() === pointId)
        
        if (!point) {
          try {
            const { data: pointData, error } = await supabase
              .from('stop_points')
              .select('id, name, name2, coordinates')
              .eq('id', pointId)
              .single()
            
            if (!error && pointData) {
              point = pointData
            }
          } catch (err) {
            console.error('Error fetching individual stop point:', err)
          }
        }
        
        if (point?.coordinates) {
          try {
            const coordPairs = point.coordinates.split(' ')
              .filter(coord => coord.trim())
              .map(coord => {
                const [lng, lat] = coord.split(',')
                return [parseFloat(lng), parseFloat(lat)]
              })
              .filter(pair => !isNaN(pair[0]) && !isNaN(pair[1]))
            
            results.push({
              id: point.id,
              name: point.name,
              coordinates: coordPairs
            })
          } catch (error) {
            console.error('Error parsing coordinates:', error)
          }
        }
      }
    }
    
    return results
  }, [stopPoints, customStopPoints, availableStopPoints])

  // Get user role from cookies
  useEffect(() => {
    const getCookie = (name) => {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) return parts.pop()?.split(';').shift()
      return null
    }
    const role = decodeURIComponent(getCookie('role') || '')
    setUserRole(role)
  }, [])

  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen])

  const fetchData = async () => {
    try {
      // Fetch only essential data first, then load others in background
      const [vehiclesResult, driversResult] = await Promise.all([
        supabase.from('vehiclesc').select('id, registration_number, vehicle_type, branch_name, make, model, cof_date').eq('veh_dormant_flag', false).not('branch_name', 'is', null).neq('branch_name', 'SOLD'),
        supabase.from('drivers').select('id, first_name, surname, available')
      ])
      
      // Format drivers from drivers table
      const formattedDrivers = (driversResult.data || []).map(driver => ({
        id: driver.id,
        name: `${driver.first_name} ${driver.surname}`.trim(),
        first_name: driver.first_name || '',
        surname: driver.surname || '',
        available: driver.available
      }))
      
      // Show all drivers (available filter removed - available may not exist in DB)
      const availableDriversList = formattedDrivers
      
      setVehicles(vehiclesResult.data || [])
      setDrivers(formattedDrivers)
      setAvailableDrivers(availableDriversList)
      
      // Load clients and tracking data in background
      Promise.all([
        fetch('/api/eps-client-list').then(res => res.json()).catch(() => ({ data: [] })),
        fetch('http://64.227.138.235:3000/api/eps-vehicles').then(res => res.json()).catch(() => [])
      ]).then(([clientsResponse, trackingData]) => {
        setClients(clientsResponse.data || [])
        const vehicleData = trackingData?.result?.data || trackingData?.data || trackingData || []
        setVehicleTrackingData(vehicleData)
      })
    } catch (err) {
      console.error('Error fetching data:', err)
    }
  }

  // Handle history-only mode
  useEffect(() => {
    if (trip?.showHistoryOnly && isOpen) {
      setShowHistoryModal(true)
      return
    }
  }, [trip, isOpen])

  // Populate form when trip data is available
  useEffect(() => {
    if (trip && isOpen && !trip.showHistoryOnly) {
      const clientDetails = typeof trip.clientdetails === 'string' ? JSON.parse(trip.clientdetails) : trip.clientdetails
      const pickupLocs = trip.pickup_locations || trip.pickuplocations || []
      const dropoffLocs = trip.dropoff_locations || trip.dropofflocations || []
      const assignments = trip.vehicleassignments || trip.vehicle_assignments || []
      const selectedStopPoints = trip.selected_stop_points || trip.selectedstoppoints || []

      setClient(clientDetails?.name || '')
      setSelectedClient(clientDetails)
      setCommodity(trip.cargo || '')
      setRate(trip.rate || '')
      setOrderNumber(trip.ordernumber || '')
      setComment(trip.notes || trip.status_notes || '')
      setLoadingLocation(trip.origin || '')
      setDropOffPoint(trip.destination || '')
      setEtaPickup(pickupLocs[0]?.scheduled_time || '')
      setEtaDropoff(dropoffLocs[0]?.scheduled_time || '')
      setStartDate(trip.startdate || trip.start_date || '')
      setEndDate(trip.enddate || trip.end_date || '')
      setCargoWeight(trip.cargo_weight || '')
      setTripType(trip.trip_type || 'local')
      setSelectedVehicleType(trip.selected_vehicle_type || '')
      setFuelPricePerLiter(trip.fuel_price_per_liter?.toString() || '21.55')
      setGoodsInTransitPremium(trip.goods_in_transit_premium?.toString() || '')
      setEstimatedDistance(trip.estimated_distance || 0)
      setApproximateFuelCost(trip.approximate_fuel_cost || 0)
      setApproximatedCPK(trip.approximated_cpk || 0)
      setApproximatedVehicleCost(trip.approximated_vehicle_cost || 0)
      setApproximatedDriverCost(trip.approximated_driver_cost || 0)
      setTotalVehicleCost(trip.total_vehicle_cost || 0)
      setTripDays(trip.trip_days || 1)

      // Cost engine data
      setCostBreakdown({
        driverCost: trip.driver_cost || 0,
        fixedAssetCost: trip.fixed_cost || 0,
        fuelCost: trip.fuel_cost || 0,
        rmCost: trip.maintenance_cost || 0,
        crossBorderCost: trip.cross_border_cost || 0,
        totalCost: trip.total_trip_cost || 0,
        costPerKm: trip.cost_per_km || 0,
      })
      setSellingRatePerKm(trip.selling_rate_per_km?.toString() || '')
      setDetectedVehicleType(trip.profile_used || '')

      // Set progress stops
      const tripProgressStops = trip.progress_stops || []
      setSelectedStops(new Set(tripProgressStops.map((s) => s.value)))
      
      // Set driver assignments and vehicle IDs
      if (assignments.length > 0) {
        const assignment = assignments[0]
        setDriverAssignments(assignment.drivers || [{ id: '', name: '' }])
        
        const vehicleId = assignment.vehicle?.id?.toString() || ''
        const trailerId = assignment.trailer?.id?.toString() || ''
        setSelectedVehicleId(vehicleId)
        setSelectedTrailerId(trailerId)
        
        // Detect vehicle type from horse's DB code if available
        if (vehicleId && vehicles.length > 0) {
          const horse = vehicles.find(v => String(v.id) === vehicleId)
          if (horse?.vehicle_type) {
            setDetectedVehicleType(horse.vehicle_type)
          }
        }
      }
      
      // Set stop points
      if (selectedStopPoints.length > 0) {
        const stopPointIds = selectedStopPoints.map(stop => 
          typeof stop === 'object' ? String(stop.id || (stop.type === 'existing' ? stop.id : '')) : String(stop)
        ).filter(Boolean)
        const customPoints = selectedStopPoints.map(stop => 
          typeof stop === 'object' && stop.type === 'custom' ? stop.name : ''
        )
        setStopPoints(stopPointIds)
        setCustomStopPoints(customPoints)
        
        // Pre-populate availableStopPoints from trip data so dropdowns show names immediately
        const existingStops = selectedStopPoints
          .filter(stop => typeof stop === 'object' && stop.type === 'existing' && stop.id)
          .map(stop => ({ id: stop.id, name: stop.name, name2: stop.name2 || '', coordinates: stop.coordinates || '' }))
        if (existingStops.length > 0) {
          setAvailableStopPoints(prev => {
            const merged = [...prev]
            for (const s of existingStops) {
              if (!merged.find(p => String(p.id) === String(s.id))) merged.push(s)
            }
            return merged
          })
        }
        
        // Also fetch full list in background
        fetchStopPoints()
      } else {
        setStopPoints([])
        setCustomStopPoints([])
      }
    }
  }, [trip, isOpen])

  // Fetch fuel months on open
  useEffect(() => {
    if (!isOpen) return
    fetch('/api/fuel-months')
      .then(r => r.json())
      .then(data => {
        if (data.months?.length) {
          setFuelMonths(data.months)
          if (!fuelMonthLabel) setFuelMonthLabel(data.months[0]?.label || '')
        }
      })
      .catch(() => {})
  }, [isOpen])

  // Cost engine calculation — runs when vehicle type, distance, trip days, or fuel month changes
  useEffect(() => {
    // Auto-detect vehicle type from selected horse's vehicle_type DB code
    let effectiveType = detectedVehicleType || selectedVehicleType || ''
    if (selectedVehicleId && vehicles.length > 0) {
      const horse = vehicles.find(v => String(v.id) === String(selectedVehicleId))
      if (horse?.vehicle_type) {
        effectiveType = horse.vehicle_type
        setDetectedVehicleType(horse.vehicle_type)
      }
    }

    const dist = estimatedDistance

    // Calculate trip days from distance if no route
    let calculatedTripDays = tripDays
    if (optimizedRoute?.route?.duration) {
      const durationHours = optimizedRoute.route.duration / 3600
      const rawDays = durationHours / 8
      calculatedTripDays = Math.max(0.5, Math.ceil(rawDays * 2) / 2)
    } else if (dist > 0 && !tripDays) {
      calculatedTripDays = 0.5
    }
    setTripDays(calculatedTripDays)

    if (!effectiveType || !dist || dist <= 0) {
      setCostBreakdown({ driverCost: 0, fixedAssetCost: 0, fuelCost: 0, rmCost: 0, crossBorderCost: 0, totalCost: 0, tripDays: 0 })
      return
    }

    const month = fuelMonthLabel || ''
    const fetchCost = async () => {
      try {
        const res = await fetch('/api/load-plan/calculate-cost', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vehicleType: effectiveType, distanceKm: dist, tripDays: calculatedTripDays, monthLabel: month }),
        })
        const data = await res.json()
        if (!data.error) setCostBreakdown(data)
      } catch (err) {
        console.error('Error calculating cost:', err)
      }
    }
    fetchCost()
  }, [selectedVehicleType, detectedVehicleType, estimatedDistance, fuelMonthLabel, optimizedRoute, selectedVehicleId, vehicles])

  // Rate Card Calculation Function
  const calculateRateCardCost = useCallback((vehicleType, kms, days) => {
    if (!vehicleType || !RATE_CARD_SYSTEM[vehicleType]) {
      return {
        fuel_cost: 0,
        base_cost: 0,
        transport_cost: 0,
        extra_stop_cost: 0,
        standing_day_cost: 0,
        profit_amount: 0,
        total_transport: 0,
        ppk_cost: 0
      }
    }

    const rateCard = RATE_CARD_SYSTEM[vehicleType]
    
    // Rate Card Components
    const fuel_cost = rateCard.fuel_rate // Fixed fuel component
    const base_cost = rateCard.base_rate // Fixed base rate
    const ppk_cost = kms * rateCard.ppk  // Per kilometer cost
    const extra_stop_cost = rateCard.extra_stop || 0
    const standing_day_cost = (rateCard.standing_day_cost || 0) * (days > 1 ? days - 1 : 0)
    
    // Transport Cost = Fuel + Base + PPK + Standing Days
    const transport_cost = fuel_cost + base_cost + ppk_cost + standing_day_cost
    
    // Profit Calculation
    const profit_amount = transport_cost * rateCard.profit_margin
    
    // Total Transport = Transport + Profit + Extra Stops
    const total_transport = transport_cost + profit_amount + extra_stop_cost

    return {
      fuel_cost,
      base_cost,
      transport_cost,
      extra_stop_cost,
      standing_day_cost,
      profit_amount,
      total_transport,
      ppk_cost
    }
  }, [RATE_CARD_SYSTEM])

  // Calculate costs when relevant values change
  useEffect(() => {
    if (selectedVehicleType && estimatedDistance > 0) {
      const costBreakdown = calculateRateCardCost(selectedVehicleType, estimatedDistance, tripDays)
      
      setApproximateFuelCost(costBreakdown.fuel_cost)
      setApproximatedVehicleCost(costBreakdown.base_cost + costBreakdown.ppk_cost)
      setApproximatedDriverCost(costBreakdown.standing_day_cost + costBreakdown.extra_stop_cost)
      setTotalVehicleCost(costBreakdown.total_transport)
      
      // CPK = total cost per kilometer
      const cpk = estimatedDistance > 0 ? costBreakdown.total_transport / estimatedDistance : 0
      setApproximatedCPK(cpk)
    } else {
      // Reset values when no vehicle type selected
      setApproximateFuelCost(0)
      setApproximatedVehicleCost(0)
      setApproximatedDriverCost(0)
      setTotalVehicleCost(0)
      setApproximatedCPK(0)
    }
  }, [selectedVehicleType, estimatedDistance, tripDays, calculateRateCardCost])

  // Calculate distance from optimized route
  useEffect(() => {
    if (optimizedRoute?.distance) {
      const distanceKm = Math.round(optimizedRoute.distance / 1000)
      setEstimatedDistance(distanceKm)
    } else if (!loadingLocation || !dropOffPoint) {
      setEstimatedDistance(0)
    }
  }, [optimizedRoute, loadingLocation, dropOffPoint])

  // Preview route when locations change
  useEffect(() => {
    const previewRoute = async () => {
      if (!loadingLocation || !dropOffPoint) {
        setOptimizedRoute(null)
        return
      }
      
      setIsOptimizing(true)
      try {
        const gm = window.google?.maps
        if (!gm) {
          setIsOptimizing(false)
          return
        }
        
        const geocodeAddress = async (address) => {
          const geocoder = new gm.Geocoder()
          return new Promise((resolve) => {
            geocoder.geocode({ address, region: 'za' }, (results, status) => {
              if (status === 'OK' && results?.[0]?.geometry?.location) {
                const loc = results[0].geometry.location
                resolve({ lat: loc.lat(), lng: loc.lng() })
              } else {
                resolve(null)
              }
            })
          })
        }
        
        // Get stop points data if available
        let stopPointsData = []
        if (stopPoints.length > 0 || customStopPoints.some(p => p)) {
          try {
            stopPointsData = await getSelectedStopPointsData()
            stopPointsData = stopPointsData.filter(point => 
              point && point.coordinates && point.coordinates.length > 0
            )
          } catch (error) {
            console.error('Error getting stop points data:', error)
            stopPointsData = []
          }
        }
        
        const [loadingCoords, dropOffCoords] = await Promise.all([
          geocodeAddress(loadingLocation),
          geocodeAddress(dropOffPoint)
        ])
        
        if (loadingCoords && dropOffCoords) {
          // Build waypoints
          const waypoints = []
          
          // Add stop points as waypoints
          if (stopPointsData.length > 0) {
            stopPointsData.forEach(point => {
              const coords = point.coordinates
              const avgLng = coords.reduce((sum, coord) => sum + coord[0], 0) / coords.length
              const avgLat = coords.reduce((sum, coord) => sum + coord[1], 0) / coords.length
              if (!isNaN(avgLng) && !isNaN(avgLat)) {
                waypoints.push({ location: { lat: avgLat, lng: avgLng }, stopover: true })
              }
            })
          }
          
          // Use Google Directions Service
          const directionsService = new gm.DirectionsService()
          directionsService.route(
            {
              origin: loadingCoords,
              destination: dropOffCoords,
              waypoints: waypoints,
              travelMode: gm.TravelMode.DRIVING,
              optimizeWaypoints: true,
            },
            (res, status) => {
              if (status === 'OK' && res.routes?.[0]) {
                const route = res.routes[0]
                const overviewPath = route.overview_path.map(p => ({ lat: p.lat(), lng: p.lng() }))
                setOptimizedRoute({
                  route: route,
                  distance: route.legs.reduce((sum, leg) => sum + leg.distance.value, 0),
                  duration: route.legs.reduce((sum, leg) => sum + leg.duration.value, 0),
                  geometry: { type: 'LineString', coordinates: overviewPath },
                  stopPoints: stopPointsData
                })
              }
            }
          )
        }
      } catch (error) {
        console.error('Route preview failed:', error)
        setOptimizedRoute(null)
      }
      setIsOptimizing(false)
    }
    
    const timeoutId = setTimeout(previewRoute, 300)
    return () => clearTimeout(timeoutId)
  }, [loadingLocation, dropOffPoint, stopPoints, customStopPoints, getSelectedStopPointsData])

  const handleSubmit = async (e) => {
    e.preventDefault()
    updateTrip()
  }

  const updateTrip = async () => {
    setLoading(true)

    try {
      if (!trip?.id) {
        throw new Error('Trip ID is missing')
      }

      // Store previous trip data for history
      const previousData = { ...trip }

      const updateData = {
        ordernumber: orderNumber,
        rate: rate,
        cargo: commodity,
        origin: loadingLocation,
        destination: dropOffPoint,
        notes: comment,
        
        clientdetails: selectedClient ? {
          name: selectedClient.name,
          email: selectedClient.email || '',
          phone: selectedClient.phone || '',
          address: selectedClient.address || '',
          contactPerson: selectedClient.contact_person || '',
          client_id: selectedClient.client_id || '',
          vat_number: selectedClient.vat_number || ''
        } : {
          name: client,
          email: '',
          phone: '',
          address: '',
          contactPerson: ''
        },
        
        pickuplocations: [{
          location: loadingLocation || '',
          address: loadingLocation || '',
          scheduled_time: etaPickup || ''
        }],
        
        dropofflocations: [{
          location: dropOffPoint || '',
          address: dropOffPoint || '',
          scheduled_time: etaDropoff || ''
        }],
        
        vehicleassignments: [{
          drivers: driverAssignments,
          vehicle: { 
            id: selectedVehicleId, 
            name: selectedVehicleId ? vehicles.find(v => v.id.toString() === selectedVehicleId)?.registration_number || '' : ''
          },
          trailer: {
            id: selectedTrailerId,
            name: selectedTrailerId ? vehicles.find(v => v.id.toString() === selectedTrailerId)?.registration_number || '' : ''
          }
        }],
        
        trip_type: tripType,
        selected_stop_points: stopPoints.map((pointId, index) => {
          if (customStopPoints[index]) {
            return { type: 'custom', name: customStopPoints[index], id: `custom_${index}` }
          } else if (pointId) {
            const point = availableStopPoints.find(p => p.id.toString() === pointId)
            return point ? { type: 'existing', ...point } : null
          }
          return null
        }).filter(Boolean),
        selected_vehicle_type: selectedVehicleType,
        cargo_weight: cargoWeight || null,
        startdate: startDate || null,
        enddate: endDate || null,
        approximate_fuel_cost: approximateFuelCost,
        approximated_cpk: approximatedCPK,
        approximated_vehicle_cost: approximatedVehicleCost,
        approximated_driver_cost: approximatedDriverCost,
        total_vehicle_cost: totalVehicleCost,
        goods_in_transit_premium: parseFloat(goodsInTransitPremium) || null,
        estimated_distance: estimatedDistance,
        fuel_price_per_liter: parseFloat(fuelPricePerLiter) || null,
        updated_at: new Date().toISOString(),
        
        // Cost engine data
        driver_cost: costBreakdown?.driverCost || 0,
        fuel_cost: costBreakdown?.fuelCost || 0,
        maintenance_cost: costBreakdown?.rmCost || 0,
        cross_border_cost: costBreakdown?.crossBorderCost || 0,
        total_trip_cost: costBreakdown?.totalCost || 0,
        fixed_cost: costBreakdown?.fixedAssetCost || 0,
        cost_per_km: costBreakdown?.totalCost && estimatedDistance ? Math.round((costBreakdown.totalCost / estimatedDistance) * 100) / 100 : 0,
        profile_used: detectedVehicleType || '',
        diesel_rate: costBreakdown?.fuelLinkRate || 0,
        selling_rate_per_km: Number(sellingRatePerKm) || 0,
        trip_days: tripDays || 0,
        
        // Progress stops
        progress_stops: DEFAULT_PROGRESS_STOPS
          .filter(s => selectedStops.has(s.value))
          .map((s, i) => ({ order: i + 1, label: s.label, value: s.value, isComplete: false })),
        
        // Always elevate on edit
        elevate: true
      }

      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      // Update trip
      const { error: updateError } = await supabase
        .from('trips')
        .update(updateData)
        .eq('id', trip.id)

      if (updateError) throw updateError

      // Store in trip_history table after updateData is defined
      const { error: historyError } = await supabase
        .from('trip_history')
        .insert({
          trip_id: trip.id,
          previous_data: previousData,
          new_data: updateData,
          change_type: 'edit',
          created_at: new Date().toISOString()
        })
      
      if (historyError) {
        console.warn('Failed to store trip history:', historyError)
        // Continue with update even if history fails
      }

      if (onUpdate && typeof onUpdate === 'function') {
        onUpdate()
      }
      if (onClose && typeof onClose === 'function') {
        onClose()
      }
    } catch (err) {
      console.error('Error updating trip:', err)
      alert(`Failed to update trip: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDecline = async () => {
    setLoading(true)
    
    try {
      if (!trip?.id) {
        throw new Error('Trip ID is missing')
      }

      // Get the most recent trip history to revert to previous version
      const { data: historyData, error: historyError } = await supabase
        .from('trip_history')
        .select('previous_data')
        .eq('trip_id', trip.id)
        .eq('change_type', 'edit')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      let previousData = trip
      
      if (!historyError && historyData?.previous_data) {
        previousData = historyData.previous_data
      }
      
      // Only include valid trip table columns
      const validColumns = [
        'ordernumber', 'rate', 'cargo', 'origin', 'destination', 'notes',
        'clientdetails', 'pickuplocations', 'dropofflocations', 'vehicleassignments',
        'trip_type', 'selected_stop_points', 'selected_vehicle_type',
        'approximate_fuel_cost', 'approximated_cpk', 'approximated_vehicle_cost',
        'approximated_driver_cost', 'total_vehicle_cost', 'goods_in_transit_premium',
        'estimated_distance', 'fuel_price_per_liter', 'status', 'status_notes'
      ]
      
      const revertData = {
        elevate: false,
        updated_at: new Date().toISOString()
      }
      
      // Only add fields that exist in the database
      validColumns.forEach(column => {
        if (previousData.hasOwnProperty(column)) {
          revertData[column] = previousData[column]
        }
      })

      // Update trip with previous data
      const { error: updateError } = await supabase
        .from('trips')
        .update(revertData)
        .eq('id', trip.id)

      if (updateError) throw updateError

      // Store decline action in history
      const { error: declineHistoryError } = await supabase
        .from('trip_history')
        .insert({
          trip_id: trip.id,
          previous_data: trip,
          new_data: revertData,
          change_type: 'decline',
          created_at: new Date().toISOString()
        })
      
      if (declineHistoryError) {
        console.warn('Failed to store decline history:', declineHistoryError)
      }

      if (onUpdate && typeof onUpdate === 'function') {
        onUpdate()
      }
      if (onClose && typeof onClose === 'function') {
        onClose()
      }
    } catch (err) {
      console.error('Error declining trip:', err)
      alert(`Failed to decline trip: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vh] bg-white rounded-lg shadow-lg overflow-y-auto z-50">
          <div className="flex items-center justify-between p-6 border-b">
            <Dialog.Title className="text-xl font-semibold">
              {readOnly ? `Trip Approval - #${trip?.trip_id || trip?.id}` : `Edit Trip #${trip?.trip_id || trip?.id}`}
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="sm">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>
          <div className="p-6">
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Load Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="clientCode">Client Code</Label>
                <ClientDropdown 
                  value={selectedClient ? client : ''} 
                  onChange={(clientData) => {
                    if (typeof clientData === 'object') {
                      setSelectedClient(clientData)
                      setClient(clientData.name)
                    } else {
                      setClient(clientData)
                      setSelectedClient(null)
                    }
                  }} 
                  clients={clients}
                  placeholder="Select client code" 
                />
              </div>
              <div>
                <Label htmlFor="commodity">Commodity</Label>
                <CommodityDropdown value={commodity} onChange={setCommodity} placeholder="Select commodity" />
              </div>
              <div>
                <Label htmlFor="orderNumber">Order Number</Label>
                <Input value={orderNumber} onChange={readOnly ? undefined : (e) => setOrderNumber(e.target.value)} placeholder="Order Number" readOnly={readOnly} className={readOnly ? 'bg-gray-50' : ''} />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="client">Client</Label>
                <ClientNameDisplay 
                  selectedClient={selectedClient}
                  placeholder="Client name will appear here"
                />
              </div>
              <div>
                <Label htmlFor="rate">Rate</Label>
                <Input value={rate} onChange={readOnly ? undefined : (e) => setRate(e.target.value)} placeholder="Rate" readOnly={readOnly} className={readOnly ? 'bg-gray-50' : ''} />
              </div>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="comment">Comment</Label>
              <Input value={comment} onChange={readOnly ? undefined : (e) => setComment(e.target.value)} placeholder="Comment (optional)" readOnly={readOnly} className={readOnly ? 'bg-gray-50' : ''} />
            </div>
          </div>

          {/* Location & Timing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="etaPickup">ETA Pick Up</Label>
              <DateTimePicker
                value={etaPickup}
                onChange={setEtaPickup}
                placeholder="Select pickup date and time"
              />
            </div>
            <div>
              <LocationAutocomplete
                label="Loading Location"
                value={loadingLocation}
                onChange={setLoadingLocation}
                placeholder="Search for loading location"
              />
            </div>
            <div>
              <Label htmlFor="etaDropoff">ETA Drop Off</Label>
              <DateTimePicker
                value={etaDropoff}
                onChange={setEtaDropoff}
                placeholder="Select drop-off date and time"
              />
            </div>
            <div>
              <LocationAutocomplete
                label="Drop Off Point"
                value={dropOffPoint}
                onChange={setDropOffPoint}
                placeholder="Search for drop off location"
              />
            </div>
          </div>

          {/* Trip Type Selection */}
          <div className="space-y-4">
            <Label className="text-lg font-medium">Trip Type</Label>
            <div className="flex space-x-6">
              <div className="flex items-center space-x-2">
                <input 
                  type="radio" 
                  id="local" 
                  name="tripType" 
                  value="local" 
                  checked={tripType === 'local'}
                  onChange={(e) => setTripType(e.target.value)}
                  className="w-4 h-4"
                />
                <Label htmlFor="local">Local Trip</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input 
                  type="radio" 
                  id="national" 
                  name="tripType" 
                  value="national" 
                  checked={tripType === 'national'}
                  onChange={(e) => setTripType(e.target.value)}
                  className="w-4 h-4"
                />
                <Label htmlFor="national">Long Distance</Label>
              </div>
            </div>
          </div>

          {/* Stop Points */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <Label className="text-lg font-medium">Stop Points</Label>
                <p className="text-sm text-gray-500 mt-1">
                  Add stops from existing points or search for custom locations
                </p>
              </div>
              <Button 
                type="button" 
                onClick={async (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  await fetchStopPoints()
                  setStopPoints([...stopPoints, ''])
                }} 
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" /> Add Stop Point
              </Button>
            </div>
            
            {stopPoints.map((stopPoint, index) => (
              <div key={index} className="space-y-2">
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <StopPointDropdown
                      value={stopPoint}
                      onChange={(value) => {
                        const updated = [...stopPoints]
                        updated[index] = value
                        setStopPoints(updated)
                        const updatedCustom = [...customStopPoints]
                        updatedCustom[index] = ''
                        setCustomStopPoints(updatedCustom)
                      }}
                      stopPoints={availableStopPoints}
                      placeholder="Select from existing stop points"
                      isLoading={isLoadingStopPoints}
                    />
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      const updated = stopPoints.filter((_, i) => i !== index)
                      setStopPoints(updated)
                      const updatedCustom = customStopPoints.filter((_, i) => i !== index)
                      setCustomStopPoints(updatedCustom)
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-center text-xs text-gray-500">OR</div>
                <LocationAutocomplete
                  label=""
                  value={customStopPoints[index] || ''}
                  onChange={(value) => {
                    const updatedCustom = [...customStopPoints]
                    while (updatedCustom.length <= index) {
                      updatedCustom.push('')
                    }
                    updatedCustom[index] = value
                    setCustomStopPoints(updatedCustom)
                    if (value) {
                      const updated = [...stopPoints]
                      updated[index] = ''
                      setStopPoints(updated)
                    }
                  }}
                  placeholder="Search for custom stop location"
                />
              </div>
            ))}
          </div>

          {/* Route Preview */}
          {loadingLocation && dropOffPoint && (
            <div className="space-y-4">
              {isOptimizing && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  Optimizing route...
                </div>
              )}
              <RoutePreviewMap
                key={`${loadingLocation}-${dropOffPoint}-${stopPoints.join(',')}-${customStopPoints.join(',')}`}
                origin={loadingLocation}
                destination={dropOffPoint}
                routeData={optimizedRoute}
                stopPoints={stopPoints.length > 0 || customStopPoints.some(p => p) ? 'async' : []}
                getStopPointsData={getSelectedStopPointsData}
              />
              
              {/* Route Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">
                  {tripType === 'local' ? 'Local Route' : 'Long Distance Route'} (Optimized)
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Loading:</span> {loadingLocation}
                  </div>
                  {stopPoints.length > 0 && (
                    <div>
                      <span className="font-medium">Stop Points:</span> {stopPoints.length} stop(s) added
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Drop-off:</span> {dropOffPoint}
                  </div>
                  <div>
                    <span className="font-medium">Trip Type:</span> {tripType === 'local' ? 'Local Trip' : 'Long Distance'}
                  </div>
                  {optimizedRoute && (
                    <div className="border-t pt-2 mt-2">
                      <div className="font-medium text-blue-600 mb-1">Route Information:</div>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="font-medium">Total Distance:</span> {
                            Math.round((optimizedRoute.route?.distance || optimizedRoute.distance) / 1000 * 10) / 10
                          } km
                        </div>
                        <div>
                          <span className="font-medium">Estimated Time:</span> {
                            (() => {
                              const duration = optimizedRoute.route?.duration || optimizedRoute.duration
                              return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`
                            })()
                          }
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Trip Progress Stops */}
          <div className="space-y-3">
            <Label className="text-lg font-medium">Trip Progress Stops</Label>
            <p className="text-xs text-slate-500">Select the workflow steps for this trip</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {DEFAULT_PROGRESS_STOPS.map((stop) => (
                <button
                  key={stop.value}
                  type="button"
                  onClick={() => {
                    const next = new Set(selectedStops)
                    if (next.has(stop.value)) {
                      next.delete(stop.value)
                    } else {
                      next.add(stop.value)
                    }
                    setSelectedStops(next)
                  }}
                  className={cn(
                    "px-3 py-2 rounded-lg border text-xs font-medium transition-all",
                    selectedStops.has(stop.value)
                      ? "bg-blue-500 text-white border-blue-600 shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                  )}
                >
                  {stop.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stop Points */}
          {(stopPoints.length > 0 || customStopPoints.some(p => p)) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-medium">Stop Points</Label>
                <span className="text-xs text-slate-500">{stopPoints.filter(Boolean).length + customStopPoints.filter(Boolean).length} stop(s)</span>
              </div>
              <div className="space-y-2">
                {stopPoints.map((pointId, index) => {
                  if (!pointId && !customStopPoints[index]) return null
                  const point = availableStopPoints.find(p => p.id.toString() === pointId)
                  const name = customStopPoints[index] || point?.name || `Stop ${index + 1}`
                  return (
                    <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center">{index + 1}</span>
                      <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      <span className="text-xs text-slate-700 truncate">{name}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Driver Assignments */}
          <div className="space-y-4">
            <Label className="text-lg font-medium">Driver Assignments</Label>
            {driverAssignments.map((driver, driverIndex) => (
              <div key={driverIndex} className="mb-2">
                <DriverDropdown
                  value={driver.id}
                  onChange={(value) => {
                    const selectedDriver = drivers.find(d => String(d.id) === String(value))
                    setDriverAssignments(prev => {
                      const updated = [...prev]
                      updated[driverIndex] = { 
                        id: value, 
                        name: selectedDriver?.surname || driver.name || '',
                        first_name: selectedDriver?.first_name || driver.first_name || '',
                        surname: selectedDriver?.surname || driver.surname || ''
                      }
                      return updated
                    })
                  }}
                  drivers={(() => {
                    const list = [...availableDrivers]
                    // Ensure assigned driver is always in the list
                    if (driver.id && !list.find(d => String(d.id) === String(driver.id))) {
                      list.unshift({ id: driver.id, name: driver.name || '', first_name: driver.first_name || '', surname: driver.surname || '' })
                    }
                    return list
                  })()}
                  placeholder="Select available driver"
                />
              </div>
            ))}
          </div>

          {/* Vehicle Selection */}
          <div className="space-y-4">
            <Label className="text-lg font-medium">Vehicle Assignment</Label>

            {/* Horse Dropdown - Vehicles only */}
            <div className="space-y-2">
              <Label htmlFor="horse" className="text-sm font-medium text-slate-700">Select Horse</Label>
              <VehicleDropdown
                value={selectedVehicleId}
                onChange={setSelectedVehicleId}
                vehicles={(() => {
                  const horses = vehicles.filter(v => !v.vehicle_type?.startsWith('TR'))
                  // Ensure trip's assigned horse is always in the list
                  if (selectedVehicleId && !horses.find(v => String(v.id) === String(selectedVehicleId))) {
                    const assignment = (trip?.vehicleassignments || trip?.vehicle_assignments || [])[0]
                    const vName = assignment?.vehicle?.name || ''
                    if (vName) horses.unshift({ id: selectedVehicleId, registration_number: vName, make: '', model: '', vehicle_type: '' })
                  }
                  return horses
                })()}
                placeholder="Select horse (vehicle)"
              />
            </div>

            {/* Trailer Dropdown - All except vehicles */}
            <div className="space-y-2">
              <Label htmlFor="trailer" className="text-sm font-medium text-slate-700">Select Trailer</Label>
              <TrailerDropdown
                value={selectedTrailerId}
                onChange={setSelectedTrailerId}
                trailers={(() => {
                  const trailers = vehicles.filter(v => v.vehicle_type?.startsWith('TR'))
                  // Ensure trip's assigned trailer is always in the list
                  if (selectedTrailerId && !trailers.find(t => String(t.id) === String(selectedTrailerId))) {
                    const assignment = (trip?.vehicleassignments || trip?.vehicle_assignments || [])[0]
                    const tName = assignment?.trailer?.name || ''
                    if (tName) trailers.unshift({ id: selectedTrailerId, registration_number: tName, make: '', model: '', vehicle_type: 'TR' })
                  }
                  return trailers
                })()}
                placeholder="Select trailer"
              />
            </div>
          </div>

          {/* Cost Calculation Section */}
          <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-600 rounded-lg">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800">Trip Cost Estimation</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Left Half - Input Fields and Stats */}
              <div className="h-full flex flex-col justify-between space-y-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fuelPrice" className="text-sm font-medium text-slate-700">Fuel Price per Liter</Label>
                      <Input 
                        value={fuelPricePerLiter} 
                        onChange={(e) => setFuelPricePerLiter(e.target.value)} 
                        placeholder="R 20.50" 
                        type="number"
                        step="0.01"
                        className="border-slate-300 focus:border-slate-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tripDays" className="text-sm font-medium text-slate-700">Trip Days</Label>
                      <Input 
                        value={tripDays} 
                        onChange={(e) => setTripDays(parseFloat(e.target.value) || 1)} 
                        placeholder="1" 
                        type="number"
                        step="0.5"
                        min="0.5"
                        className="border-slate-300 focus:border-slate-500"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="goodsInTransit" className="text-sm font-medium text-slate-700">Goods In Transit Premium</Label>
                      <Input 
                        value={goodsInTransitPremium} 
                        onChange={(e) => setGoodsInTransitPremium(e.target.value)} 
                        placeholder="R 0.00" 
                        type="number"
                        step="0.01"
                        className="border-slate-300 focus:border-slate-500"
                      />
                    </div>
                  </div>

                  {/* Cost Engine Display */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-slate-700">Cost Engine</Label>
                      {detectedVehicleType && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{detectedVehicleType}</span>
                      )}
                    </div>
                    {costBreakdown && (
                      <div className="bg-slate-50 rounded-lg p-3 space-y-1.5 text-xs">
                        <div className="flex justify-between"><span className="text-slate-600">Driver</span><span className="font-medium">R{(costBreakdown.driverCost || 0).toFixed(2)} <span className="text-slate-400">({costBreakdown.tripDays || tripDays} DAYS)</span></span></div>
                        <div className="flex justify-between"><span className="text-slate-600">Fixed - Asset</span><span className="font-medium">R{(costBreakdown.fixedAssetCost || 0).toFixed(2)} <span className="text-slate-400">({costBreakdown.tripDays || tripDays} DAYS)</span></span></div>
                        <div className="flex justify-between"><span className="text-slate-600">Fuel</span><span className="font-medium">R{(costBreakdown.fuelCost || 0).toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-slate-600">R&M</span><span className="font-medium">R{(costBreakdown.rmCost || 0).toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-slate-600">Cross Border</span><span className="font-medium">R{(costBreakdown.crossBorderCost || 0).toFixed(2)}</span></div>
                        <div className="border-t pt-1.5 flex justify-between font-bold"><span>TOTAL COST</span><span>R{(costBreakdown.totalCost || 0).toFixed(2)}</span></div>
                        {sellingRatePerKm && Number(sellingRatePerKm) > 0 && (
                          <>
                            <div className="flex justify-between"><span className="text-slate-600">Revenue</span><span className="font-bold">R{Number(sellingRatePerKm).toFixed(2)}</span></div>
                            <div className={cn("flex justify-between font-bold", (Number(sellingRatePerKm) - (costBreakdown.totalCost || 0)) >= 0 ? "text-emerald-600" : "text-red-600")}>
                              <span>PROFIT</span>
                              <span>R{(Number(sellingRatePerKm) - (costBreakdown.totalCost || 0)).toFixed(2)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Distance</p>
                      <p className="text-2xl font-bold text-slate-800 mt-2">{estimatedDistance}</p>
                      <p className="text-xs text-slate-600">kilometers</p>
                    </div>
                    <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Cost Per KM</p>
                      <p className="text-2xl font-bold text-slate-800 mt-2">R{costBreakdown?.costPerKm?.toFixed(2) || '0.00'}</p>
                      <p className="text-xs text-slate-600">per km</p>
                    </div>
                  </div>
                </div>
                
                {/* Total Cost - Bottom Aligned */}
                <div className="p-6 bg-gradient-to-r from-slate-600 to-slate-700 rounded-xl shadow-lg">
                  <p className="text-sm font-medium text-slate-200 uppercase tracking-wide">Total Estimated Cost</p>
                  <p className="text-3xl font-bold text-white mt-2">R{totalVehicleCost.toLocaleString()}</p>
                  <p className="text-sm text-slate-300 mt-1">All expenses included</p>
                </div>
              </div>

              {/* Right Half - Stylish Bar Chart */}
              <div className="h-full flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Cost Breakdown</h4>
                </div>
                <div className="flex-1 w-full p-4 bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-200 shadow-lg">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Fuel', value: approximateFuelCost, fill: 'url(#fuelGradient)' },
                        { name: 'Vehicle', value: approximatedVehicleCost, fill: 'url(#vehicleGradient)' },
                        { name: 'Driver', value: approximatedDriverCost, fill: 'url(#driverGradient)' },
                        ...(parseFloat(goodsInTransitPremium) > 0 ? [{ name: 'Premium', value: parseFloat(goodsInTransitPremium), fill: 'url(#premiumGradient)' }] : [])
                      ]}
                      margin={{ top: 20, right: 30, left: 40, bottom: 20 }}
                    >
                      <defs>
                        <linearGradient id="fuelGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.9}/>
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.7}/>
                        </linearGradient>
                        <linearGradient id="vehicleGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#34d399" stopOpacity={0.9}/>
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0.7}/>
                        </linearGradient>
                        <linearGradient id="driverGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.9}/>
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.7}/>
                        </linearGradient>
                        <linearGradient id="premiumGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.9}/>
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.7}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid 
                        strokeDasharray="2 4" 
                        stroke="#e2e8f0" 
                        strokeOpacity={0.6}
                        vertical={false}
                      />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 13, fill: '#475569', fontWeight: 500 }}
                        axisLine={{ stroke: '#cbd5e1', strokeWidth: 2 }}
                        tickLine={{ stroke: '#cbd5e1' }}
                      />
                      <YAxis 
                        tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
                        axisLine={{ stroke: '#cbd5e1', strokeWidth: 2 }}
                        tickLine={{ stroke: '#cbd5e1' }}
                        tickFormatter={(value) => `R${value.toLocaleString()}`}
                      />
                      <Tooltip 
                        formatter={(value, name) => [
                          `R${value.toLocaleString()}`, 
                          `${name} Cost`
                        ]}
                        labelStyle={{ 
                          color: '#1e293b', 
                          fontWeight: 600,
                          fontSize: '14px'
                        }}
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                          border: 'none',
                          borderRadius: '12px',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                          backdropFilter: 'blur(10px)'
                        }}
                        cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                      />
                      <Bar 
                        dataKey="value" 
                        radius={[8, 8, 0, 0]}
                        strokeWidth={2}
                        stroke="rgba(255, 255, 255, 0.3)"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Legend */}
                <div className="flex flex-wrap gap-3 justify-center">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full border border-blue-200">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-b from-blue-400 to-blue-600"></div>
                    <span className="text-xs font-medium text-blue-700">Fuel</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full border border-green-200">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-b from-green-400 to-green-600"></div>
                    <span className="text-xs font-medium text-green-700">Vehicle</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 rounded-full border border-yellow-200">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-b from-yellow-400 to-yellow-600"></div>
                    <span className="text-xs font-medium text-yellow-700">Driver</span>
                  </div>
                  {parseFloat(goodsInTransitPremium) > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-full border border-purple-200">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-b from-purple-400 to-purple-600"></div>
                      <span className="text-xs font-medium text-purple-700">Premium</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            {showApprovalButtons ? (
              <>
                <Button 
                  type="button" 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={onApprove}
                >
                  Approve Trip
                </Button>
                <Button 
                  type="button" 
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDecline}
                  disabled={loading}
                >
                  {loading ? 'Declining...' : 'Decline Trip'}
                </Button>
                {userRole === 'admin' && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowHistoryModal(true)}
                    className="flex-1"
                  >
                    View History
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                {userRole === 'admin' && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowHistoryModal(true)}
                  >
                    View History
                  </Button>
                )}
                {!readOnly && (
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? 'Updating...' : 'Update Trip'}
                  </Button>
                )}
              </>
            )}
          </div>
        </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
      

    </Dialog.Root>
    
    {showHistoryModal && (
      <TripHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        tripId={trip?.id}
      />
    )}
    </>
  )
}