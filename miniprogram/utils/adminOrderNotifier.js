const STORAGE_KEY_PREFIX = 'admin_last_active_order_'
const DEFAULT_REFRESH_INTERVAL = 30000

let timer = null
let inFlight = null
let inFlightOpenid = ''
let listeners = []
let sessionEpoch = 0

function currentOpenid() {
  return wx.getStorageSync('user_openid') || ''
}

function currentApp() {
  try {
    return getApp()
  } catch (err) {
    return null
  }
}

function setTabRedDot(visible) {
  const method = visible ? 'showTabBarRedDot' : 'hideTabBarRedDot'
  wx[method]({
    index: 3,
    fail: () => {}
  })
}

function formatAmount(amount) {
  const value = Number(amount)
  return Number.isFinite(value) ? value.toFixed(2) : '0.00'
}

function alertNewOrder(session) {
  const order = session.latestActive || {}
  const content = `新订单金额 ¥${formatAmount(order.totalPrice)}，当前共有 ${session.activeCount || 1} 笔待办订单。`

  if (wx.vibrateLong) {
    wx.vibrateLong({ fail: () => {} })
  }

  setTimeout(() => {
    wx.showModal({
      title: '收到新订单',
      content,
      confirmText: '查看订单',
      success: res => {
        if (res.confirm) {
          wx.navigateTo({
            url: '/pages/admin/orders',
            fail: () => {}
          })
        }
      }
    })
  }, 50)
}

function emitChange(session) {
  listeners.slice().forEach(listener => {
    try {
      listener(session)
    } catch (err) {
      console.error('管理员订单通知监听器执行失败:', err)
    }
  })
}

async function refresh(options = {}) {
  const openid = currentOpenid()
  if (!openid) {
    setTabRedDot(false)
    return { success: false, isAdmin: false, msg: '请先登录' }
  }

  if (inFlight && inFlightOpenid === openid && !options.force) {
    return inFlight
  }

  const requestEpoch = sessionEpoch
  const request = wx.cloud.callFunction({
    name: 'adminOrder',
    data: { action: 'session' }
  }).then(res => {
    if (requestEpoch !== sessionEpoch) {
      return { success: false, isAdmin: false, msg: '登录状态已变化' }
    }

    const session = res.result || {}
    const app = currentApp()

    if (app) {
      app.globalData.isAdmin = !!session.isAdmin
    }

    if (!session.isAdmin) {
      setTabRedDot(false)
      emitChange(session)
      return session
    }

    const latest = session.latestActive || null
    const storageKey = STORAGE_KEY_PREFIX + openid
    const previousLatestId = wx.getStorageSync(storageKey)

    setTabRedDot((session.activeCount || 0) > 0)

    if (latest && latest._id && latest._id !== previousLatestId) {
      const shouldNotify = options.notify !== false && !!previousLatestId
      wx.setStorageSync(storageKey, latest._id)
      emitChange(session)
      if (shouldNotify) {
        alertNewOrder(session)
      }
    } else {
      emitChange(session)
    }

    return session
  }).catch(err => {
    console.error('检查新订单失败:', err)
    return {
      success: false,
      isAdmin: false,
      msg: '订单提醒服务暂不可用'
    }
  })

  inFlight = request
  inFlightOpenid = openid
  return request.then(result => {
    if (inFlight === request) {
      inFlight = null
      inFlightOpenid = ''
    }
    return result
  })
}

function start() {
  if (timer) return
  refresh({ notify: true })
  timer = setInterval(() => {
    refresh({ notify: true })
  }, DEFAULT_REFRESH_INTERVAL)
}

function stop() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function subscribe(listener) {
  if (typeof listener === 'function' && !listeners.includes(listener)) {
    listeners.push(listener)
  }
  return () => {
    listeners = listeners.filter(item => item !== listener)
  }
}

function markLatestSeen(latestOrderId) {
  const openid = currentOpenid()
  if (!openid || !latestOrderId) return
  wx.setStorageSync(STORAGE_KEY_PREFIX + openid, latestOrderId)
}

function clearSession() {
  sessionEpoch += 1
  inFlight = null
  inFlightOpenid = ''
  setTabRedDot(false)
  const app = currentApp()
  if (app) app.globalData.isAdmin = false
}

module.exports = {
  refresh,
  start,
  stop,
  subscribe,
  markLatestSeen,
  clearSession
}
