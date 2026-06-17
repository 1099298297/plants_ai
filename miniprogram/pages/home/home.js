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

  async loadHistory() {
    try {
      const db = wx.cloud.database();
      const { data: list } = await db.collection('recognition_history')
        .where({})
        .orderBy('createTime', 'desc')
        .limit(10)
        .get();

      // 批量获取图片临时链接（cloud:// 不能直接显示）
      const fileIDs = list.map(item => item.imageUrl).filter(Boolean);
      if (fileIDs.length > 0) {
        try {
          const tempRes = await wx.cloud.getTempFileURL({ fileList: fileIDs });
          const fileMap = {};
          tempRes.fileList.forEach(f => fileMap[f.fileID] = f.tempFileURL);
          list.forEach(item => {
            item.image = fileMap[item.imageUrl] || '/images/home/hover.png';
          });
        } catch (e) {
          list.forEach(item => { item.image = '/images/home/hover.png'; });
        }
      }

      // 格式化时间
      list.forEach(item => {
        const d = item.createTime ? new Date(item.createTime) : new Date();
        item.time = (d.getMonth() + 1) + '/' + d.getDate() + ' ' + 
                    d.getHours().toString().padStart(2, '0') + ':' + 
                    d.getMinutes().toString().padStart(2, '0');
      });

      this.setData({ historyList: list });
    } catch (err) {
      console.error('加载识别历史失败', err);
      this.setData({ historyList: [] });
    }
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

  navigateToChat() {
    wx.navigateTo({
      url: '/pages/chat/chat'
    });
  },
  //目前不使用语音对话
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