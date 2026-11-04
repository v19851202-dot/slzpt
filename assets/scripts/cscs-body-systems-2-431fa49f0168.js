(function () {
  var NS = 'http://www.w3.org/2000/svg';
  function $(id) { return document.getElementById(id); }
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  /* 互動 1：肌小節 */
  var sv = $('sarc-svg');
  if (sv) {
    var S = 1.5, CX = 260, THICK = 160, THIN = 100, SL0 = 300, SL1 = 205;
    var zone = 'A';
    var segBtns = document.querySelectorAll('#sarc-lab [data-zone]');
    function drawSarc() {
      var pct = +$('sarc-r').value;
      $('sarc-o').textContent = pct + '%';
      var SL = SL0 - (SL0 - SL1) * pct / 100;
      var zl = CX - SL / 2 * S, zr = CX + SL / 2 * S;
      var tl = CX - THICK / 2 * S, tr = CX + THICK / 2 * S;
      var al = zl + THIN * S, ar = zr - THIN * S;
      var g = sv.querySelector('g.dr'); if (g) sv.removeChild(g); g = el('g', { 'class': 'dr' }, sv);
      var hl = '#fde68a';
      if (zone === 'A') el('rect', { x: tl, y: 36, width: tr - tl, height: 128, fill: hl, rx: 4 }, g);
      if (zone === 'I') { el('rect', { x: zl, y: 36, width: tl - zl, height: 128, fill: hl, rx: 4 }, g); el('rect', { x: tr, y: 36, width: zr - tr, height: 128, fill: hl, rx: 4 }, g); }
      if (zone === 'H' && ar > al) el('rect', { x: al, y: 36, width: ar - al, height: 128, fill: hl, rx: 4 }, g);
      [70, 100, 130].forEach(function (y) {
        el('rect', { x: tl, y: y - 5, width: tr - tl, height: 10, rx: 3, fill: '#2b2b2b' }, g);
        for (var x = tl + 10; x < tr - 6; x += 16) {
          if (Math.abs(x - CX) < 16) continue;
          var d = x < CX ? -1 : 1;
          el('line', { x1: x, y1: y - 5, x2: x + 5 * d, y2: y - 11, stroke: '#2b2b2b', 'stroke-width': 2 }, g);
          el('line', { x1: x, y1: y + 5, x2: x + 5 * d, y2: y + 11, stroke: '#2b2b2b', 'stroke-width': 2 }, g);
        }
      });
      [55, 85, 115, 145].forEach(function (y) {
        el('rect', { x: zl, y: y - 3, width: THIN * S, height: 6, rx: 3, fill: '#ea580c' }, g);
        el('rect', { x: zr - THIN * S, y: y - 3, width: THIN * S, height: 6, rx: 3, fill: '#ea580c' }, g);
      });
      var zc = zone === 'Z' ? '#c2410c' : '#6b6b6b', zw = zone === 'Z' ? 5 : 3;
      [zl, zr].forEach(function (x) {
        var pts = [];
        for (var i = 0; i <= 8; i++) pts.push((x + (i % 2 ? 5 : -5)) + ',' + (34 + i * 16.5));
        el('polyline', { points: pts.join(' '), fill: 'none', stroke: zc, 'stroke-width': zw, 'stroke-linejoin': 'round' }, g);
      });
      el('line', { x1: CX, y1: 40, x2: CX, y2: 160, stroke: zone === 'M' ? '#c2410c' : '#9a9a9a', 'stroke-width': zone === 'M' ? 4 : 2, 'stroke-dasharray': '4 4' }, g);
      function lbl(x, y, t, bold) { var e = el('text', { x: x, y: y, 'text-anchor': 'middle', 'font-size': 18, 'font-weight': bold ? 700 : 500, fill: bold ? '#9a3412' : '#6b6b6b' }, g); e.textContent = t; }
      lbl(zl, 22, 'Z', zone === 'Z'); lbl(zr, 22, 'Z', zone === 'Z'); lbl(CX, 22, 'M', zone === 'M');
      function brace(x1, x2, y, t, on) {
        if (x2 - x1 < 2) { lbl((x1 + x2) / 2, y + 20, t + '（消失）', on); return; }
        el('path', { d: 'M' + x1 + ' ' + (y - 6) + ' V' + y + ' H' + x2 + ' V' + (y - 6), fill: 'none', stroke: on ? '#c2410c' : '#9a9a9a', 'stroke-width': on ? 2.5 : 1.5 }, g);
        lbl((x1 + x2) / 2, y + 20, t, on);
      }
      brace(tl, tr, 180, 'A 帶', zone === 'A');
      brace(zl, tl, 180, 'I', zone === 'I'); brace(tr, zr, 180, 'I', zone === 'I');
      if (ar > al) brace(al, ar, 216, 'H 區', zone === 'H'); else brace(CX, CX, 216, 'H 區', zone === 'H');
      var I = SL - THICK, H = Math.max(0, SL - 2 * THIN);
      $('s-sl').textContent = SL.toFixed(0);
      $('s-a').textContent = THICK + '（不變）';
      $('s-i').textContent = I.toFixed(0);
      $('s-h').textContent = H.toFixed(0);
      $('sarc-note').textContent = pct === 0
        ? '放鬆狀態：細肌絲與粗肌絲部分重疊。往右拉滑桿，看哪些區塊變短。'
        : '收縮 ' + pct + '%：肌小節從 ' + SL0 + ' 縮到 ' + SL.toFixed(0) + '，I 帶從 ' + (SL0 - THICK) + ' 變成 ' + I.toFixed(0) + '，H 區從 ' + (SL0 - 2 * THIN) + ' 變成 ' + H.toFixed(0) + '；A 帶始終是 ' + THICK + '。';
    }
    segBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        zone = b.getAttribute('data-zone');
        segBtns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        drawSarc();
      });
    });
    $('sarc-r').addEventListener('input', drawSarc);
    drawSarc();
  }

  /* 互動 2：運動單位徵召 */
  var mv = $('mu-svg');
  if (mv) {
    var UNITS = [
      { t: 'I', r: 9, th: 4 }, { t: 'I', r: 11, th: 10 }, { t: 'I', r: 13, th: 18 },
      { t: 'IIa', r: 16, th: 28 }, { t: 'IIa', r: 18, th: 40 }, { t: 'IIa', r: 20, th: 52 },
      { t: 'IIx', r: 23, th: 66 }, { t: 'IIx', r: 26, th: 80 }
    ];
    var COL = { I: '#64748b', IIa: '#ea580c', IIx: '#9a3412' };
    var mode = 'ramp';
    var modeBtns = document.querySelectorAll('#mu-lab [data-mode]');
    function drawMU() {
      var f = +$('mu-r').value;
      $('mu-o').textContent = f + '%';
      var g = mv.querySelector('g.dr'); if (g) mv.removeChild(g); g = el('g', { 'class': 'dr' }, mv);
      var n = 0, types = [];
      UNITS.forEach(function (u, i) {
        var th = mode === 'ballistic' ? u.th * 0.5 : u.th;
        var on = f >= th && f > 0;
        var x = 42 + i * 62, y = 150;
        var rate = 0;
        if (on) { n++; if (types.indexOf(u.t) < 0) types.push(u.t); rate = mode === 'ballistic' ? 1 : Math.min(1, 0.3 + (f - th) / 45); }
        el('rect', { x: x - 8, y: 20, width: 16, height: 90, rx: 3, fill: '#f1f1f1' }, g);
        if (rate > 0) el('rect', { x: x - 8, y: 20 + 90 * (1 - rate), width: 16, height: 90 * rate, rx: 3, fill: COL[u.t] }, g);
        el('circle', { cx: x, cy: y, r: u.r, fill: on ? COL[u.t] : '#fff', stroke: COL[u.t], 'stroke-width': 2.5 }, g);
        var t = el('text', { x: x, y: 204, 'text-anchor': 'middle', 'font-size': 17, 'font-weight': on ? 700 : 400, fill: on ? '#232323' : '#9a9a9a' }, g);
        t.textContent = u.t;
      });
      var cap = el('text', { x: 6, y: 14, 'font-size': 14, fill: '#6b6b6b' }, g); cap.textContent = '放電頻率（相對）';
      $('mu-n').textContent = n + ' / 8';
      $('mu-type').textContent = types.length ? types.join('、') : '無';
      $('mu-note').textContent = mode === 'ramp'
        ? '慢速漸增收縮：力量需求愈高，由左（小、低門檻）到右（大、高門檻）依序加入；已徵召的單位放電頻率也跟著上升。'
        : '彈震式收縮：順序一樣由小到大，但每個單位的門檻都較低，同樣的力量需求會叫起更多單位，而且一開始就以很高的頻率放電。';
    }
    modeBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        mode = b.getAttribute('data-mode');
        modeBtns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        drawMU();
      });
    });
    $('mu-r').addEventListener('input', drawMU);
    drawMU();
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
