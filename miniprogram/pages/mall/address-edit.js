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
      isDefault: false
    },
    region: ['', '', '']
  },

  onLoad(options) {
    if (options.id) {
      // 编辑模式
      const addresses = wx.getStorageSync('addresses') || [];
      const address = addresses.find(addr => addr.id === options.id);
      
      if (address) {
        this.setData({
          address,
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

  // 保存地址
  saveAddress() {
    const { address } = this.data;
    
    // 表单验证
    if (!address.name) {
      wx.showToast({
        title: '请输入收货人姓名',
        icon: 'none'
      });
      return;
    }
    
    if (!address.phone) {
      wx.showToast({
        title: '请输入手机号码',
        icon: 'none'
      });
      return;
    }
    
    if (!/^1\d{10}$/.test(address.phone)) {
      wx.showToast({
        title: '手机号码格式不正确',
        icon: 'none'
      });
      return;
    }
    
    if (!address.province) {
      wx.showToast({
        title: '请选择所在地区',
        icon: 'none'
      });
      return;
    }
    
    if (!address.detail) {
      wx.showToast({
        title: '请输入详细地址',
        icon: 'none'
      });
      return;
    }

    // 获取现有地址列表
    const addresses = wx.getStorageSync('addresses') || [];
    
    if (address.id) {
      // 编辑模式
      const index = addresses.findIndex(addr => addr.id === address.id);
      if (index > -1) {
        addresses[index] = address;
      }
    } else {
      // 新增模式
      address.id = Date.now().toString();
      addresses.push(address);
    }

    // 如果设置为默认地址，需要将其他地址的默认状态取消
    if (address.isDefault) {
      addresses.forEach(addr => {
        if (addr.id !== address.id) {
          addr.isDefault = false;
        }
      });
    } else if (addresses.length === 1) {
      // 如果是第一个地址，自动设为默认
      address.isDefault = true;
    }

    // 保存地址列表
    wx.setStorageSync('addresses', addresses);
    
    wx.showToast({
      title: '保存成功',
      icon: 'success'
    });

    // 返回上一页
    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  }
}); 