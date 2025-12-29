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
import { supabase, Activity } from "@/lib/supabase"
import { toast } from "sonner"

export default function HistoryPage() {
    const [date, setDate] = useState<Date>(new Date())
    const [refreshKey, setRefreshKey] = useState(0)
    const [activities, setActivities] = useState<Activity[]>([])
    const [loading, setLoading] = useState(true)
    const { t, language } = useLanguage()

    useEffect(() => {
        async function fetchActivities() {
            setLoading(true)
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
    }, [date, refreshKey])

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{t("history.title")}</h2>
                    <p className="text-muted-foreground">{t("history.subtitle")}</p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 rounded-xl border-primary/20 bg-white/50"
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
                                    "w-[240px] justify-start text-left font-normal h-12 rounded-xl border-primary/20 bg-white/50",
                                    !date && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                {date ? format(date, language === "zh" ? "yyyy年MM月dd日" : "PPP") : <span>{t("history.pick_date")}</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={(d) => d && setDate(d)}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>

                    <Button
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 rounded-xl border-primary/20 bg-white/50"
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
            <SummaryCards refreshKey={refreshKey} date={date} activities={activities} />

            {/* Date-Aware Feed */}
            <ActivityFeed
                refreshKey={refreshKey}
                onUpdate={() => setRefreshKey(k => k + 1)}
                date={date}
                activities={activities}
                loading={loading}
            />

            <div className="p-12 border-2 border-dashed rounded-3xl text-center text-muted-foreground bg-white/20">
                <p>{t("history.coming_soon")}</p>
            </div>
        </div>
    )
}
