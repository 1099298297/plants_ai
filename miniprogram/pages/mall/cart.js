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

  // 结算 → 跳转到 checkout 页面（不再直接下单）
  checkout() {
    const { cartItems } = this.data;
    const selectedItems = cartItems.filter(item => item.selected);

    if (selectedItems.length === 0) {
      wx.showToast({ title: '请选择商品', icon: 'none' });
      return;
    }

    // 临时存储选中的购物车商品
    wx.setStorageSync('tempCheckoutCart', selectedItems);

    // 跳转到结算页，标记来自 cart
    wx.navigateTo({
      url: '/pages/mall/checkout/checkout?from=cart'
    });
  },
}); 