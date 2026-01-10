import { createContext, useContext, useState, useEffect, PropsWithChildren } from 'react'
import Taro from '@tarojs/taro'
import { supabase } from '../lib/supabase'

// 简化类型定义，避免依赖 @supabase/supabase-js
type User = { id: string;[key: string]: any } | null
type Session = { user: User;[key: string]: any } | null
interface AuthContextType {
    user: User | null
    session: Session | null
    loading: boolean
    babyConfig: { name: string | null; birthDate: string | null }
    signInWithPassword: (email: string, password: string) => Promise<void>
    signInAnonymously: () => Promise<void>
    signOut: () => Promise<void>
    refreshBabyConfig: () => Promise<void>
    calculateBabyAge: (date?: Date) => { months: number; days: number } | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: PropsWithChildren) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)
    const [babyConfig, setBabyConfig] = useState<{ name: string | null; birthDate: string | null }>({
        name: null,
        birthDate: null
    })

    const refreshBabyConfig = async () => {
        if (!user) return
        try {
            const { data } = await supabase
                .from('user_config')
                .select('key, value')
                .eq('user_id', user.id)
                .in('key', ['baby_name', 'baby_birth_date'])

            if (data && Array.isArray(data)) {
                let name = null
                let birthDate = null
                data.forEach((item: any) => {
                    if (item.key === 'baby_name') name = item.value
                    if (item.key === 'baby_birth_date') birthDate = item.value
                })
                setBabyConfig({ name, birthDate })
            }
        } catch (e) {
            console.error('Refresh baby config error:', e)
        }
    }

    const calculateBabyAge = (targetDate: Date = new Date()) => {
        if (!babyConfig.birthDate) return null
        const birth = new Date(babyConfig.birthDate)
        const today = new Date(targetDate)
        today.setHours(0, 0, 0, 0)
        birth.setHours(0, 0, 0, 0)

        let months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth())
        let days = today.getDate() - birth.getDate()

        if (days < 0) {
            months--
            const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0)
            days += lastMonth.getDate()
        }

        return { months, days }
    }

    useEffect(() => {
        // 获取初始会话
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setUser(session?.user ?? null)
            setLoading(false)
        })

        // 监听认证状态变化
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session)
                setUser(session?.user ?? null)
            }
        )

        return () => subscription.unsubscribe()
    }, [])

    useEffect(() => {
        if (user) {
            refreshBabyConfig()
        } else {
            setBabyConfig({ name: null, birthDate: null })
        }
    }, [user])

    // 邮箱密码登录
    const signInWithPassword = async (email: string, password: string) => {
        setLoading(true)
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password })

            if (error) {
                console.error('Sign in error:', error)
                Taro.showToast({
                    title: error.message || '登录失败',
                    icon: 'none',
                })
                return
            }

            console.log('Signed in:', data.user?.id)

            // 更新状态
            setSession(data.session)
            setUser(data.user)

            Taro.showToast({
                title: '登录成功',
                icon: 'success',
            })

            // 跳转到首页
            setTimeout(() => {
                Taro.switchTab({ url: '/pages/index/index' })
            }, 500)
        } catch (e) {
            console.error('Sign in error:', e)
            Taro.showToast({
                title: '登录失败',
                icon: 'error',
            })
        } finally {
            setLoading(false)
        }
    }

    // 游客登录（本地模式）
    const signInAnonymously = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase.auth.signInAnonymously()

            if (error) {
                console.error('Anonymous sign in error:', error)
                Taro.showToast({
                    title: '登录失败',
                    icon: 'error',
                })
                return
            }

            console.log('Guest mode:', data.user?.id)

            setSession(data.session)
            setUser(data.user)

            Taro.showToast({
                title: '游客模式',
                icon: 'success',
            })

            setTimeout(() => {
                Taro.switchTab({ url: '/pages/index/index' })
            }, 500)
        } catch (e) {
            console.error('Sign in error:', e)
            Taro.showToast({
                title: '登录失败',
                icon: 'error',
            })
        } finally {
            setLoading(false)
        }
    }

    const signOut = async () => {
        await supabase.auth.signOut()
        setSession(null)
        setUser(null)
        Taro.reLaunch({ url: '/pages/login/index' })
    }

    return (
        <AuthContext.Provider value={{
            user,
            session,
            loading,
            babyConfig,
            signInWithPassword,
            signInAnonymously,
            signOut,
            refreshBabyConfig,
            calculateBabyAge
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
