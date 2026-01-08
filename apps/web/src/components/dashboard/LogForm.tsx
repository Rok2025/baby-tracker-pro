"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Milk, Moon, Plus } from "lucide-react"
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

const formSchema = z.object({
    type: z.enum(["feeding", "sleep", "other"]),
    date: z.string().min(1, "Required"),
    startDay: z.enum(["today", "yesterday"]),
    startTime: z.string().min(1, "Required"),
    endTime: z.string().optional(),
    volume: z.union([z.number(), z.string()]).optional(),
    note: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

export function LogForm({ onSuccess }: { onSuccess?: () => void }) {
    const [activeTab, setActiveTab] = useState<"feeding" | "sleep">("feeding")
    const [loading, setLoading] = useState(false)
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
        },
    })

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

            const { error } = await supabase.from("activities").insert([
                {
                    user_id: user?.id,
                    type: values.type,
                    start_time: startDateTime,
                    end_time: endDateTime,
                    volume: values.volume ? Number(values.volume) : undefined,
                    note: values.note,
                },
            ])

            if (error) throw error

            // 失效缓存
            if (user?.id) {
                invalidateActivityCache(user.id, startDate)
            }

            toast.success("Activity logged successfully!")
            form.reset({
                type: activeTab,
                date: new Date().toLocaleDateString('en-CA'),
                startDay: "today",
                startTime: new Date().toLocaleTimeString("it-IT").slice(0, 5),
                note: "",
                volume: undefined,
                endTime: undefined,
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
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Plus className="w-5 h-5 text-primary" />
                    {t("form.quick_event")}
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 flex-1">
                <Tabs defaultValue="feeding" onValueChange={(v) => {
                    const type = v as "feeding" | "sleep"
                    setActiveTab(type)
                    form.setValue("type", type)
                }}>
                    <TabsList className="grid w-full grid-cols-2 mb-3 bg-muted/50 p-1 border border-muted h-10">
                        <TabsTrigger value="feeding" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 transition-all text-sm">
                            <Milk className="w-4 h-4 mr-2" /> {t("form.feeding")}
                        </TabsTrigger>
                        <TabsTrigger value="sleep" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 transition-all text-sm">
                            <Moon className="w-4 h-4 mr-2" /> {t("form.sleep")}
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
                            </div>

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
