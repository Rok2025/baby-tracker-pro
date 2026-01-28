"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Milk, Moon, Plus, Utensils, Baby } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { invalidateActivityCache } from "@yoyo/api"
import { useLanguage } from "@/components/LanguageProvider"
import { useAuth } from "@/components/AuthProvider"
import { cn } from "@/lib/utils"
import { FoodSelector } from "./FoodSelector"

const formSchema = z.object({
    type: z.enum(["feeding", "sleep", "other", "solid_food", "poop"]),
    date: z.string().min(1, "Required"),
    startDay: z.enum(["today", "yesterday"]),
    startTime: z.string().min(1, "Required"),
    endTime: z.string().optional(),
    volume: z.union([z.number(), z.string()]).optional(),
    note: z.string().optional(),
    // New fields
    poop_color: z.string().optional(),
    poop_consistency: z.string().optional(),
    food_amount: z.string().optional(),
    food_type: z.array(z.string()).optional(),
})

type FormValues = z.infer<typeof formSchema>

export function LogForm({ onSuccess }: { onSuccess?: () => void }) {
    const [activeTab, setActiveTab] = useState<"feeding" | "sleep" | "solid_food" | "poop">("feeding")
    const [loading, setLoading] = useState(false)
    const [library, setLibrary] = useState<string[]>([])
    const { t, language } = useLanguage()
    const { user } = useAuth()

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            type: "feeding",
            date: new Date().toLocaleDateString('en-CA'),
            startDay: "today",
            startTime: new Date().toLocaleTimeString("it-IT").slice(0, 5),
            note: "",
            volume: undefined,
            endTime: undefined,
            // New defaults
            poop_color: "Yellow", // Default
            poop_consistency: "Normal", // Default
            food_amount: "",
            food_type: [],
        },
    })

    // Fetch food library on mount
    useEffect(() => {
        if (!user) return
        async function fetchLibrary() {
            const { data } = await supabase
                .from("user_config")
                .select("value")
                .eq("user_id", user?.id)
                .eq("key", "solid_food_library")
                .single()

            if (data?.value) {
                // Ensure it's an array of strings
                if (Array.isArray(data.value)) {
                    setLibrary(data.value)
                }
            } else {
                // Set defaults if empty
                const defaults = language === 'zh'
                    ? ["米粉", "蛋黄", "苹果泥", "南瓜泥", "青菜粥", "香蕉"]
                    : ["Rice Cereal", "Egg Yolk", "Apple Puree", "Pumpkin", "Porridge", "Banana"]
                setLibrary(defaults)
            }
        }
        fetchLibrary()
    }, [user, language])

    const handleAddCustomFood = async (newFood: string) => {
        if (!user || library.includes(newFood)) return

        const newLibrary = [...library, newFood]
        setLibrary(newLibrary)

        // Save to DB
        const { error } = await supabase.from("user_config").upsert({
            user_id: user.id,
            key: "solid_food_library",
            value: newLibrary
        })

        if (error) {
            console.error("Failed to save food library", error)
        }
    }

    const onSubmit = async (values: FormValues) => {
        setLoading(true)
        try {
            const [year, month, day] = values.date.split("-").map(Number)
            const [sh, sm] = values.startTime.split(":").map(Number)

            const startDate = new Date(year, month - 1, day, sh, sm)

            // 根据切换按钮调整开始日期
            if (values.startDay === "yesterday") {
                startDate.setDate(startDate.getDate() - 1)
            }

            const startDateTime = startDate.toISOString()

            let endDateTime = null
            if (values.endTime) {
                const [eh, em] = values.endTime.split(":").map(Number)
                // 结束时间的基础日期与开始时间调整后的日期一致
                const endDate = new Date(startDate.getTime())
                endDate.setHours(eh, em, 0, 0)

                // 如果结束时间早于开始时间，自动视为第二天
                if (endDate <= startDate) {
                    endDate.setDate(endDate.getDate() + 1)
                }
                endDateTime = endDate.toISOString()
            }

            // Prepare payload
            const payload: any = {
                user_id: user?.id,
                type: values.type,
                start_time: startDateTime,
                end_time: endDateTime,
                volume: values.volume ? Number(values.volume) : undefined,
                note: values.note,
            }

            // Add specific fields
            if (values.type === 'poop') {
                payload.poop_color = values.poop_color
                payload.poop_consistency = values.poop_consistency
            }
            if (values.type === 'solid_food') {
                payload.food_amount = values.food_amount
                payload.food_type = JSON.stringify(values.food_type) // Convert array to JSON string
            }

            const { error } = await supabase.from("activities").insert([payload])

            if (error) throw error

            // 失效缓存
            if (user?.id) {
                invalidateActivityCache(user.id, startDate)
            }

            toast.success("Activity logged successfully!")
            // Smart Reset
            form.reset({
                type: activeTab,
                date: new Date().toLocaleDateString('en-CA'),
                startDay: "today",
                startTime: new Date().toLocaleTimeString("it-IT").slice(0, 5),
                note: "",
                volume: undefined,
                endTime: undefined,
                poop_color: "Yellow", // Maintain default
                poop_consistency: "Normal", // Maintain default
                food_amount: "",
                food_type: [],
            })
            onSuccess?.()
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err)
            toast.error(`Error logging activity: ${message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="border-none shadow-2xl bg-card/60 backdrop-blur-xl w-full flex flex-col">
            <CardHeader className="pb-0 pt-2">
                <CardTitle className="text-base font-semibold flex items-center justify-center relative min-h-[2rem]">
                    <div className="absolute left-0 flex items-center gap-2">
                        <Plus className="w-5 h-5 text-primary" />
                        {t("form.quick_event")}
                    </div>
                    <span className="text-xl font-bold text-primary">
                        {activeTab === 'feeding' && t("form.feeding")}
                        {activeTab === 'sleep' && t("form.sleep")}
                        {activeTab === 'solid_food' && (language === 'zh' ? "辅食" : "Solid Food")}
                        {activeTab === 'poop' && (language === 'zh' ? "臭臭" : "Diaper")}
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 flex-1">
                <Tabs defaultValue="feeding" onValueChange={(v) => {
                    const type = v as any
                    setActiveTab(type)
                    form.setValue("type", type)
                }}>
                    <TabsList className="grid w-full grid-cols-4 mb-3 bg-muted/50 p-1 border border-muted h-10">
                        <TabsTrigger value="feeding" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                            <Milk className="w-4 h-4" />
                        </TabsTrigger>
                        <TabsTrigger value="solid_food" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                            <Utensils className="w-4 h-4" />
                        </TabsTrigger>
                        <TabsTrigger value="poop" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                            <Baby className="w-4 h-4" />
                        </TabsTrigger>
                        <TabsTrigger value="sleep" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                            <Moon className="w-4 h-4" />
                        </TabsTrigger>
                    </TabsList>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-medium opacity-80">记录日期</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} className="bg-background/50 border-muted focus:border-primary transition-colors h-11" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Time Section - Universal */}
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="startTime"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="flex items-center gap-2 mb-1">
                                                <FormLabel className="text-xs font-medium opacity-80 mb-0">{t("form.start_time")}</FormLabel>
                                                <FormField
                                                    control={form.control}
                                                    name="startDay"
                                                    render={({ field: dayField }) => (
                                                        <div className="flex p-0.5 bg-background/50 border border-muted rounded-lg shrink-0 scale-90 origin-left">
                                                            <button
                                                                type="button"
                                                                onClick={() => dayField.onChange("yesterday")}
                                                                className={cn(
                                                                    "px-2 py-0.5 rounded-md text-[9px] font-bold transition-all",
                                                                    dayField.value === "yesterday"
                                                                        ? "bg-orange-500/10 text-orange-600"
                                                                        : "text-muted-foreground/40 hover:text-muted-foreground"
                                                                )}
                                                            >
                                                                {language === 'zh' ? "昨日" : "Yest"}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => dayField.onChange("today")}
                                                                className={cn(
                                                                    "px-2 py-0.5 rounded-md text-[9px] font-bold transition-all",
                                                                    dayField.value === "today"
                                                                        ? "bg-primary/10 text-primary"
                                                                        : "text-muted-foreground/40 hover:text-muted-foreground"
                                                                )}
                                                            >
                                                                {language === 'zh' ? "今日" : "Today"}
                                                            </button>
                                                        </div>
                                                    )}
                                                />
                                            </div>
                                            <FormControl>
                                                <Input type="time" {...field} className="bg-background/50 border-muted focus:border-primary transition-colors h-11" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {activeTab === "sleep" && (
                                    <FormField
                                        control={form.control}
                                        name="endTime"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-medium opacity-80">{t("form.end_time")}</FormLabel>
                                                <FormControl>
                                                    <Input type="time" {...field} value={field.value || ""} className="bg-background/50 border-muted focus:border-primary transition-colors h-11" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                {activeTab === "feeding" && (
                                    <FormField
                                        control={form.control}
                                        name="volume"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-medium opacity-80">{t("form.volume")}</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        placeholder="100"
                                                        {...field}
                                                        value={field.value ?? ""}
                                                        className="bg-background/50 border-muted focus:border-primary transition-colors h-11"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                {activeTab === "solid_food" && (
                                    <FormField
                                        control={form.control}
                                        name="food_amount"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-medium opacity-80">{language === 'zh' ? "饭量" : "Amount"}</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder={language === 'zh' ? "半碗 / 50g" : "Half bowl / 50g"}
                                                        {...field}
                                                        value={field.value || ""}
                                                        className="bg-background/50 border-muted focus:border-primary transition-colors h-11"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </div>

                            {/* Solid Food Specifics */}
                            {activeTab === "solid_food" && (
                                <FormField
                                    control={form.control}
                                    name="food_type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-medium opacity-80">{language === 'zh' ? "食物种类 (多选)" : "Food Types"}</FormLabel>
                                            <FormControl>
                                                <FoodSelector
                                                    value={field.value || []}
                                                    onChange={field.onChange}
                                                    library={library}
                                                    onAddCustom={handleAddCustomFood}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            {/* Diaper Specifics */}
                            {activeTab === "poop" && (
                                <div className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="poop_color"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-medium opacity-80">{language === 'zh' ? "颜色" : "Color"}</FormLabel>
                                                <div className="flex flex-wrap gap-2">
                                                    {[
                                                        { val: 'Yellow', label: '黄', color: 'bg-yellow-400' },
                                                        { val: 'Green', label: '绿', color: 'bg-green-600' },
                                                        { val: 'Brown', label: '褐', color: 'bg-amber-800' },
                                                        { val: 'Black', label: '黑', color: 'bg-slate-900' },
                                                        { val: 'Red', label: '红', color: 'bg-red-600' },
                                                        { val: 'White/Clay', label: '灰白', color: 'bg-slate-200' },
                                                    ].map(opt => (
                                                        <button
                                                            key={opt.val}
                                                            type="button"
                                                            onClick={() => field.onChange(opt.val)}
                                                            className={cn(
                                                                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all",
                                                                field.value === opt.val
                                                                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                                                                    : "border-muted bg-background/50 hover:bg-muted"
                                                            )}
                                                        >
                                                            <span className={cn("w-3 h-3 rounded-full border border-black/10", opt.color)} />
                                                            {language === 'zh' ? opt.label : opt.val}
                                                        </button>
                                                    ))}
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="poop_consistency"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-medium opacity-80">{language === 'zh' ? "性状/软硬" : "Consistency"}</FormLabel>
                                                <div className="flex flex-wrap gap-2">
                                                    {[
                                                        { val: 'Watery', labelZh: '水样' },
                                                        { val: 'Loose/Mushy', labelZh: '糊状' },
                                                        { val: 'Soft', labelZh: '软便' },
                                                        { val: 'Normal', labelZh: '正常' },
                                                        { val: 'Hard', labelZh: '硬便' },
                                                        { val: 'Pellets', labelZh: '羊屎蛋' },
                                                    ].map(opt => (
                                                        <button
                                                            key={opt.val}
                                                            type="button"
                                                            onClick={() => field.onChange(opt.val)}
                                                            className={cn(
                                                                "px-3 py-1.5 rounded-lg border text-xs font-medium transition-all text-center min-w-[3rem]",
                                                                field.value === opt.val
                                                                    ? "border-primary bg-primary text-primary-foreground shadow-md"
                                                                    : "border-muted bg-background/50 hover:bg-muted"
                                                            )}
                                                        >
                                                            {language === 'zh' ? opt.labelZh : opt.val}
                                                        </button>
                                                    ))}
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            )}

                            <FormField
                                control={form.control}
                                name="note"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-medium opacity-80">{t("form.note")}</FormLabel>
                                        <FormControl>
                                            <Input placeholder={t("form.note")} {...field} value={field.value || ""} className="bg-background/50 border-muted focus:border-primary transition-colors h-11" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button type="submit" className="w-full h-10 text-sm font-semibold mt-3 shadow-lg shadow-primary/20" disabled={loading}>
                                {loading ? "..." : t("form.submit")}
                            </Button>
                        </form>
                    </Form>
                </Tabs>
            </CardContent>
        </Card>
    )
}

