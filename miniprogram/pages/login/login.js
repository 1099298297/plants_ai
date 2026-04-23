Page({
  data: {
    defaultAvatar: '/images/icons/default-avatar.png', // 替换为你项目的默认头像
    avatarUrl: '', // 最终头像
    nickName: '',  // 最终昵称
    isAvatarChanged: false // 标记是否选了新头像
  },

  onLoad() {
    const openid = wx.getStorageSync('user_openid');
    if (openid) {
      this.goBack();
    }
  },

  // 1. 获取头像回调
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    this.setData({
      avatarUrl,
      isAvatarChanged: true
    });
  },

  // 2. 获取昵称回调（核心修复：防止一闪而过）
  onNicknameChange(e) {
    const value = e.detail.value;
    // 只有当值存在，且发生真实改变时，才进行 setData，避免空值覆盖
    if (value && value !== this.data.nickName) {
      this.setData({
        nickName: value
      });
    }
  },

  // 3. 点击授权并登录
  async handleLogin() {
    let { avatarUrl, nickName, isAvatarChanged } = this.data;

    // 表单校验
    if (!avatarUrl && !isAvatarChanged) {
      return wx.showToast({ title: '请授权头像', icon: 'none' });
    }
    if (!nickName.trim()) {
      return wx.showToast({ title: '请输入或授权昵称', icon: 'none' });
    }

    wx.showLoading({ title: '安全登录中...', mask: true });

    try {
      let finalAvatarUrl = avatarUrl;
      // 把微信临时头像上传到云开发存储，换取永久链接
      if (isAvatarChanged) {
        const cloudPath = `user-avatars/${Date.now()}-${Math.floor(Math.random(0, 1) * 1000)}.png`;
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: avatarUrl
        });
        finalAvatarUrl = uploadRes.fileID; 
      }

      // 调用登录云函数
      const res = await wx.cloud.callFunction({ name: 'login' });
      const openid = res.result.openid;
      
      if (openid) {
        // 存入凭证和信息
        wx.setStorageSync('user_openid', openid);
        wx.setStorageSync('userInfo', {
          nickName: nickName,
          avatarUrl: finalAvatarUrl
        });

        wx.hideLoading();
        wx.showToast({ title: '登录成功', icon: 'success' });
        
        setTimeout(() => {
          this.goBack();
        }, 1000);
      } else {
        throw new Error('获取身份失败');
      }

    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '登录出错，请重试', icon: 'none' });
      console.error('登录流程失败:', err);
    }
  },

  // 返回上一页
  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 });
    } else {
      wx.switchTab({ url: '/pages/home/home' });
    }
  }
});