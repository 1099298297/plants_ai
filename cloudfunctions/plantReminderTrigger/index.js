// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  console.log('植物提醒定时触发器开始执行:', new Date().toISOString())
  
  try {
    // 调用植物提醒云函数
    const result = await cloud.callFunction({
      name: 'plantReminder',
      data: {
        trigger: 'scheduled',
        timestamp: new Date().toISOString()
      }
    })
    
    console.log('植物提醒云函数执行结果:', result)
    
    return {
      success: true,
      message: '定时触发器执行成功',
      result: result.result,
      timestamp: new Date().toISOString()
    }
    
  } catch (err) {
    console.error('植物提醒定时触发器执行失败:', err)
    
    return {
      success: false,
      error: err.message,
      timestamp: new Date().toISOString()
    }
  }
} 