// 取消订单 + 正确恢复库存（适配你的商城）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

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
        data: { status: 'cancelled' }
      })

      // 3. 🔥 正确恢复库存（按商品 id 字段查询，不是 _id）
      const items = order.items || []
      for (const item of items) {
        // 👇 👇 👇 这里是修复点！！！
        await trans.collection('products')
          .where({ id: item.productId }) // 你的商品 id 是业务ID
          .update({
            data: { stock: _.inc(item.quantity) }
          })
      }

      return { success: true }
    })

    return { success: true }

  } catch (e) {
    console.error('取消订单失败：', e)
    return { success: false, msg: e.message }
  }
}