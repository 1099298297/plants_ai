//checkout.js
function createClientRequestId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

Page({
  data: {
    cartList: [],     // 永远是数组
    address: null,
    hasAddress: false,
    total: 0,
    fromType: '',     // product / cart
    isSubmitting: false,
    clientRequestId: createClientRequestId()
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

  async loadAddress() {
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

    // 从云数据库取默认地址
    try {
      const db = wx.cloud.database()
      const { data: addresses } = await db.collection('mall_addresses')
        .where({})
        .orderBy('createTime', 'desc')
        .get()
      const def = addresses.find(i => i.isDefault)
      if (def) {
        this.setData({ address: def, hasAddress: true })
      } else if (addresses.length > 0) {
        this.setData({ address: addresses[0], hasAddress: true })
      } else {
        this.setData({ hasAddress: false })
      }
    } catch (err) {
      console.error('加载地址失败', err)
      this.setData({ hasAddress: false })
    }
  },

  goSelectAddress() {
    wx.navigateTo({
      url: '/pages/mall/address?select=true'
    })
  },

  submitOrder() {
    const {
      hasAddress,
      cartList,
      fromType,
      address,
      isSubmitting,
      clientRequestId
    } = this.data

    if (isSubmitting) return

    if (!hasAddress) {
      wx.showToast({ title: '请选择收货地址', icon: 'none' })
      return
    }

    if (!Array.isArray(cartList) || cartList.length === 0) {
      wx.showToast({ title: '订单商品不能为空', icon: 'none' })
      return
    }
  
    const buyItems = cartList.map(i => ({
      productId: i.id,
      quantity: i.quantity,
      spec: i.spec || '默认规格'
    }))

    this.setData({ isSubmitting: true })
    wx.showLoading({ title: '提交中...', mask: true })
    wx.cloud.callFunction({
      name: 'createOrder',
      data: {
        buyItems,
        address: address,  // ✅ 关键：把选中的地址传给后端
        clientRequestId
      },
      success: res => {
        wx.hideLoading()
        const result = res.result || {}
        if (result.success) {
          wx.removeStorageSync('tempCheckoutCart')
  
          if (fromType === 'cart') {
            const successUids = cartList.map(i => i.uid)
            const oldCart = wx.getStorageSync('cart') || []
            const newCart = oldCart.filter(item => !successUids.includes(item.uid))
            wx.setStorageSync('cart', newCart)
          }
  
          wx.redirectTo({
            url: '/pages/mall/order-detail?orderId=' + result.orderId
          })
        } else {
          this.setData({ isSubmitting: false })
          wx.showToast({ title: result.msg || '提交失败', icon: 'none' })
        }
      },
      fail: () => {
        wx.hideLoading()
        this.setData({ isSubmitting: false })
        wx.showToast({ title: '提交失败', icon: 'none' })
      }
    })
  }
})
