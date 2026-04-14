/**
 * QQ 文档专用 content script
 * WXT 按文件名自动匹配 docs.qq.com / doc.weixin.qq.com
 * 职责：注入 main world 脚本 + 监听 postMessage 转发到扩展
 */
export default defineContentScript({
  matches: [
    'https://docs.qq.com/*',
    'https://*.docs.qq.com/*',
    'https://doc.weixin.qq.com/*',
    'https://*.doc.weixin.qq.com/*',
  ],
  runAt: 'document_end',
  main() {},
});
