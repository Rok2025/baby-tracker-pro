import { createClient } from '@supabase/supabase-js'

let supabaseClient: any = null

export function initSupabase(url: string, anonKey: string) {
    if (!supabaseClient) {
        supabaseClient = createClient(url, anonKey)
    }
    return supabaseClient
}

export const getSupabase = () => {
    if (!supabaseClient) {
        throw new Error('Supabase client not initialized. Call initSupabase() first.')
    }
    return supabaseClient
}

// 依然导出类型以便复用
export type { SupabaseClient } from '@supabase/supabase-js'

export type Activity = {
    id: string
    created_at: string
    user_id: string
    type: 'sleep' | 'feeding' | 'other'
    start_time: string
    end_time?: string | null
    volume?: number | null // ml
    note?: string | null
}

export type UserConfig = {
    id: string
    user_id: string
    key: string
    value: any
}
