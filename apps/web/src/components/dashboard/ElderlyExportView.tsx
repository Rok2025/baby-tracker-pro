"use client"

import { useMemo, forwardRef } from "react"
import { Milk, Moon } from "lucide-react"
import { Activity } from "@/lib/supabase"
import { useLanguage } from "@/components/LanguageProvider"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

interface ElderlyExportViewProps {
    date: Date
    activities: Activity[]
    totalVolume: number
    totalSleepMinutes: number
}

export const ElderlyExportView = forwardRef<HTMLDivElement, ElderlyExportViewProps>(
    ({ date, activities, totalVolume, totalSleepMinutes }, ref) => {
        const { language } = useLanguage()
        const { theme } = useTheme()
        const isDark = theme === 'dark'

        // 格式化星期几
        const weekdays = language === 'zh'
            ? ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
            : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

        const dateStr = language === 'zh'
            ? `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
            : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

        const weekdayStr = weekdays[date.getDay()]

        // 睡眠时长格式化
        const sleepHours = Math.floor(totalSleepMinutes / 60)
        const sleepMins = Math.round(totalSleepMinutes % 60)
        const sleepStr = language === 'zh'
            ? `${sleepHours}时${sleepMins}分`
            : `${sleepHours}h${sleepMins}m`

        // 按时间升序排列活动
        const sortedActivities = useMemo(() => {
            return [...activities].sort((a, b) =>
                new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
            )
        }, [activities])

        // 格式化时间
        const formatTime = (dateStr: string) => {
            const d = new Date(dateStr)
            if (isNaN(d.getTime())) return '--:--'
            return d.toLocaleTimeString(language === 'zh' ? 'zh-CN' : 'en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            })
        }

        // 格式化睡眠时长
        const formatDuration = (startTime: string, endTime: string) => {
            const diffMins = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60))
            const hours = Math.floor(diffMins / 60)
            const mins = diffMins % 60
            if (language === 'zh') {
                return hours > 0 ? `${hours}小时${mins}分` : `${mins}分`
            }
            return hours > 0 ? `${hours}h${mins}m` : `${mins}m`
        }

        return (
            <div
                ref={ref}
                className={cn(
                    "w-[450px] p-6 space-y-6 font-sans flex flex-col items-stretch",
                    isDark ? "text-slate-50" : "text-slate-900"
                )}
                style={{
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                }}
            >
                {/* 大字日期标题 */}
                <div className="text-center space-y-1 pb-4 border-b-4 border-current/10 w-full box-border">
                    <div className="text-3xl font-extrabold tracking-tight">
                        📅 {dateStr}
                    </div>
                    <div className={cn(
                        "text-xl font-bold",
                        isDark ? "text-slate-400" : "text-slate-500"
                    )}>
                        {weekdayStr}
                    </div>
                </div>

                {/* 统计卡片 - 两列 */}
                <div className="grid grid-cols-2 gap-4 w-full box-border">
                    {/* 奶量卡片 */}
                    <div
                        className="rounded-3xl p-5 text-center shadow-sm flex flex-col items-center justify-center box-border overflow-hidden"
                        style={{
                            backgroundColor: isDark ? 'rgba(251, 146, 60, 0.15)' : 'rgba(251, 146, 60, 0.08)',
                            border: `3px solid ${isDark ? 'rgba(251, 146, 60, 0.4)' : 'rgba(251, 146, 60, 0.3)'}`
                        }}
                    >
                        <div className="flex items-center justify-center gap-2 mb-2 w-full whitespace-nowrap">
                            <Milk className="w-6 h-6 shrink-0" style={{ color: '#fb923c' }} />
                            <span className="text-xl font-bold truncate" style={{ color: isDark ? '#fdba74' : '#ea580c' }}>
                                {language === 'zh' ? '今日奶量' : "Milk"}
                            </span>
                        </div>
                        <div
                            className="text-4xl font-black tracking-tighter w-full truncate"
                            style={{ color: '#fb923c' }}
                        >
                            {totalVolume}
                            <span className="text-xl font-bold ml-1">{language === 'zh' ? '毫升' : 'ml'}</span>
                        </div>
                    </div>

                    {/* 睡眠卡片 */}
                    <div
                        className="rounded-3xl p-5 text-center shadow-sm flex flex-col items-center justify-center box-border overflow-hidden"
                        style={{
                            backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.08)',
                            border: `3px solid ${isDark ? 'rgba(139, 92, 246, 0.4)' : 'rgba(139, 92, 246, 0.3)'}`
                        }}
                    >
                        <div className="flex items-center justify-center gap-2 mb-2 w-full whitespace-nowrap">
                            <Moon className="w-6 h-6 shrink-0" style={{ color: '#8b5cf6' }} />
                            <span className="text-xl font-bold truncate" style={{ color: isDark ? '#c4b5fd' : '#7c3aed' }}>
                                {language === 'zh' ? '今日睡眠' : "Sleep"}
                            </span>
                        </div>
                        <div
                            className="text-3xl font-black tracking-tighter w-full truncate"
                            style={{ color: '#8b5cf6' }}
                        >
                            {sleepStr}
                        </div>
                    </div>
                </div>

                {/* 活动时间线 - 统一列表，背景色区分 */}
                <div className="space-y-3 w-full box-border">
                    <div className={cn(
                        "text-xl font-black pb-2 border-b-4 w-full box-border",
                        isDark ? "border-slate-700" : "border-slate-200"
                    )}>
                        {language === 'zh' ? '📋 今日作息' : '📋 Schedule'}
                    </div>

                    {sortedActivities.length === 0 ? (
                        <div className={cn(
                            "text-center py-8 text-xl font-medium w-full box-border",
                            isDark ? "text-slate-500" : "text-slate-400"
                        )}>
                            {language === 'zh' ? '暂无记录' : 'No records'}
                        </div>
                    ) : (
                        <div className="space-y-2 w-full box-border">
                            {sortedActivities.map((activity) => {
                                const isSleep = activity.type === 'sleep'
                                const bgColor = isSleep
                                    ? (isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.06)')
                                    : (isDark ? 'rgba(251, 146, 60, 0.15)' : 'rgba(251, 146, 60, 0.06)')
                                const borderColor = isSleep
                                    ? (isDark ? 'rgba(139, 92, 246, 0.4)' : 'rgba(139, 92, 246, 0.3)')
                                    : (isDark ? 'rgba(251, 146, 60, 0.4)' : 'rgba(251, 146, 60, 0.3)')
                                const iconColor = isSleep ? '#8b5cf6' : '#fb923c'

                                return (
                                    <div
                                        key={activity.id}
                                        className="flex items-center justify-between w-full px-4 py-3.5 rounded-2xl box-border"
                                        style={{
                                            backgroundColor: bgColor,
                                            borderLeftWidth: '8px',
                                            borderLeftStyle: 'solid',
                                            borderLeftColor: iconColor,
                                            borderWidth: '1px',
                                            borderStyle: 'solid',
                                            borderColor: borderColor
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* 图标 */}
                                            <div
                                                className="p-2 rounded-xl shrink-0"
                                                style={{ backgroundColor: `${iconColor}20` }}
                                            >
                                                {isSleep
                                                    ? <Moon className="w-5 h-5" style={{ color: iconColor }} />
                                                    : <Milk className="w-5 h-5" style={{ color: iconColor }} />
                                                }
                                            </div>

                                            {/* 时间 */}
                                            <div className="text-xl font-black tabular-nums">
                                                {isSleep ? (
                                                    activity.end_time
                                                        ? `${formatTime(activity.start_time)}-${formatTime(activity.end_time)}`
                                                        : `${formatTime(activity.start_time)} - ...`
                                                ) : (
                                                    formatTime(activity.start_time)
                                                )}
                                            </div>
                                        </div>

                                        {/* 数值 */}
                                        <div
                                            className="text-2xl font-black tabular-nums"
                                            style={{ color: iconColor }}
                                        >
                                            {isSleep ? (
                                                activity.end_time
                                                    ? formatDuration(activity.start_time, activity.end_time)
                                                    : (language === 'zh' ? '进行中' : 'Ongoing')
                                            ) : (
                                                `${activity.volume}${language === 'zh' ? '毫升' : 'ml'}`
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* 底部品牌 */}
                <div className={cn(
                    "text-center pt-4 border-t-4 w-full mt-auto box-border",
                    isDark ? "border-slate-700 text-slate-500" : "border-slate-200 text-slate-400"
                )}>
                    <span className="text-base font-bold">
                        {language === 'zh' ? '宝宝成长助手' : 'BabyTracker Pro'} ❤️
                    </span>
                </div>
            </div>
        )
    }
)

ElderlyExportView.displayName = "ElderlyExportView"
