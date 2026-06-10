import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year') || new Date().getFullYear().toString()

    const { data, error } = await supabase
      .from('monthly_revenue')
      .select('*')
      .gte('month', `${year}-01-01`)
      .lte('month', `${year}-12-31`)
      .order('month', { ascending: true })

    if (error) {
      // Fallback: query trips directly if materialized view doesn't exist yet
      const { data: trips, error: tripsError } = await supabase
        .from('trips')
        .select('rate, created_at')
        .gte('created_at', `${year}-01-01`)
        .lte('created_at', `${year}-12-31 23:59:59`)
        .not('rate', 'is', null)
        .not('rate', 'eq', '')

      if (tripsError) throw tripsError

      // Group by month
      const monthlyMap = new Map<string, { revenue: number; count: number }>()
      trips.forEach((trip: any) => {
        const d = new Date(trip.created_at)
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
        const rate = parseFloat(trip.rate) || 0
        const existing = monthlyMap.get(monthKey) || { revenue: 0, count: 0 }
        existing.revenue += rate
        existing.count += 1
        monthlyMap.set(monthKey, existing)
      })

      const result = Array.from(monthlyMap.entries()).map(([month, val]) => ({
        month,
        total_revenue: val.revenue,
        trip_count: val.count,
      }))

      return NextResponse.json({ months: result, total: result.reduce((s, m) => s + m.total_revenue, 0) })
    }

    const total = data.reduce((sum: number, row: any) => sum + (parseFloat(row.total_revenue) || 0), 0)

    return NextResponse.json({ months: data, total })
  } catch (error) {
    console.error('Revenue error:', error)
    return NextResponse.json({ months: [], total: 0 }, { status: 500 })
  }
}
