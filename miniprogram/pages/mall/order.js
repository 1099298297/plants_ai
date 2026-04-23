Page({
  data: {
    orders: [],
    statusText: {
      pending: '待支付',
      paid: '已支付',
      shipped: '已发货',
      completed: '已完成'
    }
  },

  onLoad() {
    this.loadOrders();
  },

  onShow() {
    this.loadOrders();
  },

  // 加载订单数据
  loadOrders() {
    const orders = wx.getStorageSync('orders') || [];
    this.setData({ orders });
  },

  // 支付订单
  payOrder(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/mall/payment?orderId=${id}`
    });
  },

  // 确认收货
  confirmReceive(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认收货',
      content: '确认已收到商品？',
      success: (res) => {
        if (res.confirm) {
          this.updateOrderStatus(id, 'completed');
        }
      }
    });
  },

  // 写评价
  writeReview(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/mall/review?orderId=${id}`
    });
  },

  // 更新订单状态
  updateOrderStatus(orderId, status) {
    const { orders } = this.data;
    const index = orders.findIndex(order => order.id === orderId);
    
    if (index > -1) {
      orders[index].status = status;
      this.setData({ orders });
      wx.setStorageSync('orders', orders);
      
      wx.showToast({
        title: '操作成功',
        icon: 'success'
      });
    }
  }
}); 