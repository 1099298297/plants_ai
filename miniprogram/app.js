// app.js
const reminderManager = require('./utils/reminder.js')

App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-8gsievbe0e390ea8', // 你的云开发环境ID
        traceUser: true,
      })
    }
    


    // 全局初始化提醒管理器
    reminderManager.init()
    this.reminderManager = reminderManager // 如需全局访问

    // 自动写入 users 集合
    wx.cloud.callFunction({
      name: 'login',
      success: res => {
        const openid = res.result.openid
        const db = wx.cloud.database()
        db.collection('users').where({
          _openid: openid
        }).get({
          success: userRes => {
            if (userRes.data.length === 0) {
              db.collection('users').add({
                data: {
                  createTime: new Date()
                }
              })
            }
          }
        })
      }
    })
  },
  
  onShow: function() {
    // 应用显示时重新检查提醒
    if (reminderManager && reminderManager.checkAllReminders) {
      reminderManager.checkAllReminders()
    }
  },
  
  globalData: {
    // 全局数据
    checkoutItem: null,
  }
});