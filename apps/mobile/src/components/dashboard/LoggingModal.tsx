import React, { useState } from 'react';
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
} from 'react-native';
import { Milk, Moon, X, Check } from 'lucide-react-native';
import { getSupabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface LoggingModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const LoggingModal = ({ visible, onClose, onSuccess }: LoggingModalProps) => {
    const { user } = useAuth();
    const [type, setType] = useState<'feeding' | 'sleep'>('feeding');
    const [volume, setVolume] = useState('120');
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!user) return;
        setLoading(true);

        try {
            const db = getSupabase();
            const now = new Date();

            const { error } = await db.from('activities').insert([
                {
                    user_id: user.id,
                    type,
                    start_time: now.toISOString(),
                    volume: type === 'feeding' ? Number(volume) : null,
                    note: note || null,
                },
            ]);

            if (error) throw error;

            onSuccess();
            onClose();
            setNote('');
        } catch (error) {
            console.error(error);
            alert('记录失败');
        } finally {
            setLoading(false);
        }
    };

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
                    <View style={styles.content}>
                        <View style={styles.header}>
                            <Text style={styles.headerTitle}>记录事件</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <X size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={styles.form}>
                            <View style={styles.tabContainer}>
                                <TouchableOpacity
                                    style={[styles.tab, type === 'feeding' && styles.activeFeedingTab]}
                                    onPress={() => setType('feeding')}
                                >
                                    <Milk size={20} color={type === 'feeding' ? '#FFF' : '#FF6B6B'} />
                                    <Text style={[styles.tabText, type === 'feeding' && styles.activeTabText]}>喂奶</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.tab, type === 'sleep' && styles.activeSleepTab]}
                                    onPress={() => setType('sleep')}
                                >
                                    <Moon size={20} color={type === 'sleep' ? '#FFF' : '#7C4DFF'} />
                                    <Text style={[styles.tabText, type === 'sleep' && styles.activeTabText]}>睡眠</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.fields}>
                                {type === 'feeding' && (
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>奶量 (ml)</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={volume}
                                            onChangeText={setVolume}
                                            keyboardType="numeric"
                                            placeholder="120"
                                        />
                                    </View>
                                )}

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>备注</Text>
                                    <TextInput
                                        style={[styles.input, styles.textArea]}
                                        value={note}
                                        onChangeText={setNote}
                                        placeholder="可选"
                                        multiline={true}
                                        numberOfLines={3}
                                    />
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.submitBtn, type === 'sleep' ? styles.sleepBtn : styles.feedingBtn]}
                                onPress={handleSubmit}
                                disabled={loading}
                            >
                                {loading ? <ActivityIndicator color="#FFF" /> : (
                                    <>
                                        <Check size={20} color="#FFF" />
                                        <Text style={styles.submitText}>完成并保存</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
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
        maxHeight: '80%',
    },
    content: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
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
        paddingBottom: 40,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#F1F3F5',
        padding: 5,
        borderRadius: 15,
        marginBottom: 30,
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
        marginBottom: 30,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#495057',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F8F9FA',
        borderWidth: 1,
        borderColor: '#F1F3F5',
        padding: 15,
        borderRadius: 12,
        fontSize: 16,
        color: '#333',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        borderRadius: 15,
        // 彻底移除阴影
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
});
