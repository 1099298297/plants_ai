Page({

  data: {
    id: '',
    address: ''
  },

  async onLoad(options) {
    const id = options.id
    if (!id) return

    try {
      const db = wx.cloud.database()
      const res = await db.collection('plant_addresses').doc(id).get()
      this.setData({
        id,
        address: res.data.address
      })
    } catch (err) {
      console.error('加载地址失败', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  onInput(e) {
    this.setData({
      address: e.detail.value
    })
  },

  async saveAddress() {
    const { id, address } = this.data

    if (!address.trim()) {
      wx.showToast({ title: '请输入地址', icon: 'none' })
      return
    }

    try {
      const db = wx.cloud.database()
      await db.collection('plant_addresses').doc(id).update({
        data: { address }
      })

      // 通知上一页刷新
      const eventChannel = this.getOpenerEventChannel()
      eventChannel.emit('addressUpdated', { address })

      wx.showToast({ title: '保存成功' })
      setTimeout(() => { wx.navigateBack() }, 800)

    } catch (err) {
      console.error('保存地址失败', err)
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  }

})