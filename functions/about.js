// /about：先取原本的 about.html，再把後台改過的文字與公告在伺服器端換進去（搜尋引擎看得到）。
// 資料庫沒設定或出錯時，直接回傳原本頁面。
export async function onRequestGet(context) {
  const { request, env } = context;
  const res = await env.ASSETS.fetch(request);
  if (!env.DB || !res.ok || !(res.headers.get('content-type') || '').includes('text/html')) return res;

  let values = {};
  let news = [];
  try {
    const rows = (await env.DB.prepare('SELECT key, value FROM cms_content').all()).results || [];
    values = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    news = (await env.DB.prepare('SELECT title, body, created_at FROM cms_news ORDER BY id DESC LIMIT 5').all()).results || [];
  } catch (e) {
    return res;
  }

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const newsHtml = news.length
    ? '<h2>最新公告</h2><ul class="news">' + news.map((n) =>
        `<li><b>${esc(n.title)}</b> <span class="note">${esc(n.created_at.slice(0, 10))}</span><br>${esc(n.body).replace(/\n/g, '<br>')}</li>`
      ).join('') + '</ul>'
    : '';

  const out = new HTMLRewriter()
    .on('[data-cms]', {
      element(el) {
        const v = values[el.getAttribute('data-cms')];
        if (v) el.setInnerContent(v); // 純文字，自動跳脫
      }
    })
    .on('[data-cms-news]', {
      element(el) { el.setInnerContent(newsHtml, { html: true }); }
    })
    .transform(res);

  const headers = new Headers(out.headers);
  headers.set('cache-control', 'no-cache');
  return new Response(out.body, { status: out.status, headers });
}
