const app = getApp()

Page({
  data: {
    userInfo: {},
    isLoggedIn: false
  },

  onLoad() {
    this.loadUserInfo();
  },

  onShow() {
    this.loadUserInfo(); // 保证每次切回页面都刷新数据
  },

  loadUserInfo() {
    let userInfo = wx.getStorageSync('userInfo') || {};
    const userOpenId = wx.getStorageSync('user_openid'); 
    const isLoggedIn = !!userOpenId; 
    
    if (userInfo.nickName === '微信生态用户') {
      userInfo.nickName = ''; 
    }
    
    this.setData({ 
      userInfo: userInfo, 
      isLoggedIn: isLoggedIn 
    });
  },

  async onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    wx.showLoading({ title: '更新中...' });
    try {
      const cloudPath = `user-avatars/${Date.now()}-${Math.floor(Math.random(0, 1) * 1000)}.png`;
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: avatarUrl
      });
      
      this.setData({ 'userInfo.avatarUrl': uploadRes.fileID });
      wx.setStorageSync('userInfo', this.data.userInfo);
      wx.hideLoading();
    } catch(err) {
      wx.hideLoading();
      wx.showToast({ title: '头像上传失败', icon: 'none' });
    }
  },

  onInputNickname(e) {
    const nickName = e.detail.value;
    if (!nickName) return;

    this.setData({ 'userInfo.nickName': nickName });
    wx.setStorageSync('userInfo', this.data.userInfo);
  },

  login() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  handleLogout() {
    wx.showModal({
      title: '退出确认',
      content: '确定要退出当前账号吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('user_openid');
          wx.removeStorageSync('userInfo');
          this.setData({ userInfo: {}, isLoggedIn: false });
          wx.switchTab({ url: '/pages/home/home' });
          wx.showToast({ title: '已退出登录', icon: 'none' });
        }
      }
    });
  },

  navigateToOrders() { wx.navigateTo({ url: '/pages/mall/order' }); },
  navigateToCart() { wx.navigateTo({ url: '/pages/mall/cart' }); },
  navigateToFavorites() { wx.navigateTo({ url: '/pages/mall/favorites' }); },
  navigateToAddress() { wx.navigateTo({ url: '/pages/mall/address' }); },
  navigateToHistory() { wx.navigateTo({ url: '/pages/mall/history' }); },
  navigateToSettings() { wx.navigateTo({ url: '/pages/settings/settings' }); }
});