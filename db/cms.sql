-- 後台（CMS）資料表。與留言共用同一個 D1（正式站 slzpt-comments、預覽站 slzpt-comments-preview）。
CREATE TABLE IF NOT EXISTS cms_users (
  email       TEXT PRIMARY KEY,           -- 登入帳號
  pw_hash     TEXT NOT NULL,              -- PBKDF2-SHA256 結果（hex）
  salt        TEXT NOT NULL,              -- 隨機鹽（hex）
  iterations  INTEGER NOT NULL,
  created_at  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS cms_sessions (
  token_hash  TEXT PRIMARY KEY,           -- 只存登入憑證的雜湊
  email       TEXT NOT NULL,
  expires_at  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS cms_content (
  key         TEXT PRIMARY KEY,           -- 欄位代號，對應頁面上的 data-cms="..."
  value       TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  updated_by  TEXT
);
CREATE TABLE IF NOT EXISTS cms_news (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  created_at  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS cms_login_fail (
  ip_hash     TEXT NOT NULL,
  at          TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cms_login_fail ON cms_login_fail (ip_hash, at);
