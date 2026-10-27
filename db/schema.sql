-- 留言資料表（Cloudflare D1：slzpt-comments 正式站、slzpt-comments-preview 測試站）
CREATE TABLE IF NOT EXISTS comments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  page        TEXT    NOT NULL,                -- 文章路徑，例如 /notes/cscs-endocrine.html
  name        TEXT    NOT NULL,                -- 暱稱
  body        TEXT    NOT NULL,                -- 留言內容
  created_at  TEXT    NOT NULL,                -- ISO 時間（UTC）
  status      TEXT    NOT NULL DEFAULT 'visible', -- visible 顯示 / blocked 被過濾 / hidden 站長隱藏
  reason      TEXT,                            -- 過濾結果與判斷來源，例如 ok (@cf/...)、ai:spam (@cf/...)、spam-word:娛樂城 (rules)
  is_owner    INTEGER NOT NULL DEFAULT 0,      -- 1 = 站長（大叔）回覆
  ip_hash     TEXT                             -- 只存當日雜湊，用來限制洗版，不存原始 IP
);
CREATE INDEX IF NOT EXISTS idx_comments_page ON comments (page, status, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_ip ON comments (ip_hash, created_at);
