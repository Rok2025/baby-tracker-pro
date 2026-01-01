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

    // 客户端过滤：
    // - 喂奶/其他记录：按 start_time 归属日期
    // - 睡眠记录：有 end_time 时按 end_time 归属日期（跨天归属于醒来那天）
    return (data || []).filter((act: Activity) => {
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
