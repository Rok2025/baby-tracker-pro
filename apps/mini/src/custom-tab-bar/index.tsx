import { Component } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Image } from '@tarojs/components'
import './index.scss'

// Tab 配置 - 使用内嵌 SVG data URLs
const TAB_LIST = [
    {
        pagePath: '/pages/index/index',
        text: '首页',
        icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23999999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M3 10l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"%3E%3C/path%3E%3Cpolyline points="9 22 9 12 15 12 15 22"%3E%3C/polyline%3E%3C/svg%3E',
        activeIcon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23ff6b6b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M3 10l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"%3E%3C/path%3E%3Cpolyline points="9 22 9 12 15 12 15 22"%3E%3C/polyline%3E%3C/svg%3E'
    },
    {
        pagePath: '/pages/record/index',
        text: '记录',
        icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23999999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Ccircle cx="12" cy="12" r="10"%3E%3C/circle%3E%3Cline x1="12" y1="8" x2="12" y2="16"%3E%3C/line%3E%3Cline x1="8" y1="12" x2="16" y2="12"%3E%3C/line%3E%3C/svg%3E',
        activeIcon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23ff6b6b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Ccircle cx="12" cy="12" r="10"%3E%3C/circle%3E%3Cline x1="12" y1="8" x2="12" y2="16"%3E%3C/line%3E%3Cline x1="8" y1="12" x2="16" y2="12"%3E%3C/line%3E%3C/svg%3E'
    },
    {
        pagePath: '/pages/settings/index',
        text: '设置',
        icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23999999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Ccircle cx="12" cy="12" r="3"%3E%3C/circle%3E%3Cpath d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"%3E%3C/path%3E%3C/svg%3E'
    }
]

export default class CustomTabBar extends Component {
    state = {
        selected: 0
    }

    private isSwitching = false

    componentDidMount() {
        this.initSelected()
    }

    initSelected() {
        try {
            const pages = Taro.getCurrentPages()
            if (pages.length > 0) {
                const currentPage = pages[pages.length - 1]
                const route = currentPage.route || ''
                const path = route.startsWith('/') ? route : '/' + route
                const index = TAB_LIST.findIndex(item => item.pagePath === path)
                // console.log('[TabBar] Class Init from route:', path, '-> index:', index)
                if (index !== -1) {
                    this.setState({ selected: index })
                }
            }
        } catch (e) {
            console.error('[TabBar] Error init:', e)
        }
    }

    setSelected(index: number) {
        // console.log('[TabBar] setSelected called:', index)
        this.setState({ selected: index })
    }

    async handleTabClick(index: number, pagePath: string) {
        if (this.isSwitching) return
        if (index === this.state.selected) return

        this.isSwitching = true
        this.setState({ selected: index })

        try {
            await Taro.switchTab({ url: pagePath })
        } catch (e) {
            console.error('[TabBar] switchTab failed:', e)
            // 如果跳转失败，恢复原来的选中状态? 不，可能是超时但跳转成功了
            // 这里我们不做太多处理，只是记录
        } finally {
            // 给一点冷却时间，避免重复点击
            setTimeout(() => {
                this.isSwitching = false
            }, 300)
        }
    }

    render() {
        const { selected } = this.state
        return (
            <View className='custom-tab-bar'>
                {TAB_LIST.map((item, index) => {
                    const isActive = selected === index
                    return (
                        <View
                            key={item.pagePath}
                            className={`tab-item ${isActive ? 'active' : ''}`}
                            onClick={() => this.handleTabClick(index, item.pagePath)}
                        >
                            <Image
                                className='tab-icon'
                                src={isActive ? item.activeIcon : item.icon}
                                mode='aspectFit'
                            />
                            <Text className={`tab-text ${isActive ? 'active' : ''}`}>
                                {item.text}
                            </Text>
                        </View>
                    )
                })}
            </View>
        )
    }
}
