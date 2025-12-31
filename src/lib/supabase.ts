import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Activity = {
  id: string
  created_at: string
  user_id: string // 新增
  type: 'sleep' | 'feeding' | 'other'
  start_time: string
  end_time?: string | null
  volume?: number | null // ml
  note?: string | null
}

export type UserConfig = {
  id: string // 新增
  user_id: string // 新增
  key: string
  value: any
}
