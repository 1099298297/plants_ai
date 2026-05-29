// pages/plantArchive/address/address.js
Page({

  data: {
    addressList: []
  },

  onShow() {
    this.loadAddressList()
    // 监听从 editAddress 返回时是否有更新标志
    const needRefresh = wx.getStorageSync('_addressListChanged')
    if (needRefresh) {
      wx.removeStorageSync('_addressListChanged')
      this.loadAddressList()
    }
  },

  // 加载地址列表
  loadAddressList() {
    const addressList = wx.getStorageSync('plantAddressList') || []
    this.setData({ addressList })
  },

  // 选择新地址（调用微信地图）
  chooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        if (!res.address) {
          wx.showToast({ title: '未获取到地址', icon: 'none' })
          return
        }

        const newAddress = {
          address: res.address,
          latitude: res.latitude,
          longitude: res.longitude,
          id: Date.now().toString() // 唯一标识
        }

        let list = wx.getStorageSync('plantAddressList') || []

        // 防止重复：比较完整地址字符串和经纬度（取小数点后4位）
        const isDuplicate = list.some(item => {
          const sameAddress = item.address === newAddress.address
          const sameLat = Math.abs(item.latitude - newAddress.latitude) < 0.0001
          const sameLng = Math.abs(item.longitude - newAddress.longitude) < 0.0001
          return sameAddress || (sameLat && sameLng)
        })

        if (!isDuplicate) {
          list.unshift(newAddress)
          wx.setStorageSync('plantAddressList', list)
          this.setData({ addressList: list })
          // 回传选中的地址到上一页（addPlant）
          this.setPreviousPageAddress(newAddress)
          wx.navigateBack()
        } else {
          wx.showToast({ title: '地址已存在', icon: 'none' })
        }
      },
      fail: (err) => {
        if (err.errMsg !== 'chooseLocation:fail cancel') {
          wx.showToast({ title: '选择位置失败', icon: 'none' })
        }
      }
    })
  },

  // 选择已有地址
  selectAddress(e) {
    const item = e.currentTarget.dataset.item
    if (!item) return
    this.setPreviousPageAddress(item)
    wx.navigateBack()
  },

  // 编辑地址（跳转到编辑页）
  editAddress(e) {
    const index = e.currentTarget.dataset.index
    const address = this.data.addressList[index]
    if (!address) return

    // 使用 eventChannel 传递数据（推荐），同时保留 index 作为 url 参数
    wx.navigateTo({
      url: `/pages/plantArchive/editAddress/editAddress?index=${index}`,
      events: {
        // 监听编辑页保存事件，用于刷新列表
        addressUpdated: (updatedAddress) => {
          this.handleAddressUpdate(index, updatedAddress)
        }
      },
      success: (res) => {
        // 传递地址数据给编辑页
        res.eventChannel.emit('sendAddressData', { address, index })
      }
    })
  },

  // 处理地址更新（被编辑页调用）
  handleAddressUpdate(index, newAddress) {
    let list = wx.getStorageSync('plantAddressList') || []
    if (index >= 0 && index < list.length) {
      list[index] = { ...list[index], ...newAddress }
      wx.setStorageSync('plantAddressList', list)
      this.setData({ addressList: list })
      
      // 如果更新后的地址正好是上一页选中的地址，同步更新
      const pages = getCurrentPages()
      if (pages.length >= 2) {
        const prevPage = pages[pages.length - 2]
        const currentSelected = prevPage.data.selectedAddress
        if (currentSelected && currentSelected.address === list[index].address) {
          prevPage.setData({
            selectedAddress: {
              address: newAddress.address,
              latitude: newAddress.latitude,
              longitude: newAddress.longitude
            }
          })
        }
      }
    }
  },

  // 删除地址
  deleteAddress(e) {
    const index = e.currentTarget.dataset.index
    wx.showModal({
      title: '提示',
      content: '确定删除该地址吗？',
      success: (res) => {
        if (res.confirm) {
          let list = wx.getStorageSync('plantAddressList') || []
          const deletedAddress = list[index]
          list.splice(index, 1)
          wx.setStorageSync('plantAddressList', list)
          this.setData({ addressList: list })
          wx.showToast({ title: '删除成功', icon: 'success' })

          // 如果删除的地址正好是上一页选中的地址，清空选中
          const pages = getCurrentPages()
          if (pages.length >= 2) {
            const prevPage = pages[pages.length - 2]
            const currentSelected = prevPage.data.selectedAddress
            if (currentSelected && currentSelected.address === deletedAddress.address) {
              prevPage.setData({ selectedAddress: null })
            }
          }
        }
      }
    })
  },

  // 辅助方法：回传地址到上一页（addPlant）
  setPreviousPageAddress(address) {
    const pages = getCurrentPages()
    if (pages.length < 2) return
    const prevPage = pages[pages.length - 2]
    if (prevPage && typeof prevPage.setData === 'function') {
      prevPage.setData({
        selectedAddress: {
          address: address.address,
          latitude: address.latitude,
          longitude: address.longitude
        }
      })
    }
  }
})