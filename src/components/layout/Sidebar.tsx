"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, History, Settings, PlusCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "History", href: "/history", icon: History },
    { name: "Settings", href: "/settings", icon: Settings },
]

export function Sidebar() {
    const pathname = usePathname()

    return (
        <div className="hidden md:flex flex-col w-64 border-r bg-sidebar h-screen sticky top-0">
            <div className="p-6">
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent italic">
                    BabyTracker Pro
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
                    <p className="text-xs text-muted-foreground mb-2 italic">Quick Stat</p>
                    <p className="text-sm font-semibold">Today: 740ml 🍼</p>
                </div>
            </div>
        </div>
    )
}
