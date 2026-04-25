const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { orderId } = event
  const { OPENID } = cloud.getWXContext()

  try {
    // 1. 查订单
    const { data: order } = await db.collection('orders').doc(orderId).get()

    // 2. 安全校验：只能付自己的订单
    if (order.openid !== OPENID) {
      return { success: false, msg: '无权限' }
    }

    // 3. 只能支付待支付订单
    if (order.status !== 'pending') {
      return { success: false, msg: '订单状态异常' }
    }

    // 4. 改为已支付
    await db.collection('orders').doc(orderId).update({
      data: { status: 'paid' }
    })

    return { success: true }

  } catch (e) {
    console.error(e)
    return { success: false, msg: '支付失败' }
  }
}