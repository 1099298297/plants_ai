Page({
  data: {
    address: {
      id: '',
      name: '',
      phone: '',
      province: '',
      city: '',
      district: '',
      detail: '',
      latitude: null,    // 新增经纬度字段（可选）
      longitude: null,
      isDefault: false
    },
    region: ['', '', '']
  },

  onLoad(options) {
    if (options.id) {
      const addresses = wx.getStorageSync('addresses') || [];
      const address = addresses.find(addr => addr.id === options.id);
      
      if (address) {
        // 兼容旧数据没有经纬度
        this.setData({
          address: {
            ...address,
            latitude: address.latitude || null,
            longitude: address.longitude || null
          },
          region: [address.province, address.city, address.district]
        });
      }
    }
  },


  // 输入收货人姓名
  inputName(e) {
    this.setData({
      'address.name': e.detail.value
    });
  },

  // 输入手机号码
  inputPhone(e) {
    this.setData({
      'address.phone': e.detail.value
    });
  },

  // 选择地区
  regionChange(e) {
    const [province, city, district] = e.detail.value;
    this.setData({
      region: [province, city, district],
      'address.province': province,
      'address.city': city,
      'address.district': district
    });
  },

  // 输入详细地址
  inputDetail(e) {
    this.setData({
      'address.detail': e.detail.value
    });
  },

  // 切换默认地址
  switchDefault(e) {
    this.setData({
      'address.isDefault': e.detail.value
    });
  },

  chooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        console.log('地图选点结果', res);
  
        // 1. 拼接详细地址（保留原逻辑）
        let fullDetail = '';
        if (res.name && res.address) {
          fullDetail = `${res.name}，${res.address}`;
        } else if (res.name) {
          fullDetail = res.name;
        } else if (res.address) {
          fullDetail = res.address;
        }
  
        // 2. 从 res.address 解析省市区
        const { province, city, district } = parseRegionFromAddress(res.address);
  
        // 3. 一次性更新数据
        this.setData({
          'address.detail': fullDetail,
          'address.latitude': res.latitude,
          'address.longitude': res.longitude,
          // 省市区信息
          region: [province, city, district],
          'address.province': province,
          'address.city': city,
          'address.district': district
        });
  
        // 如果解析失败，提示用户可手动选择（但不影响保存，后续验证会拦截）
        if (!province && !city) {
          wx.showToast({ title: '地址解析失败，请手动选择地区', icon: 'none', duration: 2000 });
        }
      },
      fail: (err) => {
        if (err.errMsg.indexOf('cancel') === -1) {
          wx.showModal({
            title: '需要位置权限',
            content: '请在设置中开启位置权限，以便使用地图选点功能',
            confirmText: '去设置',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.openSetting();
              }
            }
          });
        }
      }
    });
  },

  // 保存地址时无需大改，但如果有经纬度一并保存
  saveAddress() {
    const { address } = this.data;
    
    // 表单验证（不变）
    if (!address.name) {
      wx.showToast({ title: '请输入收货人姓名', icon: 'none' });
      return;
    }
    if (!address.phone) {
      wx.showToast({ title: '请输入手机号码', icon: 'none' });
      return;
    }
    if (!/^1\d{10}$/.test(address.phone)) {
      wx.showToast({ title: '手机号码格式不正确', icon: 'none' });
      return;
    }
    if (!address.province) {
      wx.showToast({ title: '请选择所在地区', icon: 'none' });
      return;
    }
    if (!address.detail) {
      wx.showToast({ title: '请填写详细地址', icon: 'none' });
      return;
    }

    const addresses = wx.getStorageSync('addresses') || [];
    
    if (address.id) {
      const index = addresses.findIndex(addr => addr.id === address.id);
      if (index > -1) {
        addresses[index] = address;
      }
    } else {
      address.id = Date.now().toString();
      addresses.push(address);
    }

    if (address.isDefault) {
      addresses.forEach(addr => {
        if (addr.id !== address.id) addr.isDefault = false;
      });
    } else if (addresses.length === 1) {
      address.isDefault = true;
    }

    wx.setStorageSync('addresses', addresses);
    
    wx.showToast({ title: '保存成功', icon: 'success' });
    setTimeout(() => { wx.navigateBack(); }, 1500);
  },
  
});

/**
 * 从微信地图返回的地址字符串中提取省市区
 * 支持：省、自治区、直辖市、特别行政区
 */
function parseRegionFromAddress(addressStr) {
  if (!addressStr) return { province: '', city: '', district: '' };

  // 特别行政区（香港、澳门）
  const sarList = ['香港特别行政区', '澳门特别行政区'];
  for (let sar of sarList) {
    if (addressStr.startsWith(sar)) {
      return {
        province: sar,
        city: sar,
        district: ''
      };
    }
  }

  // 直辖市（北京、天津、上海、重庆）
  const municipalityList = ['北京市', '天津市', '上海市', '重庆市'];
  for (let m of municipalityList) {
    if (addressStr.startsWith(m)) {
      // 格式如：北京市朝阳区xxx → city = 北京市，district = 朝阳区
      const afterCity = addressStr.substring(m.length);
      const districtMatch = afterCity.match(/^([^/]+?[区县])/); // 捕获第一个区或县
      const district = districtMatch ? districtMatch[1] : '';
      return {
        province: m,
        city: m,
        district: district
      };
    }
  }

  // 普通省份/自治区
  const provRegex = /^(.+?[省])/;
  const provMatch = addressStr.match(provRegex);
  if (provMatch) {
    const province = provMatch[1];
    const afterProv = addressStr.substring(province.length);
    // 提取市
    const cityRegex = /^(.+?[市])/;
    const cityMatch = afterProv.match(cityRegex);
    const city = cityMatch ? cityMatch[1] : '';
    const afterCity = cityMatch ? afterProv.substring(city.length) : afterProv;
    // 提取区县
    const districtMatch = afterCity.match(/^(.+?[区县])/);
    const district = districtMatch ? districtMatch[1] : '';
    return { province, city, district };
  }

  // 没有省份，可能为省直辖县级市（如“仙桃市xxx”）
  const directCityRegex = /^(.+?[市])/;
  const directCityMatch = addressStr.match(directCityRegex);
  if (directCityMatch) {
    const city = directCityMatch[1];
    const afterCity = addressStr.substring(city.length);
    const districtMatch = afterCity.match(/^(.+?[区县])/);
    const district = districtMatch ? districtMatch[1] : '';
    return { province: '', city, district };
  }

  // 无法识别
  return { province: '', city: '', district: '' };
}