Page({
  data: {
    allProducts: [], // 全量商品（用于搜索建议）
    products: [],    // 分页显示的商品
    searchValue: '',
    currentCategory: 'all',
    selectedPlantType: null,
    isSearching: false,
    searchResults: [],
    searchHistory: [],
    showSuggestions: false,
    suggestions: [],
    isLoading: false,

    // 分页
    page: 1,
    pageSize: 10,
    hasMore: true,
    isLoadMore: false,
  },

  onLoad: function () {
    this.loadAllProductsForSuggest(); // 预加载全量商品（只用于建议）
    this.loadSearchHistory();
    this.getProducts(); // 分页加载
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.refreshAllData();
  },

  // 上拉加载更多（瀑布流）
  onReachBottom() {
    if (this.data.hasMore && !this.data.isLoadMore && !this.data.showSuggestions) {
      this.loadMoreProducts();
    }
  },

  // ============================
  // 预加载全量商品（仅用于生成搜索建议，只加载一次）
  // ============================
  async loadAllProductsForSuggest() {
    const db = wx.cloud.database();
    try {
      // 为了不警告：安全获取全量（用于建议）
      const res = await db.collection('products')
        .limit(100) // 最多100条够建议用
        .get();
      this.setData({
        allProducts: res.data
      });
      getApp().globalData.allProducts = res.data;
    } catch (err) {
      console.error("预加载商品失败", err);
    }
  },

  // ============================
  // 分页查询商品（显示用）
  // ============================
  async getProducts(loadMore = false) {
    const db = wx.cloud.database();
    const { currentCategory, searchValue, page, pageSize, isSearching } = this.data;

    if (!loadMore) {
      this.setData({ isLoading: true, products: loadMore ? this.data.products : [] });
    } else {
      this.setData({ isLoadMore: true });
    }

    try {
      let whereCond = {};

      // 分类
      if (currentCategory !== 'all') {
        whereCond.category = currentCategory;
      }

      // 搜索
      if (searchValue && isSearching) {
        const reg = db.RegExp({ regexp: searchValue, options: 'i' });
        whereCond.name = reg;
      }

      // 安全查询：where + skip + limit → 绝对不警告
      const res = await db.collection('products')
        .where(whereCond)
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .get();

      const newData = res.data || [];
      this.setData({
        products: loadMore ? [...this.data.products, ...newData] : newData,
        hasMore: newData.length === pageSize,
      });

    } catch (err) {
      console.error(err);
    } finally {
      this.setData({ isLoading: false, isLoadMore: false });
      wx.stopPullDownRefresh();
    }
  },

  loadMoreProducts() {
    if (!this.data.hasMore) return;
    this.setData({
      page: this.data.page + 1
    });
    this.getProducts(true);
  },

  refreshAllData() {
    this.setData({
      page: 1,
      products: [],
      hasMore: true,
      isSearching: false,
      searchValue: '',
      showSuggestions: false,
      suggestions: []
    });
    this.getProducts();
  },

  // ============================
  // 输入 → 只生成建议，不搜索
  // ============================
  onSearchInput(e) {
    const val = e.detail.value.trim();
    this.setData({ searchValue: val });

    if (val) {
      this.setData({ showSuggestions: true });
      this.generateSuggestions(val);
    } else {
      this.setData({
        showSuggestions: false,
        suggestions: []
      });
      this.refreshAllData();
    }
  },

  // 生成建议（从预加载的allProducts）
  generateSuggestions(keyword) {
    const allProducts = this.data.allProducts;
    if (!allProducts || allProducts.length === 0) return;

    const suggestions = [];
    const key = keyword.toLowerCase();

    allProducts.forEach(p => {
      if (p.name?.toLowerCase().includes(key)) {
        suggestions.push(p.name);
      }
      (p.tags || []).forEach(tag => {
        if (tag.toLowerCase().includes(key) && !suggestions.includes(tag)) {
          suggestions.push(tag);
        }
      });
    });

    this.setData({
      suggestions: [...new Set(suggestions)].slice(0, 5)
    });
  },

  // ============================
  // 点击键盘搜索
  // ============================
  onSearchConfirm() {
    const kw = this.data.searchValue.trim();
    if (!kw) return;

    this.setData({
      isSearching: true,
      showSuggestions: false,
      page: 1,
      products: [],
      hasMore: true
    });
    this.getProducts();
    this.saveSearchHistory(kw);
  },

  // 点击建议搜索
  selectSuggestion(e) {
    const kw = e.currentTarget.dataset.suggestion;
    this.setData({
      searchValue: kw,
      isSearching: true,
      showSuggestions: false,
      page: 1,
      products: [],
      hasMore: true
    });
    this.getProducts();
    this.saveSearchHistory(kw);
  },

  // ============================
  // 分类
  // ============================
  switchCategory(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({
      currentCategory: category,
      searchValue: '',
      isSearching: false,
      showSuggestions: false,
      page: 1,
      products: [],
      hasMore: true
    });
    this.getProducts();
  },

  clearSearch() {
    this.refreshAllData();
  },

  // ============================
  // 搜索历史
  // ============================
  loadSearchHistory() {
    this.setData({ searchHistory: wx.getStorageSync('searchHistory') || [] });
  },

  saveSearchHistory(kw) {
    let history = wx.getStorageSync('searchHistory') || [];
    history = history.filter(i => i !== kw);
    history.unshift(kw);
    wx.setStorageSync('searchHistory', history.slice(0, 10));
    this.setData({ searchHistory: history });
  },

  clearSearchHistory() {
    wx.removeStorageSync('searchHistory');
    this.setData({ searchHistory: [] });
  },

  // ============================
  // 商品详情
  // ============================
  navigateToDetail(e) {
    const productId = e.currentTarget.dataset.id;
    const douyinLink = e.currentTarget.dataset.douyinlink;
    console.log(productId);
    // 严格判断：不为 null、不为空、不为 undefined
    if (douyinLink && douyinLink.trim() !== '' && douyinLink !== null) {
      wx.showModal({
        title: '外部跳转',
        content: '即将跳转到抖音小程序购买',
        confirmText: '前往',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.navigateToMiniProgram({
              appId: 'wx91d27dbf599dff74',
              path: douyinLink,
              fail: () => {
                wx.showToast({ title: '跳转失败', icon: 'none' });
              }
            });
          }
        }
      });
    } else {
      console.log("detail")
      // 空值 → 进入详情页
      wx.navigateTo({
        url: `/pages/mall/product-detail?id=${productId}`
      });
    }
  },

  onShareAppMessage() {
    return {
      title: '精选植物和园艺工具',
      path: '/pages/mall/mall'
    };
  },
  onShareTimeline() {
    return {
      title: '精选植物和园艺工具'
    };
  }
});