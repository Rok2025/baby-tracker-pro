import { View, Text, Button, Input, Picker } from '@tarojs/components'
import { useState } from 'react'
import Taro from '@tarojs/taro'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import './index.scss'

type RecordType = 'feeding' | 'sleep'

export default function Record() {
    const { session } = useAuth()
    const [recordType, setRecordType] = useState<RecordType>('feeding')
    const [volume, setVolume] = useState('120')
    const [note, setNote] = useState('')
    const [loading, setLoading] = useState(false)

    // 时间选择
    const now = new Date()
    const [startTime, setStartTime] = useState(
        `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    )
    const [endTime, setEndTime] = useState('')

    const handleSubmit = async () => {
        if (!session?.user) {
            Taro.showToast({ title: '请先登录', icon: 'error' })
            return
        }

        if (recordType === 'feeding' && (!volume || parseInt(volume) <= 0)) {
            Taro.showToast({ title: '请输入奶量', icon: 'error' })
            return
        }

        setLoading(true)

        try {
            const today = new Date()
            const [startH, startM] = startTime.split(':').map(Number)
            const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), startH, startM)

            let endDate: Date | null = null
            if (recordType === 'sleep' && endTime) {
                const [endH, endM] = endTime.split(':').map(Number)
                endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), endH, endM)
                // 如果结束时间小于开始时间，说明跨天
                if (endDate < startDate) {
                    endDate.setDate(endDate.getDate() + 1)
                }
            }

            const { error } = await supabase.from('activities').insert({
                user_id: session.user.id,
                type: recordType,
                start_time: startDate.toISOString(),
                end_time: endDate?.toISOString() || null,
                volume: recordType === 'feeding' ? parseInt(volume) : null,
                note: note || null,
            })

            if (error) {
                console.error('Insert error:', error)
                Taro.showToast({ title: '保存失败', icon: 'error' })
            } else {
                Taro.showToast({ title: '保存成功', icon: 'success' })
                // 返回首页
                setTimeout(() => {
                    Taro.switchTab({ url: '/pages/index/index' })
                }, 1000)
            }
        } catch (e) {
            console.error('Error:', e)
            Taro.showToast({ title: '保存失败', icon: 'error' })
        } finally {
            setLoading(false)
        }
    }

    if (!session) {
        return (
            <View className='record-page'>
                <View className='not-logged-in'>
                    <Text>请先登录</Text>
                </View>
            </View>
        )
    }

    return (
        <View className='record-page'>
            {/* 类型选择 */}
            <View className='type-selector'>
                <View
                    className={`type-btn ${recordType === 'feeding' ? 'active feeding' : ''}`}
                    onClick={() => setRecordType('feeding')}
                >
                    <Text className='type-icon'>🍼</Text>
                    <Text className='type-text'>喂奶</Text>
                </View>
                <View
                    className={`type-btn ${recordType === 'sleep' ? 'active sleep' : ''}`}
                    onClick={() => setRecordType('sleep')}
                >
                    <Text className='type-icon'>😴</Text>
                    <Text className='type-text'>睡眠</Text>
                </View>
            </View>

            {/* 表单 */}
            <View className='form'>
                {recordType === 'feeding' ? (
                    <View className='form-group'>
                        <Text className='label'>奶量 (ml)</Text>
                        <View className='volume-input'>
                            <Input
                                type='number'
                                value={volume}
                                onInput={(e) => setVolume(e.detail.value)}
                                placeholder='输入奶量'
                                className='input'
                            />
                            <View className='quick-btns'>
                                {[60, 90, 120, 150, 180].map(v => (
                                    <View
                                        key={v}
                                        className={`quick-btn ${volume === String(v) ? 'active' : ''}`}
                                        onClick={() => setVolume(String(v))}
                                    >
                                        <Text>{v}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                ) : null}

                <View className='form-group'>
                    <Text className='label'>开始时间</Text>
                    <Picker
                        mode='time'
                        value={startTime}
                        onChange={(e) => setStartTime(e.detail.value)}
                    >
                        <View className='picker-value'>
                            <Text>{startTime || '选择时间'}</Text>
                        </View>
                    </Picker>
                </View>

                {recordType === 'sleep' && (
                    <View className='form-group'>
                        <Text className='label'>结束时间 (可选)</Text>
                        <Picker
                            mode='time'
                            value={endTime}
                            onChange={(e) => setEndTime(e.detail.value)}
                        >
                            <View className='picker-value'>
                                <Text>{endTime || '宝宝还在睡觉...'}</Text>
                            </View>
                        </Picker>
                    </View>
                )}

                <View className='form-group'>
                    <Text className='label'>备注 (可选)</Text>
                    <Input
                        value={note}
                        onInput={(e) => setNote(e.detail.value)}
                        placeholder='添加备注...'
                        className='input note-input'
                    />
                </View>
            </View>

            {/* 提交按钮 */}
            <View className='submit-area'>
                <Button
                    className={`submit-btn ${recordType}`}
                    onClick={handleSubmit}
                    loading={loading}
                    disabled={loading}
                >
                    保存记录
                </Button>
            </View>
        </View>
    )
}
