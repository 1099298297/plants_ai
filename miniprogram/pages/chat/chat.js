// pages/chat/chat.js
// 注意：生产环境请将 API_KEY 放在后端
const API_KEY = 'sk-7f4f77cdbbc844f0b288159c465ebef6';
const MODEL_NAME = 'qwen-vl-max';
const API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

Page({
  data: {
    messages: [],
    inputText: '',
    tempImagePath: '',
    isLoading: false,
    scrollToView: '',
    keyboardHeight: 0,    // 键盘高度
    inputBarHeight: 0,    // 输入栏实际高度
    bottomHeight: 0       // 消息列表 bottom 值 = inputBarHeight + keyboardHeight
  },

  onLoad() {
    this.clearAllHistory();
    // 监听全局键盘高度变化（最稳定）
    this.keyboardListener = wx.onKeyboardHeightChange((res) => {
      this.setData({ keyboardHeight: res.height });
      this.updateBottomHeight();
      if (res.height > 0) {
        setTimeout(() => this.scrollToBottom(), 150);
      }
    });
    // 获取初始输入栏高度
    this.updateInputBarHeight();
  },

  onUnload() {
    // 移除全局键盘监听
    if (this.keyboardListener) {
      this.keyboardListener();
    }
  },

  // ---------- 历史清空 ----------
  clearAllHistory() {
    const oldMessages = wx.getStorageSync('plant_chat') || [];
    const fs = wx.getFileSystemManager();
    oldMessages.forEach(msg => {
      if (msg.imagePath) {
        try { fs.unlinkSync(msg.imagePath); } catch (e) {}
      }
    });
    wx.removeStorageSync('plant_chat');
    this.setData({ messages: [] });
  },

  // ---------- 动态高度计算 ----------
  updateInputBarHeight() {
    const query = wx.createSelectorQuery();
    query.select('.input-bar').boundingClientRect(rect => {
      if (rect && rect.height > 0) {
        this.setData({ inputBarHeight: rect.height }, () => {
          this.updateBottomHeight();
        });
      }
    }).exec();
  },

  updateBottomHeight() {
    const { inputBarHeight, keyboardHeight } = this.data;
    this.setData({ bottomHeight: inputBarHeight + keyboardHeight });
  },

  // ---------- 滚动到底部 ----------
  scrollToBottom() {
    const { messages } = this.data;
    if (messages.length > 0) {
      this.setData({ scrollToView: `msg-${messages[messages.length - 1].id}` });
    }
  },

  // ---------- 图片选择 ----------
  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({ tempImagePath: res.tempFiles[0].tempFilePath });
        // 选了图片后输入栏可能变高（出现预览缩略图）
        setTimeout(() => this.updateInputBarHeight(), 100);
      }
    });
  },

  removeImage() {
    this.setData({ tempImagePath: '' }, () => {
      setTimeout(() => this.updateInputBarHeight(), 100);
    });
  },

  // ---------- 图片压缩保存 ----------
  saveCompressedImage(tempPath) {
    return new Promise((resolve, reject) => {
      wx.getImageInfo({
        src: tempPath,
        success: (info) => {
          let w = info.width, h = info.height;
          const MAX = 512;
          if (w > MAX || h > MAX) {
            if (w > h) { h = Math.round((MAX / w) * h); w = MAX; }
            else { w = Math.round((MAX / h) * w); h = MAX; }
          }
          const canvas = wx.createOffscreenCanvas({ type: '2d', width: w, height: h });
          const ctx = canvas.getContext('2d');
          const img = canvas.createImage();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
            const base64 = dataUrl.split(',')[1];
            const buffer = wx.base64ToArrayBuffer(base64);
            const fileName = `plant_${Date.now()}.jpg`;
            const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
            wx.getFileSystemManager().writeFile({
              filePath,
              data: buffer,
              success: () => resolve(filePath),
              fail: reject
            });
          };
          img.onerror = reject;
          img.src = tempPath;
        },
        fail: reject
      });
    });
  },

  onInput(e) {
    this.setData({ inputText: e.detail.value });
  },

  // ---------- 发送消息 ----------
  async sendMessage() {
    const { inputText, tempImagePath } = this.data;
    if (!inputText && !tempImagePath) return;

    this.setData({ isLoading: true, inputText: '', scrollToView: '' });

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: inputText.trim(),
      timestamp: Date.now()
    };

    if (tempImagePath) {
      try {
        userMsg.imagePath = await this.saveCompressedImage(tempImagePath);
        userMsg._tempPath = tempImagePath;
      } catch (e) {
        wx.showToast({ title: '图片处理失败', icon: 'none' });
        this.setData({ isLoading: false });
        return;
      }
    }

    const messages = [...this.data.messages, userMsg];
    this.setData({ messages, tempImagePath: '', scrollToView: `msg-${userMsg.id}` });
    wx.setStorageSync('plant_chat', messages);

    // 清除预览图后输入栏高度变小，重新测量
    setTimeout(() => this.updateInputBarHeight(), 100);

    try {
      const apiMessages = this.buildApiMessages(messages);
      const reply = await this.callQwenVL(apiMessages);

      const assistantMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: reply,
        timestamp: Date.now() + 1
      };

      const updatedMessages = [...messages, assistantMsg];
      this.setData({ messages: updatedMessages, scrollToView: `msg-${assistantMsg.id}` });
      wx.setStorageSync('plant_chat', updatedMessages);
    } catch (e) {
      console.error('API 调用失败：', e);
      const errorMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: '抱歉，回答生成失败，请稍后重试。',
        timestamp: Date.now() + 1
      };
      const updatedMessages = [...messages, errorMsg];
      this.setData({ messages: updatedMessages });
      wx.setStorageSync('plant_chat', updatedMessages);
    } finally {
      this.setData({ isLoading: false });
      this.scrollToBottom();
    }
  },

  // ---------- API 构建 ----------
  buildApiMessages(currentMessages) {
    const systemPrompt = {
      role: 'system',
      content: `你是植物专家。只回答与植物识别、病虫害、养护相关的问题。
规则：
- 回答控制在300字以内，分点列出（例如：1.名称：xxx 2.问题：xxx 3.处理：xxx）
- 不要问候语、不要额外解释
- 如果用户未上传图片但问题需要图片，可先询问
- 超出范围的问题回复“请提问植物养护相关的问题”`
    };

    const recentMessages = currentMessages.slice(-6);
    const apiMessages = [systemPrompt];

    recentMessages.forEach(msg => {
      if (msg.role === 'user') {
        const content = [];
        if (msg.imagePath) {
          try {
            const base64 = this.getBase64FromFile(msg.imagePath);
            content.push({
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64}` }
            });
          } catch (e) {
            console.warn('读取图片失败，跳过', e);
          }
        }
        if (msg.content) {
          content.push({ type: 'text', text: msg.content });
        }
        if (content.length > 0) {
          apiMessages.push({ role: 'user', content });
        }
      } else {
        if (msg.content) {
          apiMessages.push({ role: 'assistant', content: msg.content });
        }
      }
    });
    return apiMessages;
  },

  getBase64FromFile(filePath) {
    const fs = wx.getFileSystemManager();
    const buffer = fs.readFileSync(filePath);
    return wx.arrayBufferToBase64(buffer);
  },

  callQwenVL(messages) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: API_URL,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        data: {
          model: MODEL_NAME,
          messages: messages,
          max_tokens: 200,
          temperature: 0.3
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data.choices && res.data.choices[0]) {
            resolve(res.data.choices[0].message.content);
          } else {
            reject(res);
          }
        },
        fail: reject
      });
    });
  },

  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({
      urls: [url],
      current: url
    });
  }
});