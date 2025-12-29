"use client"

import { useState } from "react"
import { SummaryCards } from "@/components/dashboard/SummaryCards"
import { LogForm } from "@/components/dashboard/LogForm"
import { ActivityFeed } from "@/components/dashboard/ActivityFeed"
import { useLanguage } from "@/components/LanguageProvider"

export default function DashboardPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const { t } = useLanguage()

  const triggerRefresh = () => setRefreshKey(prev => prev + 1)

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <header className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight text-foreground/80">{t("dashboard.welcome")}</h2>
        <p className="text-muted-foreground">{t("dashboard.subtitle")}</p>
      </header>

      <SummaryCards refreshKey={refreshKey} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 sticky top-8">
          <LogForm onSuccess={triggerRefresh} />
        </div>

        <div className="lg:col-span-7">
          <ActivityFeed refreshKey={refreshKey} onUpdate={triggerRefresh} />
        </div>
      </div>
    </div>
  )
}
