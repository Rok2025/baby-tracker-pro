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
    options = { useCache: true, limit: 100 }
) => {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    // 生成缓存key
    const cacheKey = `activities_${userId}_${startOfDay.toISOString()}`

    // 检查缓存
    if (options.useCache && cache.has(cacheKey)) {
        console.log('[Cache] Hit:', cacheKey)
        return cache.get(cacheKey)
    }

    const db = getSupabase()
    const { data, error } = await db
        .from("activities")
        .select("*")
        .eq("user_id", userId)
        .lte("start_time", endOfDay.toISOString())
        .or(`end_time.gte.${startOfDay.toISOString()},end_time.is.null`)
        .order("start_time", { ascending: false })
        .limit(options.limit)

    if (error) throw error

    // 客户端过滤：
    // - 喂奶/其他记录：按 start_time 归属日期
    // - 睡眠记录：有 end_time 时按 end_time 归属日期（跨天归属于醒来那天）
    const filtered = (data || []).filter((act: Activity) => {
        const dayStart = startOfDay.getTime()
        const dayEnd = endOfDay.getTime()

        if (act.type === 'sleep' && act.end_time) {
            // 完成的睡眠：归属于醒来的那天
            const actEnd = new Date(act.end_time).getTime()
            return actEnd >= dayStart && actEnd <= dayEnd
        } else {
            // 喂奶、其他记录、进行中的睡眠：按开始时间归属
            const actStart = new Date(act.start_time).getTime()
            return actStart >= dayStart && actStart <= dayEnd
        }
    })

    // 缓存结果，5分钟过期
    cache.set(cacheKey, filtered, 5 * 60 * 1000)
    console.log('[Cache] Set:', cacheKey)

    return filtered
}

/**
 * 失效指定日期的活动缓存
 */
export const invalidateActivityCache = (userId: string, date: Date) => {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const cacheKey = `activities_${userId}_${startOfDay.toISOString()}`
    cache.delete(cacheKey)
    console.log('[Cache] Invalidated:', cacheKey)
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
