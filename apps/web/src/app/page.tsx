"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Calendar } from "@/components/ui/calendar"
import { SummaryCards } from "@/components/dashboard/SummaryCards"
import { LogForm } from "@/components/dashboard/LogForm"
import { ActivityFeed } from "@/components/dashboard/ActivityFeed"
import { ElderlyExportView } from "@/components/dashboard/ElderlyExportView"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/LanguageProvider"
import { useAuth } from "@/components/AuthProvider"
import { supabase, Activity, UserConfig } from "@/lib/supabase"
import { fetchActivitiesForDay } from "@yoyo/api"
import { toast } from "sonner"
import { LayoutDashboard, Loader2, Calendar as CalendarIcon, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { toPng } from "html-to-image"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

export default function DashboardPage() {
  const [date, setDate] = useState<Date>(new Date())
  const [refreshKey, setRefreshKey] = useState(0)
  const [activities, setActivities] = useState<Activity[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [babyBirthDate, setBabyBirthDate] = useState<string | null>(null)
  const [babyName, setBabyName] = useState<string | null>(null)
  const { t, language } = useLanguage()
  const { user, loading: authLoading } = useAuth()
  const { theme } = useTheme()
  const router = useRouter()

  // 导出相关
  const exportRef = useRef<HTMLDivElement>(null)
  const elderlyExportRef = useRef<HTMLDivElement>(null)
  const [exportingMode, setExportingMode] = useState<'desktop' | 'mobile' | 'elderly' | null>(null)

  const triggerRefresh = () => setRefreshKey(prev => prev + 1)

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

      try {
        const data = await fetchActivitiesForDay(user!.id, date)

        // 排序处理
        const startOfDay = new Date(date)
        startOfDay.setHours(0, 0, 0, 0)

        const sorted = (data || []).sort((a: Activity, b: Activity) => {
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
        setActivities(sorted)
      } catch (error) {
        console.error("Fetch error:", error)
        toast.error("Failed to load activities")
      }
      setDataLoading(false)
    }

    fetchActivities()
  }, [date, refreshKey, user])

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
        data.forEach((item: UserConfig) => {
          if (item.key === "baby_birth_date") setBabyBirthDate(item.value)
          if (item.key === "baby_name") setBabyName(item.value)
        })
      }
    }
    fetchBabyConfig()
  }, [user])

  // 计算统计数据供导出使用
  const stats = useMemo(() => {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    let volume = 0
    let sleepMins = 0

    activities.forEach((act) => {
      if (act.type === "feeding" && act.volume) {
        const actStart = new Date(act.start_time)
        if (actStart >= startOfDay && actStart <= endOfDay) {
          volume += act.volume
        }
      }
      if (act.type === "sleep" && act.start_time && act.end_time) {
        const actEnd = new Date(act.end_time).getTime()
        const dayStart = startOfDay.getTime()
        const dayEnd = endOfDay.getTime()

        if (actEnd >= dayStart && actEnd <= dayEnd) {
          const actStart = new Date(act.start_time).getTime()
          sleepMins += (actEnd - actStart) / (1000 * 60)
        }
      }
    })

    return { totalVolume: volume, totalSleepMinutes: sleepMins }
  }, [activities, date])

  const handleExport = async (mode: 'desktop' | 'mobile' | 'elderly') => {
    const targetRef = mode === 'elderly' ? elderlyExportRef : exportRef
    if (!targetRef.current) return
    setExportingMode(mode)

    await new Promise(resolve => setTimeout(resolve, 300))

    try {
      const isDark = theme === 'dark'
      const bgColor = mode === 'elderly'
        ? (isDark ? '#0f172a' : '#ffffff')
        : (isDark ? '#020617' : '#f8fafc')

      const dataUrl = await toPng(targetRef.current, {
        cacheBust: true,
        backgroundColor: bgColor,
        pixelRatio: 2,
      })
      const link = document.createElement('a')
      const modeLabel = mode === 'elderly' ? 'elderly-' : (mode === 'mobile' ? 'mobile-' : '')
      link.download = `baby-tracker-${modeLabel}${format(date, 'yyyy-MM-dd')}.png`
      link.href = dataUrl
      link.click()
      const successMsg = mode === 'elderly'
        ? (language === 'zh' ? '大字版图片导出成功！' : 'Large text image exported!')
        : `${mode === 'mobile' ? 'Mobile' : 'Desktop'} image exported successfully!`
      toast.success(successMsg)
    } catch (err) {
      console.error("Export error:", err)
      toast.error("Failed to export image")
    } finally {
      setExportingMode(null)
    }
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

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const babyAge = calculateBabyAge()
  const isToday = date.toDateString() === new Date().toDateString()

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-4 relative">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* 宝宝信息 */}
        <div className="flex items-center gap-3">
          {babyAge !== null ? (
            <>
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
            </>
          ) : (
            <div className="p-2.5 bg-primary/20 rounded-xl">
              <LayoutDashboard className="w-6 h-6 text-primary" />
            </div>
          )}
        </div>

        {/* 日期选择器 + 导出按钮 */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-xl border-muted bg-card/60 backdrop-blur-xl shadow-lg"
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
                  "w-[200px] justify-start text-left font-normal h-10 rounded-xl border-muted bg-card/60 backdrop-blur-xl shadow-lg",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                {date ? format(date, language === "zh" ? "yyyy年MM月dd日" : "PPP") : <span>{language === 'zh' ? '选择日期' : 'Pick date'}</span>}
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
            className="h-10 w-10 rounded-xl border-muted bg-card/60 backdrop-blur-xl shadow-lg"
            onClick={() => {
              const newDate = new Date(date)
              newDate.setDate(newDate.getDate() + 1)
              setDate(newDate)
            }}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>

          {/* 导出按钮 */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="default"
                className="h-10 px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg gap-2 active:scale-95 transition-transform"
                disabled={!!exportingMode}
              >
                {exportingMode ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                <span className="hidden md:inline">{language === 'zh' ? '导出图片' : 'Export'}</span>
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
              <div className="h-px bg-muted/50 my-1" />
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 rounded-xl px-3"
                onClick={() => handleExport('elderly')}
              >
                <div className="p-1 rounded-md bg-orange-500/10 text-orange-500">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M9 22v-4h6v4" /><text x="12" y="14" textAnchor="middle" fontSize="8" fill="currentColor" stroke="none" fontWeight="bold">大</text></svg>
                </div>
                <span className="text-sm font-medium">{language === 'zh' ? '导出手机（大字）' : 'Mobile (Large)'}</span>
              </Button>
            </PopoverContent>
          </Popover>
        </div>
      </header>

      <SummaryCards refreshKey={refreshKey} date={date} activities={activities} user={user} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-5 flex">
          <LogForm onSuccess={triggerRefresh} />
        </div>

        <div className="lg:col-span-7 flex">
          <ActivityFeed
            refreshKey={refreshKey}
            onUpdate={triggerRefresh}
            date={date}
            activities={activities}
            loading={dataLoading}
            maxHeight="350px"
          />
        </div>
      </div>

      {/* 隐藏的导出专用区域 */}
      <div className="absolute left-[-9999px] top-0 pointer-events-none">
        <div
          ref={exportRef}
          className={cn(
            "transition-all",
            exportingMode === 'mobile' ? "w-[450px] p-6 space-y-6" : "w-[800px] p-10 space-y-6",
            theme === 'dark' ? "text-slate-50" : "text-slate-950"
          )}
        >
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
            onUpdate={() => { }}
            date={date}
            activities={activities}
            loading={dataLoading}
            forceSingleColumn={exportingMode === 'mobile'}
            maxHeight="none"
            isExporting={true}
          />
        </div>

        <ElderlyExportView
          ref={elderlyExportRef}
          date={date}
          activities={activities}
          totalVolume={stats.totalVolume}
          totalSleepMinutes={stats.totalSleepMinutes}
        />
      </div>
    </div>
  )
}
