import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Activity = {
  id: string
  created_at: string
  type: 'sleep' | 'feeding' | 'other'
  start_time: string
  end_time?: string
  volume?: number // ml
  note?: string
}

export type UserConfig = {
  key: string
  value: any
}
