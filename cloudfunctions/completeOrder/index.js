// completeOrder/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { orderId } = event

  try {
    await db.runTransaction(async trans => {
      const orderRes = await trans.collection('orders').doc(orderId).get()
      const order = orderRes.data

      if (!order) throw new Error('订单不存在')
      if (order.status !== 'shipped') throw new Error('只能完成已发货订单')

      await trans.collection('orders').doc(orderId).update({
        data: {
          status: 'completed',
          completedAt: db.serverDate()
        }
      })
    })

    return { success: true }

  } catch (e) {
    console.error('完成订单失败：', e)
    return { success: false, msg: e.message }
  }
}