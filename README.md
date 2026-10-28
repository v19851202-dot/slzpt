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
