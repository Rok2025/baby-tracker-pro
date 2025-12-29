"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, History, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/LanguageProvider"

export function MobileNav() {
    const pathname = usePathname()
    const { t } = useLanguage()

    const navItems = [
        { name: t("app.dashboard_short"), href: "/", icon: LayoutDashboard },
        { name: t("app.history"), href: "/history", icon: History },
        { name: t("app.settings"), href: "/settings", icon: Settings },
    ]

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-t z-50 px-6 py-3 flex justify-between items-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex flex-col items-center gap-1 transition-all",
                            isActive ? "text-primary scale-110" : "text-muted-foreground"
                        )}
                    >
                        <Icon className="w-6 h-6" />
                        <span className="text-[10px] font-medium uppercase tracking-wider">{item.name}</span>
                        {isActive && <div className="w-1 h-1 bg-primary rounded-full mt-0.5" />}
                    </Link>
                )
            })}
        </div>
    )
}
