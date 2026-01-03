import { View, Text, ScrollView } from '@tarojs/components'
import { useEffect, useState, useMemo } from 'react'
import { useDidShow } from '@tarojs/taro'
import { useAuth } from '../../context/AuthContext'
import { fetchActivitiesForDay, type Activity } from '../../lib/supabase'
import './index.scss'

export default function Index() {
  const { session } = useAuth()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate] = useState(new Date())

  // 加载数据
  const loadData = async () => {
    if (!session?.user) {
      setLoading(false)
      return
    }

    try {
      const data = await fetchActivitiesForDay(session.user.id, selectedDate)
      setActivities(data)
    } catch (error) {
      console.error('Load data error:', error)
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    if (session?.user) {
      loadData()
    }
  })

  useEffect(() => {
    loadData()
  }, [session])

  // 计算汇总数据
  const summary = useMemo(() => {
    let totalMilk = 0
    let totalSleep = 0 // in minutes

    const startOfDay = new Date(selectedDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(selectedDate)
    endOfDay.setHours(23, 59, 59, 999)

    activities.forEach(act => {
      if (act.type === 'feeding' && act.volume) {
        totalMilk += act.volume
      }
      if (act.type === 'sleep' && act.start_time && act.end_time) {
        const actStart = new Date(act.start_time).getTime()
        const actEnd = new Date(act.end_time).getTime()
        const dayStart = startOfDay.getTime()
        const dayEnd = endOfDay.getTime()

        if (actEnd >= dayStart && actEnd <= dayEnd) {
          totalSleep += (actEnd - actStart) / (1000 * 60)
        }
      }
    })

    const h = Math.floor(totalSleep / 60)
    const m = Math.round(totalSleep % 60)
    const sleepStr = h > 0 ? (m > 0 ? `${h}小时${m}分钟` : `${h}小时`) : `${m}分钟`

    return {
      milk: totalMilk,
      milkPercent: Math.min(Math.round((totalMilk / 800) * 100), 100),
      sleep: sleepStr,
      sleepPercent: Math.min(Math.round((totalSleep / 600) * 100), 100)
    }
  }, [activities, selectedDate])

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  // 格式化时长
  const formatDuration = (start: string, end: string | null | undefined) => {
    if (!end) return '进行中'
    const diffMs = new Date(end).getTime() - new Date(start).getTime()
    const totalMin = Math.round(diffMs / 60000)
    const hours = Math.floor(totalMin / 60)
    const mins = totalMin % 60
    if (hours > 0) {
      return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`
    }
    return `${mins}分钟`
  }

  // 今日日期
  const todayStr = useMemo(() => {
    const y = selectedDate.getFullYear()
    const m = (selectedDate.getMonth() + 1).toString().padStart(2, '0')
    const d = selectedDate.getDate().toString().padStart(2, '0')
    return `${y}-${m}-${d}`
  }, [selectedDate])

  if (!session) {
    return (
      <View className='dashboard'>
        <View className='not-logged-in'>
          <Text className='tip'>请先登录</Text>
        </View>
      </View>
    )
  }

  return (
    <ScrollView className='dashboard' scrollY>
      {/* Header */}
      <View className='header'>
        <Text className='app-title'>宝宝成长助手</Text>
        <Text className='date'>{todayStr}</Text>
      </View>

      {/* Summary Cards */}
      <View className='summary-cards'>
        <View className='card milk-card'>
          <View className='card-icon'>🍼</View>
          <View className='card-content'>
            <Text className='card-label'>今日奶量</Text>
            <Text className='card-value'>{summary.milk}<Text className='unit'>ml</Text></Text>
            <View className='progress-bg'>
              <View className='progress-bar milk-bar' style={{ width: `${summary.milkPercent}%` }} />
            </View>
          </View>
        </View>

        <View className='card sleep-card'>
          <View className='card-icon'>😴</View>
          <View className='card-content'>
            <Text className='card-label'>今日睡眠</Text>
            <Text className='card-value'>{summary.sleep}</Text>
            <View className='progress-bg'>
              <View className='progress-bar sleep-bar' style={{ width: `${summary.sleepPercent}%` }} />
            </View>
          </View>
        </View>
      </View>

      {/* Activity List */}
      <View className='activity-section'>
        <Text className='section-title'>今日记录</Text>

        {loading ? (
          <View className='loading'>
            <Text>加载中...</Text>
          </View>
        ) : activities.length === 0 ? (
          <View className='empty'>
            <Text className='empty-text'>暂无记录</Text>
            <Text className='empty-tip'>点击下方按钮添加记录</Text>
          </View>
        ) : (
          <View className='activity-list'>
            {activities.map(activity => (
              <View key={activity.id} className={`activity-item ${activity.type}`}>
                <View className='time-col'>
                  <Text className='time'>{formatTime(activity.start_time)}</Text>
                </View>
                <View className='content-col'>
                  <View className='activity-header'>
                    <Text className='type-icon'>{activity.type === 'feeding' ? '🍼' : '😴'}</Text>
                    <Text className='type-text'>{activity.type === 'feeding' ? '喂奶' : '睡眠'}</Text>
                  </View>
                  <Text className='activity-value'>
                    {activity.type === 'feeding'
                      ? `${activity.volume} ml`
                      : formatDuration(activity.start_time, activity.end_time)}
                  </Text>
                  {activity.note && <Text className='activity-note'>{activity.note}</Text>}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  )
}
