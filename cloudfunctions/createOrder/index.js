const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { buyItems } = event
  const { OPENID } = cloud.getWXContext()

  try {
    // 1. 查出所有商品
    const productIds = buyItems.map(i => i.productId)
    const { data: products } = await db.collection('products')
      .where({ id: _.in(productIds) })
      .get()

    // 2. 统一校验库存（按商品合并）
    const productStockMap = {}
    for (const buy of buyItems) {
      const pid = buy.productId
      if (!productStockMap[pid]) productStockMap[pid] = 0
      productStockMap[pid] += buy.quantity
    }

    // 检查是否超过库存
    for (const buy of buyItems) {
      const product = products.find(p => p.id === buy.productId)
      if (!product) return { success: false, msg: '商品不存在' }

      if (product.stock != null) {
        const stock = Number(product.stock)
        if (isNaN(stock)) continue
        if (stock < productStockMap[buy.productId]) {
          return { success: false, msg: '库存不足' }
        }
      }
    }

    // 3. 生成订单商品
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

    // ==============================
    // ✅ 5. 【正确扣库存】按商品ID合并扣
    // ==============================
    for (const pid in productStockMap) {
      const totalQty = productStockMap[pid]
      await db.collection('products')
        .where({ id: Number(pid) })
        .update({
          data: { stock: _.inc(-totalQty) }
        })
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