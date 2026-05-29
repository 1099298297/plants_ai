// pages/plantArchive/plantArchive.js
const app = getApp()

Page({
  data: {
    plants: [],
    isLoggedIn: false
  },

  onLoad() {
    this.checkLoginAndLoadData()
  },

  onShow() {
    this.checkLoginAndLoadData()
  },

  checkLoginAndLoadData() {
    const openid = wx.getStorageSync('user_openid') || wx.getStorageSync('openid') || wx.getStorageSync('userOpenId')
    const userInfo = wx.getStorageSync('userInfo')
    if (openid || userInfo) {
      this.setData({ isLoggedIn: true })
      if (openid) this.loadPlants(openid)
    } else {
      this.setData({ isLoggedIn: false, plants: [] })
    }
  },

  async loadPlants(openid) {
    try {
      const db = wx.cloud.database()
      const res = await db.collection('user_plants')
        .where({ _openid: openid })
        .orderBy('createTime', 'desc')
        .get()
      this.setData({ plants: res.data })
    } catch (err) {
      console.error('加载失败', err)
    }
  },

  // 添加植物
  onAddPlant() {
    if (!this.data.isLoggedIn) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    wx.navigateTo({ url: '/pages/plantArchive/addPlant' })
  },

  // 编辑植物（新增）
  onEditPlant(e) {
    const plant = e.currentTarget.dataset.plant
    wx.navigateTo({
      url: `/pages/plantArchive/addPlant?edit=true&id=${plant._id}`
    })
  },

  // 查看详情（如果有点击卡片查看详情的需求）
  onPlantTap(e) {
    const plant = e.currentTarget.dataset.plant
    wx.navigateTo({
      url: `/pages/plantArchive/plantDetail?id=${plant._id}`
    })
  },

  // 删除植物（优化版）
  async onDeletePlant(e) {
    const plantId = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '删除后该植物的所有养护提醒也会被清除，不可恢复。',
      confirmColor: '#f44336',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...', mask: true })
          try {
            const db = wx.cloud.database()
            // 删除植物档案
            await db.collection('user_plants').doc(plantId).remove()
            // 删除相关提醒
            await db.collection('plant_reminders').where({ plantId }).remove()
            // 清除本地定时器（如果有 reminder 工具）
            // 假设你有 reminderManager
            // const reminderManager = require('../../utils/reminder.js')
            // reminderManager.clearRemindersByPlantId(plantId)
            
            wx.hideLoading()
            wx.showToast({ title: '删除成功', icon: 'success' })
            // 刷新列表
            const openid = wx.getStorageSync('user_openid')
            this.loadPlants(openid)
          } catch (err) {
            wx.hideLoading()
            console.error('删除失败', err)
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })
  },

  goToLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  }
})