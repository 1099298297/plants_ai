/**
 * 提醒功能工具类
 * 
 * 此文件包含提醒功能的核心业务逻辑，包括：
 * - 提醒管理器类 (ReminderManager)
 * - 本地提醒设置和管理
 * - 订阅消息处理
 * - 数据库操作
 * - 通知显示
 * 
 * 注意：此文件包含业务逻辑实现
 * 配置参数请查看 config/reminder.js
 */

// 提醒工具类
const reminderConfig = require('../config/reminder.js')

class ReminderManager {
  constructor() {
    this.timers = {}
    this.subscribeMessageTemplates = reminderConfig.subscribeMessageTemplates
    this.subscriptionStatus = null
    this.checkInterval = null
    this.isInitialized = false
  }

  // 初始化提醒管理器
  init() {
    if (this.isInitialized) return
    
    console.log('初始化提醒管理器')
    this.isInitialized = true
    
    // 启动定期检查机制
    this.startPeriodicCheck()
    
    // 监听页面显示事件
    this.setupPageLifecycle()
  }

  // 设置页面生命周期监听
  setupPageLifecycle() {
    // 监听页面显示
    wx.onAppShow(() => {
      console.log('应用显示，重新检查提醒')
      this.checkAllReminders()
    })
    
    // 监听页面隐藏
    wx.onAppHide(() => {
      console.log('应用隐藏，暂停本地检查')
      this.stopPeriodicCheck()
    })
  }

  // 启动定期检查
  startPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }
    
    // 每分钟检查一次提醒
    this.checkInterval = setInterval(() => {
      this.checkAllReminders()
    }, 60 * 1000)
    
    console.log('启动定期提醒检查')
  }

  // 停止定期检查
  stopPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
      console.log('停止定期提醒检查')
    }
  }

  // 检查所有提醒
  async checkAllReminders() {
    try {
      const localReminders = wx.getStorageSync(reminderConfig.storageKeys.localReminders) || {}
      const now = new Date()
      
      for (const plantId in localReminders) {
        const plantReminders = localReminders[plantId] || []
        
        for (const reminder of plantReminders) {
          if (reminder.isActive && reminder.nextReminderTime) {
            const nextTime = new Date(reminder.nextReminderTime)
            
            // 如果提醒时间已到
            if (nextTime <= now) {
              console.log(`提醒时间已到: ${reminder.id} - ${reminder.type}`)
              
              // 显示通知
              this.showLocalNotification(reminder, { nickname: '我的植物' })
              
              // 更新下次提醒时间
              const newNextTime = this.calculateNextReminderTime(
                reminder.frequencyValue, 
                reminder.reminderTime,
                reminder
              )
              const updatedData = { ...reminder, nextReminderTime: newNextTime }
              
              // 保存更新
              this.saveLocalReminder(reminder.id, updatedData)
              
              // 重新设置定时器
              this.setLocalReminder(reminder.id, updatedData, { nickname: '我的植物' })
            }
          }
        }
      }
    } catch (err) {
      console.error('检查提醒失败:', err)
    }
  }

  // 请求订阅消息权限
  async requestSubscribeMessage() {
    try {
      const res = await wx.requestSubscribeMessage({
        tmplIds: [this.subscribeMessageTemplates.plantCare]
      })
      
      console.log('订阅消息授权结果:', res)
      
      // 保存订阅状态
      this.subscriptionStatus = res[this.subscribeMessageTemplates.plantCare]
      
      // 根据授权结果显示不同提示
      if (this.subscriptionStatus === 'accept') {
        wx.showToast({
          title: '订阅成功，将收到养护提醒',
          icon: 'success',
          duration: 2000
        })
      } else if (this.subscriptionStatus === 'reject') {
        wx.showToast({
          title: '已拒绝订阅，仅本地提醒',
          icon: 'none',
          duration: 2000
        })
      } else if (this.subscriptionStatus === 'ban') {
        wx.showModal({
          title: '订阅消息被禁用',
          content: '请在微信设置中开启订阅消息权限，以便接收养护提醒',
          showCancel: false,
          confirmText: '知道了'
        })
      }
      
      return res
    } catch (err) {
      console.error('请求订阅消息权限失败:', err)
      wx.showToast({
        title: '订阅请求失败',
        icon: 'none'
      })
      return null
    }
  }

  // 检查订阅消息状态
  async checkSubscriptionStatus() {
    try {
      const res = await wx.getSetting({
        withSubscriptions: true
      })
      
      if (res.subscriptionsSetting) {
        this.subscriptionStatus = res.subscriptionsSetting.mainSwitch
        return res.subscriptionsSetting
      }
      
      return null
    } catch (err) {
      console.error('检查订阅状态失败:', err)
      return null
    }
  }

  // 设置本地提醒
  setLocalReminder(reminderId, reminderData, plantData) {
    // 检查reminderId是否有效
    if (!reminderId || typeof reminderId !== 'string' || reminderId.trim() === '') {
      console.warn('设置本地提醒失败: reminderId为空或无效')
      return
    }
    
    // 清除之前的定时器
    this.clearReminder(reminderId)
    
    const nextTime = new Date(reminderData.nextReminderTime)
    const now = new Date()
    const delay = nextTime.getTime() - now.getTime()
    
    if (delay > 0) {
      const timerId = setTimeout(() => {
        this.showLocalNotification(reminderData, plantData)
        // 更新下次提醒时间并重新设置
        const newNextTime = this.calculateNextReminderTime(
          reminderData.frequencyValue, 
          reminderData.reminderTime,
          reminderData
        )
        const updatedData = { ...reminderData, nextReminderTime: newNextTime }
        this.saveLocalReminder(reminderId, updatedData)
        this.setLocalReminder(reminderId, updatedData, plantData)
      }, delay)
      
      this.timers[reminderId] = timerId
      console.log(`设置提醒 ${reminderId}，将在 ${new Date(nextTime).toLocaleString()} 触发`)
    } else {
      console.warn(`提醒时间已过期: ${reminderId}`)
    }
  }

  // 清除提醒
  clearReminder(reminderId) {
    // 检查reminderId是否有效
    if (!reminderId || typeof reminderId !== 'string' || reminderId.trim() === '') {
      console.warn('清除提醒失败: reminderId为空或无效')
      return
    }
    
    if (this.timers[reminderId]) {
      clearTimeout(this.timers[reminderId])
      delete this.timers[reminderId]
      console.log(`清除提醒定时器: ${reminderId}`)
    }
  }

  // 显示本地通知
  showLocalNotification(reminderData, plantData) {
    const notificationConfig = reminderConfig.notification
    
    // 使用微信小程序的本地通知
    if (notificationConfig.showModal) {
      wx.showModal({
        title: '🌱 植物养护提醒',
        content: `植物：${plantData.nickname || '我的植物'}\n养护类型：${reminderData.type}\n描述：${reminderData.description}`,
        showCancel: true,
        confirmText: '去查看',
        cancelText: '知道了',
        success: (res) => {
          if (res.confirm) {
            // 跳转到植物详情页
            wx.navigateTo({
              url: `/pages/plantArchive/plantDetail?id=${reminderData.plantId}`
            })
          }
          // 标记已读
          if (reminderData._id) {
            this.markReminderAsRead(reminderData._id)
          }
        }
      })
    }

    // 同时显示Toast提示
    if (notificationConfig.showToast) {
      wx.showToast({
        title: '植物养护提醒',
        icon: 'none',
        duration: 3000
      })
    }

    // 播放提示音（如果支持）
    if (notificationConfig.sound) {
      this.playNotificationSound()
    }
    
    // 震动提醒（如果支持）
    if (notificationConfig.vibration) {
      this.vibrateNotification()
    }
  }

  // 播放提示音
  playNotificationSound() {
    try {
      const audioContext = wx.createInnerAudioContext()
      audioContext.src = reminderConfig.notification.sound
      
      // 添加错误处理
      audioContext.onError((err) => {
        console.log('音频文件加载失败，使用系统提示音:', err)
        // 使用系统提示音作为备选
        wx.showToast({
          title: '🔔',
          icon: 'none',
          duration: 1000
        })
      })
      
      audioContext.onPlay(() => {
        console.log('播放提示音成功')
      })
      
      audioContext.play()
    } catch (err) {
      console.log('播放提示音失败，使用系统提示音:', err)
      // 使用系统提示音作为备选
      wx.showToast({
        title: '🔔',
        icon: 'none',
        duration: 1000
      })
    }
  }

  // 震动提醒
  vibrateNotification() {
    try {
      wx.vibrateShort({
        type: 'medium'
      })
    } catch (err) {
      console.log('震动提醒失败:', err)
    }
  }

  // 标记提醒为已读
  async markReminderAsRead(reminderId) {
    try {
      // 检查reminderId是否有效
      if (!reminderId || typeof reminderId !== 'string' || reminderId.trim() === '') {
        console.warn('标记提醒已读失败: reminderId为空或无效')
        return
      }

      const db = wx.cloud.database()
      await db.collection('plant_reminders').doc(reminderId).update({
        data: {
          isRead: true,
          readTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      })
      console.log(`标记提醒已读: ${reminderId}`)
    } catch (err) {
      console.error('标记提醒已读失败:', err)
    }
  }

  // 计算下次提醒时间
  calculateNextReminderTime(frequencyValue, reminderTime, data = {}) {
    const now = new Date()
    const [hours, minutes] = reminderTime.split(':').map(Number)
    let nextTime = new Date(now)
    nextTime.setHours(hours, minutes, 0, 0)

    if (frequencyValue === 'once') {
      // 只提醒一次，若已过则不再提醒
      if (nextTime <= now) {
        return null
      }
      return nextTime
    }

    if (frequencyValue === 'daily') {
      if (nextTime <= now) {
        nextTime.setDate(nextTime.getDate() + 1)
      }
      return nextTime
    }

    if (frequencyValue === 'weekly') {
      // data.weekDay: 0-6
      const targetDay = typeof data.weekDay === 'number' ? data.weekDay : 0
      const nowDay = nextTime.getDay()
      let addDays = targetDay - nowDay
      if (addDays < 0 || (addDays === 0 && nextTime <= now)) {
        addDays += 7
      }
      nextTime.setDate(nextTime.getDate() + addDays)
      return nextTime
    }

    if (frequencyValue === 'custom') {
      const interval = Number(data.customIntervalDays) || 7
      if (nextTime <= now) {
        nextTime.setDate(nextTime.getDate() + interval)
      }
      return nextTime
    }

    // 默认每天
    if (nextTime <= now) {
      nextTime.setDate(nextTime.getDate() + 1)
    }
    return nextTime
  }

  // 保存本地提醒
  saveLocalReminder(reminderId, reminderData) {
    try {
      // 检查reminderId是否有效
      if (!reminderId || typeof reminderId !== 'string' || reminderId.trim() === '') {
        console.warn('保存本地提醒失败: reminderId为空或无效')
        return
      }
      
      const localReminders = wx.getStorageSync(reminderConfig.storageKeys.localReminders) || {}
      const plantId = reminderData.plantId
      
      if (!localReminders[plantId]) {
        localReminders[plantId] = []
      }
      
      // 更新或添加提醒
      const existingIndex = localReminders[plantId].findIndex(r => r.id === reminderId)
      if (existingIndex >= 0) {
        localReminders[plantId][existingIndex] = {
          id: reminderId,
          ...reminderData
        }
      } else {
        localReminders[plantId].push({
          id: reminderId,
          ...reminderData
        })
      }
      
      wx.setStorageSync(reminderConfig.storageKeys.localReminders, localReminders)
      console.log(`保存本地提醒: ${reminderId}`)
    } catch (err) {
      console.error('保存本地提醒失败:', err)
    }
  }

  // 移除本地提醒
  removeLocalReminder(reminderId, plantId) {
    try {
      // 检查reminderId是否有效
      if (!reminderId || typeof reminderId !== 'string' || reminderId.trim() === '') {
        console.warn('移除本地提醒失败: reminderId为空或无效')
        return
      }
      
      const localReminders = wx.getStorageSync(reminderConfig.storageKeys.localReminders) || {}
      
      if (localReminders[plantId]) {
        localReminders[plantId] = localReminders[plantId].filter(r => r.id !== reminderId)
        wx.setStorageSync(reminderConfig.storageKeys.localReminders, localReminders)
        console.log(`移除本地提醒: ${reminderId}`)
      }
    } catch (err) {
      console.error('移除本地提醒失败:', err)
    }
  }

  // 加载本地提醒
  loadLocalReminders(plantId, plantData) {
    try {
      const localReminders = wx.getStorageSync(reminderConfig.storageKeys.localReminders) || {}
      const plantReminders = localReminders[plantId] || []
      
      // 重新设置所有本地提醒
      plantReminders.forEach(reminder => {
        if (reminder.isActive) {
          this.setLocalReminder(reminder.id, reminder, plantData)
        }
      })
      
      console.log(`加载本地提醒: ${plantReminders.length} 个`)
    } catch (err) {
      console.error('加载本地提醒失败:', err)
    }
  }

  // 清除所有提醒
  clearAllReminders() {
    Object.keys(this.timers).forEach(reminderId => {
      this.clearReminder(reminderId)
    })
    console.log('清除所有提醒定时器')
  }

  // 获取即将到来的提醒
  getUpcomingReminders(plantId) {
    try {
      const localReminders = wx.getStorageSync(reminderConfig.storageKeys.localReminders) || {}
      const plantReminders = localReminders[plantId] || []
      const now = new Date()
      
      return plantReminders
        .filter(reminder => reminder.isActive && new Date(reminder.nextReminderTime) > now)
        .sort((a, b) => new Date(a.nextReminderTime) - new Date(b.nextReminderTime))
        .slice(0, 5) // 只返回最近5个
    } catch (err) {
      console.error('获取即将到来的提醒失败:', err)
      return []
    }
  }

  // 获取提醒统计
  getReminderStats(plantId) {
    try {
      const localReminders = wx.getStorageSync(reminderConfig.storageKeys.localReminders) || {}
      const plantReminders = localReminders[plantId] || []
      
      const stats = {
        total: plantReminders.length,
        active: plantReminders.filter(r => r.isActive).length,
        inactive: plantReminders.filter(r => !r.isActive).length,
        types: {}
      }
      
      // 统计各类型提醒数量
      plantReminders.forEach(reminder => {
        const type = reminder.type
        if (!stats.types[type]) {
          stats.types[type] = 0
        }
        stats.types[type]++
      })
      
      return stats
    } catch (err) {
      console.error('获取提醒统计失败:', err)
      return { total: 0, active: 0, inactive: 0, types: {} }
    }
  }

  // 批量设置提醒
  async batchSetReminders(plantId, plantData, reminderTypes) {
    try {
      const db = wx.cloud.database()
      const results = []
      
      for (const reminderType of reminderTypes) {
        const typeConfig = reminderConfig.reminderTypes[reminderType]
        if (!typeConfig) continue
        
        const data = {
          plantId: plantId,
          type: typeConfig.label,
          frequency: typeConfig.defaultFrequency,
          frequencyValue: typeConfig.defaultFrequency,
          reminderTime: reminderConfig.defaultReminderTime,
          description: typeConfig.defaultDescription,
          isActive: true,
          nextReminderTime: this.calculateNextReminderTime(typeConfig.defaultFrequency, reminderConfig.defaultReminderTime),
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
        
        const result = await db.collection('plant_reminders').add({ data })
        results.push(result._id)
        
        // 设置本地提醒
        this.setLocalReminder(result._id, data, plantData)
        this.saveLocalReminder(result._id, data)
      }
      
      return results
    } catch (err) {
      console.error('批量设置提醒失败:', err)
      throw err
    }
  }

  // 检查提醒是否过期
  isReminderExpired(reminderData) {
    const nextTime = new Date(reminderData.nextReminderTime)
    const now = new Date()
    return nextTime <= now
  }

  // 格式化提醒时间
  formatReminderTime(date) {
    if (typeof date === 'string') {
      date = new Date(date)
    }
    
    const now = new Date()
    const diff = date.getTime() - now.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (days > 0) {
      return `${days}天后`
    } else if (hours > 0) {
      return `${hours}小时后`
    } else {
      return '即将到期'
    }
  }
}

module.exports = new ReminderManager() 