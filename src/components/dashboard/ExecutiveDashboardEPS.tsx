'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BarChart } from '@mui/x-charts/BarChart'
import { LineChart } from '@mui/x-charts/LineChart'
import { PieChart } from '@mui/x-charts/PieChart'
import FleetRiskGauge from '@/components/charts/FleetFuelGauge'
import { RefreshCw, TrendingUp, AlertTriangle, Users, Award } from 'lucide-react'

interface DashboardData {
  executive: any
  dailyStats: any[]
  riskAssessment: any[]
  performance: any[]
  worstDrivers: any[]
  violations: any[]
  leaderboard: any[]
  monthlyIncidents: any
  allDriverProfiles: any[]
  latest: any
}

export default function ExecutiveDashboardEPS() {
  const [data, setData] = useState<DashboardData>({
    executive: {},
    dailyStats: [],
    riskAssessment: [],
    performance: [],
    worstDrivers: [],
    violations: [],
    leaderboard: [],
    monthlyIncidents: {},
    allDriverProfiles: [],
    latest: {}
  })
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      
      const [executive, dailyStats, leaderboard] = await Promise.all([
        fetch('/api/eps-rewards/executive-dashboard').then(r => r.json()).catch(() => ({})),
        fetch('/api/eps-rewards/daily-stats').then(r => r.json()).catch(() => []),
        fetch('/api/stats/leaderboard?limit=50').then(r => r.json()).catch(() => ({}))
      ])
      
      const drivers = Array.isArray(dailyStats) ? dailyStats : []
      
      setData({
        executive: executive || {},
        dailyStats: drivers,
        riskAssessment: [],
        performance: leaderboard.best_performers || [],
        worstDrivers: leaderboard.worst_performers || [],
        violations: leaderboard.top_speeders || [],
        leaderboard: leaderboard.all_drivers || [],
        monthlyIncidents: {},
        allDriverProfiles: leaderboard.all_drivers || [],
        latest: leaderboard.fleet_summary || {}
      })
      
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error fetching dashboard data:', error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-lg font-medium">Loading Executive Dashboard...</p>
          <p className="text-sm text-gray-600">Fetching real-time fleet analytics</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-sky-100 via-blue-50 to-cyan-50 shadow-lg p-6 border border-blue-200 rounded-lg text-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-2xl">EPS Courier Services - Executive Dashboard</h1>
            <p className="text-sm text-slate-600 mt-1">Real-time fleet performance and analytics</p>
          </div>
          <div className="flex items-center space-x-4">
            {lastUpdated && (
              <p className="text-xs text-slate-600">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
            <Button onClick={fetchAllData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Executive KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Drivers</p>
                <p className="text-2xl font-bold text-blue-600">{data.latest.total_drivers || data.dailyStats.length || 0}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Points</p>
                <p className="text-2xl font-bold text-green-600">{data.latest.average_points || 0}</p>
              </div>
              <Award className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Violations</p>
                <p className="text-2xl font-bold text-red-600">{data.latest.total_violations || 0}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Speed Violations</p>
                <p className="text-2xl font-bold text-orange-600">{data.latest.total_speed_violations || 0}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Distance</p>
                <p className="text-2xl font-bold text-purple-600">{(data.latest.total_distance_km || 0).toLocaleString()} km</p>
              </div>
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 text-sm font-semibold">📍</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Charts */}
      <div className="space-y-8">
        {/* Best Performers */}
        <Card className="min-h-[400px]">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-800">🏆 Top Performers - Leaderboard</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            {data.performance.length > 0 ? (
              <BarChart
                xAxis={[{
                  scaleType: 'band',
                  data: data.performance.slice(0, 10).map(d => d.driver_name || 'Unknown')
                }]}
                series={[{
                  data: data.performance.slice(0, 10).map(d => Number(d.current_points) || 0),
                  label: 'Points',
                  color: '#22c55e'
                }]}
                width={800}
                height={300}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">No leaderboard data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Risk Assessment and Violations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="min-h-[400px]">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-800">⚠️ Worst Performers</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              {data.worstDrivers.length > 0 ? (
                <BarChart
                  xAxis={[{
                    scaleType: 'band',
                    data: data.worstDrivers.slice(0, 6).map(d => d.driver_name || 'Unknown')
                  }]}
                  series={[{
                    data: data.worstDrivers.slice(0, 6).map(d => Number(d.current_points) || 0),
                    color: '#ef4444'
                  }]}
                  width={400}
                  height={300}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">No data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="min-h-[400px]">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-800">🚨 Top Speeders</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              {data.violations.length > 0 ? (
                <BarChart
                  xAxis={[{
                    scaleType: 'band',
                    data: data.violations.slice(0, 6).map(d => d.driver_name || 'Unknown')
                  }]}
                  series={[{
                    data: data.violations.slice(0, 6).map(d => Number(d.speed_violations) || 0),
                    color: '#f97316'
                  }]}
                  width={400}
                  height={300}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">No violation data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Top Speeders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-800">🚨 Top Speeding Drivers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-red-50">
                  <th className="text-left p-2">Rank</th>
                  <th className="text-left p-2">Driver</th>
                  <th className="text-left p-2">Speed Violations</th>
                  <th className="text-left p-2">Harsh Braking</th>
                  <th className="text-left p-2">Night Driving</th>
                  <th className="text-left p-2">Total Violations</th>
                  <th className="text-left p-2">Points</th>
                </tr>
              </thead>
              <tbody>
                {data.violations.slice(0, 10).map((driver, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-bold">{driver.rank || index + 1}</td>
                    <td className="p-2 font-medium">{driver.driver_name || 'Unknown'}</td>
                    <td className="p-2 text-red-600 font-bold">{driver.speed_violations || 0}</td>
                    <td className="p-2 text-orange-600">{driver.harsh_braking || 0}</td>
                    <td className="p-2 text-purple-600">{driver.night_driving || 0}</td>
                    <td className="p-2 font-semibold">{driver.total_violations || 0}</td>
                    <td className="p-2">
                      <Badge variant={driver.current_points > 50 ? 'default' : 'destructive'}>
                        {driver.current_points || 0}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Risk Assessment Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-800">Leaderboard - All Drivers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Rank</th>
                  <th className="text-left p-2">Driver</th>
                  <th className="text-left p-2">Level</th>
                  <th className="text-left p-2">Points</th>
                  <th className="text-left p-2">Violations</th>
                  <th className="text-left p-2">Distance (km)</th>
                </tr>
              </thead>
              <tbody>
                {data.leaderboard.slice(0, 15).map((driver, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-bold">{driver.rank || index + 1}</td>
                    <td className="p-2 font-medium">{driver.driver_name || 'Unknown'}</td>
                    <td className="p-2">
                      <Badge 
                        variant={driver.current_level === 'Gold' ? 'default' : 
                                driver.current_level === 'Silver' ? 'secondary' : 'outline'}
                      >
                        {driver.current_level || 'Bronze'}
                      </Badge>
                    </td>
                    <td className="p-2 font-semibold text-green-600">{driver.current_points || 0}</td>
                    <td className="p-2 text-red-600">{driver.total_violations || 0}</td>
                    <td className="p-2">{Number(driver.biweekly_distance_km || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Statistics Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-800">Monthly Fleet Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-3 text-left font-semibold">Metric</th>
                  <th className="border border-gray-300 p-3 text-center font-semibold">Nov 2024</th>
                  <th className="border border-gray-300 p-3 text-center font-semibold">Dec 2024</th>
                  <th className="border border-gray-300 p-3 text-center font-semibold">Jan 2025</th>
                  <th className="border border-gray-300 p-3 text-center font-semibold">Feb 2025</th>
                  <th className="border border-gray-300 p-3 text-center font-semibold">Mar 2025</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 p-3 font-medium">Speed Violations</td>
                  <td className="border border-gray-300 p-3 text-center">{data.executive.violations_summary?.speed_violations || 0}</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-3 font-medium">Route Violations</td>
                  <td className="border border-gray-300 p-3 text-center">{data.executive.violations_summary?.route_violations || 0}</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-3 font-medium">Night Violations</td>
                  <td className="border border-gray-300 p-3 text-center">{data.monthlyIncidents.penalty_events?.night_driving || 0}</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-3 font-medium">Active Vehicles</td>
                  <td className="border border-gray-300 p-3 text-center">{data.executive.fleet_summary?.active_vehicles || 0}</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-3 font-medium">Inactive Vehicles</td>
                  <td className="border border-gray-300 p-3 text-center">{data.executive.fleet_summary?.inactive_vehicles || 0}</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-3 font-medium">Low Fuel Vehicles</td>
                  <td className="border border-gray-300 p-3 text-center">{data.executive.fuel_summary?.low_fuel_vehicles || 0}</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                </tr>
                <tr className="bg-green-50">
                  <td className="border border-gray-300 p-3 font-bold">Total Kilometres</td>
                  <td className="border border-gray-300 p-3 text-center font-semibold">{(data.latest.total_distance_km || 0).toLocaleString()}</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-3 font-medium">Fleet Size</td>
                  <td className="border border-gray-300 p-3 text-center">{data.latest.total_drivers || 0}</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                </tr>
                <tr className="bg-red-50">
                  <td className="border border-gray-300 p-3 font-medium">Total Violations</td>
                  <td className="border border-gray-300 p-3 text-center font-bold text-red-600">{data.latest.total_violations || 0}</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}