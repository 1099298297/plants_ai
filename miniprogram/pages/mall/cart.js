const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    cartItems: [],
    allSelected: false,
    totalPrice: 0,
    selectedCount: 0,
    hasSelected: false
  },

  onLoad() {
    this.loadCartItems()
  },

  onShow() {
    this.loadCartItems()
  },

  generateUid() {
    return Date.now() + '' + Math.floor(Math.random() * 10000)
  },

  async loadCartItems() {
    try {
      let cartItems = wx.getStorageSync('cart') || []
      cartItems = cartItems.map(item => {
        if (!item.uid) item.uid = this.generateUid()
        return item
      })

      if (cartItems.length === 0) {
        this.setData({
          cartItems: [],
          allSelected: false,
          totalPrice: '0.00',
          selectedCount: 0,
          hasSelected: false
        })
        return
      }

      const productIds = cartItems.map(i => i.id)
      const res = await db.collection('products')
        .where({ id: db.command.in(productIds) })
        .get()
      const realProducts = res.data

      cartItems = cartItems.map(item => {
        const real = realProducts.find(p => p.id == item.id)
        if (real) {
          const max = real.stock || 999
          if (item.quantity > max) item.quantity = max
        }
        return item
      })

      this.setData({ cartItems })

      // 🔥 修复：加载完成后自动计算选择 + 价格
      this.calculateTotal()
      this.checkAllSelected()

    } catch (err) {
      console.error(err)
      let cartItems = wx.getStorageSync('cart') || []
      this.setData({ cartItems })
      this.calculateTotal()
    }
  },

  // 🔥 修复：使用 bindchange，状态完全同步
  toggleSelect(e) {
    console.log("toggleSelect")
    console.log(e)
    const { uid } = e.currentTarget.dataset
    let { cartItems } = this.data
    const index = cartItems.findIndex(i => i.uid === uid)
    if (index === -1) return

    cartItems[index].selected = !cartItems[index].selected
    this.setData({ cartItems })

    // 🔥 修复：选择后强制重算
    this.calculateTotal()
    this.checkAllSelected()
  },

  toggleSelectAll() {
    const { cartItems, allSelected } = this.data
    const newItems = cartItems.map(item => ({
      ...item, selected: !allSelected
    }))

    this.setData({
      cartItems: newItems,
      allSelected: !allSelected
    })

    this.calculateTotal()
  },

  // 🔥 修复：自动判断是否全选
  checkAllSelected() {
    const { cartItems } = this.data
    if (cartItems.length === 0) {
      this.setData({ allSelected: false })
      return
    }

    const all = cartItems.every(item => item.selected)
    this.setData({ allSelected: all })
  },

  async increaseQuantity(e) {
    const { uid } = e.currentTarget.dataset
    const { cartItems } = this.data
    const index = cartItems.findIndex(i => i.uid === uid)
    if (index === -1) return

    const res = await db.collection('products').where({ id: cartItems[index].id }).get()
    const realStock = res.data[0]?.stock || 999

    if (cartItems[index].quantity >= realStock) {
      wx.showToast({ title: '库存不足', icon: 'none' })
      return
    }

    cartItems[index].quantity += 1
    this.setData({ cartItems })
    this.calculateTotal()
    this.saveCartItems()
  },

  decreaseQuantity(e) {
    const { uid } = e.currentTarget.dataset
    const { cartItems } = this.data
    const index = cartItems.findIndex(i => i.uid === uid)

    if (index > -1 && cartItems[index].quantity > 1) {
      cartItems[index].quantity -= 1
      this.setData({ cartItems })
      this.calculateTotal()
      this.saveCartItems()
    }
  },

  removeItem(e) {
    const { uid } = e.currentTarget.dataset
    let { cartItems } = this.data

    wx.showModal({
      title: '提示', content: '确定删除？',
      success: (res) => {
        if (res.confirm) {
          cartItems = cartItems.filter(i => i.uid !== uid)
          this.setData({ cartItems })
          this.calculateTotal()
          this.checkAllSelected()
          this.saveCartItems()
        }
      }
    })
  },

  // 🔥 修复：价格计算 100% 同步
  calculateTotal() {
    const { cartItems } = this.data
    let total = 0
    let count = 0
    let has = false

    cartItems.forEach(item => {
      if (item.selected) {
        total += item.price * item.quantity
        count += item.quantity
        has = true
      }
    })

    this.setData({
      totalPrice: total.toFixed(2),
      selectedCount: count,
      hasSelected: has
    })
  },

  saveCartItems() {
    wx.setStorageSync('cart', this.data.cartItems)
  },

  checkout() {
    const selected = this.data.cartItems.filter(i => i.selected)
    if (selected.length === 0) {
      wx.showToast({ title: '请选择商品', icon: 'none' })
      return
    }
    wx.setStorageSync('tempCheckoutCart', selected)
    wx.navigateTo({ url: '/pages/mall/checkout/checkout?from=cart' })
  }
})