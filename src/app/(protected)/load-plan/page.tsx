"use client"

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SecureButton } from '@/components/SecureButton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogPortal, DialogOverlay } from '@/components/ui/dialog'
import { X, FileText, Plus, Route, MapPin, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { LocationAutocomplete } from '@/components/ui/location-autocomplete'
import { ProgressWithWaypoints } from '@/components/ui/progress-with-waypoints'
import { RouteOptimizer } from '@/components/ui/route-optimizer'
import { RouteTracker } from '@/components/ui/route-tracker'
import { RoutePreviewMap } from '@/components/ui/route-preview-map'
import { RouteConfirmationModal } from '@/components/ui/route-confirmation-modal'
import { RouteEditModal } from '@/components/ui/route-edit-modal'
import { DateTimePicker } from '@/components/ui/datetime-picker'
import { CommodityDropdown } from '@/components/ui/commodity-dropdown'
import { ClientDropdown } from '@/components/ui/client-dropdown'
import { ClientNameDisplay } from '@/components/ui/client-name-display'
import { ClientAddressPopup } from '@/components/ui/client-address-popup'
import { QuickGeozoneDialog } from '@/components/ui/quick-geozone-dialog'
import { Toast } from '@/components/ui/toast'
import { DriverDropdown } from '@/components/ui/driver-dropdown'
import { VehicleDropdown } from '@/components/ui/vehicle-dropdown'
import { TrailerDropdown } from '@/components/ui/trailer-dropdown'
import { StopPointDropdown } from '@/components/ui/stop-point-dropdown'
import { markDriversUnavailable } from '@/lib/utils/driver-availability'
import { resolveProfileKey } from '@/lib/cost-engine'


export default function LoadPlanPage() {
  const supabase = createClient()
  const router = useRouter()
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success' | 'error', isVisible: false })
  const [isEditMode, setIsEditMode] = useState(false)
  const [editTripId, setEditTripId] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type, isVisible: true })
  }
  const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }))
  const [loads, setLoads] = useState([
    {
      id: 'test-1',
      trip_id: 'TEST-123',
      client: 'Test Client',
      commodity: 'Test Cargo',
      rate: '1000',
      startdate: '2025-01-15',
      enddate: '2025-01-16',
      status: 'pending',
      vehicleassignments: []
    }
  ])
  const [clients, setClients] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [drivers, setDrivers] = useState([])
  const [costCenters, setCostCenters] = useState([])
  const [availableDrivers, setAvailableDrivers] = useState([])
  const [vehicleTrackingData, setVehicleTrackingData] = useState([])

  // Create Load form state
  const [client, setClient] = useState('')
  const [selectedClient, setSelectedClient] = useState(null)
  const [manualClientName, setManualClientName] = useState('')
  const [showAddressPopup, setShowAddressPopup] = useState(false)
  const [showQuickGeozoneDialog, setShowQuickGeozoneDialog] = useState(false)
  const [commodity, setCommodity] = useState('')
  const [costCenter, setCostCenter] = useState('')
  const [rate, setRate] = useState('')
  const [orderNumber, setOrderNumber] = useState(`ORD-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`)
  const [comment, setComment] = useState('')
  // Address & ETA section
  const [etaPickup, setEtaPickup] = useState('')
  const [loadingLocation, setLoadingLocation] = useState('')
  const [loadingLocationCoords, setLoadingLocationCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [loadingGeozoneCoords, setLoadingGeozoneCoords] = useState(null)
  const [etaDropoff, setEtaDropoff] = useState('')
  const [dropOffPoint, setDropOffPoint] = useState('')
  const [dropoffLocationCoords, setDropoffLocationCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [dropoffGeozoneCoords, setDropoffGeozoneCoords] = useState(null)
  const [showSecondSection, setShowSecondSection] = useState(false)
  const secondRef = useRef<HTMLDivElement | null>(null)
  const [optimizedRoute, setOptimizedRoute] = useState<any>(null)
  const [showRouteModal, setShowRouteModal] = useState(false)
  const [isOptimizing, setIsOptimizing] = useState(false)

  // Driver assignments state
  const [driverAssignments, setDriverAssignments] = useState([{ id: '', name: '' }])
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [selectedTrailerId, setSelectedTrailerId] = useState('')
  const [selectedVehicleType, setSelectedVehicleType] = useState('')
  const [selectedDriverLocation, setSelectedDriverLocation] = useState(null)
  
  const [estimatedDistance, setEstimatedDistance] = useState(0)
  const [tripDays, setTripDays] = useState(1)
  const [stopsCount, setStopsCount] = useState(0)

  // Cost Engine state
  const [fuelMonths, setFuelMonths] = useState<{ month_label: string; link_rate: number }[]>([])
  const [fuelMonthLabel, setFuelMonthLabel] = useState('')
  const [fuelLinkRate, setFuelLinkRate] = useState(0)
  const [sellingRatePerKm, setSellingRatePerKm] = useState('')
  const [costBreakdown, setCostBreakdown] = useState<any>({ driverCost: 0, fixedAssetCost: 0, fuelCost: 0, rmCost: 0, crossBorderCost: 0, totalCost: 0, tripDays: 0 })
  const [detectedVehicleType, setDetectedVehicleType] = useState('')
  const [vehicleTypeNotFound, setVehicleTypeNotFound] = useState(false)
  const [tripType, setTripType] = useState('local')
  const [stopPoints, setStopPoints] = useState([])
  const [availableStopPoints, setAvailableStopPoints] = useState([])
  const [isLoadingStopPoints, setIsLoadingStopPoints] = useState(false)
  const [customStopPoints, setCustomStopPoints] = useState([])
  const [isManuallyOrdered, setIsManuallyOrdered] = useState(false)

  // Progress stops
  const DEFAULT_PROGRESS_STOPS = [
    { label: "Departing",  value: "departing" },
    { label: "Arrived",    value: "arrived-at-loading" },
    { label: "Queuing",    value: "queuing-at-loading" },
    { label: "Staging",    value: "staging-at-loading" },
    { label: "Loading",    value: "loading" },
    { label: "On Trip",    value: "on-trip" },
    { label: "Truck Stop", value: "truck-stop" },
    { label: "Refueling",  value: "refueling" },
    { label: "Arrived",    value: "arrived-at-offloading" },
    { label: "Offloading", value: "offloading" },
    { label: "Weighing",   value: "weighing" },
    { label: "Depot",      value: "depot" },
    { label: "Handover",   value: "handover" },
    { label: "Delivered",  value: "delivered" },
  ]
  const [selectedStops, setSelectedStops] = useState<Set<string>>(new Set(DEFAULT_PROGRESS_STOPS.map(s => s.value)))
  const [useDefaultStops, setUseDefaultStops] = useState(true)

  const addressDecisionRef = useRef(null)

  const doesClientHaveGeozone = (clientData) => {
    if (!clientData?.coordinates) return false
    try {
      const parsed = JSON.parse(clientData.coordinates)
      return Array.isArray(parsed) && parsed.length >= 3
    } catch {
      return false
    }
  }

  const extractFirstCoord = (clientData) => {
    if (!clientData?.coordinates) return null
    try {
      const parsed = JSON.parse(clientData.coordinates)
      if (Array.isArray(parsed) && parsed.length > 0) {
        const first = Array.isArray(parsed[0]) ? parsed[0] : parsed
        return { lng: Number(first[0]), lat: Number(first[1]) }
      }
    } catch {}
    try {
      const parts = clientData.coordinates.split(' ')[0].split(',')
      if (parts.length >= 2) {
        return { lng: Number(parts[0]), lat: Number(parts[1]) }
      }
    } catch {}
    return null
  }



  // Fetch loads and reference data
  // Fetch stop points with pagination and caching
  const fetchStopPoints = async () => {
    if (availableStopPoints.length > 0) return // Already loaded
    
    setIsLoadingStopPoints(true)
    try {
      const { data: stopPointsData, error: stopPointsError } = await supabase
        .from('stop_points')
        .select('id, name, name2, coordinates')
        .order('name')
        // .limit(1000) // Removed limit to get all stop points
      
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

  const fetchData = async () => {
    console.log('Starting fetchData...')
    try {
      console.log('Fetching from Supabase...')
      
      // Recursive fetch for vehicles to get all records
      const fetchAllVehicles = async () => {
        let allVehicles = []
        let from = 0
        const batchSize = 1000
        let hasMore = true
        
        while (hasMore) {
          const { data, error } = await supabase
            .from('vehiclesc')
            .select('id, registration_number, engine_number, vin_number, make, model, sub_model, manufactured_year, vehicle_type, veh_dormant_flag')
            .range(from, from + batchSize - 1)
          
          if (error) throw error
          if (!data || data.length === 0) break
          
          allVehicles = [...allVehicles, ...data]
          hasMore = data.length === batchSize
          from += batchSize
        }
        
        return allVehicles
      }
      
      const [
        { data: loadsData, error: loadsError },
        { data: clientsData, error: clientsError },
        vehiclesData,
        { data: driversData, error: driversError },
        { data: costCentersData, error: costCentersError },
        trackingResponse
      ] = await Promise.all([
        supabase.from('trips').select('*').order('created_at', { ascending: false }),
        fetch('/api/eps-client-list').then(res => res.json()).then(data => ({ data: data.data, error: null })).catch(error => ({ data: null, error })),
        fetchAllVehicles(),
        supabase.from('drivers').select('*'),
        supabase.from('cost_centers').select('*'),
        fetch('/api/eps-vehicles')
      ])
      
      console.log('Supabase errors:', { loadsError, clientsError, driversError, costCentersError })
      console.log('Total vehicles fetched:', vehiclesData?.length || 0)
      console.log('Sample vehicles:', vehiclesData?.slice(0, 5).map(v => ({ reg: v.registration_number, type: v.vehicle_type })))
      
      const trackingData = await trackingResponse.json()
      const vehicleData = trackingData?.result?.data || trackingData?.data || []
      
      // Format drivers from drivers table
      const formattedDrivers = (driversData || []).map(driver => ({
        id: driver.id,
        name: `${driver.first_name} ${driver.surname}`.trim(),
        first_name: driver.first_name || '',
        surname: driver.surname || '',
        available: driver.available
      }))
      
      // Filter available drivers
      const availableDriversList = formattedDrivers.filter(d => d.available === true)
      
      // Helper function to parse JSON fields
      const parseJsonField = (field) => {
        if (!field) return null
        if (typeof field === 'object') return field
        try {
          return JSON.parse(field)
        } catch {
          return null
        }
      }
      
      // Convert trip data to load format for display
      const loadData = (loadsData || []).map(trip => {
        const clientDetails = parseJsonField(trip.clientdetails)
        const pickupLocations = parseJsonField(trip.pickuplocations)
        const dropoffLocations = parseJsonField(trip.dropofflocations)
        
        return {
          ...trip,
          client: clientDetails?.name || '',
          commodity: trip.cargo || '',
          etaPickup: pickupLocations?.[0]?.scheduled_time || trip.startdate || '',
          etaDropoff: dropoffLocations?.[0]?.scheduled_time || trip.enddate || '',
          loadingLocation: trip.origin || '',
          dropOffPoint: trip.destination || ''
        }
      })
      
      console.log('Raw loads data:', loadsData)
      console.log('Raw loads count:', loadsData?.length || 0)
      console.log('Processed load data:', loadData)
      console.log('Processed loads count:', loadData?.length || 0)
      
      setLoads(loadData)
      setClients(clientsData || [])
      setVehicles(vehiclesData || [])
      setDrivers(formattedDrivers)
      setAvailableDrivers(availableDriversList)
      setVehicleTrackingData(vehicleData)
      setCostCenters(costCentersData || [])
      setAvailableStopPoints([])
    } catch (err) {
      console.error('Error fetching data:', err)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Fetch fuel months on mount
  useEffect(() => {
    const fetchFuelMonths = async () => {
      try {
        const res = await fetch('/api/fuel-months')
        const data = await res.json()
        if (data.months && data.months.length > 0) {
          setFuelMonths(data.months)
          setFuelMonthLabel(data.months[0].month_label)
          setFuelLinkRate(Number(data.months[0].link_rate))
        }
      } catch (err) {
        console.error('Error fetching fuel months:', err)
      }
    }
    fetchFuelMonths()
  }, [])

  // Update fuel link rate when month changes
  useEffect(() => {
    if (!fuelMonthLabel) return
    const match = fuelMonths.find(m => m.month_label === fuelMonthLabel)
    if (match) setFuelLinkRate(Number(match.link_rate))
  }, [fuelMonthLabel, fuelMonths])

  // Calculate cost breakdown when inputs change
  useEffect(() => {
    // Detect vehicle type from selected horse's vehicle_type DB code
    let effectiveType = ''
    let notFound = false
    if (selectedVehicleId) {
      const horse = vehicles.find(v => String(v.id) === String(selectedVehicleId))
      if (horse) {
        const dbType = horse.vehicle_type || ''
        const profileKey = resolveProfileKey(dbType)
        if (profileKey) {
          effectiveType = profileKey
          notFound = false
        } else {
          effectiveType = ''
          notFound = true
        }
      }
    }

    setDetectedVehicleType(effectiveType)
    setVehicleTypeNotFound(notFound)

    const dist = optimizedRoute?.route?.distance
      ? Math.round((optimizedRoute.route.distance / 1000) * 10) / 10
      : estimatedDistance

    // Calculate trip days from route duration (seconds → working days, rounded up to nearest 0.5)
    let calculatedTripDays = 0
    if (optimizedRoute?.route?.duration) {
      const durationHours = optimizedRoute.route.duration / 3600
      const rawDays = durationHours / 8
      calculatedTripDays = Math.max(0.5, Math.ceil(rawDays * 2) / 2)
    } else if (dist > 0) {
      calculatedTripDays = 0.5
    }
    setTripDays(calculatedTripDays)

    // Need at least vehicle type and distance
    if (!effectiveType || !dist || dist <= 0) {
      setCostBreakdown({
        driverCost: 0, fixedAssetCost: 0, fuelCost: 0, rmCost: 0,
        crossBorderCost: 0, totalCost: 0, tripDays: 0,
      })
      return
    }

    const month = fuelMonthLabel || ''

    const fetchCost = async () => {
      try {
        const res = await fetch('/api/load-plan/calculate-cost', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vehicleType: effectiveType,
            distanceKm: dist,
            tripDays: calculatedTripDays,
            monthLabel: month,
          }),
        })
        const data = await res.json()
        if (!data.error) setCostBreakdown(data)
      } catch (err) {
        console.error('Error calculating cost:', err)
      }
    }
    fetchCost()
  }, [selectedVehicleId, estimatedDistance, fuelMonthLabel, optimizedRoute, vehicles])

  // Vehicle type options
  const vehicleTypeOptions = [
    'TAUTLINER',
    'TAUT X-BRDER - BOTSWANA',
    'TAUT X-BRDER - NAMIBIA', 
    'CITRUS LOAD (+1 DAY STANDING FPT)',
    '14M/15M COMBO (NEW)',
    '14M/15M REEFER',
    '9 METER (NEW)',
    '8T JHB (NEW - EPS)',
    '8T JHB (NEW) - X-BRDER - MOZ',
    '8T JHB (OLD)',
    '14 TON CURTAIN',
    '1TON BAKKIE'
  ]

  // Filter vehicles based on selected type
  const filteredVehicles = useMemo(() => {
    // Exclude 'trailer' type from all results
    const nonTrailers = vehicles.filter(v => v.vehicle_type !== 'trailer')
    console.log('Non-trailer vehicles:', nonTrailers.length)
    console.log('Sample non-trailers:', nonTrailers.slice(0, 5).map(v => ({ reg: v.registration_number, type: v.vehicle_type })))
    
    if (!selectedVehicleType) return nonTrailers
    
    // Map vehicle_type codes to vehicle type categories
    const typeMapping = {
      'TAUTLINER': ['TRTR', 'TRFLT', 'TRRLT', 'TRTRS', 'vehicle'],
      'TAUT X-BRDER - BOTSWANA': ['TRTR', 'TRFLT', 'TRRLT', 'TRTRS', 'vehicle'],
      'TAUT X-BRDER - NAMIBIA': ['TRTR', 'TRFLT', 'TRRLT', 'TRTRS', 'vehicle'],
      'CITRUS LOAD (+1 DAY STANDING FPT)': ['TRTR', 'TRFLT', 'TRRLT', 'TRTRS', 'vehicle'],
      '14M/15M COMBO (NEW)': ['TR14M', 'vehicle'],
      '14M/15M REEFER': ['TR14M', 'vehicle'],
      '9 METER (NEW)': ['TRS9M', 'vehicle'],
      '8T JHB (NEW - EPS)': ['R8T', 'vehicle'],
      '8T JHB (NEW) - X-BRDER - MOZ': ['R8T', 'vehicle'],
      '8T JHB (OLD)': ['R8T', 'vehicle'],
      '14 TON CURTAIN': ['vehicle', 'VFD'],
      '1TON BAKKIE': ['LDV', 'LPV', 'R5T', 'vehicle']
    }
    
    const allowedTypes = typeMapping[selectedVehicleType] || []
    console.log('Selected vehicle type:', selectedVehicleType)
    console.log('Allowed types:', allowedTypes)
    
    if (allowedTypes.length === 0) return nonTrailers
    
    const filtered = nonTrailers.filter(vehicle => 
      allowedTypes.includes(vehicle.vehicle_type)
    )
    console.log('Filtered vehicles:', filtered.length)
    console.log('Sample filtered:', filtered.slice(0, 5).map(v => ({ reg: v.registration_number, type: v.vehicle_type })))
    
    return filtered
  }, [vehicles, selectedVehicleType])

  // Filter trailers - exclude only 'vehicle' type
  const filteredTrailers = useMemo(() => {
    const trailers = vehicles.filter(v => v.vehicle_type !== 'vehicle')
    const trfltVehicles = vehicles.filter(v => v.vehicle_type === 'TRFLT')
    console.log('Filtered trailers:', trailers.length)
    console.log('Sample trailers:', trailers.slice(0, 5).map(v => ({ reg: v.registration_number, type: v.vehicle_type })))
    console.log('TRFLT vehicles found:', trfltVehicles.length)
    console.log('TRFLT samples:', trfltVehicles.slice(0, 3).map(v => ({ reg: v.registration_number, type: v.vehicle_type })))
    return trailers
  }, [vehicles])

  // Memoized vehicle and driver lookups
  const vehicleMap = useMemo(() => 
    new Map(vehicles.map(v => [v.id, v.registration_number])), [vehicles]
  )
  
  const driverMap = useMemo(() => 
    new Map(drivers.map(d => [d.id, `${d.first_name} ${d.surname}`])), [drivers]
  )

  // Calculate distance between two coordinates
  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }, [])

  // Get pickup location coordinates using Google Geocoding API
  const getPickupCoordinates = useCallback(async (location) => {
    if (!location) return null
    try {
      const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_TOKEN
      if (!googleKey) return null
      
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${googleKey}&region=za`
      )
      const data = await response.json()
      if (data.status === 'OK' && data.results?.[0]) {
        const { lat, lng } = data.results[0].geometry.location
        return { lat, lon: lng }
      }
    } catch (error) {
      console.error('Error geocoding pickup location:', error)
    }
    return null
  }, [])

  // Get sorted drivers by distance from pickup location
  const getSortedDriversByDistance = useCallback(async (pickupLocation) => {
    if (!pickupLocation) return drivers
    
    const pickupCoords = await getPickupCoordinates(pickupLocation)
    if (!pickupCoords) return drivers
    
    const trackingData = Array.isArray(vehicleTrackingData) ? vehicleTrackingData : []
    if (trackingData.length === 0) return drivers
    
    const driversWithDistance = drivers.map(driver => {
      const surname = driver.surname?.trim().toLowerCase()
      const firstName = driver.first_name?.trim().toLowerCase()
      const fullName = `${firstName} ${surname}`.trim()
      
      const matchingVehicle = trackingData.find(vehicle => {
        if (!vehicle.driver_name) return false
        const vehicleDriverName = vehicle.driver_name.trim().toLowerCase()
        return vehicleDriverName === surname || vehicleDriverName === fullName || vehicleDriverName.includes(surname)
      })
      
      if (matchingVehicle?.latitude && matchingVehicle?.longitude) {
        const distance = calculateDistance(
          pickupCoords.lat, pickupCoords.lon,
          parseFloat(matchingVehicle.latitude), parseFloat(matchingVehicle.longitude)
        )
        return { ...driver, distance: Math.round(distance * 10) / 10 }
      }
      
      return { ...driver, distance: null }
    })
    
    // Sort by distance (closest first, then drivers without coordinates)
    return driversWithDistance.sort((a, b) => {
      if (a.distance === null && b.distance === null) return 0
      if (a.distance === null) return 1
      if (b.distance === null) return -1
      return a.distance - b.distance
    })
  }, [drivers, calculateDistance, getPickupCoordinates, vehicleTrackingData])

  // State for sorted drivers
  const [sortedDrivers, setSortedDrivers] = useState(drivers)
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false)



  // Preview route when locations change - get Mapbox timing data
  useEffect(() => {
    const previewRoute = async () => {
      console.log('Route preview triggered:', { loadingLocation, dropOffPoint, stopPoints, customStopPoints })
      if (!loadingLocation || !dropOffPoint) {
        setOptimizedRoute(null)
        return
      }
      
      setIsOptimizing(true)
      try {
        const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
        const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_TOKEN
        if (!mapboxToken) {
          setIsOptimizing(false)
          return
        }
        
        // Check if we have driver location for complete route
        const firstDriver = driverAssignments[0]
        let driverLocation = null
        
        if (firstDriver?.id) {
          const driver = drivers.find(d => d.id === firstDriver.id)
          if (driver) {
            const driverFullName = `${driver.first_name} ${driver.surname}`.trim().toLowerCase()
            const trackingData = Array.isArray(vehicleTrackingData) ? vehicleTrackingData : []
            const matchingVehicle = trackingData.find(vehicle => 
              vehicle.driver_name && 
              vehicle.driver_name.toLowerCase() === driverFullName
            )
            
            if (matchingVehicle?.latitude && matchingVehicle?.longitude) {
              driverLocation = {
                lat: parseFloat(matchingVehicle.latitude),
                lng: parseFloat(matchingVehicle.longitude)
              }
            }
          }
        }
        
        // Get stop points data if available
        let stopPointsData = []
        if (stopPoints.length > 0 || customStopPoints.some(p => p)) {
          try {
            stopPointsData = await getSelectedStopPointsData()
            console.log('Stop points data for route:', stopPointsData)
            stopPointsData = stopPointsData.filter(point => 
              point && point.coordinates && point.coordinates.length > 0
            )
          } catch (error) {
            console.error('Error getting stop points data:', error)
            stopPointsData = []
          }
        }
        
        // Geocode loading and drop-off locations using Google
        const geocodeUrl = 'https://maps.googleapis.com/maps/api/geocode/json'
        const [loadingData, dropOffData] = await Promise.all([
          fetch(`${geocodeUrl}?address=${encodeURIComponent(loadingLocation)}&key=${googleKey}&region=za`).then(r => r.json()),
          fetch(`${geocodeUrl}?address=${encodeURIComponent(dropOffPoint)}&key=${googleKey}&region=za`).then(r => r.json())
        ])
        
        if (loadingData.status === 'OK' && dropOffData.status === 'OK' && loadingData.results?.[0] && dropOffData.results?.[0]) {
          const { lat: originLat, lng: originLng } = loadingData.results[0].geometry.location
          const { lat: destLat, lng: destLng } = dropOffData.results[0].geometry.location
          
          // Build waypoints string for Mapbox Directions (lng,lat;lng,lat)
          let waypoints = `${originLng},${originLat}`
          
          if (driverLocation) {
            waypoints = `${driverLocation.lng},${driverLocation.lat};${waypoints}`
          }
          
          if (stopPointsData.length > 0) {
            const stopWaypoints = stopPointsData.map(point => {
              const coords = point.coordinates
              const avgLng = coords.reduce((sum, coord) => sum + coord[0], 0) / coords.length
              const avgLat = coords.reduce((sum, coord) => sum + coord[1], 0) / coords.length
              return `${avgLng},${avgLat}`
            }).filter(waypoint => waypoint && !waypoint.includes('NaN'))
            
            if (stopWaypoints.length > 0) {
              waypoints += `;${stopWaypoints.join(';')}`
            }
          }
          
          waypoints += `;${destLng},${destLat}`
          
          console.log('Calculating route with waypoints:', waypoints)
          
          const apiEndpoint = `https://api.mapbox.com/directions/v5/mapbox/driving/${waypoints}`
          const apiParams = 'geometries=geojson&overview=full&annotations=duration,distance&exclude=ferry'
          
          const directionsResponse = await fetch(
            `${apiEndpoint}?access_token=${mapboxToken}&${apiParams}`
          )
          
          if (!directionsResponse.ok) {
            console.error('API request failed:', directionsResponse.status, directionsResponse.statusText)
            setOptimizedRoute(null)
            return
          }
          
          const directionsData = await directionsResponse.json()
          console.log('Directions API response:', directionsData)
          
          if (directionsData.code !== 'Ok') {
            console.error('API returned error:', directionsData)
            setOptimizedRoute(null)
            return
          }
          
          const route = directionsData.routes?.[0]
          if (route) {
            const numStops = stopPointsData.length
            const totalDurationHours = route.duration / 3600
            const stopDelayHours = numStops * 1
            const totalHours = totalDurationHours + stopDelayHours
            const calculatedDays = Math.ceil(totalHours / 10)
            setStopsCount(numStops)
            setTripDays((prev) => Math.max(prev, calculatedDays || 1))
            
            const routeInfo = {
              route: route,
              distance: route.distance,
              duration: route.duration,
              hasDriverLocation: !!driverLocation,
              stopPoints: stopPointsData,
              geometry: route.geometry
            }
            console.log('Setting optimized route:', routeInfo)
            setOptimizedRoute(routeInfo)
          } else {
            console.error('No routes found:', directionsData)
            setOptimizedRoute(null)
          }
        }
      } catch (error) {
        console.error('Route preview failed:', error)
        setOptimizedRoute(null)
      }
      setIsOptimizing(false)
    }
    
    // Add a small delay to prevent too frequent updates
    const timeoutId = setTimeout(previewRoute, 500)
    return () => clearTimeout(timeoutId)
  }, [loadingLocation, dropOffPoint, stopPoints, customStopPoints, driverAssignments, isManuallyOrdered])



  // Update sorted drivers when pickup location changes
  useEffect(() => {
    if (loadingLocation) {
      // Refresh vehicle tracking data when location changes
      fetch('/api/eps-vehicles')
        .then(response => response.json())
        .then(trackingData => {
          const vehicleData = trackingData?.result?.data || trackingData?.data || []
          setVehicleTrackingData(vehicleData)
          return getSortedDriversByDistance(loadingLocation)
        })
        .then((sorted) => {
          setSortedDrivers(sorted)
          const availableWithDistance = sorted.filter(d => d.available === true)
          setAvailableDrivers(availableWithDistance)
        })
        .catch(error => {
          console.error('Error updating driver distances:', error)
        })
    } else {
      setSortedDrivers(drivers)
      setAvailableDrivers(drivers.filter(d => d.available === true))
    }
  }, [loadingLocation])

  // Calculate estimated distance when locations change
  useEffect(() => {
    const calculateRouteDistance = async () => {
      if (!loadingLocation || !dropOffPoint) {
        console.log('Missing locations for distance calc:', { loadingLocation, dropOffPoint })
        setEstimatedDistance(0)
        return
      }
      
      try {
        const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_TOKEN
        if (!googleKey) {
          console.log('No Google Maps API token available')
          return
        }
        
        console.log('Calculating distance between:', loadingLocation, 'and', dropOffPoint)
        
        // First geocode the locations to get coordinates
        const geocodeUrl = 'https://maps.googleapis.com/maps/api/geocode/json'
        const [originData, destData] = await Promise.all([
          fetch(`${geocodeUrl}?address=${encodeURIComponent(loadingLocation)}&key=${googleKey}&region=za`).then(r => r.json()),
          fetch(`${geocodeUrl}?address=${encodeURIComponent(dropOffPoint)}&key=${googleKey}&region=za`).then(r => r.json())
        ])
        
        if (originData.status !== 'OK' || destData.status !== 'OK' || !originData.results?.[0] || !destData.results?.[0]) {
          console.log('Could not geocode locations')
          return
        }
        
        const originLoc = originData.results[0].geometry.location
        const destLoc = destData.results[0].geometry.location
        
        console.log('Origin coords:', originLoc, 'Dest coords:', destLoc)
        
        const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
        const directionsResponse = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${originLoc.lng},${originLoc.lat};${destLoc.lng},${destLoc.lat}?access_token=${mapboxToken}&geometries=geojson`
        )
        const data = await directionsResponse.json()
        console.log('Mapbox Directions response:', data)
        
        if (data.routes?.[0]?.distance) {
          const distanceKm = Math.round(data.routes[0].distance / 1000)
          console.log('Distance calculated:', distanceKm, 'km')
          setEstimatedDistance(distanceKm)
        } else {
          console.log('No route found in response')
        }
      } catch (error) {
        console.error('Error calculating distance:', error)
      }
    }
    
    calculateRouteDistance()
  }, [loadingLocation, dropOffPoint])


  // Calculate distance from point to route line
  const distanceToRoute = useCallback((pointLat, pointLng, routeCoords) => {
    if (!routeCoords || routeCoords.length < 2) return Infinity
    
    let minDistance = Infinity
    for (let i = 0; i < routeCoords.length - 1; i++) {
      const [lng1, lat1] = routeCoords[i]
      const [lng2, lat2] = routeCoords[i + 1]
      
      // Distance from point to line segment
      const A = pointLat - lat1
      const B = pointLng - lng1
      const C = lat2 - lat1
      const D = lng2 - lng1
      
      const dot = A * C + B * D
      const lenSq = C * C + D * D
      let param = -1
      if (lenSq !== 0) param = dot / lenSq
      
      let xx, yy
      if (param < 0) {
        xx = lat1
        yy = lng1
      } else if (param > 1) {
        xx = lat2
        yy = lng2
      } else {
        xx = lat1 + param * C
        yy = lng1 + param * D
      }
      
      const distance = calculateDistance(pointLat, pointLng, xx, yy)
      minDistance = Math.min(minDistance, distance)
    }
    return minDistance
  }, [calculateDistance])

  // Filter stop points within 25km of route and between origin/destination
  const filteredStopPoints = useMemo(() => {
    if (!loadingLocation || !dropOffPoint || !optimizedRoute?.route?.geometry?.coordinates) {
      return availableStopPoints
    }
    
    const routeCoords = optimizedRoute.route.geometry.coordinates
    const [originLng, originLat] = routeCoords[0]
    const [destLng, destLat] = routeCoords[routeCoords.length - 1]
    
    return availableStopPoints.filter(point => {
      if (!point.coordinates) return false
      
      try {
        const coordPairs = point.coordinates.split(' ')
          .filter(coord => coord.trim())
          .map(coord => {
            const [lng, lat] = coord.split(',')
            return [parseFloat(lng), parseFloat(lat)]
          })
          .filter(pair => !isNaN(pair[0]) && !isNaN(pair[1]))
        
        if (coordPairs.length === 0) return false
        
        // Use centroid of stop point polygon
        const avgLng = coordPairs.reduce((sum, coord) => sum + coord[0], 0) / coordPairs.length
        const avgLat = coordPairs.reduce((sum, coord) => sum + coord[1], 0) / coordPairs.length
        
        // Check if within 25km of route
        const distance = distanceToRoute(avgLat, avgLng, routeCoords)
        if (distance > 25) return false
        
        // Check if between origin and destination
        const distToOrigin = calculateDistance(avgLat, avgLng, originLat, originLng)
        const distToDest = calculateDistance(avgLat, avgLng, destLat, destLng)
        const originToDestDist = calculateDistance(originLat, originLng, destLat, destLng)
        
        // Point is between origin and destination if sum of distances is roughly equal to direct distance
        return (distToOrigin + distToDest) <= (originToDestDist * 1.2) // 20% tolerance
      } catch (error) {
        return false
      }
    })
  }, [availableStopPoints, loadingLocation, dropOffPoint, optimizedRoute, distanceToRoute, calculateDistance])

  // Get selected stop points with coordinates including custom locations
  const getSelectedStopPointsData = useCallback(async () => {
    console.log('getSelectedStopPointsData called with:', { stopPoints, customStopPoints, availableStopPoints: availableStopPoints.length })
    
    // Ensure stop points are loaded if not already available
    if (availableStopPoints.length === 0 && (stopPoints.length > 0 || customStopPoints.some(p => p))) {
      console.log('Loading stop points from database...')
      try {
        const { data: stopPointsData, error: stopPointsError } = await supabase
          .from('stop_points')
          .select('id, name, name2, coordinates')
          .order('name')
        
        if (stopPointsError) {
          console.error('Stop points error:', stopPointsError)
        } else {
          setAvailableStopPoints(stopPointsData || [])
          console.log('Loaded stop points:', stopPointsData?.length || 0)
        }
      } catch (err) {
        console.error('Error fetching stop points:', err)
      }
    }
    
    const results = []
    
    for (let i = 0; i < stopPoints.length; i++) {
      const pointId = stopPoints[i]
      const customLocation = customStopPoints[i]
      console.log(`Processing stop point ${i}:`, { pointId, customLocation })
      
      if (customLocation) {
        // Geocode custom location using Google
        try {
          const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_TOKEN
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(customLocation)}&key=${googleKey}&region=za`
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
        // Use existing stop point - use current availableStopPoints or fetch directly
        let point = availableStopPoints.find(p => p.id.toString() === pointId)
        
        // If not found in current array, fetch directly from database
        if (!point) {
          console.log('Stop point not found in cache, fetching from database...')
          try {
            const { data: pointData, error } = await supabase
              .from('stop_points')
              .select('id, name, name2, coordinates')
              .eq('id', pointId)
              .single()
            
            if (!error && pointData) {
              point = pointData
              console.log('Fetched stop point from database:', point)
            }
          } catch (err) {
            console.error('Error fetching individual stop point:', err)
          }
        }
        
        console.log('Found stop point for ID', pointId, ':', point)
        if (point?.coordinates) {
          try {
            const coordPairs = point.coordinates.split(' ')
              .filter(coord => coord.trim())
              .map(coord => {
                const [lng, lat] = coord.split(',')
                return [parseFloat(lng), parseFloat(lat)]
              })
              .filter(pair => !isNaN(pair[0]) && !isNaN(pair[1]))
            
            console.log('Parsed coordinates:', coordPairs)
            results.push({
              id: point.id,
              name: point.name,
              coordinates: coordPairs
            })
          } catch (error) {
            console.error('Error parsing coordinates:', error)
          }
        } else {
          console.log('No coordinates found for point:', pointId)
          console.log('Point found but no coordinates:', point)
        }
      }
    }
    
    console.log('getSelectedStopPointsData returning:', results)
    return results
  }, [stopPoints, customStopPoints, availableStopPoints])

  // Optimized handlers with useCallback
  const handleDriverChange = useCallback((driverIndex, driverId) => {
    const selectedDriver = drivers.find(d => d.id === driverId)
    setDriverAssignments(prev => {
      const updated = [...prev]
      updated[driverIndex] = { 
        id: driverId, 
        name: selectedDriver?.surname || '',
        first_name: selectedDriver?.first_name || '',
        surname: selectedDriver?.surname || ''
      }
      return updated
    })
    
    // Show driver location on map
    if (selectedDriver) {
      const driverFullName = `${selectedDriver.first_name} ${selectedDriver.surname}`.trim().toLowerCase()
      const trackingData = Array.isArray(vehicleTrackingData) ? vehicleTrackingData : []
      const matchingVehicle = trackingData.find(vehicle => 
        vehicle.driver_name && 
        vehicle.driver_name.toLowerCase() === driverFullName
      )
      
      if (matchingVehicle?.latitude && matchingVehicle?.longitude) {
        setSelectedDriverLocation({
          driver: selectedDriver,
          vehicle: matchingVehicle,
          latitude: parseFloat(matchingVehicle.latitude),
          longitude: parseFloat(matchingVehicle.longitude)
        })
        // Force route recalculation when driver changes
        setOptimizedRoute(null)
      } else {
        setSelectedDriverLocation(null)
      }
    } else {
      setSelectedDriverLocation(null)
    }
  }, [drivers, vehicleTrackingData])

  const addDriver = useCallback(() => {
    setDriverAssignments(prev => [...prev, { id: '', name: '' }])
  }, [])

  // Auto-select closest driver when dropdown is opened (only if slot is empty)
  const handleDriverDropdownOpen = useCallback(async (driverIndex) => {
    console.log('Driver dropdown opened, loading location:', loadingLocation)
    
    const currentDriver = driverAssignments[driverIndex]
    if (currentDriver?.id) return
    
    if (!loadingLocation) return
    
    setIsCalculatingDistance(true)
    try {
      console.log('Fetching vehicle tracking data from API...')
      const trackingResponse = await fetch('/api/eps-vehicles')
      const trackingData = await trackingResponse.json()
      console.log('API response:', trackingData)
      console.log('Has result?', !!trackingData?.result)
      console.log('Has result.data?', !!trackingData?.result?.data)
      console.log('Has data?', !!trackingData?.data)
      console.log('Has error?', !!trackingData?.error)
      
      const vehicleData = trackingData?.result?.data || trackingData?.data || []
      console.log('Vehicle data extracted:', vehicleData.length, 'vehicles')
      if (vehicleData.length > 0) {
        console.log('First 3 drivers:', vehicleData.slice(0, 3).map(v => v.driver_name))
      }
      setVehicleTrackingData(vehicleData)
      
      const sorted = await getSortedDriversByDistance(loadingLocation)
      console.log('Sorted drivers:', sorted.filter(d => d.distance !== null).length, 'with distances')
      setSortedDrivers(sorted)
      
      const closestDriver = sorted.find(d => d.distance !== null)
      if (closestDriver) {
        console.log('Auto-selecting closest driver:', closestDriver.first_name, closestDriver.surname, closestDriver.distance, 'km')
        handleDriverChange(driverIndex, closestDriver.id)
      }
    } catch (error) {
      console.error('Error calculating driver distances:', error)
    }
    setIsCalculatingDistance(false)
  }, [loadingLocation, driverAssignments, getSortedDriversByDistance, handleDriverChange])

  // Helper to get assigned vehicles/drivers display
  const getAssignmentsDisplay = (load) => {
    const assignments = load.vehicleAssignments || load.vehicle_assignments || []
    if (!assignments.length) return 'Unassigned'
    
    return assignments.map(assignment => {
      const vehicleName = assignment.vehicle?.name || 'Unknown Vehicle'
      const driverNames = assignment.drivers?.map(d => d.name).filter(Boolean).join(', ') || 'No Driver'
      return `${vehicleName} (${driverNames})`
    }).join('; ')
  }

  // Parse JSON fields safely
  const parseJsonField = (field) => {
    if (!field) return []
    if (Array.isArray(field)) return field
    try {
      return JSON.parse(field)
    } catch {
      return []
    }
  }

  const [summaryOpen, setSummaryOpen] = useState(false)
  const [selectedLoad, setSelectedLoad] = useState<any | null>(null)
  // Routing assigned items
  const [assignedItems, setAssignedItems] = useState<any[]>([])
  // Left items available to assign
  const [leftItems, setLeftItems] = useState<any[]>([
    { id: 'a', title: 'VINCEMUS INVESTMENTS (P...)', addr: 'Johannesburg, South Africa', addr2: 'Estcourt, 3310, South Africa' },
    { id: 'b', title: 'TRADELANDER 5 CC', addr: 'Randfontein, South Africa' }
  ])

  const handleCreateClick = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevent duplicate submissions
    if (isSubmitting) {
      return
    }
    
    // Validate required fields
    if (!client || !commodity || !loadingLocation || !dropOffPoint) {
      showToast('Please fill out all required fields', 'error')
      return
    }
    
    handleCreateOrUpdate()
  }

  const handleClientSelect = async (clientData) => {
    if (typeof clientData !== 'object') {
      setClient(typeof clientData === 'string' ? clientData : clientData?.name || '')
      setSelectedClient(clientData)
      setManualClientName('')
      return
    }

    setSelectedClient(clientData)
    setClient(clientData.name)
    setManualClientName('')

    if (addressDecisionRef.current?.clientId === clientData.id) {
      const prev = addressDecisionRef.current
      if (prev.decision === 'pickup' || prev.decision === 'dropoff') {
        const coords = extractFirstCoord(clientData)
        if (coords && !isNaN(coords.lat)) {
          if (prev.decision === 'pickup') setLoadingLocation(clientData.address || `${coords.lat},${coords.lng}`)
          else setDropOffPoint(clientData.address || `${coords.lat},${coords.lng}`)
        }
      }
      return
    }

    if (doesClientHaveGeozone(clientData)) {
      setShowAddressPopup(true)
    } else if (clientData.address) {
      setShowQuickGeozoneDialog(true)
    }
  }

  const parseGeozonePolygon = (coordinates: any): number[][] | null => {
    if (!coordinates) return null
    try {
      const parsed = JSON.parse(coordinates)
      if (Array.isArray(parsed) && parsed.length >= 3) {
        return parsed.map((c: any) => [Number(c[0]), Number(c[1])]).filter((c) => Number.isFinite(c[0]) && Number.isFinite(c[1]))
      }
    } catch {}
    try {
      const parts = coordinates.split(' ').filter((c: string) => c.trim())
      if (parts.length >= 3) {
        return parts.map((p: string) => {
          const [lng, lat] = p.split(',')
          return [Number(lng), Number(lat)]
        }).filter((c) => Number.isFinite(c[0]) && Number.isFinite(c[1]))
      }
    } catch {}
    return null
  }

  const handleUseAsPickup = () => {
    const polygon = parseGeozonePolygon(selectedClient?.coordinates)
    if (polygon) {
      setLoadingGeozoneCoords(polygon)
    }
    const coords = extractFirstCoord(selectedClient)
    if (coords && !isNaN(coords.lat)) {
      const lat = coords.lat.toFixed(6)
      const lng = coords.lng.toFixed(6)
      fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_TOKEN}&region=za`)
        .then(response => response.json())
        .then(data => {
          if (data.status === 'OK' && data.results?.[0]) {
            setLoadingLocation(data.results[0].formatted_address)
          } else {
            setLoadingLocation(`${lat},${lng}`)
          }
        })
        .catch(() => setLoadingLocation(`${lat},${lng}`))
    } else if (selectedClient?.geocoded_address) {
      setLoadingLocation(selectedClient.geocoded_address)
    } else if (selectedClient?.address) {
      setLoadingLocation(selectedClient.address)
    }
    if (selectedClient) {
      addressDecisionRef.current = { clientId: selectedClient.id, decision: 'pickup' }
    }
    setShowAddressPopup(false)
  }

  const handleUseAsDropoff = () => {
    const polygon = parseGeozonePolygon(selectedClient?.coordinates)
    if (polygon) {
      setDropoffGeozoneCoords(polygon)
    }
    const coords = extractFirstCoord(selectedClient)
    if (coords && !isNaN(coords.lat)) {
      const lat = coords.lat.toFixed(6)
      const lng = coords.lng.toFixed(6)
      fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_TOKEN}&region=za`)
        .then(response => response.json())
        .then(data => {
          if (data.status === 'OK' && data.results?.[0]) {
            setDropOffPoint(data.results[0].formatted_address)
          } else {
            setDropOffPoint(`${lat},${lng}`)
          }
        })
        .catch(() => setDropOffPoint(`${lat},${lng}`))
    } else if (selectedClient?.geocoded_address) {
      setDropOffPoint(selectedClient.geocoded_address)
    } else if (selectedClient?.address) {
      setDropOffPoint(selectedClient.address)
    }
    if (selectedClient) {
      addressDecisionRef.current = { clientId: selectedClient.id, decision: 'dropoff' }
    }
    setShowAddressPopup(false)
  }

  const handleSkipAddress = () => {
    if (selectedClient) {
      addressDecisionRef.current = { clientId: selectedClient.id, decision: 'skip' }
    }
    setShowAddressPopup(false)
  }

  const handleQuickGeozoneSaved = async (coordinatesJson: string) => {
    if (!selectedClient?.id) return
    try {
      const { error } = await supabase
        .from('eps_client_list')
        .update({ coordinates: coordinatesJson })
        .eq('id', selectedClient.id)
      if (error) throw error
      setSelectedClient((prev) => ({ ...prev, coordinates: coordinatesJson }))
      setShowQuickGeozoneDialog(false)
      setShowAddressPopup(true)
    } catch (err) {
      console.error('Error saving geozone:', err)
      showToast('Failed to save geozone', 'error')
    }
  }



  const handleCreateOrUpdate = async () => {
    if (isEditMode) {
      return handleUpdate()
    }
    return handleCreate()
  }
  
  const handleUpdate = async () => {
    setIsSubmitting(true)
    try {
      const tripData = {
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
            name: selectedVehicleId ? vehicles.find(v => String(v.id) === String(selectedVehicleId))?.registration_number || '' : ''
          },
          trailer: {
            id: selectedTrailerId,
            name: selectedTrailerId ? vehicles.find(v => v.id.toString() === selectedTrailerId)?.registration_number || '' : ''
          }
        }],
        
        trip_type: tripType,
        selected_stop_points: stopPoints,
        selected_vehicle_type: selectedVehicleType,
        progress_stops: DEFAULT_PROGRESS_STOPS
          .filter(s => selectedStops.has(s.value))
          .map((s, i) => ({ order: i + 1, label: s.label, value: s.value, isComplete: false })),
        updated_at: new Date().toISOString()
      }
      
      const { error } = await supabase
        .from('trips')
        .update(tripData)
        .eq('id', editTripId)
      
      if (error) throw error
      
      showToast('Trip updated successfully!', 'success')
      
      // Clear sessionStorage and redirect
      sessionStorage.removeItem('editTripData')
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
      
    } catch (err) {
      console.error('Error updating trip:', err)
      showToast('Failed to update trip', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleCreate = async () => {
    setIsSubmitting(true)
    try {
      // Save route to database for both trip types when creating the load
      let routeId = null
      if (loadingLocation && dropOffPoint) {
        try {
          const selectedStopPoints = await getSelectedStopPointsData()
          const waypoints = selectedStopPoints.map(point => {
            const coords = point.coordinates
            const avgLng = coords.reduce((sum, coord) => sum + coord[0], 0) / coords.length
            const avgLat = coords.reduce((sum, coord) => sum + coord[1], 0) / coords.length
            return `${avgLng},${avgLat}`
          })
          
          const routeResponse = await fetch('/api/routes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              origin: loadingLocation,
              destination: dropOffPoint,
              orderId: orderNumber,
              pickupTime: etaPickup,
              waypoints: waypoints
            })
          })
          
          if (routeResponse.ok) {
            const routeData = await routeResponse.json()
            routeId = routeData.route?.id
          }
        } catch (routeError) {
          console.error('Error saving route:', routeError)
          // Continue with load creation even if route saving fails
        }
      }
      
      const tripData = {
        trip_id: `LOAD-${Date.now()}`,
        ordernumber: orderNumber,
        rate: rate,
        cargo: commodity,
        origin: loadingLocation,
        destination: dropOffPoint,
        notes: comment,
        status: 'pending',
        startdate: etaPickup ? etaPickup.split('T')[0] : null,
        enddate: etaDropoff ? etaDropoff.split('T')[0] : null,
        route: routeId ? routeId.toString() : null, // Link to saved route

        clientdetails: selectedClient ? {
          name: selectedClient.name,
          email: '',
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
            name: selectedVehicleId ? vehicles.find(v => String(v.id) === String(selectedVehicleId))?.registration_number || '' : ''
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
        estimated_distance: estimatedDistance,
        estimated_duration: optimizedRoute?.route?.duration || optimizedRoute?.duration || 0,
        // Cost engine data
        driver_cost: costBreakdown?.driverCost || 0,
        fuel_cost: costBreakdown?.fuelCost || 0,
        maintenance_cost: costBreakdown?.rmCost || 0,
        cross_border_cost: costBreakdown?.crossBorderCost || 0,
        total_trip_cost: costBreakdown?.totalCost || 0,
        profile_used: detectedVehicleType || '',
        diesel_rate: fuelLinkRate || 0,
        fixed_cost: costBreakdown?.fixedAssetCost || 0,
        cost_per_km: costBreakdown?.totalCost && estimatedDistance ? Math.round((costBreakdown.totalCost / estimatedDistance) * 100) / 100 : 0,
        selling_rate_per_km: Number(sellingRatePerKm) || 0,
        trip_days: tripDays || 0,
        progress_stops: DEFAULT_PROGRESS_STOPS
          .filter(s => selectedStops.has(s.value))
          .map((s, i) => ({ order: i + 1, label: s.label, value: s.value, isComplete: false }))
      }
      
      console.log('Inserting trip data:', tripData)
      const { data, error } = await supabase.from('trips').insert([tripData])
      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw new Error(`Database error: ${error.message || 'Unknown error'}`)
      }
      console.log('Trip created successfully:', data)
      
      // Mark assigned drivers as unavailable
      const assignedDriverIds = driverAssignments
        .map(d => d.id)
        .filter(id => id)
      
      if (assignedDriverIds.length > 0) {
        try {
          await markDriversUnavailable(assignedDriverIds)
          showToast(`${assignedDriverIds.length} driver(s) marked as unavailable`, 'success')
        } catch (error) {
          console.error('Error updating driver availability:', error)
          showToast('Load created successfully, but failed to update driver availability', 'warning')
        }
      }
      
      // Reset form
      setClient(''); setSelectedClient(null); setManualClientName(''); setCommodity(''); setRate(''); setOrderNumber(''); setComment('')
      setEtaPickup(''); setLoadingLocation(''); setEtaDropoff(''); setDropOffPoint('')
      setDriverAssignments([{ id: '', name: '' }])
      setSelectedVehicleId('')
      setSelectedTrailerId('')
      setTripType('local')
      setStopPoints([])
      setCustomStopPoints([])
      setSelectedVehicleType('')
      setSelectedStops(new Set())
      setUseDefaultStops(false)
      setShowSecondSection(false)
      setOptimizedRoute(null)
      setCostBreakdown({ driverCost: 0, fixedAssetCost: 0, fuelCost: 0, rmCost: 0, crossBorderCost: 0, totalCost: 0, tripDays: 0 })
      
      // Refresh data
      fetchData()
      
      showToast('Load created successfully!', 'success')
    } catch (err) {
      console.error('Error creating load:', err)
      showToast('Something went wrong while creating the load', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6 space-y-6 w-full">
      <h1 className="text-2xl font-bold mb-6">Load Plan</h1>
      
      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="create">Create Load</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          <div className="space-y-6">
            <Card>
            <CardHeader>
              <CardTitle>Create New Load</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-6">
                {/* Basic Load Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="clientCode">Client Code</Label>
                      <ClientDropdown 
                        value={selectedClient ? client : ''} 
                        onChange={handleClientSelect} 
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
                      <Input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="Order Number" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Label htmlFor="client">Client</Label>
                    <div className="space-y-2">
                      <ClientNameDisplay 
                        selectedClient={selectedClient}
                        placeholder="Client name will appear here"
                      />
                      <div className="text-center text-xs text-gray-500">OR</div>
                      <Input 
                        value={manualClientName}
                        onChange={(e) => {
                          setManualClientName(e.target.value)
                          setClient(e.target.value)
                          setSelectedClient(null)
                        }}
                        placeholder="Type new client name"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="comment">Comment</Label>
                    <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comment (optional)" />
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
                      onChange={(value) => {
                        console.log('Loading location changed to:', value)
                        setLoadingLocation(value)
                        setOptimizedRoute(null) // Force route recalculation
                      }}
                      placeholder="Search for loading location"
                      clientLocations={useMemo(() => {
                        const selectedClient = clients.find(c => c.name === client)
                        if (!selectedClient) return []
                        try {
                          return typeof selectedClient.pickupLocations === 'string' ? 
                            JSON.parse(selectedClient.pickupLocations) : 
                            (selectedClient.pickupLocations || selectedClient.pickup_locations || [])
                        } catch { return [] }
                      }, [clients, client])
                      }
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
                      onChange={(value) => {
                        console.log('Drop off location changed to:', value)
                        setDropOffPoint(value)
                        setOptimizedRoute(null) // Force route recalculation
                      }}
                      placeholder="Search for drop off location"
                      clientLocations={useMemo(() => {
                        const selectedClient = clients.find(c => c.name === client)
                        if (!selectedClient) return []
                        try {
                          return typeof selectedClient.dropoffLocations === 'string' ? 
                            JSON.parse(selectedClient.dropoffLocations) : 
                            (selectedClient.dropoffLocations || selectedClient.dropoff_locations || [])
                        } catch { return [] }
                      }, [clients, client])
                      }
                    />
                  </div>
                </div>

                {/* Progress Stops */}
                <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-lg font-medium">Trip Progress Stops</Label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={useDefaultStops}
                        onChange={(e) => {
                          setUseDefaultStops(e.target.checked)
                          setSelectedStops(
                            e.target.checked
                              ? new Set(DEFAULT_PROGRESS_STOPS.map(s => s.value))
                              : new Set()
                          )
                        }}
                        className="w-4 h-4 rounded border-slate-300"
                      />
                      Use Default (All Stops)
                    </label>
                  </div>
                  <div className="relative">
                    <div className="flex justify-between items-center">
                      {DEFAULT_PROGRESS_STOPS.map((stop, index) => {
                        const isSelected = selectedStops.has(stop.value)
                        return (
                          <button
                            key={stop.value}
                            type="button"
                            onClick={() => {
                              if (useDefaultStops) return
                              const next = new Set(selectedStops)
                              if (next.has(stop.value)) {
                                next.delete(stop.value)
                              } else {
                                next.add(stop.value)
                              }
                              setSelectedStops(next)
                            }}
                            className="flex flex-col items-center relative group"
                          >
                            <div className={cn(
                              "w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-200",
                              isSelected
                                ? "bg-emerald-600 border-emerald-700 text-white animate-pulse"
                                : "bg-slate-100 border-slate-200 text-slate-400",
                              !useDefaultStops && "hover:scale-110 cursor-pointer"
                            )}>
                              {isSelected
                                ? <CheckCircle className="w-3 h-3" />
                                : <span className="text-[9px]">{index + 1}</span>}
                            </div>
                            <span className={cn(
                              "text-[10px] mt-1 text-center max-w-[52px] leading-tight",
                              isSelected ? "text-emerald-700 font-medium" : "text-gray-400"
                            )}>
                              {stop.value}
                            </span>
                          </button>
                        )
                      })}
                    </div>
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
                        onChange={(e) => {
                          setTripType(e.target.value)
                          fetchStopPoints() // Load stop points for both trip types
                        }}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="national">Long Distance</Label>
                    </div>
                  </div>
                </div>

                {/* Stop Points - Available for both Local and Long Distance */}
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
                              console.log('StopPointDropdown onChange called with value:', value)
                              const updated = [...stopPoints]
                              updated[index] = value
                              console.log('Setting stopPoints from:', stopPoints, 'to:', updated)
                              setStopPoints(updated)
                              const updatedCustom = [...customStopPoints]
                              updatedCustom[index] = ''
                              setCustomStopPoints(updatedCustom)
                              // Force route recalculation
                              setOptimizedRoute(null)
                            }}
                            stopPoints={filteredStopPoints}
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
                            setIsManuallyOrdered(false)
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
                          console.log('Custom stop point changed:', value)
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
                          // Force route recalculation
                          setOptimizedRoute(null)
                        }}
                        placeholder="Search for custom stop location"
                      />
                    </div>
                  ))}
                </div>

                {/* Route Preview */}
                {(loadingLocation && dropOffPoint) || selectedClient?.coordinates ? (
                  <div className="col-span-full">
                    <div className="space-y-4">
                      {isOptimizing && tripType === 'national' && (
                        <div className="flex items-center gap-2 text-sm text-blue-600">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          Optimizing route...
                        </div>
                      )}
                      <div className="space-y-4">
                        <RoutePreviewMap
                          key={`${loadingLocation}-${dropOffPoint}-${stopPoints.join(',')}-${customStopPoints.join(',')}`}
                          origin={loadingLocation}
                          destination={dropOffPoint}
                          routeData={optimizedRoute}
                          stopPoints={stopPoints.length > 0 || customStopPoints.some(p => p) ? 'async' : []}
                          getStopPointsData={getSelectedStopPointsData}
                          preserveOrder={isManuallyOrdered}
                          driverLocation={selectedDriverLocation ? {
                            lat: selectedDriverLocation.latitude,
                            lng: selectedDriverLocation.longitude,
                            name: `${selectedDriverLocation.driver.first_name} ${selectedDriverLocation.driver.surname}`
                          } : undefined}
                          clientLocation={selectedClient?.coordinates ? (() => {
                            try {
                              const first = extractFirstCoord(selectedClient)
                              if (first) return { lat: first.lat, lng: first.lng, name: selectedClient.name }
                            } catch (error) {
                              console.error('Error parsing client coordinates:', error)
                            }
                            return undefined
                          })() : undefined}
                          selectedClient={selectedClient}
                          loadingGeozoneCoords={loadingGeozoneCoords}
                          dropoffGeozoneCoords={dropoffGeozoneCoords}
                        />
                        
                        {/* Route Summary */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="font-medium">
                              {tripType === 'local' ? 'Local Route' : 'Long Distance Route'} (Optimized)
                            </h4>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={() => setShowRouteModal(true)}
                            >
                              Edit Route
                            </Button>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="font-medium">Loading:</span> {loadingLocation}
                            </div>
                            {stopPoints.length > 0 && (
                              <div>
                                <span className="font-medium">Stop Points:</span> {stopPoints.length} stop(s) added
                              </div>
                            )}
                            {dropOffPoint && (
                              <div>
                                <span className="font-medium">Drop-off:</span> {dropOffPoint}
                              </div>
                            )}
                            <div>
                              <span className="font-medium">Trip Type:</span> {tripType === 'local' ? 'Local Trip' : 'Long Distance'}
                            </div>
                            <div>
                              <span className="font-medium">Driver:</span> {
                                (() => {
                                  const firstDriver = driverAssignments[0]
                                  if (firstDriver?.id) {
                                    const driver = drivers.find(d => d.id === firstDriver.id)
                                    return driver ? `${driver.first_name} ${driver.surname}` : 'Selected Driver'
                                  }
                                  return 'No driver selected'
                                })()
                              }
                            </div>
                            {optimizedRoute && (
                              <div className="border-t pt-2 mt-2">
                                <div className="font-medium text-blue-600 mb-1">
                                  Route Information {optimizedRoute.hasDriverLocation ? '(Driver → Loading → Drop-off)' : '(Loading → Drop-off)'}:
                                </div>
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
                    </div>
                  </div>
                ) : null}

                {/* Cost Engine */}
                <div className="space-y-4">
                  <Label className="text-lg font-medium">Trip Cost Estimate</Label>

                  {vehicleTypeNotFound && (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg text-amber-800 text-sm">
                      Selected vehicle doesn't have a matching cost type. Please select a different vehicle or set the vehicle type above.
                    </div>
                  )}

                    <>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fuelMonth" className="text-sm font-medium text-slate-700">Fuel Month</Label>
                        <select
                          id="fuelMonth"
                          value={fuelMonthLabel}
                          onChange={(e) => setFuelMonthLabel(e.target.value)}
                          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {fuelMonths.map((m) => (
                            <option key={m.month_label} value={m.month_label}>
                              {m.month_label} — R{Number(m.link_rate).toFixed(2)}/km
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="sellingRate" className="text-sm font-medium text-slate-700">Rate (R) *</Label>
                        <Input
                          id="sellingRate"
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          placeholder="e.g. 4000"
                          value={sellingRatePerKm}
                          onChange={(e) => setSellingRatePerKm(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">Trip Days</Label>
                        <Input
                          type="text"
                          value={tripDays > 0 ? `${tripDays} day${tripDays !== 1 ? 's' : ''}` : '—'}
                          readOnly
                          className="bg-muted"
                        />
                      </div>
                    </div>

                    {/* Cost Breakdown */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-3">COST B/D</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>DRIVER</span>
                          <span className="font-medium">{costBreakdown ? `R${costBreakdown.driverCost.toFixed(2)} (${costBreakdown.tripDays} DAYS)` : '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>FIXED - ASSET</span>
                          <span className="font-medium">{costBreakdown ? `R${costBreakdown.fixedAssetCost.toFixed(2)} (${costBreakdown.tripDays} DAYS)` : '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>FUEL</span>
                          <span className="font-medium">{costBreakdown ? `R${costBreakdown.fuelCost.toFixed(2)}` : '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>R&M</span>
                          <span className="font-medium">{costBreakdown ? `R${costBreakdown.rmCost.toFixed(2)} CPK` : '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>CROSS BORDER</span>
                          <span className="font-medium">{costBreakdown ? `R${costBreakdown.crossBorderCost.toFixed(2)}` : '—'}</span>
                        </div>
                        <div className="border-t pt-2 mt-2 flex justify-between">
                          <span className="font-bold">TOTAL COST</span>
                          <span className="font-bold">{costBreakdown ? `R${costBreakdown.totalCost.toFixed(2)}` : '—'}</span>
                        </div>
                        <div className="border-t pt-2 mt-2 flex justify-between">
                          <span className="font-bold">REVENUE</span>
                          <span className="font-bold">{Number(sellingRatePerKm) > 0 ? `R${Number(sellingRatePerKm).toFixed(2)}` : '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={`font-bold ${costBreakdown && Number(sellingRatePerKm) > 0 ? ((Number(sellingRatePerKm) - costBreakdown.totalCost) >= 0 ? 'text-green-600' : 'text-red-600') : ''}`}>PROFIT</span>
                          <span className={`font-bold ${costBreakdown && Number(sellingRatePerKm) > 0 ? ((Number(sellingRatePerKm) - costBreakdown.totalCost) >= 0 ? 'text-green-600' : 'text-red-600') : ''}`}>
                            {costBreakdown && Number(sellingRatePerKm) > 0 ? `R${(Number(sellingRatePerKm) - costBreakdown.totalCost).toFixed(2)}` : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                    </>
                  </div>

                {/* Driver Assignments */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-lg font-medium">Driver Assignments</Label>
                    <Button 
                      type="button" 
                      onClick={addDriver} 
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Driver
                    </Button>
                  </div>
                  
                  {driverAssignments.map((driver, driverIndex) => (
                    <div key={driverIndex} className="mb-2">
                      <DriverDropdown
                        value={driver.id}
                        onChange={(value) => handleDriverChange(driverIndex, value)}
                        drivers={availableDrivers}
                        placeholder="Select driver"
                      />
                    </div>
                  ))}
                </div>

                {/* Vehicle Selection */}
                <div className="space-y-4">
                  <Label className="text-lg font-medium">Vehicle Assignment</Label>
                

                  {/* Horse Dropdown - Filtered by selected type */}
                  <div className="space-y-2">
                    <Label htmlFor="horse" className="text-sm font-medium text-slate-700">Select Horse</Label>
                    <VehicleDropdown
                      value={selectedVehicleId}
                      onChange={setSelectedVehicleId}
                      vehicles={filteredVehicles}
                      placeholder="Select horse (vehicle)"
                    />
                  </div>

                  {/* Trailer Dropdown - Only trailers */}
                  <div className="space-y-2">
                    <Label htmlFor="trailer" className="text-sm font-medium text-slate-700">Select Trailer</Label>
                    <TrailerDropdown
                      value={selectedTrailerId}
                      onChange={setSelectedTrailerId}
                      trailers={filteredTrailers}
                      placeholder="Select trailer"
                    />
                  </div>
                </div>



                <div className="flex gap-2">
                  {isEditMode && (
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => {
                        sessionStorage.removeItem('editTripData')
                        router.push('/dashboard')
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  )}
                  <Button 
                    type="button" 
                    onClick={handleCreateClick} 
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Processing...' : (isEditMode ? 'Update Trip' : 'Create Load')}
                  </Button>
                </div>
              </form>
            </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      <ClientAddressPopup
        isOpen={showAddressPopup}
        onClose={() => setShowAddressPopup(false)}
        client={selectedClient}
        onUseAsPickup={handleUseAsPickup}
        onUseAsDropoff={handleUseAsDropoff}
        onSkip={handleSkipAddress}
        hasGeozone={true}
      />
      
      <QuickGeozoneDialog
        open={showQuickGeozoneDialog}
        onOpenChange={setShowQuickGeozoneDialog}
        client={selectedClient}
        onSaved={handleQuickGeozoneSaved}
      />
      
      <RouteEditModal
        isOpen={showRouteModal}
        onClose={() => setShowRouteModal(false)}
        stopPoints={stopPoints}
        customStopPoints={customStopPoints}
        availableStopPoints={availableStopPoints}
        onReorder={(newOrder) => {
          console.log('Reordering stop points:', newOrder)
          setStopPoints(newOrder.stopPoints)
          setCustomStopPoints(newOrder.customStopPoints)
          setIsManuallyOrdered(true)
          setShowRouteModal(false)
          // Don't clear optimized route immediately - let the effect handle it
        }}
        onForceRecalculate={() => {
          console.log('Force recalculating route')
          setIsManuallyOrdered(false)
          setShowRouteModal(false)
          // Don't clear optimized route immediately - let the effect handle it
        }}
      />
      
      <Toast
        open={toast.isVisible}
        onOpenChange={(open) => !open && hideToast()}
        variant={toast.type}
      >
        {toast.message}
      </Toast>
    </div>
  )
}
