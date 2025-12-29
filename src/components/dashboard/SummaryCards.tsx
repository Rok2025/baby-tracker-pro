"use client"

import { useEffect, useState } from "react"
import { Milk, Moon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { useLanguage } from "@/components/LanguageProvider"
import { cn } from "@/lib/utils"

interface SummaryData {
    totalVolume: number
    totalSleepMinutes: number
}

interface Standard {
    milk: number
    sleep: number
}

export function SummaryCards({ refreshKey, date = new Date() }: { refreshKey: number; date?: Date }) {
    const [data, setData] = useState<SummaryData>({ totalVolume: 0, totalSleepMinutes: 0 })
    const [standards, setStandards] = useState<Standard>({ milk: 800, sleep: 600 }) // Default 800ml, 10h
    const { t } = useLanguage()

    useEffect(() => {
        async function fetchConfig() {
            const { data: configData } = await supabase.from("user_config").select("*")
            if (configData) {
                const newStandards = { milk: 800, sleep: 600 } // Start with defaults (10h)
                configData.forEach(item => {
                    const val = parseFloat(item.value)
                    if (isNaN(val)) return
                    if (item.key === "target_milk_ml") newStandards.milk = val
                    if (item.key === "target_sleep_hours") newStandards.sleep = val * 60
                })
                setStandards(newStandards)
            }
        }

        async function fetchData() {
            // Get local start and end of day
            const startOfDay = new Date(date)
            startOfDay.setHours(0, 0, 0, 0)
            const endOfDay = new Date(date)
            endOfDay.setHours(23, 59, 59, 999)

            const { data: activities, error } = await supabase
                .from("activities")
                .select("*")
                .or(`start_time.gte.${startOfDay.toISOString()},end_time.gte.${startOfDay.toISOString()}`)
                .lte("start_time", endOfDay.toISOString())

            if (error) {
                console.error("Error fetching summaries:", error)
                return
            }

            let volume = 0
            let sleepMins = 0

            activities.forEach((act) => {
                if (act.type === "feeding" && act.volume) {
                    // Only count feeding if it started today
                    const actStart = new Date(act.start_time)
                    if (actStart >= startOfDay && actStart <= endOfDay) {
                        volume += act.volume
                    }
                }
                if (act.type === "sleep" && act.start_time && act.end_time) {
                    const startRaw = new Date(act.start_time).getTime()
                    const endRaw = new Date(act.end_time).getTime()

                    // Rule: Any sleep session that ENDS on the selected day counts fully towards this day
                    const dayStart = startOfDay.getTime()
                    const dayEnd = endOfDay.getTime()

                    if (endRaw >= dayStart && endRaw <= dayEnd) {
                        sleepMins += (endRaw - startRaw) / (1000 * 60)
                    }
                }
            })

            setData({ totalVolume: volume, totalSleepMinutes: sleepMins })
        }

        fetchConfig()
        fetchData()
    }, [refreshKey, date])

    const roundedSleepMinutes = Math.round(data.totalSleepMinutes)
    const sleepHours = Math.floor(roundedSleepMinutes / 60)
    const sleepMins = roundedSleepMinutes % 60

    // Color logic based on standards
    const milkColor = data.totalVolume >= standards.milk ? "text-[#166534] bg-[#DCFCE7]" : "text-[#9D174D] bg-[#FCE7F3]"
    const sleepColor = roundedSleepMinutes >= standards.sleep ? "text-[#166534] bg-[#DCFCE7]" : "text-[#9D174D] bg-[#FCE7F3]"

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className={`border-none shadow-lg transition-all duration-500 overflow-hidden ${milkColor}`}>
                <CardContent className="p-6 flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-sm font-medium opacity-80 uppercase tracking-wider">{t("summary.milk")}</p>
                        <div className="flex items-baseline gap-1">
                            <span className={cn(
                                "font-bold transition-all tabular-nums",
                                data.totalVolume > 999 ? "text-3xl" : "text-4xl"
                            )}>{data.totalVolume}</span>
                            <span className="text-lg opacity-80 uppercase font-medium">ml</span>
                        </div>
                        <p className="text-xs opacity-60">{t("summary.target")}: {standards.milk}ml</p>
                    </div>
                    <div className="p-3 bg-white/20 rounded-2xl">
                        <Milk className="w-10 h-10" />
                    </div>
                </CardContent>
                {/* Simple Progress Indicator */}
                <div className="h-1.5 bg-black/5 w-full">
                    <div
                        className="h-full bg-current transition-all duration-1000"
                        style={{ width: `${Math.min((data.totalVolume / standards.milk) * 100, 100)}%` }}
                    />
                </div>
            </Card>

            <Card className={`border-none shadow-lg transition-all duration-500 overflow-hidden ${sleepColor}`}>
                <CardContent className="p-6 flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-sm font-medium opacity-80 uppercase tracking-wider">{t("summary.sleep")}</p>
                        <div className="flex items-baseline gap-1">
                            <span className={cn(
                                "font-bold transition-all tabular-nums",
                                (sleepHours.toString().length + sleepMins.toString().length) > 3 ? "text-3xl" : "text-4xl"
                            )}>
                                {sleepHours}{t("duration.hours")} {sleepMins}{t("duration.mins")}
                            </span>
                        </div>
                        <p className="text-xs opacity-60">{t("summary.target")}: {standards.sleep / 60}{t("duration.hours")}</p>
                    </div>
                    <div className="p-3 bg-white/20 rounded-2xl">
                        <Moon className="w-10 h-10" />
                    </div>
                </CardContent>
                <div className="h-1.5 bg-black/5 w-full">
                    <div
                        className="h-full bg-current transition-all duration-1000"
                        style={{ width: `${Math.min((roundedSleepMinutes / standards.sleep) * 100, 100)}%` }}
                    />
                </div>
            </Card>
        </div>
    )
}
