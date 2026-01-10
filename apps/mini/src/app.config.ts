export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/record/index',
    'pages/settings/index',
    'pages/login/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: '宝宝成长助手',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    custom: true,
    color: '#999999',
    selectedColor: '#ff6b6b',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
        iconPath: 'assets/home.png',
        selectedIconPath: 'assets/home-active.png'
      },
      {
        pagePath: 'pages/record/index',
        text: '记录',
        iconPath: 'assets/add.png',
        selectedIconPath: 'assets/add-active.png'
      },
      {
        pagePath: 'pages/settings/index',
        text: '设置',
        iconPath: 'assets/settings.png',
        selectedIconPath: 'assets/settings-active.png'
      }
    ]
  }
})
