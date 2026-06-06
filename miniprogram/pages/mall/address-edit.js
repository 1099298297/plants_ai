// address-edit.js
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
      latitude: null,
      longitude: null,
      isDefault: false,
      fullAddress: ''   // 快递员直接可见的完整地址
    },
    region: ['', '', '']
  },

  onLoad(options) {
    if (options.id) {
      const addresses = wx.getStorageSync('addresses') || [];
      const address = addresses.find(addr => addr.id === options.id);
      if (address) {
        // 兼容旧数据：没有 fullAddress 或经纬度
        if (!address.fullAddress) {
          address.fullAddress = this.generateFullAddress(address);
        }
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

  // 地图选点
  chooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        console.log('地图选点结果', res);

        //1. 拼接详细地址：把 name 放在 address 后面
      let fullDetail = '';
      if (res.address && res.name) {
        // 如果 address 已经包含 name，则不再重复添加
        if (res.address.includes(res.name)) {
          fullDetail = res.address;
        } else {
          fullDetail = `${res.address}，${res.name}`;
        }
      } else if (res.address) {
        fullDetail = res.address;
      } else if (res.name) {
        fullDetail = res.name;
      }

        // 2. 从 res.address 解析省市区
        const { province, city, district } = parseRegionFromAddress(res.address);

        // 3. 一次性更新数据
        this.setData({
          'address.detail': fullDetail,
          'address.latitude': res.latitude,
          'address.longitude': res.longitude,
          region: [province, city, district],
          'address.province': province,
          'address.city': city,
          'address.district': district
        });

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

  /**
   * 生成完整地址（快递员直接可见）
   * 规则：若详细地址已包含省市区，则直接返回详细地址；否则拼接省市区+详细地址
   */
  generateFullAddress(addr) {
    const { province = '', city = '', district = '', detail = '' } = addr;
    const regionPart = (province + city + district).trim();
    const detailPart = detail.trim();
    if (!regionPart) return detailPart;
    if (!detailPart) return regionPart;
    // 避免重复：如果详细地址已经以省市区开头，直接返回详细地址
    if (detailPart.startsWith(regionPart)) {
      return detailPart;
    }
    return regionPart + detailPart;
  },

  // 保存地址
  saveAddress() {
    let { address } = this.data;

    // 表单验证
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

    // 生成完整地址
    address.fullAddress = this.generateFullAddress(address);
    // console.log(this.data);

    // 保存到本地存储
    let addresses = wx.getStorageSync('addresses') || [];
    if (address.id) {
      const index = addresses.findIndex(addr => addr.id === address.id);
      if (index > -1) {
        addresses[index] = address;
      }
    } else {
      address.id = Date.now().toString();
      addresses.push(address);
    }

    // 处理默认地址
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
  }
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
      return { province: sar, city: sar, district: '' };
    }
  }

  // 直辖市（北京、天津、上海、重庆）
  const municipalityList = ['北京市', '天津市', '上海市', '重庆市'];
  for (let m of municipalityList) {
    if (addressStr.startsWith(m)) {
      const afterCity = addressStr.substring(m.length);
      const districtMatch = afterCity.match(/^(.+?(?:自治[区县旗]|林区|特区|[市区县旗]))/);
      const district = districtMatch ? districtMatch[1] : '';
      return { province: m, city: m, district };
    }
  }

  // 自治区（广西、内蒙古、西藏、宁夏、新疆）
  const autonomousRegex = /^(.+?自治区)/;
  const autoMatch = addressStr.match(autonomousRegex);
  if (autoMatch) {
    const province = autoMatch[1];
    const afterProv = addressStr.substring(province.length);
    const cityRegex = /^(.+?[市])/;
    const cityMatch = afterProv.match(cityRegex);
    const city = cityMatch ? cityMatch[1] : '';
    const afterCity = cityMatch ? afterProv.substring(city.length) : afterProv;
    const districtMatch = afterCity.match(/^(.+?(?:自治[区县旗]|林区|特区|[市区县旗]))/);
    const district = districtMatch ? districtMatch[1] : '';
    return { province, city, district };
  }

  // 普通省份
  const provRegex = /^(.+?[省])/;
  const provMatch = addressStr.match(provRegex);
  if (provMatch) {
    const province = provMatch[1];
    const afterProv = addressStr.substring(province.length);
    const cityRegex = /^(.+?[市])/;
    const cityMatch = afterProv.match(cityRegex);
    const city = cityMatch ? cityMatch[1] : '';
    const afterCity = cityMatch ? afterProv.substring(city.length) : afterProv;
    const districtMatch = afterCity.match(/^(.+?(?:自治[区县旗]|林区|特区|[市区县旗]))/);
    const district = districtMatch ? districtMatch[1] : '';
    return { province, city, district };
  }

  // 省直辖县级市（如“仙桃市xxx”）
  const directCityRegex = /^(.+?[市])/;
  const directCityMatch = addressStr.match(directCityRegex);
  if (directCityMatch) {
    const city = directCityMatch[1];
    const afterCity = addressStr.substring(city.length);
    const districtMatch = afterCity.match(/^(.+?(?:自治[区县旗]|林区|特区|[市区县旗]))/);
    const district = districtMatch ? districtMatch[1] : '';
    return { province: '', city, district };
  }

  // 无法识别
  return { province: '', city: '', district: '' };
}