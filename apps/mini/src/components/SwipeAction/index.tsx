import { View, Text } from '@tarojs/components'
import { useState } from 'react'
import Taro from '@tarojs/taro'
import './index.scss'

interface SwipeActionProps {
    children: React.ReactNode
    onEdit: () => void
    onDelete: () => void
}

export default function SwipeAction({ children, onEdit, onDelete }: SwipeActionProps) {
    const [startX, setStartX] = useState(0)
    const [moveX, setMoveX] = useState(0)
    const [isOpen, setIsOpen] = useState(false)

    // 动态计算按钮宽度: 280rpx (两个按钮各 140rpx)
    // 必须与 CSS 中的 width: 140rpx 保持一致
    const systemInfo = Taro.getSystemInfoSync()
    const actionWidth = (systemInfo.windowWidth / 750) * 280

    const handleTouchStart = (e: any) => {
        // 只有当没有打开其他（这里简化处理）或者点击自己时触发
        // 实际场景可能需要全局互斥，这里先处理基础
        setStartX(e.touches[0].clientX)
    }

    const handleTouchMove = (e: any) => {
        const currentX = e.touches[0].clientX
        let diff = startX - currentX

        // 如果已经打开，起始位置需要调整
        if (isOpen) {
            diff += actionWidth
        }

        // 限制滑动范围
        if (diff < 0) diff = 0
        if (diff > actionWidth) diff = actionWidth

        setMoveX(diff)

        // 阻止页面滚动（Taro/小程序中可能需要 catchMove）
        e.stopPropagation()
    }

    const handleTouchEnd = () => {
        // 滑动超过一半则打开，否则关闭
        if (moveX > actionWidth / 2) {
            setMoveX(actionWidth)
            setIsOpen(true)
        } else {
            setMoveX(0)
            setIsOpen(false)
        }
    }

    const handleEdit = (e: any) => {
        e.stopPropagation()
        setMoveX(0)
        setIsOpen(false)
        onEdit()
    }

    const handleDelete = (e: any) => {
        e.stopPropagation()
        setMoveX(0)
        setIsOpen(false)
        onDelete()
    }

    // Fix: Only show actions when swiping or open to prevent "leaking"
    const actionsStyle: React.CSSProperties = {
        visibility: (moveX > 0 || isOpen) ? 'visible' : 'hidden',
        opacity: (moveX > 0 || isOpen) ? 1 : 0,
        transition: 'opacity 0.2s'
    }

    return (
        <View className='swipe-action-container'>
            <View
                className='swipe-action-content'
                style={{ transform: `translateX(-${moveX}px)` }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {children}
            </View>
            <View className='swipe-action-actions' style={actionsStyle}>
                <View className='action-btn edit-btn' onClick={handleEdit}>
                    <Text>编辑</Text>
                </View>
                <View className='action-btn delete-btn' onClick={handleDelete}>
                    <Text>删除</Text>
                </View>
            </View>
        </View>
    )
}
