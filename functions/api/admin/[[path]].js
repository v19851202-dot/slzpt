// 後台 API：/api/admin/*
// POST login {email,password} · POST logout · GET me · GET/PUT content · POST news · DELETE news/:id
import { FIELDS, json, clean, sha256, pbkdf2, currentUser, getCookie } from '../../../lib/cms.js';

const SESSION_DAYS = 7;
const FAIL_LIMIT = 10;       // 同一來源 15 分鐘內最多失敗 10 次
const FAIL_WINDOW_MIN = 15;

function sameOrigin(request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

export async function onRequest(context) {
  const { request, env, params } = context;
  if (!env.DB) return json({ error: '後台資料庫未設定' }, 503);
  const path = (params.path || []).join('/');
  const method = request.method;

  if (method !== 'GET' && !sameOrigin(request)) return json({ error: '來源不符' }, 403);

  if (path === 'login' && method === 'POST') {
    const ipHash = await sha256((request.headers.get('cf-connecting-ip') || '') + new Date().toISOString().slice(0, 10));
    const since = new Date(Date.now() - FAIL_WINDOW_MIN * 60000).toISOString();
    const fails = await env.DB.prepare('SELECT COUNT(*) AS n FROM cms_login_fail WHERE ip_hash = ? AND at > ?').bind(ipHash, since).first();
    if (fails && fails.n >= FAIL_LIMIT) return json({ error: '嘗試太多次，請 15 分鐘後再試' }, 429);

    let body = {};
    try { body = await request.json(); } catch (e) {}
    const email = clean(body.email, 120).toLowerCase();
    const password = String(body.password || '').slice(0, 200);
    const user = await env.DB.prepare('SELECT * FROM cms_users WHERE email = ?').bind(email).first();
    const ok = user && (await pbkdf2(password, user.salt, user.iterations)) === user.pw_hash;
    if (!ok) {
      await env.DB.prepare('INSERT INTO cms_login_fail (ip_hash, at) VALUES (?, ?)').bind(ipHash, new Date().toISOString()).run();
      return json({ error: '帳號或密碼錯誤' }, 401);
    }
    const token = crypto.randomUUID() + crypto.randomUUID();
    const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
    await env.DB.prepare('INSERT INTO cms_sessions (token_hash, email, expires_at) VALUES (?, ?, ?)').bind(await sha256(token), email, expires).run();
    await env.DB.prepare('DELETE FROM cms_sessions WHERE expires_at < ?').bind(new Date().toISOString()).run();
    return json({ ok: true, email }, 200, {
      'set-cookie': `cms_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}`
    });
  }

  const email = await currentUser(env, request);
  if (!email) return json({ error: '請先登入' }, 401);

  if (path === 'logout' && method === 'POST') {
    await env.DB.prepare('DELETE FROM cms_sessions WHERE token_hash = ?').bind(await sha256(getCookie(request, 'cms_session'))).run();
    return json({ ok: true }, 200, { 'set-cookie': 'cms_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0' });
  }

  if (path === 'me') return json({ email });

  if (path === 'content' && method === 'GET') {
    const { results } = await env.DB.prepare('SELECT key, value FROM cms_content').all();
    const values = Object.fromEntries((results || []).map((r) => [r.key, r.value]));
    const news = (await env.DB.prepare('SELECT id, title, body, created_at FROM cms_news ORDER BY id DESC').all()).results || [];
    return json({ fields: FIELDS, values, news });
  }

  if (path === 'content' && method === 'PUT') {
    let body = {};
    try { body = await request.json(); } catch (e) {}
    const now = new Date().toISOString();
    const stmts = [];
    for (const f of FIELDS) {
      if (typeof body[f.key] !== 'string') continue;
      const v = clean(body[f.key], f.max);
      if (!v) continue; // 空白不存，頁面會沿用原本文字
      stmts.push(env.DB.prepare('INSERT INTO cms_content (key, value, updated_at, updated_by) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by').bind(f.key, v, now, email));
    }
    if (stmts.length) await env.DB.batch(stmts);
    return json({ ok: true, saved: stmts.length });
  }

  if (path === 'news' && method === 'POST') {
    let body = {};
    try { body = await request.json(); } catch (e) {}
    const title = clean(body.title, 60);
    const text = clean(body.body, 1000);
    if (!title || !text) return json({ error: '標題和內容都要填' }, 400);
    await env.DB.prepare('INSERT INTO cms_news (title, body, created_at) VALUES (?, ?, ?)').bind(title, text, new Date().toISOString()).run();
    return json({ ok: true });
  }

  const del = path.match(/^news\/(\d+)$/);
  if (del && method === 'DELETE') {
    await env.DB.prepare('DELETE FROM cms_news WHERE id = ?').bind(Number(del[1])).run();
    return json({ ok: true });
  }

  return json({ error: '找不到' }, 404);
}
