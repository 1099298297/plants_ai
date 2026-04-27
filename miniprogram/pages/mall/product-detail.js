const app = getApp()

Page({
  data: {
    product: null,
    isFavorite: false,
    showModal: false,
    selectedSpecs: {},
    specKeys: [],
    actionType: ""
  },

  onLoad(options) {
    const productId = options.id;
    this.loadProductDetail(productId);
    this.checkFavoriteStatus(productId);
    this.recordBrowseHistory(productId);
  },

  loadProductDetail(productId) {
    const allProducts = app.globalData.allProducts || [];
    let product = allProducts.find(p => String(p.id) === String(productId));

    if (!product) {
      product = { id: productId, name: '未知商品', price: 0, description: '', images: [], details: [], specs: {} };
    } else {
      product = {
        ...product,
        images: [product.image],
        details: [
          { label: '商品编号', value: 'SP' + product.id },
          { label: '商品分类', value: product.category === 'plants' ? '植物' : '工具' },
          { label: '商品描述', value: product.description }
        ],
        specs: product.specs || {}
      };
    }

    this.setData({
      product,
      specKeys: Object.keys(product.specs),
      selectedSpecs: {}
    });
  },

  noop(){},

  showSpecModal() {
    this.setData({ showModal: true, actionType: "cart", selectedSpecs: {} });
  },

  showBuyModal() {
    this.setData({ showModal: true, actionType: "buy", selectedSpecs: {} });
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
      this.addToCartWithSpec(specText);
    } else {
      this.buyNowWithSpec(specText);
    }

    this.setData({ showModal: false });
  },

  closeModal() {
    this.setData({ showModal: false });
  },

  addToCartWithSpec(spec) {
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
        quantity: 1,
        selected: true
      });
    }
    wx.setStorageSync('cart', cart);
    wx.showToast({ title: '加入成功' });
  },

  buyNowWithSpec(spec) {
    const p = this.data.product;
    const data = [{
      id: p.id,
      name: p.name,
      price: p.price,
      image: p.images[0],
      spec: spec,
      quantity: 1,
      selected: true
    }];
    wx.setStorageSync('tempCheckoutCart', data);
    wx.navigateTo({ url: '/pages/mall/checkout/checkout?from=product' });
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