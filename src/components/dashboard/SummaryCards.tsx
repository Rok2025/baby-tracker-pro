"use client"

import { useEffect, useState, useMemo } from "react"
import { Milk, Moon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { supabase, Activity } from "@/lib/supabase"
import { useLanguage } from "@/components/LanguageProvider"
import { cn } from "@/lib/utils"

interface Standard {
    milk: number
    sleep: number
}

export function SummaryCards({ refreshKey, date = new Date(), activities = [], user, forceSingleColumn = false, isExporting = false }: { refreshKey: number; date?: Date; activities?: Activity[]; user?: any, forceSingleColumn?: boolean, isExporting?: boolean }) {
    const [standards, setStandards] = useState<Standard>({ milk: 800, sleep: 600 }) // Default 800ml, 10h
    const { t } = useLanguage()

    useEffect(() => {
        if (!user) return

        async function fetchConfig() {
            const { data: configData } = await supabase
                .from("user_config")
                .select("*")
                .eq("user_id", user?.id)

            if (configData) {
                const newStandards = { milk: 800, sleep: 600 }
                configData.forEach(item => {
                    const val = parseFloat(item.value)
                    if (isNaN(val)) return
                    if (item.key === "target_milk_ml") newStandards.milk = val
                    if (item.key === "target_sleep_hours") newStandards.sleep = val * 60
                })
                setStandards(newStandards)
            }
        }

        fetchConfig()
    }, [user, refreshKey])

    const data = useMemo(() => {
        // Get local start and end of day
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
                const actStart = new Date(act.start_time).getTime()
                const actEnd = new Date(act.end_time).getTime()
                const dayStart = startOfDay.getTime()
                const dayEnd = endOfDay.getTime()

                // 如果睡眠在所选日期内结束，则将完整时长计入该日期
                if (actEnd >= dayStart && actEnd <= dayEnd) {
                    sleepMins += (actEnd - actStart) / (1000 * 60)
                }
            }
        })

        return { totalVolume: volume, totalSleepMinutes: sleepMins }
    }, [activities, date.toDateString()]) // Stable dependency using toDateString()

    const roundedSleepMinutes = Math.round(data.totalSleepMinutes)
    const sleepHours = Math.floor(roundedSleepMinutes / 60)
    const sleepMins = roundedSleepMinutes % 60

    // Color logic based on standards
    const milkColor = data.totalVolume >= standards.milk ? "text-primary bg-primary/10" : "text-destructive bg-destructive/10"
    const sleepColor = roundedSleepMinutes >= standards.sleep ? "text-primary bg-primary/10" : "text-destructive bg-destructive/10"

    return (
        <div className={cn(
            "grid gap-4 mb-4",
            forceSingleColumn ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2",
            isExporting && "grid-cols-2 gap-2 mb-2"
        )}>
            <Card className={cn(
                "border-none shadow-2xl transition-all duration-500 overflow-hidden bg-card/60 backdrop-blur-xl flex flex-col",
                milkColor,
                isExporting && "shadow-sm rounded-lg h-full"
            )}>
                <CardContent className={cn("p-4 flex items-center justify-between flex-1", isExporting && "p-2 px-3")}>
                    <div className="space-y-0 min-w-0">
                        <p className={cn("text-xs font-medium opacity-80 uppercase tracking-wider", isExporting && "text-[8px] font-bold opacity-50")}>{t("summary.milk")}</p>
                        <div className="flex flex-col">
                            <div className="flex items-baseline gap-0.5">
                                <span className={cn(
                                    "font-extrabold transition-all tabular-nums drop-shadow-sm truncate tracking-tighter",
                                    isExporting ? "text-2xl" : (data.totalVolume > 999 ? "text-3xl" : "text-4xl")
                                )}>{data.totalVolume}</span>
                                {!isExporting && (
                                    <>
                                        <span className="text-lg opacity-50 font-light">/</span>
                                        <span className="text-lg opacity-50 font-medium tabular-nums">{standards.milk}</span>
                                        <span className="text-base opacity-80 uppercase font-semibold">ml</span>
                                    </>
                                )}
                            </div>
                            {isExporting && (
                                <div className="flex items-baseline opacity-30 font-bold -mt-1 scale-90 origin-left">
                                    <span className="text-[10px]">/</span>
                                    <span className="text-[10px] tabular-nums">{standards.milk}</span>
                                    <span className="text-[8px] uppercase ml-0.5">ml</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className={cn("p-2 bg-white/20 dark:bg-black/20 rounded-xl shrink-0", isExporting && "p-0 bg-transparent opacity-20")}>
                        <Milk className={cn("w-7 h-7", isExporting && "w-6 h-6")} />
                    </div>
                </CardContent>
                <div className={cn("h-1.5 bg-black/5 dark:bg-white/5 w-full mt-auto", isExporting && "h-1")}>
                    <div
                        className="h-full bg-current transition-all duration-1000"
                        style={{ width: `${Math.min((data.totalVolume / standards.milk) * 100, 100)}%` }}
                    />
                </div>
            </Card>

            <Card className={cn(
                "border-none shadow-2xl transition-all duration-500 overflow-hidden bg-card/60 backdrop-blur-xl flex flex-col",
                sleepColor,
                isExporting && "shadow-sm rounded-lg h-full"
            )}>
                <CardContent className={cn("p-4 flex items-center justify-between flex-1", isExporting && "p-2 px-3")}>
                    <div className="space-y-0 min-w-0">
                        <p className={cn("text-xs font-medium opacity-80 uppercase tracking-wider", isExporting && "text-[8px] font-bold opacity-50")}>{t("summary.sleep")}</p>
                        <div className="flex flex-col">
                            <div className="flex items-baseline gap-0.5">
                                <span className={cn(
                                    "font-extrabold transition-all tabular-nums drop-shadow-sm whitespace-nowrap tracking-tighter",
                                    isExporting ? "text-2xl" : ((sleepHours.toString().length + sleepMins.toString().length) > 3 ? "text-3xl" : "text-4xl")
                                )}>
                                    {sleepHours}{t("duration.hours")}{sleepMins}{t("duration.mins")}
                                </span>
                                {!isExporting && (
                                    <>
                                        <span className="text-lg opacity-50 font-light">/</span>
                                        <span className="text-lg opacity-50 font-medium">{standards.sleep / 60}{t("duration.hours")}</span>
                                    </>
                                )}
                            </div>
                            {isExporting && (
                                <div className="flex items-baseline opacity-30 font-bold -mt-1 scale-90 origin-left">
                                    <span className="text-[10px]">/</span>
                                    <span className="text-[10px] whitespace-nowrap">{standards.sleep / 60}{t("duration.hours")}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className={cn("p-2 bg-white/20 dark:bg-black/20 rounded-xl shrink-0", isExporting && "p-0 bg-transparent opacity-20")}>
                        <Moon className={cn("w-7 h-7", isExporting && "w-6 h-6")} />
                    </div>
                </CardContent>
                <div className={cn("h-1.5 bg-black/5 dark:bg-white/5 w-full mt-auto", isExporting && "h-1")}>
                    <div
                        className="h-full bg-current transition-all duration-1000"
                        style={{ width: `${Math.min((roundedSleepMinutes / standards.sleep) * 100, 100)}%` }}
                    />
                </div>
            </Card>
        </div>
    )
}
