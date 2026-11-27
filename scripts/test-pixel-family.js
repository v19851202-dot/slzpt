// 像素小人行為測試。不需安裝進 repo：
// NODE_PATH=/path/to/node_modules node scripts/test-pixel-family.js
// 可選 SHOTS_DIR=/某處 輸出截圖（不要放進 repo）。
// 本機伺服器只供靜態檔，不跑 Pages Functions；/api/ 的 404 不算錯，CSP 與 JS 錯誤照算。
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(__dirname, '..');
const KEY = 'slzpt-pixel-family';
const AUTO_KEY = 'slzpt-pixel-family-auto';
const LINES = ['嗨，歡迎你來', '哈囉，你好呀', '你好，慢慢逛喔', '嘿，很高興見到你'];
const HELLO = '嘿！你好啊！';
const ARTICLE = '/notes/neck-pain-red-flags';
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
    visible: b.getClientRects().length > 0 && getComputedStyle(b).visibility !== 'hidden' && !b.classList.contains('is-away'),
    t: b.style.transform,
    bp: b.querySelector('.pf-sprite').style.backgroundPosition,
    peek: b.classList.contains('is-peek'),
    dancing: b.querySelector('.pf-sprite').classList.contains('is-dance'),
  })));
}
const visibleCount = (s) => s.filter((c) => c.visible).length;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function overlap(a, b) {
  return a.left < b.right - 0.5 && a.right > b.left + 0.5 && a.top < b.bottom - 0.5 && a.bottom > b.top + 0.5;
}

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
        const box = (el) => { const r = el.getBoundingClientRect(); return { top: r.top + scrollY, bottom: r.bottom + scrollY, left: r.left, right: r.right, w: r.width, h: r.height }; };
        const header = box(document.querySelector('.site-header'));
        const brand = box(document.querySelector('.site-brand'));
        const cta = box(document.querySelector('.nav-cta'));
        const main = box(document.querySelector('main'));
        const layer = box(document.querySelector('.pixel-family'));
        const chars = [...document.querySelectorAll('.pf-char')].map(box);
        const ctrl = [...document.querySelectorAll('.pf-ctrl button')].map(box);
        return { header, brand, cta, main, layer, chars, ctrl, pos: getComputedStyle(document.querySelector('.pixel-family')).position };
      });
      record('小人 72×72px', geo.chars.every((c) => c.w === 72 && c.h === 72), geo.chars.map((c) => `${c.w}×${c.h}`).join(','));
      record('小人只在頁首上方的走道（不覆蓋導覽列、Logo、預約與內文）', geo.pos === 'absolute' && geo.chars.every((c) => c.bottom <= geo.header.top + 0.5 && c.bottom <= geo.brand.top + 0.5 && c.bottom <= geo.cta.top + 0.5 && c.bottom <= geo.main.top + 0.5) && geo.ctrl.every((c) => c.bottom <= geo.header.top + 0.5), `header頂 ${Math.round(geo.header.top)}、小人底 ${Math.round(Math.max(...geo.chars.map((c) => c.bottom)))}`);
      record('沒互動前不寫 localStorage', await page.evaluate(() => localStorage.length === 0));
      if (shots) await page.screenshot({ path: path.join(shots, 'home-desktop.png') });

      const urlBefore = page.url();
      const firstChar = page.locator('.pf-char').first();
      await firstChar.click({ delay: 0 });
      await wait(400);
      const said = await page.textContent('.pf-bubble');
      const live = await page.getAttribute('.pf-bubble', 'aria-live');
      const jumped = await page.$eval('.pf-char .pf-body', (n) => n.classList.contains('is-jump'));
      record('點小人出現台詞且 URL 不變', LINES.includes(said) && page.url() === urlBefore && live === 'polite', `「${said}」`);
      record('點小人會跳一下', jumped);

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

      const blockedHeader = await page.evaluate(() => {
        const sels = ['.site-brand', '.nav-cta', '.site-nav a'];
        return sels.filter((s) => {
          const l = document.querySelector(s);
          const r = l.getBoundingClientRect();
          const hit = document.elementFromPoint(r.left + Math.min(r.width / 2, 20), r.top + r.height / 2);
          return !(hit && (l === hit || l.contains(hit)));
        });
      });
      record('頁首 Logo、預約與導覽都點得到', blockedHeader.length === 0, blockedHeader.join('、'));

      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await wait(200);
      const blocked = await page.$$eval('.site-footer a', (links) => links.filter((l) => {
        const r = l.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + Math.min(r.width / 2, 20), r.top + r.height / 2);
        return !(hit && l.contains(hit));
      }).map((l) => l.textContent));
      record('捲到底時頁尾連結都點得到', blocked.length === 0, blocked.join('、'));
      await page.evaluate(() => window.scrollTo(0, 0));

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

    for (const p of ['/about', '/book', '/privacy']) {
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
      await page.waitForSelector('.pixel-family .pf-char');
      const a = await snap(page);
      await wait(900);
      const b = await snap(page);
      record('手機 390 預設開啟並會走', visibleCount(a) >= 1 && visibleCount(b) <= 2 && a.some((c, i) => c.t !== b[i].t));
      const mobileGeo = await page.evaluate(() => {
        const box = (el) => el.getBoundingClientRect();
        const header = box(document.querySelector('.site-header'));
        const toggle = box(document.querySelector('.nav-toggle'));
        const chars = [...document.querySelectorAll('.pf-char')].map(box);
        const hit = document.elementFromPoint(toggle.left + toggle.width / 2, toggle.top + toggle.height / 2);
        const btn = document.querySelector('.nav-toggle');
        return { headerTop: header.top, charBottom: Math.max(...chars.map((c) => c.bottom)), toggleOk: !!(hit && (hit === btn || btn.contains(hit))) };
      });
      record('手機小人不擋漢堡選單', mobileGeo.charBottom <= mobileGeo.headerTop + 0.5 && mobileGeo.toggleOk, JSON.stringify(mobileGeo));
      if (shots) await page.screenshot({ path: path.join(shots, 'home-mobile-on.png') });
      await page.tap('.pf-ctrl button:has-text("關閉小人")');
      const keptOff = await page.evaluate((k) => localStorage.getItem(k), KEY);
      record('手機按關閉後記住 off', keptOff === 'off' && visibleCount(await snap(page)) === 0);
      await page.reload();
      await page.waitForSelector('.pixel-family');
      record('手機重整後仍關閉', visibleCount(await snap(page)) === 0 && await page.isVisible('.pf-ctrl button:has-text("顯示小人")'));
      await ctx.close();
    }

    for (const [w, h, label] of [[820, 1180, '平板 820'], [900, 1000, '寬 900'], [901, 1000, '寬 901'], [1024, 768, '寬 1024']]) {
      const { ctx, page } = await newPage({ viewport: { width: w, height: h } }, label);
      await page.goto(base + '/');
      await page.waitForSelector('.pixel-family .pf-char');
      const n = visibleCount(await snap(page));
      record(`${label} 預設開啟`, n >= 1 && n <= 2, `可見 ${n}`);
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
      await wait(400);
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

    async function articleOverlap(page) {
      return page.evaluate(() => {
        const box = (el) => {
          const r = el.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
        };
        const hit = (a, b) => a.left < b.right - 0.5 && a.right > b.left + 0.5 && a.top < b.bottom - 0.5 && a.bottom > b.top + 0.5;
        const h1 = box(document.querySelector('article.page h1'));
        const content = [...document.querySelectorAll('article.page .subtitle, article.page .byline, article.page .lead, article.page p, article.page h2, article.page li')]
          .filter((el) => !el.closest('.pixel-family') && !el.closest('h1'))
          .map(box);
        const chars = [...document.querySelectorAll('.pf-char')].filter((el) => getComputedStyle(el).visibility !== 'hidden' && !el.classList.contains('is-away')).map(box);
        const vsTitle = chars.filter((c) => hit(c, h1));
        const vsContent = chars.filter((c) => content.some((t) => hit(c, t)));
        return { chars: chars.length, vsTitle: vsTitle.length, vsContent: vsContent.length };
      });
    }

    {
      const { ctx, page } = await newPage({ viewport: { width: 1280, height: 800 } }, 'article-desktop');
      await page.goto(base + ARTICLE + '?pf=sudden');
      await page.waitForSelector('.pixel-family.pf-article');
      record('文章頁桌機有像素層', (await page.$$('.pixel-family.pf-article .pf-char')).length === 1);
      const persona = await page.getAttribute('.pixel-family', 'data-pf-persona');
      record('?pf=sudden 指定突然個性', persona === 'sudden');
      const before = await snap(page);
      await wait(500);
      const mid = await snap(page);
      record('突然個性先停頓、尚未走出', visibleCount(before) === 0 && visibleCount(mid) === 0);
      await wait(600);
      const after = await snap(page);
      record('突然個性彈出後會在標題附近走', visibleCount(after) === 1);
      await wait(900);
      const walked = await snap(page);
      record('文章頁桌機小人會走', visibleCount(walked) === 1 && walked[0].t !== after[0].t);
      const ov = await articleOverlap(page);
      record('文章頁桌機小人不重疊標題與內文', ov.chars >= 1 && ov.vsTitle === 0 && ov.vsContent === 0, JSON.stringify(ov));
      if (shots) await page.screenshot({ path: path.join(shots, 'article-desktop.png') });
      await ctx.close();
    }

    {
      const { ctx, page } = await newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, 'article-mobile');
      await page.goto(base + ARTICLE + '?pf=sudden');
      await page.waitForSelector('.pixel-family.pf-article');
      await wait(1600);
      const n = visibleCount(await snap(page));
      const ov = await articleOverlap(page);
      record('文章頁手機 390 有小人且不重疊標題與內文', n === 1 && ov.vsTitle === 0 && ov.vsContent === 0, JSON.stringify({ n, ...ov }));
      if (shots) await page.screenshot({ path: path.join(shots, 'article-mobile.png') });
      await ctx.close();
    }

    {
      const { ctx, page } = await newPage({ viewport: { width: 1280, height: 800 } }, 'article-shy');
      await page.goto(base + ARTICLE + '?pf=shy');
      await page.waitForSelector('.pixel-family.pf-article .pf-char');
      const peek = await page.$eval('.pf-char', (el) => el.classList.contains('is-peek'));
      const a = await snap(page);
      await wait(700);
      const b = await snap(page);
      record('害羞個性慢慢探頭、先不走', peek && visibleCount(a) === 1 && a[0].t === b[0].t && a[0].peek);
      const ov = await articleOverlap(page);
      record('害羞探頭時不重疊標題與內文', ov.vsTitle === 0 && ov.vsContent === 0, JSON.stringify(ov));
      await page.evaluate(() => {
        const el = document.querySelector('.pf-char');
        const r = el.getBoundingClientRect();
        document.dispatchEvent(new PointerEvent('pointermove', { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, bubbles: true }));
      });
      await wait(80);
      const hid = await page.$eval('.pf-char', (el) => el.classList.contains('is-away') || getComputedStyle(el).visibility === 'hidden');
      record('害羞：游標靠近會縮回', hid);
      await wait(2000);
      const back = await page.$eval('.pf-char', (el) => el.classList.contains('is-peek') && !el.classList.contains('is-away') && getComputedStyle(el).visibility !== 'hidden');
      record('害羞：過一下再探出來', back);
      await ctx.close();
    }

    {
      const { ctx, page } = await newPage({ viewport: { width: 1280, height: 800 } }, 'article-bold');
      await page.goto(base + ARTICLE + '?pf=bold');
      await page.waitForSelector('.pixel-family.pf-article .pf-char');
      const said = await page.textContent('.pf-bubble');
      const loud = await page.$eval('.pf-bubble', (el) => el.classList.contains('is-loud'));
      const a = await snap(page);
      await wait(400);
      const b = await snap(page);
      record('大膽個性大步走出並大聲打招呼', said === HELLO && loud && a[0].t !== b[0].t, `「${said}」`);
      const ov = await articleOverlap(page);
      record('大膽走動時不重疊標題與內文', ov.vsTitle === 0 && ov.vsContent === 0, JSON.stringify(ov));
      await ctx.close();
    }

    {
      const { ctx, page } = await newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' }, 'article-reduced');
      await page.goto(base + ARTICLE + '?pf=bold');
      await page.waitForSelector('.pixel-family.pf-article .pf-char');
      const a = await snap(page);
      await wait(900);
      const b = await snap(page);
      const pop = await page.$$eval('.pf-body', (n) => n.some((x) => x.classList.contains('is-pop') || x.classList.contains('is-jump')));
      record('文章頁減少動態：靜止站在標題旁', visibleCount(a) === 1 && JSON.stringify(a) === JSON.stringify(b) && !a[0].peek && !pop);
      const ov = await articleOverlap(page);
      record('文章頁減少動態時不重疊標題與內文', ov.vsTitle === 0 && ov.vsContent === 0, JSON.stringify(ov));
      await ctx.close();
    }

    {
      const { ctx, page } = await newPage({ viewport: { width: 1280, height: 800 } }, 'shared-pref');
      await page.addInitScript((k) => localStorage.setItem(k, 'off'), KEY);
      await page.goto(base + ARTICLE);
      await page.waitForSelector('.pixel-family.pf-article');
      record('文章頁共用關閉設定：進頁時不顯示小人', visibleCount(await snap(page)) === 0 && await page.isVisible('.pf-ctrl button:has-text("顯示小人")'));
      await page.click('.pf-ctrl button:has-text("顯示小人")');
      const onVal = await page.evaluate((k) => localStorage.getItem(k), KEY);
      record('文章頁按顯示後寫入同一個 key', onVal === 'on' && visibleCount(await snap(page)) === 1);
      await ctx.close();
    }

    {
      const { ctx, page } = await newPage({ viewport: { width: 1280, height: 800 } }, 'dance-dblclick');
      await page.goto(base + '/');
      await page.waitForSelector('.pixel-family .pf-char');
      await page.locator('.pf-char').first().dblclick();
      await wait(120);
      const dancing = await page.getAttribute('.pixel-family', 'data-pf-dancing');
      const frames = await snap(page);
      record('桌機連點兩下會跳舞', dancing === '1' && frames.some((c) => c.dancing));
      const a = await snap(page);
      await wait(500);
      const b = await snap(page);
      record('跳舞時會換幀', a.some((c, i) => c.dancing && c.bp !== b[i].bp), `${a[0].bp} → ${b[0].bp}`);
      if (shots) await page.screenshot({ path: path.join(shots, 'home-dance.png') });
      await wait(2800);
      const after = await snap(page);
      record('跳舞約 3 秒後恢復走動', (await page.getAttribute('.pixel-family', 'data-pf-dancing')) !== '1' && after.every((c) => !c.dancing));
      const audio = await page.evaluate(() => ({
        tags: document.querySelectorAll('audio, video').length,
        ctor: typeof Audio !== 'undefined',
      }));
      record('頁面沒有 audio／video 標籤', audio.tags === 0);
      await ctx.close();
    }

    {
      const { ctx, page } = await newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, 'dance-tap');
      await page.goto(base + '/');
      await page.waitForSelector('.pixel-family .pf-char');
      const char = page.locator('.pf-char').first();
      await char.tap();
      await wait(80);
      await char.tap();
      await wait(120);
      const dancing = await page.getAttribute('.pixel-family', 'data-pf-dancing');
      record('手機連點兩下會跳舞', dancing === '1');
      await ctx.close();
    }

    {
      const { ctx, page } = await newPage({ viewport: { width: 1280, height: 800 } }, 'dance-auto');
      await page.addInitScript(() => { window.PF_AUTO_MS = 400; });
      await page.goto(base + '/');
      await page.waitForSelector('.pixel-family .pf-char');
      await wait(200);
      record('進首頁一下子還不會自動跳舞', (await page.getAttribute('.pixel-family', 'data-pf-dancing')) !== '1');
      await wait(500);
      const danced = await page.getAttribute('.pixel-family', 'data-pf-dancing');
      const stored = await page.evaluate((k) => sessionStorage.getItem(k), AUTO_KEY);
      record('停留一陣子後自動跳一次並記入 sessionStorage', danced === '1' && stored === '1');
      await wait(3200);
      await page.reload();
      await page.waitForSelector('.pixel-family .pf-char');
      await wait(900);
      const again = await page.getAttribute('.pixel-family', 'data-pf-dancing');
      const stored2 = await page.evaluate((k) => sessionStorage.getItem(k), AUTO_KEY);
      record('同一造訪重整後不會再自動跳', again !== '1' && stored2 === '1');
      await ctx.close();
    }

    {
      const { ctx, page } = await newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' }, 'dance-reduced');
      await page.addInitScript(() => { window.PF_AUTO_MS = 400; });
      await page.goto(base + '/?pf=dance');
      await page.waitForSelector('.pixel-family .pf-char');
      await page.locator('.pf-char').first().dblclick();
      await wait(600);
      const dancing = await page.getAttribute('.pixel-family', 'data-pf-dancing');
      const frames = await snap(page);
      record('減少動態時不跳舞（含 ?pf=dance 與連點）', dancing !== '1' && frames.every((c) => !c.dancing) && JSON.stringify(frames) === JSON.stringify(await snap(page)));
      await ctx.close();
    }

    {
      const { ctx, page } = await newPage({ viewport: { width: 1280, height: 800 } }, 'dance-param');
      await page.goto(base + '/?pf=dance');
      await page.waitForSelector('.pixel-family .pf-char');
      await wait(80);
      const dancing = await page.getAttribute('.pixel-family', 'data-pf-dancing');
      record('?pf=dance 可直接看跳舞', dancing === '1');
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
