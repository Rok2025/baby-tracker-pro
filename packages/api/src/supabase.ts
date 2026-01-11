import { createClient } from '@supabase/supabase-js'
import { cache } from './cache'

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
 * 支持客户端缓存，减少重复请求
 */
export const fetchActivitiesForDay = async (
    userId: string,
    date: Date,
    options = { limit: 100 }
) => {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    console.log('[Supabase] Fetching activities for User:', userId, 'Date:', startOfDay.toISOString())

    const db = getSupabase()

    // 使用稳健的小程序同款查询逻辑
    const { data, error } = await db
        .from("activities")
        .select("*")
        .eq("user_id", userId)
        .lte("start_time", endOfDay.toISOString())
        .or(`end_time.gte.${startOfDay.toISOString()},end_time.is.null`)
        .order("start_time", { ascending: false })
        .limit(options.limit)

    if (error) {
        console.error('[Supabase] Query error:', error)
        throw error
    }

    console.log('[Supabase] Raw records from DB:', data?.length || 0)

    // 客户端过滤：与小程序逻辑严格同步
    const filtered = (data || []).filter((act: Activity) => {
        const dayStart = startOfDay.getTime()
        const dayEnd = endOfDay.getTime()

        if (act.type === 'sleep') {
            if (act.end_time) {
                // 已完成的睡眠：仅在结束那天显示
                const actEnd = new Date(act.end_time).getTime()
                return actEnd >= dayStart && actEnd <= dayEnd
            } else {
                // 进行中的睡眠：在开始那天显示
                const actStart = new Date(act.start_time).getTime()
                return actStart >= dayStart && actStart <= dayEnd
            }
        } else {
            // 喂奶、其他记录：按开始时间归属
            const actStart = new Date(act.start_time).getTime()
            return actStart >= dayStart && actStart <= dayEnd
        }
    })

    console.log('[Supabase] Records after filter:', filtered.length)

    return filtered
}

/**
 * 失效指定日期的活动缓存 (不再使用，保留空函数以防报错)
 */
export const invalidateActivityCache = (userId: string, date: Date) => {
    // 缓存已移除
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
