import { View, Text, Input, Button } from '@tarojs/components'
import { useState } from 'react'
import './JoinFamilyModal.scss'

interface JoinFamilyModalProps {
    visible: boolean
    onClose: () => void
    onConfirm: (email: string, password: string) => void
}

export default function JoinFamilyModal({ visible, onClose, onConfirm }: JoinFamilyModalProps) {
    const [step, setStep] = useState<1 | 2>(1)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    if (!visible) return null

    const handleNextStep = () => {
        if (!email.trim()) return
        setStep(2)
    }

    const handleConfirm = () => {
        if (!password.trim()) return
        onConfirm(email, password)
        // 重置状态
        setStep(1)
        setEmail('')
        setPassword('')
        setShowPassword(false)
    }

    const handleClose = () => {
        setStep(1)
        setEmail('')
        setPassword('')
        setShowPassword(false)
        onClose()
    }

    return (
        <View className='modal-overlay' onClick={handleClose}>
            <View className='modal-content' onClick={(e) => e.stopPropagation()}>
                <View className='modal-header'>
                    <Text className='modal-title'>
                        {step === 1 ? '第一步：输入邮箱' : '第二步：输入密码'}
                    </Text>
                </View>

                <View className='modal-body'>
                    {step === 1 ? (
                        <>
                            <Text className='input-label'>请输入主账号的邮箱地址</Text>
                            <Input
                                className='modal-input'
                                type='text'
                                placeholder='请输入邮箱地址'
                                placeholderClass='input-placeholder'
                                value={email}
                                onInput={(e) => setEmail(e.detail.value)}
                                focus
                            />
                        </>
                    ) : (
                        <>
                            <Text className='input-label'>请输入密码以确认身份</Text>
                            <View className='password-input-wrapper'>
                                <Input
                                    className='modal-input password-input'
                                    type='text'
                                    password={!showPassword}
                                    placeholder='请输入密码'
                                    placeholderClass='input-placeholder'
                                    value={password}
                                    onInput={(e) => setPassword(e.detail.value)}
                                    focus
                                />
                                <Text
                                    className='password-toggle'
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? '隐藏' : '查看'}
                                </Text>
                            </View>
                        </>
                    )}
                </View>

                <View className='modal-footer'>
                    <Button className='btn btn-cancel' onClick={handleClose}>取消</Button>
                    {step === 1 ? (
                        <Button
                            className='btn btn-confirm'
                            onClick={handleNextStep}
                            disabled={!email.trim()}
                        >
                            下一步
                        </Button>
                    ) : (
                        <Button
                            className='btn btn-confirm'
                            onClick={handleConfirm}
                            disabled={!password.trim()}
                        >
                            确认加入
                        </Button>
                    )}
                </View>

                <View className='modal-warning'>
                    <Text className='warning-text'>
                        ⚠️ 加入家庭后，您当前的数据将被隐藏，将共享主账号的数据。
                    </Text>
                </View>
            </View>
        </View>
    )
}
