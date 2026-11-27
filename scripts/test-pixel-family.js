// 首頁全家像素小人行為測試。不需安裝進 repo：
// NODE_PATH=/path/to/node_modules node scripts/test-pixel-family.js
// 可選 SHOTS_DIR=/某處 輸出截圖（不要放進 repo）。
// 本機伺服器只供靜態檔，不跑 Pages Functions；/api/ 的 404 不算錯，CSP 與 JS 錯誤照算。
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(__dirname, '..');
const KEY = 'slzpt-pixel-family';
const LINES = ['嗨，歡迎你來', '哈囉，你好呀', '你好，慢慢逛喔', '嘿，很高興見到你'];
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.txt': 'text/plain', '.xml': 'application/xml', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.jpg': 'image/jpeg' };

function globalHeaders() {
  const lines = fs.readFileSync(path.join(ROOT, '_headers'), 'utf8').split('\n');
  const start = lines.findIndex((l) => l.trim() === '/*');
  const out = {};
  for (const line of lines.slice(start + 1)) {
    if (!/^\s+\S/.test(line)) break;
    const i = line.indexOf(':');
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  if (!out['Content-Security-Policy']) throw new Error('no CSP in _headers /* block');
  return out;
}

function resolveFile(urlPath) {
  const clean = path.normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  const base = path.join(ROOT, clean);
  if (!base.startsWith(ROOT) || /(^|[/\\])\./.test(clean.slice(1))) return null;
  for (const p of [base, path.join(base, 'index.html'), base + '.html']) {
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }
  return null;
}

function startServer(headers) {
  const server = http.createServer((req, res) => {
    const file = resolveFile(req.url);
    const target = file || path.join(ROOT, '404.html');
    res.writeHead(file ? 200 : 404, { ...headers, 'Content-Type': TYPES[path.extname(target)] || 'application/octet-stream' });
    fs.createReadStream(target).pipe(res);
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

const results = [];
function record(name, ok, detail) {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
}

const problems = [];
function watch(page, base, label) {
  page.on('console', (msg) => {
    const text = msg.text();
    const url = (msg.location() && msg.location().url) || '';
    if (/Content Security Policy/i.test(text)) problems.push(`${label} CSP: ${text}`);
    else if (msg.type() === 'error' && !(/Failed to load resource/.test(text) && (!url.startsWith(base) || url.startsWith(base + '/api/')))) problems.push(`${label} console: ${text} ${url}`);
  });
  page.on('pageerror', (err) => problems.push(`${label} pageerror: ${err.message}`));
}

async function snap(page) {
  return page.$$eval('.pf-char', (els) => els.map((b) => ({
    visible: b.getClientRects().length > 0,
    t: b.style.transform,
    bp: b.querySelector('.pf-sprite').style.backgroundPosition,
  })));
}
const visibleCount = (s) => s.filter((c) => c.visible).length;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const server = await startServer(globalHeaders());
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const shots = process.env.SHOTS_DIR;
  async function newPage(opts, label) {
    const ctx = await browser.newContext(opts);
    await ctx.route((url) => !url.href.startsWith(base) && !url.href.startsWith('data:'), (r) => r.abort());
    const page = await ctx.newPage();
    watch(page, base, label);
    return { ctx, page };
  }

  try {
    {
      const { ctx, page } = await newPage({ viewport: { width: 1280, height: 800 } }, 'desktop');
      const pixelRequests = [];
      page.on('request', (r) => { if (/pixel-family|family-pixel/.test(r.url())) pixelRequests.push(r.url()); });
      await page.goto(base + '/');
      const csp = (await page.request.get(base + '/')).headers()['content-security-policy'] || '';
      record('本機伺服器套用 _headers 的 CSP', /script-src 'self'/.test(csp) && /script-src-attr 'none'/.test(csp));
      await page.waitForSelector('.pixel-family .pf-char');
      const a = await snap(page);
      await wait(900);
      const b = await snap(page);
      record('首頁桌機有像素層', (await page.$$('.pixel-family')).length === 1 && pixelRequests.length > 0);
      record('首頁桌機小人會走（位置與幀隨時間改變）', visibleCount(a) > 0 && a.some((c, i) => c.t !== b[i].t) && a.some((c, i) => c.bp !== b[i].bp), `${a[0].t} → ${b[0].t}`);
      record('同時可見角色數 ≤ 2', visibleCount(b) >= 1 && visibleCount(b) <= 2, `可見 ${visibleCount(b)}`);
      const geo = await page.evaluate(() => {
        const abs = (el) => { const r = el.getBoundingClientRect(); return { top: r.top + scrollY, bottom: r.bottom + scrollY, w: r.width, h: r.height }; };
        const foot = abs(document.querySelector('.site-footer'));
        const main = abs(document.querySelector('main'));
        const layer = abs(document.querySelector('.pixel-family'));
        const chars = [...document.querySelectorAll('.pf-char')].map(abs);
        return { foot, main, layer, chars, docH: document.documentElement.scrollHeight, pos: getComputedStyle(document.querySelector('.pixel-family')).position };
      });
      record('小人 72×72px', geo.chars.every((c) => c.w === 72 && c.h === 72), geo.chars.map((c) => `${c.w}×${c.h}`).join(','));
      record('小人只在頁尾下方的底部留白（不覆蓋內文與頁尾）', geo.pos === 'absolute' && geo.chars.every((c) => c.top >= geo.foot.bottom && c.top >= geo.main.bottom) && Math.abs(geo.layer.bottom - geo.docH) <= 1, `footer底 ${Math.round(geo.foot.bottom)}、小人頂 ${Math.round(Math.min(...geo.chars.map((c) => c.top)))}、頁高 ${geo.docH}`);
      record('沒互動前不寫 localStorage', await page.evaluate(() => localStorage.length === 0));
      if (shots) await page.screenshot({ path: path.join(shots, 'home-desktop.png') });

      const urlBefore = page.url();
      await page.locator('.pf-char').first().click();
      const said = await page.textContent('.pf-bubble');
      const live = await page.getAttribute('.pf-bubble', 'aria-live');
      const jumped = await page.$eval('.pf-char .pf-body', (n) => n.classList.contains('is-jump'));
      record('點小人出現台詞且 URL 不變', LINES.includes(said) && page.url() === urlBefore && live === 'polite', `「${said}」`);
      record('點小人會跳一下', jumped);
      if (shots) await page.screenshot({ path: path.join(shots, 'home-desktop-click.png') });

      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      const h1 = await snap(page);
      await wait(700);
      const h2 = await snap(page);
      await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
      record('document.hidden 時停止走動', JSON.stringify(h1) === JSON.stringify(h2));

      await page.click('.pf-ctrl button:has-text("暫停動畫")');
      const p1 = await snap(page);
      await wait(600);
      const p2 = await snap(page);
      const resumeText = await page.isVisible('.pf-ctrl button:has-text("繼續走動")');
      await page.click('.pf-ctrl button:has-text("繼續走動")');
      record('暫停動畫／繼續走動', JSON.stringify(p1) === JSON.stringify(p2) && resumeText);

      const z = await page.evaluate(() => {
        const zi = (s) => parseInt(getComputedStyle(document.querySelector(s)).zIndex, 10);
        return { layer: zi('.pixel-family'), header: zi('.site-header'), skip: zi('.skip') };
      });
      record('頁首（含選單按鈕）與跳到內容的 z-index 高於像素層', z.header > z.layer && z.skip > z.layer, JSON.stringify(z));

      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await wait(200);
      const blocked = await page.$$eval('.site-footer a', (links) => links.filter((l) => {
        const r = l.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + Math.min(r.width / 2, 20), r.top + r.height / 2);
        return !(hit && l.contains(hit));
      }).map((l) => l.textContent));
      record('捲到底時頁尾連結都點得到', blocked.length === 0, blocked.join('、'));

      await page.click('.pf-ctrl button:has-text("關閉小人")');
      const offVal = await page.evaluate((k) => localStorage.getItem(k), KEY);
      record('按關閉後 localStorage 為 "off"', offVal === 'off' && visibleCount(await snap(page)) === 0);
      await page.reload();
      await page.waitForSelector('.pixel-family');
      const afterReload = await snap(page);
      record('重整後仍關閉且只剩「顯示小人」', visibleCount(afterReload) === 0 && await page.isVisible('.pf-ctrl button:has-text("顯示小人")') && !(await page.isVisible('.pf-ctrl button:has-text("暫停動畫")')));
      await page.click('.pf-ctrl button:has-text("顯示小人")');
      const store = await page.evaluate(() => Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)]));
      record('localStorage 只有一個鍵、值 ∈ {on, off}', store.length === 1 && store[0][0] === KEY && ['on', 'off'].includes(store[0][1]), JSON.stringify(store));
      await ctx.close();
    }

    for (const p of ['/about', '/book', '/privacy', '/notes/neck-pain-red-flags']) {
      const { ctx, page } = await newPage({ viewport: { width: 1280, height: 800 } }, p);
      const pixelRequests = [];
      page.on('request', (r) => { if (/pixel-family|family-pixel/.test(r.url())) pixelRequests.push(r.url()); });
      const res = await page.goto(base + p);
      await wait(300);
      record(`${p} 沒有像素層`, res.status() === 200 && (await page.$$('.pixel-family')).length === 0 && pixelRequests.length === 0);
      await ctx.close();
    }

    {
      const { ctx, page } = await newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, 'mobile');
      await page.goto(base + '/');
      await page.waitForSelector('.pixel-family');
      const a = await snap(page);
      await wait(700);
      const b = await snap(page);
      record('手機 390 預設不走、看不到小人', visibleCount(a) === 0 && JSON.stringify(a) === JSON.stringify(b) && await page.isVisible('.pf-ctrl button:has-text("顯示小人")'));
      if (shots) await page.screenshot({ path: path.join(shots, 'home-mobile-off.png') });
      await page.tap('.pf-ctrl button:has-text("顯示小人")');
      const c = await snap(page);
      await wait(900);
      const d = await snap(page);
      record('手機按「顯示小人」後才走', visibleCount(d) >= 1 && visibleCount(d) <= 2 && c.some((x, i) => x.t !== d[i].t));
      await page.reload();
      await page.waitForSelector('.pixel-family');
      const kept = await page.evaluate((k) => localStorage.getItem(k), KEY);
      record('手機按顯示後重整仍記住 on', kept === 'on' && visibleCount(await snap(page)) >= 1);
      if (shots) await page.screenshot({ path: path.join(shots, 'home-mobile-on.png') });
      await ctx.close();
    }

    for (const [w, h, label, expectOn] of [[820, 1180, '平板 820', false], [900, 1000, '寬 900', false], [901, 1000, '寬 901', true], [1024, 768, '寬 1024', true]]) {
      const { ctx, page } = await newPage({ viewport: { width: w, height: h } }, label);
      await page.goto(base + '/');
      await page.waitForSelector('.pixel-family');
      const n = visibleCount(await snap(page));
      record(`${label} 預設${expectOn ? '開啟' : '關閉'}（900px 以下預設關）`, expectOn ? n >= 1 && n <= 2 : n === 0, `可見 ${n}`);
      await ctx.close();
    }

    {
      const { ctx, page } = await newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' }, 'reduced');
      await page.goto(base + '/');
      await page.waitForSelector('.pixel-family .pf-char');
      const a = await snap(page);
      await wait(900);
      const b = await snap(page);
      record('減少動態：位置與幀不隨時間改變', visibleCount(a) >= 1 && JSON.stringify(a) === JSON.stringify(b));
      await page.locator('.pf-char').first().click();
      const said = await page.textContent('.pf-bubble');
      const jumped = await page.$$eval('.pf-body', (n) => n.some((x) => x.classList.contains('is-jump')));
      record('減少動態：點擊只出台詞、不跳', LINES.includes(said) && !jumped && !(await page.isVisible('.pf-ctrl button:has-text("暫停動畫")')));
      if (shots) await page.screenshot({ path: path.join(shots, 'home-reduced-motion.png') });
      await ctx.close();
    }

    {
      const { ctx, page } = await newPage({ viewport: { width: 1280, height: 800 } }, 'no-storage');
      await page.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });
      });
      await page.goto(base + '/');
      await page.waitForSelector('.pixel-family .pf-char');
      await page.click('.pf-ctrl button:has-text("關閉小人")');
      record('localStorage 不可用時安全降級', visibleCount(await snap(page)) === 0 && await page.isVisible('.pf-ctrl button:has-text("顯示小人")'));
      await ctx.close();
    }

    record('console 沒有 CSP violation 或 JS 錯誤', problems.length === 0, problems.join(' | '));
  } finally {
    await browser.close();
    server.close();
  }

  const passed = results.filter(Boolean).length;
  console.log(`${passed}/${results.length}`);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
