//cancelOrder/index.js
// 取消待处理订单
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { orderId } = event
  const { OPENID } = cloud.getWXContext()

  try {
    const result = await db.runTransaction(async trans => {
      // 1. 查询订单
      const orderRes = await trans.collection('orders').doc(orderId).get()
      const order = orderRes.data

      if (!order) throw new Error('订单不存在')
      if (order.openid !== OPENID) throw new Error('无权限')
      if (order.status !== 'pending') throw new Error('只能取消待支付订单')

      // 2. 取消订单
      await trans.collection('orders').doc(orderId).update({
        data: {
          status: 'cancelled',
          updateTime: db.serverDate()
        }
      })

      return { success: true }
    })

    return { success: true }

  } catch (e) {
    console.error('取消订单失败：', e)
    return { success: false, msg: e.message }
  }
}
