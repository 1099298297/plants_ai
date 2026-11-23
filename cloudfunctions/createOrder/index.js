// createOrder/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

async function getAdminOpenids() {
  const openids = new Set(
    String(process.env.ADMIN_OPENIDS || '')
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
  )

  try {
    const { data } = await db.collection('admin_users').limit(100).get()
    data.forEach(item => {
      const openid = item.openid || item._openid
      if (openid && item.enabled !== false) openids.add(openid)
    })
  } catch (err) {
    console.warn('读取管理员列表失败，仅使用 ADMIN_OPENIDS:', err.message)
  }

  return Array.from(openids)
}

function buildNotificationData(values) {
  const rawFields = process.env.ORDER_ADMIN_TEMPLATE_FIELDS
  if (!rawFields) return null

  let fields
  try {
    fields = JSON.parse(rawFields)
  } catch (err) {
    console.error('ORDER_ADMIN_TEMPLATE_FIELDS 不是合法 JSON:', err)
    return null
  }

  const data = {}
  Object.keys(fields).forEach(templateKey => {
    const valueKey = fields[templateKey]
    const value = values[valueKey]
    if (value !== undefined && value !== null && value !== '') {
      data[templateKey] = { value: String(value) }
    }
  })
  return Object.keys(data).length > 0 ? data : null
}

async function notifyAdmins(orderId, orderItems, totalPrice, createTime) {
  const templateId = process.env.ORDER_ADMIN_TEMPLATE_ID
  if (!templateId) {
    console.warn('未配置 ORDER_ADMIN_TEMPLATE_ID，跳过新订单订阅消息')
    return
  }

  const adminOpenids = await getAdminOpenids()
  if (adminOpenids.length === 0) {
    console.warn('没有可接收新订单提醒的管理员')
    return
  }

  const itemSummary = orderItems
    .map(item => `${item.name}×${item.quantity}`)
    .join('，')
  const data = buildNotificationData({
    summary: itemSummary.slice(0, 20),
    orderNo: orderId.slice(-16),
    totalPrice: Number(totalPrice).toFixed(2),
    createTime
  })

  if (!data) {
    console.warn('未配置有效的 ORDER_ADMIN_TEMPLATE_FIELDS，跳过订阅消息')
    return
  }

  const sends = adminOpenids.map(async openid => {
    try {
      await cloud.openapi.subscribeMessage.send({
        touser: openid,
        templateId,
        page: process.env.ORDER_ADMIN_PAGE || 'pages/admin/orders',
        data,
        miniprogramState: process.env.ORDER_MINIPROGRAM_STATE || 'formal'
      })
    } catch (err) {
      // 43101 表示管理员尚未授权或授权次数已经用完，不影响下单。
      console.warn(`新订单订阅消息发送失败 (${openid.slice(-6)}):`, err.errCode || err.message)
    }
  })

  await Promise.all(sends)
}

exports.main = async (event, context) => {
  const { buyItems } = event
  const { OPENID } = cloud.getWXContext()

  try {
    if (!Array.isArray(buyItems) || buyItems.length === 0) {
      return { success: false, msg: '订单商品不能为空' }
    }

    const clientRequestId = String(event.clientRequestId || '').trim().slice(0, 64)
    if (clientRequestId) {
      const { data: existingOrders } = await db.collection('orders')
        .where({ openid: OPENID, clientRequestId })
        .limit(1)
        .get()

      if (existingOrders.length > 0) {
        return {
          success: true,
          orderId: existingOrders[0]._id,
          duplicate: true
        }
      }
    }

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
        image: Array.isArray(product.image)
          ? product.image
          : (product.image ? [product.image] : []),
        spec: buy.spec || '默认规格'
      })
    }

    // 3. 创建订单
    const createTime = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
    const orderRes = await db.collection('orders').add({
      data: {
        openid: OPENID,
        items: orderItems,
        address: event.address,
        totalPrice,
        status: 'pending',
        clientRequestId: clientRequestId || null,
        createTime,
        createdAt: db.serverDate()
      }
    })

    // 订单创建成功后通知管理员，提醒失败不能影响用户下单。
    try {
      await notifyAdmins(orderRes._id, orderItems, totalPrice, createTime)
    } catch (err) {
      console.error('发送新订单管理员提醒失败:', err)
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
