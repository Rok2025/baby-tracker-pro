import { View, Text, Button } from '@tarojs/components'
import { useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { useAuth } from '../../context/AuthContext'
import LoginComponent from '../../components/Login'
import JoinFamilyModal from '../../components/JoinFamilyModal'
import './index.scss'

export default function Settings() {
    const { session, loading, signOut, bindWechat, unbindWechat, linkAccount, wechatBindingStatus } = useAuth()
    const [showJoinModal, setShowJoinModal] = useState(false)

    // 设置底部导航选中状态
    useDidShow(() => {
        const page = Taro.getCurrentPages().pop()
        if (page) {
            const tabBar = Taro.getTabBar<{ setSelected: (index: number) => void }>(page as any)
            if (tabBar) tabBar.setSelected(2)
        }
    })


    if (loading) {
        return (
            <View className='settings-loading'>
                <View className='loading-spinner' />
            </View>
        )
    }

    if (!session) return <LoginComponent />

    const handleJoinFamily = () => {
        setShowJoinModal(true)
    }

    const handleJoinConfirm = (email: string, password: string) => {
        setShowJoinModal(false)
        linkAccount(email, password)
    }

    const handleUnbind = () => {
        Taro.showModal({
            title: '确认解绑',
            content: '解绑后您将回到个人独立模式，并刷新当前会话。确定操作吗？',
            confirmColor: '#ff6b6b',
            success: (res) => {
                if (res.confirm) {
                    unbindWechat()
                }
            }
        })
    }

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

    // 根据绑定状态决定显示哪些按钮
    // 'none': 邮箱登录，未绑定微信 -> 显示"微信绑定"和"加入家庭"
    // 'independent': 微信登录，独立账号 -> 仅显示"加入家庭"
    // 'shared': 微信登录，已加入家庭 -> 仅显示"解绑/退出"
    const showBindWechat = wechatBindingStatus === 'none'
    const showJoinFamily = wechatBindingStatus === 'none' || wechatBindingStatus === 'independent'
    const showUnbind = wechatBindingStatus === 'shared'

    return (
        <View className='settings-page'>
            <View className='section'>
                <Text className='section-title'>账户与绑定</Text>
                <View className='info-card'>
                    <View className='info-row'>
                        <Text className='label'>用户ID</Text>
                        <Text className='value'>{session?.user?.id?.slice(0, 8) || '未登录'}...</Text>
                    </View>
                    {showBindWechat && (
                        <View className='info-row' onClick={() => bindWechat()}>
                            <Text className='label'>微信绑定</Text>
                            <View className='value-with-arrow'>
                                <Text className='value action-text'>点击绑定当前微信</Text>
                                <Text className='arrow'>›</Text>
                            </View>
                        </View>
                    )}
                    {showJoinFamily && (
                        <View className='info-row' onClick={handleJoinFamily}>
                            <Text className='label'>加入家庭</Text>
                            <View className='value-with-arrow'>
                                <Text className='value action-text'>共享其他账号数据</Text>
                                <Text className='arrow'>›</Text>
                            </View>
                        </View>
                    )}
                    {showUnbind && (
                        <View className='info-row' onClick={handleUnbind}>
                            <Text className='label'>解绑/退出</Text>
                            <View className='value-with-arrow'>
                                <Text className='value action-text'>退出家庭共享模式</Text>
                                <Text className='arrow'>›</Text>
                            </View>
                        </View>
                    )}
                </View>
                <Text className='section-tip'>「加入家庭」可让多个手机共享一套数据。如果您不小心关联错了，点击「解绑」即可恢复。</Text>
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

            {/* Join Family Modal */}
            <JoinFamilyModal
                visible={showJoinModal}
                onClose={() => setShowJoinModal(false)}
                onConfirm={handleJoinConfirm}
            />
        </View>
    )
}
