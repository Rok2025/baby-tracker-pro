"use client"

import { ThemeToggle } from "../ThemeToggle"
import { LanguageToggle } from "../LanguageToggle"
import { useLanguage } from "../LanguageProvider"

export function TopBar() {
    const { t } = useLanguage()

    return (
        <div className="absolute top-4 right-4 md:right-8 z-50 flex items-center gap-3">
            <div className="hidden sm:block mr-2 text-xs font-medium text-muted-foreground bg-white/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-black/5">
                BabyTracker Pro
            </div>
            <ThemeToggle />
            <LanguageToggle />
        </div>
    )
}
