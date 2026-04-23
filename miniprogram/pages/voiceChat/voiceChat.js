Page({
  data: {
    chatList: [],
    isRecording: false,
    scrollToMessage: '',
    baiduToken: '',
    baiduTokenExpireTime: 0,
    recordDuration: 5, // 秒
    recordRate: 16000,
    inputText: '' // 新增：输入框文本
  },

  onLoad: function() {
    this.getBaiduToken();
  },

  getBaiduToken: function() {
    const API_KEY = 'VsXsqn2dyhR6O1bWHKPcsgPi';
    const SECRET_KEY = '3qoc9gNJbdFr8OrtWbzzGribb3nX9i8R';
    
    wx.request({
      url: 'https://aip.baidubce.com/oauth/2.0/token',
      method: 'GET',
      data: {
        grant_type: 'client_credentials',
        client_id: API_KEY,
        client_secret: SECRET_KEY
      },
      success: (res) => {
        if (res.data && res.data.access_token) {
          this.setData({
            baiduToken: res.data.access_token,
            baiduTokenExpireTime: Date.now() + (res.data.expires_in - 60) * 1000
          });
          console.log('获取百度token成功');
        } else {
          console.error('获取百度token失败：', res.data);
        }
      },
      fail: (error) => {
        console.error('获取百度token请求失败：', error);
      }
    });
  },

  startRecord: function() {
    this.setData({ isRecording: true });
    
    const recorderManager = wx.getRecorderManager();
    
    recorderManager.onStart(() => {
      console.log('🎤 正在录音...');
    });
    
    recorderManager.onError((res) => {
      console.error('录音错误：', res);
      this.setData({ isRecording: false });
      wx.showToast({ title: '录音失败', icon: 'none' });
    });

    recorderManager.onStop((res) => {
      console.log('✅ 录音完成，路径：', res.tempFilePath);
      this.setData({ isRecording: false });
      
      // 直接读取录音文件
      wx.getFileSystemManager().readFile({
        filePath: res.tempFilePath,
        success: (res) => {
          this.recognizeSpeech(res.data);
        },
        fail: (error) => {
          console.error('读取失败：', error);
          wx.showToast({ title: '处理录音失败', icon: 'none' });
        }
      });
    });

    // 录音参数 - 直接使用PCM格式
    recorderManager.start({
      duration: this.data.recordDuration * 1000,
      sampleRate: this.data.recordRate,
      numberOfChannels: 1,
      encodeBitRate: 48000,
      format: 'pcm',
      frameSize: 2
    });
  },

  stopRecord: function() {
    if (this.data.isRecording) {
      wx.getRecorderManager().stop();
    }
  },

  recognizeSpeech: function(audioData) {
    if (Date.now() >= this.data.baiduTokenExpireTime) {
      this.getBaiduToken();
      wx.showToast({ title: '请稍后重试', icon: 'none' });
      return;
    }

    if (!audioData) {
      console.error('无效音频');
      wx.showToast({ title: '音频数据无效', icon: 'none' });
      return;
    }

    // 将音频数据转换为base64
    const base64Data = wx.arrayBufferToBase64(audioData);
    
    // 计算音频数据长度
    const audioLength = audioData.byteLength;
    
    console.log('音频数据信息：', {
      length: audioLength,
      sampleRate: this.data.recordRate,
      format: 'pcm'
    });

    const requestData = {
      format: 'pcm',
      rate: this.data.recordRate,
      channel: 1,
      cuid: 'WECHAT_MINI_PROGRAM',
      token: this.data.baiduToken,
      len: audioLength,
      speech: base64Data,
      dev_pid: 1537
    };

    console.log('📤 发送百度语音识别请求...');

    wx.request({
      url: 'https://vop.baidu.com/server_api',
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: requestData,
      success: (res) => {
        console.log('语音识别结果：', res.data);
        if (res.data && res.data.err_no === 0) {
          const text = res.data.result ? res.data.result.join('') : '';
          if (text.trim() === '') {
            wx.showToast({ title: '未识别到语音', icon: 'none' });
          } else {
            this.addMessage(text, 'user');
            // 语音识别成功后，调用千问接口
            this.askQwen(text);
          }
        } else {
          console.error('识别失败：', res.data);
          if (res.data.err_no === 3302) {
            wx.showToast({ title: '语音识别服务未开通', icon: 'none' });
          } else if (res.data.err_no === 3314) {
            console.error('音频长度不匹配：', {
              length: audioLength
            });
            wx.showToast({ title: '音频长度无效', icon: 'none' });
          } else {
            wx.showToast({ title: res.data.err_msg || '识别失败', icon: 'none' });
          }
        }
      },
      fail: (error) => {
        console.error('请求失败：', error);
        wx.showToast({ title: '识别请求失败', icon: 'none' });
      }
    });
  },

  // 替换原来的 askDoubao 函数为 askQwen
  askQwen: function(question) {
    wx.request({
      url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', // 阿里云百炼API兼容地址
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sk-7f4f77cdbbc844f0b288159c465ebef6' // 你的千问 API Key
      },
      data: {
        model: 'qwen-turbo', // 使用千问模型
        messages: [
          {
            role: 'system',
            content: '请用简洁的语言回答问题，突出重点信息，避免冗长的解释。'
          },
          {
            role: 'user',
            content: question // 千问直接传字符串即可
          }
        ]
      },
      success: (res) => {
        // 增加状态码判断，方便排查欠费或超限问题
        if (res.statusCode !== 200) {
          console.error('通义千问API请求错误：', res.data);
          wx.showToast({ title: 'AI接口报错，请检查控制台', icon: 'none' });
          return;
        }

        if (res.data && res.data.choices && res.data.choices[0]) {
          const answer = res.data.choices[0].message.content;
          this.addMessage(answer, 'bot');
        } else {
          wx.showToast({ title: '获取回答失败', icon: 'none' });
        }
      },
      fail: (error) => {
        console.error('千问请求网络失败：', error);
        wx.showToast({ title: '网络异常，获取回答失败', icon: 'none' });
      }
    });
  },

  addMessage: function(content, type) {
    const chatList = this.data.chatList;
    chatList.push({ content, type });
    this.setData({
      chatList,
      scrollToMessage: `msg-${chatList.length - 1}`
    });
  },

  // 处理输入框内容变化
  onInputChange: function(e) {
    this.setData({
      inputText: e.detail.value
    });
  },

  // 发送文本消息
  sendTextMessage: function() {
    const text = this.data.inputText.trim();
    if (!text) {
      return;
    }

    // 添加用户消息到聊天列表
    this.addMessage(text, 'user');
    
    // 清空输入框
    this.setData({
      inputText: ''
    });

    // 调用千问API获取回答
    this.askQwen(text);
  }
});