/**
 * Supabase REST API 客户端 (微信小程序版)
 * 不使用 supabase-js，直接调用 REST API
 */

declare const wx: any

const SUPABASE_URL = 'https://ffarxgtwvbhpextaujuw.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_PgBEgkYnCUC_TRMHNcm6aw_Iyzm0GIh'

// 存储 session
let currentSession: any = null

/**
 * 发起 Supabase REST API 请求
 */
const request = <T = any>(
    path: string,
    options: {
        method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
        body?: any
        headers?: Record<string, string>
    } = {}
): Promise<{ data: T | null; error: any }> => {
    return new Promise((resolve) => {
        const headers: Record<string, string> = {
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
            ...options.headers
        }

        // 添加认证 token
        if (currentSession?.access_token) {
            headers['Authorization'] = `Bearer ${currentSession.access_token}`
        }

        wx.request({
            url: `${SUPABASE_URL}${path}`,
            method: options.method || 'GET',
            data: options.body,
            header: headers,
            success: (res: any) => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({ data: res.data, error: null })
                } else {
                    resolve({
                        data: null,
                        error: {
                            message: res.data?.message || res.data?.error || 'Request failed',
                            status: res.statusCode
                        }
                    })
                }
            },
            fail: (err: any) => {
                resolve({
                    data: null,
                    error: { message: err.errMsg || 'Network error' }
                })
            }
        })
    })
}

// 类型定义
export type Activity = {
    id: string
    created_at: string
    user_id: string
    type: 'sleep' | 'feeding' | 'other'
    start_time: string
    end_time?: string | null
    volume?: number | null
    note?: string | null
}

// Auth 模块
export const auth = {
    getSession: async () => {
        return { data: { session: currentSession }, error: null }
    },

    onAuthStateChange: (callback: (event: string, session: any) => void) => {
        // 初始化时触发一次
        setTimeout(() => {
            callback('INITIAL_SESSION', currentSession)
        }, 0)

        return {
            data: { subscription: { unsubscribe: () => { } } }
        }
    },

    // 邮箱密码登录
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        const result = await request<any>('/auth/v1/token?grant_type=password', {
            method: 'POST',
            body: { email, password }
        })

        if (result.error) {
            return { data: { user: null, session: null }, error: result.error }
        }

        if (result.data) {
            currentSession = {
                access_token: result.data.access_token,
                refresh_token: result.data.refresh_token,
                user: result.data.user
            }
            // 保存到本地存储
            try {
                wx.setStorageSync('supabase_session', JSON.stringify(currentSession))
            } catch (e) {
                console.error('Save session failed:', e)
            }
        }

        return {
            data: { user: currentSession?.user, session: currentSession },
            error: null
        }
    },

    signInAnonymously: async () => {
        // 简化模式：创建本地 session（保留作为备选）
        const tempUserId = 'wx_user_' + Date.now().toString(36)

        currentSession = {
            access_token: 'local_token_' + tempUserId,
            user: {
                id: tempUserId,
                email: null,
                role: 'authenticated'
            }
        }

        try {
            wx.setStorageSync('supabase_session', JSON.stringify(currentSession))
        } catch (e) {
            console.error('Save session failed:', e)
        }

        return {
            data: { user: currentSession.user, session: currentSession },
            error: null
        }
    },

    signOut: async () => {
        currentSession = null
        try {
            wx.removeStorageSync('supabase_session')
        } catch (e) {
            console.error('Remove session failed:', e)
        }
        return { error: null }
    }
}

// 从本地存储恢复 session
try {
    const saved = wx.getStorageSync('supabase_session')
    if (saved) {
        currentSession = JSON.parse(saved)
    }
} catch (e) {
    console.error('Restore session failed:', e)
}

// Database 模块
export const supabase = {
    auth,

    from: (table: string) => {
        let query = `/rest/v1/${table}`
        const filters: string[] = []
        let selectColumns = '*'

        const builder: any = {
            select: (columns: string = '*') => {
                selectColumns = columns
                return builder
            },

            order: (column: string, { ascending = true } = {}) => {
                filters.push(`order=${column}.${ascending ? 'asc' : 'desc'}`)
                return builder
            },

            single: () => {
                builder._single = true
                return builder
            },

            eq: (column: string, value: any) => {
                filters.push(`${column}=eq.${encodeURIComponent(String(value))}`)
                return builder
            },

            lte: (column: string, value: any) => {
                filters.push(`${column}=lte.${encodeURIComponent(String(value))}`)
                return builder
            },

            gte: (column: string, value: any) => {
                filters.push(`${column}=gte.${encodeURIComponent(String(value))}`)
                return builder
            },

            or: (filter: string) => {
                // Do not encode the entire or string as it contains separators like ',' and '.'
                // The values inside (like ISO dates) are generally safe in PostgREST without encoding,
                // but we should ideally only encode the value parts. For now, passing raw is safer than encoding the whole thing.
                filters.push(`or=(${filter})`)
                return builder
            },

            in: (column: string, values: any[]) => {
                const encodedValues = values.map(v => encodeURIComponent(String(v))).join(',')
                filters.push(`${column}=in.(${encodedValues})`)
                return builder
            },

            insert: async (data: any) => {
                return request(query, {
                    method: 'POST',
                    body: data
                })
            },

            update: async (data: any) => {
                const queryString = filters.length > 0 ? `?${filters.join('&')}` : ''
                return request(`${query}${queryString}`, {
                    method: 'PATCH',
                    body: data
                })
            },

            delete: async () => {
                const queryString = filters.length > 0 ? `?${filters.join('&')}` : ''
                return request(`${query}${queryString}`, {
                    method: 'DELETE'
                })
            },

            then: (onFulfilled: any, onRejected?: any) => {
                const params: string[] = [`select=${selectColumns}`, ...filters]
                return request<any[]>(`${query}?${params.join('&')}`).then((res) => {
                    if (builder._single && res.data && Array.isArray(res.data)) {
                        return onFulfilled({ data: res.data[0] || null, error: res.error })
                    }
                    return onFulfilled(res)
                }, onRejected)
            }
        }

        return builder
    }
}

/**
 * 获取指定日期的活动记录
 */
export const fetchActivitiesForDay = async (userId: string, date: Date): Promise<Activity[]> => {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    try {
        const { data, error } = await supabase
            .from('activities')
            .select('*')
            .eq('user_id', userId)
            .lte('start_time', endOfDay.toISOString())
            .or(`end_time.gte.${startOfDay.toISOString()},end_time.is.null`)

        // 开发模式下，如果认证失败就返回空数组
        if (error) {
            console.warn('Fetch activities failed:', error.message)
            return []
        }

        return (data || []).filter((act: Activity) => {
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
    } catch (e) {
        console.warn('Fetch activities error:', e)
        return []
    }
}

export default supabase
