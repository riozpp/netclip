# REA 分析报告：hellotik.app / dy.kukutool.com

调查对象与证据来源，结论按「观测 / 推断 / 未知」标注。

## 1. 目标身份

| 项 | 站点 A | 站点 B |
| --- | --- | --- |
| URL | `https://www.hellotik.app/zh` | `https://dy.kukutool.com/` |
| 标题（观测） | 免费Tiktok去水印、Instagram去水印、Rednote去水印、批量无水印下载保存 | KuKuTool - TikTok/REDnote/Facebook/Instagram Video Watermark Removal Download Tool |
| 主 H1（观测） | 免费解析去水印工具 | Rednote Video Downloader and Watermark Remover |
| 页面语言（观测） | 中文，带 `/zh` 语言路由 | 英文为主，混入西语段落（"Siga estos sencillos pasos"） |
| 定位（观测） | 多平台短视频/图文去水印下载 | 同一赛道的竞品，宣称覆盖 130+ 平台 |

## 2. 传输层与防护（观测）

两个域名返回完全相同的 39 字节响应体：

```
<script src="/_guard/auto.js"></script>
```

响应头特征：`Server: wafcdn`，`Set-Cookie: guard=...`，`Cache-Control: no-cache, no-store`。
这说明二者共用同一套 WAF（雷池 / wafcdn 系）产品，前端资源不设长缓存、按 IP+UA 下发挑战 Cookie，需要执行 JS 才放行。

- 使用 `curl` 加完整浏览器头：始终只拿到挑战页（实测 HTTP 200 / 39 bytes）。
- 使用 Playwright Chromium（headless，带代理）：连接被重置/关闭，未获得渲染结果。
- 使用具备 JS 渲染能力的抓取通道：成功拿到渲染后的正文与标题。

推断：WAF 依据 TLS/JA3 指纹与 JS 执行结果双重判定，纯 HTTP 客户端无法取到应用层 HTML。
未知：应用层框架（无法获取 `/_next` 或 `/_nuxt` 资源清单，故无法确认 React/Next 或 Vue/Nuxt）。

## 3. 功能矩阵（观测 + 推断）

两站的信息架构高度一致，可归纳为同一套产品模板：

1. 顶部：Logo + 导航 + 语言切换（站点 A 有 `/zh` 前缀路由，说明多语言是独立 URL 而非纯前端切换）
2. Hero：一句话价值主张 + URL 输入框 + 解析按钮
3. 卖点区：4 条（A）/ 3 条（B），文案集中在「免费不限次 / 无需登录 / 去水印 / 秒级处理」
4. 使用流程：4 步（复制链接 → 粘贴 → 解析 → 保存）/ 3 步
5. 支持内容类型：视频 / 图片 / 批量
6. 常见问题：A 站 3 条（是否免费、支持平台、是否安全），B 站 6 条（平台范围、广告、免费额度、验证码、批量、失败处理）
7. 页脚 + 广告位（A 站页面出现 `adsense` 字样）

站点 B 的 FAQ 额外泄露了它的服务端策略（观测）：
- 每日免费解析次数有上限，登录用户额度更高
- 非登录用户需过验证码，登录用户免验证码
- 支持批量，多链接顺序处理

推断：B 站具备账号体系、额度计费、风控三段式（额度 → 验证码 → 登录提额）。
未知：其解析服务是自建签名服务还是对接第三方聚合 API（页面无可观测的 XHR 记录）。

## 4. 复刻策略

复刻目标定为「功能等价 + 自有实现」，不复制对方的品牌、文案、代码或素材：

| 层 | 选型 | 理由 |
| --- | --- | --- |
| 边缘运行时 | Cloudflare Workers + Static Assets | 与「部署到 Cloudflare」诉求一致，单次 `wrangler deploy` 即可上线 |
| 前端 | 原生 HTML/CSS/JS，双页面双主题 | 零构建步骤，冷启动快，便于对照两个原站还原两种版式 |
| 解析层 | 自建多策略解析器（分享页 / 结构化数据 / 开放接口），逐级降级 | 不依赖单一第三方 API，单平台失效可回退 |
| 下载层 | 同源 `/api/proxy` 流式转发 | 解决跨域、防盗链、强制 `Content-Disposition` 落盘 |
| 风控 | 每 IP 滑动窗口限流（内存 + 可选 KV） | 等价于 B 站 FAQ 描述的「每日免费额度」中最关键的一环 |

站点 B 的账号体系、广告位、付费提额属于商业化组件，本次不实现，仅在文档中标注为可扩展点。

## 5. 证据文件

- `.rea/evidence/hellotik.html`、`.rea/evidence/kukutool.html`：原始挑战响应
- `.rea/probe.mjs`：浏览器侧探测脚本（DOM / 请求 / 截图采集）
