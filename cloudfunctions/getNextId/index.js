const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { collectionName } = event
  
  if (!collectionName) {
    return { success: false, msg: '缺少集合名称参数' }
  }

  // 最多重试3次，解决并发冲突
  for (let i = 0; i < 3; i++) {
    try {
      // 使用MongoDB事务保证原子性
      const nextId = await db.runTransaction(async (transaction) => {
        // 1. 查询集合中最大的id值
        const { data } = await transaction.collection(collectionName)
          .orderBy('id', 'desc') // 按id降序排列
          .limit(1) // 只取最大的那一条
          .get()
        
        const maxId = data.length > 0 ? Number(data[0].id) : 0
        const newId = maxId + 1
        
        // 2. 双重检查：确保这个新id不存在（防止极端并发）
        const { data: existCheck } = await transaction.collection(collectionName)
          .where({ id: newId })
          .limit(1)
          .get()
        
        if (existCheck.length > 0) {
          // 如果id已经存在，抛出错误触发重试
          throw new Error('ID冲突')
        }
        
        return newId
      })
      
      return { success: true, nextId }
      
    } catch (e) {
      // 如果是ID冲突，继续重试
      if (e.message === 'ID冲突') {
        console.log(`第${i+1}次ID冲突，重试中...`)
        continue
      }
      // 其他错误直接返回
      console.error('获取自增ID失败:', e)
      return { success: false, msg: '生成ID失败：' + e.message }
    }
  }
  
  // 3次重试都失败
  return { success: false, msg: '系统繁忙，请稍后再试' }
}