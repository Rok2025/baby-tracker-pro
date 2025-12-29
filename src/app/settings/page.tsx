"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Settings as SettingsIcon, Save } from "lucide-react"
import { useLanguage } from "@/components/LanguageProvider"

export default function SettingsPage() {
    const [milkTarget, setMilkTarget] = useState(800)
    const [sleepTarget, setSleepTarget] = useState(10)
    const [loading, setLoading] = useState(false)
    const { t } = useLanguage()

    useEffect(() => {
        async function fetchConfig() {
            const { data, error } = await supabase.from("user_config").select("*")
            if (data) {
                data.forEach(item => {
                    if (item.key === "target_milk_ml") setMilkTarget(parseFloat(item.value))
                    if (item.key === "target_sleep_hours") setSleepTarget(parseFloat(item.value))
                })
            }
        }
        fetchConfig()
    }, [])

    async function handleSave() {
        setLoading(true)
        try {
            await supabase.from("user_config").upsert([
                { key: "target_milk_ml", value: milkTarget.toString() },
                { key: "target_sleep_hours", value: sleepTarget.toString() }
            ], { onConflict: "key" })
            toast.success("Settings saved successfully!")
        } catch (err: any) {
            toast.error("Failed to save settings")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <header className="flex items-center gap-3">
                <div className="p-3 bg-primary/20 rounded-2xl">
                    <SettingsIcon className="w-8 h-8 text-primary" />
                </div>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{t("settings.title")}</h2>
                    <p className="text-muted-foreground">{t("settings.subtitle")}</p>
                </div>
            </header>

            <Card className="border-none shadow-xl bg-white/50 backdrop-blur-md">
                <CardHeader>
                    <CardTitle className="text-xl">{t("settings.daily_standards")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="milk">{t("settings.milk_target")}</Label>
                        <div className="flex gap-4 items-center">
                            <Input
                                id="milk"
                                type="number"
                                value={milkTarget}
                                onChange={(e) => setMilkTarget(parseInt(e.target.value))}
                                className="bg-white/80"
                            />
                            <span className="text-muted-foreground font-medium">ml</span>
                        </div>
                        <p className="text-xs text-muted-foreground italic">{t("settings.milk_standard")}</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="sleep">{t("settings.sleep_target")}</Label>
                        <div className="flex gap-4 items-center">
                            <Input
                                id="sleep"
                                type="number"
                                value={sleepTarget}
                                onChange={(e) => setSleepTarget(parseInt(e.target.value))}
                                className="bg-white/80"
                            />
                            <span className="text-muted-foreground font-medium">h</span>
                        </div>
                        <p className="text-xs text-muted-foreground italic">{t("settings.sleep_standard")}</p>
                    </div>

                    <Button onClick={handleSave} className="w-full h-12 gap-2" disabled={loading}>
                        <Save className="w-5 h-5" />
                        {loading ? "..." : t("settings.save")}
                    </Button>
                </CardContent>
            </Card>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
                <strong>Tip:</strong> {t("settings.tip")}
            </div>
        </div>
    )
}
