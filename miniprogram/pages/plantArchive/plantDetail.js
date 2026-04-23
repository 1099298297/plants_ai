const app = getApp()
const reminderManager = require('../../utils/reminder.js')

Page({
  data: {
    plant: null,
    activeTab: 'info',
    reminders: [],
    showReminderModal: false,
    editingReminder: null,
    reminderTypes: ['浇水', '施肥', '光照调整', '修剪', '病虫防治', '换盆', '自定义'],
    typeIndex: 0,
    frequencyIndex: 0,
    reminderTime: '09:00',
    description: '',
    // 频率选择选项
    frequencyOptions: [
      { label: '只提醒一次', value: 'once' },
      { label: '每天', value: 'daily' },
      { label: '每周', value: 'weekly' },
      { label: '自定义', value: 'custom' }
    ],
    basicReminders: [
      { label: '浇水', icon: '/images/maintenance/plant-mister.png' },
      { label: '施肥', icon: '/images/maintenance/plant-food.png' },
      { label: '光照调整', icon: '/images/maintenance/grow-light.png' },
      { label: '修剪', icon: '/images/maintenance/pruning-shears.png' },
      { label: '病虫防治', icon: '/images/maintenance/gardening-tools.png' },
      { label: '换盆', icon: '/images/maintenance/gardening-tools.png' }
    ],
    upcomingReminders: [], // 即将到来的提醒
    subscriptionStatus: null, // 订阅状态
    reminderStats: {}, // 提醒统计
    showSubscribeModal: false, // 控制订阅弹窗
    // 新增：半小时间隔选项
    reminderTimeOptions: [
      '00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30',
      '04:00', '04:30', '05:00', '05:30', '06:00', '06:30', '07:00', '07:30',
      '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
      '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
      '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30'
    ],
    reminderTimeIndex: 18, // 默认09:00
    // 新增：每周几选择（0-6，周日到周六）
    weekDays: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
    selectedWeekDay: 0,
    // 新增：自定义间隔天数
    customIntervalDays: 7,
  },

  onLoad: function(options) {
    this.plantId = options.id
    this.loadPlantData()
    this.loadReminders()
    this.checkSubscriptionStatus()
  },

  onShow: function() {
    this.loadReminders()
    this.loadUpcomingReminders()
    this.loadReminderStats()
  },

  async loadPlantData() {
    try {
      const db = wx.cloud.database()
      const res = await db.collection('user_plants').doc(this.plantId).get()
      const plant = res.data
      // 获取临时图片链接
      if (plant.imageUrl) {
        const tempRes = await wx.cloud.getTempFileURL({
          fileList: [plant.imageUrl]
        })
        plant.tempImageUrl = tempRes.fileList[0].tempFileURL
      }
      this.setData({
        plant
      })
      // 加载本地提醒
      reminderManager.loadLocalReminders(this.plantId, plant)
    } catch (err) {
      console.error('加载植物数据失败：', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  async loadReminders() {
    try {
      const db = wx.cloud.database()
      const res = await db.collection('plant_reminders')
        .where({
          plantId: this.plantId
        })
        .orderBy('createTime', 'desc')
        .get()

      // ========== 核心修复点：将 Date 对象格式化为字符串 ==========
      const formattedReminders = res.data.map(item => {
        let formattedTime = item.nextReminderTime;
        // 如果是时间对象，进行格式化
        if (formattedTime && typeof formattedTime === 'object') {
          const date = new Date(formattedTime);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          formattedTime = `${year}-${month}-${day} ${hours}:${minutes}`;
        }
        return {
          ...item,
          nextReminderTime: formattedTime
        };
      });

      this.setData({
        reminders: formattedReminders
      })
      // ==============================================================

      // 修正：storageKeys应从reminderConfig获取
      const reminderManager = require('../../utils/reminder.js')
      const reminderConfig = require('../../config/reminder.js')
      const plant = this.data.plant || { nickname: '我的植物' }
      // 先清空本地该植物的提醒
      const localReminders = wx.getStorageSync(reminderConfig.storageKeys.localReminders) || {}
      localReminders[this.plantId] = []
      wx.setStorageSync(reminderConfig.storageKeys.localReminders, localReminders)
      // 重新保存所有云端提醒到本地并设置定时器
      res.data.forEach(reminder => {
        reminderManager.saveLocalReminder(reminder._id, reminder)
        reminderManager.setLocalReminder(reminder._id, reminder, plant)
      })
    } catch (err) {
      console.error('加载提醒列表失败：', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  loadUpcomingReminders() {
    const upcomingReminders = reminderManager.getUpcomingReminders(this.plantId)
    this.setData({
      upcomingReminders: upcomingReminders.map(reminder => ({
        ...reminder,
        nextReminderTime: reminderManager.formatReminderTime(reminder.nextReminderTime)
      }))
    })
  },

  loadReminderStats() {
    const stats = reminderManager.getReminderStats(this.plantId)
    this.setData({
      reminderStats: stats
    })
  },

  // 检查订阅状态
  async checkSubscriptionStatus() {
    const status = await reminderManager.checkSubscriptionStatus()
    this.setData({
      subscriptionStatus: status
    })
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({
      activeTab: tab
    })
  },

  showAddReminder() {
    // 重置表单数据
    this.setData({
      showReminderModal: true,
      editingReminder: null,
      typeIndex: 0,
      frequencyIndex: 0,
      frequency: '',
      reminderTime: '09:00',
      reminderTimeIndex: 18, // 09:00
      description: ''
    })
  },

  hideReminderModal() {
    this.setData({
      showReminderModal: false,
      editingReminder: null
    })
  },

  onTypeChange(e) {
    this.setData({
      typeIndex: e.detail.value
    })
  },

  onFrequencyChange(e) {
    const index = e.detail.value
    const frequency = this.data.frequencyOptions[index].label
    this.setData({
      frequencyIndex: index,
      frequency: frequency
    })
    // 新增：切换频率时重置相关选项
    if (this.data.frequencyOptions[index].value === 'weekly') {
      this.setData({ selectedWeekDay: 0 })
    }
    if (this.data.frequencyOptions[index].value === 'custom') {
      this.setData({ customIntervalDays: 7 })
    }
  },

  onTimeChange(e) {
    // 新增：只允许选择半小时间隔
    const index = e.detail.value
    this.setData({
      reminderTimeIndex: index,
      reminderTime: this.data.reminderTimeOptions[index]
    })
  },

  onDescriptionInput(e) {
    this.setData({
      description: e.detail.value
    })
  },

  onWeekDayChange(e) {
    this.setData({ selectedWeekDay: Number(e.detail.value) })
  },

  onCustomIntervalInput(e) {
    this.setData({ customIntervalDays: Number(e.detail.value) })
  },

  async saveReminder() {
    const { typeIndex, frequencyIndex, frequency, reminderTime, description, editingReminder } = this.data
    const frequencyValue = this.data.frequencyOptions[frequencyIndex].value
    // 校验：只能是半小时间隔
    if (!this.data.reminderTimeOptions.includes(reminderTime)) {
      wx.showToast({
        title: '请选择半小时间隔的时间',
        icon: 'none'
      })
      return
    }
    // 校验自定义天数
    if (frequencyValue === 'custom' && (!this.data.customIntervalDays || this.data.customIntervalDays < 1)) {
      wx.showToast({
        title: '请输入有效的间隔天数',
        icon: 'none'
      })
      return
    }
    const openid = getApp().globalData.openid

    if (!frequency) {
      wx.showToast({
        title: '请选择提醒频率',
        icon: 'none'
      })
      return
    }

    if (!description) {
      wx.showToast({
        title: '请输入提醒描述',
        icon: 'none'
      })
      return
    }

    wx.showLoading({
      title: editingReminder ? '更新中...' : '创建中...'
    })

    try {
      const db = wx.cloud.database()
      const data = {
        plantId: this.plantId,
        _openid: openid,
        type: this.data.reminderTypes[typeIndex],
        frequency: this.data.frequencyOptions[frequencyIndex].label,
        frequencyValue: frequencyValue,
        reminderTime: reminderTime,
        description,
        isActive: true,
        nextReminderTime: null, // 稍后计算
        updateTime: db.serverDate()
      }

      // 新增：保存每周几、自定义天数
      if (frequencyValue === 'weekly') {
        data.weekDay = this.data.selectedWeekDay
      }
      if (frequencyValue === 'custom') {
        data.customIntervalDays = this.data.customIntervalDays
      }

      // 生成本地时间的完整提醒时间
      const [hours, minutes] = reminderTime.split(':').map(Number);
      const now = new Date();
      let nextReminder = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
      if (nextReminder <= now) {
        nextReminder.setDate(nextReminder.getDate() + 1);
      }
      data.nextReminderTime = db.serverDate({ offset: nextReminder.getTime() - Date.now() });

      let isFirstReminder = false;
      if (editingReminder) {
        // 更新提醒
        await db.collection('plant_reminders').doc(editingReminder._id).update({
          data
        })
        reminderManager.removeLocalReminder(editingReminder._id, this.plantId)
        reminderManager.saveLocalReminder(editingReminder._id, data)
        reminderManager.setLocalReminder(editingReminder._id, data, this.data.plant)
      } else {
        // 判断是否为首次添加提醒
        const countRes = await db.collection('plant_reminders').where({ plantId: this.plantId }).count();
        isFirstReminder = countRes.total === 0;
        // 添加新提醒
        data.createTime = db.serverDate()
        const result = await db.collection('plant_reminders').add({
          data
        })
        reminderManager.setLocalReminder(result._id, data, this.data.plant)
        reminderManager.saveLocalReminder(result._id, data)
      }

      this.hideReminderModal()
      this.loadReminders()
      this.loadUpcomingReminders()
      this.loadReminderStats()

      // 仅首次添加提醒时弹出订阅授权弹窗
      if (isFirstReminder) {
        this.setData({ showSubscribeModal: true });
      }

      wx.hideLoading()
      wx.showToast({
        title: editingReminder ? '更新成功' : '添加成功',
        icon: 'success'
      })
    } catch (err) {
      wx.hideLoading()
      console.error('保存提醒失败：', err)
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    }
  },

  editReminder(e) {
    const reminderId = e.currentTarget.dataset.id
    const reminder = this.data.reminders.find(r => r._id === reminderId)
    if (reminder) {
      const typeIndex = this.data.reminderTypes.indexOf(reminder.type)
      const frequencyIndex = this.data.frequencyOptions.findIndex(f => f.label === reminder.frequency) || 0
      // 新增：找到对应的时间index
      const reminderTimeIndex = this.data.reminderTimeOptions.indexOf(reminder.reminderTime || '09:00')
      this.setData({
        showReminderModal: true,
        editingReminder: reminder,
        typeIndex: typeIndex >= 0 ? typeIndex : 0,
        frequencyIndex: frequencyIndex,
        frequency: reminder.frequency,
        reminderTime: reminder.reminderTime || '09:00',
        reminderTimeIndex: reminderTimeIndex >= 0 ? reminderTimeIndex : 18,
        description: reminder.description
      })
    }
  },

  async deleteReminder(e) {
    const reminderId = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个养护提醒吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const db = wx.cloud.database()
            await db.collection('plant_reminders').doc(reminderId).remove()
            
            // 取消定时提醒
            reminderManager.clearReminder(reminderId)
            reminderManager.removeLocalReminder(reminderId, this.plantId)
            
            this.loadReminders()
            this.loadUpcomingReminders()
            this.loadReminderStats()
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            })
          } catch (err) {
            console.error('删除提醒失败：', err)
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 切换提醒状态
  async toggleReminderStatus(e) {
    const reminderId = e.currentTarget.dataset.id
    const reminder = this.data.reminders.find(r => r._id === reminderId)
    
    if (!reminder) return
    
    try {
      const db = wx.cloud.database()
      const newStatus = !reminder.isActive
      
      await db.collection('plant_reminders').doc(reminderId).update({
        data: {
          isActive: newStatus,
          updateTime: db.serverDate()
        }
      })
      
      if (newStatus) {
        // 激活提醒
        reminderManager.setLocalReminder(reminderId, reminder, this.data.plant)
        reminderManager.saveLocalReminder(reminderId, reminder)
      } else {
        // 停用提醒
        reminderManager.clearReminder(reminderId)
        reminderManager.removeLocalReminder(reminderId, this.plantId)
      }
      
      this.loadReminders()
      this.loadUpcomingReminders()
      this.loadReminderStats()
      wx.showToast({
        title: newStatus ? '已启用' : '已停用',
        icon: 'success'
      })
    } catch (err) {
      console.error('切换提醒状态失败：', err)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  onSelectType(e) {
    const idx = e.currentTarget.dataset.idx
    this.setData({
      typeIndex: idx
    })
  },

  onCustomType() {
    // 选中自定义事项（索引为6）
    this.setData({
      typeIndex: 6
    })
    wx.showModal({
      title: '自定义事项',
      content: '请输入自定义事项名称',
      editable: true,
      placeholderText: '如：叶面清洁',
      success: (res) => {
        if (res.confirm && res.content) {
          let custom = res.content.trim()
          if (custom) {
            let types = this.data.reminderTypes.slice()
            types[6] = custom
            this.setData({ reminderTypes: types })
          }
        }
      }
    })
  },

  onRequestSubscribe() {
    console.log('点击了订阅按钮');
    reminderManager.requestSubscribeMessage().then((res) => {
      if (res) {
        this.checkSubscriptionStatus()
      }
    })
  },

  // 批量创建基础提醒
  async createBasicReminders() {
    wx.showModal({
      title: '批量创建提醒',
      content: '将为植物创建浇水、施肥、光照调整等基础养护提醒，是否继续？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({
              title: '创建中...',
              mask: true
            })
            
            const basicTypes = ['watering', 'fertilizing', 'lighting']
            await reminderManager.batchSetReminders(this.plantId, this.data.plant, basicTypes)
            
            this.loadReminders()
            this.loadUpcomingReminders()
            this.loadReminderStats()
            
            wx.hideLoading()
            wx.showToast({
              title: '创建成功',
              icon: 'success'
            })
          } catch (err) {
            wx.hideLoading()
            console.error('批量创建提醒失败：', err)
            wx.showToast({
              title: '创建失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  onTapSubscribe() {
    reminderManager.requestSubscribeMessage().then(() => {
      this.setData({ showSubscribeModal: false });
    });
  },
})