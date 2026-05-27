// mall.js
//注意：当前类别是计算出来的，商品是一次性加载出来的。如果商品过多可以修改为懒加载！
Page({
  data: {
    allProducts: [],        // 全量商品
    groupedProducts: [],    // 当前展示的分组商品：[{category, name, products:[]}]
    categories: [],         // 左侧类别列表：[{category, name}]
    searchValue: '',
    activeCategory: '',     // 当前高亮的类别
    scrollToCategory: '',   // scroll-into-view 的目标 id
    searchHistory: [],
    showSuggestions: false,
    suggestions: [],
    isLoading: false,
    isSearching: false,
  },

  // 类别中文映射
  categoryNameMap: {
    plants: '植物',
    tools: '工具',
    // 可继续添加
  },

  onLoad: function (options) {
    this.loadAllProducts();
    this.loadSearchHistory();
  },

  onShow: function () {
    const app = getApp();
    const keyword = app.globalData.homeSearchKeyword;
  
    if (keyword && keyword.trim() !== '') {
      // 来自首页的搜索词：清空标记，进入搜索模式
      app.globalData.homeSearchKeyword = '';
      this.setData({
        searchValue: keyword,
        isSearching: true,
        showSuggestions: false,
      }, () => {
        this.filterAndGroup();
        this.saveSearchHistory(keyword); // 搜索历史也同步记录
      });
    } else {
      // 没有任何搜索词，但仍然保证数据为最新
      if (this.data.allProducts.length === 0) {
        // 首次加载（例如页面被回收后重新 onShow）重新拉取
        this.loadAllProducts();
      } else {
        // 保留当前搜索框内容，重新分组展示（比如从详情页返回后刷新数据）
        this.filterAndGroup();
      }
    }
  },

  // 一次性加载全部商品（最多500条）
  async loadAllProducts() {
    const db = wx.cloud.database();
    this.setData({ isLoading: true });
    try {
        const res = await db.collection('products').limit(500).get();
        let allProducts = res.data || [];
        // 兼容旧数据：将 image 字段统一转为数组
        allProducts = allProducts.map(product => {
            if (typeof product.image === 'string') {
                product.image = product.image ? [product.image] : [];
            }
            // 如果已经是数组，确保至少是空数组
            if (!Array.isArray(product.image)) {
                product.image = [];
            }
            return product;
        });
        this.setData({ allProducts });
        getApp().globalData.allProducts = allProducts;
        this.filterAndGroup();
    } catch (err) {
        console.error("加载商品失败", err);
    } finally {
        this.setData({ isLoading: false });
    }
  },

  // 根据搜索词和分类过滤商品并分组
  filterAndGroup() {
    const { allProducts, searchValue, isSearching } = this.data;
    let filtered = [...allProducts];

    // 搜索过滤
    if (isSearching && searchValue.trim()) {
      const keyword = searchValue.trim().toLowerCase();
      filtered = filtered.filter(p => p.name?.toLowerCase().includes(keyword));
    }

    // 按 category 分组
    const groupMap = new Map();
    filtered.forEach(product => {
      const cat = product.category || '其他';
      if (!groupMap.has(cat)) {
        groupMap.set(cat, []);
      }
      groupMap.get(cat).push(product);
    });

    // 转换为数组并添加中文名
    const groupedProducts = [];
    const categories = [];
    groupMap.forEach((products, category) => {
      const name = this.categoryNameMap[category] || category;
      groupedProducts.push({ category, name, products });
      categories.push({ category, name });
    });

    this.setData({
      groupedProducts,
      categories,
      activeCategory: categories.length > 0 ? categories[0].category : '',
      scrollToCategory: '', // 重置滚动位置（默认显示顶部）
    }, () => {
      // 重新计算各分类区块位置（用于滚动联动）
      this.calculateSectionPositions();
    });
  },

  // 计算右侧每个分类区块相对于 scroll-view 的顶部距离
  calculateSectionPositions() {
    // 延迟等待渲染完成
    setTimeout(() => {
      const query = wx.createSelectorQuery();
      query.select('#goods-scroll').boundingClientRect();
      query.selectAll('.category-section').boundingClientRect();
      query.exec((res) => {
        if (!res || !res[0] || !res[1]) return;
        const scrollRect = res[0];
        const sectionRects = res[1];
        this.sectionPositions = sectionRects.map((rect, index) => ({
          category: this.data.groupedProducts[index]?.category,
          top: rect.top - scrollRect.top // 初始 scrollTop=0 时的相对位置
        }));
        // 如果当前 activeCategory 不存在于位置列表，则默认第一个
        if (this.sectionPositions.length > 0 && 
            !this.sectionPositions.find(p => p.category === this.data.activeCategory)) {
          this.setData({ activeCategory: this.sectionPositions[0].category });
        }
      });
    }, 100);
  },

  // 右侧区域滚动事件
  onGoodsScroll(e) {
    const scrollTop = e.detail.scrollTop;
    const positions = this.sectionPositions;
    if (!positions || positions.length === 0) return;

    // 找到第一个 top > scrollTop 的区块，其前一个就是当前可见的
    let activeCat = positions[0].category;
    for (let i = 0; i < positions.length; i++) {
      if (positions[i].top > scrollTop + 20) { // 20rpx 容差
        activeCat = i > 0 ? positions[i - 1].category : positions[0].category;
        break;
      }
      // 如果已经滚动到最后一个
      if (i === positions.length - 1) {
        activeCat = positions[i].category;
      }
    }
    if (activeCat !== this.data.activeCategory) {
      this.setData({ activeCategory: activeCat });
    }
  },

  // 点击左侧类别
  onCategoryTap(e) {
    const category = e.currentTarget.dataset.category;
    const index = e.currentTarget.dataset.index;   // 获取索引
    this.setData({
      activeCategory: category,
      scrollToCategory: 'cat-' + index   // 使用纯数字 id
    });
  },

  // ========== 搜索相关（与之前逻辑一致） ==========
  onSearchInput(e) {
    const val = e.detail.value.trim();
    this.setData({ searchValue: val });
    if (val) {
      this.setData({ showSuggestions: true });
      this.generateSuggestions(val);
    } else {
      this.setData({ showSuggestions: false, suggestions: [] });
      // 清空搜索，显示全部
      this.setData({ isSearching: false }, () => this.filterAndGroup());
    }
  },

  onSearchFocus() {
    if (!this.data.searchValue.trim()) {
      this.setData({ showSuggestions: true, suggestions: [] });
    }
  },

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
    this.setData({ suggestions: [...new Set(suggestions)].slice(0, 5) });
  },

  onSearchConfirm() {
    const kw = this.data.searchValue.trim();
    if (!kw) return;
    this.setData({
      isSearching: true,
      showSuggestions: false,
    }, () => {
      this.filterAndGroup();
      this.saveSearchHistory(kw);
    });
  },

  selectSuggestion(e) {
    const kw = e.currentTarget.dataset.suggestion;
    this.setData({
      searchValue: kw,
      isSearching: true,
      showSuggestions: false,
    }, () => {
      this.filterAndGroup();
      this.saveSearchHistory(kw);
    });
  },

  clearSearch() {
    this.setData({
      searchValue: '',
      isSearching: false,
      showSuggestions: false,
      suggestions: [],
    }, () => this.filterAndGroup());
  },

  // 搜索历史
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

  // 商品详情 / 抖音跳转（保持不变）
  navigateToDetail(e) {
    const productId = e.currentTarget.dataset.id;
    const douyinLink = e.currentTarget.dataset.douyinlink;
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