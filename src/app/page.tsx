"use client"

import { useState, useEffect } from "react"
import { SummaryCards } from "@/components/dashboard/SummaryCards"
import { LogForm } from "@/components/dashboard/LogForm"
import { ActivityFeed } from "@/components/dashboard/ActivityFeed"
import { useLanguage } from "@/components/LanguageProvider"
import { useAuth } from "@/components/AuthProvider"
import { supabase, Activity } from "@/lib/supabase"
import { toast } from "sonner"
import { LayoutDashboard, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [activities, setActivities] = useState<Activity[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [babyBirthDate, setBabyBirthDate] = useState<string | null>(null)
  const [babyName, setBabyName] = useState<string | null>(null)
  const { t } = useLanguage()
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const triggerRefresh = () => setRefreshKey(prev => prev + 1)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user) return

    async function fetchActivities() {
      // Only show loading state on initial load to prevent flickering during refreshes
      if (activities.length === 0) {
        setDataLoading(true)
      }
      const now = new Date()
      const startOfDay = new Date(now)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(now)
      endOfDay.setHours(23, 59, 59, 999)

      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("user_id", user?.id)
        .lte("start_time", endOfDay.toISOString())
        .or(`end_time.gte.${startOfDay.toISOString()},end_time.is.null`)

      if (error) {
        toast.error("Failed to load today's activities")
      } else {
        const processed = (data || [])
          .filter(act => {
            const actStart = new Date(act.start_time).getTime()
            const actEnd = act.end_time ? new Date(act.end_time).getTime() : actStart
            return actStart <= endOfDay.getTime() && actEnd >= startOfDay.getTime()
          })
          .sort((a, b) => {
            const getSortTime = (act: Activity) => {
              const start = new Date(act.start_time).getTime()
              // 如果是昨晚开始的睡眠，使用结束时间排序；否则使用开始时间排序
              if (act.type === 'sleep' && start < startOfDay.getTime() && act.end_time) {
                return new Date(act.end_time).getTime()
              }
              return start
            }
            const timeA = getSortTime(a)
            const timeB = getSortTime(b)
            if (timeB !== timeA) return timeB - timeA
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          })
        setActivities(processed)
      }
      setDataLoading(false)
    }

    fetchActivities()
  }, [refreshKey, user])

  // 获取宝宝配置（名字和出生日期）
  useEffect(() => {
    if (!user) return
    async function fetchBabyConfig() {
      const { data } = await supabase
        .from("user_config")
        .select("key, value")
        .eq("user_id", user?.id)
        .in("key", ["baby_birth_date", "baby_name"])
      if (data) {
        data.forEach(item => {
          if (item.key === "baby_birth_date") setBabyBirthDate(item.value)
          if (item.key === "baby_name") setBabyName(item.value)
        })
      }
    }
    fetchBabyConfig()
  }, [user])

  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const formatTime = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${hours}:${minutes}:${seconds}`
  }

  const calculateBabyAge = () => {
    if (!babyBirthDate) return null
    const birth = new Date(babyBirthDate)
    const today = new Date()
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

  const babyAge = calculateBabyAge()

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-4">
      <header className="flex items-center justify-between gap-4">
        {babyAge !== null ? (
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/20 rounded-xl">
              <LayoutDashboard className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{babyAge.months}<span className="text-base font-medium">个月</span>{babyAge.days}<span className="text-base font-medium">天</span></p>
              <p className="text-xs text-muted-foreground">
                {babyName ? (
                  <><span className="text-primary font-semibold">{babyName}</span> 已出生</>
                ) : (
                  '宝宝已出生'
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-2.5 bg-primary/20 rounded-xl">
            <LayoutDashboard className="w-6 h-6 text-primary" />
          </div>
        )}
        <div className="text-right mr-5">
          <p className="text-xl font-semibold tracking-tight tabular-nums text-foreground">{formatDate(currentTime)}</p>
          <p className="text-sm tabular-nums text-muted-foreground">{formatTime(currentTime)}</p>
        </div>
      </header>

      <SummaryCards refreshKey={refreshKey} activities={activities} user={user} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-5 flex">
          <LogForm onSuccess={triggerRefresh} />
        </div>

        <div className="lg:col-span-7 flex">
          <ActivityFeed
            refreshKey={refreshKey}
            onUpdate={triggerRefresh}
            activities={activities}
            loading={dataLoading}
            maxHeight="350px"
          />
        </div>
      </div>
    </div>
  )
}
