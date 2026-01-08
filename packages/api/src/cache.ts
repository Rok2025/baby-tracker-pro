/**
 * 简单的客户端缓存实现
 * 用于缓存 Supabase 查询结果，减少重复请求
 */
class SimpleCache {
    private cache = new Map<string, { data: any; expiry: number }>()

    set(key: string, data: any, ttl: number) {
        this.cache.set(key, {
            data,
            expiry: Date.now() + ttl
        })
    }

    get(key: string) {
        const item = this.cache.get(key)
        if (!item) return null
        if (Date.now() > item.expiry) {
            this.cache.delete(key)
            return null
        }
        return item.data
    }

    has(key: string): boolean {
        return this.get(key) !== null
    }

    delete(key: string) {
        this.cache.delete(key)
    }

    clear() {
        this.cache.clear()
    }
}

export const cache = new SimpleCache()
