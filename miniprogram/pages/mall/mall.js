Page({
  data: {
    allProducts: [], // 全部商品
    products: [],    // 当前分类商品
    searchValue: '',
    currentCategory: 'all',
    selectedPlantType: null,
    isSearching: false,
    searchResults: [],
    searchHistory: [], // 搜索历史
    showSuggestions: false, // 是否显示搜索建议
    suggestions: [], // 搜索建议列表
    isLoading: false // 加载状态
  },

  onLoad: function() {
    // 初始化商品数据
    const allProducts = [
      {
        id: 1,
        name: '多肉植物套装',
        price: 99,
        image: '/images/products/succulent-set/main.png',
        category: 'plants',
        description: '包含多种精选多肉植物，适合室内种植',
        tags: ['多肉', '室内', '套装'],
        douyinLink: 'https://haohuo.jinritemai.com/views/product/item2?id=123456'
      },
      {
        id: 2,
        name: '园艺工具套装',
        price: 159,
        image: '/images/products/gardening-tools/main.png',
        category: 'tools',
        description: '专业园艺工具套装，包含铲子、剪刀、浇水壶等',
        tags: ['工具', '套装', '园艺'],
        douyinLink: 'https://haohuo.jinritemai.com/views/product/item2?id=234567'
      },
      {
        id: 3,
        name: '绿萝盆栽',
        price: 49,
        image: '/images/products/pothos/main.png',
        category: 'plants',
        description: '室内净化空气的绿萝盆栽，易于养护',
        tags: ['绿萝', '室内', '净化空气'],
        douyinLink: 'https://haohuo.jinritemai.com/views/product/item2?id=345678'
      },
      {
        id: 4,
        name: '自动浇水器',
        price: 89,
        image: '/images/products/auto-watering/main.png',
        category: 'tools',
        description: '智能自动浇水器，可定时定量浇水',
        tags: ['工具', '智能', '浇水'],
        douyinLink: 'https://haohuo.jinritemai.com/views/product/item2?id=456789'
      },
      {
        id: 5,
        name: '发财树盆栽',
        price: 69,
        image: '/images/products/money-tree/main.png',
        category: 'plants',
        description: '寓意吉祥的发财树，适合办公室和家居摆放',
        tags: ['发财树', '室内', '风水'],
        douyinLink: 'https://haohuo.jinritemai.com/views/product/item2?id=567890'
      },
      {
        id: 6,
        name: '植物营养液',
        price: 39,
        image: '/images/products/plant-food/main.png',
        category: 'tools',
        description: '专业植物营养液，促进植物生长，增强抗病能力',
        tags: ['营养液', '养护', '肥料'],
        douyinLink: 'https://haohuo.jinritemai.com/views/product/item2?id=678901'
      },
      {
        id: 7,
        name: '蝴蝶兰盆栽',
        price: 129,
        image: '/images/products/orchid/main.png',
        category: 'plants',
        description: '优雅的蝴蝶兰，花期长，适合室内观赏',
        tags: ['蝴蝶兰', '花卉', '观赏'],
        douyinLink: 'https://haohuo.jinritemai.com/views/product/item2?id=789012'
      },
      {
        id: 8,
        name: '园艺手套',
        price: 29,
        image: '/images/products/gardening-gloves/main.png',
        category: 'tools',
        description: '专业园艺手套，防刺防滑，保护双手',
        tags: ['手套', '防护', '工具'],
        douyinLink: 'https://haohuo.jinritemai.com/views/product/item2?id=890123'
      },
      {
        id: 9,
        name: '空气凤梨',
        price: 59,
        image: '/images/products/air-plant/main.png',
        category: 'plants',
        description: '无需土壤的空中植物，独特美观，易于养护',
        tags: ['空气凤梨', '室内', '创意'],
        douyinLink: 'https://haohuo.jinritemai.com/views/product/item2?id=901234'
      },
      {
        id: 10,
        name: '植物补光灯',
        price: 199,
        image: '/images/products/grow-light/main.png',
        category: 'tools',
        description: '专业植物补光灯，促进光合作用，适合室内种植',
        tags: ['补光灯', '室内', '智能'],
        douyinLink: 'https://haohuo.jinritemai.com/views/product/item2?id=012345'
      },
      {
        id: 11,
        name: '文竹盆栽',
        price: 45,
        image: '/images/products/asparagus-fern/main.png',
        category: 'plants',
        description: '优雅的文竹，适合书房和办公室摆放',
        tags: ['文竹', '室内', '观赏']
      },
      {
        id: 12,
        name: '园艺剪刀',
        price: 49,
        image: '/images/products/pruning-shears/main.png',
        category: 'tools',
        description: '专业园艺剪刀，锋利耐用，适合修剪植物',
        tags: ['剪刀', '修剪', '工具']
      },
      {
        id: 13,
        name: '龟背竹盆栽',
        price: 79,
        image: '/images/products/monstera/main.png',
        category: 'plants',
        description: '大型观叶植物，叶片独特，适合客厅摆放',
        tags: ['龟背竹', '室内', '观叶']
      },
      {
        id: 14,
        name: '植物喷雾器',
        price: 35,
        image: '/images/products/plant-mister/main.png',
        category: 'tools',
        description: '专业植物喷雾器，调节湿度，清洁叶片',
        tags: ['喷雾器', '养护', '工具']
      },
      {
        id: 15,
        name: '君子兰盆栽',
        price: 89,
        image: '/images/products/clivia/main.png',
        category: 'plants',
        description: '优雅的君子兰，花期长，适合室内观赏',
        tags: ['君子兰', '花卉', '观赏']
      },
      {
        id: 16,
        name: '园艺铲子',
        price: 39,
        image: '/images/products/gardening-shovel/main.png',
        category: 'tools',
        description: '专业园艺铲子，坚固耐用，适合松土和移栽',
        tags: ['铲子', '工具', '园艺']
      }
    ];
    
    // 保存到全局数据
    const app = getApp();
    app.globalData.allProducts = allProducts;
    
    this.setData({
      allProducts,
      products: allProducts,
      currentCategory: 'all'
    });

    // 加载搜索历史
    this.loadSearchHistory();
  },

  // 加载搜索历史
  loadSearchHistory: function() {
    const history = wx.getStorageSync('searchHistory') || [];
    this.setData({
      searchHistory: history
    });
  },

  // 保存搜索历史
  saveSearchHistory: function(keyword) {
    let history = wx.getStorageSync('searchHistory') || [];
    // 移除重复项
    history = history.filter(item => item !== keyword);
    // 添加到开头
    history.unshift(keyword);
    // 最多保存10条记录
    history = history.slice(0, 10);
    wx.setStorageSync('searchHistory', history);
    this.setData({
      searchHistory: history
    });
  },

  // 清除搜索历史
  clearSearchHistory: function() {
    wx.removeStorageSync('searchHistory');
    this.setData({
      searchHistory: []
    });
  },

  onShow: function() {
    const app = getApp();
    if (app.globalData && app.globalData.selectedPlantType) {
      this.setData({
        selectedPlantType: app.globalData.selectedPlantType,
        currentCategory: 'plants'
      });
      app.globalData.selectedPlantType = null;
      // 过滤相关商品
      let products = this.data.allProducts.filter(product =>
        product.category === 'plants' && 
        product.name.toLowerCase().includes(this.data.selectedPlantType.toLowerCase())
      );
    this.setData({
        products
    });
    }
  },

  switchCategory: function(e) {
    const category = e.currentTarget.dataset.category;
    let products = this.data.allProducts;
    if (category !== 'all') {
      products = products.filter(p => p.category === category);
    }
    this.setData({
      currentCategory: category,
      selectedPlantType: null,
      isSearching: false,
      searchValue: '',
      products
    });
  },

  onSearchInput: function(e) {
    const searchValue = e.detail.value.trim();
    this.setData({
      searchValue: searchValue,
      isSearching: searchValue.length > 0,
      showSuggestions: searchValue.length > 0
    });

    if (searchValue) {
      // 生成搜索建议
      this.generateSuggestions(searchValue);
      // 执行搜索
      this.searchProducts(searchValue);
    } else {
      this.setData({
        isSearching: false,
        searchResults: [],
        showSuggestions: false,
        suggestions: []
      });
    }
  },

  // 生成搜索建议
  generateSuggestions: function(keyword) {
    const suggestions = [];
    const keywordLower = keyword.toLowerCase();

    // 从商品名称中生成建议
    this.data.allProducts.forEach(product => {
      if (product.name.toLowerCase().includes(keywordLower)) {
        suggestions.push(product.name);
      }
    });

    // 从标签中生成建议
    this.data.allProducts.forEach(product => {
      product.tags.forEach(tag => {
        if (tag.toLowerCase().includes(keywordLower) && !suggestions.includes(tag)) {
          suggestions.push(tag);
        }
      });
    });

    // 去重并限制数量
    this.setData({
      suggestions: [...new Set(suggestions)].slice(0, 5)
    });
  },

  // 选择搜索建议
  selectSuggestion: function(e) {
    const suggestion = e.currentTarget.dataset.suggestion;
    this.setData({
      searchValue: suggestion,
      showSuggestions: false
    });
    this.searchProducts(suggestion);
    this.saveSearchHistory(suggestion);
  },

  searchProducts: function(keyword) {
    if (!keyword) {
      this.setData({
        searchResults: []
      });
      return;
    }

    this.setData({ isLoading: true });

    const searchKeyword = keyword.toLowerCase().trim();
    let results = this.data.allProducts.map(product => {
      // 构建搜索文本，包含更多相关信息
      const searchText = [
        product.name,
        product.description,
        product.category,
        ...product.tags
      ].join(' ').toLowerCase();

      // 计算匹配分数
      let score = 0;
      
      // 完全匹配得分最高
      if (product.name.toLowerCase() === searchKeyword) {
        score += 100;
      }
      
      // 名称包含关键词得分次之
      if (product.name.toLowerCase().includes(searchKeyword)) {
        score += 80;
      }
      
      // 标签匹配得分
      const tagMatches = product.tags.filter(tag => 
        tag.toLowerCase().includes(searchKeyword)
      ).length;
      score += tagMatches * 30;
      
      // 描述中包含关键词得分
      if (product.description.toLowerCase().includes(searchKeyword)) {
        score += 20;
      }
      
      // 分类匹配得分
      if (product.category.toLowerCase().includes(searchKeyword)) {
        score += 15;
      }

      return {
        ...product,
        score,
        matchType: this.getMatchType(product, searchKeyword)
      };
    })
    .filter(product => product.score > 0) // 只保留有匹配分数的结果
    .sort((a, b) => b.score - a.score); // 按分数降序排序

    this.setData({
      searchResults: results,
      isLoading: false
    });

    // 保存搜索历史
    this.saveSearchHistory(keyword);
  },

  // 获取匹配类型
  getMatchType: function(product, keyword) {
    if (product.name.toLowerCase() === keyword) {
      return 'exact';
    } else if (product.name.toLowerCase().includes(keyword)) {
      return 'name';
    } else if (product.tags.some(tag => tag.toLowerCase().includes(keyword))) {
      return 'tag';
    } else if (product.description.toLowerCase().includes(keyword)) {
      return 'description';
    }
    return 'category';
  },

  clearSearch: function() {
    this.setData({
      searchValue: '',
      isSearching: false,
      searchResults: [],
      showSuggestions: false,
      suggestions: []
    });
  },

  // 商品点击事件
  navigateToDetail: function(e) {
    const productId = e.currentTarget.dataset.id;
    const product = this.data.allProducts.find(p => String(p.id) === String(productId));
    
    if (product && product.douyinLink) {
      // 如果有抖音链接，直接跳转到抖音商城
      wx.navigateToMiniProgram({
        appId: 'wx91d27dbf599dff74', // 抖音小程序的 appId
        path: product.douyinLink,
        success(res) {
          console.log('跳转成功');
        },
        fail(err) {
          console.error('跳转失败', err);
          wx.showToast({
            title: '跳转失败，请稍后重试',
            icon: 'none'
          });
        }
      });
    } else {
      // 如果没有抖音链接，跳转到商品详情页
      wx.navigateTo({
        url: `/pages/mall/product-detail?id=${productId}`
      });
    }
  }, // <--- 注意这里我帮你加上了逗号

  // ================= 添加的分享功能代码 =================

  /**
   * 用户点击右上角分享给朋友
   */
  onShareAppMessage: function () {
    return {
      title: '精选植物和园艺工具，快来选购吧！', // 分享卡片的标题
      path: '/pages/mall/mall' // 朋友点击卡片后进入的页面路径
    }
  },

  /**
   * 用户点击右上角分享到朋友圈
   */
  onShareTimeline: function () {
    return {
      title: '精选植物和园艺工具，快来选购吧！' // 朋友圈的标题
    }
  }

})