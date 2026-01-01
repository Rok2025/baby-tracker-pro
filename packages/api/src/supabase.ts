import { createClient } from '@supabase/supabase-js'

let supabaseClient: any = null

export function initSupabase(url: string, anonKey: string, options?: any) {
    if (!supabaseClient) {
        supabaseClient = createClient(url, anonKey, options)
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

/**
 * 业务逻辑函数：获取指定日期的活动记录
 */
export const fetchActivitiesForDay = async (userId: string, date: Date) => {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const db = getSupabase()
    const { data, error } = await db
        .from("activities")
        .select("*")
        .eq("user_id", userId)
        .lte("start_time", endOfDay.toISOString())
        .or(`end_time.gte.${startOfDay.toISOString()},end_time.is.null`)

    if (error) throw error

    // 客户端过滤跨天记录
    return (data || []).filter((act: Activity) => {
        const actStart = new Date(act.start_time).getTime()
        const actEnd = act.end_time ? new Date(act.end_time).getTime() : actStart
        return actStart <= endOfDay.getTime() && actEnd >= startOfDay.getTime()
    })
}

/**
 * 业务逻辑函数：获取宝宝配置
 */
export const fetchBabyConfig = async (userId: string) => {
    const db = getSupabase()
    const { data, error } = await db
        .from("user_config")
        .select("key, value")
        .eq("user_id", userId)
        .in("key", ["baby_birth_date", "baby_name"])

    if (error) throw error
    return data
}
