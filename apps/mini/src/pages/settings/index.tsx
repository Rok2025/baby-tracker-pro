import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useAuth } from '../../context/AuthContext'
import './index.scss'

export default function Settings() {
    const { user, session, signOut } = useAuth()

    const handleLogout = async () => {
        Taro.showModal({
            title: '确认退出',
            content: '确定要退出登录吗？',
            success: async (res) => {
                if (res.confirm) {
                    await signOut()
                }
            }
        })
    }

    return (
        <View className='settings-page'>
            <View className='section'>
                <Text className='section-title'>账户信息</Text>
                <View className='info-card'>
                    <View className='info-row'>
                        <Text className='label'>用户ID</Text>
                        <Text className='value'>{session?.user?.id?.slice(0, 8) || '未登录'}...</Text>
                    </View>
                </View>
            </View>

            <View className='section'>
                <Text className='section-title'>关于</Text>
                <View className='info-card'>
                    <View className='info-row'>
                        <Text className='label'>版本</Text>
                        <Text className='value'>1.0.0</Text>
                    </View>
                    <View className='info-row'>
                        <Text className='label'>应用名称</Text>
                        <Text className='value'>宝宝成长助手</Text>
                    </View>
                </View>
            </View>

            <View className='logout-section'>
                <Button className='logout-btn' onClick={handleLogout}>
                    退出登录
                </Button>
            </View>
        </View>
    )
}
