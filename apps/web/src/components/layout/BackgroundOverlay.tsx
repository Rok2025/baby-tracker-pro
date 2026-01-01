"use client"

import { useConfiguration } from "@/components/ConfigurationProvider"

export function BackgroundOverlay() {
    const { bgOpacity } = useConfiguration()

    return (
        <div
            className="fixed inset-0 z-0 bg-cover bg-center pointer-events-none transition-opacity duration-500"
            style={{
                backgroundImage: 'url(/baby-tracker-pro/baby-background.png)',
                opacity: bgOpacity
            }}
        />
    )
}
