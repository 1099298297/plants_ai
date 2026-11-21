// order-detail.js
Page({
  data: {
    orderId: '',
    order: {}
  },

  onLoad(options) {
    if (options.orderId) {
      this.setData({ orderId: options.orderId });
      this.getOrderDetail();
    }
  },

  async getOrderDetail() {
    const db = wx.cloud.database();
    try {
      const res = await db.collection('orders').doc(this.data.orderId).get();
      const orderData = res.data;

      let statusText = "";
      if (orderData.status === "pending") statusText = "已提交";
      if (orderData.status === "paid") statusText = "已支付";
      if (orderData.status === "shipped") statusText = "已发货";
      if (orderData.status === "completed") statusText = "已完成";
      if (orderData.status === "cancelled") statusText = "已取消";

      // ✅ 24小时制 时间格式化
      let createTimeText = "";
      if (orderData.createTime) {
        const date = new Date(orderData.createTime);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const mm = String(date.getMinutes()).padStart(2, '0');
        const ss = String(date.getSeconds()).padStart(2, '0');
        createTimeText = `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
      }

      this.setData({
        order: {
          ...orderData,
          statusText,
          createTimeText
        }
      });
    } catch (err) {
      console.error("获取订单失败", err);
    }
  },

  goToPay() {
    wx.redirectTo({
      url: `/pages/mall/payment?orderId=${this.data.orderId}`
    });
  },

  confirmReceipt() {
    wx.showModal({
      title: '确认完成',
      content: '请确认已经收到商品。确认后订单将变为已完成。',
      confirmText: '确认',
      success: res => {
        if (res.confirm) this.doConfirmReceipt()
      }
    })
  },

  async doConfirmReceipt() {
    wx.showLoading({ title: '处理中', mask: true })
    try {
      const res = await wx.cloud.callFunction({
        name: 'completeOrder',
        data: { orderId: this.data.orderId }
      })
      wx.hideLoading()
      const result = res.result || {}
      if (!result.success) {
        wx.showToast({ title: result.msg || '操作失败', icon: 'none' })
        return
      }
      wx.showToast({ title: '已完成', icon: 'success' })
      await this.getOrderDetail()
    } catch (err) {
      wx.hideLoading()
      console.error('确认完成失败:', err)
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  goToOrder() {
    console.log("---");
    wx.navigateBack({
      url: '/pages/mall/order'
    })
  }
});
