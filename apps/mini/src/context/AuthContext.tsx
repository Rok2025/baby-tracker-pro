import { createContext, useContext, useState, useEffect, PropsWithChildren } from 'react'
import Taro from '@tarojs/taro'
import { supabase } from '../lib/supabase'

// 简化类型定义，避免依赖 @supabase/supabase-js
type User = { id: string;[key: string]: any } | null
type Session = { user: User;[key: string]: any } | null
// 微信绑定状态类型
type WechatBindingStatus = 'none' | 'independent' | 'shared'

interface AuthContextType {
    user: User | null
    session: Session | null
    loading: boolean
    babyConfig: { name: string | null; birthDate: string | null }
    wechatBindingStatus: WechatBindingStatus
    signInWithPassword: (email: string, password: string) => Promise<void>
    signInAnonymously: () => Promise<void>
    signInWithWechat: () => Promise<void>
    bindWechat: () => Promise<void>
    unbindWechat: () => Promise<void>
    linkAccount: (email: string, pass: string) => Promise<void>
    signOut: () => Promise<void>
    refreshBabyConfig: () => Promise<void>
    refreshBindingStatus: () => Promise<void>
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
    const [wechatBindingStatus, setWechatBindingStatus] = useState<WechatBindingStatus>('none')

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

    /**
     * 刷新微信绑定状态
     * - 'none': 用户没有微信绑定（邮箱登录）
     * - 'independent': 用户通过微信登录，使用自己的数据
     * - 'shared': 用户通过微信登录，加入了家庭共享
     */
    const refreshBindingStatus = async () => {
        if (!user) {
            setWechatBindingStatus('none')
            return
        }
        try {
            // 查询当前用户是否有微信绑定记录
            const { data } = await supabase
                .from('wechat_identities')
                .select('openid, user_id')
                .eq('user_id', user.id)

            // data 是数组，检查是否有记录
            if (!data || data.length === 0) {
                // 没有绑定记录
                setWechatBindingStatus('none')
            } else {
                // 有绑定记录，判断是独立还是共享
                // 如果用户的邮箱是虚拟邮箱（openid@wechat.com），说明是独立微信账号
                // 如果是真实邮箱，说明是通过微信加入了家庭
                const isWechatEmail = user.email?.endsWith('@wechat.com')
                if (isWechatEmail) {
                    setWechatBindingStatus('independent')
                } else {
                    setWechatBindingStatus('shared')
                }
            }
        } catch (e) {
            console.error('Refresh binding status error:', e)
            setWechatBindingStatus('none')
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
            refreshBindingStatus()
        } else {
            setBabyConfig({ name: null, birthDate: null })
            setWechatBindingStatus('none')
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

    // 微信一键登录
    const signInWithWechat = async () => {
        setLoading(true)
        try {
            const { code } = await Taro.login()
            console.log('[Auth] WeChat login code acquired')

            const { data, error } = await (supabase as any).functions.invoke('wechat-auth', {
                body: { action: 'login', code }
            })

            if (error) {
                throw error
            }

            // 使用返回的 hash 进行验证登录
            if (data && data.hash) {
                const verifyRes = await (supabase.auth as any).verifyOtp({
                    token_hash: data.hash,
                    type: 'magiclink'
                })

                if (verifyRes.error) throw verifyRes.error

                setSession(verifyRes.data.session)
                setUser(verifyRes.data.user)

                Taro.showToast({ title: '登录成功', icon: 'success' })
                setTimeout(() => Taro.switchTab({ url: '/pages/index/index' }), 500)
            }
        } catch (e) {
            console.error('WeChat sign in error:', e)
            Taro.showToast({ title: '登录失败: ' + (e.message || ''), icon: 'none' })
        } finally {
            setLoading(false)
        }
    }

    // 绑定当前微信
    const bindWechat = async () => {
        if (!user) return
        setLoading(true)
        try {
            const { code } = await Taro.login()
            const { error } = await (supabase as any).functions.invoke('wechat-auth', {
                body: { action: 'bind', code, nickName: '家人' }
            })

            if (error) throw error

            Taro.showToast({ title: '绑定成功', icon: 'success' })
        } catch (e) {
            console.error('Bind WeChat error:', e)
            Taro.showToast({ title: '绑定失败: ' + (e.message || ''), icon: 'none' })
        } finally {
            setLoading(false)
        }
    }

    // 解绑当前微信 (恢复为个人隔离模式)
    const unbindWechat = async () => {
        setLoading(true)
        try {
            const { code } = await Taro.login()
            const { error } = await (supabase as any).functions.invoke('wechat-auth', {
                body: { action: 'unbind', code }
            })

            if (error) throw error

            Taro.showToast({ title: '解绑成功', icon: 'success' })
            // 解绑后最好重新登录以刷新本地状态
            setTimeout(() => signOut(), 1500)
        } catch (e) {
            console.error('Unbind WeChat error:', e)
            Taro.showToast({ title: '解绑失败: ' + (e.message || ''), icon: 'none' })
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

    // 关联已有账号 (用于家人共享)
    const linkAccount = async (email: string, pass: string) => {
        setLoading(true)
        try {
            // 1. 验证目标账号 (登录)
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password: pass
            })

            if (authError) throw authError

            // 2. 调用绑定接口将当前微信关联到此账号
            const { code } = await Taro.login()
            const { error: bindError } = await (supabase as any).functions.invoke('wechat-auth', {
                body: { action: 'bind', code, nickName: '家人' },
                headers: {
                    Authorization: `Bearer ${authData.session?.access_token}`
                }
            })

            if (bindError) throw bindError

            // 3. 切换到该账号会话
            setSession(authData.session)
            setUser(authData.user)

            Taro.showToast({ title: '关联成功', icon: 'success' })
            setTimeout(() => Taro.switchTab({ url: '/pages/index/index' }), 500)
        } catch (e) {
            console.error('Link account error:', e)
            Taro.showToast({ title: '关联失败: ' + (e.message || ''), icon: 'none' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <AuthContext.Provider value={{
            user,
            session,
            loading,
            babyConfig,
            wechatBindingStatus,
            signInWithPassword,
            signInAnonymously,
            signInWithWechat,
            bindWechat,
            unbindWechat,
            linkAccount,
            signOut,
            refreshBabyConfig,
            refreshBindingStatus,
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
