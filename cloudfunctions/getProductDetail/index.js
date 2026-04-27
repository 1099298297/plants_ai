// 云函数：获取单个商品详情（实时库存）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { id } = event
  console.log("前端传的id =", id)

  if (!id) {
    return { success: false, msg: '缺少商品ID' }
  }

  try {
    // 转成数字（因为你数据库是 number）
    const productId = Number(id)

    // ✅ 关键：查数据库的 id 字段
    const res = await db.collection('products')
      .where({ 
        id: productId 
      })
      .limit(1)
      .get()

    console.log("查到的数据 =", res.data)

    if (res.data.length === 0) {
      return { success: false, msg: '商品不存在' }
    }

    return {
      success: true,
      data: res.data[0]
    }
  } catch (e) {
    console.error(e)
    return { success: false, msg: '获取失败' }
  }
}