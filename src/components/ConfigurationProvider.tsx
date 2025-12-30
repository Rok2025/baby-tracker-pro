"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type FontSize = "small" | "normal" | "large"

interface ConfigurationContextType {
    fontSize: FontSize
    setFontSize: (size: FontSize) => Promise<void>
    loading: boolean
}

const ConfigurationContext = createContext<ConfigurationContextType | undefined>(undefined)

export function ConfigurationProvider({ children }: { children: React.ReactNode }) {
    const [fontSize, setFontSizeState] = useState<FontSize>("normal")
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchConfig() {
            const { data } = await supabase.from("user_config").select("*")
            if (data) {
                const fontSizeItem = data.find(item => item.key === "font_size")
                if (fontSizeItem) {
                    setFontSizeState(fontSizeItem.value as FontSize)
                }
            }
            setLoading(false)
        }
        fetchConfig()
    }, [])

    useEffect(() => {
        // Apply font size to document
        const root = document.documentElement
        const sizes = {
            small: "14px",
            normal: "16px",
            large: "18px"
        }
        root.style.setProperty("--base-font-size", sizes[fontSize])
    }, [fontSize])

    const setFontSize = async (size: FontSize) => {
        setFontSizeState(size)
        await supabase.from("user_config").upsert({ key: "font_size", value: size }, { onConflict: "key" })
    }

    return (
        <ConfigurationContext.Provider value={{ fontSize, setFontSize, loading }}>
            {children}
        </ConfigurationContext.Provider>
    )
}

export function useConfiguration() {
    const context = useContext(ConfigurationContext)
    if (context === undefined) {
        throw new Error("useConfiguration must be used within a ConfigurationProvider")
    }
    return context
}
