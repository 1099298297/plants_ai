Page({
  data: {
    historyList: [],
    isLoggedIn: false,
    searchKeyword: '' // 搜索关键词
  },

  onLoad(options) {
  },

  onShow() {
    this.checkLoginStatus();
  },

  checkLoginStatus() {
    const userOpenId = wx.getStorageSync('user_openid');
    const loggedIn = !!userOpenId;

    this.setData({
      isLoggedIn: loggedIn
    });

    if (loggedIn) {
      this.loadHistory();
    } else {
      this.setData({ historyList: [] });
    }
  },

  loadHistory() {
    const list = wx.getStorageSync('recognitionHistory') || [];
    this.setData({
      historyList: list
    });
  },

  // 搜索框输入
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    })
  },

  // 点击搜索 / 按回车搜索
  onSearchConfirm() {
    const keyword = this.data.searchKeyword.trim();
    if (!keyword) {
      wx.showToast({ title: '请输入搜索内容', icon: 'none' });
      return;
    }

    // 存在全局变量里，让 mall 页面接收
    getApp().globalData.homeSearchKeyword = keyword;

    // 跳转到商城（tab页面不能带?参数）
    wx.switchTab({
      url: '/pages/mall/mall'
    })
  },

  // 点击搜索框自动聚焦
  focusSearch() {
    this.setData({ searchFocus: true });
  },

  goToLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    });
  },

  navigateToPlantRecognition() {
    wx.navigateTo({
      url: '/pages/plantRecognition/plantRecognition'
    });
  },

  navigateToVoiceChat() {
    wx.navigateTo({
      url: '/pages/voiceChat/voiceChat'
    });
  },

  goToAllHistory() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  goToShop() {
    wx.switchTab({
      url: '/pages/mall/mall'
    })
  },

  onShareAppMessage() {
    return { title: '藤丰园林植物养护智能助手', path: '/pages/home/home' }
  },

  onShareTimeline() {
    return { title: '藤丰园林植物养护智能助手' }
  }
})