const app = getApp()

Page({
  data: {
    product: null,
    isFavorite: false,
    showModal: false,
    selectedSpecs: {},
    specKeys: [],
    actionType: "",
    qty: 1,          // 新增
    maxStock: 999    // 新增
  },

  // 每次显示页面都刷新（包括返回）
  onShow() {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    const productId = currentPage.options.id;

    if (productId) {
      this.loadProductDetail(productId);
      this.checkFavoriteStatus(productId);
    }
  },

  // 只在第一次进入执行
  onLoad(options) {
    this.recordBrowseHistory(options.id);
  },

  // 从后端云接口获取商品详情（实时库存）
  loadProductDetail(productId) {
    console.log(productId)
    wx.cloud.callFunction({
      name: 'getProductDetail',
      data: { id: productId }
    }).then(res => {
      if (!res.result.success) {
        wx.showToast({ title: res.result.msg, icon: 'none' })
        return
      }

      const product = res.result.data

      // 格式化页面数据
      const formatProduct = {
        ...product,
        images: product.image ? [product.image] : [],
        stock: product.stock || 0,
        details: [
          { label: '商品编号', value: 'SP' + product.id },
          { label: '商品分类', value: product.category === 'plants' ? '植物' : '工具' },
          { label: '商品描述', value: product.description || '' }
        ],
        specs: product.specs || {}
      }

      this.setData({
        product: formatProduct,
        specKeys: Object.keys(formatProduct.specs),
        selectedSpecs: {}
      })
    }).catch(err => {
      console.error('请求失败', err)
    })
  },

  noop(){},

  showSpecModal() {
    const product = this.data.product;
    this.setData({ showModal: true, actionType: "cart", selectedSpecs: {} ,qty: 1, maxStock: product.stock || 999});
  },

  showBuyModal() {
    const product = this.data.product;
    this.setData({ showModal: true, actionType: "buy", selectedSpecs: {} ,qty: 1, maxStock: product.stock || 999});
  },

  // ========== 真正互斥选择 ==========
  selectSpecItem(e) {
    const key = e.currentTarget.dataset.key;
    const val = e.currentTarget.dataset.val;
    let selected = this.data.selectedSpecs;

    if (selected[key] === val) {
      selected[key] = null;
    } else {
      selected[key] = val;
    }

    this.setData({ selectedSpecs: selected });
  },

  confirmSpec() {
    const { selectedSpecs, specKeys } = this.data;

    for (let k of specKeys) {
      if (!selectedSpecs[k]) {
        wx.showToast({ title: '请选择全部规格', icon: 'none' });
        return;
      }
    }

    let specText = '';
    specKeys.forEach(k => {
      specText += k + '：' + selectedSpecs[k] + ' ';
    });
    if (this.data.actionType === 'cart') {
      this.addToCartWithSpec(specText, this.data.qty);
    } else {
      this.buyNowWithSpec(specText, this.data.qty);
    }

    this.setData({ showModal: false });
  },

  closeModal() {
    this.setData({ showModal: false });
  },

  addToCartWithSpec(spec,qty = 1) {
    const p = this.data.product;
    let cart = wx.getStorageSync('cart') || [];
    const idx = cart.findIndex(i => i.id === p.id && i.spec === spec);
    if (idx > -1) {
      cart[idx].quantity++;
    } else {
      cart.push({
        id: p.id,
        name: p.name,
        price: p.price,
        image: p.images[0],
        spec: spec,
        quantity: qty,
        selected: true
      });
    }
    wx.setStorageSync('cart', cart);
    wx.showToast({ title: '加入成功' });
  },

  buyNowWithSpec(spec,qty = 1) {
    const p = this.data.product;
    const data = [{
      id: p.id,
      name: p.name,
      price: p.price,
      image: p.images[0],
      spec: spec,
      quantity: qty,
      selected: true
    }];
    wx.setStorageSync('tempCheckoutCart', data);
    wx.navigateTo({ url: '/pages/mall/checkout/checkout?from=product' });
  },

  // 数量 +
  addQty() {
    let { qty, maxStock } = this.data;
    if (qty >= maxStock) return;
    this.setData({ qty: qty + 1 });
  },

  // 数量 -
  cutQty() {
    let { qty } = this.data;
    if (qty <= 1) return;
    this.setData({ qty: qty - 1 });
  },

  // 原有逻辑
  checkFavoriteStatus(productId) {
    const favorites = wx.getStorageSync('favorites') || [];
    const isFavorite = favorites.some(id => String(id) === String(productId));
    this.setData({ isFavorite });
  },

  toggleFavorite() {
    const productId = String(this.data.product.id);
    let favorites = wx.getStorageSync('favorites') || [];
    if (this.data.isFavorite) {
      favorites = favorites.filter(id => String(id) !== productId);
    } else {
      favorites.push(productId);
    }
    wx.setStorageSync('favorites', favorites);
    this.setData({ isFavorite: !this.data.isFavorite });
    wx.showToast({ title: this.data.isFavorite ? '已收藏' : '已取消收藏', icon: 'success' });
  },

  addToCart() { this.showSpecModal(); },
  buyNow() { this.showBuyModal(); },

  recordBrowseHistory(productId) {
    const allProducts = app.globalData.allProducts || [];
    const product = allProducts.find(p => String(p.id) === String(productId));
    if (!product) return;
    let historyList = wx.getStorageSync('browseHistory') || [];
    historyList = historyList.filter(item => String(item.id) !== String(productId));
    historyList.unshift({
      id: product.id, name: product.name, price: product.price, image: product.image, browseTime: new Date().toLocaleString()
    });
    if (historyList.length > 50) historyList = historyList.slice(0, 50);
    wx.setStorageSync('browseHistory', historyList);
  }
});