Page({

  data: {
    addressList: []
  },

  onShow() {

    this.loadAddressList()

  },

  // 加载地址
  loadAddressList() {

    const addressList =
      wx.getStorageSync('plantAddressList') || []

    this.setData({
      addressList
    })

  },

  // 选择新地址
  chooseLocation() {

    wx.chooseLocation({

      success: (res) => {

        const address = {

          address: res.address,
          latitude: res.latitude,
          longitude: res.longitude

        }

        let list =
          wx.getStorageSync('plantAddressList') || []

        // 防止重复
        const exist = list.find(item => {

          return item.address === address.address

        })

        if (!exist) {

          list.unshift(address)

        }

        wx.setStorageSync(
          'plantAddressList',
          list
        )

        // 回填 addPlant
        const pages = getCurrentPages()

        const prevPage =
          pages[pages.length - 2]

        prevPage.setData({
          selectedAddress: address
        })

        wx.navigateBack()

      }

    })

  },

  // 选择已有地址
  selectAddress(e) {

    const item =
      e.currentTarget.dataset.item

    const pages = getCurrentPages()

    const prevPage =
      pages[pages.length - 2]

    prevPage.setData({
      selectedAddress: item
    })

    wx.navigateBack()

  },

  // 编辑地址
  editAddress(e) {

    const index =
      e.currentTarget.dataset.index

    wx.navigateTo({

      url:
        '/pages/plantArchive/editAddress/editAddress?index='
        + index

    })

  },

  // 删除地址
  deleteAddress(e) {

    const index =
      e.currentTarget.dataset.index

    wx.showModal({

      title: '提示',

      content: '确定删除该地址吗？',

      success: (res) => {

        if (res.confirm) {

          let list =
            wx.getStorageSync('plantAddressList') || []

          list.splice(index, 1)

          wx.setStorageSync(
            'plantAddressList',
            list
          )

          this.setData({
            addressList: list
          })

          wx.showToast({
            title: '删除成功'
          })

        }

      }

    })

  }

})