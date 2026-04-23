const app = getApp()

Page({
  data: {
    userInfo: {},
    isLoggedIn: false,
    settings: {
      notifications: true,
      autoPlay: true,
      browseHistory: true,
      searchHistory: true
    },
    cacheSize: '0KB',
    version: '1.0.0'
  },

  onLoad() {
    this.loadUserInfo()
    this.loadSettings()
    this.calculateCacheSize()
  },

  onShow() {
    this.loadUserInfo()
  },

  // 加载用户信息
  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo')
    const isLoggedIn = !!userInfo
    this.setData({ userInfo, isLoggedIn })
  },

  // 加载设置
  loadSettings() {
    const settings = wx.getStorageSync('settings') || this.data.settings
    this.setData({ settings })
  },

  // 保存设置
  saveSettings() {
    wx.setStorageSync('settings', this.data.settings)
  },

  // 计算缓存大小
  calculateCacheSize() {
    wx.getStorageInfo({
      success: (res) => {
        const size = res.currentSize
        let sizeStr = '0KB'
        if (size < 1024) {
          sizeStr = size + 'KB'
        } else {
          sizeStr = (size / 1024).toFixed(2) + 'MB'
        }
        this.setData({ cacheSize: sizeStr })
      }
    })
  },

  // 切换消息通知
  toggleNotifications(e) {
    const settings = this.data.settings
    settings.notifications = e.detail.value
    this.setData({ settings })
    this.saveSettings()
  },

  // 切换自动播放
  toggleAutoPlay(e) {
    const settings = this.data.settings
    settings.autoPlay = e.detail.value
    this.setData({ settings })
    this.saveSettings()
  },

  // 切换浏览历史
  toggleBrowseHistory(e) {
    const settings = this.data.settings
    settings.browseHistory = e.detail.value
    this.setData({ settings })
    this.saveSettings()
    
    if (!e.detail.value) {
      wx.showModal({
        title: '提示',
        content: '确定要关闭浏览历史记录吗？关闭后将不再记录新的浏览历史。',
        success: (res) => {
          if (res.confirm) {
            wx.removeStorageSync('browseHistory')
          } else {
            settings.browseHistory = true
            this.setData({ settings })
            this.saveSettings()
          }
        }
      })
    }
  },

  // 切换搜索历史
  toggleSearchHistory(e) {
    const settings = this.data.settings
    settings.searchHistory = e.detail.value
    this.setData({ settings })
    this.saveSettings()
    
    if (!e.detail.value) {
      wx.showModal({
        title: '提示',
        content: '确定要关闭搜索历史记录吗？关闭后将不再记录新的搜索历史。',
        success: (res) => {
          if (res.confirm) {
            wx.removeStorageSync('searchHistory')
          } else {
            settings.searchHistory = true
            this.setData({ settings })
            this.saveSettings()
          }
        }
      })
    }
  },

  // 清除缓存
  clearCache() {
    wx.showModal({
      title: '提示',
      content: '确定要清除缓存吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorage({
            success: () => {
              this.calculateCacheSize()
              wx.showToast({
                title: '清除成功',
                icon: 'success'
              })
            }
          })
        }
      }
    })
  },

  // 跳转到个人资料
  navigateToProfile() {
    wx.navigateTo({
      url: '/pages/profile/profile'
    })
  },

  // 跳转到收货地址
  navigateToAddress() {
    wx.navigateTo({
      url: '/pages/address/address'
    })
  },

  // 显示关于我们
  showAbout() {
    wx.showModal({
      title: '关于我们',
      content: '植物AI小程序 v1.0.0\n\n一个帮助您识别植物、购买植物和园艺工具的小程序。',
      showCancel: false
    })
  },

  // 显示意见反馈
  showFeedback() {
    wx.navigateTo({
      url: '/pages/feedback/feedback'
    })
  },

  // 检查更新
  checkUpdate() {
    wx.showLoading({
      title: '检查更新中'
    })
    
    // 模拟检查更新
    setTimeout(() => {
      wx.hideLoading()
      wx.showToast({
        title: '已是最新版本',
        icon: 'success'
      })
    }, 1500)
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('userInfo')
          this.setData({
            userInfo: {},
            isLoggedIn: false
          })
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })
        }
      }
    })
  }
}) 