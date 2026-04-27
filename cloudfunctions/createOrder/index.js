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
    // 1. 查询商品
    const productIds = buyItems.map(i => i.productId)
    const { data: products } = await db.collection('products')
      .where({ id: _.in(productIds) })
      .get()

    // 2. 统一校验库存 → 不足直接返回：库存不足
    for (const buy of buyItems) {
      const product = products.find(p => p.id === buy.productId)
      if (!product) {
        return { success: false, msg: '商品不存在' }
      }

      // 如果有库存字段，就校验
      if (product.stock !== undefined && product.stock !== null) {
        const stock = Number(product.stock)
        if (isNaN(stock)) continue

        // ❌ 库存不足 → 统一返回固定文字
        if (stock < buy.quantity) {
          return {
            success: false,
            msg: '库存不足'  // ✅ 固定文案
          }
        }
      }
    }

    // 3. 生成订单商品列表
    let totalPrice = 0
    const orderItems = []
    for (const buy of buyItems) {
      const product = products.find(p => p.id === buy.productId)
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

    // 4. 创建订单
    const orderRes = await db.collection('orders').add({
      data: {
        openid: OPENID,
        items: orderItems,
        address: event.address,
        totalPrice,
        status: 'pending',
        createTime: db.serverDate()
      }
    })

    // 5. 扣库存
    for (const buy of buyItems) {
      const product = products.find(p => p.id === buy.productId)
      if (product && product.stock !== undefined) {
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

    return {
      success: true,
      orderId: orderRes._id
    }

  } catch (e) {
    console.error(e)
    return { success: false, msg: '下单失败' }
  }
}