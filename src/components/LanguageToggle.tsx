"use client"

import { useLanguage } from "./LanguageProvider"
import { Button } from "@/components/ui/button"
import { Globe } from "lucide-react"

export function LanguageToggle() {
    const { language, setLanguage } = useLanguage()

    return (
        <Button
            variant="ghost"
            size="sm"
            className="rounded-full px-4 h-10 bg-white/20 hover:bg-white/40 border border-white/10 hover:border-white/20 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-sm flex items-center gap-2 font-medium group"
            onClick={() => setLanguage(language === "en" ? "zh" : "en")}
        >
            <Globe className="w-4 h-4" />
            <span>{language === "en" ? "EN" : "ZH"}</span>
        </Button>
    )
}
