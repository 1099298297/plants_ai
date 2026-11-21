const notifier = require('../../utils/adminOrderNotifier')

const STATUS_META = {
  pending: { text: '未支付', className: 'pending' },
  paid: { text: '已支付', className: 'paid' },
  shipped: { text: '已发货', className: 'shipped' },
  completed: { text: '已完成', className: 'completed' },
  cancelled: { text: '已取消', className: 'cancelled' }
}

function firstImage(image) {
  if (Array.isArray(image)) return image[0] || ''
  return typeof image === 'string' ? image : ''
}

function formatOrder(order) {
  const meta = STATUS_META[order.status] || { text: '未知状态', className: '' }
  const items = Array.isArray(order.items) ? order.items : []
  const address = order.address || {}
  const addressText = address.fullAddress || [
    address.province,
    address.city,
    address.district,
    address.detail
  ].filter(Boolean).join('')

  return {
    ...order,
    displayNo: order._id ? order._id.slice(-14) : '-',
    statusText: meta.text,
    statusClass: meta.className,
    amountText: Number(order.totalPrice || 0).toFixed(2),
    itemCount: items.reduce((total, item) => total + Number(item.quantity || 0), 0),
    displayItems: items.slice(0, 2).map(item => ({
      ...item,
      displayImage: firstImage(item.image)
    })),
    allItems: items.map((item, index) => ({
      ...item,
      lineKey: `${item.productId || 'item'}-${index}`,
      displayImage: firstImage(item.image)
    })),
    productSummary: items.map(item => `${item.name} ×${item.quantity}`).join('、') || '商品信息缺失',
    restItemCount: Math.max(0, items.length - 2),
    addressText: addressText || '未填写收货地址',
    receiverText: [address.name, address.phone].filter(Boolean).join('  '),
    createTimeText: order.createTime || '时间未知',
    canMarkPaid: order.status === 'pending',
    canShip: order.status === 'paid',
    canComplete: order.status === 'shipped'
  }
}

Page({
  data: {
    checking: true,
    isAdmin: false,
    currentOpenid: '',
    templateId: '',
    notificationStatus: 'unknown',
    notificationStatusText: '未授权',
    activeCount: 0,
    searchInput: '',
    searchKeyword: '',
    statusTabs: [
      { key: '', label: '全部' },
      { key: 'pending', label: '未支付' },
      { key: 'paid', label: '已支付' },
      { key: 'shipped', label: '已发货' },
      { key: 'completed', label: '已完成' },
      { key: 'cancelled', label: '已取消' }
    ],
    activeStatus: '',
    orders: [],
    page: 0,
    pageSize: 1,
    pageCount: 0,
    pageNumbers: [],
    total: 0,
    hasMore: false,
    loading: false,
    showOrderDetail: false,
    detailOrder: null,
    detailItems: []
  },

  onLoad() {
    this.unsubscribe = notifier.subscribe(session => {
      this.handleSessionChange(session)
    })
  },

  onShow() {
    this.pageVisible = true
    notifier.start()
    this.loadAdminSession()
  },

  onHide() {
    this.pageVisible = false
  },

  onUnload() {
    this.pageVisible = false
    if (this.unsubscribe) this.unsubscribe()
  },

  async onPullDownRefresh() {
    const currentStatus = this.data.activeStatus
    const currentPage = this.data.page
    await this.loadAdminSession(currentStatus, currentPage)
    wx.stopPullDownRefresh()
  },

  async loadAdminSession(statusOverride, pageOverride) {
    this.setData({ checking: true })
    let session
    try {
      const res = await wx.cloud.callFunction({
        name: 'adminOrder',
        data: { action: 'session' }
      })
      session = res.result || {}
    } catch (err) {
      console.error('验证管理员身份失败:', err)
      session = { isAdmin: false, msg: '管理服务暂不可用' }
    }

    if (!session || !session.isAdmin) {
      this.setData({
        checking: false,
        isAdmin: false,
        currentOpenid: (session && session.openid) || wx.getStorageSync('user_openid') || ''
      })
      return
    }

    this.lastLatestId = session.latestActive ? session.latestActive._id : ''
    if (this.lastLatestId) {
      notifier.markLatestSeen(this.lastLatestId)
    }

    this.setData({
      checking: false,
      isAdmin: true,
      templateId: session.templateId || '',
      activeCount: session.activeCount || 0
    })

    this.loadNotificationStatus(session.templateId)
    const status = typeof statusOverride === 'string'
      ? statusOverride
      : this.data.activeStatus
    await this.loadOrders(true, true, status, pageOverride)
  },

  handleSessionChange(session) {
    if (!session || !session.isAdmin) return
    const latestId = session.latestActive ? session.latestActive._id : ''
    const changed = latestId !== this.lastLatestId
    this.lastLatestId = latestId

    this.setData({
      activeCount: session.activeCount || 0,
      templateId: session.templateId || this.data.templateId
    })

    if (changed && this.pageVisible && !this.data.loading) {
      this.loadOrders(true, true, this.data.activeStatus, this.data.page)
    }
  },

  async loadOrders(reset, silent, statusOverride, pageOverride) {
    // 加载更多时避免重复请求；切换筛选或下拉刷新时允许覆盖旧请求。
    if (!reset && this.data.loading) return

    const page = Number.isInteger(pageOverride)
      ? pageOverride
      : (reset ? 0 : this.data.page)
    const requestedStatus = typeof statusOverride === 'string'
      ? statusOverride
      : this.data.activeStatus
    const requestedKeyword = this.data.searchKeyword
    const requestSeq = (this.listRequestSeq || 0) + 1
    this.listRequestSeq = requestSeq
    this.setData({ loading: true })
    if (!silent) wx.showNavigationBarLoading()

    try {
      const res = await wx.cloud.callFunction({
        name: 'adminOrder',
        data: {
          action: 'list',
          page,
          pageSize: this.data.pageSize,
          status: requestedStatus,
          keyword: requestedKeyword
        }
      })
      const result = res.result || {}

      // 筛选条件已变化时，丢弃上一笔迟到请求的结果。
      if (requestSeq !== this.listRequestSeq || requestedStatus !== this.data.activeStatus) {
        return
      }
      if (requestedKeyword !== this.data.searchKeyword) return

      if (requestedKeyword && result.searchKeyword !== requestedKeyword) {
        this.setData({ orders: [], total: 0, pageCount: 0, pageNumbers: [] })
        wx.showModal({
          title: '查询服务未更新',
          content: '当前云函数仍是不支持单号查询的旧版本，请重新部署 adminOrder 云函数。',
          showCancel: false
        })
        return
      }

      if (!result.isAdmin) {
        this.setData({ isAdmin: false, orders: [] })
        return
      }

      const formatted = (result.orders || []).map(formatOrder)
      const total = result.total || 0
      const pageCount = Math.max(1, Math.ceil(total / this.data.pageSize))
      const safePage = Math.min(page, pageCount - 1)

      if (safePage !== page) {
        this.loadOrders(true, true, requestedStatus, safePage)
        return
      }

      this.setData({
        orders: reset ? formatted : this.data.orders.concat(formatted),
        page: result.page || page,
        total,
        pageCount,
        pageNumbers: this.buildPageNumbers(safePage, pageCount),
        hasMore: false
      })
    } catch (err) {
      console.error('加载管理订单失败:', err)
      wx.showToast({ title: '订单加载失败', icon: 'none' })
    } finally {
      if (requestSeq === this.listRequestSeq) {
        this.setData({ loading: false })
        if (!silent) wx.hideNavigationBarLoading()
      }
    }
  },

  changeStatus(e) {
    const status = e.currentTarget.dataset.status || ''
    if (status === this.data.activeStatus) return
    this.setData({ activeStatus: status, orders: [] }, () => {
      this.loadOrders(true, false, status, 0)
    })
  },

  onSearchInput(e) {
    this.setData({ searchInput: e.detail.value })
  },

  searchOrders() {
    const input = String(this.data.searchInput || '').trim().replace(/^#/, '')
    if (!input) {
      this.clearSearch()
      return
    }
    this.setData({
      searchInput: input,
      searchKeyword: input,
      orders: [],
      page: 0
    }, () => {
      this.loadOrders(true, false, this.data.activeStatus, 0)
    })
  },

  clearSearch() {
    if (!this.data.searchKeyword && !this.data.searchInput) return
    this.setData({
      searchInput: '',
      searchKeyword: '',
      orders: [],
      page: 0
    }, () => {
      this.loadOrders(true, false, this.data.activeStatus, 0)
    })
  },

  buildPageNumbers(currentPage, pageCount) {
    const visibleCount = 5
    let start = Math.max(0, currentPage - Math.floor(visibleCount / 2))
    let end = Math.min(pageCount, start + visibleCount)
    start = Math.max(0, end - visibleCount)

    const pages = []
    for (let page = start; page < end; page += 1) {
      pages.push({
        page,
        label: page + 1,
        active: page === currentPage
      })
    }
    return pages
  },

  goToPage(e) {
    const page = Number(e.currentTarget.dataset.page)
    if (!Number.isInteger(page) || page < 0 || page >= this.data.pageCount) return
    if (page === this.data.page || this.data.loading) return
    this.setData({ page })
    this.loadOrders(true, false, this.data.activeStatus, page)
  },

  previousPage() {
    if (this.data.page <= 0 || this.data.loading) return
    const page = this.data.page - 1
    this.setData({ page })
    this.loadOrders(true, false, this.data.activeStatus, page)
  },

  nextPage() {
    if (this.data.page >= this.data.pageCount - 1 || this.data.loading) return
    const page = this.data.page + 1
    this.setData({ page })
    this.loadOrders(true, false, this.data.activeStatus, page)
  },

  openOrderDetail(e) {
    const orderId = e.currentTarget.dataset.id
    const detailOrder = this.data.orders.find(order => order._id === orderId)
    if (!detailOrder) return
    this.setData({
      detailOrder,
      detailItems: detailOrder.allItems || [],
      showOrderDetail: true
    })
  },

  closeOrderDetail() {
    this.setData({ showOrderDetail: false })
  },

  noop() {},

  previewDetailImage(e) {
    const current = e.currentTarget.dataset.url
    const urls = (this.data.detailItems || [])
      .map(item => item.displayImage)
      .filter(Boolean)
    if (!current || urls.length === 0) return
    wx.previewImage({ current, urls })
  },

  changeOrderStatus(e) {
    const orderId = e.currentTarget.dataset.id
    const action = e.currentTarget.dataset.action
    const modalConfig = {
      markPaid: {
        title: '标记已支付',
        content: '确认后订单状态将变为已支付，不会改变支付方式。'
      },
      ship: {
        title: '确认发货',
        content: '发货后订单将进入“已发货”状态。'
      },
      complete: {
        title: '完成订单',
        content: '用户可能忘记确认完成，确认已送达后可由管理员代为完成。'
      }
    }
    const config = modalConfig[action]
    if (!config) return

    wx.showModal({
      title: config.title,
      content: config.content,
      confirmText: '确认',
      success: res => {
        if (res.confirm) this.submitOrderAction(orderId, action)
      }
    })
  },

  async submitOrderAction(orderId, action) {
    wx.showLoading({ title: '处理中', mask: true })
    try {
      const res = await wx.cloud.callFunction({
        name: 'adminOrder',
        data: { action, orderId }
      })
      const result = res.result || {}
      wx.hideLoading()

      if (!result.success) {
        wx.showToast({ title: result.msg || '操作失败', icon: 'none' })
        return
      }

      const successText = {
        markPaid: '已标记支付',
        ship: '已发货',
        complete: '已完成'
      }[action] || '操作成功'
      wx.showToast({ title: successText, icon: 'success' })
      await notifier.refresh({ force: true, notify: false })
      await this.loadOrders(true, true, this.data.activeStatus, this.data.page)
    } catch (err) {
      wx.hideLoading()
      console.error('管理订单失败:', err)
      wx.showToast({ title: '操作失败，请重试', icon: 'none' })
    }
  },

  loadNotificationStatus(templateId) {
    if (!templateId) {
      this.setData({
        notificationStatus: 'not_configured',
        notificationStatusText: '未配置'
      })
      return
    }

    wx.getSetting({
      withSubscriptions: true,
      success: res => {
        const settings = res.subscriptionsSetting || {}
        const itemSettings = settings.itemSettings || {}
        const status = itemSettings[templateId] || 'unknown'
        this.setData({
          notificationStatus: status,
          notificationStatusText: this.getNotificationStatusText(status)
        })
      }
    })
  },

  getNotificationStatusText(status) {
    const map = {
      accept: '已授权',
      reject: '已拒绝',
      ban: '已被禁用',
      not_configured: '未配置',
      unknown: '未授权'
    }
    return map[status] || '未授权'
  },

  requestOrderNotification() {
    const templateId = this.data.templateId
    if (!templateId) {
      wx.showModal({
        title: '还未配置模板',
        content: '请先在微信公众平台选择“新订单提醒”订阅消息模板，并把模板 ID 配置到云函数环境变量 ORDER_ADMIN_TEMPLATE_ID。',
        showCancel: false
      })
      return
    }

    wx.requestSubscribeMessage({
      tmplIds: [templateId],
      success: res => {
        const status = res[templateId] || 'reject'
        this.setData({
          notificationStatus: status,
          notificationStatusText: this.getNotificationStatusText(status)
        })
        if (status === 'accept') {
          wx.showToast({ title: '订单提醒已开启', icon: 'success' })
        } else {
          wx.showToast({ title: '未开启系统提醒', icon: 'none' })
        }
      },
      fail: err => {
        console.error('订阅订单提醒失败:', err)
        if (err.errCode === 20004) {
          wx.showModal({
            title: '订阅消息已关闭',
            content: '请在“设置页 → 订阅消息”中允许接收订单提醒。',
            showCancel: false
          })
          return
        }
        wx.showToast({ title: '授权失败，请重试', icon: 'none' })
      }
    })
  },

  copyOpenid() {
    if (!this.data.currentOpenid) return
    wx.setClipboardData({ data: this.data.currentOpenid })
  },

  retryAccess() {
    this.loadAdminSession()
  }
})
