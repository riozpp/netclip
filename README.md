# NetClip · 多平台无水印解析下载

基于 Cloudflare Workers 的边缘短链解析工具：粘贴分享链接，取回平台原始媒体文件（视频 / 图文 / 实况照片），不做二次转码，不需要登录。

同一个代码库提供两套页面版式：

| 路由 | 版式 | 说明 |
| --- | --- | --- |
| `/` | 浅色 · 中文优先（可切英文） | 居中 Hero + 四特性 + 四步流程 + 内容类型 + FAQ |
| `/kuku.html` | 深色 · 英文 | 双栏 Hero 带预览面板 + 平台 Tab + 三特性 + 三步流程 + 六条 FAQ |

两套页面共享同一套样式变量与前端逻辑，主题差异由 `public/pro.css` 覆盖实现。

## 技术架构

```
浏览器 ──POST /api/parse──► Worker（边缘）
                              ├─ 识别平台（douyin / tiktok / xiaohongshu / bilibili / instagram）
                              ├─ 多级降级解析：结构化数据 → 分享页 → 开放接口
                              └─ 归一化输出 JSON
        ──GET  /api/proxy──► Worker 流式转发媒体（补 Referer、强制落盘、透传 Range）
        ◄──静态资源────────  ASSETS binding（HTML / CSS / JS / SEO 文件）
```

- 运行时：Cloudflare Workers（单入口 `src/index.js`）
- 静态资源：`[assets]` 绑定，零构建步骤，无需 Vite / Webpack
- 依赖：生产运行时零依赖；开发期仅 `wrangler`

## 目录

```
src/index.js            路由、限流、错误统一出口
src/proxy.js            媒体流式转发（域名白名单 + Referer 映射）
src/resolvers/index.js  平台解析器与归一化
src/lib/http.js         fetch 封装、超时、JSON 抽取、短链展开
public/                 前端页面与静态资源
scripts/smoke.mjs       本地/线上冒烟测试
docs/rea-report.md      目标站分析报告
```

## 接口

### `GET /api/health`

```json
{ "ok": true, "service": "netclip", "version": "1.0.0", "platforms": ["douyin", "tiktok"] }
```

### `GET /api/parse?url=<分享链接>`

### `POST /api/parse`

```json
{ "urls": ["https://v.douyin.com/xxxxxxx/"] }
```

单次最多 6 条，支持传 `url` / `text` 字段或裸文本，服务端会自行抽取其中的 URL。

响应（归一化）：

```json
{
  "ok": true,
  "data": {
    "platform": "douyin",
    "platformName": "抖音",
    "title": "作品标题",
    "cover": "https://...",
    "duration": 15,
    "author": { "name": "作者", "avatar": "https://..." },
    "stats": { "play": 120000, "like": 3400, "comment": 88 },
    "videos": [{ "label": "无水印视频", "url": "https://...", "ext": "mp4" }],
    "images": [],
    "music": { "title": "原声", "url": "https://..." },
    "sourceUrl": "https://..."
  },
  "quota": { "limit": 60, "remaining": 57 }
}
```

批量请求会返回 `items: [{ ok, input, data | error }]`。

### `GET /api/proxy?u=<媒体直链>&name=<文件名>&inline=1`

流式转发上游媒体，附带：

- 域名白名单（防止变成开放代理）
- 按域名注入来源校验头（`Referer`）
- `Content-Disposition: attachment` 强制下载，`filename*` 支持中文名
- `Range` 透传，视频可拖动进度

## 本地开发

```bash
npm install
npx wrangler dev          # http://127.0.0.1:8787
node scripts/smoke.mjs    # 冒烟测试
```

## 部署到 Cloudflare

### 方式一：本地直接发布

```bash
export CLOUDFLARE_API_TOKEN=<你的 token>
export CLOUDFLARE_ACCOUNT_ID=<你的 account id>
npx wrangler deploy
```

发布后域名形如 `https://netclip.<子域>.workers.dev`。如需自定义域名，在 `wrangler.toml` 增加：

```toml
routes = [{ pattern = "example.com", custom_domain = true }]
```

### 方式二：GitHub Actions 自动发布（推荐）

仓库已内置 `.github/workflows/deploy.yml`，推送到 `main` 即自动执行 `wrangler deploy`。

在 GitHub 仓库 `Settings → Secrets and variables → Actions` 添加两个 secret：

- `CLOUDFLARE_API_TOKEN`：需要 `Workers Scripts:Edit` 权限
- `CLOUDFLARE_ACCOUNT_ID`

## 可配置项

| 变量 | 位置 | 说明 |
| --- | --- | --- |
| `PARSE_LIMIT_PER_HOUR` | `wrangler.toml [vars]` | 每 IP 每小时解析上限，默认 60 |
| `RATE_KV` | KV 绑定（可选） | 绑定后限流改为跨实例分布式计数 |
| `DOUYIN_FALLBACK_API` | 环境变量（可选） | 抖音第三级降级通道 |
| `TIKTOK_FALLBACK_API` | 环境变量（可选） | TikTok 备用通道 |

## 解析策略与已知限制

每个平台都是多级降级，任一级失败自动尝试下一级，因此单点接口调整不会整体失效：

| 平台 | 主策略 | 降级 | 备注 |
| --- | --- | --- | --- |
| 抖音 | 作品信息接口 | 分享页 `_ROUTER_DATA` 解析 | 短链先展开；`playwm` 自动替换为 `play` |
| TikTok | 第三方解析通道 | 备用通道 | 依赖外部服务可用性 |
| 小红书 | 笔记页 `__INITIAL_STATE__` | — | 需要公开笔记；私密笔记会返回登录墙 |
| 哔哩哔哩 | 稿件信息 + 播放地址接口 | — | 高清直链需登录态时会降级为页面信息 |
| Instagram | 贴文 embed 页 | — | 公共贴文可解析，私密账号不可 |

明确不支持：私密内容、关注可见内容、付费内容、需要登录态的平台（如 X / Facebook 私域）。

## 合规

本项目仅用于个人学习与自用备份。请只下载你拥有版权或已获授权的内容；转载、商用前请自行取得权利人许可。TikTok、抖音、小红书、哔哩哔哩、Instagram 等名称与商标归其各自权利人所有，本项目与之无隶属关系。

## License

MIT
