import { initSupabase } from '@yoyo/api'

export const supabase = initSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export type { Activity, UserConfig } from '@yoyo/api'
