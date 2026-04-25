const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { buyItems } = event
  const { OPENID } = cloud.getWXContext()

  try {
    // 1. 查询商品（商品用自定义 id）
    const productIds = buyItems.map(i => i.productId)
    const { data: products } = await db.collection('products')
      .where({ id: _.in(productIds) })
      .get()

    let totalPrice = 0
    const orderItems = []

    for (const buy of buyItems) {
      const product = products.find(p => p.id === buy.productId)
      if (!product) {
        return { success: false, msg: '商品不存在' }
      }

      // 库存判断（有就校验，没有就跳过）
      if (product.stock !== undefined && product.stock !== null && product.stock !== '') {
        const stock = Number(product.stock)
        if (!isNaN(stock) && stock < buy.quantity) {
          return { success: false, msg: `${product.name} 库存不足` }
        }
      }

      totalPrice += product.price * buy.quantity
      orderItems.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: buy.quantity,
        image: product.image
      })
    }

    // 2. 创建订单（订单用系统 _id）
    const orderRes = await db.collection('orders').add({
      data: {
        openid: OPENID,
        items: orderItems,
        totalPrice,
        status: 'pending',
        createTime: db.serverDate()
      }
    })

    // 3. 扣减库存
    for (const buy of buyItems) {
      const product = products.find(p => p.id === buy.productId)
      if (product.stock !== undefined && product.stock !== null && product.stock !== '') {
        const stock = Number(product.stock)
        if (!isNaN(stock)) {
          await db.collection('products').where({
            id: buy.productId
          }).update({
            data: { stock: _.inc(-buy.quantity) }
          })
        }
      }
    }

    // ✅ 关键修复：返回订单真正的 _id
    return {
      success: true,
      orderId: orderRes._id
    }

  } catch (e) {
    console.error(e)
    return { success: false, msg: '下单失败' }
  }
}