import { View, Text, Button, Input } from '@tarojs/components'
import { useState } from 'react'
import Taro from '@tarojs/taro'
import { useAuth } from '../../context/AuthContext'
import './index.scss'

export default function Login() {
    const { signInWithPassword, signUp, signInAnonymously, signInWithWechat, loading } = useAuth()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showEmailForm, setShowEmailForm] = useState(false)
    const [isRegister, setIsRegister] = useState(false)

    const handleEmailAuth = async () => {
        if (!email || !password) {
            Taro.showToast({ title: '请填写邮箱和密码', icon: 'none' })
            return
        }

        if (isRegister) {
            await signUp(email, password)
        } else {
            await signInWithPassword(email, password)
        }
    }

    const handleQuickLogin = () => {
        signInAnonymously()
    }

    const toggleMode = () => {
        setIsRegister(!isRegister)
    }

    return (
        <View className='login-container'>
            <View className='login-header'>
                <View className='logo-placeholder'>👶</View>
                <Text className='app-title'>宝宝成长助手</Text>
                <Text className='app-subtitle'>记录宝宝每一个珍贵时刻</Text>
            </View>

            <View className='login-content'>
                {!showEmailForm ? (
                    <View className='features'>
                        <View className='feature-item'>
                            <Text className='feature-icon'>🍼</Text>
                            <Text className='feature-text'>喂奶记录</Text>
                        </View>
                        <View className='feature-item'>
                            <Text className='feature-icon'>😴</Text>
                            <Text className='feature-text'>睡眠追踪</Text>
                        </View>
                        <View className='feature-item'>
                            <Text className='feature-icon'>📊</Text>
                            <Text className='feature-text'>数据统计</Text>
                        </View>
                    </View>
                ) : (
                    <View className='email-form'>
                        <View className='form-header'>
                            <Text className='form-title'>{isRegister ? '注册账号' : '邮箱登录'}</Text>
                        </View>
                        <View className='form-group'>
                            <Text className='label'>邮箱</Text>
                            <Input
                                type='text'
                                placeholder='请输入邮箱'
                                value={email}
                                onInput={(e) => setEmail(e.detail.value)}
                                className='input'
                            />
                        </View>
                        <View className='form-group'>
                            <Text className='label'>密码</Text>
                            <Input
                                type='text'
                                password
                                placeholder='请输入密码'
                                value={password}
                                onInput={(e) => setPassword(e.detail.value)}
                                className='input'
                            />
                        </View>
                        <View className='form-actions'>
                            <Text className='switch-mode-btn' onClick={toggleMode}>
                                {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
                            </Text>
                        </View>
                    </View>
                )}
            </View>

            <View className='login-footer'>
                {showEmailForm ? (
                    <>
                        <Button
                            className='login-btn email-btn'
                            onClick={handleEmailAuth}
                            loading={loading}
                            disabled={loading}
                        >
                            {isRegister ? '注册' : '登录'}
                        </Button>
                        <View className='back-link' onClick={() => {
                            setShowEmailForm(false)
                            setIsRegister(false)
                        }}>
                            <Text>← 返回</Text>
                        </View>
                    </>
                ) : (
                    <>
                        <Button
                            className='login-btn account-btn'
                            onClick={() => setShowEmailForm(true)}
                        >
                            使用账号登录/注册
                        </Button>
                        <Button
                            className='login-btn wechat-btn'
                            onClick={() => signInWithWechat()}
                            loading={loading}
                            disabled={loading}
                        >
                            微信一键登录
                        </Button>
                        <Button
                            className='login-btn guest-btn'
                            onClick={handleQuickLogin}
                            loading={loading}
                            disabled={loading}
                        >
                            游客体验
                        </Button>
                    </>
                )}
                <Text className='login-tip'>登录后可同步您的数据到云端</Text>
            </View>
        </View>
    )
}
