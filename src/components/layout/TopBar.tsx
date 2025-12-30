"use client"

import { ThemeToggle } from "../ThemeToggle"
import { LanguageToggle } from "../LanguageToggle"
import { useLanguage } from "../LanguageProvider"

export function TopBar() {
    const { t } = useLanguage()

    return (
        <div className="absolute top-4 right-4 md:right-8 z-50 flex items-center gap-3">
            <ThemeToggle />
            <LanguageToggle />
        </div>
    )
}
