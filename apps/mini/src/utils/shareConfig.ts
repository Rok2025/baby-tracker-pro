/**
 * 小程序分享配置
 */

/**
 * 获取首页分享配置
 * @returns 分享配置对象
 */
export const getIndexShareConfig = () => {
    return {
        title: '宝宝成长助手 - 科学记录宝宝的每一天',
        // imageUrl 留空则使用默认小程序封面图
        imageUrl: '',
        // 分享路径，默认为首页
        path: '/pages/index/index'
    }
}

/**
 * 获取分享到朋友圈的配置
 * @returns 朋友圈分享配置
 */
export const getTimelineShareConfig = () => {
    return {
        title: '宝宝成长助手 - 和你一起记录宝宝成长的每一刻',
        // imageUrl 留空则使用默认小程序封面图
        imageUrl: ''
    }
}
