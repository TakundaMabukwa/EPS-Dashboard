'use server'

export interface DriverPerformanceData {
  driverName: string
  plate: string | null
  currentPoints: number
  performanceLevel: string
  scores: {
    performanceRating: number
    insuranceRiskScore: number
    riskCategory: string
    insuranceMultiplier: number
  }
  violations: {
    total: number
    speed: number
    harshBraking: number
    nightDriving: number
  }
}

export async function getDriverPerformance(): Promise<DriverPerformanceData[]> {
  try {
  const baseUrl = process.env.NEXT_PUBLIC_CAN_BUS_ENDPOINT || process.env.NEXT_PUBLIC_EPS_HTTP_SERVER_ENDPOINT || 'http://209.38.217.58:3001'
    const response = await fetch(`${baseUrl}/api/eps-rewards/all-driver-profiles`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Error fetching driver performance:', error)
    return []
  }
}
