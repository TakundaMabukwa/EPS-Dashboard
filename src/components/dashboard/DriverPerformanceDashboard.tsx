'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Trophy, AlertTriangle, Star, Search, Shield, Zap, Moon, Sun, Brake, Car, X } from 'lucide-react'
import { type DriverPerformanceData } from '@/lib/actions/driver-performance'
import * as Dialog from '@radix-ui/react-dialog'

const MONITORING_CATEGORIES = [
  { key: 'speeding', label: 'Speeding', icon: Zap, weight: 50, eventPatterns: ['speeding', 'speed'] },
  { key: 'harsh_acceleration', label: 'Harsh Accelerating', icon: Car, weight: 10, eventPatterns: ['acceleration', 'accelerat'] },
  { key: 'harsh_braking', label: 'Harsh Braking', icon: Brake, weight: 10, eventPatterns: ['braking', 'brake'] },
  { key: 'night_driving', label: 'Night Time Driving', icon: Moon, weight: 10, eventPatterns: ['night'] },
  { key: 'excessive_day', label: 'Excessive Day', icon: Sun, weight: 10, eventPatterns: ['day'] },
]

const HARDCODED_DRIVERS: DriverPerformanceData[] = [
  {
    driverName: 'Sipho Mthembu',
    plate: 'CH769350',
    currentPoints: 850,
    performanceLevel: 'Gold',
    scores: { performanceRating: 92, insuranceRiskScore: 15, riskCategory: 'Low Risk', insuranceMultiplier: 0.85 },
    violations: { total: 2, speed: 1, harshBraking: 1, nightDriving: 0 },
  },
  {
    driverName: 'Thabo Khumalo',
    plate: 'KVR581MP',
    currentPoints: 720,
    performanceLevel: 'Silver',
    scores: { performanceRating: 78, insuranceRiskScore: 32, riskCategory: 'Low Risk', insuranceMultiplier: 0.92 },
    violations: { total: 5, speed: 2, harshBraking: 2, nightDriving: 1 },
  },
  {
    driverName: 'Nkosinathi Dlamini',
    plate: 'KVX417MP',
    currentPoints: 910,
    performanceLevel: 'Gold',
    scores: { performanceRating: 95, insuranceRiskScore: 10, riskCategory: 'Low Risk', insuranceMultiplier: 0.80 },
    violations: { total: 1, speed: 0, harshBraking: 1, nightDriving: 0 },
  },
  {
    driverName: 'Pieter van Rooyen',
    plate: 'CH768383',
    currentPoints: 680,
    performanceLevel: 'Silver',
    scores: { performanceRating: 74, insuranceRiskScore: 38, riskCategory: 'Medium Risk', insuranceMultiplier: 1.05 },
    violations: { total: 7, speed: 3, harshBraking: 2, nightDriving: 2 },
  },
  {
    driverName: 'James Mokoena',
    plate: 'KXH506MP',
    currentPoints: 540,
    performanceLevel: 'Bronze',
    scores: { performanceRating: 58, insuranceRiskScore: 55, riskCategory: 'Medium Risk', insuranceMultiplier: 1.15 },
    violations: { total: 12, speed: 6, harshBraking: 3, nightDriving: 3 },
  },
  {
    driverName: 'Andile Ndlovu',
    plate: 'LDH877MP',
    currentPoints: 790,
    performanceLevel: 'Silver',
    scores: { performanceRating: 82, insuranceRiskScore: 22, riskCategory: 'Low Risk', insuranceMultiplier: 0.88 },
    violations: { total: 3, speed: 1, harshBraking: 1, nightDriving: 1 },
  },
  {
    driverName: 'Bongani Sithole',
    plate: 'CH766005',
    currentPoints: 620,
    performanceLevel: 'Bronze',
    scores: { performanceRating: 64, insuranceRiskScore: 48, riskCategory: 'Medium Risk', insuranceMultiplier: 1.10 },
    violations: { total: 9, speed: 4, harshBraking: 3, nightDriving: 2 },
  },
  {
    driverName: 'David Pretorius',
    plate: 'KVR591MP',
    currentPoints: 870,
    performanceLevel: 'Gold',
    scores: { performanceRating: 90, insuranceRiskScore: 18, riskCategory: 'Low Risk', insuranceMultiplier: 0.82 },
    violations: { total: 2, speed: 1, harshBraking: 0, nightDriving: 1 },
  },
  {
    driverName: 'Lungile Zulu',
    plate: 'CH766652',
    currentPoints: 450,
    performanceLevel: 'Bronze',
    scores: { performanceRating: 48, insuranceRiskScore: 65, riskCategory: 'High Risk', insuranceMultiplier: 1.25 },
    violations: { total: 16, speed: 8, harshBraking: 4, nightDriving: 4 },
  },
  {
    driverName: 'Mpho Ndluzele',
    plate: 'LN54GJGP',
    currentPoints: 760,
    performanceLevel: 'Silver',
    scores: { performanceRating: 80, insuranceRiskScore: 25, riskCategory: 'Low Risk', insuranceMultiplier: 0.90 },
    violations: { total: 4, speed: 2, harshBraking: 1, nightDriving: 1 },
  },
  {
    driverName: 'Frans van der Merwe',
    plate: 'KXH510MP',
    currentPoints: 830,
    performanceLevel: 'Gold',
    scores: { performanceRating: 88, insuranceRiskScore: 20, riskCategory: 'Low Risk', insuranceMultiplier: 0.84 },
    violations: { total: 3, speed: 1, harshBraking: 1, nightDriving: 1 },
  },
  {
    driverName: 'Sibusiso Mkhize',
    plate: 'CH766659',
    currentPoints: 510,
    performanceLevel: 'Bronze',
    scores: { performanceRating: 55, insuranceRiskScore: 58, riskCategory: 'Medium Risk', insuranceMultiplier: 1.18 },
    violations: { total: 11, speed: 5, harshBraking: 3, nightDriving: 3 },
  },
]

const HARDCODED_EVENTS: Record<string, any[]> = {
  'Sipho Mthembu': [
    { gps_time: '2026-07-02T08:15:00', event_name: 'Speeding 120km/h in 100 zone', speed: 120, latitude: -26.1542, longitude: 28.1324 },
    { gps_time: '2026-07-05T14:30:00', event_name: 'Harsh Braking', speed: 85, latitude: -26.2041, longitude: 28.0473 },
  ],
  'Thabo Khumalo': [
    { gps_time: '2026-07-01T06:45:00', event_name: 'Speeding 130km/h in 120 zone', speed: 130, latitude: -25.7479, longitude: 28.2293 },
    { gps_time: '2026-07-03T11:20:00', event_name: 'Harsh Acceleration', speed: 95, latitude: -25.8901, longitude: 28.1640 },
    { gps_time: '2026-07-06T22:10:00', event_name: 'Night Time Driving', speed: 70, latitude: -25.9964, longitude: 28.1286 },
    { gps_time: '2026-07-07T09:00:00', event_name: 'Harsh Braking', speed: 60, latitude: -26.1705, longitude: 27.9872 },
    { gps_time: '2026-07-08T16:45:00', event_name: 'Speeding 115km/h in 100 zone', speed: 115, latitude: -26.0520, longitude: 28.1766 },
  ],
  'Nkosinathi Dlamini': [
    { gps_time: '2026-07-04T12:00:00', event_name: 'Harsh Braking', speed: 75, latitude: -29.8587, longitude: 31.0218 },
  ],
  'Pieter van Rooyen': [
    { gps_time: '2026-07-01T05:30:00', event_name: 'Night Time Driving', speed: 80, latitude: -33.9249, longitude: 18.4241 },
    { gps_time: '2026-07-02T23:45:00', event_name: 'Speeding 125km/h in 120 zone', speed: 125, latitude: -33.5000, longitude: 18.5000 },
    { gps_time: '2026-07-03T10:15:00', event_name: 'Harsh Acceleration', speed: 100, latitude: -33.8000, longitude: 18.6000 },
    { gps_time: '2026-07-04T14:30:00', event_name: 'Harsh Braking', speed: 90, latitude: -33.6500, longitude: 18.4500 },
    { gps_time: '2026-07-05T22:00:00', event_name: 'Night Time Driving', speed: 65, latitude: -33.7000, longitude: 18.5500 },
    { gps_time: '2026-07-06T08:00:00', event_name: 'Speeding 135km/h in 120 zone', speed: 135, latitude: -33.8500, longitude: 18.4800 },
    { gps_time: '2026-07-07T11:30:00', event_name: 'Harsh Acceleration', speed: 110, latitude: -33.9000, longitude: 18.4200 },
  ],
  'James Mokoena': [
    { gps_time: '2026-07-01T07:00:00', event_name: 'Speeding 140km/h in 120 zone', speed: 140, latitude: -29.0852, longitude: 26.1596 },
    { gps_time: '2026-07-02T15:30:00', event_name: 'Speeding 132km/h in 120 zone', speed: 132, latitude: -29.1000, longitude: 26.2000 },
    { gps_time: '2026-07-03T21:00:00', event_name: 'Night Time Driving', speed: 75, latitude: -29.0500, longitude: 26.1000 },
    { gps_time: '2026-07-04T09:45:00', event_name: 'Harsh Acceleration', speed: 105, latitude: -29.1200, longitude: 26.1800 },
    { gps_time: '2026-07-05T13:15:00', event_name: 'Harsh Braking', speed: 80, latitude: -29.0700, longitude: 26.1300 },
    { gps_time: '2026-07-06T06:30:00', event_name: 'Speeding 128km/h in 120 zone', speed: 128, latitude: -29.0900, longitude: 26.1700 },
    { gps_time: '2026-07-06T23:30:00', event_name: 'Night Time Driving', speed: 60, latitude: -29.1100, longitude: 26.1400 },
    { gps_time: '2026-07-07T10:00:00', event_name: 'Harsh Acceleration', speed: 98, latitude: -29.0600, longitude: 26.1200 },
    { gps_time: '2026-07-07T16:00:00', event_name: 'Speeding 122km/h in 120 zone', speed: 122, latitude: -29.0800, longitude: 26.1600 },
    { gps_time: '2026-07-08T08:30:00', event_name: 'Harsh Braking', speed: 70, latitude: -29.0950, longitude: 26.1550 },
    { gps_time: '2026-07-08T22:15:00', event_name: 'Night Time Driving', speed: 55, latitude: -29.1050, longitude: 26.1350 },
    { gps_time: '2026-07-09T14:00:00', event_name: 'Speeding 118km/h in 100 zone', speed: 118, latitude: -29.0750, longitude: 26.1450 },
  ],
  'Andile Ndlovu': [
    { gps_time: '2026-07-02T10:30:00', event_name: 'Speeding 110km/h in 100 zone', speed: 110, latitude: -28.7800, longitude: 32.0700 },
    { gps_time: '2026-07-05T15:00:00', event_name: 'Harsh Braking', speed: 80, latitude: -28.8000, longitude: 32.0500 },
    { gps_time: '2026-07-08T21:30:00', event_name: 'Night Time Driving', speed: 65, latitude: -28.7900, longitude: 32.0600 },
  ],
  'Bongani Sithole': [
    { gps_time: '2026-07-01T08:00:00', event_name: 'Speeding 125km/h in 120 zone', speed: 125, latitude: -26.1035, longitude: 28.2341 },
    { gps_time: '2026-07-02T12:45:00', event_name: 'Harsh Acceleration', speed: 100, latitude: -26.1200, longitude: 28.2100 },
    { gps_time: '2026-07-03T16:30:00', event_name: 'Harsh Braking', speed: 85, latitude: -26.0800, longitude: 28.2500 },
    { gps_time: '2026-07-04T20:00:00', event_name: 'Night Time Driving', speed: 60, latitude: -26.1100, longitude: 28.2200 },
    { gps_time: '2026-07-05T09:15:00', event_name: 'Speeding 118km/h in 100 zone', speed: 118, latitude: -26.0900, longitude: 28.2400 },
    { gps_time: '2026-07-06T14:00:00', event_name: 'Harsh Acceleration', speed: 95, latitude: -26.1150, longitude: 28.2150 },
    { gps_time: '2026-07-07T23:00:00', event_name: 'Night Time Driving', speed: 55, latitude: -26.0950, longitude: 28.2250 },
    { gps_time: '2026-07-08T11:00:00', event_name: 'Harsh Braking', speed: 75, latitude: -26.1050, longitude: 28.2300 },
    { gps_time: '2026-07-09T07:30:00', event_name: 'Speeding 122km/h in 120 zone', speed: 122, latitude: -26.1000, longitude: 28.2400 },
  ],
  'David Pretorius': [
    { gps_time: '2026-07-03T09:00:00', event_name: 'Speeding 126km/h in 120 zone', speed: 126, latitude: -25.7479, longitude: 28.2293 },
    { gps_time: '2026-07-07T22:30:00', event_name: 'Night Time Driving', speed: 70, latitude: -25.7600, longitude: 28.2400 },
  ],
  'Lungile Zulu': [
    { gps_time: '2026-07-01T06:00:00', event_name: 'Speeding 138km/h in 120 zone', speed: 138, latitude: -26.1542, longitude: 28.1324 },
    { gps_time: '2026-07-01T22:00:00', event_name: 'Night Time Driving', speed: 60, latitude: -26.1600, longitude: 28.1400 },
    { gps_time: '2026-07-02T10:30:00', event_name: 'Speeding 130km/h in 120 zone', speed: 130, latitude: -26.1700, longitude: 28.1200 },
    { gps_time: '2026-07-03T14:00:00', event_name: 'Harsh Acceleration', speed: 105, latitude: -26.1400, longitude: 28.1500 },
    { gps_time: '2026-07-04T08:15:00', event_name: 'Speeding 125km/h in 120 zone', speed: 125, latitude: -26.1550, longitude: 28.1350 },
    { gps_time: '2026-07-04T23:30:00', event_name: 'Night Time Driving', speed: 50, latitude: -26.1450, longitude: 28.1450 },
    { gps_time: '2026-07-05T11:00:00', event_name: 'Harsh Braking', speed: 80, latitude: -26.1650, longitude: 28.1250 },
    { gps_time: '2026-07-05T18:00:00', event_name: 'Speeding 135km/h in 120 zone', speed: 135, latitude: -26.1500, longitude: 28.1300 },
    { gps_time: '2026-07-06T07:45:00', event_name: 'Harsh Acceleration', speed: 100, latitude: -26.1580, longitude: 28.1380 },
    { gps_time: '2026-07-07T13:30:00', event_name: 'Speeding 128km/h in 120 zone', speed: 128, latitude: -26.1480, longitude: 28.1420 },
    { gps_time: '2026-07-07T21:00:00', event_name: 'Night Time Driving', speed: 55, latitude: -26.1520, longitude: 28.1360 },
    { gps_time: '2026-07-08T09:30:00', event_name: 'Harsh Braking', speed: 75, latitude: -26.1620, longitude: 28.1280 },
    { gps_time: '2026-07-08T15:45:00', event_name: 'Speeding 120km/h in 100 zone', speed: 120, latitude: -26.1420, longitude: 28.1480 },
    { gps_time: '2026-07-09T10:00:00', event_name: 'Night Time Driving', speed: 45, latitude: -26.1560, longitude: 28.1340 },
    { gps_time: '2026-07-09T16:30:00', event_name: 'Harsh Acceleration', speed: 92, latitude: -26.1460, longitude: 28.1440 },
  ],
  'Mpho Ndluzele': [
    { gps_time: '2026-07-02T11:15:00', event_name: 'Speeding 115km/h in 100 zone', speed: 115, latitude: -26.2041, longitude: 28.0473 },
    { gps_time: '2026-07-05T16:00:00', event_name: 'Harsh Braking', speed: 88, latitude: -26.2100, longitude: 28.0500 },
    { gps_time: '2026-07-07T20:30:00', event_name: 'Night Time Driving', speed: 62, latitude: -26.2000, longitude: 28.0400 },
    { gps_time: '2026-07-09T13:00:00', event_name: 'Harsh Acceleration', speed: 98, latitude: -26.2050, longitude: 28.0450 },
  ],
  'Frans van der Merwe': [
    { gps_time: '2026-07-01T09:30:00', event_name: 'Speeding 124km/h in 120 zone', speed: 124, latitude: -25.9964, longitude: 28.1286 },
    { gps_time: '2026-07-04T14:45:00', event_name: 'Harsh Braking', speed: 82, latitude: -26.0100, longitude: 28.1400 },
    { gps_time: '2026-07-08T22:00:00', event_name: 'Night Time Driving', speed: 68, latitude: -26.0050, longitude: 28.1350 },
  ],
  'Sibusiso Mkhize': [
    { gps_time: '2026-07-01T07:30:00', event_name: 'Speeding 133km/h in 120 zone', speed: 133, latitude: -26.0520, longitude: 28.1766 },
    { gps_time: '2026-07-02T19:00:00', event_name: 'Night Time Driving', speed: 58, latitude: -26.0600, longitude: 28.1800 },
    { gps_time: '2026-07-03T12:30:00', event_name: 'Harsh Acceleration', speed: 102, latitude: -26.0400, longitude: 28.1900 },
    { gps_time: '2026-07-04T15:45:00', event_name: 'Speeding 128km/h in 120 zone', speed: 128, latitude: -26.0550, longitude: 28.1750 },
    { gps_time: '2026-07-05T10:00:00', event_name: 'Harsh Braking', speed: 78, latitude: -26.0450, longitude: 28.1850 },
    { gps_time: '2026-07-06T21:30:00', event_name: 'Night Time Driving', speed: 52, latitude: -26.0650, longitude: 28.1700 },
    { gps_time: '2026-07-07T08:00:00', event_name: 'Speeding 120km/h in 120 zone', speed: 120, latitude: -26.0500, longitude: 28.1800 },
    { gps_time: '2026-07-07T17:15:00', event_name: 'Harsh Acceleration', speed: 96, latitude: -26.0580, longitude: 28.1780 },
    { gps_time: '2026-07-08T13:00:00', event_name: 'Harsh Braking', speed: 72, latitude: -26.0480, longitude: 28.1820 },
    { gps_time: '2026-07-09T09:00:00', event_name: 'Speeding 115km/h in 100 zone', speed: 115, latitude: -26.0620, longitude: 28.1740 },
    { gps_time: '2026-07-09T20:00:00', event_name: 'Night Time Driving', speed: 48, latitude: -26.0560, longitude: 28.1760 },
  ],
}

function matchEventToCategory(eventName: string, patterns: string[]): boolean {
  const lower = eventName.toLowerCase()
  return patterns.some(p => lower.includes(p))
}

export default function DriverPerformanceDashboard() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDriver, setSelectedDriver] = useState<DriverPerformanceData | null>(null)

  const filteredDrivers = HARDCODED_DRIVERS.filter(driver => {
    return driver.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (driver.plate && driver.plate.toLowerCase().includes(searchTerm.toLowerCase()))
  })

  const getPerformanceLevelColor = (level: string) => {
    switch (level) {
      case 'Gold': return 'bg-yellow-100 text-yellow-800'
      case 'Silver': return 'bg-gray-100 text-gray-800'
      case 'Bronze': return 'bg-orange-100 text-orange-800'
      default: return 'bg-slate-100 text-slate-800'
    }
  }

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const categorizeEvents = (driverName: string) => {
    const events = HARDCODED_EVENTS[driverName] || []
    const counts: Record<string, number> = {}
    const categorized: Record<string, any[]> = {}

    for (const cat of MONITORING_CATEGORIES) {
      counts[cat.key] = 0
      categorized[cat.key] = []
    }

    for (const event of events) {
      const name = event.event_name || ''
      for (const cat of MONITORING_CATEGORIES) {
        if (matchEventToCategory(name, cat.eventPatterns)) {
          counts[cat.key]++
          categorized[cat.key].push(event)
          break
        }
      }
    }

    return { counts, categorized }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Driver Performance Dashboard</h2>
          <p className="text-muted-foreground">Monitor driver performance metrics — July 2026</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search drivers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredDrivers.map((driver, index) => (
          <Card
            key={`${driver.driverName}-${index}`}
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => setSelectedDriver(driver)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-sm font-semibold leading-tight break-words">{driver.driverName}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{driver.plate || 'No plate'}</p>
                </div>
                <Badge className={`${getPerformanceLevelColor(driver.performanceLevel)} text-xs px-2 py-1 shrink-0`}>
                  {driver.performanceLevel}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-yellow-50 rounded-lg p-2">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Trophy className="h-3 w-3 text-yellow-600" />
                    <span className="text-xs font-medium">Points</span>
                  </div>
                  <span className="font-bold text-lg text-yellow-700">{driver.currentPoints}</span>
                </div>
                <div className="bg-blue-50 rounded-lg p-2">
                  <div className="text-xs font-medium mb-1 text-blue-700">Rating</div>
                  <span className="font-bold text-lg text-blue-700">{driver.scores.performanceRating}%</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Performance</span>
                  <span className={getPerformanceColor(driver.scores.performanceRating)}>{driver.scores.performanceRating}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${driver.scores.performanceRating}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Risk Score</span>
                  <span className={getPerformanceColor(100 - driver.scores.insuranceRiskScore)}>{driver.scores.insuranceRiskScore}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(0, 100 - driver.scores.insuranceRiskScore)}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-medium">Risk Category</div>
                <Badge variant={driver.scores.riskCategory === 'Low Risk' ? 'default' : 'destructive'} className="text-xs">
                  {driver.scores.riskCategory}
                </Badge>
              </div>

              {driver.violations.total > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-red-500" />
                      <span>Violations</span>
                    </div>
                    <Badge variant="destructive" className="text-xs px-1.5 py-0.5">{driver.violations.total}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Speed: {driver.violations.speed} | Braking: {driver.violations.harshBraking} | Night: {driver.violations.nightDriving}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDrivers.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground">No drivers match your search</div>
        </div>
      )}

      {/* Driver Detail Modal */}
      <Dialog.Root open={!!selectedDriver} onOpenChange={(open) => { if (!open) setSelectedDriver(null) }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-4xl max-h-[85vh] bg-white rounded-lg shadow-lg overflow-y-auto z-50">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <Dialog.Title className="text-xl font-semibold">
                  {selectedDriver?.driverName || ''}
                </Dialog.Title>
                <Dialog.Description className="text-sm text-muted-foreground">
                  Driver Monitoring — July 2026
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button className="p-1 rounded-md hover:bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                {selectedDriver && (
                  <>
                    <div className="grid grid-cols-4 gap-4 mb-6">
                      <div className="bg-yellow-50 rounded-lg p-3 text-center">
                        <Trophy className="h-4 w-4 text-yellow-600 mx-auto mb-1" />
                        <div className="text-lg font-bold text-yellow-700">{selectedDriver.currentPoints}</div>
                        <div className="text-xs text-muted-foreground">Points</div>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <Shield className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                        <div className="text-lg font-bold text-blue-700">{selectedDriver.scores.performanceRating}%</div>
                        <div className="text-xs text-muted-foreground">Performance</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <Star className="h-4 w-4 text-green-600 mx-auto mb-1" />
                        <div className="text-lg font-bold text-green-700">{selectedDriver.scores.insuranceRiskScore}</div>
                        <div className="text-xs text-muted-foreground">Risk Score</div>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3 text-center">
                        <AlertTriangle className="h-4 w-4 text-red-600 mx-auto mb-1" />
                        <div className="text-lg font-bold text-red-700">{selectedDriver.violations.total}</div>
                        <div className="text-xs text-muted-foreground">Violations</div>
                      </div>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gradient-to-r from-slate-800 to-slate-900 text-white">
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Criterion</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">Weighting</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">Risk Tiers</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">No. Incidents</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Statuses</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const { counts, categorized } = categorizeEvents(selectedDriver.driverName)
                            return MONITORING_CATEGORIES.map((cat, idx) => {
                              const Icon = cat.icon
                              const incidentCount = counts[cat.key]
                              const events = categorized[cat.key]
                              const uniqueStatuses = [...new Set(events.map((e: any) => e.event_name))].filter(Boolean)

                              return (
                                <tr key={cat.key} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <Icon className="h-4 w-4 text-slate-600" />
                                      <span className="text-sm font-medium text-slate-900">{cat.label}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center text-sm text-slate-700">{cat.weight}.0</td>
                                  <td className="px-4 py-3 text-center text-sm text-slate-700">4</td>
                                  <td className="px-4 py-3 text-center">
                                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                                      incidentCount > 10 ? 'bg-red-100 text-red-700' :
                                      incidentCount > 5 ? 'bg-orange-100 text-orange-700' :
                                      incidentCount > 0 ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-slate-100 text-slate-500'
                                    }`}>
                                      {incidentCount}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    {uniqueStatuses.length > 0 ? (
                                      <div className="flex flex-wrap gap-1">
                                        {uniqueStatuses.map((status, si) => (
                                          <Badge key={si} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                            {status}
                                          </Badge>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-xs text-slate-400">-</span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })
                          })()}
                        </tbody>
                      </table>
                    </div>

                    {(() => {
                      const events = HARDCODED_EVENTS[selectedDriver.driverName] || []
                      if (events.length === 0) return (
                        <div className="text-center py-6 text-muted-foreground text-sm">
                          No events found for this driver
                        </div>
                      )
                      return (
                        <div className="mt-6">
                          <h4 className="text-sm font-semibold mb-3">Recent Events ({events.length})</h4>
                          <div className="border rounded-lg max-h-60 overflow-y-auto">
                            <table className="w-full">
                              <thead className="sticky top-0 bg-slate-100">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Time</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Event</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Speed</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Location</th>
                                </tr>
                              </thead>
                              <tbody>
                                {events.map((event, idx) => (
                                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                    <td className="px-3 py-2 text-xs text-slate-600">
                                      {new Date(event.gps_time).toLocaleString()}
                                    </td>
                                    <td className="px-3 py-2 text-xs font-medium text-slate-900">{event.event_name}</td>
                                    <td className="px-3 py-2 text-xs text-slate-600">{event.speed ? `${event.speed} km/h` : '-'}</td>
                                    <td className="px-3 py-2 text-xs text-slate-600 truncate max-w-[200px]">
                                      {event.latitude}, {event.longitude}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )
                    })()}
                  </>
                )}
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
