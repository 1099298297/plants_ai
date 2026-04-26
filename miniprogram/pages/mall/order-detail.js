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
      if (orderData.status === "pending") statusText = "待支付";
      if (orderData.status === "paid") statusText = "已支付";
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
    wx.navigateTo({
      url: `/pages/mall/payment?orderId=${this.data.orderId}`
    });
  }
});