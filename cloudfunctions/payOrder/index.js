//payOrder/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  return {
    success: false,
    msg: '支付状态由管理员标记，不支持用户自行修改'
  }
}
