import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Switch,
    Alert
} from 'react-native';
import { Milk, Moon, X, Check, Clock, Calendar } from 'lucide-react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { getSupabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { useTranslation } from 'react-i18next';

interface LoggingModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any; // Activity or null
}

export const LoggingModal = ({ visible, onClose, onSuccess, initialData }: LoggingModalProps) => {
    const { user } = useAuth();
    const { themeMode, colors } = useConfig();
    const isDracula = themeMode === 'dracula';
    const { t } = useTranslation();
    const [type, setType] = useState<'feeding' | 'sleep'>('feeding');
    const [volume, setVolume] = useState('120');
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);

    // 核心时间对象：强制初始化为当前此刻
    const [startTime, setStartTime] = useState(new Date());
    const [endTime, setEndTime] = useState(new Date());
    const [isSleepOngoing, setIsSleepOngoing] = useState(false);

    // 控制哪些 Picker 显示
    const [activePicker, setActivePicker] = useState<{
        mode: 'date' | 'time';
        target: 'start' | 'end';
    } | null>(null);

    // 当弹窗打开时，或者 initialData 变化时，同步状态
    useEffect(() => {
        if (visible) {
            if (initialData) {
                setType(initialData.type);
                setVolume(initialData.volume ? String(initialData.volume) : '120');
                setNote(initialData.note || '');
                setStartTime(new Date(initialData.start_time));
                if (initialData.type === 'sleep') {
                    if (initialData.end_time) {
                        setEndTime(new Date(initialData.end_time));
                        setIsSleepOngoing(false);
                    } else {
                        setEndTime(new Date());
                        setIsSleepOngoing(true);
                    }
                }
            } else {
                const now = new Date();
                setStartTime(now);
                setEndTime(now);
                setIsSleepOngoing(false);
                setNote('');
                setType('feeding');
                setVolume('120');
            }
        }
    }, [visible, initialData]);

    const onPickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        // Android 模式下，选择完成后立即关闭
        if (Platform.OS === 'android') {
            setActivePicker(null);
        }

        if (selectedDate && activePicker) {
            const { target, mode } = activePicker;
            // 复制一份当前时间，避免直接操作状态对象
            const baseDate = target === 'start' ? new Date(startTime) : new Date(endTime);

            let nextDate: Date;
            if (mode === 'date') {
                // 更新年月日，保留时分秒
                nextDate = new Date(
                    selectedDate.getFullYear(),
                    selectedDate.getMonth(),
                    selectedDate.getDate(),
                    baseDate.getHours(),
                    baseDate.getMinutes(),
                    0
                );
            } else {
                // 更新时分，保留年月日
                nextDate = new Date(
                    baseDate.getFullYear(),
                    baseDate.getMonth(),
                    baseDate.getDate(),
                    selectedDate.getHours(),
                    selectedDate.getMinutes(),
                    0
                );
            }

            if (target === 'start') {
                setStartTime(nextDate);
                // 联动：如果结束时间早于开始时间，自动同步结束时间（针对睡眠补录）
                if (type === 'sleep' && !isSleepOngoing && nextDate > endTime) {
                    const linkedEnd = new Date(nextDate.getTime() + 60 * 60 * 1000); // 默认推后1小时
                    setEndTime(linkedEnd);
                }
            } else {
                setEndTime(nextDate);
            }
        }
    };

    const handleSubmit = async () => {
        if (!user) return;
        setLoading(true);

        try {
            const db = getSupabase();

            const payload = {
                user_id: user.id,
                type,
                start_time: startTime.toISOString(),
                end_time: (type === 'sleep' && !isSleepOngoing) ? endTime.toISOString() : null,
                volume: type === 'feeding' ? Number(volume) : null,
                note: note || null,
            };

            const { error } = initialData
                ? await db.from('activities').update(payload).eq('id', initialData.id)
                : await db.from('activities').insert([payload]);

            if (error) throw error;

            onSuccess();
            onClose();
            setNote('');
        } catch (error) {
            console.error(error);
            Alert.alert(t('common.error'), t('dashboard.delete_fail')); // Reuse delete_fail as generic record fail for now, or add specific key
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const renderTimeRow = (label: string, date: Date, target: 'start' | 'end') => (
        <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
            <View style={styles.dateTimeRow}>
                <TouchableOpacity
                    style={[styles.pickerBtn, { flex: 1.2, backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => setActivePicker({ mode: 'date', target })}
                >
                    <Calendar size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={[styles.pickerValueText, { color: colors.text }]}>{formatDate(date)}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.pickerBtn, { flex: 1, backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => setActivePicker({ mode: 'time', target })}
                >
                    <Clock size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={[styles.pickerValueText, { color: colors.text }]}>{formatTime(date)}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.container}
                >
                    <View style={[
                        styles.content,
                        { backgroundColor: colors.card },
                        isDracula && styles.draculaModalContent
                    ]}>
                        <View style={styles.header}>
                            <Text style={[styles.headerTitle, { color: colors.text }]}>
                                {initialData ? t('logging.title_edit') : t('logging.title_add')}
                            </Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <X size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={styles.form}>
                            <View style={[styles.tabContainer, { backgroundColor: isDracula ? '#0B1117' : colors.background }]}>
                                <TouchableOpacity
                                    style={[
                                        styles.tab,
                                        type === 'feeding' && { backgroundColor: isDracula ? colors.primary : colors.feeding },
                                        isDracula && type !== 'feeding' && { backgroundColor: 'transparent' }
                                    ]}
                                    onPress={() => setType('feeding')}
                                >
                                    <Milk size={20} color={type === 'feeding' ? (isDracula ? '#0B1117' : '#FFF') : colors.feeding} />
                                    <Text style={[
                                        styles.tabText,
                                        { color: type === 'feeding' ? (isDracula ? '#0B1117' : '#FFF') : colors.text }
                                    ]}>{t('logging.feeding')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.tab,
                                        type === 'sleep' && { backgroundColor: isDracula ? colors.primary : colors.sleep },
                                        isDracula && type !== 'sleep' && { backgroundColor: 'transparent' }
                                    ]}
                                    onPress={() => setType('sleep')}
                                >
                                    <Moon size={20} color={type === 'sleep' ? (isDracula ? '#0B1117' : '#FFF') : colors.sleep} />
                                    <Text style={[
                                        styles.tabText,
                                        { color: type === 'sleep' ? (isDracula ? '#0B1117' : '#FFF') : colors.text }
                                    ]}>{t('logging.sleep')}</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.fields}>
                                {renderTimeRow(type === 'sleep' ? t('logging.sleep_start') : t('logging.time'), startTime, 'start')}

                                {type === 'sleep' && (
                                    <>
                                        <View style={[styles.ongoingRow, { backgroundColor: colors.background }]}>
                                            <Text style={[styles.label, { color: colors.text }]}>{t('logging.ongoing_label')}</Text>
                                            <Switch
                                                value={isSleepOngoing}
                                                onValueChange={setIsSleepOngoing}
                                                trackColor={{ false: colors.textSecondary, true: colors.sleep }}
                                                thumbColor={'#FFF'}
                                            />
                                        </View>

                                        {!isSleepOngoing && (
                                            renderTimeRow(t('logging.sleep_end'), endTime, 'end')
                                        )}
                                    </>
                                )}

                                {type === 'feeding' && (
                                    <View style={styles.inputGroup}>
                                        <Text style={[styles.label, { color: colors.text }]}>{t('logging.volume_label')}</Text>
                                        <TextInput
                                            style={[
                                                styles.input,
                                                { backgroundColor: colors.background, color: colors.text, borderColor: isDracula ? 'rgba(255,255,255,0.05)' : colors.border }
                                            ]}
                                            value={volume}
                                            onChangeText={setVolume}
                                            keyboardType="numeric"
                                            placeholder="120"
                                            placeholderTextColor={colors.textSecondary}
                                        />
                                    </View>
                                )}

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: colors.text }]}>{t('logging.note_label')}</Text>
                                    <TextInput
                                        style={[
                                            styles.input,
                                            styles.textArea,
                                            { backgroundColor: colors.background, color: colors.text, borderColor: isDracula ? 'rgba(255,255,255,0.05)' : colors.border }
                                        ]}
                                        value={note}
                                        onChangeText={setNote}
                                        placeholder={t('logging.note_placeholder')}
                                        placeholderTextColor={colors.textSecondary}
                                        multiline={true}
                                        numberOfLines={3}
                                    />
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.submitBtn,
                                    { backgroundColor: isDracula ? colors.primary : (type === 'sleep' ? colors.sleep : colors.feeding) }
                                ]}
                                onPress={handleSubmit}
                                disabled={loading}
                            >
                                {loading ? <ActivityIndicator color={isDracula ? '#0B1117' : "#FFF"} /> : (
                                    <>
                                        <Check size={20} color={isDracula ? '#0B1117' : "#FFF"} />
                                        <Text style={[styles.submitText, { color: isDracula ? '#0B1117' : '#FFF' }]}>{t('logging.submit')}</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </ScrollView>

                        {activePicker && (
                            <View style={Platform.OS === 'ios' ? [styles.iosPickerContainer, { backgroundColor: colors.card, borderTopColor: colors.border }] : null}>
                                {Platform.OS === 'ios' && (
                                    <View style={[styles.iosPickerHeader, { borderBottomColor: colors.border }]}>
                                        <TouchableOpacity onPress={() => setActivePicker(null)}>
                                            <Text style={[styles.iosDoneBtn, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => setActivePicker(null)}>
                                            <Text style={[styles.iosDoneBtn, { color: colors.primary, marginLeft: 20 }]}>{t('common.confirm')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                                <DateTimePicker
                                    value={activePicker.target === 'start' ? new Date(startTime) : new Date(endTime)}
                                    mode={activePicker.mode}
                                    is24Hour={true}
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={onPickerChange}
                                    themeVariant={themeMode === 'light' ? 'light' : 'dark'}
                                />
                            </View>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        maxHeight: '90%',
    },
    content: {
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
    },
    draculaModalContent: {
        backgroundColor: '#0B1117',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    closeBtn: {
        padding: 5,
    },
    form: {
        paddingBottom: 20,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#F1F3F5',
        padding: 5,
        borderRadius: 15,
        marginBottom: 20,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
    },
    activeFeedingTab: {
        backgroundColor: '#FF6B6B',
    },
    activeSleepTab: {
        backgroundColor: '#7C4DFF',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#495057',
        marginLeft: 8,
    },
    activeTabText: {
        color: '#FFF',
    },
    fields: {
        marginBottom: 10,
    },
    inputGroup: {
        marginBottom: 15,
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#495057',
        marginBottom: 8,
    },
    dateTimeRow: {
        flexDirection: 'row',
        gap: 10,
    },
    pickerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8F9FA',
        borderWidth: 1,
        borderColor: '#F1F3F5',
        paddingVertical: 12,
        borderRadius: 12,
    },
    pickerValueText: {
        fontSize: 15,
        fontWeight: '600',
    },
    ongoingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        padding: 12,
        borderRadius: 12,
    },
    input: {
        padding: 15,
        borderRadius: 12,
        fontSize: 16,
    },
    textArea: {
        height: 60,
        textAlignVertical: 'top',
    },
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    feedingBtn: {
        backgroundColor: '#FF6B6B',
    },
    sleepBtn: {
        backgroundColor: '#7C4DFF',
    },
    submitText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    iosPickerContainer: {
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#EEE',
        paddingBottom: 20,
    },
    iosPickerHeader: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    iosDoneBtn: {
        color: '#007AFF',
        fontWeight: '600',
        fontSize: 16,
    }
});
