// shipOrder/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { orderId } = event

  try {
    await db.runTransaction(async trans => {
      // 1. 查询订单
      const orderRes = await trans.collection('orders').doc(orderId).get()
      const order = orderRes.data

      if (!order) throw new Error('订单不存在')
      if (order.status !== 'pending') throw new Error('只能发货已提交订单')

      // 2. 更新为 shipped
      await trans.collection('orders').doc(orderId).update({
        data: {
          status: 'shipped',
          shippedAt: db.serverDate()
        }
      })
    })

    return { success: true }

  } catch (e) {
    console.error('发货失败：', e)
    return { success: false, msg: e.message }
  }
}