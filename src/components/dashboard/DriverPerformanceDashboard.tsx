'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trophy, TrendingUp, AlertTriangle, Star, Search, Calendar, X, Shield, Zap, Moon, Sun, Brake, Car } from 'lucide-react'
import { type DriverPerformanceData } from '@/lib/actions/driver-performance'
import { createClient } from '@/lib/supabase/client'
import * as Dialog from '@radix-ui/react-dialog'

const MONITORING_CATEGORIES = [
  { key: 'speeding', label: 'Speeding', icon: Zap, weight: 50, eventPatterns: ['speeding', 'speed'] },
  { key: 'harsh_acceleration', label: 'Harsh Accelerating', icon: Car, weight: 10, eventPatterns: ['acceleration', 'accelerat'] },
  { key: 'harsh_braking', label: 'Harsh Braking', icon: Brake, weight: 10, eventPatterns: ['braking', 'brake'] },
  { key: 'night_driving', label: 'Night Time Driving', icon: Moon, weight: 10, eventPatterns: ['night'] },
  { key: 'excessive_day', label: 'Excessive Day', icon: Sun, weight: 10, eventPatterns: ['day'] },
]

function matchEventToCategory(eventName: string, patterns: string[]): boolean {
  const lower = eventName.toLowerCase()
  return patterns.some(p => lower.includes(p))
}

export default function DriverPerformanceDashboard() {
  const [drivers, setDrivers] = useState<DriverPerformanceData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState('30')
  const [error, setError] = useState<string | null>(null)
  const [driverNameMap, setDriverNameMap] = useState<Map<string, string>>(new Map())

  // Modal state
  const [selectedDriver, setSelectedDriver] = useState<DriverPerformanceData | null>(null)
  const [driverEvents, setDriverEvents] = useState<any[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [driverScorecard, setDriverScorecard] = useState<any>(null)

  useEffect(() => {
    fetchDriverNames()
    fetchDriverPerformance()
  }, [dateRange])

  const fetchDriverNames = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('drivers')
        .select('driver_code, first_name, surname')
        .not('driver_code', 'is', null)

      if (error) throw error

      const map = new Map<string, string>()
      for (const d of data || []) {
        if (d.driver_code && d.first_name && d.surname) {
          const code = d.driver_code.replace(/^EPS/i, '')
          map.set(code, `${d.first_name} ${d.surname}`)
        }
      }
      setDriverNameMap(map)
    } catch (err) {
      console.error('Error fetching driver names:', err)
    }
  }

  const resolveDriverName = (apiName: string): string => {
    if (!apiName) return 'Unknown'
    const trimmed = apiName.trim()
    if (/^\d+$/.test(trimmed)) {
      return driverNameMap.get(trimmed) || trimmed
    }
    const codeMatch = trimmed.match(/^(\d+)\s/)
    if (codeMatch) {
      const resolved = driverNameMap.get(codeMatch[1])
      if (resolved) return resolved
    }
    return trimmed
  }

  const fetchDriverPerformance = async () => {
    try {
      setLoading(true)
      const HTTP_SERVER_ENDPOINT = process.env.NEXT_PUBLIC_CAN_BUS_ENDPOINT || process.env.NEXT_PUBLIC_EPS_HTTP_SERVER_ENDPOINT || 'http://209.38.217.58:3001'
      const response = await fetch('/api/eps-rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: `${HTTP_SERVER_ENDPOINT}/api/eps-rewards/all-driver-profiles` })
      })
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const data = await response.json()
      setDrivers(data.drivers || [])
    } catch (error) {
      console.error('Error fetching driver performance:', error)
      setDrivers([])
    } finally {
      setLoading(false)
    }
  }

  const fetchDriverDetails = async (driver: DriverPerformanceData) => {
    setSelectedDriver(driver)
    setDriverEvents([])
    setDriverScorecard(null)
    setEventsLoading(true)

    try {
      // Find UUID from scorecard API
      const scorecardRes = await fetch('/api/driver/scorecard')
      const scorecardData = await scorecardRes.json()
      const allScorecards = scorecardData?.data || []

      // The performance API driverName is the resolved name (e.g. "Mpho Gift Ndluzele")
      // The scorecard API name is "Driver XXXXX" format
      // We need to match by: find the original code from driverNameMap reverse lookup
      // or match by the numeric code embedded in driverName

      // Strategy 1: Extract any numeric code from the driver's original API name
      const rawName = driver.driverName || ''
      const codeMatch = rawName.match(/(\d{4,6})/)
      const extractedCode = codeMatch ? codeMatch[1] : null

      // Strategy 2: Reverse-lookup driverNameMap to find the code for this resolved name
      let reverseCode = null
      for (const [code, name] of driverNameMap.entries()) {
        if (name === resolveDriverName(rawName)) {
          reverseCode = code
          break
        }
      }

      const searchCode = extractedCode || reverseCode
      console.log('Driver match debug:', { rawName, extractedCode, reverseCode, searchCode, scorecardsCount: allScorecards.length })

      const match = allScorecards.find((s: any) => {
        const scorecardName = s.name || ''
        const scorecardFullName = s.full_name || ''
        // Match by "Driver {code}" pattern
        if (searchCode && scorecardName.includes(searchCode)) return true
        // Match by scorecard ID directly
        if (s.id === searchCode) return true
        // Fallback: match by resolved name against scorecard name
        const resolvedName = resolveDriverName(rawName)
        if (scorecardFullName && resolvedName && scorecardFullName.toLowerCase() === resolvedName.toLowerCase()) return true
        if (scorecardName && resolvedName && scorecardName.toLowerCase() === resolvedName.toLowerCase()) return true
        return false
      })

      if (match?.id) {
        const eventsRes = await fetch(`/api/driver/${match.id}/events`)
        const eventsData = await eventsRes.json()
        setDriverEvents(eventsData?.data || [])
        setDriverScorecard(match)
      }
    } catch (err) {
      console.error('Error fetching driver details:', err)
    } finally {
      setEventsLoading(false)
    }
  }

  const categorizeEvents = (events: any[]) => {
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

  const filteredDrivers = Array.isArray(drivers) ? drivers.filter(driver => {
    const resolvedName = resolveDriverName(driver.driverName)
    return resolvedName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (driver.plate && driver.plate.toLowerCase().includes(searchTerm.toLowerCase()))
  }) : []

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

  if (loading) return <div className="p-6">Loading driver performance...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Driver Performance Dashboard</h2>
          <p className="text-muted-foreground">Monitor driver performance metrics and reward levels</p>
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
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {drivers.map((driver, index) => {
          const resolvedName = resolveDriverName(driver.driverName)
          return (
          <Card
            key={`${driver.driverName}-${index}`}
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => fetchDriverDetails(driver)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-sm font-semibold leading-tight break-words">{resolvedName}</CardTitle>
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
          )
        })}
      </div>

      {drivers.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            No driver performance data available
          </div>
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
                  {selectedDriver ? resolveDriverName(selectedDriver.driverName) : ''}
                </Dialog.Title>
                <Dialog.Description className="text-sm text-muted-foreground">
                  Driver Monitoring Configuration & Events
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button className="p-1 rounded-md hover:bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>

            <div className="p-6">
              {eventsLoading ? (
                <div className="text-center py-8">
                  <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-slate-900" />
                  <p className="text-sm text-muted-foreground">Loading driver events...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Driver summary */}
                  {selectedDriver && (
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
                  )}

                  {/* Monitoring Categories Table */}
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
                          const { counts, categorized } = categorizeEvents(driverEvents)
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

                  {/* Events list */}
                  {driverEvents.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-sm font-semibold mb-3">Recent Events ({driverEvents.length})</h4>
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
                            {driverEvents.slice(0, 50).map((event, idx) => (
                              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                <td className="px-3 py-2 text-xs text-slate-600">
                                  {event.gps_time ? new Date(event.gps_time).toLocaleString() : '-'}
                                </td>
                                <td className="px-3 py-2 text-xs font-medium text-slate-900">{event.event_name}</td>
                                <td className="px-3 py-2 text-xs text-slate-600">{event.speed ? `${event.speed} km/h` : '-'}</td>
                                <td className="px-3 py-2 text-xs text-slate-600 truncate max-w-[200px]">
                                  {event.latitude && event.longitude ? `${event.latitude}, ${event.longitude}` : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {driverEvents.length === 0 && !eventsLoading && (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      No events found for this driver
                    </div>
                  )}
                </div>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
