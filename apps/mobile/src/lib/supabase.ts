import 'react-native-get-random-values';
import { initSupabase } from '@yoyo/api';
import { ExpoSecureStoreAdapter } from './storage';

// 从 Expo 环境变量中读取
// 注意：在 Expo 中使用环境变量需要 EXPO_PUBLIC_ 前缀
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = initSupabase(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // 移动端不需要这个
    },
});

export * from '@yoyo/api';
