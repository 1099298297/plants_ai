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

      // ✅ 在这里处理所有字符串、数字格式
      const formatOrders = res.data.map(item => {
        return {
          ...item,
          shortId: item._id.substring(0, 16)+'...', // 短订单号
          fixedPrice: item.totalPrice.toFixed(2), // 两位小数价格
          statusText: this.getStatusText(item.status) // 状态文本
        }
      })

      this.setData({
        orderList: formatOrders
      })
    } catch (err) {
      console.error("获取订单失败", err)
    }
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/pages/mall/order-detail?orderId=' + id
    })
  },

  goToPay(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/pages/mall/payment?orderId=' + id
    })
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