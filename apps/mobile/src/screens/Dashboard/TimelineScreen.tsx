import React, { useEffect, useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { fetchActivitiesForDay, type Activity } from '../../lib/supabase';
import { Milk, Moon } from 'lucide-react-native';

export const TimelineScreen = () => {
    const { user } = useAuth();
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async () => {
        if (!user) return;
        try {
            const data = await fetchActivitiesForDay(user.id, new Date());
            setActivities(data.sort((a: Activity, b: Activity) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [user]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const renderItem = ({ item }: { item: Activity }) => {
        const isSleep = item.type === 'sleep';
        const time = new Date(item.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

        return (
            <View style={styles.itemContainer}>
                <View style={styles.timeSection}>
                    <Text style={styles.timeText}>{time}</Text>
                    <View style={styles.timelinePoint} />
                </View>

                <View style={[styles.card, isSleep ? styles.sleepCard : styles.feedingCard]}>
                    <View style={styles.cardHeader}>
                        {isSleep ? <Moon size={18} color="#7C4DFF" /> : <Milk size={18} color="#FF6B6B" />}
                        <Text style={[styles.typeText, isSleep ? styles.sleepText : styles.feedingText]}>
                            {isSleep ? '睡眠' : '喂奶'}
                        </Text>
                    </View>

                    <View style={styles.cardBody}>
                        <Text style={styles.valueText}>
                            {isSleep ? (item.end_time ? '完成' : '进行中') : `${item.volume}ml`}
                        </Text>
                        {item.note ? <Text style={styles.noteText}>{item.note}</Text> : null}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>今日记录</Text>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#FF6B6B" />
                </View>
            ) : (
                <FlatList
                    data={activities}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Text style={styles.emptyText}>今天还没有记录哦，点击下方 + 开始吧</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    header: {
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f1f1',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 20,
        paddingBottom: 100, // 为底部 Tab 留出空间
    },
    itemContainer: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    timeSection: {
        width: 60,
        alignItems: 'center',
        marginRight: 15,
    },
    timeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    timelinePoint: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#E0E0E0',
        marginTop: 8,
    },
    card: {
        flex: 1,
        padding: 15,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    feedingCard: {
        backgroundColor: '#FFF0F0',
        borderLeftWidth: 4,
        borderLeftColor: '#FF6B6B',
    },
    sleepCard: {
        backgroundColor: '#F0EFFF',
        borderLeftWidth: 4,
        borderLeftColor: '#7C4DFF',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    typeText: {
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    feedingText: {
        color: '#FF6B6B',
    },
    sleepText: {
        color: '#7C4DFF',
    },
    cardBody: {
        flexDirection: 'column',
    },
    valueText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    noteText: {
        fontSize: 12,
        color: '#999',
        marginTop: 5,
    },
    empty: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: '#999',
        textAlign: 'center',
    }
});
