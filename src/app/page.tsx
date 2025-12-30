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
      setDataLoading(true)
      const now = new Date()
      const startOfDay = new Date(now)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(now)
      endOfDay.setHours(23, 59, 59, 999)

      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("user_id", user.id)
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

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <header className="flex items-center gap-4">
        <div className="p-3 bg-primary/20 rounded-2xl">
          <LayoutDashboard className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("dashboard.welcome")}</h2>
          <p className="text-muted-foreground">{t("dashboard.subtitle")}</p>
        </div>
      </header>

      <SummaryCards refreshKey={refreshKey} activities={activities} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 sticky top-8">
          <LogForm onSuccess={triggerRefresh} />
        </div>

        <div className="lg:col-span-7">
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
