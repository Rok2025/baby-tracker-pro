import { View, Text, Button, Input, Picker } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro, { useRouter, useDidShow } from '@tarojs/taro'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import LoginComponent from '../../components/Login'
import './index.scss'


type RecordType = 'feeding' | 'sleep'

export default function Record() {
    const { session } = useAuth()
    const router = useRouter()
    const { id } = router.params

    const [recordType, setRecordType] = useState<RecordType>('feeding')
    const [volume, setVolume] = useState('120')
    const [note, setNote] = useState('')
    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(!!id)

    // 设置底部导航选中状态
    useDidShow(() => {
        const page = Taro.getCurrentPages().pop()
        if (page) {
            const tabBar = Taro.getTabBar<{ setSelected: (index: number) => void }>(page as any)
            if (tabBar) tabBar.setSelected(1)
        }
    })

    // 时间选择
    const now = new Date()
    const [startTime, setStartTime] = useState(
        `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    )
    const [endTime, setEndTime] = useState('')
    const [isStartTimeYesterday, setIsStartTimeYesterday] = useState(false)

    // 如果有 ID，说明是编辑模式，加载数据
    useEffect(() => {
        if (!loading && !session) {
            Taro.reLaunch({ url: '/pages/login/index' })
            return
        }
        if (!id || !session?.user) return

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

                    // 判断是否是昨天 (简单判断：如果记录的日期早于当前服务器日期的 0 点)
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
                endDate = new Date(startDate) // 基准设为开始时间
                endDate.setHours(endH, endM, 0, 0)

                // 如果结束时间（时分）小于开始时间（时分），说明该次睡眠跨越了凌晨
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

            let res;
            if (id) {
                // 更新模式
                res = await supabase.from('activities').update(payload).eq('id', id)
            } else {
                // 新增模式
                res = await supabase.from('activities').insert(payload)
            }

            if (res.error) {
                console.error('Submit error:', res.error)
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

    if (!session && !loading) {
        return <LoginComponent />
    }

    if (fetching || loading) {
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
            {/* 类型选择 - 编辑模式下禁用类型切换以防复杂逻辑 */}
            <View className='type-selector'>
                <View
                    className={`type-btn ${recordType === 'feeding' ? 'active feeding' : ''} ${id ? 'disabled' : ''}`}
                    onClick={() => !id && setRecordType('feeding')}
                >
                    <Text className='type-icon'>🍼</Text>
                    <Text className='type-text'>喂奶</Text>
                </View>
                <View
                    className={`type-btn ${recordType === 'sleep' ? 'active sleep' : ''} ${id ? 'disabled' : ''}`}
                    onClick={() => !id && setRecordType('sleep')}
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

            {/* 提交按钮 */}
            <View className='submit-area'>
                <Button
                    className={`submit-btn ${recordType}`}
                    onClick={handleSubmit}
                    loading={loading}
                    disabled={loading}
                >
                    {id ? '更新记录' : '保存记录'}
                </Button>
            </View>
        </View>
    )
}
