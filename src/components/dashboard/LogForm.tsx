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
import { useLanguage } from "@/components/LanguageProvider"

const formSchema = z.object({
    type: z.enum(["feeding", "sleep", "other"]),
    startTime: z.string().min(1, "Required"),
    endTime: z.string().optional(),
    volume: z.coerce.number().optional(),
    note: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

export function LogForm({ onSuccess }: { onSuccess?: () => void }) {
    const [activeTab, setActiveTab] = useState<"feeding" | "sleep">("feeding")
    const [loading, setLoading] = useState(false)
    const { t } = useLanguage()

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            type: "feeding",
            startTime: new Date().toLocaleTimeString("it-IT").slice(0, 5),
            note: "",
            volume: undefined,
            endTime: undefined,
        },
    })

    const onSubmit = async (values: FormValues) => {
        setLoading(true)
        try {
            const now = new Date()
            const [hours, minutes] = values.startTime.split(":").map(Number)
            let startDate = new Date()
            startDate.setHours(hours, minutes, 0, 0)

            // If start time is in the future, assume it was yesterday
            if (startDate > now) {
                startDate.setDate(startDate.getDate() - 1)
            }
            const startDateTime = startDate.toISOString()

            let endDateTime = null
            if (values.endTime) {
                const [eHours, eMinutes] = values.endTime.split(":").map(Number)
                let endDate = new Date(startDate) // Start from the same day as startDate
                endDate.setHours(eHours, eMinutes, 0, 0)

                // If end time is numerically before start time, it must be the next day
                if (endDate < startDate) {
                    endDate.setDate(endDate.getDate() + 1)
                }
                endDateTime = endDate.toISOString()
            }

            const { error } = await supabase.from("activities").insert([
                {
                    type: values.type,
                    start_time: startDateTime,
                    end_time: endDateTime,
                    volume: values.volume,
                    note: values.note,
                },
            ])

            if (error) throw error

            toast.success("Activity logged successfully!")
            form.reset({
                ...form.getValues(),
                volume: undefined,
                note: "",
            })
            onSuccess?.()
        } catch (err: any) {
            toast.error(`Error logging activity: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="border-none shadow-xl bg-white/50 backdrop-blur-md">
            <CardHeader className="pb-4">
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                    <Plus className="w-5 h-5 text-primary" />
                    {t("form.quick_event")}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="feeding" onValueChange={(v) => {
                    const type = v as "feeding" | "sleep"
                    setActiveTab(type)
                    form.setValue("type", type)
                }}>
                    <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50">
                        <TabsTrigger value="feeding" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
                            <Milk className="w-4 h-4 mr-2" /> {t("form.feeding")}
                        </TabsTrigger>
                        <TabsTrigger value="sleep" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            <Moon className="w-4 h-4 mr-2" /> {t("form.sleep")}
                        </TabsTrigger>
                    </TabsList>

                    <Form {...(form as any)}>
                        <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control as any}
                                    name="startTime"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("form.start_time")}</FormLabel>
                                            <FormControl>
                                                <Input type="time" {...field} className="bg-white/80" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {activeTab === "sleep" && (
                                    <FormField
                                        control={form.control as any}
                                        name="endTime"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("form.end_time")}</FormLabel>
                                                <FormControl>
                                                    <Input type="time" {...field} value={field.value || ""} className="bg-white/80" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                {activeTab === "feeding" && (
                                    <FormField
                                        control={form.control as any}
                                        name="volume"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("form.volume")}</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        placeholder="100"
                                                        {...field}
                                                        value={field.value ?? ""}
                                                        className="bg-white/80"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </div>

                            <FormField
                                control={form.control as any}
                                name="note"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("form.note")}</FormLabel>
                                        <FormControl>
                                            <Input placeholder={t("form.note")} {...field} value={field.value || ""} className="bg-white/80" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button type="submit" className="w-full h-12 text-md font-semibold mt-4" disabled={loading}>
                                {loading ? "..." : t("form.submit")}
                            </Button>
                        </form>
                    </Form>
                </Tabs>
            </CardContent>
        </Card>
    )
}
