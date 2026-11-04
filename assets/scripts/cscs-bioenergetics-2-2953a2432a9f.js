(function () {
  var NS = 'http://www.w3.org/2000/svg';
  function $(id) { return document.getElementById(id); }
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(parent, x, y, s, o) {
    o = o || {};
    var t = el('text', { x: x, y: y, 'text-anchor': o.a || 'middle', 'font-size': o.fs || 14, 'font-weight': o.w || 500, fill: o.c || '#6b6b6b' }, parent);
    t.textContent = s;
    return t;
  }
  function fmtTime(s) {
    if (s < 60) return Math.round(s) + ' 秒';
    var m = Math.floor(s / 60), r = Math.round(s - m * 60);
    if (r === 60) { m++; r = 0; }
    return r ? m + ' 分 ' + r + ' 秒' : m + ' 分鐘';
  }

  /* 互動 1：持續時間與主要能量系統（NSCA Essentials 第 3 章對照表） */
  var sv = $('sys-svg');
  if (sv) {
    var BANDS = [
      { a: 0, b: 6, lab: '0–6 秒', int: '極高', sys: '磷酸原系統', col: '#9a3412' },
      { a: 6, b: 30, lab: '6–30 秒', int: '很高', sys: '磷酸原＋快速糖解', col: '#c2410c' },
      { a: 30, b: 120, lab: '30 秒–2 分', int: '高', sys: '快速糖解', col: '#ea580c' },
      { a: 120, b: 180, lab: '2–3 分', int: '中等', sys: '快速糖解＋氧化', col: '#f59e0b' },
      { a: 180, b: 600, lab: '> 3 分', int: '低', sys: '氧化系統', col: '#64748b' }
    ];
    var X0 = 20, X1 = 500, T0 = 1, T1 = 600;
    function sToX(s) { return X0 + (X1 - X0) * (Math.log(Math.max(s, T0)) - Math.log(T0)) / (Math.log(T1) - Math.log(T0)); }
    function rToS(r) { return Math.exp(Math.log(T0) + (Math.log(T1) - Math.log(T0)) * r / 100); }
    function drawSys() {
      var s = rToS(+$('sys-r').value);
      $('sys-o').textContent = fmtTime(s);
      var bi = 0;
      for (var i = 0; i < BANDS.length; i++) if (s >= BANDS[i].a) bi = i;
      var g = sv.querySelector('g.dr'); if (g) sv.removeChild(g); g = el('g', { 'class': 'dr' }, sv);
      BANDS.forEach(function (b, i) {
        var xa = sToX(Math.max(b.a, T0)), xb = sToX(b.b);
        el('rect', { x: xa, y: 40, width: xb - xa, height: 34, fill: b.col, opacity: i === bi ? 1 : 0.22 }, g);
        txt(g, (xa + xb) / 2, 98, b.lab, { fs: 13, w: i === bi ? 700 : 400, c: i === bi ? '#232323' : '#9a9a9a' });
      });
      var mx = sToX(s);
      el('path', { d: 'M' + (mx - 7) + ' 22 L' + (mx + 7) + ' 22 L' + mx + ' 34 Z', fill: '#232323' }, g);
      el('line', { x1: mx, y1: 34, x2: mx, y2: 80, stroke: '#232323', 'stroke-width': 2 }, g);
      txt(g, X0, 132, '短（強度高）', { a: 'start', fs: 13 });
      txt(g, X1, 132, '長（強度低）', { a: 'end', fs: 13 });
      var b = BANDS[bi];
      $('sys-int').textContent = b.int;
      $('sys-main').textContent = b.sys;
      $('sys-note').textContent = '能以最大努力持續 ' + fmtTime(s) + '（' + b.lab + '）：強度' + b.int + '，主要由' + b.sys + '供能。其他系統仍在運作，只是比例較小。';
    }
    $('sys-r').addEventListener('input', drawSys);
    drawSys();
  }

  /* 互動 2：乳酸閾值示意 */
  var lv = $('lt-svg');
  if (lv) {
    var state = 'untrained';
    var LT = { untrained: { lo: 50, hi: 60, at: 55 }, trained: { lo: 70, hi: 80, at: 75 } };
    var PX0 = 56, PX1 = 500, PY0 = 214, PY1 = 20, LMAX = 10;
    function px(p) { return PX0 + (PX1 - PX0) * (p - 20) / 80; }
    function py(l) { return PY0 - (PY0 - PY1) * l / LMAX; }
    function lac(p, at) {
      var base = 1.0;
      if (p <= at) return base + 0.004 * (p - 20);
      var d = p - at;
      return base + 0.004 * (at - 20) + 0.012 * d * d;
    }
    function drawLT() {
      var c = LT[state];
      var g = lv.querySelector('g.dr'); if (g) lv.removeChild(g); g = el('g', { 'class': 'dr' }, lv);
      el('rect', { x: px(c.lo), y: PY1, width: px(c.hi) - px(c.lo), height: PY0 - PY1, fill: '#fde68a', opacity: 0.6 }, g);
      el('line', { x1: PX0, y1: PY0, x2: PX1, y2: PY0, stroke: '#9a9a9a' }, g);
      el('line', { x1: PX0, y1: PY0, x2: PX0, y2: PY1, stroke: '#9a9a9a' }, g);
      [20, 40, 60, 80, 100].forEach(function (p) { txt(g, px(p), PY0 + 18, p + '%', { fs: 12 }); });
      [0, 2, 4, 6, 8, 10].forEach(function (l) { txt(g, PX0 - 8, py(l) + 4, String(l), { a: 'end', fs: 12 }); });
      txt(g, (PX0 + PX1) / 2, PY0 + 40, '運動強度（% VO₂max）', { fs: 13 });
      el('line', { x1: PX0, y1: py(4), x2: PX1, y2: py(4), stroke: '#c2410c', 'stroke-width': 1.5, 'stroke-dasharray': '6 5' }, g);
      txt(g, PX0 + 6, py(4) - 6, 'OBLA 4 mmol/L', { a: 'start', fs: 12, c: '#9a3412', w: 600 });
      var pts = [];
      for (var p = 20; p <= 100; p += 1) {
        var l = lac(p, c.at);
        if (l > LMAX) break;
        pts.push(px(p).toFixed(1) + ',' + py(l).toFixed(1));
      }
      el('polyline', { points: pts.join(' '), fill: 'none', stroke: '#232323', 'stroke-width': 3, 'stroke-linejoin': 'round' }, g);
      var ly = py(lac(c.at, c.at));
      el('circle', { cx: px(c.at), cy: ly, r: 6, fill: '#ea580c', stroke: '#fff', 'stroke-width': 2 }, g);
      txt(g, px(c.at), ly - 14, 'LT', { fs: 14, w: 700, c: '#9a3412' });
      $('lt-v').textContent = c.lo + '–' + c.hi + '% VO₂max';
      $('lt-note').textContent = state === 'untrained'
        ? '未訓練者：血乳酸約在 50–60% VO₂max 開始明顯上升。'
        : '有氧訓練者：乳酸閾值延後到約 70–80% VO₂max，同樣強度下血乳酸較低。';
    }
    var ltBtns = document.querySelectorAll('#lt-lab [data-lt]');
    ltBtns.forEach(function (bt) {
      bt.addEventListener('click', function () {
        state = bt.getAttribute('data-lt');
        ltBtns.forEach(function (x) { x.setAttribute('aria-pressed', x === bt ? 'true' : 'false'); });
        drawLT();
      });
    });
    drawLT();
  }

  /* 互動 3：工作休息比計算 */
  var wr = $('wr-lab');
  if (wr) {
    var SYS = [
      { name: '磷酸原系統', min: 5, max: 10, step: 1, def: 6, lo: 12, hi: 20 },
      { name: '快速糖解', min: 15, max: 30, step: 1, def: 20, lo: 3, hi: 5 },
      { name: '快速糖解與氧化', min: 60, max: 180, step: 10, def: 90, lo: 3, hi: 4 },
      { name: '氧化系統', min: 180, max: 600, step: 30, def: 300, lo: 1, hi: 3 }
    ];
    var cur = 0;
    var r = $('wr-r');
    function drawWR() {
      var s = SYS[cur], w = +r.value;
      $('wr-o').textContent = fmtTime(w);
      $('wr-ratio').textContent = '1:' + s.lo + '–1:' + s.hi;
      $('wr-rest').textContent = fmtTime(w * s.lo) + '–' + fmtTime(w * s.hi);
      $('wr-note').textContent = s.name + '：每趟 ' + fmtTime(w) + '，乘以 ' + s.lo + ' 到 ' + s.hi + '，每趟之間休息 ' + fmtTime(w * s.lo) + ' 到 ' + fmtTime(w * s.hi) + '。';
    }
    var wrBtns = wr.querySelectorAll('[data-sys]');
    wrBtns.forEach(function (bt) {
      bt.addEventListener('click', function () {
        cur = +bt.getAttribute('data-sys');
        wrBtns.forEach(function (x) { x.setAttribute('aria-pressed', x === bt ? 'true' : 'false'); });
        var s = SYS[cur];
        r.min = s.min; r.max = s.max; r.step = s.step; r.value = s.def;
        drawWR();
      });
    });
    r.addEventListener('input', drawWR);
    drawWR();
  }

  /* 考題 */
  var praise = ['答對了！', '沒錯！', '漂亮！'];
  document.querySelectorAll('.quiz').forEach(function (q, qi) {
    var ans = q.getAttribute('data-answer');
    var opts = q.querySelectorAll('.opt');
    var verdict = q.querySelector('.verdict');
    var explain = q.querySelector('.explain');
    opts.forEach(function (o) {
      o.addEventListener('click', function () {
        var k = o.getAttribute('data-k');
        opts.forEach(function (x) { x.classList.remove('is-right', 'is-wrong'); });
        if (k === ans) {
          o.classList.add('is-right');
          verdict.textContent = praise[qi % praise.length] + '正確答案是 (' + ans.toUpperCase() + ')。';
          verdict.className = 'verdict ok';
        } else {
          o.classList.add('is-wrong');
          q.querySelector('[data-k="' + ans + '"]').classList.add('is-right');
          verdict.textContent = '差一點，正確答案是 (' + ans.toUpperCase() + ')。';
          verdict.className = 'verdict no';
        }
        explain.hidden = false;
      });
    });
  });

  /* 翻面卡 */
  document.querySelectorAll('.card').forEach(function (c) {
    c.addEventListener('click', function () {
      c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    });
  });
})();
