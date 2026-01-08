"use client"

import { useEffect, useState } from "react"
import { Trash2, Edit2, Milk, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase, Activity } from "@/lib/supabase"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useLanguage } from "@/components/LanguageProvider"
import { invalidateActivityCache } from "@yoyo/api"

export function ActivityFeed({
    refreshKey,
    onUpdate,
    date = new Date(),
    activities = [],
    loading = false,
    maxHeight = "400px",
    forceSingleColumn = false,
    isExporting = false
}: {
    refreshKey: number,
    onUpdate: () => void,
    date?: Date,
    activities?: Activity[],
    loading?: boolean,
    maxHeight?: string,
    forceSingleColumn?: boolean,
    isExporting?: boolean
}) {
    const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
    const [editValues, setEditValues] = useState<Partial<Activity>>({})
    const { t, language } = useLanguage()

    async function handleDelete(id: string) {
        const confirmed = window.confirm(t("common.confirm_delete"))
        if (!confirmed) return

        const { error } = await supabase.from("activities").delete().eq("id", id)
        if (error) {
            toast.error("Failed to delete entry")
        } else {
            // 失效缓存
            const activity = activities.find(a => a.id === id)
            if (activity) {
                invalidateActivityCache(activity.user_id, new Date(activity.start_time))
            }
            toast.success("Entry deleted")
            onUpdate()
        }
    }

    async function handleUpdate() {
        if (!editingActivity || !editValues.start_time) return

        // 辅助函数：将本地 HH:mm 合并到 ISO 日期中
        const mergeTimeToDate = (isoDate: string, localTime: string) => {
            const date = new Date(isoDate)
            const [hours, minutes] = localTime.split(':').map(Number)
            date.setHours(hours, minutes, 0, 0)
            return date.toISOString()
        }

        const updatedValues: Partial<Activity> = {
            note: editValues.note,
            start_time: mergeTimeToDate(editingActivity.start_time, editValues.start_time)
        }

        if (editingActivity.type === 'feeding') {
            updatedValues.volume = editValues.volume
        } else if (editingActivity.type === 'sleep') {
            if (editValues.end_time) {
                // 结束时间的基础日期与开始时间一致
                updatedValues.end_time = mergeTimeToDate(editingActivity.start_time, editValues.end_time)

                // 处理跨天睡眠逻辑：如果结束时间早于开始时间，视为第二天
                const start = new Date(updatedValues.start_time!)
                const end = new Date(updatedValues.end_time!)
                if (end <= start) {
                    end.setDate(end.getDate() + 1)
                    updatedValues.end_time = end.toISOString()
                }
            } else {
                // 如果没有填写结束时间，则设为 null (进行中)
                updatedValues.end_time = null
            }
        }

        const { error } = await supabase
            .from("activities")
            .update(updatedValues)
            .eq("id", editingActivity.id)

        if (error) {
            toast.error("Failed to update entry")
        } else {
            // 失效缓存
            invalidateActivityCache(editingActivity.user_id, new Date(editingActivity.start_time))
            toast.success("Entry updated")
            setEditingActivity(null)
            onUpdate()
        }
    }

    if (loading) return <div className="p-8 text-center text-muted-foreground">Loading activities...</div>

    return (
        <>
            <Card
                className={cn(
                    "border-none overflow-hidden w-full flex flex-col transition-all duration-300",
                    isExporting
                        ? "bg-card border border-slate-200/50"
                        : "shadow-2xl bg-card/60 backdrop-blur-xl"
                )}
                style={isExporting ? { boxShadow: '0 10px 30px -10px rgba(0,0,0,0.2)' } : undefined}
            >
                <CardHeader className="pb-0 pt-2 px-6">
                    <CardTitle className={cn("text-base font-semibold flex items-center justify-between", isExporting && "text-xl pt-2")}>
                        {t("recent.activities")}
                        <span className={cn(
                            "text-[10px] font-medium text-muted-foreground bg-background/60 px-2 py-0.5 rounded-full border border-muted",
                            isExporting && "text-sm px-3 py-1"
                        )}>
                            {date && date.toLocaleDateString() === new Date().toLocaleDateString() ? t("recent.today") : date?.toLocaleDateString()}
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 flex-1">
                    {activities.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground italic text-sm">{t("recent.no_activities")}</div>
                    ) : (() => {
                        // 将活动按时间段分组
                        const getTimePeriod = (activity: Activity) => {
                            // 跨日活动归类到上午
                            if (activity.end_time) {
                                const startDate = new Date(activity.start_time).toDateString()
                                const endDate = new Date(activity.end_time).toDateString()
                                if (startDate !== endDate) return 'morning'
                            }

                            const hour = new Date(activity.start_time).getHours()
                            if (hour < 12) return 'morning'        // 0:00 - 12:00
                            if (hour >= 12 && hour < 18) return 'afternoon'  // 12:00 - 18:00
                            return 'evening' // 18:00 - 24:00
                        }

                        const grouped = activities.reduce((acc, activity) => {
                            const period = getTimePeriod(activity)
                            if (!acc[period]) acc[period] = []
                            acc[period].push(activity)
                            return acc
                        }, {} as Record<string, Activity[]>)

                        // 每个时段内按开始时间升序排列
                        Object.keys(grouped).forEach(key => {
                            grouped[key].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                        })

                        const periods = [
                            { key: 'morning', label: language === 'zh' ? '上午' : 'Morning', icon: '🌅' },
                            { key: 'afternoon', label: language === 'zh' ? '下午' : 'Afternoon', icon: '☀️' },
                            { key: 'evening', label: language === 'zh' ? '晚上' : 'Evening', icon: '🌙' }
                        ]

                        const formatTime = (dateStr: string) => {
                            const date = new Date(dateStr)
                            if (isNaN(date.getTime())) return '--:--'
                            return date.toLocaleTimeString(language === 'zh' ? 'zh-CN' : 'en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                            })
                        }

                        const renderActivity = (activity: Activity) => {
                            const isSleep = activity.type === "sleep"
                            return (
                                <div
                                    key={activity.id}
                                    className={cn(
                                        "group flex items-center gap-2 px-2 py-1.5 rounded transition-all duration-200",
                                        isSleep ? "hover:bg-primary/10" : "hover:bg-chart-3/10",
                                        isExporting && "gap-3 py-2 px-3 rounded-lg mb-1 bg-slate-500/5 dark:bg-slate-400/5"
                                    )}
                                >
                                    {/* 图标 */}
                                    <div className={cn(
                                        "p-1.5 rounded shrink-0 transition-all duration-500",
                                        isSleep ? "bg-primary/20 text-primary" : "bg-chart-3/20 text-chart-3",
                                        isSleep && !activity.end_time && "animate-pulse bg-primary/40 shadow-[0_0_12px_rgba(var(--primary),0.4)]",
                                        isExporting && "p-1.5 rounded-md"
                                    )}>
                                        {isSleep ? <Moon className={cn("w-3.5 h-3.5", isSleep && !activity.end_time && "animate-spin-slow", isExporting && "w-4 h-4")} /> : <Milk className={cn("w-3.5 h-3.5", isExporting && "w-4 h-4")} />}
                                    </div>

                                    {/* 时间 */}
                                    <span className={cn(
                                        "text-xs text-muted-foreground font-medium tabular-nums min-w-[85px] shrink-0",
                                        isExporting && "text-sm font-bold min-w-[95px] text-foreground"
                                    )}>
                                        {(() => {
                                            const start = formatTime(activity.start_time)
                                            if (isSleep) {
                                                if (activity.end_time) {
                                                    const end = formatTime(activity.end_time)
                                                    return `${start}-${end}`
                                                }
                                                return `${start} - ...`
                                            }
                                            return start
                                        })()}
                                    </span>

                                    {/* 关键数据：睡眠时长或喝奶量 - 固定宽度右对齐 */}
                                    <span className={cn(
                                        "font-bold text-[10px] px-1.5 py-0.5 rounded text-right min-w-[56px] shrink-0 transition-colors",
                                        isSleep
                                            ? (activity.end_time ? "text-primary bg-primary/10" : "text-primary bg-primary/30 animate-pulse border border-primary/20")
                                            : "text-chart-3 bg-chart-3/10",
                                        isExporting && "text-[11px] px-2 py-0.5 min-w-[65px] rounded-md shadow-sm"
                                    )}>
                                        {isSleep ? (
                                            activity.end_time ? (() => {
                                                const diffMins = Math.round((new Date(activity.end_time).getTime() - new Date(activity.start_time).getTime()) / (1000 * 60))
                                                const hours = Math.floor(diffMins / 60)
                                                const mins = diffMins % 60
                                                return hours > 0 ? `${hours}h${mins}m` : `${mins}m`
                                            })() : t("duration.ongoing")
                                        ) : (
                                            `${activity.volume}ml`
                                        )}
                                    </span>

                                    {/* 操作按钮 - 导出时隐藏 */}
                                    {!isExporting && (
                                        <div className="flex items-center gap-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity ml-auto">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5 text-muted-foreground hover:text-primary"
                                                onClick={() => {
                                                    const startLocal = new Date(activity.start_time).toLocaleTimeString("it-IT").slice(0, 5)
                                                    const endLocal = activity.end_time ? new Date(activity.end_time).toLocaleTimeString("it-IT").slice(0, 5) : ""
                                                    setEditingActivity(activity)
                                                    setEditValues({
                                                        volume: activity.volume,
                                                        note: activity.note,
                                                        start_time: startLocal,
                                                        end_time: endLocal
                                                    })
                                                }}
                                            >
                                                <Edit2 className="w-2.5 h-2.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5 text-muted-foreground hover:text-destructive"
                                                onClick={() => handleDelete(activity.id)}
                                            >
                                                <Trash2 className="w-2.5 h-2.5" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )
                        }

                        return (
                            <div
                                className={cn(
                                    "gap-6 md:gap-2 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent",
                                    forceSingleColumn ? "flex flex-col" : "grid grid-cols-1 md:grid-cols-3",
                                    isExporting && "pb-4"
                                )}
                                style={{ maxHeight }}
                            >
                                {periods.map(({ key, label, icon }) => (
                                    <div key={key} className="min-w-0">
                                        {/* 时段标题 */}
                                        <div className={cn("flex items-center gap-1 px-1.5 py-1 mb-1 border-b border-muted/30", isExporting && "py-2 mb-2 border-muted/50")}>
                                            <span className={cn("text-xs", isExporting && "text-sm")}>{icon}</span>
                                            <span className={cn("text-[10px] font-semibold text-muted-foreground uppercase tracking-wide", isExporting && "text-xs font-bold")}>{label}</span>
                                            {grouped[key] && (
                                                <span className={cn("text-[9px] text-muted-foreground/60 ml-auto", isExporting && "text-[10px]")}>{grouped[key].length}</span>
                                            )}
                                        </div>
                                        {/* 活动列表 */}
                                        <div className={cn("space-y-0.5", isExporting && "space-y-1")}>
                                            {grouped[key]?.map(renderActivity) || (
                                                <div className={cn("text-[10px] text-muted-foreground/50 italic px-1.5 py-2 text-center", isExporting && "text-xs")}>-</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    })()}
                </CardContent>
            </Card>

            <Dialog open={!!editingActivity} onOpenChange={(open) => !open && setEditingActivity(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {editingActivity?.type === 'feeding' ? <Milk className="w-5 h-5 text-chart-3" /> : <Moon className="w-5 h-5 text-primary" />}
                            {editingActivity?.type === 'feeding' ? t("form.feeding") : t("form.sleep")} {t("common.edit")}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label className="text-xs font-medium opacity-70">记录类型</Label>
                            <div className="px-3 py-2 bg-muted/50 rounded-lg text-sm font-medium border border-muted flex items-center gap-2">
                                <span className={cn(
                                    "w-2 h-2 rounded-full",
                                    editingActivity?.type === 'feeding' ? "bg-chart-3" : "bg-primary"
                                )} />
                                {editingActivity?.type === 'feeding' ? t("form.feeding") : t("form.sleep")}
                                <span className="ml-auto text-[10px] text-muted-foreground uppercase tracking-widest">Read Only</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="startTime" className="text-xs font-medium opacity-70">
                                    {editingActivity?.type === 'feeding' ? "喂奶时间" : t("form.start_time")}
                                </Label>
                                <Input
                                    id="startTime"
                                    type="time"
                                    value={editValues.start_time || ""}
                                    onChange={(e) => setEditValues({ ...editValues, start_time: e.target.value })}
                                    className="bg-background/50 border-muted focus:border-primary"
                                />
                            </div>

                            {editingActivity?.type === 'feeding' ? (
                                <div className="grid gap-2">
                                    <Label htmlFor="volume" className="text-xs font-medium opacity-70">{t("form.volume")}</Label>
                                    <Input
                                        id="volume"
                                        type="number"
                                        value={editValues.volume || ""}
                                        onChange={(e) => setEditValues({ ...editValues, volume: parseInt(e.target.value) })}
                                        className="bg-background/50 border-muted focus:border-primary"
                                    />
                                </div>
                            ) : (
                                <div className="grid gap-2">
                                    <Label htmlFor="endTime" className="text-xs font-medium opacity-70">
                                        {t("form.end_time")} <span className="text-[10px] font-normal opacity-50">({language === 'zh' ? '可选' : 'Optional'})</span>
                                    </Label>
                                    <Input
                                        id="endTime"
                                        type="time"
                                        value={editValues.end_time || ""}
                                        onChange={(e) => setEditValues({ ...editValues, end_time: e.target.value })}
                                        className="bg-background/50 border-muted focus:border-primary"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="note" className="text-xs font-medium opacity-70">{t("form.note")}</Label>
                            <Input
                                id="note"
                                value={editValues.note || ""}
                                onChange={(e) => setEditValues({ ...editValues, note: e.target.value })}
                                placeholder="添加备注..."
                                className="bg-background/50 border-muted focus:border-primary"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingActivity(null)} className="h-11">
                            {t("common.cancel")}
                        </Button>
                        <Button onClick={handleUpdate} className="h-11 px-8 shadow-lg shadow-primary/20">
                            {t("common.save")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
