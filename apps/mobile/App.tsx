import React from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { UIProvider, useUI } from './src/context/UIContext';
import { ConfigProvider, useConfig } from './src/context/ConfigContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { AppNavigator } from './src/navigation/AppNavigator';
import { LoggingModal } from './src/components/dashboard/LoggingModal';
import './src/i18n';

const Main = () => {
  const { user, loading } = useAuth();
  const { isLogModalVisible, closeLogModal } = useUI();
  const { colors } = useConfig();

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 10, color: colors.textSecondary }}>加载中...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <NavigationContainer>
        {user ? <AppNavigator /> : <LoginScreen />}
      </NavigationContainer>

      {user && (
        <LoggingModal
          visible={isLogModalVisible}
          onClose={closeLogModal}
          onSuccess={() => {
            console.log('Logged successfully');
          }}
        />
      )}
      <StatusBar style={colors.statusBarStyle as any} />
    </View>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ConfigProvider>
        <AuthProvider>
          <UIProvider>
            <Main />
          </UIProvider>
        </AuthProvider>
      </ConfigProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
