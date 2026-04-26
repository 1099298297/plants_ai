const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { orderId } = event
  const { OPENID } = cloud.getWXContext()

  try {
    // 1. 查询订单
    const orderRes = await db.collection('orders').doc(orderId).get()
    const order = orderRes.data

    // 2. 安全验证：只能改自己的订单
    if (order.openid !== OPENID) {
      return { success: false, msg: '无权限操作此订单' }
    }

    // 3. 必须是待支付才能支付
    if (order.status !== 'pending') {
      return { success: false, msg: '订单状态异常' }
    }

    // 4. 云函数修改状态（有权限，不受限）
    await db.collection('orders').doc(orderId).update({
      data: { status: 'paid' }
    })

    return { success: true }

  } catch (err) {
    console.error(err)
    return { success: false, msg: '支付失败' }
  }
}