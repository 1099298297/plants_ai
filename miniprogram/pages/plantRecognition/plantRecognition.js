Page({
  data: {
    tempImagePath: '',
    recognitionResult: '',
    isProcessing: false,
    plantType: null,
    isRecommendationExpanded: false,
    recommendedProducts: []
  },

  // 选择图片（拍照或从相册选择）
  chooseImage: function() {
    wx.showActionSheet({
      itemList: ['拍照', '从相册选择'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.takePhoto();
        } else if (res.tapIndex === 1) {
          this.chooseFromAlbum();
        }
      }
    });
  },

  // 拍照
  takePhoto: function() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      camera: 'back',
      success: (res) => {
        this.setData({
          tempImagePath: res.tempFiles[0].tempFilePath,
          recognitionResult: ''
        });
      },
      fail: (error) => {
        console.error('拍照失败：', error);
        wx.showToast({
          title: '拍照失败',
          icon: 'none'
        });
      }
    });
  },

  // 从相册选择
  chooseFromAlbum: function() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        this.setData({
          tempImagePath: res.tempFiles[0].tempFilePath,
          recognitionResult: ''
        });
      },
      fail: (error) => {
        console.error('选择图片失败：', error);
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    });
  },

  // // 将图片转换为base64并压缩
  // convertImageToBase64: function(imagePath) {
  //   return new Promise((resolve, reject) => {
  //     wx.getImageInfo({
  //       src: imagePath,
  //       success: (imageInfo) => {
  //         const canvas = wx.createOffscreenCanvas({
  //           type: '2d',
  //           width: imageInfo.width,
  //           height: imageInfo.height
  //         });
  //         const ctx = canvas.getContext('2d');
  //         const img = canvas.createImage();
  //         img.onload = () => {
  //           ctx.drawImage(img, 0, 0, imageInfo.width, imageInfo.height);
  //           const jpegData = canvas.toDataURL('image/jpeg', 0.8);
  //           const base64Data = jpegData.split(',')[1];
  //           resolve(base64Data);
  //         };
  //         img.onerror = (error) => {
  //           console.error('图片加载失败：', error);
  //           reject(error);
  //         };
  //         img.src = imagePath;
  //       },
  //       fail: (error) => {
  //         console.error('获取图片信息失败：', error);
  //         reject(error);
  //       }
  //     });
  //   });
  // },
  // 将图片转换为base64并进行【尺寸和质量的双重压缩】（大幅提速！）
  convertImageToBase64: function(imagePath) {
    return new Promise((resolve, reject) => {
      wx.getImageInfo({
        src: imagePath,
        success: (imageInfo) => {
          // ================= 核心提速修改：动态计算压缩尺寸 =================
          let targetWidth = imageInfo.width;
          let targetHeight = imageInfo.height;
          // 设定最大边长为 800 像素。对 AI 来说，800 像素看植物已经极其清晰了！
          const maxSize = 800; 

          if (targetWidth > maxSize || targetHeight > maxSize) {
            if (targetWidth > targetHeight) {
              targetHeight = Math.round((maxSize / targetWidth) * targetHeight);
              targetWidth = maxSize;
            } else {
              targetWidth = Math.round((maxSize / targetHeight) * targetWidth);
              targetHeight = maxSize;
            }
          }
          // =================================================================

          const canvas = wx.createOffscreenCanvas({
            type: '2d',
            width: targetWidth,  // 使用缩小后的宽
            height: targetHeight // 使用缩小后的高
          });
          const ctx = canvas.getContext('2d');
          const img = canvas.createImage();
          img.onload = () => {
            // 将巨大的原图，缩小绘制到小画布上
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
            
            // 质量压缩到 0.7，生成极小的 Base64 字符串
            const jpegData = canvas.toDataURL('image/jpeg', 0.7); 
            const base64Data = jpegData.split(',')[1];
            resolve(base64Data); // 这个数据传给 AI，速度会起飞！
          };
          img.onerror = (error) => {
            console.error('图片加载失败：', error);
            reject(error);
          };
          img.src = imagePath;
        },
        fail: (error) => {
          console.error('获取图片信息失败：', error);
          reject(error);
        }
      });
    });
  },

  // 识别植物
  recognizePlant: async function() {
    if (!this.data.tempImagePath) {
      wx.showToast({ title: '请先选择图片', icon: 'none' });
      return;
    }

    if (this.data.isProcessing) return; 

    this.setData({ isProcessing: true });
    wx.showLoading({ title: '识别中...', mask: true });

    try {
      const base64Data = await this.convertImageToBase64(this.data.tempImagePath);
      const response = await new Promise((resolve, reject) => {
        const requestData = {
          // ⚠️ 核心修改 1：必须换成通义千问的视觉模型（VL）才能识别图片
          "model": "qwen-vl-plus", // 也可以用 "qwen-vl-max"（更聪明但稍贵/慢一点）
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `请识别这张图片中的植物。请严格按照以下模板输出纯文字（绝对不要使用#、*等任何排版符号，请务必保留各项之间的换行）：

1.植物名称：[在此填写中英文名称]
2.科属分类：[在此填写科属]
3.生长状态：[在此填写健康状况和主要问题]
4.养护建议：[在此填写光照、浇水、温度等建议]`
                },
                {
                  type: 'image_url',
                  image_url: { url: `data:image/jpeg;base64,${base64Data}` }
                }
              ]
            }
          ]
        };

        wx.request({
          // ⚠️ 核心修改 2：换成阿里云百炼（DashScope）的 OpenAI 兼容接口地址
          url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
          method: 'POST',
          header: {
            'Content-Type': 'application/json',
            // ⚠️ 核心修改 3：使用你阿里云的 API Key（sk-开头这个是对的）
            'Authorization': 'Bearer sk-7f4f77cdbbc844f0b288159c465ebef6' 
          },
          data: requestData,
          success: (res) => {
            if (res.statusCode === 200) {
              resolve(res);
            } else {
              reject(new Error(`API Error: ${res.statusCode} - ${JSON.stringify(res.data)}`));
            }
          },
          fail: (error) => reject(error)
        });
      });
      
//       const response = await new Promise((resolve, reject) => {
//         const requestData = {
//           // "model": "ep-20260401095011-krqhp", // 你的接入点ID
//           "model": "qwen3.5-flash",
//           messages: [
//             {
//               role: 'user',
//               content: [
//                 {
//                   type: 'text',
//                   // ================= 核心修改 1：使用严密的填空模板 =================
//                   text: `请识别这张图片中的植物。请严格按照以下模板输出纯文字（绝对不要使用#、*等任何排版符号，请务必保留各项之间的换行）：

// 1.植物名称：[在此填写中英文名称]
// 2.科属分类：[在此填写科属]
// 3.生长状态：[在此填写健康状况和主要问题]
// 4.养护建议：[在此填写光照、浇水、温度等建议]`
//                   // =================================================================
//                 },
//                 {
//                   type: 'image_url',
//                   image_url: { url: `data:image/jpeg;base64,${base64Data}` }
//                 }
//               ]
//             }
//           ]
//         };

//         wx.request({
//           url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
//           method: 'POST',
//           header: {
//             'Content-Type': 'application/json',
//             // 'Authorization': 'Bearer 7a4696a4-f98d-4f14-b999-17aa454abca5' // 你的API Key
//             'Authorization': 'Bearer sk-7f4f77cdbbc844f0b288159c465ebef6' // 你的API Key
//           },
//           data: requestData,
//           success: (res) => {
//             if (res.statusCode === 200) {
//               resolve(res);
//             } else {
//               reject(new Error(`API Error: ${res.statusCode} - ${JSON.stringify(res.data)}`));
//             }
//           },
//           fail: (error) => reject(error)
//         });
//       });

      if (response.data && response.data.choices && response.data.choices[0] && response.data.choices[0].message) {
        
        const rawResult = response.data.choices[0].message.content;
        
        // 保底清理，防止 AI 依然带符号
        // let cleanResult = rawResult.replace(/#/g, '').replace(/\*/g, '').trim();
        let cleanResult = rawResult
          .replace(/#/g, '')         // 移除所有 # 
          .replace(/\*/g, '')        // 移除所有 * 
          .replace(/^- /gm, '')      // 移除每一行开头的 "- "
          .replace(/\n+/g, '\n')     // 第一步保底：先把所有多余的乱七八糟的换行都变成单换行
          .replace(/\n(2\.|3\.|4\.)/g, '\n\n$1') // 第二步核心：在 2. 3. 4. 的前面，强制加上一个空行！
          .trim();
        
        const extractedType = this.extractPlantType(cleanResult);
        const finalPlantType = extractedType || '未知植物';
        
        this.setData({
          recognitionResult: cleanResult, 
          plantType: finalPlantType
        });
        
        this.saveHistory(base64Data, cleanResult);
        await this.getRecommendedProducts();

      } else {
        throw new Error('Invalid API response format');
      }
    } catch (error) {
      console.error('识别失败：', error);
      wx.showToast({ title: '识别失败，请重试', icon: 'none', duration: 2000 });
    } finally {
      this.setData({ isProcessing: false });
      wx.hideLoading();
    }
  },

  // ================= 核心修改 2：针对新模板的精准正则提取 =================
  saveHistory: function(base64Data, aiResult) {
    try {
      let name = '未知', family = '未知', growthStatus = '暂无', careTips = '暂无';
      
      // 匹配 "1.植物名称：" 后面直到换行的内容
      const nameMatch = aiResult.match(/1\.植物名称[：:]\s*([^\n]*)/);
      if (nameMatch) name = nameMatch[1].trim();

      // 匹配 "2.科属分类：" 后面直到换行的内容
      const familyMatch = aiResult.match(/2\.科属分类[：:]\s*([^\n]*)/);
      if (familyMatch) family = familyMatch[1].trim();

      // 匹配 "3.生长状态：" 和 "4.养护建议：" 之间的多行内容
      const growthMatch = aiResult.match(/3\.生长状态[：:]\s*([\s\S]*?)(?=4\.|养护建议|$)/);
      if (growthMatch) growthStatus = growthMatch[1].trim();

      // 匹配 "4.养护建议：" 后面的所有内容
      const careMatch = aiResult.match(/4\.养护建议[：:]\s*([\s\S]*)$/);
      if (careMatch) careTips = careMatch[1].trim();

      const newRecord = {
        id: Date.now(),
        image: `data:image/jpeg;base64,${base64Data}`, 
        isExpanded: false,
        basicInfo: { name, family },
        details: [
          { title: '生长状态', content: growthStatus },
          { title: '关键养护建议', content: careTips }
        ],
        createTime: new Date().toLocaleString()
      };

      let historyList = wx.getStorageSync('recognitionHistory') || [];
      historyList.unshift(newRecord);
      if (historyList.length > 10) historyList = historyList.slice(0, 10); 
      wx.setStorageSync('recognitionHistory', historyList);

    } catch (parseError) {
      console.error('保存历史记录失败:', parseError);
    }
  },

  // 核心修改 3：针对新模板精准提取植物简短名称用于搜索商品
  extractPlantType(result) {
    if (!result) return null;
    // 只抓取名称里的中文字符，去掉英文、括号等，保证搜索精准度
    const match = result.match(/1\.植物名称[：:]\s*([^\n(（a-zA-Z]+)/);
    if (match && match[1]) {
      return match[1].trim();
    }
    return null;
  },
  // =====================================================================

  toggleRecommendation() {
    this.setData({ isRecommendationExpanded: !this.data.isRecommendationExpanded });
  },

  async getRecommendedProducts() {
    try {
      const pages = getCurrentPages();
      let allProducts = [];
      for (let i = pages.length - 1; i >= 0; i--) {
        if (pages[i].route === 'pages/mall/mall') {
          allProducts = pages[i].data.allProducts || [];
          break;
        }
      }

      if (!allProducts || allProducts.length === 0) {
        allProducts = [
          { id: 1, name: '多肉植物套装', price: 99, image: '/images/products/succulent-set/main.png', category: 'plants', tags: ['多肉', '室内'] },
          { id: 2, name: '园艺工具套装', price: 159, image: '/images/products/gardening-tools/main.png', category: 'tools', tags: ['工具', '园艺'] },
          { id: 3, name: '绿萝盆栽', price: 49, image: '/images/products/pothos/main.png', category: 'plants', tags: ['绿萝', '净化空气'] },
          { id: 4, name: '自动浇水器', price: 89, image: '/images/products/auto-watering/main.png', category: 'tools', tags: ['工具', '浇水'] }
        ];
      }

      const currentPlantTypeLower = (this.data.plantType || '').toLowerCase();

      let recommendedProducts = allProducts.filter(product => {
        if (product.category !== 'plants') return false;
        const productNameMatch = (product.name || '').toLowerCase().includes(currentPlantTypeLower);
        const productTagMatch = (product.tags || []).some(tag => (tag || '').toLowerCase().includes(currentPlantTypeLower));
        return productNameMatch || productTagMatch;
      });

      if (recommendedProducts.length === 0) {
        recommendedProducts = allProducts.filter(product => product.category === 'plants');
      }

      recommendedProducts = recommendedProducts.slice(0, 2);
      this.setData({ recommendedProducts });
    } catch (error) {
      console.error('获取推荐商品失败:', error);
    }
  },

  navigateToProduct(e) {
    const productId = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/mall/product-detail?id=${productId}` });
  },

  viewRelatedProducts() {
    if (this.data.plantType) {
      getApp().globalData = getApp().globalData || {};
      getApp().globalData.selectedPlantType = this.data.plantType;
      wx.switchTab({ url: '/pages/mall/mall' });
    } else {
      wx.showToast({ title: '未识别到植物类型', icon: 'none' });
    }
  },

  // ================= 新增：一键跳转添加植物逻辑 =================
  goToAddPlant() {
    const imageUrl = this.data.tempImagePath;
    const plantName = this.data.plantType || '';

    if (!imageUrl) {
      wx.showToast({ title: '没有图片可添加', icon: 'none' });
      return;
    }

    const encodedImg = encodeURIComponent(imageUrl);
    const encodedName = encodeURIComponent(plantName);

    // 【请注意修改这里的路径】确保路径与你实际的 addPlant 页面路径完全一致！
    const targetUrl = `/pages/plantArchive/addPlant?imgUrl=${encodedImg}&plantName=${encodedName}`; 

    wx.navigateTo({
      url: targetUrl,
      fail: (err) => {
        console.error('跳转添加植物页面失败', err);
        wx.showToast({ title: '跳转失败，请检查页面路径是否正确', icon: 'none' });
      }
    });
  }
  // ==========================================================
});