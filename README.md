# slzpt
個人部落格

## 文章的分享與留言

每篇 `notes/*.html` 文章在 `</head>` 前加入以下資源，文章底部就會出現「分享這篇」與「留言」：

```html
<link rel="stylesheet" href="/assets/engage.css">
<script src="/assets/engage.js?v=20261104-orig" defer></script>
<link rel="stylesheet" href="/assets/mobile.css">
```

`/assets/mobile.css` 是手機版閱讀優化（600px 以下生效）：內文 17px、次要文字至少 13px、按鈕與連結至少 44px 高、輸入框 16px。要放在 `</head>` 前**最後一行**，才能蓋過頁面內的樣式。

- 區塊會自動放在最後一個「← 回到所有貼文」連結前面；文章要有 `<link rel="canonical">`，留言才能對應到那一篇。
- 留言 API：`functions/api/comments.js`；資料表：`db/schema.sql`。
- Cloudflare Pages 繫結：`DB`（正式站 D1 `slzpt-comments`、預覽站 `slzpt-comments-preview`）、`AI`（Workers AI）。
- 過濾：機器人陷阱、送出太快、洗版限制、禁止連結與電話、廣告關鍵字，再由 Workers AI 判斷廣告、無關、攻擊性留言；被擋的留言存成 `status = 'blocked'`，不會公開。AI 沒有綁定或判斷失敗時，留言直接公開（只靠規則過濾）。

## CSP 與首頁媒體

- `_headers` 強制限制腳本為同源及 Cloudflare 分析腳本，不允許 inline JavaScript、事件屬性或 eval。新增可執行程式須放在外部 JS，不能直接插入 `<script>程式碼</script>`。JSON-LD 仍保留為結構化資料。
- `assets/scripts/` 的檔名含內容 SHA-256 前 12 碼，使用 immutable 快取；修改檔案後須重新計算名稱並更新 HTML 引用。`python3 scripts/check-static.py` 會檢查。
- `assets/hero.js`：手機與電腦都自動輪播並播放影片，沒有暫停按鈕；只有分頁在背景或系統開啟「減少動態效果」時停止。輪到某張時才載入該張 MP4。可用方向鍵切換。
- 影片與封面以最高畫質輸出（H.264 CRF 16、原始解析度與影格率；封面 WebP 品質 100）。
- 首頁原始樣式在 `assets/home-base.css`，主題與手機覆寫依序為 `theme.css`、`mobile.css`、`theme-m.css`。保留此順序。
- 天氣 API 已停用，回傳 410，不再傳送大略位置至第三方。
- `_headers` 對新的 pages.dev 正式與預覽部署加上 noindex；舊部署不會因此自動更新或變成私密。正式替代域名轉址、歷史預覽存取限制、WAF、正式／預覽 DB 隔離與備份，須在 Cloudflare 後台管理。

## 文章分類（大分類 + 細項自動分類）

首頁貼文分兩個大分類，點了才會展開細項按鈕：

- `data-cat="note"` 專業分享：頸肩・背痛、肩・肘・手、髖・膝・踝、術後復健、運動訓練、CSCS 筆記、其他
- `data-cat="mood"` 心情：騎車、爬山・露營、工作日常、生活碎念

新增文章時，只要在 `index.html` 的 `.grid` 最上面加一張卡片並寫好 `data-cat`，**細項會依卡片標題與摘要的關鍵字自動判斷**，日期前也會自動補上細項名稱。沒有文章的細項不會顯示。

- 規則在首頁引用的 `assets/scripts/index-1-*.js` 的 `CATS`（每個細項一行 `{ id, name, re }`）；陣列順序就是按鈕順序，標 `first: true` 的優先比對。
- 自動判斷不對時，在卡片加 `data-sub="細項代號"` 強制指定，例如 `data-sub="lower"`。
- 網址可直接開到分類，例如 `https://slzpt.com/#note/spine`。
