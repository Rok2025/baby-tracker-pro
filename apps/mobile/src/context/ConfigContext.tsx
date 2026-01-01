import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

export type ThemeMode = 'light' | 'dark' | 'dracula';
export type Language = 'zh' | 'en';

interface ThemeColors {
    background: string;
    surface: string;
    card: string;
    text: string;
    textSecondary: string;
    primary: string;
    feeding: string;
    sleep: string;
    border: string;
    tabBar: string;
    tabInactive: string;
    headerBackground: string;
    statusBarStyle: 'light' | 'dark';
}

const Themes: Record<ThemeMode, ThemeColors> = {
    light: {
        background: '#F8F9FA',
        surface: '#FFFFFF',
        card: '#FFFFFF',
        text: '#212529',
        textSecondary: '#868E96',
        primary: '#FF6B6B',
        feeding: '#FF6B6B',
        sleep: '#7C4DFF',
        border: '#F1F3F5',
        tabBar: '#FFFFFF',
        tabInactive: '#ADB5BD',
        headerBackground: '#FFFFFF',
        statusBarStyle: 'dark',
    },
    dark: {
        background: '#0D1117',
        surface: '#161B22',
        card: '#161B22',
        text: '#E6EDF3',
        textSecondary: '#7D8590',
        primary: '#FF6B6B',
        feeding: '#FF6B6B',
        sleep: '#9D7AFF',
        border: '#30363D',
        tabBar: '#0D1117',
        tabInactive: '#484F58',
        headerBackground: '#161B22',
        statusBarStyle: 'light',
    },
    dracula: {
        background: '#0B1117',
        surface: '#161B22',
        card: '#161B22',
        text: '#E6EDF3',
        textSecondary: '#8B949E',
        primary: '#33FFC4',
        feeding: '#FF3D71',
        sleep: '#82B1FF',
        border: '#30363D',
        tabBar: '#161B22',
        tabInactive: '#484F58',
        headerBackground: '#0B1117',
        statusBarStyle: 'light',
    }
};

interface ConfigContextType {
    themeMode: ThemeMode;
    colors: ThemeColors;
    language: Language;
    targetMilk: number;
    targetSleep: number; // in minutes
    setThemeMode: (mode: ThemeMode) => void;
    setLanguage: (lang: Language) => void;
    setTargetMilk: (ml: number) => void;
    setTargetSleep: (minutes: number) => void;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider = ({ children }: { children: React.ReactNode }) => {
    const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
    const [language, setLanguageState] = useState<Language>('zh');
    const [targetMilk, setTargetMilkState] = useState(800);
    const [targetSleep, setTargetSleepState] = useState(600); // 10 hours in minutes

    useEffect(() => {
        // Load settings from SecureStore
        const loadSettings = async () => {
            try {
                const savedTheme = await SecureStore.getItemAsync('themeMode');
                const savedLang = await SecureStore.getItemAsync('language');
                const savedMilk = await SecureStore.getItemAsync('targetMilk');
                const savedSleep = await SecureStore.getItemAsync('targetSleep');
                if (savedTheme) setThemeModeState(savedTheme as ThemeMode);
                if (savedLang) setLanguageState(savedLang as Language);
                if (savedMilk) setTargetMilkState(parseInt(savedMilk, 10));
                if (savedSleep) setTargetSleepState(parseInt(savedSleep, 10));
            } catch (e) {
                console.error('Failed to load settings', e);
            }
        };
        loadSettings();
    }, []);

    const setThemeMode = async (mode: ThemeMode) => {
        setThemeModeState(mode);
        await SecureStore.setItemAsync('themeMode', mode);
    };

    const setLanguage = async (lang: Language) => {
        setLanguageState(lang);
        await SecureStore.setItemAsync('language', lang);
    };

    const setTargetMilk = async (ml: number) => {
        setTargetMilkState(ml);
        await SecureStore.setItemAsync('targetMilk', ml.toString());
    };

    const setTargetSleep = async (minutes: number) => {
        setTargetSleepState(minutes);
        await SecureStore.setItemAsync('targetSleep', minutes.toString());
    };

    const colors = Themes[themeMode];

    return (
        <ConfigContext.Provider value={{ themeMode, colors, language, targetMilk, targetSleep, setThemeMode, setLanguage, setTargetMilk, setTargetSleep }}>
            {children}
        </ConfigContext.Provider>
    );
};

export const useConfig = () => {
    const context = useContext(ConfigContext);
    if (!context) throw new Error('useConfig must be used within ConfigProvider');
    return context;
};
