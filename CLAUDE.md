# CLAUDE.md

給在這個 repo 工作的程式代理（含 Claude Code 與雲端開發代理）。改網站前先讀完，再動檔案。

## 專案定位與技術棧

`slzpt.com` 是 Cloudflare Pages 靜態網站，加上 Pages Functions 與 D1。沒有前端框架，也沒有打包步驟；HTML、CSS、JS 直接放在 repo。

正式站是「阿硯物理治療師」的診所落地頁，並保留衛教筆記與生活紀錄。

```
index.html  about.html  privacy.html  book.html  404.html
notes/                 文章 HTML 與 notes/img/
assets/                clinic.css、clinic.js、engage.*、mobile.css、scripts/、img/、hero/
functions/api/         comments.js（留言）、weather.js（已停用）
lib/cms.js             db/schema.sql（留言）、db/cms.sql（後台表，介面已移除）
scripts/check-static.py   .claude/check.sh
_headers  robots.txt  sitemap.xml  llms.txt
```

- `assets/clinic.css`、`assets/clinic.js`：全站頁首、頁尾，以及首頁服務分頁。首頁已改為這組版面，不再走舊的 `home-base.css` 輪播。
- `assets/scripts/`：檔名含內容 SHA-256 前 12 碼，`_headers` 設 immutable。改檔後重算檔名並更新 HTML 引用；`check-static.py` 會對。
- 文章分享與留言：在 `notes/*.html` 的 `</head>` 前引入 `engage.css`、`engage.js`、`mobile.css`。留言對到 `<link rel="canonical">`。API 是 `functions/api/comments.js`，資料表 `db/schema.sql`。
- Cloudflare Pages 繫結：`DB`（正式 D1 `slzpt-comments`、預覽 `slzpt-comments-preview`）、`AI`（Workers AI；沒綁定或判斷失敗時，留言只靠規則過濾並公開）。不存原始 IP，只存當日雜湊。
- `functions/api/weather.js`：GET 回 410，不再把位置送到第三方。
- `lib/cms.js` 與 `db/cms.sql` 仍在 repo；`/admin` 與後台 API 已移除。不要自行接回。
- `_headers`：`script-src` 只允許 `'self'`、`'inline-speculation-rules'` 與 Cloudflare 分析腳本，且不含 `unsafe-inline`、`unsafe-eval`；`script-src-attr` 為 `'none'`。樣式仍保留 `style-src 'unsafe-inline'`。新的可執行程式放外部 JS；JSON-LD 可留在頁內。
- 線上預約目前關閉。入口只連 `/book`，頁面 `noindex`、不進 `sitemap.xml`，並導向 LINE @emmsc。開關只由 `book.html` 的單一 `data-booking="open|closed"` 決定，開放步驟見 `README.md`。其他頁不得出現 `book.slzpt.com`。
- 品質閘門：`python3 scripts/check-static.py`（`.claude/check.sh` 同一支）。通過時印出 `PASS`，並附頁數與 `booking switch (open|closed)`。

`robots.txt` 禁止收錄 `/api/`、`/admin/`、`/lib/`。新文章加進 `index.html` 的 `.grid` 最上方，並寫 `data-cat="note"`（專業分享）或 `data-cat="mood"`（心情）；細項規則在 `assets/scripts/index-1-*.js` 的 `CATS`。

改完先對這幾項：

- 每頁恰好一個 `h1`。除 `404.html` 外，canonical 必須是 `https://slzpt.com/` 加上不含 `.html` 的路徑。
- 檢查腳本會呼叫 `node --check` 掃 `assets/**/*.js` 與 `functions/**/*.js`。它不連網、不需安裝套件，本機要有 Node。
- 首頁 `#services`、`#pricing` 的三項服務名稱與關於頁、預約頁一致，且這兩區不出現「分鐘」。
- 對外聯絡維持 LINE @emmsc 與 Instagram @hi_ptkong。不要新增電話、門牌或第三方預約連結。

## 品牌與文案規範

- 個人品牌是「阿硯物理治療師」。本名「孔士硯」留在關於頁、結構化資料（Person `name`）與專業資歷，不要拿來當全站招牌。舊暱稱「孔哥」只留在留言保留字，避免他人冒充，不要寫回頁面標題。
- 治療所名稱是「仁士居家物理治療所」（JSON-LD 為 `MedicalClinic`）。到府主要寫桃園龜山、林口；不要自行擴大服務地區。
- 三項主力服務，名稱保持一致：徒手與運動治療、居家復能、高齡長輩與特殊體適能。
- 治療所所有療程皆為每節 50 分鐘，到府也是一節 50 分鐘。首頁服務區（`#services`）與費用區（`#pricing`）不標示療程分鐘數。預約頁 `book.html` 可以標 50 分鐘。費用數字只在創辦人確認後才寫上網站；目前首頁是請對方用 LINE 詢問。
- 語氣保持自然、真誠的台灣物理治療師口吻。不放虛構評價、星等，也不寫誇大療效。衛教附得出處；有爭議就寫還不確定。內容是衛教參考，不能取代當面評估；警訊導向先就醫。
- 不改既有文章路徑、URL 結構與 SEO metadata（title、description、canonical、Open Graph、JSON-LD、`sitemap.xml`），除非需求寫明要改。新文章路徑維持 `/notes/<slug>`，canonical 不帶 `.html`。

## 醫療資安與個資

- 絕不把病人個資、`.env`、API 金鑰或正式環境密鑰提交進 Git。案例若要上站，只用不含身分的衛教描述。
- 前端、留言、API 回應與 log 不得露出病歷、電話、住址、原始 IP 或密鑰。留言過濾已拒絕電話與連結，維持這個界線。
- `.gitignore` 已排除 `.dev.vars*`、`.wrangler/`、`node_modules/`。密鑰只放 Cloudflare 後台或本機，不寫進 HTML、JS 或說明文件。

## 跨工具協作

GitHub 上的 `main` 是唯一真相來源。本機（含 Claude Code）與雲端開發代理會同時改這個 repo。

- 每次開工前先 `git pull`，同步最新 `main`，再從 `main` 開分支。
- 改完務必 commit 並 push。功能改版走分支與 Pull Request，避免直接在 `main` 上互相覆蓋。
- 合併前先跑 `python3 scripts/check-static.py`，確認輸出 `PASS`。
- 再用 Cloudflare Pages 的分支預覽看過頁面（至少首頁、改到的文章、`/about`、`/book`），確認後才合併進 `main`。

## 部署與確認

合併進 `main` 會自動部署到正式站 `https://slzpt.com`。`*.pages.dev` 預覽已由 `_headers` 加上 `noindex`；預覽不是正式發布。

以下事項先經創辦人孔士硯確認，再動手：正式發布、網域或 DNS、D1 結構異動（`db/schema.sql`、`db/cms.sql`）、費用或療程分鐘數變更、把線上預約從 `closed` 改成 `open`。
