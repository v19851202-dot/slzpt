# slzpt
個人部落格

## 文章的分享與留言

每篇 `notes/*.html` 文章在 `</head>` 前加這兩行，文章底部就會出現「分享這篇」與「留言」：

```html
<link rel="stylesheet" href="/assets/engage.css">
<script src="/assets/engage.js" defer></script>
<link rel="stylesheet" href="/assets/mobile.css">
```

`/assets/mobile.css` 是手機版閱讀優化（600px 以下生效）：內文 17px、次要文字至少 13px、按鈕與連結至少 44px 高、輸入框 16px。要放在 `</head>` 前**最後一行**，才能蓋過頁面內的樣式。

- 區塊會自動放在最後一個「← 回到所有貼文」連結前面；文章要有 `<link rel="canonical">`，留言才能對應到那一篇。
- 留言 API：`functions/api/comments.js`；資料表：`db/schema.sql`。
- Cloudflare Pages 繫結：`DB`（正式站 D1 `slzpt-comments`、預覽站 `slzpt-comments-preview`）、`AI`（Workers AI）。
- 過濾：機器人陷阱、送出太快、洗版限制、禁止連結與電話、廣告關鍵字，再由 Workers AI 判斷廣告、無關、攻擊性留言；被擋的留言存成 `status = 'blocked'`，不會公開。

## 文章分類（大分類 + 細項自動分類）

首頁貼文分兩個大分類，點了才會展開細項按鈕：

- `data-cat="note"` 專業分享：頸肩・背痛、肩・肘・手、髖・膝・踝、術後復健、運動訓練、CSCS 筆記、其他
- `data-cat="mood"` 心情：騎車、爬山・露營、工作日常、生活碎念

新增文章時，只要在 `index.html` 的 `.grid` 最上面加一張卡片並寫好 `data-cat`，**細項會依卡片標題與摘要的關鍵字自動判斷**，日期前也會自動補上細項名稱。沒有文章的細項不會顯示。

- 規則在 `index.html` 的 `CATS`（每個細項一行 `{ id, name, re }`）；陣列順序就是按鈕順序，標 `first: true` 的優先比對。
- 自動判斷不對時，在卡片加 `data-sub="細項代號"` 強制指定，例如 `data-sub="lower"`。
- 網址可直接開到分類，例如 `https://slzpt.com/#note/spine`。
