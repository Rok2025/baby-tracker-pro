"use client"

import { useState, useEffect, useRef } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ActivityFeed } from "@/components/dashboard/ActivityFeed"
import { SummaryCards } from "@/components/dashboard/SummaryCards"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Loader2, ImageIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/LanguageProvider"
import { useAuth } from "@/components/AuthProvider"
import { supabase, Activity } from "@/lib/supabase"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { toPng } from "html-to-image"
import { useTheme } from "next-themes"

export default function HistoryPage() {
    const [date, setDate] = useState<Date>(new Date())
    const [refreshKey, setRefreshKey] = useState(0)
    const [activities, setActivities] = useState<Activity[]>([])
    const [dataLoading, setDataLoading] = useState(true)
    const { t, language } = useLanguage()
    const { user, loading: authLoading } = useAuth()
    const { theme } = useTheme()
    const router = useRouter()

    const exportRef = useRef<HTMLDivElement>(null)
    const [exportingMode, setExportingMode] = useState<'desktop' | 'mobile' | null>(null)

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login")
        }
    }, [user, authLoading, router])

    useEffect(() => {
        if (!user) return

        async function fetchActivities() {
            if (activities.length === 0) {
                setDataLoading(true)
            }
            const startOfDay = new Date(date)
            startOfDay.setHours(0, 0, 0, 0)
            const endOfDay = new Date(date)
            endOfDay.setHours(23, 59, 59, 999)

            const startStr = startOfDay.toISOString()
            const endStr = endOfDay.toISOString()

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
                const processed = (data || [])
                    .filter(act => {
                        const actStart = new Date(act.start_time).getTime()
                        const actEnd = act.end_time ? new Date(act.end_time).getTime() : actStart
                        return actStart <= endOfDay.getTime() && actEnd >= startOfDay.getTime()
                    })
                    .sort((a, b) => {
                        const getSortTime = (act: Activity) => {
                            const start = new Date(act.start_time).getTime()
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

    const handleExport = async (mode: 'desktop' | 'mobile') => {
        if (!exportRef.current) return
        setExportingMode(mode)

        // 等待足够时间以确保 React 完成 DOM 状态更新
        await new Promise(resolve => setTimeout(resolve, 300))

        try {
            const isDark = theme === 'dark'
            const bgColor = isDark ? '#020617' : '#f8fafc'

            const dataUrl = await toPng(exportRef.current, {
                cacheBust: true,
                backgroundColor: bgColor,
                pixelRatio: 2,
            })
            const link = document.createElement('a')
            link.download = `baby-tracker-${mode === 'mobile' ? 'mobile-' : ''}history-${format(date, 'yyyy-MM-dd')}.png`
            link.href = dataUrl
            link.click()
            toast.success(`${mode === 'mobile' ? 'Mobile' : 'Desktop'} image exported successfully!`)
        } catch (err) {
            console.error("Export error:", err)
            toast.error("Failed to export image")
        } finally {
            setExportingMode(null)
        }
    }

    if (authLoading || (!user && !authLoading)) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-4 relative">
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

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="default"
                                className="h-12 px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg gap-2 active:scale-95 transition-transform"
                                disabled={!!exportingMode}
                            >
                                {exportingMode ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                                <span className="hidden md:inline">{t("history.export")}</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-2 rounded-2xl border-muted shadow-2xl bg-card/95 backdrop-blur-xl space-y-1" align="end">
                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-2 rounded-xl px-3"
                                onClick={() => handleExport('desktop')}
                            >
                                <div className="p-1 rounded-md bg-primary/10 text-primary">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /></svg>
                                </div>
                                <span className="text-sm font-medium">{language === 'zh' ? '导出电脑图片' : 'Desktop Export'}</span>
                            </Button>
                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-2 rounded-xl px-3"
                                onClick={() => handleExport('mobile')}
                            >
                                <div className="p-1 rounded-md bg-primary/10 text-primary">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M12 18h.01" /></svg>
                                </div>
                                <span className="text-sm font-medium">{language === 'zh' ? '导出手机图片' : 'Mobile Export'}</span>
                            </Button>
                        </PopoverContent>
                    </Popover>
                </div>
            </header>

            {/* 正常显示的区域：保持稳定，不随导出状态变化 */}
            <div className="space-y-4 p-1">
                <SummaryCards refreshKey={refreshKey} date={date} activities={activities} user={user} />
                <ActivityFeed
                    refreshKey={refreshKey}
                    onUpdate={() => setRefreshKey(k => k + 1)}
                    date={date}
                    activities={activities}
                    loading={dataLoading}
                />
            </div>

            {/* 隐藏的导出专用区域：仅在导出时通过 ref 捕获，不影响页面布局 */}
            <div className="absolute left-[-9999px] top-0 pointer-events-none">
                <div
                    ref={exportRef}
                    className={cn(
                        "transition-all",
                        exportingMode === 'mobile' ? "w-[450px] p-6 space-y-6" : "w-[800px] p-10 space-y-6",
                        theme === 'dark' ? "text-slate-50" : "text-slate-950"
                    )}
                >
                    {/* 导出区域顶部的日期标识 (品牌感+记录日期) */}
                    <div className="flex items-center justify-between mb-2 px-2">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                                <span className="text-primary text-lg font-bold">Y</span>
                            </div>
                            <span className="text-sm font-bold opacity-40 tracking-wider">BabyTracker Pro</span>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest opacity-50">{language === 'zh' ? '记录日期' : 'RECORD DATE'}</p>
                            <p className="text-sm font-bold text-primary">{format(date, language === "zh" ? "yyyy年MM月dd日" : "MMMM dd, yyyy")}</p>
                        </div>
                    </div>

                    <SummaryCards
                        refreshKey={refreshKey}
                        date={date}
                        activities={activities}
                        user={user}
                        forceSingleColumn={false}
                        isExporting={true}
                    />
                    <ActivityFeed
                        refreshKey={refreshKey}
                        onUpdate={() => { }} // 导出视图不需要更新回调
                        date={date}
                        activities={activities}
                        loading={dataLoading}
                        forceSingleColumn={exportingMode === 'mobile'}
                        maxHeight="none"
                        isExporting={true}
                    />
                </div>
            </div>
        </div>
    )
}
