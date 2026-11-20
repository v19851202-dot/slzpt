// 後台共用設定與工具（Pages Functions 匯入用；不含任何密碼或金鑰）
// 可編輯欄位：key 對應頁面上的 data-cms="key"；label 是後台顯示名稱；max 是字數上限。
export const FIELDS = [
  { key: 'about_alias', label: '名字下方的一行介紹', max: 80 },
  { key: 'fact_job', label: '職業', max: 60 },
  { key: 'fact_skill', label: '專長', max: 60 },
  { key: 'fact_now', label: '現在在做', max: 60 },
  { key: 'fact_study', label: '進修中', max: 80 },
  { key: 'fact_area', label: '服務地區', max: 40 },
  { key: 'about_intro', label: '「這個網站在做什麼」第一段', max: 400, multiline: true }
];

export function json(body, status, extra) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: Object.assign({
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'x-robots-tag': 'noindex'
    }, extra || {})
  });
}

export function clean(s, max) {
  return String(s == null ? '' : s)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n?/g, '\n')
    .trim()
    .slice(0, max);
}

export function hex(buf) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256(text) {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}

export async function pbkdf2(password, saltHex, iterations) {
  const salt = new Uint8Array(saltHex.match(/../g).map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256));
}

export function getCookie(request, name) {
  const m = (request.headers.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? m[1] : null;
}

export async function currentUser(env, request) {
  const token = getCookie(request, 'cms_session');
  if (!token || !env.DB) return null;
  const row = await env.DB.prepare('SELECT email, expires_at FROM cms_sessions WHERE token_hash = ?')
    .bind(await sha256(token)).first();
  if (!row || row.expires_at < new Date().toISOString()) return null;
  return row.email;
}
