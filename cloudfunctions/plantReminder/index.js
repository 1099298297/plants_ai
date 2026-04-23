// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 订阅消息模板ID配置
const SUBSCRIBE_MESSAGE_TEMPLATE_ID = 'rdR5h0pOGbZBA_6uAzoz544Lye-cUxtPniOKf775FHU'

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const startTime = new Date()
  
  console.log('植物提醒云函数开始执行:', {
    event: event,
    openid: wxContext.OPENID,
    timestamp: startTime.toISOString()
  })
  
  try {
    // 如果是测试模式
    if (event.test) {
      console.log('测试模式，返回成功')
      return {
        success: true,
        message: '测试成功',
        timestamp: startTime.toISOString()
      }
    }
    
    // 获取所有需要提醒的植物养护任务
    const now = new Date()
    console.log('查询需要处理的提醒，当前时间:', now.toISOString())
    
    const reminders = await db.collection('plant_reminders')
      .where({
        isActive: true,
        nextReminderTime: db.command.lte(now)
      })
      .get()

    console.log(`找到 ${reminders.data.length} 个需要处理的提醒`)
    
    if (reminders.data.length === 0) {
      return {
        success: true,
        message: '没有需要处理的提醒',
        processedCount: 0,
        timestamp: startTime.toISOString()
      }
    }
    
    const results = []
    let successCount = 0
    let errorCount = 0
    
    for (const reminder of reminders.data) {
      try {
        console.log(`处理提醒: ${reminder._id} - ${reminder.type}`)
        
        // 获取植物信息
        const plantRes = await db.collection('user_plants')
          .doc(reminder.plantId)
          .get()
        
        if (!plantRes.data) {
          console.warn(`植物 ${reminder.plantId} 不存在，跳过提醒`)
          errorCount++
          continue
        }
        
        const plant = plantRes.data
        console.log(`植物信息: ${plant.nickname || '未命名植物'}`)
        
        // 获取用户信息以获取openid
        const userRes = await db.collection('users')
          .where({
            _openid: reminder._openid || wxContext.OPENID
          })
          .get()
        
        if (userRes.data.length === 0) {
          console.warn(`用户不存在，跳过提醒 ${reminder._id}`)
          errorCount++
          continue
        }
        
        const user = userRes.data[0]
        console.log(`用户信息: ${user._openid}`)
        
        // 发送订阅消息
        const messageResult = await sendSubscribeMessage(reminder, plant, user._openid)
        
        // 更新下次提醒时间
        const nextReminderTime = calculateNextReminderTime(
          reminder.frequencyValue,
          reminder.reminderTime,
          reminder
        )
        if (reminder.frequencyValue === 'once' || nextReminderTime === null) {
          // 只提醒一次，推送后停用
          await db.collection('plant_reminders').doc(reminder._id).update({
            data: {
              isActive: false,
              lastReminderTime: db.serverDate(),
              updateTime: db.serverDate()
            }
          })
        } else {
          await db.collection('plant_reminders').doc(reminder._id).update({
            data: {
              lastReminderTime: db.serverDate(),
              nextReminderTime: nextReminderTime,
              updateTime: db.serverDate()
            }
          })
        }
        
        console.log(`提醒处理成功: ${reminder._id}`)
        successCount++
        
        results.push({
          reminderId: reminder._id,
          plantName: plant.nickname || '未命名植物',
          type: reminder.type,
          messageResult: messageResult,
          nextReminderTime: nextReminderTime
        })
        
      } catch (err) {
        console.error(`处理提醒失败 ${reminder._id}:`, err)
        errorCount++
        results.push({
          reminderId: reminder._id,
          error: err.message
        })
      }
    }
    
    const endTime = new Date()
    const duration = endTime.getTime() - startTime.getTime()
    
    console.log('植物提醒云函数执行完成:', {
      totalProcessed: reminders.data.length,
      successCount: successCount,
      errorCount: errorCount,
      duration: `${duration}ms`,
      timestamp: endTime.toISOString()
    })
    
    return {
      success: true,
      message: '提醒处理完成',
      processedCount: reminders.data.length,
      successCount: successCount,
      errorCount: errorCount,
      results: results,
      duration: duration,
      timestamp: endTime.toISOString()
    }
    
  } catch (err) {
    console.error('植物提醒云函数执行失败:', err)
    
    return {
      success: false,
      error: err.message,
      timestamp: new Date().toISOString()
    }
  }
}

// 发送订阅消息
async function sendSubscribeMessage(reminder, plant, openid) {
  try {
    // 检查订阅消息模板ID是否配置
    if (!SUBSCRIBE_MESSAGE_TEMPLATE_ID) {
      throw new Error('订阅消息模板ID未配置，请在微信公众平台申请模板并更新配置')
    }
    
    const messageData = {
      touser: openid,
      templateId: SUBSCRIBE_MESSAGE_TEMPLATE_ID,
      page: `pages/plantArchive/plantDetail?id=${plant._id}`,
      data: {
        thing1: { value: plant.nickname || '我的植物' },         // 植物名称
        thing2: { value: reminder.type || '养护事项' },           // 养护事项
        time3:  { value: formatTime(reminder.nextReminderTime ? new Date(reminder.nextReminderTime) : new Date()) } // 提醒时间
      }
    }
    
    console.log('准备发送订阅消息:', {
      openid: openid,
      plantName: plant.nickname,
      reminderType: reminder.type,
      templateId: SUBSCRIBE_MESSAGE_TEMPLATE_ID,
      messageData: messageData
    })
    
    const result = await cloud.openapi.subscribeMessage.send(messageData)
    
    console.log('订阅消息发送成功:', result)
    return result
    
  } catch (err) {
    console.error('发送订阅消息失败:', err)
    
    // 如果是用户未授权订阅消息，记录但不抛出错误
    if (err.errCode === 43101) {
      console.log('用户未授权订阅消息，跳过发送')
      return { success: false, reason: 'user_not_subscribed' }
    }
    
    throw err
  }
}

// 计算下次提醒时间
function calculateNextReminderTime(frequencyValue, reminderTime, reminder = {}) {
  const now = new Date()
  const [hours, minutes] = reminderTime.split(':').map(Number)
  let nextTime = new Date(now)
  nextTime.setHours(hours, minutes, 0, 0)

  if (frequencyValue === 'once') {
    // 只提醒一次，推送后不再提醒
    return null
  }

  if (frequencyValue === 'daily') {
    if (nextTime <= now) {
      nextTime.setDate(nextTime.getDate() + 1)
    }
    return nextTime
  }

  if (frequencyValue === 'weekly') {
    // reminder.weekDay: 0-6
    const targetDay = typeof reminder.weekDay === 'number' ? reminder.weekDay : 0
    const nowDay = nextTime.getDay()
    let addDays = targetDay - nowDay
    if (addDays < 0 || (addDays === 0 && nextTime <= now)) {
      addDays += 7
    }
    nextTime.setDate(nextTime.getDate() + addDays)
    return nextTime
  }

  if (frequencyValue === 'custom') {
    const interval = Number(reminder.customIntervalDays) || 7
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

// 格式化时间
function formatTime(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  
  return `${year}-${month}-${day} ${hours}:${minutes}`
} 