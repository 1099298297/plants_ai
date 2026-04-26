const app = getApp()

Page({
  data: {
    product: null,
    isFavorite: false
  },

  onLoad: function(options) {
    const productId = options.id;
    this.loadProductDetail(productId);
    this.checkFavoriteStatus(productId);
    this.recordBrowseHistory(productId);
  },

  loadProductDetail: function(productId) {
    // 从全局数据获取商品列表
    const app = getApp();
    const allProducts = app.globalData.allProducts || [];
    
    // 查找对应商品
    let product = allProducts.find(p => String(p.id) === String(productId));
    
    // 如果找不到，降级为默认商品
    if (!product) {
      product = {
        id: productId,
        name: '未知商品',
        price: 0,
        description: '未找到该商品信息',
        images: [],
        details: []
      };
    } else {
      // 构造详情图片数组
      product = {
        ...product,
        images: [product.image],
        details: [
          { label: '商品编号', value: 'SP' + product.id },
          { label: '商品分类', value: product.category === 'plants' ? '植物' : '工具' },
          { label: '商品描述', value: product.description }
        ]
      };
    }
    
    this.setData({
      product
    });
  },

  checkFavoriteStatus: function(productId) {
    // 从本地存储获取收藏状态
    const favorites = wx.getStorageSync('favorites') || [];
    const isFavorite = favorites.some(id => String(id) === String(productId));
    this.setData({ isFavorite });
  },

  toggleFavorite: function() {
    const productId = String(this.data.product.id);
    let favorites = wx.getStorageSync('favorites') || [];
    
    if (this.data.isFavorite) {
      favorites = favorites.filter(id => String(id) !== productId);
    } else {
      favorites.push(productId);
    }
    
    wx.setStorageSync('favorites', favorites);
    this.setData({
      isFavorite: !this.data.isFavorite
    });

    wx.showToast({
      title: this.data.isFavorite ? '已收藏' : '已取消收藏',
      icon: 'success'
    });
  },

  addToCart: function() {
    const product = this.data.product;
    let cart = wx.getStorageSync('cart') || [];
    
    // 检查商品是否已在购物车中
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.images[0],
        quantity: 1
      });
    }
    
    wx.setStorageSync('cart', cart);
    wx.showToast({  
      title: '已加入购物车',
      icon: 'success'
    });
  },

  buyNow() {
    const product = this.data.product;
  
    // 包装成数组，统一格式！
    const checkoutData = [{
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0],
      quantity: 1,
      selected: true
    }];
  
    wx.setStorageSync('tempCheckoutCart', checkoutData);
  
    wx.navigateTo({
      url: '/pages/mall/checkout/checkout?from=product'
    });
  },

  // 记录浏览历史
  recordBrowseHistory: function(productId) {
    // 从全局数据获取商品列表
    const app = getApp();
    const allProducts = app.globalData.allProducts || [];
    
    // 查找对应商品
    const product = allProducts.find(p => String(p.id) === String(productId));
    if (!product) return;

    // 获取现有历史记录
    let historyList = wx.getStorageSync('browseHistory') || [];
    
    // 移除已存在的相同商品记录
    historyList = historyList.filter(item => String(item.id) !== String(productId));
    
    // 添加新记录到开头
    historyList.unshift({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      browseTime: new Date().toLocaleString()
    });
    
    // 限制历史记录数量为50条
    if (historyList.length > 50) {
      historyList = historyList.slice(0, 50);
    }
    
    // 保存到本地存储
    wx.setStorageSync('browseHistory', historyList);
  }
}); 