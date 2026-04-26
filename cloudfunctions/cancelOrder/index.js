// 1. 修复包名 ✅
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { orderId } = event
  const { OPENID } = cloud.getWXContext()

  try {
    // 事务保证：取消订单 + 库存回滚 要么全成功，要么全不变 ✅
    const result = await db.runTransaction(async trans => {
      // 1. 查询订单
      const orderRes = await trans.collection('orders').doc(orderId).get()
      const order = orderRes.data

      if (!order) throw new Error('订单不存在')
      if (order.openid !== OPENID) throw new Error('无权限操作')
      if (order.status !== 'pending') throw new Error('只能取消待支付订单')

      // 2. 订单状态改为 已取消 ✅
      await trans.collection('orders').doc(orderId).update({
        data: { status: 'cancelled' }
      })

      // 3. 库存回滚（修复：事务里必须用 doc，不能用 where）✅
      const items = order.items || []
      for (const item of items) {
        // 你订单里存的是 productId，我假设商品表的id是商品的 _id
        await trans.collection('products').doc(item.productId).update({
          data: {
            stock: _.inc(item.quantity) // 库存加回去
          }
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