import { View, Text, ScrollView, Picker } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { supabase, fetchActivitiesForDay, Activity } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import LoginComponent from '../../components/Login'
import './index.scss'

export default function Index() {
  const { session, babyConfig, calculateBabyAge, loading: authLoading } = useAuth()
  const [activities, setActivities] = useState<Activity[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [today, setToday] = useState(new Date())

  // Helper to format date as yyyy-MM-dd
  const formatDateISO = (d: Date) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const todayStr = formatDateISO(today)
  const babyAge = babyConfig.birthDate ? calculateBabyAge(today) : null

  const fetchActivities = async () => {
    if (!session?.user) return

    setDataLoading(true)
    try {
      const data = await fetchActivitiesForDay(session.user.id, today)

      // 排序逻辑：与 Web 端对齐
      const startOfDay = new Date(today)
      startOfDay.setHours(0, 0, 0, 0)

      const sorted = (data || []).sort((a: Activity, b: Activity) => {
        const getSortTime = (act: Activity) => {
          const startTime = new Date(act.start_time).getTime()
          // 这里的逻辑：如果记录是在今天之前开始的（跨天记录），给予最高优先级（返回 0）
          if (startTime < startOfDay.getTime()) {
            return 0
          }
          return startTime
        }
        const timeA = getSortTime(a)
        const timeB = getSortTime(b)

        if (timeA !== timeB) return timeA - timeB
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })

      setActivities(sorted)
    } catch (error) {
      console.error('Fetch error:', error)
    }
    setDataLoading(false)
  }

  useDidShow(() => {
    fetchActivities()
    // 设置底部导航选中状态
    const page = Taro.getCurrentPages().pop()
    if (page) {
      const tabBar = Taro.getTabBar<{ setSelected: (index: number) => void }>(page as any)
      if (tabBar) tabBar.setSelected(0)
    }
  })

  useEffect(() => {
    if (session) {
      fetchActivities()
    }
  }, [today, session])

  const handleDateChange = (e) => {
    setToday(new Date(e.detail.value))
  }

  const navigateDate = (days: number) => {
    const nextDate = new Date(today)
    nextDate.setDate(today.getDate() + days)
    setToday(nextDate)
  }

  const handleActivityClick = (activity: Activity) => {
    Taro.showActionSheet({
      itemList: ['修改记录', '删除记录'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 修改
          Taro.navigateTo({
            url: `/pages/record/index?id=${activity.id}`
          })
        } else if (res.tapIndex === 1) {
          // 删除
          Taro.showModal({
            title: '确认删除',
            content: '确定要删除这条记录吗？',
            success: async (modalRes) => {
              if (modalRes.confirm) {
                const { error } = await supabase
                  .from('activities')
                  .delete()
                  .eq('id', activity.id)

                if (error) {
                  Taro.showToast({ title: '删除失败', icon: 'error' })
                } else {
                  Taro.showToast({ title: '已删除', icon: 'success' })
                  fetchActivities()
                }
              }
            }
          })
        }
      },
      fail: (err) => {
        // 用户取消或失败，静默处理
        if (err.errMsg === "showActionSheet:fail cancel") return;
        console.error("ActionSheet error:", err);
      }
    })
  }

  const summary = activities.reduce((acc, curr) => {
    const startOfDay = new Date(today)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(today)
    endOfDay.setHours(23, 59, 59, 999)

    if (curr.type === 'feeding' && curr.volume) {
      const actStart = new Date(curr.start_time)
      // 喂奶统计：按开始时间属于今天
      if (actStart >= startOfDay && actStart <= endOfDay) {
        acc.milk += curr.volume
      }
    } else if (curr.type === 'sleep' && curr.start_time && curr.end_time) {
      const actEnd = new Date(curr.end_time).getTime()
      const dayStart = startOfDay.getTime()
      const dayEnd = endOfDay.getTime()

      // 睡眠统计：按结束时间属于今天
      if (actEnd >= dayStart && actEnd <= dayEnd) {
        const actStart = new Date(curr.start_time).getTime()
        acc.sleep += (actEnd - actStart) / (1000 * 60)
      }
    }
    return acc
  }, { milk: 0, sleep: 0 })

  const formatSummary = (totalSleep: number) => {
    const h = Math.floor(totalSleep / 60)
    const m = Math.round(totalSleep % 60)
    const sleepStr = h > 0 ? (m > 0 ? `${h}小时${m}分` : `${h}小时`) : `${m}分`

    return {
      milk: summary.milk,
      sleep: sleepStr,
      milkPercent: Math.min(100, (summary.milk / 1000) * 100),
      // 睡眠目标：12小时 = 720分钟（适合大多数月龄宝宝）
      sleepPercent: Math.min(100, (summary.sleep / 720) * 100)
    }
  }

  const summaryDisplay = formatSummary(summary.sleep)

  const groupedActivities = activities.reduce((acc, curr) => {
    const startOfDay = new Date(today)
    startOfDay.setHours(0, 0, 0, 0)

    // 分组时间判定逻辑：如果跨天记录，按结束时间的分组显示；普通记录按开始时间
    let displayDate = new Date(curr.start_time)
    if (curr.type === 'sleep' && displayDate.getTime() < startOfDay.getTime() && curr.end_time) {
      displayDate = new Date(curr.end_time)
    }

    const hour = displayDate.getHours()
    if (hour < 12) acc.morning.push(curr)
    else if (hour >= 12 && hour < 18) acc.afternoon.push(curr)
    else acc.evening.push(curr)
    return acc
  }, { morning: [], afternoon: [], evening: [] } as Record<string, Activity[]>)

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    return `${h}:${m}`
  }

  const formatTimeRange = (start: string, end: string | null) => {
    const s = formatTime(start)
    if (!end) return `${s} - 至今`
    const e = formatTime(end)
    return `${s} - ${e}`
  }

  const formatDurationSnippet = (start: string, end: string | null) => {
    if (!end) return ''
    const totalMin = (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60)
    const hours = Math.floor(totalMin / 60)
    const mins = Math.round(totalMin % 60)
    if (hours > 0) {
      return mins > 0 ? `${hours}小时${mins}分` : `${hours}小时`
    }
    return `${mins}分`
  }

  // 仅在 AuthContext 还在初始化时显示加载中
  if (authLoading) {
    return (
      <View className='dashboard-loading'>
        <View className='loading-spinner' />
      </View>
    )
  }

  if (!session) {
    return <LoginComponent />
  }

  return (
    <ScrollView className='dashboard' scrollY>
      <View className='dashboard-content'>
        {/* Baby Info Header */}
        <View className='baby-header'>
          <View className='baby-info'>
            <Text className='baby-name'>{babyConfig.name || '宝宝'}</Text>
            {babyAge && (
              <Text className='baby-age'>
                {babyAge.months}<Text className='unit'>个月</Text>{babyAge.days}<Text className='unit'>天</Text>
              </Text>
            )}
          </View>
        </View>

        {/* Date Navigation - Full Row */}
        <View className='date-nav'>
          <View className='nav-btn' onClick={() => navigateDate(-1)}>{'<'}</View>
          <Picker mode='date' value={todayStr} onChange={handleDateChange} className='date-picker-wrap'>
            <View className='date-display'>{todayStr}</View>
          </Picker>
          <View className='nav-btn' onClick={() => navigateDate(1)}>{'>'}</View>
        </View>

        {/* Summary Cards */}
        <View className='summary-cards'>
          <View className='card milk-card'>
            <View className='card-info-wrapper'>
              <View className='card-icon'>🍼</View>
              <View className='card-content'>
                <Text className='card-label'>今日奶量：</Text>
                <Text className='card-value'>{summaryDisplay.milk}<Text className='unit'>ml</Text></Text>
              </View>
            </View>
            <View className='progress-bg'>
              <View className='progress-bar milk-bar' style={{ width: `${summaryDisplay.milkPercent}%` }} />
            </View>
          </View>

          <View className='card sleep-card'>
            <View className='card-info-wrapper'>
              <View className='card-icon'>😴</View>
              <View className='card-content'>
                <Text className='card-label'>今日睡眠：</Text>
                <Text className='card-value'>{summaryDisplay.sleep}</Text>
              </View>
            </View>
            <View className='progress-bg'>
              <View className='progress-bar sleep-bar' style={{ width: `${summaryDisplay.sleepPercent}%` }} />
            </View>
          </View>
        </View>

        {/* Activity List */}
        <View className='activity-section'>
          {dataLoading ? (
            <View className='loading'>
              <Text>加载中...</Text>
            </View>
          ) : activities.length === 0 ? (
            <View className='empty'>
              <Text className='empty-text'>暂无记录</Text>
              <Text className='empty-tip'>点击下方按钮添加记录</Text>
            </View>
          ) : (
            <View className='timeline'>
              {Object.entries(groupedActivities).map(([key, list]) => {
                if (list.length === 0) return null
                const label = key === 'morning' ? '上午' : key === 'afternoon' ? '下午' : '晚上'
                return (
                  <View key={key} className='group-section'>
                    <Text className='group-title'>{label}</Text>
                    <View className='activity-list'>
                      {list.map(activity => (
                        <View
                          key={activity.id}
                          className={`activity-item ${activity.type}`}
                          onClick={() => handleActivityClick(activity)}
                        >
                          <View className='icon-col'>
                            <Text className='type-icon'>{activity.type === 'feeding' ? '🍼' : '😴'}</Text>
                          </View>
                          <View className='content-col'>
                            <View className='activity-main'>
                              <Text className='activity-time'>
                                {activity.type === 'sleep'
                                  ? formatTimeRange(activity.start_time, activity.end_time || null)
                                  : formatTime(activity.start_time)}
                              </Text>
                              <Text className='activity-value'>
                                {activity.type === 'feeding'
                                  ? `${activity.volume || 0} ml`
                                  : activity.end_time ? `(${formatDurationSnippet(activity.start_time, activity.end_time)})` : '进行中'}
                              </Text>
                            </View>
                            <Text className='activity-type'>{activity.type === 'feeding' ? '喂奶' : '睡眠'}</Text>
                            {activity.note && <Text className='activity-note'>{activity.note}</Text>}
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )
              })}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  )
}
