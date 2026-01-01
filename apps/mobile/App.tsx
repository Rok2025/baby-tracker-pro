import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
// 演示：引用共享包中的类型
import { type Activity } from '@yoyo/api';

export default function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 模拟检查 Supabase 连接（后续接入 auth）
    setTimeout(() => {
      setLoading(false);
    }, 1500);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>BabyTracker Pro</Text>
        <Text style={styles.subtitle}>iOS / Android 版</Text>
      </View>

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#FF6B6B" />
        ) : (
          <>
            <Text style={styles.welcome}>欢迎回来！</Text>
            <Text style={styles.info}>
              Monorepo 架构验证成功。
              目前已成功引用 @yoyo/api 共享逻辑。
            </Text>
            <View style={styles.card}>
              <Text style={styles.cardText}>🚀 准备开始重构移动端 UI</Text>
            </View>
          </>
        )}
      </View>

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingTop: 80,
    paddingBottom: 40,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  welcome: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  info: {
    textAlign: 'center',
    color: '#666',
    lineHeight: 22,
    marginBottom: 30,
  },
  card: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  cardText: {
    color: '#FF6B6B',
    fontWeight: 'bold',
  }
});
