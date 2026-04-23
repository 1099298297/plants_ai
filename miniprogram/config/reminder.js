/**
 * 提醒功能配置文件
 * 
 * 此文件包含提醒功能的所有配置参数，包括：
 * - 订阅消息模板ID
 * - 提醒类型定义
 * - 频率选项
 * - 通知设置
 * - 数据库集合名
 * - 其他系统配置
 * 
 * 注意：此文件只包含配置数据，不包含业务逻辑
 * 业务逻辑请查看 utils/reminder.js
 */

// 提醒配置文件
const reminderConfig = {
  // 订阅消息模板ID（需要在微信公众平台申请）
  subscribeMessageTemplates: {
    plantCare: 'rdR5h0pOGbZBA_6uAzoz544Lye-cUxtPniOKf775FHU' // 植物养护提醒模板ID
  },
  
  // 提醒类型配置
  reminderTypes: {
    watering: {
      label: '浇水',
      icon: '/images/maintenance/plant-mister.png',
      defaultFrequency: 'weekly',
      defaultDescription: '请为植物浇水，保持土壤湿润',
      color: '#2196F3',
      priority: 1
    },
    fertilizing: {
      label: '施肥',
      icon: '/images/maintenance/plant-food.png',
      defaultFrequency: 'monthly',
      defaultDescription: '请为植物施肥，提供营养',
      color: '#FF9800',
      priority: 2
    },
    lighting: {
      label: '光照调整',
      icon: '/images/maintenance/grow-light.png',
      defaultFrequency: 'weekly',
      defaultDescription: '请调整植物光照，确保充足阳光',
      color: '#FFC107',
      priority: 3
    },
    pruning: {
      label: '修剪',
      icon: '/images/maintenance/pruning-shears.png',
      defaultFrequency: 'monthly',
      defaultDescription: '请修剪植物，保持美观',
      color: '#4CAF50',
      priority: 4
    },
    pestControl: {
      label: '病虫防治',
      icon: '/images/maintenance/gardening-tools.png',
      defaultFrequency: 'weekly',
      defaultDescription: '请检查植物健康状况，防治病虫害',
      color: '#F44336',
      priority: 5
    },
    repotting: {
      label: '换盆',
      icon: '/images/maintenance/gardening-tools.png',
      defaultFrequency: 'custom',
      defaultDescription: '请为植物换盆，提供更好的生长环境',
      color: '#9C27B0',
      priority: 6
    }
  },
  
  // 频率选项
  frequencyOptions: [
    { label: '只提醒一次', value: 'once', days: 0, description: '仅提醒一次' },
    { label: '每天', value: 'daily', days: 1, description: '每天提醒' },
    { label: '每周', value: 'weekly', days: 7, description: '每周提醒一次，可选择星期几' },
    { label: '自定义', value: 'custom', days: 7, description: '自定义间隔天数' }
  ],
  
  // 默认提醒时间
  defaultReminderTime: '09:00',
  
  // 提醒提前时间（分钟）
  advanceReminderMinutes: 30,
  
  // 本地存储键名
  storageKeys: {
    localReminders: 'localReminders',
    reminderSettings: 'reminderSettings',
    subscriptionStatus: 'subscriptionStatus'
  },
  
  // 通知配置
  notification: {
    sound: null, // 暂时禁用音频文件，避免文件不存在错误
    vibration: true,
    showToast: true,
    showModal: true,
    autoClose: 5000, // 自动关闭时间（毫秒）
    maxRetries: 3 // 最大重试次数
  },
  
  // 云函数配置
  cloudFunctions: {
    plantReminder: 'plantReminder',
    plantReminderTrigger: 'plantReminderTrigger'
  },
  
  // 数据库集合名
  collections: {
    userPlants: 'user_plants',
    plantReminders: 'plant_reminders',
    users: 'users'
  },
  
  // 提醒状态
  reminderStatus: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    EXPIRED: 'expired',
    COMPLETED: 'completed'
  },
  
  // 订阅消息状态
  subscriptionStatus: {
    ACCEPT: 'accept',
    REJECT: 'reject',
    BAN: 'ban'
  },
  
  // 错误码
  errorCodes: {
    USER_NOT_SUBSCRIBED: 43101,
    TEMPLATE_NOT_FOUND: 40037,
    INVALID_OPENID: 40013
  },
  
  // 时间格式化
  timeFormat: {
    date: 'YYYY-MM-DD',
    time: 'HH:mm',
    datetime: 'YYYY-MM-DD HH:mm',
    display: 'MM月DD日 HH:mm'
  },
  
  // 提醒优先级
  priorities: {
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3
  },
  
  // 批量操作配置
  batchOperations: {
    maxBatchSize: 10,
    defaultTypes: ['watering', 'fertilizing', 'lighting']
  },
  
  // 缓存配置
  cache: {
    reminderList: 5 * 60 * 1000, // 5分钟
    plantInfo: 10 * 60 * 1000,   // 10分钟
    userSettings: 30 * 60 * 1000 // 30分钟
  },
  
  // 调试配置
  debug: {
    enabled: false,
    logLevel: 'info', // 'debug', 'info', 'warn', 'error'
    showConsoleLogs: true
  },
  
  // 性能配置
  performance: {
    maxLocalReminders: 100,
    maxUpcomingReminders: 10,
    cleanupInterval: 24 * 60 * 60 * 1000 // 24小时清理一次
  },
  
  // 国际化配置
  i18n: {
    defaultLanguage: 'zh-CN',
    supportedLanguages: ['zh-CN', 'en-US']
  },
  
  // 主题配置
  theme: {
    primaryColor: '#4CAF50',
    secondaryColor: '#2196F3',
    successColor: '#4CAF50',
    warningColor: '#FF9800',
    errorColor: '#F44336',
    textColor: '#333333',
    backgroundColor: '#F8F9FA'
  }
}

// 验证配置
function validateConfig() {
  const requiredFields = [
    'subscribeMessageTemplates.plantCare',
    'defaultReminderTime',
    'storageKeys.localReminders'
  ]
  
  for (const field of requiredFields) {
    const value = field.split('.').reduce((obj, key) => obj?.[key], reminderConfig)
    if (!value) {
      console.warn(`配置缺失: ${field}`)
    }
  }
}

// 开发环境下验证配置
if (reminderConfig.debug.enabled) {
  validateConfig()
}

module.exports = reminderConfig 