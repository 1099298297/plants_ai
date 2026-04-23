Page({
  data: {
    historyList: [], 
    isLoggedIn: false // 新增：用于判断当前用户是否已登录
  },

  onLoad(options) {
    // 页面加载时的逻辑
  },

  onShow() {
    // 页面每次显示时，先检查登录状态
    this.checkLoginStatus();
  },

// ================= 检查登录状态 =================
checkLoginStatus() {
    
  // 【核心修改】：使用你 login.js 里第 20 行存的真正核心凭证 'user_openid' ！！
  const userOpenId = wx.getStorageSync('user_openid'); 
  
  // 如果 userOpenId 有值，说明你绝对已经登录成功了
  const loggedIn = !!userOpenId; 

  this.setData({
    isLoggedIn: loggedIn
  });

  // 如果已登录，去加载历史记录；如果没登录，清空列表显示登录按钮
  if (loggedIn) {
    this.loadHistory(); // 只要走到这一步，你之前的记录就会瞬间全部回来！
  } else {
    this.setData({ historyList: [] });
  }
},

  // ================= 修改：加载历史记录 =================
  loadHistory() {
    const list = wx.getStorageSync('recognitionHistory') || [];
    
    // 每次重新加载时，确保所有卡片都是收起状态，体验更好
    list.forEach(item => {
      item.isExpanded = false;
    });

    this.setData({
      historyList: list
    });
  },

  // ================= 新增：点击去登录 =================
  goToLogin() {
    // 跳转到登录页面，请确保这里的路径和你的实际登录页路径一致！
    wx.navigateTo({
      url: '/pages/login/login'
    });
  },

  // ================= 点击展开/收起卡片详情 =================
  toggleDetails(e) {
    const index = e.currentTarget.dataset.index;
    const key = `historyList[${index}].isExpanded`;
    // 切换当前点击项的 isExpanded 布尔值
    this.setData({
      [key]: !this.data.historyList[index].isExpanded
    });
  },

  // 1. 点击跳转到植物识别页面
  navigateToPlantRecognition() {
    wx.navigateTo({
      url: '/pages/plantRecognition/plantRecognition'
    });
  },

  // 2. 点击跳转到智能对话页面
  navigateToVoiceChat() {
    wx.navigateTo({
      url: '/pages/voiceChat/voiceChat'
    });
  },

  onShareAppMessage() {
    return { title: '藤丰园林植物养护智能助手', path: '/pages/home/home' }
  },

  onShareTimeline() {
    return { title: '藤丰园林植物养护智能助手' }
  }
})