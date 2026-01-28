"use client"

import { useEffect, useState } from "react"
import { Trash2, Edit2, Milk, Moon, Utensils, Baby } from "lucide-react"
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
import { useAuth } from "../AuthProvider"
import { FoodSelector } from "./FoodSelector"
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
    const [itemToDelete, setItemToDelete] = useState<string | null>(null)
    const [library, setLibrary] = useState<string[]>([])
    const { user } = useAuth()
    const { t, language } = useLanguage()

    // Fetch food library on mount (reused from LogForm)
    useEffect(() => {
        if (!user) return
        async function fetchLibrary() {
            const { data } = await supabase
                .from("user_config")
                .select("value")
                .eq("user_id", user?.id)
                .eq("key", "solid_food_library")
                .single()

            if (data?.value && Array.isArray(data.value)) {
                setLibrary(data.value)
            } else {
                const defaults = language === 'zh'
                    ? ["米粉", "蛋黄", "苹果泥", "南瓜泥", "青菜粥", "香蕉"]
                    : ["Rice Cereal", "Egg Yolk", "Apple Puree", "Pumpkin", "Porridge", "Banana"]
                setLibrary(defaults)
            }
        }
        fetchLibrary()
    }, [user, language])

    const handleAddCustomFood = async (newFood: string) => {
        if (!user || library.includes(newFood)) return
        const newLibrary = [...library, newFood]
        setLibrary(newLibrary)
        await supabase.from("user_config").upsert({
            user_id: user.id,
            key: "solid_food_library",
            value: newLibrary
        })
    }
    async function handleDelete(id: string) {
        setItemToDelete(id)
    }

    async function confirmDelete() {
        if (!itemToDelete) return

        const { error } = await supabase.from("activities").delete().eq("id", itemToDelete)
        if (error) {
            toast.error("Failed to delete entry")
        } else {
            // 失效缓存
            const activity = activities.find(a => a.id === itemToDelete)
            if (activity) {
                invalidateActivityCache(activity.user_id, new Date(activity.start_time))
            }
            toast.success("Entry deleted")
            onUpdate()
        }
        setItemToDelete(null)
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
        } else if (editingActivity.type === 'solid_food') {
            updatedValues.food_amount = editValues.food_amount
            updatedValues.food_type = editValues.food_type
        } else if (editingActivity.type === 'poop') {
            updatedValues.poop_color = editValues.poop_color
            updatedValues.poop_consistency = editValues.poop_consistency
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
        const isFeeding = activity.type === "feeding"
        const isSolidFood = activity.type === "solid_food"
        const isPoop = activity.type === "poop"

        return (
            <div
                key={activity.id}
                className={cn(
                    "group flex items-center gap-2 px-2 py-1.5 rounded transition-all duration-200",
                    isSleep ? "hover:bg-primary/10" : "hover:bg-chart-3/10", // Default hover style
                    (isSolidFood || isPoop) && "hover:bg-muted", // Specific hover for new types
                    isExporting && "gap-3 py-2 px-3 rounded-lg mb-1 bg-slate-500/5 dark:bg-slate-400/5"
                )}
            >
                {/* 图标 */}
                <div className={cn(
                    "p-1.5 rounded shrink-0 transition-all duration-500",
                    isSleep && "bg-primary/20 text-primary",
                    isFeeding && "bg-chart-3/20 text-chart-3",
                    isSolidFood && "bg-orange-500/20 text-orange-600",
                    isPoop && "bg-amber-700/20 text-amber-700",
                    isSleep && !activity.end_time && "animate-pulse bg-primary/40 shadow-[0_0_12px_rgba(var(--primary),0.4)]",
                    isExporting && "p-1.5 rounded-md"
                )}>
                    {isSleep && <Moon className={cn("w-3.5 h-3.5", isSleep && !activity.end_time && "animate-spin-slow", isExporting && "w-4 h-4")} />}
                    {isFeeding && <Milk className={cn("w-3.5 h-3.5", isExporting && "w-4 h-4")} />}
                    {isSolidFood && <Utensils className={cn("w-3.5 h-3.5", isExporting && "w-4 h-4")} />}
                    {isPoop && <Baby className={cn("w-3.5 h-3.5", isExporting && "w-4 h-4")} />}
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

                {/* 关键数据 */}
                <div className="flex-1 min-w-0 flex items-center justify-end gap-2">
                    {isSolidFood && (
                        <div className="flex items-center gap-1.5 justify-end shrink-0">
                            {(() => {
                                // Safe parse
                                let displayFoods: string[] = []
                                try {
                                    if (activity.food_type) {
                                        if (activity.food_type.startsWith("[")) {
                                            displayFoods = JSON.parse(activity.food_type)
                                        } else {
                                            displayFoods = [activity.food_type]
                                        }
                                    }
                                } catch (e) {
                                    if (activity.food_type) displayFoods = [activity.food_type]
                                }

                                const hasFoods = displayFoods.length > 0

                                // If we have an amount, show amount with tooltip for foods
                                if (activity.food_amount) {
                                    return (
                                        <div className="group relative flex items-center text-right">
                                            <span className="font-bold text-[10px] px-1.5 py-0.5 rounded text-orange-600 dark:text-orange-400 bg-orange-500/10 shrink-0 border border-orange-500/20 whitespace-nowrap">
                                                {activity.food_amount}
                                            </span>

                                            {hasFoods && (
                                                <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block z-50 min-w-max pointer-events-none origin-bottom-right">
                                                    <div className="bg-popover text-popover-foreground px-2 py-1.5 rounded-md border shadow-md flex flex-wrap gap-1 justify-end max-w-[200px]">
                                                        {displayFoods.map((food, i) => (
                                                            <span key={i} className="text-[10px] font-medium px-1 rounded bg-orange-50 text-orange-700 border border-orange-100">
                                                                {food}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                }

                                // If no amount, just show foods
                                if (hasFoods) {
                                    return (
                                        <div className="flex items-center gap-1 flex-wrap justify-end">
                                            {displayFoods.map((food, i) => (
                                                <span key={i} className="font-medium text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 whitespace-nowrap">
                                                    {food}
                                                </span>
                                            ))}
                                        </div>
                                    )
                                }

                                return null
                            })()}
                        </div>
                    )}

                    {isPoop && (
                        <div className="flex items-center gap-1.5 justify-end shrink-0 whitespace-nowrap">
                            {activity.poop_color && (
                                <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400 whitespace-nowrap">
                                    <span className={cn(
                                        "w-2 h-2 rounded-full shrink-0",
                                        (activity.poop_color === "Yellow" || activity.poop_color === "yellow") && "bg-yellow-400",
                                        (activity.poop_color === "Green" || activity.poop_color === "green") && "bg-green-600",
                                        (activity.poop_color === "Brown" || activity.poop_color === "brown") && "bg-amber-800",
                                        (activity.poop_color === "Black" || activity.poop_color === "black") && "bg-slate-900",
                                        (activity.poop_color === "Red" || activity.poop_color === "red") && "bg-red-600",
                                        (activity.poop_color === "White/Clay" || activity.poop_color === "White" || activity.poop_color === "Clay") && "bg-slate-200",
                                    )} />
                                    {language === 'zh' ? {
                                        'Yellow': '黄', 'yellow': '黄',
                                        'Green': '绿', 'green': '绿',
                                        'Brown': '褐', 'brown': '褐',
                                        'Black': '黑', 'black': '黑',
                                        'Red': '红', 'red': '红',
                                        'White/Clay': '灰白', 'White': '灰白', 'Clay': '灰白'
                                    }[activity.poop_color] || activity.poop_color : activity.poop_color}
                                </span>
                            )}
                            {activity.poop_consistency && (
                                <span className="font-medium text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 whitespace-nowrap">
                                    {language === 'zh' ? {
                                        'Watery': '水样', 'Loose/Mushy': '糊状', 'Soft': '软便', 'Normal': '正常', 'Hard': '硬便', 'Pellets': '羊屎蛋'
                                    }[activity.poop_consistency] || activity.poop_consistency : activity.poop_consistency}
                                </span>
                            )}
                        </div>
                    )}

                    {isSleep && (
                        <span className={cn(
                            "font-bold text-[10px] px-1.5 py-0.5 rounded text-right min-w-[56px] shrink-0 transition-colors",
                            activity.end_time ? "text-primary bg-primary/10" : "text-primary bg-primary/30 animate-pulse border border-primary/20",
                            isExporting && "text-[11px] px-2 py-0.5 min-w-[65px] rounded-md shadow-sm"
                        )}>
                            {activity.end_time ? (() => {
                                const diffMins = Math.round((new Date(activity.end_time).getTime() - new Date(activity.start_time).getTime()) / (1000 * 60))
                                const hours = Math.floor(diffMins / 60)
                                const mins = diffMins % 60
                                return hours > 0 ? `${hours}h${mins}m` : `${mins}m`
                            })() : t("duration.ongoing")}
                        </span>
                    )}

                    {isFeeding && (
                        <span className={cn(
                            "font-bold text-[10px] px-1.5 py-0.5 rounded text-right min-w-[56px] shrink-0 transition-colors text-chart-3 bg-chart-3/10",
                            isExporting && "text-[11px] px-2 py-0.5 min-w-[65px] rounded-md shadow-sm"
                        )}>
                            {`${activity.volume}ml`}
                        </span>
                    )}
                </div>

                {/* 操作按钮 - 导出时隐藏 */}
                {!isExporting && (
                    <div className="flex items-center gap-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity ml-2">
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
                                    end_time: endLocal,
                                    poop_color: activity.poop_color,
                                    poop_consistency: activity.poop_consistency,
                                    food_amount: activity.food_amount,
                                    food_type: activity.food_type
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
                            {editingActivity?.type === 'feeding' && <Milk className="w-5 h-5 text-chart-3" />}
                            {editingActivity?.type === 'sleep' && <Moon className="w-5 h-5 text-primary" />}
                            {editingActivity?.type === 'solid_food' && <Utensils className="w-5 h-5 text-orange-600" />}
                            {editingActivity?.type === 'poop' && <Baby className="w-5 h-5 text-amber-700" />}

                            {editingActivity?.type === 'feeding' && t("form.feeding")}
                            {editingActivity?.type === 'sleep' && t("form.sleep")}
                            {editingActivity?.type === 'solid_food' && (language === 'zh' ? "辅食" : "Solid Food")}
                            {editingActivity?.type === 'poop' && (language === 'zh' ? "臭臭" : "Diaper")}
                            {" "}{t("common.edit")}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label className="text-xs font-medium opacity-70">记录类型</Label>
                            <div className="px-3 py-2 bg-muted/50 rounded-lg text-sm font-medium border border-muted flex items-center gap-2">
                                <span className={cn(
                                    "w-2 h-2 rounded-full",
                                    editingActivity?.type === 'feeding' && "bg-chart-3",
                                    editingActivity?.type === 'sleep' && "bg-primary",
                                    editingActivity?.type === 'solid_food' && "bg-orange-600",
                                    editingActivity?.type === 'poop' && "bg-amber-700",
                                )} />
                                {editingActivity?.type === 'feeding' && t("form.feeding")}
                                {editingActivity?.type === 'sleep' && t("form.sleep")}
                                {editingActivity?.type === 'solid_food' && (language === 'zh' ? "辅食" : "Solid Food")}
                                {editingActivity?.type === 'poop' && (language === 'zh' ? "臭臭" : "Diaper")}
                                <span className="ml-auto text-[10px] text-muted-foreground uppercase tracking-widest">Read Only</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="startTime" className="text-xs font-medium opacity-70">
                                    {t("form.start_time")}
                                </Label>
                                <Input
                                    id="startTime"
                                    type="time"
                                    value={editValues.start_time || ""}
                                    onChange={(e) => setEditValues({ ...editValues, start_time: e.target.value })}
                                    className="bg-background/50 border-muted focus:border-primary"
                                />
                            </div>

                            {editingActivity?.type === 'feeding' && (
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
                            )}

                            {editingActivity?.type === 'solid_food' && (
                                <div className="grid gap-2">
                                    <Label htmlFor="food_amount" className="text-xs font-medium opacity-70">{language === 'zh' ? "饭量" : "Amount"}</Label>
                                    <Input
                                        id="food_amount"
                                        type="text"
                                        value={editValues.food_amount || ""}
                                        onChange={(e) => setEditValues({ ...editValues, food_amount: e.target.value })}
                                        className="bg-background/50 border-muted focus:border-primary"
                                    />
                                </div>
                            )}

                            {editingActivity?.type === 'sleep' && (
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

                        {editingActivity?.type === 'poop' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label className="text-xs font-medium opacity-70">{language === 'zh' ? "颜色" : "Color"}</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-muted bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        value={editValues.poop_color || ""}
                                        onChange={(e) => setEditValues({ ...editValues, poop_color: e.target.value })}
                                    >
                                        <option value="">Select...</option>
                                        <option value="Yellow">Yellow (黄)</option>
                                        <option value="Green">Green (绿)</option>
                                        <option value="Brown">Brown (褐)</option>
                                        <option value="Black">Black (黑)</option>
                                        <option value="Red">Red (红)</option>
                                        <option value="White/Clay">White (灰白)</option>
                                    </select>
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-xs font-medium opacity-70">{language === 'zh' ? "性状" : "Consistency"}</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-muted bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        value={editValues.poop_consistency || ""}
                                        onChange={(e) => setEditValues({ ...editValues, poop_consistency: e.target.value })}
                                    >
                                        <option value="">Select...</option>
                                        <option value="Watery">Watery (水样)</option>
                                        <option value="Loose/Mushy">Loose (糊状)</option>
                                        <option value="Soft">Soft (软便)</option>
                                        <option value="Normal">Normal (正常)</option>
                                        <option value="Hard">Hard (硬便)</option>
                                        <option value="Pellets">Pellets (羊屎蛋)</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {editingActivity?.type === 'solid_food' && (
                            <div className="grid gap-2">
                                <Label htmlFor="food_type" className="text-xs font-medium opacity-70">{language === 'zh' ? "食物类型" : "Food Type"}</Label>
                                <FoodSelector
                                    value={(() => {
                                        try {
                                            const raw = editValues.food_type
                                            if (!raw) return []
                                            if (raw.startsWith("[")) return JSON.parse(raw)
                                            return [raw]
                                        } catch {
                                            return editValues.food_type ? [editValues.food_type] : []
                                        }
                                    })()}
                                    onChange={(foods) => setEditValues({ ...editValues, food_type: JSON.stringify(foods) })}
                                    library={library}
                                    onAddCustom={handleAddCustomFood}
                                />
                            </div>
                        )}

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

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{t("common.confirm_delete")}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 text-muted-foreground text-sm">
                        {language === 'zh' ? "确定要删除这条记录吗？此操作无法撤销。" : "Are you sure you want to delete this record? This action cannot be undone."}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setItemToDelete(null)} className="h-10">
                            {t("common.cancel")}
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete} className="h-10 px-6">
                            {language === 'zh' ? "删除" : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
