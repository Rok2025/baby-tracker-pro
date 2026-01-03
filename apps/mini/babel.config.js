// babel-preset-taro 更多选项和默认值：
// https://docs.taro.zone/docs/next/babel-config
module.exports = {
  presets: [
    ['taro', {
      framework: 'react',
      ts: true,
      compiler: 'webpack5',
      targets: {
        // 确保转译可选链操作符等新语法
        ios: '10',
        android: '5'
      }
    }]
  ],
  plugins: [
    // 确保可选链和空值合并被转译
    '@babel/plugin-proposal-optional-chaining',
    '@babel/plugin-proposal-nullish-coalescing-operator'
  ]
}
