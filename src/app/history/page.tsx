"use client"

import { useState, useEffect } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ActivityFeed } from "@/components/dashboard/ActivityFeed"
import { SummaryCards } from "@/components/dashboard/SummaryCards"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/LanguageProvider"
import { useAuth } from "@/components/AuthProvider"
import { supabase, Activity } from "@/lib/supabase"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function HistoryPage() {
    const [date, setDate] = useState<Date>(new Date())
    const [refreshKey, setRefreshKey] = useState(0)
    const [activities, setActivities] = useState<Activity[]>([])
    const [dataLoading, setDataLoading] = useState(true)
    const { t, language } = useLanguage()
    const { user, loading: authLoading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login")
        }
    }, [user, authLoading, router])

    useEffect(() => {
        if (!user) return

        async function fetchActivities() {
            // Only show loading state on initial load or date change to prevent flickering during refreshes
            if (activities.length === 0) {
                setDataLoading(true)
            }
            const startOfDay = new Date(date)
            startOfDay.setHours(0, 0, 0, 0)
            const endOfDay = new Date(date)
            endOfDay.setHours(23, 59, 59, 999)

            const startStr = startOfDay.toISOString()
            const endStr = endOfDay.toISOString()

            // Faster query using simple overlap logic:
            // 1. Started today and before end of today
            // 2. OR started before today but ended today (or still ongoing)
            const { data, error } = await supabase
                .from("activities")
                .select("*")
                .eq("user_id", user?.id)
                .lte("start_time", endStr)
                .or(`end_time.gte.${startStr},end_time.is.null`)

            if (error) {
                console.error("Fetch error:", error)
                toast.error("Failed to load historical data")
            } else {
                // Post-process: final sort and precision filter
                const processed = (data || [])
                    .filter(act => {
                        const actStart = new Date(act.start_time).getTime()
                        const actEnd = act.end_time ? new Date(act.end_time).getTime() : actStart
                        return actStart <= endOfDay.getTime() && actEnd >= startOfDay.getTime()
                    })
                    .sort((a, b) => {
                        const getSortTime = (act: Activity) => {
                            const start = new Date(act.start_time).getTime()
                            // 如果是跨日睡眠（开始于所选日期之前），使用结束时间排序；否则使用开始时间排序
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
    }, [date, refreshKey, user])

    if (authLoading || (!user && !authLoading)) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-4">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{t("history.title")}</h2>
                    <p className="text-sm text-muted-foreground">{t("history.subtitle")}</p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 rounded-xl border-muted bg-card/60 backdrop-blur-xl shadow-lg"
                        onClick={() => {
                            const newDate = new Date(date)
                            newDate.setDate(newDate.getDate() - 1)
                            setDate(newDate)
                        }}
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Button>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-[240px] justify-start text-left font-normal h-12 rounded-xl border-muted bg-card/60 backdrop-blur-xl shadow-lg",
                                    !date && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                {date ? format(date, language === "zh" ? "yyyy年MM月dd日" : "PPP") : <span>{t("history.pick_date")}</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-2xl border-muted shadow-2xl bg-card/95 backdrop-blur-xl" align="end">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={(d) => d && setDate(d)}
                                initialFocus
                                className="rounded-2xl"
                            />
                        </PopoverContent>
                    </Popover>

                    <Button
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 rounded-xl border-muted bg-card/60 backdrop-blur-xl shadow-lg"
                        onClick={() => {
                            const newDate = new Date(date)
                            newDate.setDate(newDate.getDate() + 1)
                            setDate(newDate)
                        }}
                    >
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>
            </header>

            {/* Date-Aware Summary */}
            <SummaryCards refreshKey={refreshKey} date={date} activities={activities} user={user} />

            {/* Date-Aware Feed */}
            <ActivityFeed
                refreshKey={refreshKey}
                onUpdate={() => setRefreshKey(k => k + 1)}
                date={date}
                activities={activities}
                loading={dataLoading}
            />
        </div>
    )
}
