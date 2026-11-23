const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'completed', 'cancelled']
const ACTIVE_STATUSES = ['pending', 'paid']

function envAdminOpenids() {
  return String(process.env.ADMIN_OPENIDS || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

async function getAdminOpenids() {
  const openids = new Set(envAdminOpenids())

  try {
    const { data } = await db.collection('admin_users').limit(100).get()
    data.forEach(item => {
      const openid = item.openid || item._openid
      if (openid && item.enabled !== false) {
        openids.add(openid)
      }
    })
  } catch (err) {
    // admin_users 尚未创建时仍允许使用云函数环境变量配置管理员。
    console.warn('读取 admin_users 失败，仅使用环境变量中的管理员:', err.message)
  }

  return Array.from(openids)
}

async function isAdmin(openid) {
  if (!openid) return false
  const openids = await getAdminOpenids()
  return openids.includes(openid)
}

function normalizeStatus(status) {
  return ORDER_STATUSES.includes(status) ? status : ''
}

async function getSession() {
  const pendingQuery = db.collection('orders').where({ status: 'pending' })
  const paidQuery = db.collection('orders').where({ status: 'paid' })
  const activeQuery = db.collection('orders').where({ status: _.in(ACTIVE_STATUSES) })

  const [pendingCountRes, paidCountRes, latestRes] = await Promise.all([
    pendingQuery.count(),
    paidQuery.count(),
    activeQuery.orderBy('createTime', 'desc').limit(1).get()
  ])
  const pendingCount = pendingCountRes.total || 0
  const paidCount = paidCountRes.total || 0

  return {
    success: true,
    isAdmin: true,
    activeCount: pendingCount + paidCount,
    pendingCount,
    paidCount,
    latestActive: latestRes.data[0] || null,
    templateId: process.env.ORDER_ADMIN_TEMPLATE_ID || ''
  }
}

async function listOrders(event) {
  const page = Math.max(0, Number(event.page) || 0)
  const pageSize = Math.min(50, Math.max(1, Number(event.pageSize) || 20))
  const status = normalizeStatus(event.status)
  const keyword = String(event.keyword || '')
    .trim()
    .replace(/^#/, '')
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, 32)
  let where = status ? { status } : {}
  if (event.status === 'active') {
    where = { status: _.in(ACTIVE_STATUSES) }
  }
  if (keyword) {
    where._id = db.RegExp({
      regexp: keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      options: 'i'
    })
  }

  const query = db.collection('orders').where(where)
  const [countRes, orderRes] = await Promise.all([
    query.count(),
    query
      .orderBy('createTime', 'desc')
      .skip(page * pageSize)
      .limit(pageSize)
      .get()
  ])

  return {
    success: true,
    isAdmin: true,
    orders: orderRes.data,
    total: countRes.total || 0,
    page,
    pageSize,
    searchKeyword: keyword,
    hasMore: page * pageSize + orderRes.data.length < (countRes.total || 0)
  }
}

async function updateOrderStatus(orderId, nextStatus) {
  if (!orderId) throw new Error('缺少订单 ID')

  await db.runTransaction(async transaction => {
    const orderRes = await transaction.collection('orders').doc(orderId).get()
    const order = orderRes.data
    if (!order) throw new Error('订单不存在')

    if (nextStatus === 'shipped' && order.status !== 'paid') {
      throw new Error('请先将订单标记为已支付')
    }
    if (nextStatus === 'completed' && order.status !== 'shipped') {
      throw new Error('只有已发货订单可以完成')
    }
    const data = {
      status: nextStatus,
      updateTime: db.serverDate()
    }
    if (nextStatus === 'shipped') data.shippedAt = db.serverDate()
    if (nextStatus === 'completed') data.completedAt = db.serverDate()
    await transaction.collection('orders').doc(orderId).update({ data })
  })
}

async function markOrderPaid(orderId) {
  if (!orderId) throw new Error('缺少订单 ID')

  await db.runTransaction(async transaction => {
    const orderRes = await transaction.collection('orders').doc(orderId).get()
    const order = orderRes.data
    if (!order) throw new Error('订单不存在')
    if (order.status !== 'pending') throw new Error('只有未支付订单可以标记支付')

    await transaction.collection('orders').doc(orderId).update({
      data: {
        status: 'paid',
        paidAt: db.serverDate(),
        paymentUpdatedBy: 'admin',
        updateTime: db.serverDate()
      }
    })
  })
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  const action = event.action || 'session'

  try {
    const admin = await isAdmin(OPENID)

    if (action === 'identity' || !admin) {
      return {
        success: admin,
        isAdmin: admin,
        openid: OPENID || '',
        msg: admin ? '' : '当前账号不是订单管理员'
      }
    }

    if (action === 'session') {
      return await getSession()
    }

    if (action === 'list') {
      return await listOrders(event)
    }

    if (action === 'ship') {
      await updateOrderStatus(event.orderId, 'shipped')
      return { success: true, isAdmin: true, msg: '订单已标记为已发货' }
    }

    if (action === 'complete') {
      await updateOrderStatus(event.orderId, 'completed')
      return { success: true, isAdmin: true, msg: '订单已完成' }
    }

    if (action === 'markPaid') {
      await markOrderPaid(event.orderId)
      return { success: true, isAdmin: true, msg: '订单已标记为已支付' }
    }

    return {
      success: false,
      isAdmin: true,
      msg: '不支持的管理操作'
    }
  } catch (err) {
    console.error('管理订单操作失败:', err)
    return {
      success: false,
      isAdmin: false,
      msg: err.message || '管理操作失败'
    }
  }
}
