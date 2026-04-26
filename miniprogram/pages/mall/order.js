Page({
  data: {
    orderList: []
  },

  onShow() {
    this.getMyOrders()
  },

  async getMyOrders() {
    const db = wx.cloud.database()
    try {
      const res = await db.collection('orders')
        .orderBy('createTime', 'desc')
        .get()

      const formatOrders = res.data.map(item => {
        return {
          ...item,
          shortId: item._id.substring(0, 16) + '...',
          fixedPrice: item.totalPrice.toFixed(2),
          statusText: this.getStatusText(item.status)
        }
      })

      this.setData({ orderList: formatOrders })
    } catch (err) {
      console.error("获取订单失败", err)
    }
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/mall/order-detail?orderId=' + id })
  },

  goToPay(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/mall/payment?orderId=' + id })
  },

  // 取消订单
  cancelOrder(e) {
    const orderId = e.currentTarget.dataset.id
    wx.showModal({
      title: '取消订单',
      content: '确定要取消该订单吗？',
      success: (res) => {
        if (res.confirm) {
          this.doCancel(orderId)
        }
      }
    })
  },

  async doCancel(orderId) {
    wx.showLoading()
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'cancelOrder',
        data: { orderId }
      })

      wx.hideLoading()
      if (result.success) {
        wx.showToast({ title: '已取消' })
        this.getMyOrders()
      } else {
        wx.showToast({ title: result.msg, icon: 'none' })
      }
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ icon: 'none' })
    }
  },

  getStatusText(status) {
    const map = {
      pending: "待支付",
      paid: "已支付",
      completed: "已完成",
      cancelled: "已取消"
    }
    return map[status] || "未知状态"
  }
})