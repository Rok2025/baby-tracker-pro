"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, History, Settings, Milk, Moon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/LanguageProvider"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export function Sidebar() {
    const pathname = usePathname()
    const { t } = useLanguage()
    const [stats, setStats] = useState({ milk: 0, sleepMins: 0 })

    useEffect(() => {
        async function fetchTodayStats() {
            const startOfDay = new Date()
            startOfDay.setHours(0, 0, 0, 0)
            const endOfDay = new Date()
            endOfDay.setHours(23, 59, 59, 999)

            const { data: activities } = await supabase
                .from("activities")
                .select("*")
                .or(`start_time.gte.${startOfDay.toISOString()},end_time.gte.${startOfDay.toISOString()}`)
                .lte("start_time", endOfDay.toISOString())

            if (activities) {
                let milk = 0
                let sleepMins = 0
                activities.forEach(act => {
                    if (act.type === "feeding" && act.volume) {
                        const actStart = new Date(act.start_time)
                        if (actStart >= startOfDay && actStart <= endOfDay) {
                            milk += act.volume
                        }
                    }
                    if (act.type === "sleep" && act.start_time && act.end_time) {
                        const startRaw = new Date(act.start_time).getTime()
                        const endRaw = new Date(act.end_time).getTime()
                        const dayStart = startOfDay.getTime()
                        const dayEnd = endOfDay.getTime()
                        if (endRaw >= dayStart && endRaw <= dayEnd) {
                            sleepMins += (endRaw - startRaw) / (1000 * 60)
                        }
                    }
                })
                setStats({ milk, sleepMins })
            }
        }

        fetchTodayStats()
        // Simple polling to keep it fresh
        const interval = setInterval(fetchTodayStats, 30000)
        return () => clearInterval(interval)
    }, [])

    const sleepHours = Math.floor(stats.sleepMins / 60)
    const sleepMins = Math.round(stats.sleepMins % 60)

    const navItems = [
        { name: t("app.dashboard"), href: "/", icon: LayoutDashboard },
        { name: t("app.history"), href: "/history", icon: History },
        { name: t("app.settings"), href: "/settings", icon: Settings },
    ]

    return (
        <div className="hidden md:flex flex-col w-64 border-r bg-sidebar h-screen sticky top-0">
            <div className="p-6">
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent italic">
                    {t("app.title")}
                </h1>
            </div>
            <nav className="flex-1 px-4 space-y-2">
                {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                                isActive
                                    ? "bg-primary text-primary-foreground shadow-md scale-105"
                                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            )}
                        >
                            <Icon className="w-5 h-5" />
                            <span className="font-medium">{item.name}</span>
                        </Link>
                    )
                })}
            </nav>
            <div className="p-6 border-t mt-auto">
                <div className="p-4 bg-secondary/10 rounded-2xl border border-secondary/20">
                    <p className="text-xs text-muted-foreground mb-2 italic">{t("sidebar.quick_stat")}</p>
                    <div className="space-y-1">
                        <p className="text-sm font-semibold flex items-center gap-2">
                            <span className="opacity-70">{t("sidebar.today")}:</span>
                            <span className="flex items-center gap-1">
                                {stats.milk}ml <Milk className="w-3 h-3 text-primary" />
                            </span>
                        </p>
                        <p className="text-sm font-semibold flex items-center gap-2">
                            <span className="opacity-70 invisible">{t("sidebar.today")}:</span>
                            <span className="flex items-center gap-1">
                                {sleepHours}{t("duration.hours")} {sleepMins}{t("duration.mins")} <Moon className="w-3 h-3 text-primary" />
                            </span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
