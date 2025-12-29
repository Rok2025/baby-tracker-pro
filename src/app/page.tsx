"use client"

import { useState, useEffect } from "react"
import { SummaryCards } from "@/components/dashboard/SummaryCards"
import { LogForm } from "@/components/dashboard/LogForm"
import { ActivityFeed } from "@/components/dashboard/ActivityFeed"
import { useLanguage } from "@/components/LanguageProvider"
import { supabase, Activity } from "@/lib/supabase"
import { toast } from "sonner"

export default function DashboardPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const { t } = useLanguage()

  const triggerRefresh = () => setRefreshKey(prev => prev + 1)

  useEffect(() => {
    async function fetchActivities() {
      setLoading(true)
      const now = new Date()
      const startOfDay = new Date(now)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(now)
      endOfDay.setHours(23, 59, 59, 999)

      const { data, error } = await supabase
        .from("activities")
        .select("*")
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
            const timeA = new Date(a.end_time || a.start_time).getTime()
            const timeB = new Date(b.end_time || b.start_time).getTime()
            if (timeB !== timeA) return timeB - timeA
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          })
        setActivities(processed)
      }
      setLoading(false)
    }

    fetchActivities()
  }, [refreshKey])

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <header className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight text-foreground/80">{t("dashboard.welcome")}</h2>
        <p className="text-muted-foreground">{t("dashboard.subtitle")}</p>
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
            loading={loading}
          />
        </div>
      </div>
    </div>
  )
}
