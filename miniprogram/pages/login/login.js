Page({
  data: {
    defaultAvatar: '/images/icons/default-avatar.png',
    avatarUrl: '',
    nickName: '',
    isAvatarChanged: false,
    focusNickname: false
  },

  onLoad() {
    const openid = wx.getStorageSync('user_openid');
    if (openid) {
      this.goBack();
      return;
    }
    // 进入页面自动聚焦昵称输入框
    this.setData({ focusNickname: true });
  },

  // 实时捕获昵称输入（包括点击“使用微信昵称”）
  onNicknameInput(e) {
    const value = e.detail.value;
    if (value !== undefined) {
      this.setData({ nickName: value });
    }
  },

  // 失去焦点时再次确保捕获（兜底）
  onNicknameBlur(e) {
    const value = e.detail.value;
    if (value && value !== this.data.nickName) {
      this.setData({ nickName: value });
    }
  },

  // 头像选择
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    this.setData({
      avatarUrl,
      isAvatarChanged: true
    });
    // 可选：选完头像后再次聚焦昵称（方便下一步）
    // this.setData({ focusNickname: true });
  },

  async handleLogin() {
    // 🔥 关键：直接从 DOM 获取昵称输入框的值
    let actualNickName = '';
    const query = wx.createSelectorQuery();
    query.select('.nickname-input').fields({ properties: ['value'] }, (res) => {
      actualNickName = res ? res.value : '';
    });
    await new Promise(resolve => query.exec(resolve));
  
    let { avatarUrl, nickName, isAvatarChanged } = this.data;
    if (actualNickName && actualNickName.trim()) {
      nickName = actualNickName;
      if (nickName !== this.data.nickName) {
        this.setData({ nickName }); // 同步更新
      }
    }
  
    // 校验昵称
    if (!nickName || !nickName.trim()) {
      this.setData({ focusNickname: true });
      wx.showToast({ title: '请授权微信昵称', icon: 'none', duration: 1500 });
      return;
    }
  
    // 以下代码与你之前相同...
    wx.showLoading({ title: '安全登录中...', mask: true });
    try {
      let finalAvatarUrl = avatarUrl;
      if (isAvatarChanged && avatarUrl) {
        const cloudPath = `user-avatars/${Date.now()}-${Math.floor(Math.random() * 1000)}.png`;
        const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath: avatarUrl });
        finalAvatarUrl = uploadRes.fileID;
      } else {
        finalAvatarUrl = this.data.defaultAvatar;
      }
      const res = await wx.cloud.callFunction({ name: 'login' });
      const openid = res.result.openid;
      if (openid) {
        wx.setStorageSync('user_openid', openid);
        wx.setStorageSync('userInfo', { nickName: nickName.trim(), avatarUrl: finalAvatarUrl });
        wx.hideLoading();
        wx.showToast({ title: '登录成功', icon: 'success' });
        setTimeout(() => this.goBack(), 1000);
      } else {
        throw new Error('获取身份失败');
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '登录出错，请重试', icon: 'none' });
      console.error('登录流程失败:', err);
    }
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 });
    } else {
      wx.switchTab({ url: '/pages/home/home' });
    }
  }
});