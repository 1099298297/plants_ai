Page({
  data: {
    cartList: [],     // 永远是数组
    address: null,
    hasAddress: false,
    total: 0,
    fromType: ''      // product / cart
  },

  onLoad(options) {
    const fromType = options.from || 'product'
    this.setData({ fromType })

    // 统一读取：不管来源，都读 tempCheckoutCart
    const cartList = wx.getStorageSync('tempCheckoutCart') || []
    this.setData({ cartList })
    this.calcTotal()
  },

  onShow() {
    this.loadAddress()
  },

  calcTotal() {
    let total = 0
    this.data.cartList.forEach(item => {
      total += item.price * item.quantity
    })
    this.setData({ total: total.toFixed(2) })
  },

  loadAddress() {
    const pages = getCurrentPages()
    const current = pages[pages.length - 1]
    if (current.data.selectedAddress) {
      this.setData({
        address: current.data.selectedAddress,
        hasAddress: true
      })
      current.setData({ selectedAddress: null })
      return
    }

    const list = wx.getStorageSync('addresses') || []
    const def = list.find(i => i.isDefault)
    if (def) {
      this.setData({ address: def, hasAddress: true })
    } else {
      this.setData({ hasAddress: false })
    }
  },

  goSelectAddress() {
    wx.navigateTo({
      url: '/pages/mall/address?select=true'
    })
  },

  submitOrder() {
    const { hasAddress, cartList, fromType, address } = this.data
    if (!hasAddress) {
      wx.showToast({ title: '请选择收货地址', icon: 'none' })
      return
    }
  
    const buyItems = cartList.map(i => ({
      productId: i.id,
      quantity: i.quantity,
      spec: i.spec || '默认规格'
    }))
    console.log(address)
    wx.showLoading({ title: '提交中...' })
    wx.cloud.callFunction({
      name: 'createOrder',
      data: {
        buyItems,
        address: address  // ✅ 关键：把选中的地址传给后端
      },
      success: res => {
        wx.hideLoading()
        if (res.result.success) {
          wx.removeStorageSync('tempCheckoutCart')
  
          if (fromType === 'cart') {
            const successUids = cartList.map(i => i.uid)
            const oldCart = wx.getStorageSync('cart') || []
            const newCart = oldCart.filter(item => !successUids.includes(item.uid))
            wx.setStorageSync('cart', newCart)
          }
  
          wx.navigateTo({
            url: '/pages/mall/order-detail?orderId=' + res.result.orderId
          })
        } else {
          wx.showToast({ title: res.result.msg, icon: 'none' })
        }
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '提交失败', icon: 'none' })
      }
    })
  }
})