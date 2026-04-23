// pages/mall/address.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    addresses: [],
    isSelectMode: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 检查是否是选择地址模式
    const isSelectMode = options.select === 'true';
    this.setData({ isSelectMode });
    this.loadAddresses();
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
    this.loadAddresses();
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

  // 加载地址列表
  loadAddresses() {
    const addresses = wx.getStorageSync('addresses') || [];
    this.setData({ addresses });
  },

  // 新增地址
  addAddress() {
    wx.navigateTo({
      url: '/pages/mall/address-edit'
    });
  },

  // 编辑地址
  editAddress(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/mall/address-edit?id=${id}`
    });
  },

  // 删除地址
  deleteAddress(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '删除地址',
      content: '确定要删除这个地址吗？',
      success: (res) => {
        if (res.confirm) {
          const { addresses } = this.data;
          const newAddresses = addresses.filter(addr => addr.id !== id);
          
          // 如果删除的是默认地址，且还有其他地址，则将第一个地址设为默认
          const deletedAddress = addresses.find(addr => addr.id === id);
          if (deletedAddress.isDefault && newAddresses.length > 0) {
            newAddresses[0].isDefault = true;
          }
          
          this.setData({ addresses: newAddresses });
          wx.setStorageSync('addresses', newAddresses);
          
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        }
      }
    });
  },

  // 选择地址
  selectAddress(e) {
    if (!this.data.isSelectMode) return;
    
    const { id } = e.currentTarget.dataset;
    const address = this.data.addresses.find(addr => addr.id === id);
    
    if (address) {
      // 将选中的地址返回给上一页
      const pages = getCurrentPages();
      const prevPage = pages[pages.length - 2];
      
      if (prevPage) {
        prevPage.setData({
          selectedAddress: address
        });
        wx.navigateBack();
      }
    }
  }
})