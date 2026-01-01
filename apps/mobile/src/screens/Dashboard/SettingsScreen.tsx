import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useConfig } from '../../context/ConfigContext';
import { Globe, Palette, Check, Sun, Moon, Zap, Target } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const SettingsScreen = () => {
    const { t, i18n } = useTranslation();
    const { themeMode, colors, language, targetMilk, targetSleep, setThemeMode, setLanguage, setTargetMilk, setTargetSleep } = useConfig();

    const [milkInput, setMilkInput] = useState(targetMilk.toString());
    const [sleepInput, setSleepInput] = useState((targetSleep / 60).toString());

    useEffect(() => {
        setMilkInput(targetMilk.toString());
        setSleepInput((targetSleep / 60).toString());
    }, [targetMilk, targetSleep]);

    const changeLanguage = (lang: 'zh' | 'en') => {
        setLanguage(lang);
        i18n.changeLanguage(lang);
    };

    const handleMilkBlur = () => {
        const val = parseInt(milkInput, 10);
        if (!isNaN(val) && val > 0) {
            setTargetMilk(val);
        } else {
            setMilkInput(targetMilk.toString());
        }
    };

    const handleSleepBlur = () => {
        const val = parseFloat(sleepInput);
        if (!isNaN(val) && val > 0) {
            setTargetSleep(Math.round(val * 60));
        } else {
            setSleepInput((targetSleep / 60).toString());
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
            <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.headerBackground }]}>
                <Text style={[styles.title, { color: colors.text }]}>{t('settings.title')}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Language Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Globe size={20} color={colors.primary} />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('settings.language')}</Text>
                    </View>
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <TouchableOpacity
                            style={[styles.row, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                            onPress={() => changeLanguage('zh')}
                        >
                            <Text style={[styles.rowText, { color: colors.text }]}>{t('settings.languages.zh')}</Text>
                            {language === 'zh' && <Check size={18} color={colors.primary} />}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.row}
                            onPress={() => changeLanguage('en')}
                        >
                            <Text style={[styles.rowText, { color: colors.text }]}>{t('settings.languages.en')}</Text>
                            {language === 'en' && <Check size={18} color={colors.primary} />}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Theme Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Palette size={20} color={colors.primary} />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('settings.theme')}</Text>
                    </View>
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <TouchableOpacity
                            style={[styles.row, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                            onPress={() => setThemeMode('light')}
                        >
                            <View style={styles.rowLeft}>
                                <Sun size={18} color="#FFD43B" style={{ marginRight: 10 }} />
                                <Text style={[styles.rowText, { color: colors.text }]}>{t('settings.themes.light')}</Text>
                            </View>
                            {themeMode === 'light' && <Check size={18} color={colors.primary} />}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.row, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                            onPress={() => setThemeMode('dark')}
                        >
                            <View style={styles.rowLeft}>
                                <Moon size={18} color="#A5D8FF" style={{ marginRight: 10 }} />
                                <Text style={[styles.rowText, { color: colors.text }]}>{t('settings.themes.dark')}</Text>
                            </View>
                            {themeMode === 'dark' && <Check size={18} color={colors.primary} />}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.row}
                            onPress={() => setThemeMode('dracula')}
                        >
                            <View style={styles.rowLeft}>
                                <Zap size={18} color="#BD93F9" style={{ marginRight: 10 }} />
                                <Text style={[styles.rowText, { color: colors.text }]}>{t('settings.themes.dracula')}</Text>
                            </View>
                            {themeMode === 'dracula' && <Check size={18} color={colors.primary} />}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Targets Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Target size={20} color={colors.primary} />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('settings.targets')}</Text>
                    </View>
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                            <Text style={[styles.rowText, { color: colors.text }]}>{t('settings.target_milk')}</Text>
                            <View style={styles.inputRow}>
                                <TextInput
                                    style={[styles.targetInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                    value={milkInput}
                                    onChangeText={setMilkInput}
                                    onBlur={handleMilkBlur}
                                    keyboardType="numeric"
                                    placeholderTextColor={colors.textSecondary}
                                />
                                <Text style={[styles.unitText, { color: colors.textSecondary }]}>ml</Text>
                            </View>
                        </View>
                        <View style={styles.row}>
                            <Text style={[styles.rowText, { color: colors.text }]}>{t('settings.target_sleep')}</Text>
                            <View style={styles.inputRow}>
                                <TextInput
                                    style={[styles.targetInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                    value={sleepInput}
                                    onChangeText={setSleepInput}
                                    onBlur={handleSleepBlur}
                                    keyboardType="numeric"
                                    placeholderTextColor={colors.textSecondary}
                                />
                                <Text style={[styles.unitText, { color: colors.textSecondary }]}>{t('common.hour')}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.footer}>
                    <Text style={[styles.version, { color: colors.textSecondary }]}>YoYo Baby Tracker v1.0.0</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 20,
        borderBottomWidth: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    content: {
        padding: 20,
    },
    section: {
        marginBottom: 25,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        paddingLeft: 4,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rowText: {
        fontSize: 16,
        fontWeight: '500',
    },
    footer: {
        marginTop: 20,
        alignItems: 'center',
    },
    version: {
        fontSize: 12,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    targetInput: {
        width: 70,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        fontSize: 16,
        textAlign: 'center',
        fontWeight: '600',
    },
    unitText: {
        fontSize: 14,
        marginLeft: 6,
        fontWeight: '500',
    }
});
