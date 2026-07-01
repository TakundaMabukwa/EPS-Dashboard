import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )
}

export async function GET() {
  try {
    const supabase = await getSupabase()
    const { data, error } = await supabase
      .from('fuel_prices_history')
      .select('month_label, link_rate')
      .order('id', { ascending: false })

    if (error) throw error

    return NextResponse.json({ months: data || [] })
  } catch (error) {
    console.error('Fetch fuel months error:', error)
    return NextResponse.json({ error: 'Failed to fetch fuel months' }, { status: 500 })
  }
}
