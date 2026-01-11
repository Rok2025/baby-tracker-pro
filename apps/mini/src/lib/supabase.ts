/**
 * Supabase REST API 客户端 (微信小程序版)
 * 不使用 supabase-js，直接调用 REST API
 */

declare const wx: any

const SUPABASE_URL = 'https://ffarxgtwvbhpextaujuw.supabase.co'
// const SUPABASE_ANON_KEY = 'sb_publishable_PgBEgkYnCUC_TRMHNcm6aw_Iyzm0GIh'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmYXJ4Z3R3dmJocGV4dGF1anV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NTQ4MDYsImV4cCI6MjA4MjUzMDgwNn0.J5ExQzElaDoEOtSw5Dcwjkd9_lhX8GJgkwU99MEgNRQ'


// 存储 session - 启动时从本地存储中恢复
let currentSession: any = null
try {
    const storedSession = wx.getStorageSync('supabase_session')
    if (storedSession) {
        currentSession = JSON.parse(storedSession)
        console.log('[Supabase] Restored session from storage')
    }
} catch (e) {
    console.error('[Supabase] Failed to restore session:', e)
}

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
        // 如果是本地测试 token (local_token_)，不要发送给 Supabase，否则会报 JWT 格式错误
        if (currentSession?.access_token && currentSession.access_token.startsWith('eyJ')) {
            headers['Authorization'] = `Bearer ${currentSession.access_token}`
        } else if (SUPABASE_ANON_KEY.startsWith('eyJ') && !options.headers?.Authorization) {
            // 只有当 ANON_KEY 确实是 JWT 时才作为 Bearer token 自动添加
            // 否则（如使用 sb_publishable_ 格式），则只依赖 apikey 头，不发送 Authorization
            headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`
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

    // 邮箱注册
    signUp: async ({ email, password }: { email: string; password: string }) => {
        const result = await request<any>('/auth/v1/signup', {
            method: 'POST',
            body: { email, password }
        })

        if (result.error) {
            return { data: { user: null, session: null }, error: result.error }
        }

        // 注册成功后，Supabase 可能返回 session (如果不需要验证) 或不返回 (如果需要验证)
        if (result.data) {
            if (result.data.session) {
                currentSession = {
                    access_token: result.data.access_token,
                    refresh_token: result.data.refresh_token,
                    user: result.data.user
                }
                try {
                    wx.setStorageSync('supabase_session', JSON.stringify(currentSession))
                } catch (e) {
                    console.error('Save session failed:', e)
                }
            }
            return {
                data: { user: result.data.user, session: currentSession },
                error: null
            }
        }

        return { data: { user: null, session: null }, error: 'Unknown registration error' }
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
    },

    /**
     * 验证 OTP / Magic Link Token
     * 注意：使用 POST 方式直接验证，避免 Site URL 重定向问题
     */
    verifyOtp: async ({ token_hash, type }: { token_hash: string, type: 'magiclink' | 'recovery' | 'invite' }) => {
        const result = await request<any>(`/auth/v1/verify`, {
            method: 'POST',
            body: {
                token_hash,
                type
            }
        })

        if (result.error) return { data: { user: null, session: null }, error: result.error }

        if (result.data) {
            currentSession = {
                access_token: result.data.access_token,
                refresh_token: result.data.refresh_token,
                user: result.data.user
            }
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

    /**
     * 获取当前用户信息 (刷新 Token)
     */
    getUser: async (token?: string) => {
        const targetToken = token || currentSession?.access_token
        if (!targetToken) return { data: { user: null }, error: 'No token' }

        const result = await request<any>('/auth/v1/user', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${targetToken}` }
        })

        return result
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
        // ... (existing from logic)
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
    },

    /**
     * 调用 Supabase Edge Function
     */
    functions: {
        invoke: async <T = any>(functionName: string, { body, headers }: { body?: any, headers?: Record<string, string> } = {}) => {
            return request<T>(`/functions/v1/${functionName}`, {
                method: 'POST',
                body,
                headers
            })
        }
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
