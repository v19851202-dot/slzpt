# slzpt
個人部落格

## 文章的分享與留言

每篇 `notes/*.html` 文章在 `</head>` 前加入以下資源，文章底部就會出現「分享這篇」與「留言」：

```html
<link rel="stylesheet" href="/assets/engage.css">
<script src="/assets/engage.js?v=20261104-security1" defer></script>
<link rel="stylesheet" href="/assets/mobile.css">
```

`/assets/mobile.css` 是手機版閱讀優化（600px 以下生效）：內文 17px、次要文字至少 13px、按鈕與連結至少 44px 高、輸入框 16px。要放在 `</head>` 前**最後一行**，才能蓋過頁面內的樣式。

- 區塊會自動放在最後一個「← 回到所有貼文」連結前面；文章要有 `<link rel="canonical">`，留言才能對應到那一篇。
- 留言 API：`functions/api/comments.js`；資料表：`db/schema.sql`。
- Cloudflare Pages 繫結：`DB`（正式站 D1 `slzpt-comments`、預覽站 `slzpt-comments-preview`）、`AI`（Workers AI）。
- 過濾：機器人陷阱、送出太快、洗版限制、常見連結與部分手機號碼格式、廣告關鍵字，再由 Workers AI 判斷廣告、無關、攻擊性留言；被擋的留言存成 `status = 'blocked'`，不會公開。
- 以單一 `INSERT ... SELECT` 原子預留配額後才呼叫 AI；10 分鐘 3 則、滾動 24 小時 15 則。當日與前日的 IP 雜湊一起檢查，避免 UTC 日界重置限額。待審與被擋留言也計入。
- AI 未綁定、兩個模型故障／逾時、或回傳無法解析：保留 `status = 'pending'`，回應 202；前端顯示待審訊息，不會假裝已公開。Worker 日誌會記錄不含留言內容的 `comments-moderation-pending:*` 事件。
- 請在 Cloudflare D1 管理介面定期檢查 `SELECT id, page, name, body, created_at, reason FROM comments WHERE status = 'pending' ORDER BY id;`，人工確認後逐筆更新為 `visible` 或 `blocked`。不要整批直接公開待審資料。可在 Cloudflare 後台為上述日誌設定通知。
- JSON 請求上限 8192 bytes，讀取串流時實際計數；不合型別回 400、超大回 413、非 JSON 回 415。DB 故障回一般化的 503，不洩漏內部例外。
- GET 採 `?page=/notes/xxx&after=上一批最後的ID` 游標分頁，每批最多 50 則，回傳 `nextCursor`；前端提供「載入更多留言」。
- 本次不需要執行正式資料庫遷移：原資料表的 status 是 TEXT，程式會明確寫入 pending；`schema.sql` 的預設值只影響新建資料庫。

## CSP 與首頁媒體

- `_headers` 強制限制腳本為同源及 Cloudflare 分析腳本，不允許 inline JavaScript、事件屬性或 eval。新增可執行程式須放在外部 JS，不能直接插入 `<script>程式碼</script>`。JSON-LD 仍保留為結構化資料。
- `assets/scripts/` 的檔名含內容 SHA-256 前 12 碼，使用 immutable 快取；修改檔案後須重新計算名稱並更新 HTML 引用。`python3 scripts/check-static.py` 會檢查。
- `assets/hero.js` 在寬度 900px 以下、減少動態或省流量模式不載入 MP4。桌面離開可視區／背景分頁／鍵盤焦點／滑鼠停留時會暫停；另有手動暫停及方向鍵切換。
- 首頁原始樣式在 `assets/home-base.css`，主題與手機覆寫依序為 `theme.css`、`mobile.css`、`theme-m.css`。保留此順序。
- 天氣 API 已停用，回傳 410，不再傳送大略位置至第三方。
- `_headers` 對新的 pages.dev 正式與預覽部署加上 noindex；舊部署不會因此自動更新或變成私密。正式替代域名轉址、歷史預覽存取限制、WAF、正式／預覽 DB 隔離與備份，須在 Cloudflare 後台管理。

## 本機驗證

使用支援 `node:sqlite` 的 Node.js（本次為 Node 24）及 Python 3：

```sh
node --test tests/comments.test.mjs
python3 scripts/check-static.py
```

測試只有記憶體 SQLite 與模擬 AI，不連正式服務。Cloudflare runtime 整合驗證則使用 Wrangler 4.157.0 的 `pages dev`、獨立本機 D1、`--local` 與專用 persist 路徑。請勿把本機測試用的 database_id／wrangler 設定部署到正式站。

部署前需確認沒有把 localhost、測試 DB 綁定或 `.dev.vars` 一起提交。上線後用正式網址核對 CSP、頁面腳本、留言 GET 與手機畫面；不在正式留言區張貼測試資料。

## 文章分類（大分類 + 細項自動分類）

首頁貼文分兩個大分類，點了才會展開細項按鈕：

- `data-cat="note"` 專業分享：頸肩・背痛、肩・肘・手、髖・膝・踝、術後復健、運動訓練、CSCS 筆記、其他
- `data-cat="mood"` 心情：騎車、爬山・露營、工作日常、生活碎念

新增文章時，只要在 `index.html` 的 `.grid` 最上面加一張卡片並寫好 `data-cat`，**細項會依卡片標題與摘要的關鍵字自動判斷**，日期前也會自動補上細項名稱。沒有文章的細項不會顯示。

- 規則在首頁引用的 `assets/scripts/index-1-*.js` 的 `CATS`（每個細項一行 `{ id, name, re }`）；陣列順序就是按鈕順序，標 `first: true` 的優先比對。
- 自動判斷不對時，在卡片加 `data-sub="細項代號"` 強制指定，例如 `data-sub="lower"`。
- 網址可直接開到分類，例如 `https://slzpt.com/#note/spine`。
