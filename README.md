# yangyu-report

秧語社群儀表板（Vite + React + TypeScript）。

## 本機開發

**Prerequisites**
- Node.js

**安裝與啟動**
1. `npm install`
2. `npm run dev`

## 後端（Vercel Serverless）

此專案的 API 皆位於 `api/`（Vercel Serverless Functions）。

**需要的環境變數（Vercel Project Env Vars）**
- `KV_REST_API_URL` / `KV_REST_API_TOKEN`（或 Vercel 自動注入的 `*_KV_REST_API_URL` / `*_KV_REST_API_TOKEN`）
- `APP_JWT_SECRET`（JWT 簽章用）
- `APP_PASSWORD_HASH`（bcrypt hash；或使用 `APP_PASSWORD` 明文但不建議）

**產生 `APP_JWT_SECRET` 與 `APP_PASSWORD_HASH`**
- `npm run gen:auth`

## 部署到 Production（dashboard.yangyu.co）

你目前在 production 看不到「分享連結管理」，通常代表 production 還沒部署到最新 commit。

**建議流程（GitHub 連動 Vercel）**
1. 確認本機變更已 commit
2. push 到 `origin/main`
3. 由 Vercel 自動觸發部署

如果你沒用 GitHub 連動部署，也可以在 Vercel UI 直接重新 Deploy（確保使用的是這個 repo + `main`）。
