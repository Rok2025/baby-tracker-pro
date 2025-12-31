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

export function ActivityFeed({
    refreshKey,
    onUpdate,
    date = new Date(),
    activities = [],
    loading = false,
    maxHeight = "400px"
}: {
    refreshKey: number,
    onUpdate: () => void,
    date?: Date,
    activities?: Activity[],
    loading?: boolean,
    maxHeight?: string
}) {
    const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
    const [editValues, setEditValues] = useState<Partial<Activity>>({})
    const { t, language } = useLanguage()

    async function handleDelete(id: string) {
        const { error } = await supabase.from("activities").delete().eq("id", id)
        if (error) {
            toast.error("Failed to delete entry")
        } else {
            toast.success("Entry deleted")
            onUpdate()
        }
    }

    async function handleUpdate() {
        if (!editingActivity) return
        const { error } = await supabase
            .from("activities")
            .update(editValues)
            .eq("id", editingActivity.id)

        if (error) {
            toast.error("Failed to update entry")
        } else {
            toast.success("Entry updated")
            setEditingActivity(null)
            onUpdate()
        }
    }

    if (loading) return <div className="p-8 text-center text-muted-foreground">Loading activities...</div>

    return (
        <>
            <Card className="border-none shadow-2xl bg-card/60 backdrop-blur-xl overflow-hidden w-full flex flex-col">
                <CardHeader className="pb-0 pt-2 px-6">
                    <CardTitle className="text-base font-semibold flex items-center justify-between">
                        {t("recent.activities")}
                        <span className="text-[10px] font-medium text-muted-foreground bg-background/60 px-2 py-0.5 rounded-full border border-muted">
                            {date.toLocaleDateString() === new Date().toLocaleDateString() ? t("recent.today") : date.toLocaleDateString()}
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
                                        isSleep ? "hover:bg-primary/10" : "hover:bg-chart-3/10"
                                    )}
                                >
                                    {/* 图标 */}
                                    <div className={cn(
                                        "p-1.5 rounded shrink-0",
                                        isSleep ? "bg-primary/20 text-primary" : "bg-chart-3/20 text-chart-3"
                                    )}>
                                        {isSleep ? <Moon className="w-3.5 h-3.5" /> : <Milk className="w-3.5 h-3.5" />}
                                    </div>

                                    {/* 时间 */}
                                    <span className="text-xs text-muted-foreground font-medium tabular-nums min-w-[85px] shrink-0">
                                        {(() => {
                                            const start = formatTime(activity.start_time)
                                            if (isSleep && activity.end_time) {
                                                const end = formatTime(activity.end_time)
                                                return `${start}-${end}`
                                            }
                                            return start
                                        })()}
                                    </span>

                                    {/* 关键数据：睡眠时长或喝奶量 - 固定宽度右对齐 */}
                                    <span className={cn(
                                        "font-bold text-sm px-1.5 py-0.5 rounded text-right min-w-[56px] shrink-0",
                                        isSleep ? "text-primary bg-primary/10" : "text-chart-3 bg-chart-3/10"
                                    )}>
                                        {isSleep ? (
                                            activity.end_time ? (() => {
                                                const diffMins = Math.round((new Date(activity.end_time).getTime() - new Date(activity.start_time).getTime()) / (1000 * 60))
                                                const hours = Math.floor(diffMins / 60)
                                                const mins = diffMins % 60
                                                return hours > 0 ? `${hours}h${mins}m` : `${mins}m`
                                            })() : '...'
                                        ) : (
                                            `${activity.volume}ml`
                                        )}
                                    </span>

                                    {/* 操作按钮 */}
                                    <div className="flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5 text-muted-foreground hover:text-primary"
                                            onClick={() => {
                                                setEditingActivity(activity)
                                                setEditValues({
                                                    volume: activity.volume,
                                                    note: activity.note,
                                                    start_time: activity.start_time,
                                                    end_time: activity.end_time
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
                                </div>
                            )
                        }

                        return (
                            <div
                                className="grid grid-cols-3 gap-2 overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent"
                                style={{ maxHeight }}
                            >
                                {periods.map(({ key, label, icon }) => (
                                    <div key={key} className="min-w-0">
                                        {/* 时段标题 */}
                                        <div className="flex items-center gap-1 px-1.5 py-1 mb-1 border-b border-muted/30">
                                            <span className="text-xs">{icon}</span>
                                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
                                            {grouped[key] && (
                                                <span className="text-[9px] text-muted-foreground/60 ml-auto">{grouped[key].length}</span>
                                            )}
                                        </div>
                                        {/* 活动列表 */}
                                        <div className="space-y-0.5">
                                            {grouped[key]?.map(renderActivity) || (
                                                <div className="text-[10px] text-muted-foreground/50 italic px-1.5 py-2 text-center">-</div>
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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Activity</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {editingActivity?.type === "feeding" && (
                            <div className="grid gap-2">
                                <Label htmlFor="volume">Volume (ml)</Label>
                                <Input
                                    id="volume"
                                    type="number"
                                    value={editValues.volume || ""}
                                    onChange={(e) => setEditValues({ ...editValues, volume: parseInt(e.target.value) })}
                                />
                            </div>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="note">Note</Label>
                            <Input
                                id="note"
                                value={editValues.note || ""}
                                onChange={(e) => setEditValues({ ...editValues, note: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingActivity(null)}>Cancel</Button>
                        <Button onClick={handleUpdate}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
