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

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            type: "feeding",
            startTime: new Date().toLocaleTimeString("it-IT").slice(0, 5),
            note: "",
        },
    })

    const onSubmit = async (values: FormValues) => {
        setLoading(true)
        try {
            const today = new Date().toISOString().split("T")[0]
            const startDateTime = `${today}T${values.startTime}:00Z`
            const endDateTime = values.endTime ? `${today}T${values.endTime}:00Z` : null

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
                    Quick Event
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
                            <Milk className="w-4 h-4 mr-2" /> Feeding
                        </TabsTrigger>
                        <TabsTrigger value="sleep" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            <Moon className="w-4 h-4 mr-2" /> Sleep
                        </TabsTrigger>
                    </TabsList>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="startTime"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Start Time</FormLabel>
                                            <FormControl>
                                                <Input type="time" {...field} className="bg-white/80" />
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
                                                <FormLabel>End Time</FormLabel>
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
                                        control={form.control}
                                        name="volume"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Volume (ml)</FormLabel>
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
                                control={form.control}
                                name="note"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Notes (Optional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Any details..." {...field} className="bg-white/80" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button type="submit" className="w-full h-12 text-md font-semibold mt-4" disabled={loading}>
                                {loading ? "Logging..." : "Save Activity"}
                            </Button>
                        </form>
                    </Form>
                </Tabs>
            </CardContent>
        </Card>
    )
}
