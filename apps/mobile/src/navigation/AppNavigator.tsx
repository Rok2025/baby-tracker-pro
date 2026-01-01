import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LayoutDashboard, Settings, PlusCircle } from 'lucide-react-native';
import { View, StyleSheet } from 'react-native';
import { TimelineScreen } from '../screens/Dashboard/TimelineScreen';
import { SettingsScreen } from '../screens/Dashboard/SettingsScreen';
import { useUI } from '../context/UIContext';
import { useConfig } from '../context/ConfigContext';
import { useTranslation } from 'react-i18next';

const Tab = createBottomTabNavigator();

// 简单的占位页面
const Placeholder = () => {
    const { colors } = useConfig();
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
            <LayoutDashboard size={48} color={colors.primary} />
        </View>
    );
};

const Empty = () => null;

export const AppNavigator = () => {
    const { openLogModal } = useUI();
    const { themeMode, colors } = useConfig();
    const { t } = useTranslation();

    return (
        <Tab.Navigator
            screenOptions={{
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.tabInactive,
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: {
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                    height: 60,
                    backgroundColor: colors.tabBar,
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
                            <PlusCircle size={44} color={colors.primary} />
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
                component={SettingsScreen}
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
