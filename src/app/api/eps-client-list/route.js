import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    let allData = []
    let from = 0
    const batchSize = 1000
    
    while (true) {
      const { data, error } = await supabase
        .from('eps_client_list')
        .select('id, name, coordinates, address, client_id')
        .not('client_id', 'is', null)
        .order('name')
        .range(from, from + batchSize - 1)
      
      if (error) {
        console.error('Supabase error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      
      if (!data || data.length === 0) break
      
      allData = [...allData, ...data]
      
      if (data.length < batchSize) break
      
      from += batchSize
    }
    
    return NextResponse.json({ data: allData })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}