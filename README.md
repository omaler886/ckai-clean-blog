# ckai-clean-blog

这是一个给博客新手用的 Cloudflare + Git serverless 个人博客净化版。

核心思路很简单：

1. 文章主要写 Markdown，所有内容放在 Git 仓库里。
2. Cloudflare Pages 负责自动构建和对外访问。
3. `/admin/` 是后台写作入口，用 Decap CMS 写文章、传图片和视频。
4. `incoming/` 是手动上传入口，把 Markdown、HTML、TXT、DOCX、RTF 或媒体文件丢进去后运行导入脚本自动识别。
5. 大视频或不想进 Git 的媒体可以用 Cloudflare R2，通过 `/admin/upload.html` 上传。

## 选型结论

推荐使用当前项目方案：Astro + Decap CMS + Cloudflare Pages + GitHub + 可选 R2。

没有选 EmDash 的原因：它功能很强，但对新手偏重，还依赖 D1、R2、Workers、账号能力和更多配置。

没有选 Hugo/Hexo 主题包的原因：很多主题像资源导航站或功能堆叠站，不像你给的 yachen.com 那种安静文章页。

## 本地使用

```bash
npm install
npm run dev
```

打开 `http://localhost:4321` 看博客。

## 写文章方式

### 方式一：后台写

部署后打开：

```text
https://你的域名/admin/
```

后台会把文章写入 GitHub 仓库的 `src/content/posts/`，Cloudflare Pages 会跟着 Git 提交自动重新部署。

### 方式二：手动上传自动识别

把文件丢进 `incoming/`，然后运行：

```bash
npm run import
```

支持：

- Markdown：`.md`、`.markdown`、`.mdx`
- 网页文本：`.html`、`.htm`
- 普通文本：`.txt`
- Word：`.docx`
- 富文本：`.rtf`
- 图片：`.jpg`、`.jpeg`、`.png`、`.gif`、`.webp`、`.avif`、`.svg`
- 视频：`.mp4`、`.webm`、`.mov`、`.m4v`

导入后文章会进入 `src/content/posts/`，媒体会进入 `public/media/`。

## Cloudflare Pages 配置

连接 GitHub 仓库后，Cloudflare Pages 填：

```text
Build command: npm run build
Build output directory: dist
Production branch: main
```

后台 GitHub 登录需要在 Cloudflare Pages 环境变量里设置：

```text
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
```

R2 上传需要设置：

```text
UPLOAD_TOKEN
MEDIA_BASE_URL
```

`GITHUB_CLIENT_SECRET`、`UPLOAD_TOKEN` 不能提交到 Git。

## GitHub OAuth App

创建 GitHub OAuth App 时：

```text
Homepage URL: https://你的域名
Authorization callback URL: https://你的域名/api/auth/callback
```

然后把 Client ID 和 Client Secret 填到 Cloudflare Pages 环境变量。
