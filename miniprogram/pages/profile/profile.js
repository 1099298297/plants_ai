const app = getApp()
const adminOrderNotifier = require('../../utils/adminOrderNotifier')

Page({
  data: {
    userInfo: {},
    isLoggedIn: false,
    isAdmin: false,
    activeOrderCount: 0
  },

  onLoad() {
    this.loadUserInfo();
  },

  onShow() {
    this.loadUserInfo(); // 保证每次切回页面都刷新数据
    this.refreshAdminEntry();
  },

  async refreshAdminEntry() {
    if (!wx.getStorageSync('user_openid')) {
      this.setData({ isAdmin: false, activeOrderCount: 0 })
      return
    }

    const session = await adminOrderNotifier.refresh({ notify: false })
    this.setData({
      isAdmin: !!session.isAdmin,
      activeOrderCount: Number(session.activeCount || 0)
    })
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
          adminOrderNotifier.clearSession();
          adminOrderNotifier.stop();
          this.setData({ userInfo: {}, isLoggedIn: false, isAdmin: false });
          wx.switchTab({ url: '/pages/home/home' });
          wx.showToast({ title: '已退出登录', icon: 'none' });
        }
      }
    });
  },

  // 公共：未登录拦截
  checkLoginAndNavigate(url) {
    const openid = wx.getStorageSync('user_openid')
    if (!openid) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return false
    }
    wx.navigateTo({ url })
    return true
  },

    // 我的订单
  navigateToOrders() {
    this.checkLoginAndNavigate('/pages/mall/order')
  },

  // 购物车
  navigateToCart() {
    this.checkLoginAndNavigate('/pages/mall/cart')
  },

  // 我的收藏
  navigateToFavorites() {
    this.checkLoginAndNavigate('/pages/mall/favorites')
  },

  // 收货地址
  navigateToAddress() {
    this.checkLoginAndNavigate('/pages/mall/address')
  },

  // 浏览历史
  navigateToHistory() {
    this.checkLoginAndNavigate('/pages/mall/history')
  },

  // 设置
  navigateToSettings() {
    wx.navigateTo({ url: '/pages/settings/settings' })
  },

  navigateToAdminOrders() {
    wx.navigateTo({ url: '/pages/admin/orders' })
  },
});
