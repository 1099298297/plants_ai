Page({
  data: {
    orderId: '',
    order: null,
    selectedMethod: ''
  },

  onLoad(options) {
    const { orderId } = options;
    this.setData({ orderId });
    this.loadOrderInfo();
  },

  // 加载订单信息
  loadOrderInfo() {
    const orders = wx.getStorageSync('orders') || [];
    const order = orders.find(order => order.id === this.data.orderId);
    
    if (order) {
      this.setData({ order });
    } else {
      wx.showToast({
        title: '订单不存在',
        icon: 'error'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  // 选择支付方式
  selectMethod(e) {
    const { method } = e.currentTarget.dataset;
    this.setData({ selectedMethod: method });
  },

  // 处理支付
  handlePayment() {
    const { order, selectedMethod } = this.data;
    
    if (!selectedMethod) {
      wx.showToast({
        title: '请选择支付方式',
        icon: 'none'
      });
      return;
    }

    // 模拟支付过程
    wx.showLoading({
      title: '支付处理中...'
    });

    setTimeout(() => {
      wx.hideLoading();
      
      // 更新订单状态
      const orders = wx.getStorageSync('orders') || [];
      const index = orders.findIndex(item => item.id === order.id);
      
      if (index > -1) {
        orders[index].status = 'paid';
        wx.setStorageSync('orders', orders);
        
        wx.showToast({
          title: '支付成功',
          icon: 'success'
        });

        // 延迟返回订单列表
        setTimeout(() => {
          wx.redirectTo({
            url: '/pages/mall/order'
          });
        }, 1500);
      }
    }, 2000);
  },

  // 取消支付
  cancelPayment() {
    wx.showModal({
      title: '取消支付',
      content: '确定要取消支付吗？',
      success: (res) => {
        if (res.confirm) {
          wx.navigateBack();
        }
      }
    });
  }
}); 