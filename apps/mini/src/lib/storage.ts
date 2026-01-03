import Taro from '@tarojs/taro'

/**
 * Taro 存储适配器 - 用于 Supabase Auth
 * 模拟 localStorage API，使用 Taro 的同步存储
 */
export const TaroStorageAdapter = {
    getItem: (key: string): string | null => {
        try {
            return Taro.getStorageSync(key) || null
        } catch (e) {
            console.warn('TaroStorage getItem error:', e)
            return null
        }
    },

    setItem: (key: string, value: string): void => {
        try {
            Taro.setStorageSync(key, value)
        } catch (e) {
            console.warn('TaroStorage setItem error:', e)
        }
    },

    removeItem: (key: string): void => {
        try {
            Taro.removeStorageSync(key)
        } catch (e) {
            console.warn('TaroStorage removeItem error:', e)
        }
    },
}
