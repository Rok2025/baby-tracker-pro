import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useConfig } from '../context/ConfigContext';

export const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const { colors } = useConfig();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('错误', '请输入邮箱和密码');
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            Alert.alert('登录失败', error.message);
        }
        setLoading(false);
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: colors.background }]}
        >
            <View style={styles.inner}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>欢迎回来</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>请登录以同步您的宝宝数据</Text>
                </View>

                <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>邮箱地址</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                            placeholder="example@mail.com"
                            placeholderTextColor={colors.textSecondary}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>密码</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                            placeholder="请输入密码"
                            placeholderTextColor={colors.textSecondary}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={true}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.buttonText}>登录</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    inner: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    header: {
        marginBottom: 40,
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
    },
    form: {
        backgroundColor: '#FFF',
        padding: 20,
        borderRadius: 20,
        // 彻底移除阴影，使用边框代替，避免 Fabric 报错
        borderWidth: 1,
        borderColor: '#eee',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F1F3F5',
        padding: 15,
        borderRadius: 12,
        fontSize: 16,
        color: '#333',
    },
    button: {
        backgroundColor: '#FF6B6B',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
