/**
 * 本地 AI 配置示例。
 * 复制为 ai.js 后填入自己的密钥；ai.js 已被 Git 忽略。
 */
const dashscope = {
  apiKey: 'YOUR_DASHSCOPE_API_KEY',
  chatCompletionsUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  model: 'qwen3.8-flash'
}

module.exports = {
  dashscope
}
