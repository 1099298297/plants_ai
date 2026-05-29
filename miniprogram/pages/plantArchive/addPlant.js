// pages/plantArchive/addPlant.js
const db = wx.cloud.database()

Page({

  data: {
    // 编辑模式标识
    isEdit: false,
    plantId: null,
    
    // 表单数据
    tempImagePath: '',      // 本地临时路径（新上传或未变）
    originalImageUrl: '',   // 编辑时原有的云存储 fileID
    nickname: '',
    species: '',
    selectedAddress: null,
    plantDate: ''
  },

  onLoad(options) {
    // 先处理外部传入的参数（来自识别页面）
    let imgUrl = options.imgUrl ? decodeURIComponent(options.imgUrl) : null;
    let plantName = options.plantName ? decodeURIComponent(options.plantName) : null;
  
    // 检查是否为编辑模式
    if (options.edit === 'true' && options.id) {
      this.setData({
        isEdit: true,
        plantId: options.id
      });
      wx.setNavigationBarTitle({ title: '编辑植物' });
      this.loadPlantData(options.id);
    } else {
      wx.setNavigationBarTitle({ title: '添加植物' });
      // 新增模式下预填图片和品种
      const updateData = {};
      if (imgUrl) updateData.tempImagePath = imgUrl;
      if (plantName) updateData.species = plantName;
      if (Object.keys(updateData).length) this.setData(updateData);
    }
  },

  // 加载已有植物数据（编辑模式）
  async loadPlantData(plantId) {
    wx.showLoading({ title: '加载中...', mask: true })
    try {
      const res = await db.collection('user_plants').doc(plantId).get()
      const plant = res.data
      
      // 获取图片临时链接（如果是云存储 fileID）
      let tempImageUrl = plant.imageUrl
      if (plant.imageUrl && plant.imageUrl.startsWith('cloud://')) {
        const tempRes = await wx.cloud.getTempFileURL({
          fileList: [plant.imageUrl]
        })
        tempImageUrl = tempRes.fileList[0].tempFileURL
      }
      
      this.setData({
        tempImagePath: tempImageUrl,
        originalImageUrl: plant.imageUrl,
        nickname: plant.nickname || '',
        species: plant.species || '',
        selectedAddress: {
          address: plant.location || '',
          latitude: plant.latitude || null,
          longitude: plant.longitude || null
        },
        plantDate: plant.plantDate || ''
      })
      
      wx.hideLoading()
    } catch (err) {
      wx.hideLoading()
      console.error('加载植物数据失败', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
    }
  },

  // 选择图片（支持更换）
  // 选择图片（支持更换）
chooseImage() {
  // 编辑模式下禁止修改图片
  if (this.data.isEdit) {
    wx.showToast({
      title: '编辑模式下不可修改图片',
      icon: 'none',
      duration: 1500
    })
    return
  }

  // 将 wx.chooseImage 替换为 wx.chooseMedia
  wx.chooseMedia({
    count: 1,           // 最多可以选择的图片张数
    mediaType: ['image'], // 指定只能选择图片
    sourceType: ['album', 'camera'], // 允许从相册选择或使用相机拍照
    success: (res) => {
      // 获取临时文件路径
      const tempFilePath = res.tempFiles[0].tempFilePath
      this.setData({
        tempImagePath: tempFilePath
      })
    }
  })
},

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value })
  },

  onSpeciesInput(e) {
    this.setData({ species: e.detail.value })
  },

  onDateChange(e) {
    this.setData({ plantDate: e.detail.value })
  },

  chooseAddress() {
    wx.navigateTo({
      url: '/pages/plantArchive/address/address'
    })
  },

  // 接收地址页返回的数据（地址页通过 setData 直接回传，此处备用 storage 方案）
  onShow() {
    const selectedAddress = wx.getStorageSync('selectedAddress')
    if (selectedAddress) {
      this.setData({ selectedAddress })
      wx.removeStorageSync('selectedAddress')
    }
  },

  onCancel() {
    wx.navigateBack()
  },

  async onConfirm() {
    const {
      isEdit,
      plantId,
      tempImagePath,
      originalImageUrl,
      nickname,
      species,
      selectedAddress,
      plantDate
    } = this.data

    // 表单校验
    if (!tempImagePath) {
      wx.showToast({ title: '请上传图片', icon: 'none' })
      return
    }
    if (!nickname) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }
    if (!species) {
      wx.showToast({ title: '请输入品种', icon: 'none' })
      return
    }
    if (!selectedAddress) {
      wx.showToast({ title: '请选择地址', icon: 'none' })
      return
    }
    if (!plantDate) {
      wx.showToast({ title: '请选择日期', icon: 'none' })
      return
    }

    wx.showLoading({ title: isEdit ? '保存中' : '添加中', mask: true })

    try {
      let imageFileID = originalImageUrl // 默认用旧图片（编辑模式）

      // 判断是否需要上传新图片：是本地临时路径且不是云存储 fileID 或 http 临时链接
      // 是否需要上传图片：新增模式下总是上传（除非已经是云存储ID）；编辑模式下仅当图片是本地新选的文件时才上传
      const needUpload = !isEdit && tempImagePath && !tempImagePath.startsWith('cloud://');
      
      if (needUpload) {
        // 上传新图片
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: 'plants/' + Date.now() + '.jpg',
          filePath: tempImagePath
        })
        imageFileID = uploadRes.fileID
        
        // 如果是编辑模式且原有图片存在，删除旧图片（节省空间）
        if (isEdit && originalImageUrl && originalImageUrl.startsWith('cloud://')) {
          try {
            await wx.cloud.deleteFile({ fileList: [originalImageUrl] })
          } catch (delErr) {
            console.warn('删除旧图片失败', delErr)
          }
        }
      } else {
        // 未换图：编辑模式下保持原图；新增模式下 tempImagePath 可能是临时 http 链接，需要再上传
        // 新增模式下，若 tempImagePath 是临时 http 链接（来自于编辑时的预览），实际上应该重新上传？
        // 更严谨：新增模式下 tempImagePath 一定是本地临时文件，所以不可能走到 else，但为了安全再判断一下
        if (!isEdit && tempImagePath && !tempImagePath.startsWith('cloud://')) {
          // 理论上新增时都是本地文件，这里兜底上传
          const uploadRes = await wx.cloud.uploadFile({
            cloudPath: 'plants/' + Date.now() + '.jpg',
            filePath: tempImagePath
          })
          imageFileID = uploadRes.fileID
        } else if (!isEdit && !imageFileID) {
          // 没有图片文件ID，抛出错误
          throw new Error('图片上传失败，请重新选择图片')
        }
      }

      // 构建植物数据
      const plantData = {
        nickname,
        species,
        location: selectedAddress.address,
        latitude: selectedAddress.latitude,
        longitude: selectedAddress.longitude,
        plantDate,
        imageUrl: imageFileID,
        updateTime: db.serverDate()
      }

      if (isEdit) {
        // 更新植物档案
        await db.collection('user_plants').doc(plantId).update({ data: plantData })
        wx.showToast({ title: '保存成功', icon: 'success' })
      } else {
        // 新增植物档案（不需要手动设置 _openid）
        await db.collection('user_plants').add({
          data: {
            ...plantData,
            createTime: db.serverDate(),
            healthStatus: '良好'  // 可选字段
          }
        })
        wx.showToast({ title: '添加成功', icon: 'success' })
      }

      wx.hideLoading()
      setTimeout(() => wx.navigateBack(), 1200)

    } catch (err) {
      console.error('保存失败', err)
      wx.hideLoading()
      wx.showToast({ title: isEdit ? '保存失败' : '添加失败', icon: 'none' })
    }
  }
})