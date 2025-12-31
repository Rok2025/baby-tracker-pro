"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

type Language = "en" | "zh"

interface LanguageContextType {
    language: Language
    setLanguage: (lang: Language) => void
    t: (key: string) => string
}

const translations = {
    en: {
        "app.title": "BabyTracker Pro",
        "app.dashboard": "Dashboard",
        "app.dashboard_short": "Today",
        "app.history": "History",
        "app.settings": "Settings",
        "dashboard.welcome": "Hello, Parent! 👋",
        "dashboard.subtitle": "Here's how your little one is doing today.",
        "history.title": "Records History",
        "history.subtitle": "Browse and review past baby activities.",
        "history.pick_date": "Pick a date",
        "history.export": "Export as Image",
        "history.coming_soon": "Charts and Deep Insights coming soon...",
        "settings.title": "Settings",
        "settings.subtitle": "Configure your baby's daily standards.",
        "settings.daily_standards": "Daily Standards",
        "settings.milk_target": "Daily Milk Target (ml)",
        "settings.milk_standard": "Standard goal for milk intake per day.",
        "settings.sleep_target": "Daily Sleep Target (hours)",
        "settings.sleep_standard": "Target total sleep duration (naps + nighttime).",
        "settings.save": "Save Configuration",
        "settings.font_size": "Default Font Size",
        "settings.font_size_small": "Small",
        "settings.font_size_normal": "Normal",
        "settings.font_size_large": "Large",
        "settings.tip": "These standards will directly influence the color of your dashboard cards. Green means you've reached the goal!",
        "recent.activities": "Recent Activities",
        "recent.no_activities": "No activities recorded for this date yet.",
        "recent.today": "Today",
        "summary.milk": "Milk Intake",
        "summary.sleep": "Sleep Total",
        "summary.target": "Target",
        "form.feeding": "Feeding",
        "form.sleep": "Sleep",
        "form.volume": "Volume (ml)",
        "form.note": "Note",
        "form.start_time": "Start Time",
        "form.end_time": "End Time",
        "form.submit": "Log Activity",
        "form.quick_event": "Quick Event",
        "common.save": "Save Changes",
        "common.cancel": "Cancel",
        "common.delete": "Delete",
        "common.confirm_delete": "Are you sure you want to delete this record?",
        "common.edit": "Edit",
        "duration.hours": "h",
        "duration.mins": "m",
        "duration.ongoing": "Ongoing...",
        "duration.label": "Duration",
        "sidebar.quick_stat": "Quick Stat",
        "sidebar.today": "Today",
        "auth.login_title": "Welcome back",
        "auth.signup_title": "Create an account",
        "auth.login_subtitle": "Enter your credentials to access your account",
        "auth.signup_subtitle": "Enter your email to get started",
        "auth.email": "Email",
        "auth.password": "Password",
        "auth.login_button": "Sign In",
        "auth.signup_button": "Sign Up",
        "auth.no_account": "Don't have an account?",
        "auth.have_account": "Already have an account?",
        "auth.switch_to_signup": "Sign Up",
        "auth.switch_to_login": "Sign In",
        "auth.check_email": "Check your email for the confirmation link!",
        "auth.login_success": "Logged in successfully!"
    },
    zh: {
        "app.title": "宝宝成长助手",
        "app.dashboard": "仪表盘",
        "app.dashboard_short": "今日",
        "app.history": "历史记录",
        "app.settings": "设置",
        "dashboard.welcome": "你好，家长！👋",
        "dashboard.subtitle": "这是宝宝今天的动态。",
        "history.title": "历史记录",
        "history.subtitle": "浏览和回顾宝宝过去的活动。",
        "history.pick_date": "选择日期",
        "history.export": "导出为图片",
        "history.coming_soon": "统计图表和深度分析即将推出...",
        "settings.title": "设置",
        "settings.subtitle": "配置您的宝宝每日标准。",
        "settings.daily_standards": "每日标准",
        "settings.milk_target": "每日奶量目标 (ml)",
        "settings.milk_standard": "每日奶量摄入的标准目标。",
        "settings.sleep_target": "每日睡眠目标 (小时)",
        "settings.sleep_standard": "目标总睡眠时间（午睡 + 夜间）。",
        "settings.save": "保存配置",
        "settings.font_size": "默认文字大小",
        "settings.font_size_small": "偏小",
        "settings.font_size_normal": "正常",
        "settings.font_size_large": "偏大",
        "settings.tip": "这些标准将直接影响仪表盘卡片的颜色。绿色表示已达到目标！",
        "recent.activities": "最近活动",
        "recent.no_activities": "今天还没有记录。",
        "recent.today": "今天",
        "summary.milk": "奶量摄入",
        "summary.sleep": "总睡眠",
        "summary.target": "目标",
        "form.feeding": "喂奶",
        "form.sleep": "睡眠",
        "form.volume": "奶量 (ml)",
        "form.note": "备注",
        "form.start_time": "开始时间",
        "form.end_time": "结束时间",
        "form.submit": "新增记录",
        "form.quick_event": "快速记录",
        "common.save": "保存修改",
        "common.cancel": "取消",
        "common.delete": "删除",
        "common.confirm_delete": "您确定要删除这条记录吗？",
        "common.edit": "编辑",
        "duration.hours": "时",
        "duration.mins": "分",
        "duration.ongoing": "进行中...",
        "duration.label": "时长",
        "sidebar.quick_stat": "快速统计",
        "sidebar.today": "今日",
        "auth.login_title": "欢迎回来",
        "auth.signup_title": "创建账号",
        "auth.login_subtitle": "输入您的凭据以访问您的账号",
        "auth.signup_subtitle": "输入您的邮箱以开始",
        "auth.email": "邮箱",
        "auth.password": "密码",
        "auth.login_button": "登录",
        "auth.signup_button": "注册",
        "auth.no_account": "还没有账号？",
        "auth.have_account": "已有账号？",
        "auth.switch_to_signup": "立即注册",
        "auth.switch_to_login": "立即登录",
        "auth.check_email": "请检查您的邮箱以获取确认链接！",
        "auth.login_success": "登录成功！"
    }
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState<Language>("zh")

    useEffect(() => {
        const saved = localStorage.getItem("language") as Language
        if (saved && (saved === "en" || saved === "zh")) {
            setLanguage(saved)
        }
    }, [])

    const handleSetLanguage = (lang: Language) => {
        setLanguage(lang)
        localStorage.setItem("language", lang)
    }

    const t = (key: string) => {
        return translations[language][key as keyof typeof translations["en"]] || key
    }

    return (
        <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useLanguage() {
    const context = useContext(LanguageContext)
    if (context === undefined) {
        throw new Error("useLanguage must be used within a LanguageProvider")
    }
    return context
}
