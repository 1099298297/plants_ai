// createOrder/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { buyItems } = event
  const { OPENID } = cloud.getWXContext()

  try {
    // 1. 查出所有涉及的商品信息
    const productIds = buyItems.map(i => i.productId)
    const { data: products } = await db.collection('products')
      .where({ id: db.command.in(productIds) })
      .get()

    // 2. 生成订单商品明细并计算总价
    let totalPrice = 0
    const orderItems = []
    for (const buy of buyItems) {
      const product = products.find(p => p.id === buy.productId)
      if (!product) {
        return { success: false, msg: `商品 ${buy.productId} 不存在` }
      }
      totalPrice += product.price * buy.quantity
      orderItems.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: buy.quantity,
        image: product.image,
        spec: buy.spec || '默认规格'
      })
    }

    // 3. 创建订单
    const orderRes = await db.collection('orders').add({
      data: {
        openid: OPENID,
        items: orderItems,
        address: event.address,
        totalPrice,
        status: 'pending',
        createTime: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
      }
    })

    return {
      success: true,
      orderId: orderRes._id
    }

  } catch (e) {
    console.error(e)
    return { success: false, msg: '下单失败' }
  }
}