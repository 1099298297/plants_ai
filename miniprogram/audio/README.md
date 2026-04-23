# 音频文件目录

此目录用于存放小程序的通知音频文件。

## 支持的音频格式
- MP3
- WAV
- AAC

## 文件命名规范
- 通知音：`notification.mp3`
- 其他音效：使用描述性名称，如 `success.mp3`, `error.mp3`

## 配置说明
在 `config/reminder.js` 中配置音频文件路径：

```javascript
notification: {
  sound: '/audio/notification.mp3', // 音频文件路径
  // ... 其他配置
}
```

## 注意事项
1. 音频文件大小建议不超过 1MB
2. 音频时长建议不超过 3 秒
3. 确保音频文件格式兼容微信小程序
4. 如果音频文件不存在，系统会自动使用系统提示音作为备选

## 当前状态
- 音频功能已暂时禁用（sound: null）
- 如需启用，请添加音频文件并更新配置文件 