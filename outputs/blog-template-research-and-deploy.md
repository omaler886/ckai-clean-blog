# Serverless 开源博客模板调研与落地方案

日期：2026-06-02

## 你的需求拆解

- 对外部署在 Cloudflare。
- 内容和代码放在 Git/GitHub。
- Serverless，不自己维护服务器。
- 风格要像安静个人博客，不要资源导航站、聚合站、花哨模板。
- 支持文字、图片/图床、视频、超链接。
- Markdown 为主，也要能导入常见文本编辑器产物。
- 分两条写作路径：手动上传识别、后台写作。
- 尽量自动化，适合博客小白。

## 推荐方案

当前工作区已经落地为：

```text
Astro + Decap CMS + Cloudflare Pages + GitHub + Cloudflare R2
```

这套方案最贴合需求：

- Astro 负责干净静态博客页面。
- Decap CMS 负责 `/admin/` 后台写作，并把内容提交到 GitHub。
- GitHub Actions 监听 GitHub push，自动构建并直传到 Cloudflare Pages。
- `incoming/` + `npm run import` 负责手动上传识别。
- R2 负责不想放进 Git 的图片和视频。

## 已筛选模板

| 方案 | 是否推荐 | 原因 |
| --- | --- | --- |
| Astro + Decap CMS | 推荐 | 简单、开源、Markdown 友好、Git 友好、Cloudflare Pages 友好 |
| AstroPaper | 可参考 | 主题成熟，但成品味较重；本项目只借鉴轻量博客思路，不直接套 |
| Astro Cactus | 可参考 | 个人博客风格好，但后台和上传识别需要二次开发 |
| Hugo + Decap CMS | 可用 | Hugo 很稳，但对新手配置更散，扩展脚本体验不如 Astro |
| EmDash CMS | 暂不推荐 | Cloudflare 原生度高，但对新手偏重，依赖更多 Cloudflare 服务 |
| blog.cmliussss.com 类模板 | 排除 | 更像功能/资源/聚合模板，不符合你要的干净个人博客 |

## 当前项目能力

### 页面

- 首页文章列表
- 文章详情页
- 标签页
- 关于页
- RSS
- 404

### 内容格式

- Markdown / MDX
- 图片
- 视频
- 普通超链接
- HTML 嵌入，如 `<video>` 或 iframe

### 手动上传识别

把文件放到 `incoming/`，运行：

```bash
npm run import
```

支持：

- `.md`
- `.markdown`
- `.mdx`
- `.html`
- `.htm`
- `.txt`
- `.docx`
- `.rtf`
- `.jpg`
- `.jpeg`
- `.png`
- `.gif`
- `.webp`
- `.avif`
- `.svg`
- `.mp4`
- `.webm`
- `.mov`
- `.m4v`

### 后台写作

部署后访问：

```text
https://你的域名/admin/
```

后台会把文章写入：

```text
src/content/posts/
```

媒体默认写入：

```text
public/media/uploads/
```

备用后台：

```text
https://你的域名/admin/manual.html
```

它直接用浏览器里输入的 GitHub token 提交 Markdown 和媒体文件，不依赖 GitHub OAuth App。

### R2 图床/视频床

Cloudflare 当前账号需要先在 Dashboard 启用 R2。启用后访问：

```text
https://你的域名/admin/upload.html
```

上传成功后会返回可直接粘贴进 Markdown 的图片语法，或视频 `<video>` 语法。

## Cloudflare Pages 设置

当前推荐使用 GitHub Actions 直传 Cloudflare Pages，不依赖 Cloudflare 的 GitHub App 安装状态。

如果改成 Cloudflare Pages 直接连接 GitHub 仓库：

```text
Build command: npm run build
Build output directory: dist
Production branch: main
```

## GitHub Actions 必填 Secrets

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
```

建议使用最小权限 Cloudflare API Token，不建议把 Global API Key 持久保存到 GitHub Secrets。

如果这些 secrets 没设置，GitHub Actions 会只构建并跳过 Cloudflare 自动部署。当前已用本地临时 Global API Key 完成一次 Cloudflare Pages 直传部署。

## 后台和 R2 必填环境变量

```text
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
UPLOAD_TOKEN
MEDIA_BASE_URL
```

`MEDIA_BASE_URL` 示例：

```text
https://你的域名/api/media
```

不要把 secret 写进 Git。

## GitHub OAuth App

创建 GitHub OAuth App：

```text
Homepage URL: https://你的域名
Authorization callback URL: https://你的域名/api/auth/callback
```

然后把 Client ID 和 Client Secret 填到 Cloudflare Pages 环境变量。

## 官方依据

- Astro 支持部署到 Cloudflare Pages。
- Cloudflare Pages 支持连接 Git 仓库并自动部署。
- Cloudflare Pages Functions 支持绑定 R2。
- Decap CMS 支持 GitHub backend、Markdown widget、media_folder 和 public_folder。

这些点是当前方案成立的核心依据。
