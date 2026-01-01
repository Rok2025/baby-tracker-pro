import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Milk, Moon } from 'lucide-react-native';
import { useConfig } from '../../context/ConfigContext';
import { useTranslation } from 'react-i18next';
import { type Activity } from '../../lib/supabase';

export const SummaryCards = ({ activities, selectedDate }: { activities: Activity[]; selectedDate: Date }) => {
    const { themeMode, colors, targetMilk, targetSleep } = useConfig();
    const { t } = useTranslation();

    const standards = { milk: targetMilk, sleep: targetSleep };

    const summary = useMemo(() => {
        let totalMilk = 0;
        let totalSleep = 0; // in minutes

        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        activities.forEach(act => {
            if (act.type === 'feeding' && act.volume) {
                totalMilk += act.volume;
            }
            if (act.type === 'sleep' && act.start_time && act.end_time) {
                const actStart = new Date(act.start_time).getTime();
                const actEnd = new Date(act.end_time).getTime();
                const dayStart = startOfDay.getTime();
                const dayEnd = endOfDay.getTime();

                // Only count sleep that ends today
                if (actEnd >= dayStart && actEnd <= dayEnd) {
                    totalSleep += (actEnd - actStart) / (1000 * 60);
                }
            }
        });

        const milkSummary = {
            value: totalMilk,
            percentage: Math.min(Math.round((totalMilk / standards.milk) * 100), 100),
            target: standards.milk,
            isGood: totalMilk >= standards.milk
        };

        const h = Math.floor(totalSleep / 60);
        const m = Math.round(totalSleep % 60);
        const durationStr = h > 0 ? (m > 0 ? `${h}${t('common.hour')}${m}${t('common.minute')}` : `${h}${t('common.hour')}`) : `${m}${t('common.minute')}`;

        const sleepSummary = {
            value: durationStr,
            percentage: Math.min(Math.round((totalSleep / standards.sleep) * 100), 100),
            target: `${Math.round(standards.sleep / 60)}${t('common.hour')}`,
            isGood: totalSleep >= standards.sleep
        };

        return { milk: milkSummary, sleep: sleepSummary };
    }, [activities, standards, selectedDate, t]);

    const isDracula = themeMode === 'dracula';

    // Status-based colors: green when target met, red/pink when not
    const milkStatusBg = summary.milk.isGood
        ? (isDracula ? 'rgba(51, 255, 196, 0.15)' : 'rgba(34, 197, 94, 0.1)')
        : (isDracula ? 'rgba(255, 61, 113, 0.15)' : 'rgba(239, 68, 68, 0.1)');
    const sleepStatusBg = summary.sleep.isGood
        ? (isDracula ? 'rgba(51, 255, 196, 0.15)' : 'rgba(34, 197, 94, 0.1)')
        : (isDracula ? 'rgba(255, 61, 113, 0.15)' : 'rgba(239, 68, 68, 0.1)');

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[
                styles.card,
                { backgroundColor: milkStatusBg, borderColor: isDracula ? 'transparent' : colors.border },
                isDracula && styles.draculaCard
            ]}>
                <View style={[styles.iconBox, { backgroundColor: isDracula ? 'rgba(51, 255, 196, 0.1)' : colors.background }]}>
                    <Milk size={20} color={isDracula ? colors.primary : colors.feeding} />
                </View>
                <View style={styles.cardContent}>
                    <Text style={[styles.label, { color: isDracula ? colors.primary : colors.textSecondary }]}>{t('dashboard.milk_today')}</Text>
                    <Text style={[styles.value, { color: colors.text }]}>{summary.milk.value}<Text style={[styles.unit, { color: colors.textSecondary }]}> {t('common.milliliter')}</Text></Text>
                    <View style={[styles.progressBg, { backgroundColor: isDracula ? 'rgba(255,255,255,0.05)' : colors.border }]}>
                        <View style={[styles.progressBar, { width: `${summary.milk.percentage}%`, backgroundColor: isDracula ? colors.primary : colors.feeding }]} />
                    </View>
                </View>
                {isDracula && <View style={[styles.draculaBar, { backgroundColor: colors.primary }]} />}
            </View>

            <View style={[
                styles.card,
                { backgroundColor: sleepStatusBg, borderColor: isDracula ? 'transparent' : colors.border },
                isDracula && styles.draculaCard
            ]}>
                <View style={[styles.iconBox, { backgroundColor: isDracula ? 'rgba(51, 255, 196, 0.1)' : colors.background }]}>
                    <Moon size={20} color={isDracula ? colors.primary : colors.sleep} />
                </View>
                <View style={styles.cardContent}>
                    <Text style={[styles.label, { color: isDracula ? colors.primary : colors.textSecondary }]}>{t('dashboard.sleep_today')}</Text>
                    <Text style={[styles.value, { color: colors.text }]}>{summary.sleep.value}</Text>
                    <View style={[styles.progressBg, { backgroundColor: isDracula ? 'rgba(255,255,255,0.05)' : colors.border }]}>
                        <View style={[styles.progressBar, { width: `${summary.sleep.percentage}%`, backgroundColor: isDracula ? colors.primary : colors.sleep }]} />
                    </View>
                </View>
                {isDracula && <View style={[styles.draculaBar, { backgroundColor: colors.primary }]} />}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 20,
        gap: 12,
    },
    card: {
        flex: 1,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        justifyContent: 'space-between',
        minHeight: 120,
        overflow: 'hidden',
    },
    draculaCard: {
        borderWidth: 0,
    },
    draculaBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        opacity: 0.8,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    cardContent: {
        flex: 1,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    value: {
        fontSize: 22,
        fontWeight: '900',
        marginBottom: 10,
    },
    unit: {
        fontSize: 12,
        fontWeight: '600',
    },
    progressBg: {
        height: 6,
        borderRadius: 3,
        width: '100%',
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 3,
    }
});
