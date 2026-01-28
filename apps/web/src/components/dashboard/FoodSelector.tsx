"use client"

import { useState, useRef, useEffect } from "react"
import { Check, Plus, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/LanguageProvider"

interface FoodSelectorProps {
    value: string[]
    onChange: (value: string[]) => void
    library: string[]
    onAddCustom: (value: string) => void
}

export function FoodSelector({ value, onChange, library, onAddCustom }: FoodSelectorProps) {
    const [inputValue, setInputValue] = useState("")
    const [isFocused, setIsFocused] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const { t, language } = useLanguage()

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault()
            addFood(inputValue)
        }
    }

    const addFood = (text: string) => {
        const trimmed = text.trim()
        if (!trimmed) return

        if (!value.includes(trimmed)) {
            onChange([...value, trimmed])
        }

        // Always try to add to library if it's new
        if (!library.includes(trimmed)) {
            onAddCustom(trimmed)
        }

        setInputValue("")
    }

    const removeFood = (foodToRemove: string) => {
        onChange(value.filter(f => f !== foodToRemove))
    }

    const toggleFood = (food: string) => {
        if (value.includes(food)) {
            removeFood(food)
        } else {
            onChange([...value, food])
        }
    }

    // Filter library items: 
    // Show items that match input (if typing) OR show all/popular if focused?
    // Let's simple show all library items as "Quick Add" chips below.
    // If library is huge, we might need filtering. For now assume it's small (<50).
    const filteredLibrary = library.filter(item =>
        item.toLowerCase().includes(inputValue.toLowerCase()) && !value.includes(item)
    )

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-background/50 border border-muted rounded-xl focus-within:ring-2 focus-within:ring-ring focus-within:border-primary transition-all">
                {value.map(food => (
                    <Badge key={food} variant="secondary" className="pl-2 pr-1 py-1 gap-1 text-sm bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
                        {food}
                        <button
                            type="button"
                            onClick={() => removeFood(food)}
                            className="hover:bg-primary/20 rounded-full p-0.5"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </Badge>
                ))}
                <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                    placeholder={value.length === 0 ? (language === 'zh' ? "输入食物名称，回车添加" : "Type food name and enter...") : ""}
                    className="flex-1 bg-transparent border-none h-7 p-0 focus-visible:ring-0 placeholder:text-muted-foreground/50 min-w-[120px]"
                />
            </div>

            {/* Quick Add Library */}
            {library.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground ml-1">
                        {language === 'zh' ? "快速添加" : "Quick Add"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {library.map(item => {
                            const isSelected = value.includes(item)
                            if (isSelected) return null // Already shown in input area
                            return (
                                <Button
                                    key={item}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toggleFood(item)}
                                    className={cn(
                                        "h-7 rounded-full text-xs border-muted bg-background/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all",
                                        inputValue && !item.toLowerCase().includes(inputValue.toLowerCase()) && "hidden"
                                    )}
                                >
                                    <Plus className="w-3 h-3 mr-1 opacity-50" />
                                    {item}
                                </Button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
