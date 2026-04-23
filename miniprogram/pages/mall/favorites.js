// pages/mall/favorites.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    favoriteProducts: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadFavorites();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.loadFavorites();
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  // 加载收藏商品
  loadFavorites() {
    const favorites = wx.getStorageSync('favorites') || [];
    // 从全局数据获取商品列表
      const app = getApp();
    const allProducts = app.globalData.allProducts || [];
    
    // 过滤出收藏的商品
    const favoriteProducts = allProducts.filter(product => 
      favorites.includes(String(product.id))
    );
    
    this.setData({ favoriteProducts });
  },

  // 取消收藏
  removeFavorite(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '提示',
      content: '确定要取消收藏这个商品吗？',
      success: (res) => {
        if (res.confirm) {
    let favorites = wx.getStorageSync('favorites') || [];
    favorites = favorites.filter(fid => String(fid) !== String(id));
    wx.setStorageSync('favorites', favorites);
    
    // 更新页面数据
    const favoriteProducts = this.data.favoriteProducts.filter(
      product => String(product.id) !== String(id)
    );
    this.setData({ favoriteProducts });

    wx.showToast({
      title: '已取消收藏',
      icon: 'success'
          });
        }
      }
    });
  },

  // 跳转到商品详情
  navigateToDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/mall/product-detail?id=${id}`
    });
  }
})