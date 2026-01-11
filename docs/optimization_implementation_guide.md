# BabyTracker Pro 优化实施指南

> 生成日期：2026-01-07
> 基于项目版本：v1.3.0 (Web) / v1.0.0 (API)

---

## 📊 项目主要功能总结

### 核心功能
1. **喂养追踪** - 记录奶量、时间和备注
2. **睡眠追踪** - 记录睡眠时段，自动计算时长，支持跨日睡眠
3. **智能仪表盘** - 实时统计每日奶量和睡眠时长，目标达成可视化
4. **历史记录** - 日历导航，数据编辑和删除
5. **数据导出** - 日报表图片导出

### 技术亮点
- **Monorepo 架构** - 使用 Turborepo + pnpm 管理 Web、Mobile、小程序三端
- **共享逻辑层** - `@yoyo/api` 包统一封装 Supabase 业务逻辑
- **现代技术栈** - Next.js 16 + React 19 + TypeScript 5 + Tailwind CSS 4
- **跨设备同步** - Supabase 实现多设备实时同步
- **国际化支持** - 中英双语
- **主题系统** - 亮色/暗色模式 + OKLCH 色彩系统

---

## 🚀 优化建议

### 1. 架构层面

#### 1.1 引入状态管理库

**问题分析：**
当前 Web 端使用了 5 层嵌套的 Context Provider，可能导致：
- 不必要的重渲染
- Context 值变化时整个子树重新渲染
- 复杂的依赖关系

**解决方案：**

创建共享状态管理包：

```bash
# 安装依赖
pnpm add zustand --filter @yoyo/web
```

```typescript
// packages/shared-state/src/useConfigStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ConfigStore {
  fontSize: 'small' | 'medium' | 'large'
  bgOpacity: 'clear' | 'semi' | 'full'
  setFontSize: (size: ConfigStore['fontSize']) => void
  setBgOpacity: (opacity: ConfigStore['bgOpacity']) => void
}

export const useConfigStore = create<ConfigStore>()(
  persist(
    (set) => ({
      fontSize: 'medium',
      bgOpacity: 'semi',
      setFontSize: (size) => set({ fontSize: size }),
      setBgOpacity: (opacity) => set({ bgOpacity: opacity }),
    }),
    { name: 'user-config' }
  )
)
```

**优势：**
- 更精细的渲染控制
- 更好的 DevTools 支持
- 减少 Provider 嵌套层级

**实施路径：**
1. 创建 `packages/shared-state` 包
2. 迁移 `ConfigurationProvider` 到 Zustand
3. 逐步迁移其他 Context（可选）

---

#### 1.2 统一 i18n 方案

**问题分析：**
- Web 端使用嵌入式翻译
- Mobile 端使用 i18next
- 维护两套方案，翻译资源不统一

**解决方案：**

创建共享 i18n 包：

```typescript
// packages/i18n/src/index.ts
export const translations = {
  en: {
    'app.title': 'BabyTracker Pro',
    'dashboard.milk.title': 'Today\'s Milk',
    'dashboard.sleep.title': 'Today\'s Sleep',
    // ... 完整翻译资源
  },
  zh: {
    'app.title': '宝宝成长助手',
    'dashboard.milk.title': '今日奶量',
    'dashboard.sleep.title': '今日睡眠',
    // ... 完整翻译资源
  }
}

export const createI18n = (initialLang: 'en' | 'zh' = 'zh') => {
  let currentLang = initialLang

  return {
    t: (key: string, params?: Record<string, any>) => {
      let text = translations[currentLang][key] || key
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replace(`{{${k}}}`, v)
        })
      }
      return text
    },
    changeLanguage: (lang: 'en' | 'zh') => {
      currentLang = lang
    },
    currentLanguage: () => currentLang
  }
}
```

```typescript
// apps/web/src/lib/i18n.ts
import { createI18n, translations } from '@yoyo/i18n'

export const i18n = createI18n('zh')
export { translations }
```

**实施路径：**
1. 创建 `packages/i18n` 包
2. 将所有翻译资源迁移到统一位置
3. 更新 Web/Mobile/Mini 三端引用

### 1.3 部署环境与路由兼容性 (GitHub Pages)

**问题分析：**
在 GitHub Pages 等非根目录下部署时，路由行为可能与本地开发环境不一致：
- **尾部斜杠 (Trailing Slashes)**：`next.config.js` 配置了 `trailingSlash: true`，导致 `/login` 被重定向到 `/login/`。
- **Auth 拦截失效**：原有的 `AuthProvider` 仅监听了 `/login` 路径，导致在 `/login/` 下登录成功后无法正确刷新页面状态或跳转。

**解决方案：**
- **AuthProvider 兼容性**：在 `AuthProvider.tsx` 中同时匹配 `/login` 和 `/login/`。
- **Next.js 配置**：确保 `basePath` 和 `assetPrefix` 正确设置为项目子目录名称（如 `/baby-tracker-pro`）。

**优势：**
- 确保生产环境下登录、刷新、删除等操作的稳定性。
- 解决“登录后仍停留在登录页”和“删除弹出层消失”的环境相关 Bug。

---

### 2. 性能优化

#### 2.1 实现数据分页和虚拟滚动

**问题分析：**
`ActivityFeed` 组件加载所有当天活动，长期使用后可能影响性能

**解决方案：**

```bash
# 安装虚拟滚动库
pnpm add @tanstack/react-virtual --filter @yoyo/web
```

```typescript
// apps/web/src/components/dashboard/ActivityFeed.tsx
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

export function ActivityFeed({ activities }: { activities: Activity[] }) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: activities.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // 预估每项高度
    overscan: 5, // 预渲染5项
  })

  return (
    <div
      ref={parentRef}
      className="h-[600px] overflow-auto"
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const activity = activities[virtualItem.index]
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <ActivityItem activity={activity} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

**优势：**
- 只渲染可见区域的项目
- 支持数千条记录不卡顿
- 更好的滚动性能

---

#### 2.2 优化 Supabase 查询（已废弃/移除）

> [!WARNING]
> **状态：已于 2026-01-11 移除**
> **原因**：引入 5 分钟客户端缓存后，会导致多端（如网页端与小程序端）数据同步延迟。为了确保全家多设备记录的绝对实时性，已移除本地缓存逻辑，恢复为实时后端查询。

**原方案（仅作参考）：**


```typescript
// packages/api/src/cache.ts
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

  clear() {
    this.cache.clear()
  }
}

export const cache = new SimpleCache()
```

```typescript
// packages/api/src/supabase.ts
import { cache } from './cache'

export async function fetchActivitiesForDay(
  date: Date,
  options = { cache: true, limit: 100 }
) {
  const cacheKey = `activities_${date.toISOString()}`

  // 客户端缓存
  if (options.cache && cache.has(cacheKey)) {
    console.log('[Cache] Hit:', cacheKey)
    return { data: cache.get(cacheKey), error: null }
  }

  const supabase = getSupabase()
  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setHours(23, 59, 59, 999)

  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .gte('created_at', dayStart.toISOString())
    .lte('created_at', dayEnd.toISOString())
    .order('created_at', { ascending: false })
    .limit(options.limit) // 添加限制

  if (!error && data) {
    cache.set(cacheKey, data, 5 * 60 * 1000) // 5分钟缓存
  }

  return { data, error }
}

// 添加缓存失效方法
export function invalidateActivityCache(date: Date) {
  const cacheKey = `activities_${date.toISOString()}`
  cache.clear() // 或者只清除特定key
}
```

**使用示例：**

```typescript
// apps/web/src/components/dashboard/ActivityFeed.tsx
const handleAddActivity = async (activity: Activity) => {
  await createActivity(activity)
  invalidateActivityCache(currentDate) // 清除缓存
  await refetch() // 重新获取
}
```

---

#### 2.3 图片优化

**问题分析：**
Next.js 静态导出时无法使用 `next/image` 的优化功能

**解决方案 A：使用 Cloudflare Images（推荐）**

```typescript
// apps/web/src/components/OptimizedImage.tsx
interface OptimizedImageProps {
  src: string
  alt: string
  width: number
  height: number
}

export function OptimizedImage({ src, alt, width, height }: OptimizedImageProps) {
  // Cloudflare Images 格式: https://imagedelivery.net/{account_hash}/{id}/w={width}
  const optimizedSrc = src.startsWith('http')
    ? `${src}?width=${width}&quality=85`
    : src

  return (
    <img
      src={optimizedSrc}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
    />
  )
}
```

**解决方案 B：构建时优化**

```javascript
// scripts/optimize-images.js
const sharp = require('sharp')
const fs = require('fs/promises')
const path = require('path')

async function optimizeImages() {
  const publicDir = path.join(__dirname, '../apps/web/public')
  const files = await fs.readdir(publicDir)

  for (const file of files) {
    if (/\.(jpg|jpeg|png)$/i.test(file)) {
      const inputPath = path.join(publicDir, file)
      const outputPath = path.join(publicDir, 'optimized', file)

      await sharp(inputPath)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85, progressive: true })
        .png({ quality: 85, compressionLevel: 9 })
        .toFile(outputPath)

      console.log(`Optimized: ${file}`)
    }
  }
}

optimizeImages()
```

```json
// package.json
{
  "scripts": {
    "optimize:images": "node scripts/optimize-images.js",
    "build": "pnpm optimize:images && next build"
  },
  "devDependencies": {
    "sharp": "^0.33.0"
  }
}
```

---

### 3. 用户体验优化

#### 3.1 添加离线支持 (PWA)

**解决方案：**

```bash
# 安装 PWA 插件
pnpm add next-pwa --filter @yoyo/web
```

```typescript
// apps/web/next.config.ts
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-cache',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        }
      }
    }
  ]
})

const nextConfig = {
  output: 'export',
  basePath: process.env.NODE_ENV === 'production' ? '/yoyo' : '',
  images: {
    unoptimized: true,
  },
}

module.exports = withPWA(nextConfig)
```

```json
// apps/web/public/manifest.json
{
  "name": "BabyTracker Pro - 宝宝成长助手",
  "short_name": "BabyTracker",
  "description": "简洁优雅的宝宝活动追踪应用",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#4a9d9c",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["health", "lifestyle"],
  "shortcuts": [
    {
      "name": "记录喂奶",
      "short_name": "喂奶",
      "description": "快速记录喂奶",
      "url": "/?action=log-milk",
      "icons": [{ "src": "/icon-milk.png", "sizes": "96x96" }]
    },
    {
      "name": "记录睡眠",
      "short_name": "睡眠",
      "description": "快速记录睡眠",
      "url": "/?action=log-sleep",
      "icons": [{ "src": "/icon-sleep.png", "sizes": "96x96" }]
    }
  ]
}
```

```html
<!-- apps/web/src/app/layout.tsx -->
<head>
  <link rel="manifest" href="/manifest.json" />
  <meta name="theme-color" content="#4a9d9c" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="BabyTracker" />
  <link rel="apple-touch-icon" href="/icon-192.png" />
</head>
```

**优势：**
- 离线记录，联网后同步
- 可添加到主屏幕
- 更快的加载速度
- 原生应用体验

---

#### 3.2 智能提醒系统

**解决方案：**

```typescript
// packages/api/src/reminders.ts
import type { Activity } from './types'

export interface ReminderConfig {
  feedingInterval: number // 毫秒
  sleepInterval: number
  enabled: boolean
}

export function calculateNextFeedingTime(
  lastFeeding: Activity,
  config: ReminderConfig
): Date {
  const lastTime = new Date(lastFeeding.created_at).getTime()
  return new Date(lastTime + config.feedingInterval)
}

export function shouldShowFeedingReminder(
  lastFeeding: Activity | null,
  config: ReminderConfig
): boolean {
  if (!config.enabled || !lastFeeding) return false

  const nextTime = calculateNextFeedingTime(lastFeeding, config)
  return Date.now() >= nextTime.getTime()
}

// Web 端通知
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false

  if (Notification.permission === 'granted') return true

  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

export async function scheduleNotification(
  title: string,
  body: string,
  delay: number
) {
  const hasPermission = await requestNotificationPermission()
  if (!hasPermission) return

  setTimeout(() => {
    new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      tag: 'feeding-reminder',
      requireInteraction: false,
    })
  }, delay)
}
```

```typescript
// apps/web/src/components/dashboard/ReminderSystem.tsx
'use client'

import { useEffect } from 'react'
import { useActivities } from '@/hooks/useActivities'
import {
  shouldShowFeedingReminder,
  scheduleNotification
} from '@yoyo/api/reminders'

export function ReminderSystem() {
  const { activities } = useActivities()

  useEffect(() => {
    const config = {
      feedingInterval: 3 * 60 * 60 * 1000, // 3小时
      sleepInterval: 2 * 60 * 60 * 1000,   // 2小时
      enabled: true
    }

    const lastFeeding = activities.find(a => a.type === 'milk')

    if (shouldShowFeedingReminder(lastFeeding, config)) {
      scheduleNotification(
        '喂奶提醒',
        '距离上次喂奶已经3小时了，该喂奶啦！',
        0
      )
    }

    // 定时检查
    const interval = setInterval(() => {
      // 检查逻辑
    }, 60 * 1000) // 每分钟检查一次

    return () => clearInterval(interval)
  }, [activities])

  return null // 无UI组件
}
```

---

#### 3.3 添加数据可视化

**解决方案：**

```bash
# 已经安装了 recharts，直接使用
```

```typescript
// apps/web/src/components/dashboard/WeeklyTrends.tsx
'use client'

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { Activity } from '@yoyo/api'

interface WeeklyTrendsProps {
  activities: Activity[]
}

export function WeeklyTrends({ activities }: WeeklyTrendsProps) {
  const weekData = useMemo(() => {
    // 按日期分组
    const dailyStats = new Map<string, { milk: number; sleep: number }>()

    activities.forEach(act => {
      const date = new Date(act.created_at).toLocaleDateString()
      const stats = dailyStats.get(date) || { milk: 0, sleep: 0 }

      if (act.type === 'milk' && act.volume) {
        stats.milk += act.volume
      } else if (act.type === 'sleep' && act.end_time) {
        const duration = new Date(act.end_time).getTime() -
                        new Date(act.start_time).getTime()
        stats.sleep += duration / (1000 * 60 * 60) // 转换为小时
      }

      dailyStats.set(date, stats)
    })

    // 转换为图表数据
    return Array.from(dailyStats.entries())
      .map(([date, stats]) => ({
        date: new Date(date).toLocaleDateString('zh-CN', {
          month: 'short',
          day: 'numeric'
        }),
        奶量: stats.milk,
        睡眠: stats.sleep.toFixed(1),
      }))
      .slice(-7) // 最近7天
  }, [activities])

  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="text-lg font-semibold mb-4">7日趋势</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={weekData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="奶量"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 4 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="睡眠"
            stroke="hsl(var(--secondary))"
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

---

### 4. 代码质量优化

#### 4.1 添加单元测试

**解决方案：**

```bash
# 安装测试依赖
pnpm add -D vitest @testing-library/react @testing-library/jest-dom \
  @vitejs/plugin-react jsdom --filter @yoyo/web
```

```typescript
// apps/web/vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.config.*',
        '**/*.d.ts',
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

```typescript
// apps/web/vitest.setup.ts
import '@testing-library/jest-dom'
```

```typescript
// apps/web/__tests__/lib/utils.test.ts
import { describe, it, expect } from 'vitest'

// 假设你有这个工具函数
function calculateBabyAge(birthDate: Date, currentDate: Date = new Date()) {
  const birth = new Date(birthDate)
  const today = new Date(currentDate)

  let months = (today.getFullYear() - birth.getFullYear()) * 12
  months += today.getMonth() - birth.getMonth()

  let days = today.getDate() - birth.getDate()
  if (days < 0) {
    months--
    const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0)
    days += lastMonth.getDate()
  }

  return { months, days }
}

describe('calculateBabyAge', () => {
  it('should calculate age correctly for same year', () => {
    const birthDate = new Date('2024-01-01')
    const currentDate = new Date('2024-06-15')
    const age = calculateBabyAge(birthDate, currentDate)
    expect(age).toEqual({ months: 5, days: 14 })
  })

  it('should calculate age correctly across years', () => {
    const birthDate = new Date('2023-11-15')
    const currentDate = new Date('2024-01-20')
    const age = calculateBabyAge(birthDate, currentDate)
    expect(age).toEqual({ months: 2, days: 5 })
  })

  it('should handle edge case of same day different month', () => {
    const birthDate = new Date('2024-01-31')
    const currentDate = new Date('2024-03-31')
    const age = calculateBabyAge(birthDate, currentDate)
    expect(age).toEqual({ months: 2, days: 0 })
  })
})
```

```typescript
// apps/web/__tests__/components/SummaryCards.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SummaryCards } from '@/components/dashboard/SummaryCards'

describe('SummaryCards', () => {
  it('should show green card when milk goal is met', () => {
    const data = {
      totalVolume: 800,
      totalSleep: 12,
      activities: []
    }
    const standards = { milk: 700, sleep: 12 }

    render(<SummaryCards data={data} standards={standards} />)

    const milkCard = screen.getByText(/今日奶量/i).closest('div')
    expect(milkCard).toHaveClass('bg-primary/10')
  })

  it('should show red card when milk goal is not met', () => {
    const data = {
      totalVolume: 500,
      totalSleep: 10,
      activities: []
    }
    const standards = { milk: 700, sleep: 12 }

    render(<SummaryCards data={data} standards={standards} />)

    const milkCard = screen.getByText(/今日奶量/i).closest('div')
    expect(milkCard).toHaveClass('bg-destructive/10')
  })
})
```

```json
// package.json
{
  "scripts": {
    "test": "turbo run test",
    "test:watch": "turbo run test -- --watch",
    "test:coverage": "turbo run test -- --coverage"
  }
}
```

```json
// turbo.json
{
  "tasks": {
    "test": {
      "cache": false,
      "dependsOn": ["^build"]
    }
  }
}
```

---

#### 4.2 添加 E2E 测试

**解决方案：**

```bash
# 安装 Playwright
pnpm add -D @playwright/test --filter @yoyo/web
```

```typescript
// apps/web/playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

```typescript
// apps/web/e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('user can login', async ({ page }) => {
    await page.goto('/')

    // 应该重定向到登录页
    await expect(page).toHaveURL(/.*login/)

    // 填写登录表单
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'testpassword123')
    await page.click('button[type="submit"]')

    // 登录成功后应该看到仪表盘
    await expect(page).toHaveURL('/')
    await expect(page.locator('h1')).toContainText('宝宝成长助手')
  })
})
```

```typescript
// apps/web/e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // 假设已登录
    await page.goto('/')
  })

  test('user can log feeding activity', async ({ page }) => {
    // 点击"记录喂奶"按钮
    await page.click('[aria-label="Log feeding"]')

    // 填写表单
    await page.fill('[name="volume"]', '120')
    await page.fill('[name="notes"]', 'Good feeding session')
    await page.click('button:has-text("保存")')

    // 验证活动已添加
    await expect(page.locator('.activity-item').first())
      .toContainText('120 ml')
  })

  test('summary cards show correct data', async ({ page }) => {
    // 验证奶量卡片
    const milkCard = page.locator('text=今日奶量').locator('..')
    await expect(milkCard).toBeVisible()

    // 验证睡眠卡片
    const sleepCard = page.locator('text=今日睡眠').locator('..')
    await expect(sleepCard).toBeVisible()
  })

  test('user can switch dates', async ({ page }) => {
    // 点击日期选择器
    await page.click('[aria-label="Select date"]')

    // 选择昨天
    await page.click('button:has-text("昨天")')

    // 验证数据已更新
    await expect(page.locator('.activity-feed')).toBeVisible()
  })
})
```

---

#### 4.3 类型安全增强

**解决方案：**

```bash
pnpm add zod --filter @yoyo/api
```

```typescript
// packages/api/src/schemas.ts
import { z } from 'zod'

// Activity 验证模式
export const ActivitySchema = z.object({
  id: z.string().uuid().optional(),
  type: z.enum(['milk', 'sleep', 'other']),
  volume: z.number()
    .min(0, '奶量不能为负数')
    .max(500, '奶量不能超过500ml')
    .optional(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime().optional(),
  notes: z.string().max(500, '备注不能超过500字').optional(),
  created_at: z.string().datetime().optional(),
  user_id: z.string().uuid().optional(),
})

export type Activity = z.infer<typeof ActivitySchema>

// 创建活动的输入模式（排除自动生成的字段）
export const CreateActivitySchema = ActivitySchema.omit({
  id: true,
  created_at: true,
  user_id: true,
})

export type CreateActivityInput = z.infer<typeof CreateActivitySchema>

// UserConfig 验证模式
export const UserConfigSchema = z.object({
  id: z.string().uuid().optional(),
  baby_name: z.string().min(1, '请输入宝宝姓名').max(50),
  baby_birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式错误'),
  milk_standard: z.number().min(0).max(2000),
  sleep_standard: z.number().min(0).max(24),
  language: z.enum(['zh', 'en']),
  user_id: z.string().uuid().optional(),
})

export type UserConfig = z.infer<typeof UserConfigSchema>
```

```typescript
// packages/api/src/supabase.ts
import { ActivitySchema, CreateActivitySchema } from './schemas'
import type { Activity, CreateActivityInput } from './schemas'

export async function createActivity(input: CreateActivityInput) {
  // 运行时验证
  const validated = CreateActivitySchema.parse(input)

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('activities')
    .insert([validated])
    .select()
    .single()

  if (error) throw error

  // 验证返回数据
  return ActivitySchema.parse(data)
}

export async function updateActivity(id: string, input: Partial<CreateActivityInput>) {
  const validated = CreateActivitySchema.partial().parse(input)

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('activities')
    .update(validated)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return ActivitySchema.parse(data)
}
```

```typescript
// apps/web/src/components/dashboard/LogForm.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateActivitySchema } from '@yoyo/api/schemas'

export function LogForm() {
  const form = useForm({
    resolver: zodResolver(CreateActivitySchema),
    defaultValues: {
      type: 'milk',
      volume: 0,
      start_time: new Date().toISOString(),
      notes: '',
    }
  })

  const onSubmit = async (data) => {
    try {
      await createActivity(data) // 自动类型检查
    } catch (error) {
      if (error instanceof z.ZodError) {
        // 显示验证错误
        console.error(error.errors)
      }
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* 表单字段 */}
    </form>
  )
}
```

---

### 5. 安全性优化

#### 5.1 环境变量管理

**解决方案：**

```bash
# .env.example
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# 服务端专用（不要以 NEXT_PUBLIC_ 开头）
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# 可选：Sentry、分析等
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_GA_ID=
```

```bash
# .gitignore (确保已添加)
.env*.local
.env.local
.env.development.local
.env.production.local
```

```typescript
// packages/api/src/env.ts
import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Supabase URL 格式错误'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase Anon Key 不能为空'),
})

function validateEnv() {
  try {
    return envSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    })
  } catch (error) {
    console.error('❌ 环境变量验证失败:')
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`)
      })
    }
    throw new Error('环境变量配置错误')
  }
}

export const env = validateEnv()
```

```typescript
// packages/api/src/supabase.ts
import { env } from './env'

export function initSupabase(supabase: any) {
  _supabase = supabase
}

export function getSupabase() {
  if (!_supabase) {
    throw new Error('Supabase 未初始化')
  }
  return _supabase
}

// Web 端初始化
// apps/web/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import { initSupabase, env } from '@yoyo/api'

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

initSupabase(supabase)
```

---

#### 5.2 添加速率限制

**解决方案（需要额外服务，可选）：**

```bash
# 使用 Upstash Redis (免费层)
pnpm add @upstash/ratelimit @upstash/redis --filter @yoyo/web
```

```typescript
// apps/web/src/middleware.ts (Next.js 13+ App Router)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
})

export async function middleware(request: NextRequest) {
  // 只对 API 路由限流
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.ip ?? '127.0.0.1'
    const { success, limit, remaining, reset } = await ratelimit.limit(ip)

    if (!success) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        },
      })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
```

**简化方案（无需外部服务）：**

```typescript
// apps/web/src/lib/ratelimit.ts
class SimpleRateLimiter {
  private requests = new Map<string, number[]>()

  isAllowed(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now()
    const timestamps = this.requests.get(key) || []

    // 清除过期记录
    const validTimestamps = timestamps.filter(t => now - t < windowMs)

    if (validTimestamps.length >= limit) {
      return false
    }

    validTimestamps.push(now)
    this.requests.set(key, validTimestamps)

    return true
  }

  clear() {
    this.requests.clear()
  }
}

export const rateLimiter = new SimpleRateLimiter()

// 使用示例
import { rateLimiter } from '@/lib/ratelimit'

export async function createActivity(data: Activity) {
  const userId = getCurrentUserId()

  if (!rateLimiter.isAllowed(userId, 20, 60000)) {
    throw new Error('操作过于频繁，请稍后再试')
  }

  // 正常创建逻辑
}
```

---

### 6. 部署与运维优化

#### 6.1 添加监控和错误追踪

**解决方案：**

```bash
# 安装 Sentry
pnpm add @sentry/nextjs --filter @yoyo/web
```

```typescript
// apps/web/sentry.client.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // 性能监控
  tracesSampleRate: 0.1, // 10% 的请求

  // 会话重放
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // 忽略特定错误
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
  ],

  beforeSend(event, hint) {
    // 过滤敏感信息
    if (event.request) {
      delete event.request.cookies
    }
    return event
  },
})
```

```typescript
// apps/web/src/lib/monitoring.ts
import * as Sentry from '@sentry/nextjs'

export function logError(
  error: Error,
  context?: Record<string, any>
) {
  console.error('[Error]', error, context)

  Sentry.captureException(error, {
    extra: context,
    tags: {
      component: context?.component,
      action: context?.action,
    }
  })
}

export function logWarning(message: string, data?: any) {
  console.warn('[Warning]', message, data)

  Sentry.captureMessage(message, {
    level: 'warning',
    extra: data,
  })
}

// 使用示例
try {
  await createActivity(data)
} catch (error) {
  logError(error as Error, {
    component: 'LogForm',
    action: 'create_activity',
    userId: user.id
  })
  toast.error('创建失败，请重试')
}
```

---

#### 6.2 性能监控

**解决方案：**

```bash
# Vercel Analytics (如果部署在 Vercel)
pnpm add @vercel/analytics @vercel/speed-insights --filter @yoyo/web
```

```typescript
// apps/web/src/app/layout.tsx
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({ children }) {
  return (
    <html lang="zh">
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
```

**自定义性能监控：**

```typescript
// apps/web/src/lib/performance.ts
export function measurePerformance(name: string) {
  const startTime = performance.now()

  return {
    end: () => {
      const duration = performance.now() - startTime
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`)

      // 发送到分析服务
      if (window.gtag) {
        window.gtag('event', 'timing_complete', {
          name,
          value: Math.round(duration),
          event_category: 'Performance'
        })
      }
    }
  }
}

// 使用示例
const perf = measurePerformance('fetch_activities')
const activities = await fetchActivitiesForDay(date)
perf.end()
```

---

### 7. 移动端特定优化

#### 7.1 添加原生模块集成

**解决方案：**

```bash
# 安装通知模块
pnpm add expo-notifications --filter @yoyo/mobile
```

```typescript
// apps/mobile/src/lib/notifications.ts
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

// 配置通知处理
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export async function registerForPushNotifications() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4a9d9c',
    })
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    alert('需要通知权限才能使用提醒功能')
    return null
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data
  console.log('Push token:', token)
  return token
}

export async function scheduleFeedingReminder(delay: number) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '喂奶提醒 🍼',
      body: '距离上次喂奶已经3小时了',
      data: { type: 'feeding' },
      sound: true,
    },
    trigger: {
      seconds: delay,
    },
  })
}

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync()
}
```

```typescript
// apps/mobile/src/screens/Dashboard.tsx
import { useEffect } from 'react'
import { registerForPushNotifications, scheduleFeedingReminder } from '@/lib/notifications'

export function Dashboard() {
  useEffect(() => {
    registerForPushNotifications()
  }, [])

  const handleLogFeeding = async (data) => {
    await createActivity(data)

    // 3小时后提醒
    await scheduleFeedingReminder(3 * 60 * 60)
  }

  // ...
}
```

---

#### 7.2 添加 Widget 支持（iOS）

**解决方案：**

```bash
# 需要自定义开发配置
pnpm add react-native-widget-extension --filter @yoyo/mobile
```

```json
// apps/mobile/app.json
{
  "expo": {
    "plugins": [
      [
        "expo-build-properties",
        {
          "ios": {
            "deploymentTarget": "14.0"
          }
        }
      ]
    ]
  }
}
```

注：Widget 开发需要原生代码，建议使用 Expo EAS Build 或 bare workflow。

---

## 📈 实施优先级建议

### 🔴 高优先级（立即实施）

1. **添加单元测试** (4.1)
   - 保证代码质量
   - 预防回归问题
   - 时间：2-3天

2. **环境变量管理** (5.1)
   - 提升安全性
   - 规范配置管理
   - 时间：0.5天

3. **数据缓存优化** (2.2)
   - 立即提升性能
   - 减少 Supabase 请求
   - 时间：1天

4. **类型安全增强** (4.3)
   - 运行时类型验证
   - 减少 bug
   - 时间：1-2天

**总时间：约 1 周**

---

### 🟡 中优先级（1-2个月内）

5. **PWA 离线支持** (3.1)
   - 大幅提升用户体验
   - 支持离线使用
   - 时间：2-3天

6. **状态管理优化** (1.1)
   - 重构 Context 层级
   - 提升性能
   - 时间：3-4天

7. **数据可视化** (3.3)
   - 增强功能性
   - 提供趋势分析
   - 时间：2天

8. **E2E 测试** (4.2)
   - 保证功能完整性
   - 自动化测试
   - 时间：3-4天

9. **错误监控** (6.1)
   - 运维优化
   - 快速定位问题
   - 时间：1天

**总时间：约 2-3 周**

---

### 🟢 低优先级（长期规划）

10. **智能提醒** (3.2)
    - 增强用户粘性
    - 时间：2-3天

11. **虚拟滚动** (2.1)
    - 极端场景优化
    - 时间：1-2天

12. **原生通知** (7.1)
    - 移动端体验提升
    - 时间：2天

13. **图片优化** (2.3)
    - 性能优化
    - 时间：1天

14. **性能监控** (6.2)
    - 运维优化
    - 时间：1天

15. **统一 i18n** (1.2)
    - 长期维护性
    - 时间：2-3天

**总时间：约 2 周**

---

## 🎯 实施路线图

### 第一阶段：稳定性提升（1-2周）
- ✅ 环境变量管理
- ✅ 类型安全增强
- ✅ 数据缓存优化
- ✅ 添加单元测试

**目标：** 提升代码质量和稳定性

---

### 第二阶段：用户体验优化（2-4周）
- ✅ PWA 离线支持
- ✅ 数据可视化
- ✅ 错误监控
- ✅ 状态管理优化

**目标：** 提升用户体验和可维护性

---

### 第三阶段：功能增强（1-2个月）
- ✅ 智能提醒
- ✅ 虚拟滚动
- ✅ E2E 测试
- ✅ 性能监控

**目标：** 增强功能和性能

---

### 第四阶段：长期优化（持续）
- ✅ 统一 i18n
- ✅ 图片优化
- ✅ 移动端原生功能
- ✅ 持续重构

**目标：** 持续改进和创新

---

## 💡 总结

### 项目优势
- ✅ 扎实的技术基础（Next.js 16 + React 19）
- ✅ 清晰的 Monorepo 架构
- ✅ 良好的代码组织
- ✅ 完善的文档

### 优化重点
1. **性能** - 缓存、分页、懒加载
2. **体验** - PWA、离线、提醒
3. **质量** - 测试、类型安全
4. **维护** - 统一状态、减少重复

### 建议原则
- ⚠️ 避免过度工程化
- ⚠️ 保持简洁性和易用性
- ⚠️ 循序渐进地实施
- ⚠️ 根据实际需求调整优先级

---

## 📚 参考资料

- [Next.js 文档](https://nextjs.org/docs)
- [Supabase 文档](https://supabase.com/docs)
- [Vitest 文档](https://vitest.dev)
- [Playwright 文档](https://playwright.dev)
- [Zod 文档](https://zod.dev)
- [PWA 最佳实践](https://web.dev/progressive-web-apps/)
- [Turborepo 文档](https://turbo.build/repo/docs)

---

**最后更新：** 2026-01-07
**文档版本：** 1.0.0
