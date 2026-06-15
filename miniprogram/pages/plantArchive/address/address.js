// pages/plantArchive/address/address.js
Page({

  data: {
    addressList: []
  },

  onShow() {
    this.loadAddressList()
  },

  // 加载地址列表（从云数据库）
  async loadAddressList() {
    try {
      const db = wx.cloud.database()
      const res = await db.collection('plant_addresses')
        .where({})
        .orderBy('createTime', 'desc')
        .get()
      this.setData({ addressList: res.data })
    } catch (err) {
      console.error('加载地址失败', err)
      this.setData({ addressList: [] })
    }
  },

  // 选择新地址（调用微信地图）
  chooseLocation() {
    wx.chooseLocation({
      success: async (res) => {
        if (!res.address) {
          wx.showToast({ title: '未获取到地址', icon: 'none' })
          return
        }

        const newAddress = {
          address: res.address,
          latitude: res.latitude,
          longitude: res.longitude
        }

        // 防止重复：从云查重
        try {
          const db = wx.cloud.database()
          const { data: list } = await db.collection('plant_addresses')
            .where({}).get()
          const isDuplicate = list.some(item => {
            const sameAddress = item.address === newAddress.address
            const sameLat = Math.abs(item.latitude - newAddress.latitude) < 0.0001
            const sameLng = Math.abs(item.longitude - newAddress.longitude) < 0.0001
            return sameAddress || (sameLat && sameLng)
          })

          if (isDuplicate) {
            wx.showToast({ title: '地址已存在', icon: 'none' })
            return
          }

          // 新增到云
          await db.collection('plant_addresses').add({
            data: {
              ...newAddress,
              createTime: db.serverDate()
            }
          })

          this.setData({ addressList: [newAddress, ...this.data.addressList] })
          this.setPreviousPageAddress(newAddress)
          wx.navigateBack()
        } catch (err) {
          console.error('保存地址失败', err)
          wx.showToast({ title: '保存失败', icon: 'none' })
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
    const { id } = e.currentTarget.dataset
    const address = this.data.addressList.find(a => a._id === id)
    if (!address) return

    wx.navigateTo({
      url: `/pages/plantArchive/editAddress/editAddress?id=${id}`,
      events: {
        addressUpdated: (updatedAddress) => {
          this.handleAddressUpdate(id, updatedAddress)
        }
      },
      success: (res) => {
        res.eventChannel.emit('sendAddressData', { address, id })
      }
    })
  },

  // 处理地址更新（被编辑页调用）
  async handleAddressUpdate(id, newAddress) {
    try {
      const db = wx.cloud.database()
      await db.collection('plant_addresses').doc(id).update({
        data: { address: newAddress.address }
      })
      this.loadAddressList()

      // 如果更新后的地址正好是上一页选中的地址，同步更新
      const pages = getCurrentPages()
      if (pages.length >= 2) {
        const prevPage = pages[pages.length - 2]
        const currentSelected = prevPage.data.selectedAddress
        if (currentSelected && currentSelected.address === this.data.addressList.find(a => a._id === id)?.address) {
          prevPage.setData({
            selectedAddress: {
              address: newAddress.address,
              latitude: newAddress.latitude,
              longitude: newAddress.longitude
            }
          })
        }
      }
    } catch (err) {
      console.error('更新地址失败', err)
      wx.showToast({ title: '更新失败', icon: 'none' })
    }
  },

  // 删除地址
  deleteAddress(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '提示',
      content: '确定删除该地址吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const db = wx.cloud.database()
            const deletedAddress = this.data.addressList.find(a => a._id === id)

            await db.collection('plant_addresses').doc(id).remove()

            this.loadAddressList()
            wx.showToast({ title: '删除成功', icon: 'success' })

            // 如果删除的地址正好是上一页选中的地址，清空选中
            if (deletedAddress) {
              const pages = getCurrentPages()
              if (pages.length >= 2) {
                const prevPage = pages[pages.length - 2]
                const currentSelected = prevPage.data.selectedAddress
                if (currentSelected && currentSelected.address === deletedAddress.address) {
                  prevPage.setData({ selectedAddress: null })
                }
              }
            }
          } catch (err) {
            console.error('删除地址失败', err)
            wx.showToast({ title: '删除失败', icon: 'none' })
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