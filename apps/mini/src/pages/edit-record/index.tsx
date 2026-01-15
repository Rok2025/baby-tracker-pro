import { View, Text, Button, Input, Picker } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import './index.scss'

type RecordType = 'feeding' | 'sleep'

export default function EditRecord() {
    const { session } = useAuth()
    const router = useRouter()
    const { id } = router.params

    const [recordType, setRecordType] = useState<RecordType>('feeding')
    const [volume, setVolume] = useState('120')
    const [note, setNote] = useState('')
    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(true)

    // 时间选择
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')
    const [isStartTimeYesterday, setIsStartTimeYesterday] = useState(false)

    // 加载记录数据
    useEffect(() => {
        if (!id || !session?.user) {
            Taro.showToast({ title: '参数错误', icon: 'error' })
            setTimeout(() => {
                Taro.navigateBack()
            }, 1500)
            return
        }

        const loadRecord = async () => {
            try {
                const { data, error } = await supabase
                    .from('activities')
                    .select('*')
                    .eq('id', id)
                    .single()

                if (error) throw error

                if (data) {
                    setRecordType(data.type)
                    setVolume(data.volume ? String(data.volume) : '120')
                    setNote(data.note || '')

                    const start = new Date(data.start_time)
                    setStartTime(`${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`)

                    // 判断是否是昨天
                    const today0 = new Date()
                    today0.setHours(0, 0, 0, 0)
                    setIsStartTimeYesterday(start < today0)

                    if (data.end_time) {
                        const end = new Date(data.end_time)
                        setEndTime(`${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`)
                    }
                }
            } catch (err) {
                console.error('Load record error:', err)
                Taro.showToast({ title: '加载失败', icon: 'error' })
            } finally {
                setFetching(false)
            }
        }

        loadRecord()
    }, [id, session])

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
            const startDate = new Date()
            const [startH, startM] = startTime.split(':').map(Number)
            startDate.setHours(startH, startM, 0, 0)

            if (isStartTimeYesterday) {
                startDate.setDate(startDate.getDate() - 1)
            }

            let endDate: Date | null = null
            if (recordType === 'sleep' && endTime) {
                const [endH, endM] = endTime.split(':').map(Number)
                endDate = new Date(startDate)
                endDate.setHours(endH, endM, 0, 0)

                if (endDate < startDate) {
                    endDate.setDate(endDate.getDate() + 1)
                }
            }

            const payload = {
                user_id: session.user.id,
                type: recordType,
                start_time: startDate.toISOString(),
                end_time: endDate?.toISOString() || null,
                volume: recordType === 'feeding' ? parseInt(volume) : null,
                note: note || null,
            }

            const res = await supabase.from('activities').update(payload).eq('id', id)

            if (res.error) {
                console.error('Update error:', res.error)
                Taro.showToast({ title: '保存失败', icon: 'error' })
            } else {
                Taro.showToast({ title: '保存成功', icon: 'success' })
                setTimeout(() => {
                    Taro.navigateBack()
                }, 1000)
            }
        } catch (e) {
            console.error('Error:', e)
            Taro.showToast({ title: '保存失败', icon: 'error' })
        } finally {
            setLoading(false)
        }
    }

    const handleCancel = () => {
        Taro.navigateBack()
    }

    if (fetching) {
        return (
            <View className='record-page'>
                <View className='loading-container'>
                    <View className='loading-spinner' />
                    <Text>加载中...</Text>
                </View>
            </View>
        )
    }

    return (
        <View className='record-page'>
            {/* 类型显示（不可修改） */}
            <View className='type-display'>
                <Text className='type-icon'>{recordType === 'feeding' ? '🍼' : '😴'}</Text>
                <Text className='type-text'>{recordType === 'feeding' ? '喂奶记录' : '睡眠记录'}</Text>
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
                            <View className='quick-actions'>
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
                    <View className='label-row'>
                        <Text className='label'>开始时间</Text>
                        <View className='day-toggle'>
                            <View
                                className={`toggle-item ${isStartTimeYesterday ? 'active' : ''}`}
                                onClick={() => setIsStartTimeYesterday(true)}
                            >
                                昨日
                            </View>
                            <View
                                className={`toggle-item ${!isStartTimeYesterday ? 'active' : ''}`}
                                onClick={() => setIsStartTimeYesterday(false)}
                            >
                                今日
                            </View>
                        </View>
                    </View>
                    <Picker
                        mode='time'
                        value={startTime}
                        onChange={(e) => setStartTime(e.detail.value)}
                        className='time-picker'
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

            {/* 操作按钮 */}
            <View className='button-area'>
                <Button
                    className='cancel-btn'
                    onClick={handleCancel}
                >
                    取消
                </Button>
                <Button
                    className={`submit-btn ${recordType}`}
                    onClick={handleSubmit}
                    loading={loading}
                    disabled={loading}
                >
                    保存
                </Button>
            </View>
        </View>
    )
}
