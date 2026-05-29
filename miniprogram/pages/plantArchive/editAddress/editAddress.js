Page({

  data: {
    index: -1,
    address: ''
  },

  onLoad(options) {

    const index = options.index

    const list =
      wx.getStorageSync('plantAddressList') || []

    const item = list[index]

    if (item) {

      this.setData({

        index,

        address: item.address

      })

    }

  },

  onInput(e) {

    this.setData({
      address: e.detail.value
    })

  },

  saveAddress() {

    const {
      index,
      address
    } = this.data

    if (!address.trim()) {

      wx.showToast({
        title: '请输入地址',
        icon: 'none'
      })

      return
    }

    let list =
      wx.getStorageSync('plantAddressList') || []

    if (list[index]) {

      list[index].address = address

    }

    wx.setStorageSync(
      'plantAddressList',
      list
    )

    wx.showToast({
      title: '保存成功'
    })

    setTimeout(() => {

      wx.navigateBack()

    }, 800)

  }

})