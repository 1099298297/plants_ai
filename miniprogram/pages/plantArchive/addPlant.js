const app = getApp()

Page({
  data: {
    tempImagePath: '',
    nickname: '',
    species: '',
    location: '', // 保存植物地址
    plantDate: ''
  },

  // ================= 新增：接收从识别页面传来的参数 =================
  onLoad: function (options) {
    if (options.imgUrl || options.plantName) {
      const decodedImg = options.imgUrl ? decodeURIComponent(options.imgUrl) : '';
      const decodedName = options.plantName ? decodeURIComponent(options.plantName) : '';
      
      this.setData({
        tempImagePath: decodedImg,
        species: decodedName,
        nickname: decodedName // 默认把品种名填入昵称，用户可自行修改
      });
    }
  },
  // ================================================================

  chooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({
          tempImagePath: res.tempFilePaths[0]
        })
      }
    })
  },

  onNicknameInput(e) {
    this.setData({
      nickname: e.detail.value
    })
  },

  onSpeciesInput(e) {
    this.setData({
      species: e.detail.value
    })
  },

  // 监听地址输入
  onLocationInput(e) {
    this.setData({
      location: e.detail.value
    })
  },

  onDateChange(e) {
    this.setData({
      plantDate: e.detail.value
    })
  },

  onCancel() {
    wx.navigateBack()
  },

  async onConfirm() {
    const { tempImagePath, nickname, species, location, plantDate } = this.data

    // 1. 本地表单校验
    if (!tempImagePath) {
      wx.showToast({ title: '请上传植物图片', icon: 'none' });
      return;
    }
    if (!nickname) {
      wx.showToast({ title: '请输入植物昵称', icon: 'none' });
      return;
    }
    if (!species) {
      wx.showToast({ title: '请输入品种名称', icon: 'none' });
      return;
    }
    if (!plantDate) {
      wx.showToast({ title: '请选择种植日期', icon: 'none' });
      return;
    }

    // ================== 新增：未登录拦截逻辑 ==================
    // 2. 检查是否已经获取到底层登录凭证 openid
    const openid = wx.getStorageSync('user_openid');
    if (!openid) {
      wx.showToast({
        title: '请先登录以保存档案',
        icon: 'none',
        duration: 1500
      });
      
      // 延迟 1.5 秒后跳转登录页，使用 navigateTo 保留当前填写的页面数据不被销毁
      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/login/login'
        });
      }, 1500);
      
      return; // 没登录，终止本次提交操作！
    }
    // ==========================================================


    // 3. 已经登录，继续执行原本的上传和保存逻辑
    wx.showLoading({
      title: '添加中...'
    })

    try {
      // 上传图片到云存储
      const cloudPath = `user_plants/${Date.now()}-${Math.random().toString(36).substr(2)}.jpg`
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath: tempImagePath
      })

      // 添加植物记录到数据库
      const db = wx.cloud.database()
      const result = await db.collection('user_plants').add({
        data: {
          imageUrl: uploadRes.fileID,
          nickname,
          species,
          location, // 将地址保存到数据库
          plantDate,
          createTime: db.serverDate() // 这里云开发会自动加上记录创建者的 _openid
        }
      })

      wx.hideLoading()
      wx.showToast({
        title: '添加成功',
        icon: 'success'
      })

      // 返回上一页并刷新列表
      setTimeout(() => {
        const pages = getCurrentPages()
        const prevPage = pages[pages.length - 2]
        if (prevPage && typeof prevPage.loadPlants === 'function') {
           prevPage.loadPlants() // 刷新上一页的列表
        }
        wx.navigateBack()
      }, 1500)

    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: '添加失败',
        icon: 'none'
      })
      console.error('添加植物失败：', err)
    }
  }
})