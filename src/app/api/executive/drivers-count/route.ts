import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('drivers')
      .select('available')
      .not('available', 'is', null)

    if (error) throw error

    const available = data.filter((d: any) => d.available === true).length
    const unavailable = data.filter((d: any) => d.available === false).length
    const total = data.length

    return NextResponse.json({ total, available, unavailable })
  } catch (error) {
    console.error('Drivers count error:', error)
    return NextResponse.json({ total: 0, available: 0, unavailable: 0 }, { status: 500 })
  }
}
