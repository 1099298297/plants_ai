const app = getApp()

Page({
  data: {
    plants: [],
    isLoggedIn: false // 新增：用来控制页面显示“未登录”还是“植物列表”
  },

  onLoad: function() {
    this.checkLoginAndLoadData()
  },

  onShow: function() {
    this.checkLoginAndLoadData()
  },

// ================= 核心修复：更强大的检查登录逻辑 =================
checkLoginAndLoadData() {
  // 1. 兼容获取底层的 openid（防止之前测试时存成了别的名字）
  const openid = wx.getStorageSync('user_openid') || wx.getStorageSync('openid') || wx.getStorageSync('userOpenId');
  
  // 2. 获取表面的 用户资料（头像昵称）
  const userInfo = wx.getStorageSync('userInfo');

  console.log("【档案页状态检查】", "openid:", openid, "userInfo:", userInfo);

  // 3. 【关键】只要有 openid 或者有 userInfo，我们就跟“我的”页面一样，认为已经登录了！
  if (openid || userInfo) {
    
    this.setData({ isLoggedIn: true });
    
    // 只有拿到了真实的 openid，才去查数据库
    if (openid) {
      this.loadPlants(openid);
    } else {
      // 极端异常情况保护：如果只存了头像没存openid，清空列表但保持登录界面
      this.setData({ plants: [] }); 
    }
    
  } else {
    // 啥凭证都没有，彻底没登录，显示去登录的按钮
    this.setData({ isLoggedIn: false, plants: [] });
  }
},
// ===============================================================

  // ================= 新增：点击去登录按钮 =================
  goToLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    })
  },

  // 修改：接收真实的 openid 进行查询
  async loadPlants(realOpenid) {
    try {
      const db = wx.cloud.database()
      const res = await db.collection('user_plants')
        .where({
          _openid: realOpenid  // <--- 修复：使用传入的真实 openid 过滤！
        })
        .orderBy('createTime', 'desc')
        .get()

      this.setData({
        plants: res.data
      })
    } catch (err) {
      console.error('加载植物列表失败：', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  onAddPlant() {
    // 细节优化：如果你没登录，点右上角的“+”号直接带你去登录，省得进去了再拦截
    if (!this.data.isLoggedIn) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    
    wx.navigateTo({
      url: '/pages/plantArchive/addPlant'
    })
  },

  onPlantTap(e) {
    const plant = e.currentTarget.dataset.plant
    wx.navigateTo({
      url: `/pages/plantArchive/plantDetail?id=${plant._id}`
    })
  },

  async onDeletePlant(e) {
    const plantId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除该植物档案吗？此操作不可恢复。',
      success: async (res) => {
        if (res.confirm) {
          try {
            const db = wx.cloud.database();
            await db.collection('user_plants').doc(plantId).remove();
            await db.collection('plant_reminders').where({ plantId: plantId }).remove();
            wx.showToast({ title: '删除成功', icon: 'success' });
            
            // 删除后重新加载，需要再传一次真实的 openid
            const openid = wx.getStorageSync('user_openid');
            this.loadPlants(openid); 
            
          } catch (err) {
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      }
    });
  },

  // ================= 添加的分享功能代码 =================
  onShareAppMessage: function () {
    return {
      title: '快来建立你的专属植物档案吧！', 
      path: '/pages/plantArchive/plantArchive', 
    }
  },

  onShareTimeline: function () {
    return {
      title: '快来建立你的专属植物档案吧！' 
    }
  }
})