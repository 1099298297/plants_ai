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
      let statusText = "";
      if(res.data.status === "pending") statusText = "待支付";
      if(res.data.status === "paid") statusText = "已支付";

      this.setData({
        order: {
          ...res.data,
          statusText
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
  },

  formatTime(time) {
    if (!time) return "";
    const date = new Date(time);
    return date.toLocaleString();
  }
});