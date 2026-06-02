# 本地 Markdown 到微信公众号草稿箱发布工具

这个工具用于把本地 Markdown 文章转换成微信公众号图文草稿。第一版只创建草稿，不自动发布、不群发，方便你在公众号后台人工检查后再发布。

默认排版风格参考 Vibe Coding 长文教程：清晰分节、代码块友好、表格可读、适合持续发布 AI 编程 / Codex 协作开发日记。

## 整体链路

```text
本地 Markdown
  -> check 检查 frontmatter、图片和敏感信息
  -> preview 生成本地 HTML 预览
  -> draft 上传正文图片和封面
  -> 微信公众号草稿箱
  -> 人工检查后发布
```

## 准备工作

### 1. 准备微信公众号开发信息

在微信公众号后台找到：

```text
设置与开发 -> 基本配置 -> 公众号开发信息
```

需要填写：

```text
AppID
AppSecret
```

同时确认后台已经配置好接口权限和 IP 白名单。创建草稿需要调用微信官方接口，所以当前电脑公网 IP 需要在公众号后台白名单中。

### 2. 填写 `.env`

复制模板：

```bash
cp .env.example .env
```

填写真实值：

```text
WECHAT_APP_ID=你的公众号 AppID
WECHAT_APP_SECRET=你的公众号 AppSecret
WECHAT_AUTHOR=空杯
WECHAT_DEFAULT_COVER=assets/default-cover.png
```

`.env` 不会提交到 Git。

## 写文章

文章默认放在 `articles/` 目录。

每篇文章顶部需要 frontmatter：

```yaml
---
title: "文章标题"
digest: "公众号摘要，建议 60-120 字"
author: "空杯"
cover: "../assets/default-cover.png"
cover_short_title: "可选方封面短标题"
guizang_kicker: "可选顶部分类"
guizang_accent: "ikb"
source_url: ""
show_cover_pic: false
---
```

字段说明：

| 字段 | 是否必填 | 说明 |
|---|---|---|
| `title` | 必填 | 公众号草稿标题 |
| `digest` | 必填 | 公众号摘要 |
| `author` | 可选 | 不填时使用 `.env` 的 `WECHAT_AUTHOR` |
| `cover` | 可选 | 不填时使用 `.env` 的默认封面 |
| `cover_short_title` | 可选 | Guizang `1:1` 方封面短标题 |
| `guizang_kicker` | 可选 | Guizang 主封面顶部分类文字 |
| `guizang_accent` | 可选 | Guizang Swiss 强调色：`ikb`、`lemon-yellow`、`lemon-green`、`safety-orange` |
| `source_url` | 可选 | 原文链接 |
| `show_cover_pic` | 可选 | 是否在正文顶部显示封面 |

项目自带示例：

```text
articles/sample.md
```

## 常用命令

### 检查文章

```bash
npm run check -- articles/sample.md
```

会检查：

- `title` 是否存在。
- `digest` 是否存在。
- 封面图是否存在。
- 正文图片路径是否存在。
- 是否有疑似 token、webhook、open_id、chat_id 等敏感内容。

### 生成本地预览

```bash
npm run preview -- articles/sample.md
```

生成文件：

```text
.preview/sample.html
```

可以用浏览器打开预览排版。

### 创建微信公众号草稿

```bash
npm run draft -- articles/sample.md
```

这个命令会：

1. 获取并缓存 `access_token`。
2. 上传封面图，得到 `thumb_media_id`。
3. 上传正文里的本地图片，替换成微信公众号图片 URL。
4. 调用新增草稿接口。
5. 在终端输出草稿 `media_id`。

然后你到微信公众号后台草稿箱人工检查并发布。

### 生成 Guizang 风格封面

```bash
npm run guizang-cover -- articles/sample.md
```

这个命令会读取同一篇 Markdown 的 `title`、`digest` 和正文里的 H2 标题，生成公众号封面图：

```text
.guizang/sample/index.html
.guizang/sample/output/wechat-21x9-cover.png
.guizang/sample/output/wechat-1x1-cover.png
.guizang/sample/output/wechat-cover-pair-preview.png
```

默认使用 Guizang Swiss 风格。没有截图或照片也可以生成，首版会用纯版式系统图完成封面。

### 一键生成封面并创建草稿

先 dry-run 检查生成结果，不请求微信接口：

```bash
npm run guizang-draft -- articles/sample.md --dry-run
```

确认封面没问题后创建微信公众号草稿：

```bash
npm run guizang-draft -- articles/sample.md
```

这个命令会先生成 `21:9` 主封面，再把它作为公众号草稿封面上传；正文图片仍沿用原有 Markdown 图片上传流程。

Guizang 封面支持这些可选 frontmatter：

| 字段 | 说明 |
|---|---|
| `cover_short_title` | 覆盖 `1:1` 方封面的短标题 |
| `guizang_kicker` | 覆盖主封面顶部分类文字 |
| `guizang_accent` | Swiss 强调色：`ikb`、`lemon-yellow`、`lemon-green`、`safety-orange` |

### 智能体参与版：Skill 生成图片

如果已经在 Codex 中安装 `wechat-guizang-draft-agent`，可以让智能体参与整套图文草稿工作流：

```text
Use $wechat-guizang-draft-agent to prepare a Guizang cover preview and confirmed WeChat draft for articles/sample.md.
```

这个 Skill 不把大模型调用写进终端命令里，而是在 Codex 会话中编排：

```text
智能体阅读 Markdown
  -> 判断标题、摘要、封面短标题和 Guizang 风格字段
  -> 调用 npm run guizang-cover 生成封面图片
  -> 展示 21:9 + 1:1 配对预览
  -> 运行 dry-run 检查
  -> 等用户确认后再创建微信草稿
```

Skill 生成和检查的图片仍然落在本地输出目录：

```text
.guizang/<article-slug>/output/wechat-21x9-cover.png
.guizang/<article-slug>/output/wechat-1x1-cover.png
.guizang/<article-slug>/output/wechat-cover-pair-preview.png
```

确认门槛：智能体必须先展示封面预览，并在你明确回复“确认创建草稿”之后，才可以运行非 dry-run 的 `npm run guizang-draft -- <article>`。它不会自动发布或群发公众号内容。

## 图片规则

正文图片使用普通 Markdown：

```markdown
![说明文字](../assets/example.png)
```

本地图片会在 `draft` 时自动上传到微信公众号，并替换成微信返回的图片 URL。

支持的常见图片类型：

```text
png, jpg, jpeg, gif, webp
```

封面图默认是：

```text
assets/default-cover.png
```

你可以替换这张图，或者在单篇文章 frontmatter 里指定其他封面。

## 支持的 Markdown

第一版支持：

- H1 / H2 / H3 标题
- 段落
- 引用
- 无序列表
- 有序列表
- 表格
- 代码块
- 行内代码
- 加粗、斜体
- 链接
- 本地图片

Mermaid 代码块第一版会按普通代码块保留，不做图形渲染。

## 缓存文件

工具会生成 `.cache/`：

| 文件 | 作用 |
|---|---|
| `access-token.json` | 缓存微信 access_token |
| `uploaded-images.json` | 缓存正文图片 hash 到微信 URL 的映射 |
| `uploaded-covers.json` | 缓存封面 hash 到 thumb_media_id 的映射 |

`.cache/` 不会提交到 Git。

## 敏感信息安全

不要公开：

- `.env`
- `.cache/`
- `WECHAT_APP_SECRET`
- `access_token`
- 真实 webhook
- 真实 `open_id`、`chat_id`、app token、table id、view id

发布前可以运行：

```bash
rg -n "secret|access_token|open-apis/bot/v2/hook|oc_[A-Za-z0-9]|ou_[A-Za-z0-9]|cli_[A-Za-z0-9]|tbl[A-Za-z0-9]|vew[A-Za-z0-9]" .
```

## 常见问题

### 提示缺少 `WECHAT_APP_ID`

说明 `.env` 没填或当前命令不在项目根目录运行。

确认：

```text
WECHAT_APP_ID=...
WECHAT_APP_SECRET=...
```

### 获取 access_token 失败

常见原因：

- AppID 或 AppSecret 填错。
- 当前电脑公网 IP 没加到公众号后台白名单。
- 公众号接口权限不足。

### 草稿创建成功但排版还要调

这是正常的。第一版目标是把内容送到草稿箱，最后你仍然可以在公众号后台人工微调。

## 官方接口参考

- [获取 access_token](https://developers.weixin.qq.com/doc/offiaccount/Basic_Information/Get_access_token.html)
- [上传图文消息内图片](https://developers.weixin.qq.com/doc/offiaccount/Asset_Management/Adding_Images_to_Articles.html)
- [新增永久素材](https://developers.weixin.qq.com/doc/offiaccount/Asset_Management/Adding_Permanent_Assets.html)
- [新增草稿](https://developers.weixin.qq.com/doc/offiaccount/Draft_Box/Add_draft.html)
