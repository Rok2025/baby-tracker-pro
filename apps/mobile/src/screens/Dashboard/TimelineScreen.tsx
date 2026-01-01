import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    StyleSheet,
    Text,
    View,
    SectionList,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
    Platform,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { fetchActivitiesForDay, getSupabase, type Activity } from '../../lib/supabase';
import { Milk, Moon, Calendar as CalendarIcon, ChevronDown, Sun, Sunset, Pencil, Trash2 } from 'lucide-react-native';
import { SummaryCards } from '../../components/dashboard/SummaryCards';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { LoggingModal } from '../../components/dashboard/LoggingModal';
import { useConfig } from '../../context/ConfigContext';
import { useTranslation } from 'react-i18next';

interface GroupedActivity {
    title: string;
    icon: React.ReactNode;
    color: string;
    data: Activity[];
}

export const TimelineScreen = () => {
    const { user } = useAuth();
    const { themeMode, colors } = useConfig();
    const isDracula = themeMode === 'dracula';
    const { t } = useTranslation();

    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [standards, setStandards] = useState({ milk: 800, sleep: 600 });
    const [babyInfo, setBabyInfo] = useState<{ name: string; age: string } | null>(null);

    // 日期切换状态
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
    const [loggingModalVisible, setLoggingModalVisible] = useState(false);

    const loadData = useCallback(async (date: Date) => {
        if (!user) return;
        try {
            // 1. 获取活动记录
            // 排序：跨夜睡眠优先放在最前面，其他按时间排序
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);

            const data = await fetchActivitiesForDay(user.id, date);
            setActivities(data.sort((a: Activity, b: Activity) => {
                // 判断是否为跨夜睡眠（结束日期与开始日期不同）
                const aIsOvernight = a.type === 'sleep' && a.end_time &&
                    new Date(a.end_time).getDate() !== new Date(a.start_time).getDate();
                const bIsOvernight = b.type === 'sleep' && b.end_time &&
                    new Date(b.end_time).getDate() !== new Date(b.start_time).getDate();

                // 跨夜睡眠优先显示
                if (aIsOvernight && !bIsOvernight) return -1;
                if (!aIsOvernight && bIsOvernight) return 1;

                // 其他按开始时间排序
                return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
            }));

            // 2. 获取配置信息 (目标与宝宝信息)
            const db = getSupabase();
            const { data: configData } = await db
                .from("user_config")
                .select("key, value")
                .eq("user_id", user.id)
                .in("key", ["target_milk_ml", "target_sleep_hours", "baby_name", "baby_birth_date"]);

            if (configData) {
                const newStandards = { milk: 800, sleep: 600 };
                let bName = '';
                let bBirth = '';

                configData.forEach((item: { key: string; value: string }) => {
                    if (item.key === "target_milk_ml") newStandards.milk = parseFloat(item.value) || 800;
                    if (item.key === "target_sleep_hours") newStandards.sleep = (parseFloat(item.value) || 10) * 60;
                    if (item.key === "baby_name") bName = item.value;
                    if (item.key === "baby_birth_date") bBirth = item.value;
                });

                setStandards(newStandards);

                if (bBirth) {
                    const birth = new Date(bBirth);
                    const now = new Date(); // 计算年龄始终相对于“此时此刻”
                    const diffTime = Math.abs(now.getTime() - birth.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    const months = Math.floor(diffDays / 30);
                    const days = diffDays % 30;
                    setBabyInfo({ name: bName, age: `${months}${t('dashboard.month_unit')}${days}${t('dashboard.day_unit')}` });
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useEffect(() => {
        loadData(selectedDate);
    }, [loadData, selectedDate]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData(selectedDate);
    };

    const onDateChange = (event: DateTimePickerEvent, date?: Date) => {
        setShowDatePicker(false);
        if (date) {
            setSelectedDate(date);
            setLoading(true);
        }
    };

    const formattedSelectedDate = useMemo(() => {
        const year = selectedDate.getFullYear();
        const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
        const day = selectedDate.getDate().toString().padStart(2, '0');
        const today = new Date();
        const isToday = selectedDate.toDateString() === today.toDateString();

        const dateStr = `${year}-${month}-${day}`;
        return {
            display: isToday ? `${dateStr} (${t('common.today')})` : dateStr,
            day: selectedDate.getDate()
        };
    }, [selectedDate]);

    const handleDelete = async (activityId: string) => {
        Alert.alert(
            t('dashboard.confirm_delete'),
            t('dashboard.delete_message'),
            [
                { text: t('common.cancel'), style: "cancel" },
                {
                    text: t('common.delete'),
                    style: "destructive",
                    onPress: async () => {
                        const db = getSupabase();
                        const { error } = await db.from('activities').delete().eq('id', activityId);
                        if (error) {
                            Alert.alert(t('dashboard.delete_fail'), error.message);
                        } else {
                            loadData(selectedDate);
                        }
                    }
                }
            ]
        );
    };

    const handleEdit = (activity: Activity) => {
        setEditingActivity(activity);
        setLoggingModalVisible(true);
    };

    const formatDuration = (start: string, end: string | null | undefined) => {
        if (!end) return null;
        const diffMs = new Date(end).getTime() - new Date(start).getTime();
        const totalMin = Math.round(diffMs / 60000);
        const hours = Math.floor(totalMin / 60);
        const mins = totalMin % 60;
        if (hours > 0) {
            return mins > 0 ? `${hours}${t('common.hour')}${mins}${t('common.minute')}` : `${hours}${t('common.hour')}`;
        }
        return `${mins}${t('common.minute')}`;
    };

    const groupedActivities = useMemo(() => {
        const sections: GroupedActivity[] = [
            {
                title: t('dashboard.morning'),
                icon: <Sun size={14} color="#F9A825" />,
                color: '#F9A825',
                data: []
            },
            {
                title: t('dashboard.afternoon'),
                icon: <Sun size={14} color="#E65100" />,
                color: '#E65100',
                data: []
            },
            {
                title: t('dashboard.evening'),
                icon: <Sunset size={14} color={colors.sleep} />,
                color: colors.sleep,
                data: []
            },
        ];

        activities.forEach(activity => {
            const hour = new Date(activity.start_time).getHours();
            // 跨夜睡眠（晚上开始、第二天早上结束）放到上午
            const isOvernightSleep = activity.type === 'sleep' && activity.end_time &&
                new Date(activity.end_time).getDate() !== new Date(activity.start_time).getDate();

            if (isOvernightSleep || hour < 12) {
                sections[0].data.push(activity);
            } else if (hour < 18) {
                sections[1].data.push(activity);
            } else {
                sections[2].data.push(activity);
            }
        });

        return sections.filter(s => s.data.length > 0);
    }, [activities]);

    const renderItem = ({ item }: { item: Activity }) => {
        const isSleep = item.type === 'sleep';
        const st = new Date(item.start_time);
        const startTimeStr = st.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

        let endTimeStr = '';
        if (isSleep && item.end_time) {
            const et = new Date(item.end_time);
            endTimeStr = et.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        }

        const durationStr = isSleep ? formatDuration(item.start_time, item.end_time) : null;

        return (
            <View style={styles.itemContainer}>
                <View style={styles.timeSection}>
                    <Text style={[styles.timeText, { color: colors.text }]}>{startTimeStr}</Text>
                    {endTimeStr ? (
                        <>
                            <View style={[styles.timeLine, { backgroundColor: isDracula ? colors.primary : colors.border }]} />
                            <Text style={[styles.endTimeText, { color: colors.textSecondary }]}>{endTimeStr}</Text>
                        </>
                    ) : (
                        <View style={[styles.timelinePoint, { backgroundColor: isDracula ? colors.primary : colors.border }]} />
                    )}
                </View>

                <View style={[
                    styles.card,
                    { backgroundColor: colors.card, borderColor: isDracula ? 'transparent' : colors.border },
                    { borderLeftColor: isSleep ? colors.sleep : colors.feeding },
                    isSleep ? styles.sleepCard : styles.feedingCard,
                    isDracula && styles.draculaTimelineCard
                ]}>
                    <View style={styles.cardHeader}>
                        <View style={styles.headerLeft}>
                            {isSleep ? <Moon size={16} color={isDracula ? colors.sleep : colors.sleep} /> : <Milk size={16} color={isDracula ? colors.feeding : colors.feeding} />}
                            <Text style={[styles.typeText, { color: isDracula ? colors.text : (isSleep ? colors.sleep : colors.feeding) }]}>
                                {isSleep ? t('logging.sleep') : t('logging.feeding')}
                            </Text>
                        </View>
                        <View style={styles.headerRight}>
                            <Text style={[styles.mainValue, { color: isDracula ? (isSleep ? colors.sleep : colors.feeding) : colors.text }]}>
                                {isSleep ? (durationStr || t('common.ongoing')) : `${item.volume}`}
                                {!isSleep && <Text style={[styles.unitText, { color: colors.textSecondary }]}> {t('common.milliliter')}</Text>}
                            </Text>
                        </View>
                    </View>

                    {item.note ? (
                        <View style={[styles.cardBody, { borderTopColor: isDracula ? 'rgba(255,255,255,0.05)' : colors.border }]}>
                            <Text style={[styles.noteText, { color: colors.text }]}>{item.note}</Text>
                        </View>
                    ) : (
                        isSleep && !item.end_time && (
                            <View style={[styles.cardBody, { borderTopColor: isDracula ? 'rgba(255,255,255,0.05)' : colors.border }]}>
                                <Text style={[styles.statusText, { color: colors.textSecondary }]}>{t('logging.baby_sleeping')}</Text>
                            </View>
                        )
                    )}

                    <View style={styles.cardActions}>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => handleEdit(item)}
                        >
                            <Pencil size={14} color={colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => handleDelete(item.id)}
                        >
                            <Trash2 size={14} color={colors.feeding} style={{ opacity: 0.8 }} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };


    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
            <View style={[styles.header, { backgroundColor: colors.headerBackground, borderBottomColor: colors.border }]}>
                <Text style={[styles.appTitle, { color: colors.primary }]}>{t('common.app_title')}</Text>

                <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.7}
                    style={styles.headerRightContent}
                >
                    <View style={styles.headerDateGroup}>
                        <View style={styles.titleRow}>
                            <Text style={[styles.headerDateText, { color: colors.text }]}>{formattedSelectedDate.display}</Text>
                            <ChevronDown size={14} color={colors.textSecondary} style={{ marginLeft: 4 }} />
                        </View>
                        {babyInfo && (
                            <Text style={[styles.babyAge, { color: colors.primary }]}>{babyInfo.name}{babyInfo.age}</Text>
                        )}
                    </View>
                </TouchableOpacity>
            </View>

            {showDatePicker && (
                <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    onChange={onDateChange}
                    maximumDate={new Date()}
                    themeVariant={themeMode === 'light' ? 'light' : 'dark'}
                />
            )}

            {!loading && (
                <SummaryCards activities={activities} selectedDate={selectedDate} />
            )}

            {loading ? (
                <View style={[styles.center, { backgroundColor: colors.background }]}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <SectionList
                    sections={groupedActivities}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    renderSectionHeader={({ section: { title, icon, color } }) => (
                        <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
                            {icon}
                            <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
                        </View>
                    )}
                    contentContainerStyle={styles.listContent}
                    stickySectionHeadersEnabled={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                    ListEmptyComponent={
                        <View style={[styles.empty, { backgroundColor: colors.background }]}>
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('dashboard.no_records')}</Text>
                        </View>
                    }
                />
            )}
            <LoggingModal
                visible={loggingModalVisible}
                onClose={() => {
                    setLoggingModalVisible(false);
                    setEditingActivity(null);
                }}
                onSuccess={() => loadData(selectedDate)}
                initialData={editingActivity}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    appTitle: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    headerRightContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerDateGroup: {
        alignItems: 'flex-end',
    },
    headerDateText: {
        fontSize: 15,
        fontWeight: '700',
    },
    babyAge: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingBottom: 100,
        paddingTop: 10,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        gap: 6,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    itemContainer: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginBottom: 12,
    },
    timeSection: {
        width: 50,
        alignItems: 'center',
        marginRight: 15,
        justifyContent: 'center',
    },
    timeText: {
        fontSize: 14,
        fontWeight: '700',
    },
    endTimeText: {
        fontSize: 14,
        fontWeight: '700',
    },
    timelinePoint: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginTop: 4,
    },
    timeLine: {
        width: 2,
        height: 12,
        marginVertical: 4,
        borderRadius: 1,
    },
    card: {
        flex: 1,
        padding: 12,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 1,
        borderWidth: 1,
    },
    feedingCard: {
        borderLeftWidth: 4,
    },
    sleepCard: {
        borderLeftWidth: 4,
    },
    draculaTimelineCard: {
        borderLeftWidth: 6,
        backgroundColor: 'rgba(22, 27, 34, 0.9)',
        shadowOpacity: 0.2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerRight: {
        alignItems: 'flex-end',
    },
    typeText: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
    },
    mainValue: {
        fontSize: 18,
        fontWeight: '900',
    },
    unitText: {
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 2,
    },
    feedingText: {
        color: '#FF6B6B',
    },
    sleepText: {
        color: '#7C4DFF',
    },
    cardBody: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
    },
    statusText: {
        fontSize: 12,
        fontStyle: 'italic',
    },
    noteText: {
        fontSize: 13,
        lineHeight: 18,
    },
    empty: {
        padding: 60,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 15,
    },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 4,
        gap: 12,
        paddingTop: 4,
    },
    actionBtn: {
        padding: 4,
    }
});
