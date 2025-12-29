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

export function ActivityFeed({ refreshKey, onUpdate, date = new Date() }: { refreshKey: number, onUpdate: () => void, date?: Date }) {
    const [activities, setActivities] = useState<Activity[]>([])
    const [loading, setLoading] = useState(true)
    const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
    const [editValues, setEditValues] = useState<Partial<Activity>>({})

    useEffect(() => {
        async function fetchActivities() {
            // Get local start and end of day
            const startOfDay = new Date(date)
            startOfDay.setHours(0, 0, 0, 0)
            const endOfDay = new Date(date)
            endOfDay.setHours(23, 59, 59, 999)

            const { data, error } = await supabase
                .from("activities")
                .select("*")
                .gte("start_time", startOfDay.toISOString())
                .lte("start_time", endOfDay.toISOString())
                .order("start_time", { ascending: false })

            if (error) {
                toast.error("Failed to load activities")
            } else {
                setActivities(data || [])
            }
            setLoading(false)
        }

        fetchActivities()
    }, [refreshKey, date])

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
            <Card className="border-none shadow-xl bg-white/30 backdrop-blur-md overflow-hidden">
                <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-semibold flex items-center justify-between">
                        Recent Activities
                        <span className="text-xs font-normal text-muted-foreground bg-white/50 px-2 py-1 rounded-full border">
                            {date.toLocaleDateString() === new Date().toLocaleDateString() ? "Today" : date.toLocaleDateString()}
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-black/5">
                        {activities.length === 0 ? (
                            <div className="p-12 text-center text-muted-foreground italic">No activities recorded for this date yet.</div>
                        ) : (
                            activities.map((activity) => {
                                const isSleep = activity.type === "sleep"
                                return (
                                    <div
                                        key={activity.id}
                                        className={cn(
                                            "p-4 flex items-center justify-between transition-colors group",
                                            isSleep ? "hover:bg-[#DCFCE7]/50" : "hover:bg-[#FCE7F3]/50"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "p-3 rounded-full shadow-sm",
                                                isSleep ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#FCE7F3] text-[#9D174D]"
                                            )}>
                                                {isSleep ? <Moon className="w-5 h-5" /> : <Milk className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold capitalize text-lg">{activity.type}</span>
                                                    <span className="text-xs text-muted-foreground bg-black/5 px-2 py-0.5 rounded-full">
                                                        {new Date(activity.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    {isSleep ? (
                                                        activity.end_time
                                                            ? `Duration: ${Math.round((new Date(activity.end_time).getTime() - new Date(activity.start_time).getTime()) / (1000 * 60))} mins`
                                                            : "Ongoing..."
                                                    ) : (
                                                        `${activity.volume}ml intake`
                                                    )}
                                                    {activity.note && <span className="block mt-0.5 italic text-xs">• {activity.note}</span>}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-9 w-9 text-muted-foreground hover:text-primary"
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
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-9 w-9 text-muted-foreground hover:text-destructive"
                                                onClick={() => handleDelete(activity.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
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
