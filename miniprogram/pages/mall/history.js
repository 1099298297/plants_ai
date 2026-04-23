// pages/mall/history.js
const app = getApp()

Page({

  /**
   * 页面的初始数据
   */
  data: {
    historyList: [],
    isEmpty: true
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadHistory()
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
    this.loadHistory()
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

  // 加载浏览历史
  loadHistory() {
    const historyList = wx.getStorageSync('browseHistory') || []
    this.setData({
      historyList,
      isEmpty: historyList.length === 0
    })
  },

  // 清除所有历史记录
  clearHistory() {
    wx.showModal({
      title: '提示',
      content: '确定要清空浏览历史吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('browseHistory')
          this.setData({
            historyList: [],
            isEmpty: true
          })
          wx.showToast({
            title: '已清空',
            icon: 'success'
          })
        }
      }
    })
  },

  // 删除单条历史记录
  removeHistoryItem(e) {
    const { index } = e.currentTarget.dataset
    const historyList = this.data.historyList
    historyList.splice(index, 1)
    
    this.setData({
      historyList,
      isEmpty: historyList.length === 0
    })
    
    wx.setStorageSync('browseHistory', historyList)
    wx.showToast({
      title: '已删除',
      icon: 'success'
    })
  },

  // 跳转到商品详情
  goToDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/mall/detail?id=${id}`
    })
  },

  // 去购物
  goShopping() {
    wx.switchTab({
      url: '/pages/mall/mall'
    })
  }
})