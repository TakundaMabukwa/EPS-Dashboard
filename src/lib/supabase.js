import { createClient } from '@supabase/supabase-js'

let _supabase = null

export const supabase = (() => {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (supabaseUrl && supabaseKey) {
      _supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false }
      })
    }
  }
  return _supabase
})()