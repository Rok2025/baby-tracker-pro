import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LayoutDashboard, Settings, PlusCircle } from 'lucide-react-native';
import { View, StyleSheet } from 'react-native';
import { TimelineScreen } from '../screens/Dashboard/TimelineScreen';
import { useUI } from '../context/UIContext';

const Tab = createBottomTabNavigator();

// 简单的占位页面
const Placeholder = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' }}>
        <LayoutDashboard size={48} color="#FF6B6B" />
    </View>
);

const Empty = () => null;

export const AppNavigator = () => {
    const { openLogModal } = useUI();

    return (
        <Tab.Navigator
            screenOptions={{
                tabBarActiveTintColor: '#FF6B6B',
                tabBarInactiveTintColor: '#999',
                headerShown: false,
                tabBarShowLabel: false, // 全局隐藏 Label，避免潜在的类型报错
                tabBarStyle: {
                    borderTopWidth: 1,
                    borderTopColor: '#f1f1f1',
                    height: 60,
                }
            }}
        >
            <Tab.Screen
                name="Dashboard"
                component={TimelineScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />
                }}
            />

            <Tab.Screen
                name="Add"
                component={Empty}
                options={{
                    tabBarIcon: () => (
                        <View style={styles.plusContainer}>
                            <PlusCircle size={44} color="#FF6B6B" />
                        </View>
                    ),
                }}
                listeners={{
                    tabPress: (e) => {
                        e.preventDefault();
                        openLogModal();
                    },
                }}
            />

            <Tab.Screen
                name="Settings"
                component={Placeholder}
                options={{
                    tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />
                }}
            />
        </Tab.Navigator>
    );
};

const styles = StyleSheet.create({
    plusContainer: {
        bottom: 5,
    }
});
