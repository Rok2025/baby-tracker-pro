import React from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { UIProvider, useUI } from './src/context/UIContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { AppNavigator } from './src/navigation/AppNavigator';
import { LoggingModal } from './src/components/dashboard/LoggingModal';

const Main = () => {
  const { user, loading } = useAuth();
  const { isLogModalVisible, closeLogModal } = useUI();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={{ marginTop: 10, color: '#999' }}>加载中...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
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
      <StatusBar style="auto" />
    </View>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <UIProvider>
          <Main />
        </UIProvider>
      </AuthProvider>
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
