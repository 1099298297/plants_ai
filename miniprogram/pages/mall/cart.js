Page({
  data: {
    cartItems: [],
    allSelected: false,
    totalPrice: 0,
    selectedCount: 0,
    hasSelected: false
  },

  onLoad() {
    this.loadCartItems();
  },

  onShow() {
    this.loadCartItems();
  },

  // 加载购物车数据
  loadCartItems() {
    const cartItems = wx.getStorageSync('cart') || [];
    this.setData({ cartItems });
    this.calculateTotal();
  },

  // 切换商品选中状态
  toggleSelect(e) {
    const { id } = e.currentTarget.dataset;
    const { cartItems } = this.data;
    const index = cartItems.findIndex(item => item.id === id);
    
    if (index > -1) {
      cartItems[index].selected = !cartItems[index].selected;
      this.setData({ cartItems });
      this.calculateTotal();
      this.checkAllSelected();
    }
  },

  // 切换全选状态
  toggleSelectAll() {
    const { cartItems, allSelected } = this.data;
    const newCartItems = cartItems.map(item => ({
      ...item,
      selected: !allSelected
    }));
    
    this.setData({
      cartItems: newCartItems,
      allSelected: !allSelected
    });
    this.calculateTotal();
  },

  // 检查是否全选
  checkAllSelected() {
    const { cartItems } = this.data;
    const allSelected = cartItems.length > 0 && cartItems.every(item => item.selected);
    this.setData({ allSelected });
  },

  // 增加商品数量
  increaseQuantity(e) {
    const { id } = e.currentTarget.dataset;
    const { cartItems } = this.data;
    const index = cartItems.findIndex(item => item.id === id);
    
    if (index > -1) {
      cartItems[index].quantity += 1;
      this.setData({ cartItems });
      this.calculateTotal();
      this.saveCartItems();
    }
  },

  // 减少商品数量
  decreaseQuantity(e) {
    const { id } = e.currentTarget.dataset;
    const { cartItems } = this.data;
    const index = cartItems.findIndex(item => item.id === id);
    
    if (index > -1 && cartItems[index].quantity > 1) {
      cartItems[index].quantity -= 1;
      this.setData({ cartItems });
      this.calculateTotal();
      this.saveCartItems();
    }
  },

  // 删除商品
  removeItem(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '提示',
      content: '确定要删除这个商品吗？',
      success: (res) => {
        if (res.confirm) {
          const { cartItems } = this.data;
          const newCartItems = cartItems.filter(item => item.id !== id);
          this.setData({ cartItems: newCartItems });
          this.calculateTotal();
          this.saveCartItems();
        }
      }
    });
  },

  // 计算总价和选中数量
  calculateTotal() {
    const { cartItems } = this.data;
    let totalPrice = 0;
    let selectedCount = 0;
    let hasSelected = false;

    cartItems.forEach(item => {
      if (item.selected) {
        totalPrice += item.price * item.quantity;
        selectedCount += item.quantity;
        hasSelected = true;
      }
    });

    this.setData({
      totalPrice: totalPrice.toFixed(2),
      selectedCount,
      hasSelected
    });
  },

  // 保存购物车数据
  saveCartItems() {
    wx.setStorageSync('cart', this.data.cartItems);
  },

  // 结算
  async checkout() {
    const { cartItems } = this.data;
    const selectedItems = cartItems.filter(item => item.selected);

    if (selectedItems.length === 0) {
      wx.showToast({ title: '请选择商品', icon: 'none' });
      return;
    }

    // 只传 商品ID + 数量
    const buyItems = selectedItems.map(item => ({
      productId: item.id,
      quantity: item.quantity
    }));

    wx.showLoading({ title: '提交订单...' });

    try {
      // 调用云函数创建订单
      const { result } = await wx.cloud.callFunction({
        name: 'createOrder',
        data: { buyItems }
      });

      console.log("云函数返回：", result);

      if (!result.success) {
        wx.hideLoading();
        wx.showToast({
          title: result.msg || '下单失败',
          icon: 'none'
        });
        return;
      }

      // 下单成功：更新购物车
      const newCart = cartItems.filter(item => !item.selected);
      this.setData({ cartItems: newCart });
      this.saveCartItems();

      wx.hideLoading();
      wx.showToast({ title: '下单成功' });

      // ✅ 正确跳转：用返回的 orderId
      wx.navigateTo({
        url: `/pages/mall/order-detail?orderId=${result.orderId}`
      });

    } catch (err) {
      wx.hideLoading();
      console.error("下单异常", err);
      wx.showToast({ title: '下单失败', icon: 'none' });
    }
  },
}); 