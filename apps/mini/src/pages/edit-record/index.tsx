import { View, Text, Button, Input, Picker } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import './index.scss'

type RecordType = 'feeding' | 'sleep' | 'solid_food' | 'poop'

export default function EditRecord() {
    const { session } = useAuth()
    const router = useRouter()
    const { id } = router.params

    const [recordType, setRecordType] = useState<RecordType>('feeding')
    const [volume, setVolume] = useState('120')
    const [note, setNote] = useState('')

    // New fields
    const [foodAmount, setFoodAmount] = useState('')
    // const [foodType, setFoodType] = useState('') // Removed
    const [selectedFoods, setSelectedFoods] = useState<string[]>([])
    const [customFood, setCustomFood] = useState('')

    const defaultFoods = ["米粉", "蛋黄", "苹果泥", "南瓜泥", "青菜粥", "香蕉", "肉泥", "酸奶"]

    const toggleFood = (food: string) => {
        if (selectedFoods.includes(food)) {
            setSelectedFoods(selectedFoods.filter(f => f !== food))
        } else {
            setSelectedFoods([...selectedFoods, food])
        }
    }

    const addCustomFood = () => {
        if (customFood && !selectedFoods.includes(customFood)) {
            setSelectedFoods([...selectedFoods, customFood])
            setCustomFood('')
        }
    }

    const [poopColor, setPoopColor] = useState('Yellow')
    const [poopConsistency, setPoopConsistency] = useState('Normal')

    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(true)

    // Colors and consistencies for Picker
    const poopColors = ['Yellow', 'Green', 'Brown', 'Black', 'Red', 'White/Clay']
    const poopColorLabels = ['Yellow (黄)', 'Green (绿)', 'Brown (褐)', 'Black (黑)', 'Red (红)', 'White (灰白)']
    const poopConsistencies = ['Watery', 'Loose/Mushy', 'Soft', 'Normal', 'Hard', 'Pellets']
    const poopConsistencyLabels = ['Watery (水样)', 'Loose (糊状)', 'Soft (软便)', 'Normal (正常)', 'Hard (硬便)', 'Pellets (羊屎蛋)']

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

                    if (data.type === 'solid_food') {
                        setFoodAmount(data.food_amount || '')
                        // Parse JSON string array if possible, else handle as single string
                        try {
                            const parsed = JSON.parse(data.food_type || '[]')
                            if (Array.isArray(parsed)) {
                                setSelectedFoods(parsed)
                            } else if (data.food_type) {
                                setSelectedFoods([data.food_type])
                            }
                        } catch (e) {
                            if (data.food_type) setSelectedFoods([data.food_type])
                        }
                    }
                    if (data.type === 'poop') {
                        setPoopColor(data.poop_color || 'Yellow')
                        setPoopConsistency(data.poop_consistency || 'Normal')
                    }

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

            const payload: any = {
                user_id: session.user.id,
                type: recordType,
                start_time: startDate.toISOString(),
                end_time: endDate?.toISOString() || null,
                volume: recordType === 'feeding' ? parseInt(volume) : null,
                note: note || null,
            }

            if (recordType === 'solid_food') {
                payload.food_amount = foodAmount
                payload.food_type = JSON.stringify(selectedFoods)
            }
            if (recordType === 'poop') {
                payload.poop_color = poopColor
                payload.poop_consistency = poopConsistency
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

    const getTypeIcon = (type: RecordType) => {
        switch (type) {
            case 'feeding': return '🍼'
            case 'sleep': return '😴'
            case 'solid_food': return '🥣'
            case 'poop': return '💩'
            default: return '📝'
        }
    }

    const getTypeName = (type: RecordType) => {
        switch (type) {
            case 'feeding': return '喂奶记录'
            case 'sleep': return '睡眠记录'
            case 'solid_food': return '辅食记录'
            case 'poop': return '臭臭记录'
            default: return '记录'
        }
    }

    return (
        <View className='record-page'>
            {/* 类型显示（不可修改） */}
            <View className='type-display'>
                <Text className='type-icon'>{getTypeIcon(recordType)}</Text>
                <Text className='type-text'>{getTypeName(recordType)}</Text>
            </View>

            {/* 表单 */}
            <View className='form'>
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

                {recordType === 'feeding' && (
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
                )}

                {recordType === 'solid_food' && (
                    <>
                        <View className='form-group'>
                            <Text className='label'>饭量</Text>
                            <Input
                                value={foodAmount}
                                onInput={(e) => setFoodAmount(e.detail.value)}
                                placeholder='例如: 30g, 1碗'
                                className='input'
                            />
                        </View>
                        <View className='form-group'>
                            <Text className='label'>食物内容</Text>
                            <View className='food-tags'>
                                {defaultFoods.map(food => (
                                    <View
                                        key={food}
                                        className={`food-tag ${selectedFoods.includes(food) ? 'active' : ''}`}
                                        onClick={() => toggleFood(food)}
                                    >
                                        <Text>{food}</Text>
                                    </View>
                                ))}
                                {selectedFoods.filter(f => !defaultFoods.includes(f)).map(food => (
                                    <View
                                        key={food}
                                        className='food-tag active'
                                        onClick={() => toggleFood(food)}
                                    >
                                        <Text>{food}</Text>
                                    </View>
                                ))}
                            </View>
                            <View className='add-food-row'>
                                <Input
                                    value={customFood}
                                    onInput={(e) => setCustomFood(e.detail.value)}
                                    onConfirm={addCustomFood}
                                    placeholder='添加其他食物...'
                                    className='input small-input'
                                />
                                <View className='add-btn' onClick={addCustomFood}>
                                    <Text>+</Text>
                                </View>
                            </View>
                        </View>
                    </>
                )}

                {recordType === 'poop' && (
                    <>
                        <View className='form-group'>
                            <Text className='label'>颜色</Text>
                            <Picker
                                mode='selector'
                                range={poopColorLabels}
                                value={poopColors.indexOf(poopColor)}
                                onChange={(e) => setPoopColor(poopColors[e.detail.value])}
                                className='time-picker'
                            >
                                <View className='picker-value'>
                                    <Text>{poopColorLabels[poopColors.indexOf(poopColor)] || poopColor}</Text>
                                </View>
                            </Picker>
                        </View>
                        <View className='form-group'>
                            <Text className='label'>性状</Text>
                            <Picker
                                mode='selector'
                                range={poopConsistencyLabels}
                                value={poopConsistencies.indexOf(poopConsistency)}
                                onChange={(e) => setPoopConsistency(poopConsistencies[e.detail.value])}
                                className='time-picker'
                            >
                                <View className='picker-value'>
                                    <Text>{poopConsistencyLabels[poopConsistencies.indexOf(poopConsistency)] || poopConsistency}</Text>
                                </View>
                            </Picker>
                        </View>
                    </>
                )}

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
