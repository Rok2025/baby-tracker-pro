"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, History, Settings, Milk, Moon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/LanguageProvider"
import { useEffect, useState } from "react"
import { supabase, Activity } from "@/lib/supabase"
import { ThemeToggle } from "../ThemeToggle"
import { LanguageToggle } from "../LanguageToggle"
import { useAuth } from "@/components/AuthProvider"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import pkg from "../../../package.json"

export function Sidebar() {
    const pathname = usePathname()
    const { t } = useLanguage()
    const { user, signOut } = useAuth()
    const [stats, setStats] = useState({ milk: 0, sleepMins: 0 })

    useEffect(() => {
        async function fetchTodayStats() {
            const now = new Date()
            const startOfDay = new Date(now)
            startOfDay.setHours(0, 0, 0, 0)
            const endOfDay = new Date(now)
            endOfDay.setHours(23, 59, 59, 999)

            const { data: activities, error } = await supabase
                .from("activities")
                .select("*")
                .lte("start_time", endOfDay.toISOString())
                .or(`end_time.gte.${startOfDay.toISOString()},end_time.is.null`)

            if (error) {
                console.error("Sidebar stats fetch error:", error)
                return
            }

            if (activities) {
                let milk = 0
                let sleepMins = 0
                activities.forEach((act: Activity) => {
                    const actStart = new Date(act.start_time)
                    const actEnd = act.end_time ? new Date(act.end_time).getTime() : actStart.getTime()

                    // Same logic as SummaryCards for consistency
                    if (act.type === "feeding" && act.volume) {
                        if (actStart >= startOfDay && actStart <= endOfDay) {
                            milk += act.volume
                        }
                    }
                    if (act.type === "sleep" && act.start_time && act.end_time) {
                        const dayStart = startOfDay.getTime()
                        const dayEnd = endOfDay.getTime()
                        if (actEnd >= dayStart && actEnd <= dayEnd) {
                            sleepMins += (actEnd - actStart.getTime()) / (1000 * 60)
                        }
                    }
                })
                setStats({ milk, sleepMins })
            }
        }

        fetchTodayStats()
        // Simple polling to keep it fresh
        const interval = setInterval(fetchTodayStats, 60000) // Increased interval to 1 min to reduce load
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
                    const isActive = item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.href)
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
                <div className="mt-4 flex items-center justify-center gap-4">
                    <ThemeToggle />
                    <LanguageToggle />
                </div>
                {user && (
                    <div className="mt-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-muted-foreground hover:text-destructive"
                            onClick={() => signOut()}
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            {user.email?.split('@')[0]}
                        </Button>
                    </div>
                )}
                <div className="mt-4 text-center">
                    <span className="text-[10px] text-muted-foreground opacity-50">v{pkg.version}</span>
                </div>
            </div>
        </div>
    )
}
