Page({
  data: {
    orderId: '',
    order: {}
  },

  onLoad(options) {
    if (options.orderId) {
      this.setData({ orderId: options.orderId })
      this.getOrder()
    }
  },

  async getOrder() {
    const db = wx.cloud.database()
    try {
      const res = await db.collection('orders').doc(this.data.orderId).get()
      const order = res.data
      
      // 统一状态文字
      let statusText = "";
      if(order.status === "pending"){
        statusText = "待支付";
      }else if(order.status === "paid"){
        statusText = "已支付";
      }else{
        statusText = order.status;
      }

      this.setData({
        order: {
          ...order,
          shortId: order._id.substring(0, 16),
          fixedPrice: order.totalPrice.toFixed(2),
          statusText: statusText
        }
      })
    } catch (err) {
      console.error('获取订单失败', err)
    }
  },

  toPay() {
    wx.showModal({
      title: '确认支付',
      content: '确定支付该订单？',
      success: (res) => {
        if (res.confirm) {
          this.doPay()
        }
      }
    })
  },

  async doPay() {
    wx.showLoading({ title: '支付中...' })
    const db = wx.cloud.database()
    try {
      await db.collection('orders').doc(this.data.orderId).update({
        data: { status: 'paid' }
      })
      wx.hideLoading()
      wx.showToast({ title: '支付成功' })
      setTimeout(() => {
        wx.redirectTo({ url: '/pages/mall/order' })
      }, 1200)
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '支付失败', icon: 'none' })
    }
  }
})