# 种草助手

移动端 H5 真实体验文案助手，面向口腔、本地生活、美容、足浴、餐饮等线下门店。顾客扫描带参数二维码，通过少量选择生成可编辑、可复制的小红书分享文案。

## 快速开始

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

打开 `http://localhost:3000`。后台地址为 `http://localhost:3000/admin`。

## 二维码参数

```text
/?storeId=store001&campaignId=summer001&channelId=frontdesk&projectId=cleaning
```

`projectId` 可选；携带后会直接进入体验填写页。

## 真实 AI

复制 `.env.example` 为 `.env`，填写 DeepSeek 的 `AI_API_KEY`，并设置 `AI_BASE_URL=https://api.deepseek.com`、`AI_MODEL=deepseek-v4-pro`。密钥只由服务端读取；缺少配置或供应商请求失败时会明确报错，不会回退到模拟生成。

## 常用命令

- `npm run dev`：本地开发
- `npm run lint`：代码检查
- `npm run test`：运行测试
- `npm run build`：生产构建
- `npm run db:push`：创建或更新 SQLite 数据库
- `npm run db:seed`：写入模拟门店、项目和管理员数据

## 数据库

Prisma 模型位于 `prisma/schema.prisma`，当前使用 SQLite。切换 PostgreSQL、MySQL 或 Supabase 时，调整 datasource provider 和 `DATABASE_URL` 即可开始迁移。

## 上线前必做

修改 `ADMIN_PASSWORD` 和 `ADMIN_SESSION_SECRET`，配置持久化数据库，确认隐私政策中的实际保存时间，并在微信、iPhone 和安卓真机中测试扫码与复制功能。
