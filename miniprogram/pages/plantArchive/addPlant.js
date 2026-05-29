const db = wx.cloud.database()

Page({

  data: {
    tempImagePath: '',
    nickname: '',
    species: '',
    selectedAddress: null,
    plantDate: ''
  },

  chooseImage() {

    wx.chooseImage({
      count: 1,

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

  onDateChange(e) {

    this.setData({
      plantDate: e.detail.value
    })

  },

  chooseAddress() {

    wx.navigateTo({
      url: '/pages/plantArchive/address/address'
    })

  },

  onCancel() {

    wx.navigateBack()

  },

  async onConfirm() {

    const {
      tempImagePath,
      nickname,
      species,
      selectedAddress,
      plantDate
    } = this.data

    if (!tempImagePath) {

      wx.showToast({
        title: '请上传图片',
        icon: 'none'
      })

      return
    }

    if (!nickname) {

      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      })

      return
    }

    if (!species) {

      wx.showToast({
        title: '请输入品种',
        icon: 'none'
      })

      return
    }

    if (!selectedAddress) {

      wx.showToast({
        title: '请选择地址',
        icon: 'none'
      })

      return
    }

    if (!plantDate) {

      wx.showToast({
        title: '请选择日期',
        icon: 'none'
      })

      return
    }

    wx.showLoading({
      title: '保存中'
    })

    try {

      // 上传图片
      const uploadRes = await wx.cloud.uploadFile({

        cloudPath:
          'plants/' +
          Date.now() +
          '.jpg',

        filePath: tempImagePath

      })

      // 保存数据库
      await db.collection('user_plants').add({

        data: {

          imageUrl: uploadRes.fileID,

          nickname,

          species,

          location: selectedAddress.address,

          latitude: selectedAddress.latitude,

          longitude: selectedAddress.longitude,

          plantDate,

          createTime: db.serverDate()

        }

      })

      wx.hideLoading()

      wx.showToast({
        title: '添加成功'
      })

      setTimeout(() => {

        wx.navigateBack()

      }, 1200)

    } catch (err) {

      console.log(err)

      wx.hideLoading()

      wx.showToast({
        title: '添加失败',
        icon: 'none'
      })

    }

  }

})