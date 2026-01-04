"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { supabase, UserConfig } from "@/lib/supabase"
import { toast } from "sonner"
import { Settings as SettingsIcon, Save, Loader2, Database } from "lucide-react"
import { useLanguage } from "@/components/LanguageProvider"
import { useAuth } from "@/components/AuthProvider"
import { useRouter } from "next/navigation"

import { useConfiguration } from "@/components/ConfigurationProvider"
import { ThemeToggle } from "@/components/ThemeToggle"

export default function SettingsPage() {
    const [milkTarget, setMilkTarget] = useState(800)
    const [sleepTarget, setSleepTarget] = useState(10)
    const [babyBirthDate, setBabyBirthDate] = useState('')
    const [babyName, setBabyName] = useState('')
    const [dataLoading, setDataLoading] = useState(false)
    const [migrating, setMigrating] = useState(false)
    const { t } = useLanguage()
    const { fontSize, setFontSize, bgOpacity, setBgOpacity } = useConfiguration()
    const { user, loading: authLoading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login")
        }
    }, [user, authLoading, router])

    useEffect(() => {
        if (!user) return

        async function fetchConfig() {
            const { data } = await supabase
                .from("user_config")
                .select("*")
                .eq("user_id", user?.id)
            if (data) {
                data.forEach((item: UserConfig) => {
                    if (item.key === "target_milk_ml") setMilkTarget(parseFloat(item.value))
                    if (item.key === "target_sleep_hours") setSleepTarget(parseFloat(item.value))
                    if (item.key === "baby_birth_date") setBabyBirthDate(item.value)
                    if (item.key === "baby_name") setBabyName(item.value)
                })
            }
        }
        fetchConfig()
    }, [user])

    if (authLoading || (!user && !authLoading)) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    const handleMigrate = async () => {
        if (!user) return
        setMigrating(true)
        try {
            // Migrate activities
            const { data: actData, error: actError } = await supabase
                .from("activities")
                .update({ user_id: user?.id })
                .is("user_id", null)
                .select()

            if (actError) throw actError
            const actCount = actData?.length || 0

            // Migrate config
            const { data: confData, error: confError } = await supabase
                .from("user_config")
                .update({ user_id: user?.id })
                .is("user_id", null)
                .select()

            if (confError) throw confError
            const confCount = confData?.length || 0

            toast.success(`成功迁移 ${actCount} 条活动记录和 ${confCount} 条配置信息！`)
        } catch (err) {
            console.error(err)
            toast.error("迁移失败：请确保数据库已添加 user_id 列，并暂时关闭了 RLS。")
        } finally {
            setMigrating(false)
        }
    }

    async function handleSave() {
        if (!user) return
        setDataLoading(true)
        try {
            await supabase.from("user_config").upsert([
                { user_id: user.id, key: "target_milk_ml", value: milkTarget.toString() },
                { user_id: user.id, key: "target_sleep_hours", value: sleepTarget.toString() },
                { user_id: user.id, key: "baby_name", value: babyName },
                { user_id: user.id, key: "baby_birth_date", value: babyBirthDate }
            ], { onConflict: "user_id,key" })
            toast.success("Settings saved successfully!")
        } catch (err) {
            toast.error("Failed to save settings")
        } finally {
            setDataLoading(false)
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

            <div className="grid gap-8">
                <Card className="border-none shadow-2xl bg-card/60 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold">{t("settings.daily_standards")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="milk" className="text-sm font-medium opacity-80">{t("settings.milk_target")}</Label>
                            <div className="flex gap-4 items-center">
                                <Input
                                    id="milk"
                                    type="number"
                                    value={milkTarget}
                                    onChange={(e) => setMilkTarget(parseInt(e.target.value))}
                                    className="bg-background/50 border-muted focus:border-primary transition-colors"
                                />
                                <span className="text-muted-foreground font-medium">ml</span>
                            </div>
                            <p className="text-xs text-muted-foreground italic">{t("settings.milk_standard")}</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="sleep" className="text-sm font-medium opacity-80">{t("settings.sleep_target")}</Label>
                            <div className="flex gap-4 items-center">
                                <Input
                                    id="sleep"
                                    type="number"
                                    value={sleepTarget}
                                    onChange={(e) => setSleepTarget(parseInt(e.target.value))}
                                    className="bg-background/50 border-muted focus:border-primary transition-colors"
                                />
                                <span className="text-muted-foreground font-medium">h</span>
                            </div>
                            <p className="text-xs text-muted-foreground italic">{t("settings.sleep_standard")}</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="babyName" className="text-sm font-medium opacity-80">宝宝名字</Label>
                            <Input
                                id="babyName"
                                type="text"
                                placeholder="例如：小宝、悦悦"
                                value={babyName}
                                onChange={(e) => setBabyName(e.target.value)}
                                className="bg-background/50 border-muted focus:border-primary transition-colors"
                            />
                            <p className="text-xs text-muted-foreground italic">设置后将在仪表盘显示宝宝的名字</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="birthDate" className="text-sm font-medium opacity-80">宝宝出生日期</Label>
                            <Input
                                id="birthDate"
                                type="date"
                                value={babyBirthDate}
                                onChange={(e) => setBabyBirthDate(e.target.value)}
                                className="bg-background/50 border-muted focus:border-primary transition-colors"
                            />
                            <p className="text-xs text-muted-foreground italic">设置后将在仪表盘显示宝宝多少天了</p>
                        </div>

                        <Button onClick={handleSave} className="w-full h-12 gap-2 font-semibold shadow-lg shadow-primary/20" disabled={dataLoading}>
                            {dataLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            {dataLoading ? "..." : t("settings.save")}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-2xl bg-card/60 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold">{t("settings.font_size")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex p-1 bg-background/50 rounded-xl gap-1 border border-muted">
                            {(["small", "normal", "large"] as const).map((size) => (
                                <button
                                    key={size}
                                    onClick={() => setFontSize(size)}
                                    className={`
                                        flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all
                                        ${fontSize === size
                                            ? "bg-primary text-primary-foreground shadow-md"
                                            : "text-muted-foreground hover:bg-background/80"}
                                    `}
                                >
                                    {t(`settings.font_size_${size}`)}
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-2xl bg-card/60 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold">外观设置</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-medium opacity-80">主题模式</Label>
                                <p className="text-xs text-muted-foreground">切换浅色或深色主题（清新淡雅风格）</p>
                            </div>
                            <div className="flex items-center gap-2 bg-background/50 p-1 rounded-full border border-muted">
                                <ThemeToggle />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-muted/50">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-medium opacity-80">背景图透明度</Label>
                                    <p className="text-xs text-muted-foreground">调整全局背景照片的深浅（0 - 20%）</p>
                                </div>
                                <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg">
                                    {Math.round(bgOpacity * 100)}%
                                </span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="0.2"
                                step="0.01"
                                value={bgOpacity}
                                onChange={(e) => setBgOpacity(parseFloat(e.target.value))}
                                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-2xl bg-red-50/50 backdrop-blur-xl border border-red-100">
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold text-red-800 flex items-center gap-2">
                            <Database className="w-5 h-5" />
                            数据迁移
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-red-700">
                            如果你在登录前有记录过数据，点击下方按钮将所有“匿名数据”归属到你当前的账户下。
                        </p>
                        <Button
                            variant="destructive"
                            className="w-full"
                            onClick={handleMigrate}
                            disabled={migrating}
                        >
                            {migrating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            立即迁移现有数据
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
                <strong>Tip:</strong> {t("settings.tip")}
            </div>
        </div>
    )
}
