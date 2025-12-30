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
            <Card className="border-none shadow-2xl bg-card/60 backdrop-blur-xl overflow-hidden">
                <CardHeader className="pb-2 pt-4 px-6">
                    <CardTitle className="text-lg font-semibold flex items-center justify-between">
                        {t("recent.activities")}
                        <span className="text-[10px] font-medium text-muted-foreground bg-background/60 px-2 py-0.5 rounded-full border border-muted">
                            {date.toLocaleDateString() === new Date().toLocaleDateString() ? t("recent.today") : date.toLocaleDateString()}
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-2">
                    <div 
                        className="space-y-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent hover:scrollbar-thumb-primary/30 transition-colors"
                        style={{ maxHeight }}
                    >
                        {activities.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground italic text-sm">{t("recent.no_activities")}</div>
                        ) : (
                            activities.map((activity) => {
                                const isSleep = activity.type === "sleep"
                                return (
                                    <div
                                        key={activity.id}
                                        className={cn(
                                            "group flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200",
                                            isSleep ? "hover:bg-primary/10" : "hover:bg-chart-3/10"
                                        )}
                                    >
                                        <div className={cn(
                                            "p-2 rounded-lg shrink-0",
                                            isSleep ? "bg-primary/20 text-primary" : "bg-chart-3/20 text-chart-3"
                                        )}>
                                            {isSleep ? <Moon className="w-4 h-4" /> : <Milk className="w-4 h-4" />}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-sm capitalize">{t(`form.${activity.type}`)}</span>
                                                    <span className="text-[10px] font-medium text-muted-foreground">
                                                        {(() => {
                                                            const formatTime = (dateStr: string) => {
                                                                const date = new Date(dateStr)
                                                                if (isNaN(date.getTime())) return '--:--'
                                                                
                                                                const timeStr = date.toLocaleTimeString(language === 'zh' ? 'zh-CN' : 'en-US', { 
                                                                    hour: '2-digit', 
                                                                    minute: '2-digit',
                                                                    hour12: true 
                                                                })

                                                                if (language === 'zh') {
                                                                    // 统一处理：有些浏览器返回 "上午8:30"，有些返回 "8:30 AM"
                                                                    return timeStr.replace('AM', '上午').replace('PM', '下午')
                                                                }
                                                                return timeStr
                                                            }
                                                            
                                                            const start = formatTime(activity.start_time)
                                                            if (isSleep && activity.end_time) {
                                                                const end = formatTime(activity.end_time)
                                                                const isNextDay = new Date(activity.start_time).toLocaleDateString() !== new Date(activity.end_time).toLocaleDateString()
                                                                return (
                                                                    <>
                                                                        {`${start} - ${end}`}
                                                                        {isNextDay && <span className="ml-1 text-[8px] opacity-70">(+1d)</span>}
                                                                    </>
                                                                )
                                                            }
                                                            return start
                                                        })()}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity translate-x-1 group-hover:translate-x-0">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-white/50"
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
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-white/50"
                                                        onClick={() => handleDelete(activity.id)}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="flex items-baseline gap-2">
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {isSleep ? (
                                                        activity.end_time ? (() => {
                                                            const diffMins = Math.round((new Date(activity.end_time).getTime() - new Date(activity.start_time).getTime()) / (1000 * 60))
                                                            const hours = Math.floor(diffMins / 60)
                                                            const mins = diffMins % 60
                                                            return hours > 0 ? `${t("duration.label")}: ${hours}${t("duration.hours")} ${mins}${t("duration.mins")}` : `${t("duration.label")}: ${mins}${t("duration.mins")}`
                                                        })() : t("duration.ongoing")
                                                    ) : (
                                                        `${activity.volume}ml intake`
                                                    )}
                                                </p>
                                                {activity.note && (
                                                    <span className="text-[10px] text-muted-foreground/70 italic truncate border-l pl-2 border-black/10">
                                                        {activity.note}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
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
