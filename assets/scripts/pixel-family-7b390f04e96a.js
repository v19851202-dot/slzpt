(function () {
  var CAST = [
    { id: 'mom', name: '媽媽', line: '嗨，歡迎你來' },
    { id: 'sis', name: '姊姊', line: '哈囉，你好呀' },
    { id: 'dad', name: '爸爸', line: '你好，慢慢逛喔' },
    { id: 'mei', name: '妹妹', line: '嘿，很高興見到你' }
  ];
  var PERSONAS = ['shy', 'sudden', 'bold'];
  var DESKTOP = 44, MOBILE = 36, SPEED = 36, BOLD_SPEED = 64;
  var MOVE_MS = 3000, AUTO_MS = 8000, TAP_GAP = 320, SHY_BACK_MS = 1800;
  var KEY = 'slzpt-pixel-family', AUTO_KEY = 'slzpt-pixel-family-auto';
  var HELLO = '嘿！你好啊！';
  var NS = 'http://www.w3.org/2000/svg';
  var INK = '#3A3A3C';
  var motionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var narrowMq = window.matchMedia('(max-width: 900px)');
  var isHome = document.body.classList.contains('home');
  var title = !isHome && document.querySelector('article.page > h1, article.page h1');
  if (!isHome && !title) return;

  function readPref() {
    try {
      var v = window.localStorage.getItem(KEY);
      return v === 'on' || v === 'off' ? v : null;
    } catch (e) { return null; }
  }
  function savePref(on) {
    try {
      if (on) window.localStorage.setItem(KEY, 'on');
      else window.localStorage.setItem(KEY, 'off');
    } catch (e) {}
  }
  function readAuto() {
    try { return window.sessionStorage.getItem(AUTO_KEY) === '1'; }
    catch (e) { return false; }
  }
  function saveAuto() {
    try { window.sessionStorage.setItem(AUTO_KEY, '1'); }
    catch (e) {}
  }
  function param(name) {
    var q = document.URL.split('?')[1] || '';
    var i, part, bits = q.split('#')[0].split('&');
    for (i = 0; i < bits.length; i++) {
      part = bits[i].split('=');
      if (decodeURIComponent(part[0] || '') === name) return decodeURIComponent((part[1] || '').replace(/\+/g, ' '));
    }
    return '';
  }
  function el(tag, cls) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }
  function svg(name, attrs, kids) {
    var n = document.createElementNS(NS, name);
    var k;
    if (attrs) for (k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, attrs[k]);
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function onChange(mq, fn) {
    if (mq.addEventListener) mq.addEventListener('change', fn);
    else if (mq.addListener) mq.addListener(fn);
  }
  function pickTwo() {
    var first = Math.floor(Math.random() * CAST.length);
    var second = (first + 1 + Math.floor(Math.random() * (CAST.length - 1))) % CAST.length;
    return [CAST[first], CAST[second]];
  }
  function pfParam() { return param('pf'); }
  function charSize() { return narrowMq.matches ? MOBILE : DESKTOP; }

  function limb(cls, x, y) {
    return svg('g', { transform: 'translate(' + x + ' ' + y + ')' }, [
      svg('g', { 'class': cls }, [
        svg('line', { x1: '0', y1: '0', x2: '0', y2: '15', stroke: INK, 'stroke-width': '3.2', 'stroke-linecap': 'round' })
      ])
    ]);
  }
  function eye(cx, cy, r, fill) {
    return svg('g', { 'class': 'pf-eye' }, [
      svg('ellipse', { cx: String(cx), cy: String(cy), rx: String(r), ry: String(r * 1.05), fill: '#FFFFFF', stroke: INK, 'stroke-width': '2.2' }),
      svg('circle', { cx: String(cx), cy: String(cy + 0.4), r: String(r * 0.38), fill: INK }),
      svg('ellipse', { 'class': 'pf-lid', cx: String(cx), cy: String(cy), rx: String(r + 0.6), ry: String(r + 0.8), fill: fill })
    ]);
  }

  function drawMom() {
    var fill = '#FD9284', hi = '#FFC1B6';
    return svg('svg', { 'class': 'pf-svg', viewBox: '0 0 80 80', fill: 'none', 'aria-hidden': 'true' }, [
      svg('g', { 'class': 'pf-fig' }, [
        svg('ellipse', { cx: '40', cy: '76.5', rx: '15', ry: '2.6', fill: 'rgba(24,24,27,.14)' }),
        limb('pf-leg pf-leg-l', 32, 54),
        limb('pf-leg pf-leg-r', 48, 54),
        limb('pf-arm pf-arm-l', 24, 40),
        svg('g', { 'class': 'pf-torso' }, [
          svg('rect', { x: '26', y: '36', width: '28', height: '22', rx: '11', fill: fill, stroke: INK, 'stroke-width': '2.4' })
        ]),
        limb('pf-arm pf-arm-r', 56, 40),
        svg('g', { 'class': 'pf-head' }, [
          svg('rect', { x: '21', y: '7', width: '38', height: '36', rx: '15', fill: fill, stroke: INK, 'stroke-width': '2.4' }),
          svg('ellipse', { cx: '34', cy: '16', rx: '8', ry: '5', fill: hi, opacity: '.85' }),
          svg('circle', { cx: '29', cy: '30', r: '3.2', fill: '#F07575', opacity: '.45' }),
          svg('circle', { cx: '51', cy: '30', r: '3.2', fill: '#F07575', opacity: '.45' }),
          eye(31.5, 24, 5.2, fill),
          eye(48.5, 24, 5.2, fill),
          svg('path', { d: 'M38 30.5 L40.5 33.5 L43 30.5', stroke: INK, 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
          svg('path', { d: 'M34 36.5 Q40 41 46 36.5', stroke: INK, 'stroke-width': '2.1', 'stroke-linecap': 'round', fill: 'none' })
        ])
      ])
    ]);
  }
  function drawSis() {
    var fill = '#8FCFC6', hi = '#C8EBE5';
    return svg('svg', { 'class': 'pf-svg', viewBox: '0 0 80 80', fill: 'none', 'aria-hidden': 'true' }, [
      svg('g', { 'class': 'pf-fig' }, [
        svg('ellipse', { cx: '40', cy: '76.5', rx: '14', ry: '2.5', fill: 'rgba(24,24,27,.14)' }),
        limb('pf-leg pf-leg-l', 33, 56),
        limb('pf-leg pf-leg-r', 47, 56),
        limb('pf-arm pf-arm-l', 22, 40),
        svg('g', { 'class': 'pf-torso' }, [
          svg('path', { d: 'M20 44 C16 48 22 64 30 66 L50 66 C58 64 64 48 60 44 C54 38 26 38 20 44Z', fill: fill, stroke: INK, 'stroke-width': '2.4', 'stroke-linejoin': 'round' })
        ]),
        limb('pf-arm pf-arm-r', 58, 41),
        svg('g', { 'class': 'pf-head' }, [
          svg('ellipse', { cx: '41', cy: '24', rx: '19.5', ry: '17.5', fill: fill, stroke: INK, 'stroke-width': '2.4' }),
          svg('ellipse', { cx: '34', cy: '16', rx: '8', ry: '4.5', fill: hi, opacity: '.9' }),
          eye(32, 26.8, 5.1, fill),
          eye(51, 22.4, 5.1, fill),
          svg('path', { d: 'M40 29.5 C40.8 32.5 42.4 34 44 34.2', stroke: INK, 'stroke-width': '2', 'stroke-linecap': 'round', fill: 'none' }),
          svg('path', { d: 'M36 36.5 Q43 40 50 34.5', stroke: INK, 'stroke-width': '2', 'stroke-linecap': 'round', fill: 'none' })
        ])
      ])
    ]);
  }
  function drawDad() {
    var fill = '#4F709E', hi = '#8AA3C4';
    var spikes = [];
    var cx = 40, cy = 26, i, x, y, a, x1, y1, x2, y2;
    var pts = [[40, 5], [28, 7], [16, 14], [13, 24], [52, 7], [64, 14], [67, 24], [22, 10], [58, 10]];
    for (i = 0; i < pts.length; i++) {
      x = pts[i][0]; y = pts[i][1];
      a = Math.atan2(y - cy, x - cx);
      x1 = cx + Math.cos(a - 0.22) * 16;
      y1 = cy + Math.sin(a - 0.22) * 14.5;
      x2 = cx + Math.cos(a + 0.22) * 16;
      y2 = cy + Math.sin(a + 0.22) * 14.5;
      spikes.push(svg('polygon', { points: x + ',' + y + ' ' + x1 + ',' + y1 + ' ' + x2 + ',' + y2, fill: fill, stroke: INK, 'stroke-width': '2', 'stroke-linejoin': 'round' }));
    }
    return svg('svg', { 'class': 'pf-svg', viewBox: '0 0 80 80', fill: 'none', 'aria-hidden': 'true' }, [
      svg('g', { 'class': 'pf-fig' }, [
        svg('ellipse', { cx: '40', cy: '76.5', rx: '16', ry: '2.6', fill: 'rgba(24,24,27,.14)' }),
        limb('pf-leg pf-leg-l', 32, 54),
        limb('pf-leg pf-leg-r', 48, 54),
        limb('pf-arm pf-arm-l', 22, 40),
        svg('g', { 'class': 'pf-torso' }, [
          svg('ellipse', { cx: '40', cy: '48', rx: '16', ry: '13', fill: fill, stroke: INK, 'stroke-width': '2.4' })
        ]),
        limb('pf-arm pf-arm-r', 58, 40),
        svg('g', { 'class': 'pf-head' }, [
          svg('g', { 'class': 'pf-spikes' }, spikes),
          svg('ellipse', { cx: '40', cy: '26', rx: '18', ry: '16.5', fill: fill, stroke: INK, 'stroke-width': '2.4' }),
          svg('ellipse', { cx: '33', cy: '19', rx: '7', ry: '4', fill: hi, opacity: '.75' }),
          eye(32.5, 25, 5.3, fill),
          eye(47.5, 25, 5.3, fill),
          svg('rect', { x: '30', y: '33', width: '20', height: '7.5', rx: '2', fill: '#FFFFFF', stroke: INK, 'stroke-width': '2' }),
          svg('line', { x1: '37', y1: '33', x2: '37', y2: '40.5', stroke: INK, 'stroke-width': '1.6' }),
          svg('line', { x1: '43', y1: '33', x2: '43', y2: '40.5', stroke: INK, 'stroke-width': '1.6' })
        ])
      ])
    ]);
  }
  function drawMei() {
    var fill = '#FCCD66', hi = '#FFE08A';
    return svg('svg', { 'class': 'pf-svg', viewBox: '0 0 80 80', fill: 'none', 'aria-hidden': 'true' }, [
      svg('g', { 'class': 'pf-fig', transform: 'translate(0 6)' }, [
        svg('ellipse', { cx: '40', cy: '70.5', rx: '13', ry: '2.3', fill: 'rgba(24,24,27,.14)' }),
        limb('pf-leg pf-leg-l', 33, 50),
        limb('pf-leg pf-leg-r', 47, 50),
        limb('pf-arm pf-arm-l', 26, 36),
        svg('g', { 'class': 'pf-torso' }, [
          svg('rect', { x: '28', y: '34', width: '24', height: '20', rx: '10', fill: fill, stroke: INK, 'stroke-width': '2.4' })
        ]),
        limb('pf-arm pf-arm-r', 54, 36),
        svg('g', { 'class': 'pf-head' }, [
          svg('path', { d: 'M30 14 L32 6 L36 14 Z M37 14 L40 4 L43 14 Z M44 14 L48 6 L50 14 Z', fill: INK }),
          svg('path', { d: 'M29 14 H51', stroke: INK, 'stroke-width': '2.4', 'stroke-linecap': 'round' }),
          svg('path', { d: 'M40 16 C42 12 44 12 43 16', stroke: INK, 'stroke-width': '2', fill: 'none', 'stroke-linecap': 'round' }),
          svg('rect', { x: '23', y: '16', width: '34', height: '28', rx: '13', fill: fill, stroke: INK, 'stroke-width': '2.4' }),
          svg('ellipse', { cx: '33', cy: '22', rx: '7', ry: '4', fill: hi, opacity: '.9' }),
          eye(31.5, 29, 5, fill),
          eye(48.5, 29, 5, fill),
          svg('path', { d: 'M39 33.5 L43.5 36 L39 38.5 Z', fill: INK }),
          svg('path', { d: 'M34 40 Q40 44 46 40', stroke: INK, 'stroke-width': '2', 'stroke-linecap': 'round', fill: 'none' })
        ])
      ])
    ]);
  }
  var DRAW = { mom: drawMom, sis: drawSis, dad: drawDad, mei: drawMei };

  var pref = readPref();
  var paused = false;
  var raf = null;
  var lastTs = 0;
  var bubbleTimer = null;
  var autoTimer = null;
  var width = 0;
  var reserve = 0;
  var moving = false;
  var moveLeft = 0;
  var moveLoop = false;
  var persona = '';
  var shyTimer = null;
  var shyWatching = false;
  var clickTimer = null;
  var lastTap = 0;
  var autoMs = typeof window.PF_AUTO_MS === 'number' ? window.PF_AUTO_MS : AUTO_MS;

  var layer = el('div', 'pixel-family' + (isHome ? '' : ' pf-article'));
  layer.setAttribute('role', 'group');
  layer.setAttribute('aria-label', '全家小人');
  var stage = el('div', 'pf-stage');
  var bubble = el('p', 'pf-bubble');
  bubble.setAttribute('aria-live', 'polite');
  var ctrl = el('div', 'pf-ctrl');
  var pauseBtn = el('button');
  var toggleBtn = el('button');
  pauseBtn.type = toggleBtn.type = 'button';
  ctrl.appendChild(pauseBtn);
  ctrl.appendChild(toggleBtn);

  function makeActor(c, ratio, dir) {
    var btn = el('button', 'pf-char pf-' + c.id);
    btn.type = 'button';
    btn.setAttribute('aria-label', c.name + '小人');
    var body = el('span', 'pf-body');
    var picture = DRAW[c.id]();
    body.appendChild(picture);
    btn.appendChild(body);
    stage.appendChild(btn);
    var a = { data: c, btn: btn, body: body, fig: picture.querySelector('.pf-fig'), x: 0, ratio: ratio, dir: dir };
    btn.addEventListener('pointerup', function (ev) { onTap(a, ev, 'pointer'); });
    btn.addEventListener('click', function (ev) { onTap(a, ev, 'click'); });
    btn.addEventListener('dblclick', function (ev) {
      ev.preventDefault();
      lastTap = 0;
      if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
      if (isHome) startMove(false);
    });
    return a;
  }

  var actors;
  if (isHome) {
    var pair = pickTwo();
    actors = [makeActor(pair[0], 0.18, 1), makeActor(pair[1], 0.62, -1)];
  } else {
    actors = [makeActor(CAST[Math.floor(Math.random() * CAST.length)], 0.72, -1)];
  }
  stage.appendChild(bubble);
  layer.appendChild(stage);
  layer.appendChild(ctrl);

  if (!isHome) {
    var slot = el('div', 'pf-title-slot');
    title.parentNode.insertBefore(slot, title);
    slot.appendChild(title);
    slot.appendChild(layer);
    var chosen = pfParam();
    persona = PERSONAS.indexOf(chosen) >= 0 ? chosen : PERSONAS[Math.floor(Math.random() * PERSONAS.length)];
    layer.setAttribute('data-pf-persona', persona);
  } else {
    document.body.appendChild(layer);
    document.body.classList.add('pf-ready');
  }

  function isOn() { return pref ? pref === 'on' : true; }
  function maxX() { return Math.max(0, width - charSize() - reserve); }

  function render(a) {
    a.btn.style.transform = 'translate3d(' + a.x + 'px,0,0)';
    if (a.fig) a.fig.classList.toggle('is-left', !moving && a.dir < 0);
    a.btn.classList.toggle('is-dance', moving);
    a.btn.classList.toggle('is-loop', moving && moveLoop);
  }

  function tick(dt) {
    if (moving) return;
    var max = maxX();
    var step = (persona === 'bold' ? BOLD_SPEED : SPEED) * (dt / 1000);
    actors.forEach(function (a) {
      if (a.btn.classList.contains('is-peek') || a.btn.classList.contains('is-away')) return;
      a.x += a.dir * step;
      if (a.x <= 0) { a.x = 0; a.dir = 1; }
      else if (a.x >= max) { a.x = max; a.dir = -1; }
      render(a);
    });
  }

  function loop(ts) {
    if (!running()) { raf = null; lastTs = 0; return; }
    if (!lastTs) lastTs = ts;
    var dt = Math.min(ts - lastTs, 48);
    lastTs = ts;
    if (moving && !moveLoop) {
      moveLeft -= dt;
      if (moveLeft <= 0) { stopMove(); return; }
    }
    tick(dt);
    raf = window.requestAnimationFrame(loop);
  }

  function say(a, text, loud) {
    bubble.textContent = text || a.data.line;
    bubble.classList.toggle('is-loud', !!loud);
    var sz = charSize();
    var left = Math.min(Math.max(a.x + sz / 2 - 48, 8), Math.max(8, width - 160));
    bubble.style.transform = 'translate3d(' + left + 'px,0,0)';
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(function () { bubble.textContent = ''; bubble.classList.remove('is-loud'); }, loud ? 3200 : 2500);
    if (motionMq.matches || moving) return;
    a.body.classList.remove('is-jump');
    void a.body.offsetWidth;
    a.body.classList.add('is-jump');
  }

  function stopMove() {
    moving = false;
    moveLoop = false;
    layer.removeAttribute('data-pf-dancing');
    actors.forEach(function (a) {
      a.btn.classList.remove('is-dance', 'is-loop');
      render(a);
    });
    sync();
  }

  function startMove(looping) {
    if (!isOn() || motionMq.matches) return;
    moving = true;
    moveLoop = !!looping;
    moveLeft = MOVE_MS;
    layer.setAttribute('data-pf-dancing', '1');
    actors.forEach(function (a) {
      a.btn.classList.remove('is-peek', 'is-away', 'is-walk');
      a.body.classList.remove('is-jump', 'is-pop');
      render(a);
    });
    sync();
  }

  function onTap(a, ev, via) {
    if (ev.button && ev.button !== 0) return;
    if (!isOn()) return;
    var touch = ev.pointerType && ev.pointerType !== 'mouse';
    if (via === 'pointer' && !touch) return;
    if (via === 'click' && touch) return;
    if (!isHome) {
      if (persona === 'shy' && !motionMq.matches) { shyHide(); return; }
      say(a);
      return;
    }
    if (via === 'click') {
      if (clickTimer) clearTimeout(clickTimer);
      clickTimer = setTimeout(function () {
        clickTimer = null;
        if (!moving) say(a);
      }, TAP_GAP);
      return;
    }
    var now = ev.timeStamp || 0;
    if (now && lastTap && now - lastTap < TAP_GAP) {
      lastTap = 0;
      if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
      startMove(false);
      return;
    }
    lastTap = now;
    if (clickTimer) clearTimeout(clickTimer);
    clickTimer = setTimeout(function () {
      clickTimer = null;
      if (!moving) say(a);
    }, TAP_GAP);
  }

  function measure() {
    var prev = width;
    if (isHome) width = document.documentElement.clientWidth;
    else width = stage.clientWidth;
    reserve = 0;
    actors.forEach(function (a) {
      a.x = prev ? Math.min(a.x, maxX()) : Math.round(maxX() * a.ratio);
      render(a);
    });
  }

  function shyHide() {
    if (!isOn() || motionMq.matches) return;
    actors.forEach(function (a) {
      a.btn.classList.add('is-away');
      a.btn.classList.remove('is-peek', 'is-walk');
    });
    clearTimeout(shyTimer);
    shyTimer = setTimeout(function () {
      if (!isOn() || persona !== 'shy') return;
      actors.forEach(function (a) {
        a.btn.classList.remove('is-away');
        a.btn.classList.add('is-peek');
        a.x = Math.round(maxX() * a.ratio);
        render(a);
      });
    }, SHY_BACK_MS);
  }

  function onPointerMove(ev) {
    if (persona !== 'shy' || !isOn() || motionMq.matches || moving) return;
    var a = actors[0];
    if (!a || a.btn.classList.contains('is-away')) return;
    var r = a.btn.getBoundingClientRect();
    var dx = ev.clientX - (r.left + r.width / 2), dy = ev.clientY - (r.top + r.height / 2);
    if (dx * dx + dy * dy < 80 * 80) shyHide();
  }

  function startArticle() {
    var reduce = motionMq.matches;
    actors.forEach(function (a) {
      a.btn.classList.remove('is-peek', 'is-away');
      a.body.classList.remove('is-pop');
    });
    clearTimeout(shyTimer);
    if (document.removeEventListener) document.removeEventListener('pointermove', onPointerMove);
    shyWatching = false;
    if (!isOn()) return;
    if (reduce) {
      actors.forEach(function (a) { render(a); });
      return;
    }
    if (persona === 'shy') {
      actors.forEach(function (a) {
        a.btn.classList.add('is-peek');
        a.x = Math.round(maxX() * a.ratio);
        render(a);
      });
      if (!shyWatching) {
        document.addEventListener('pointermove', onPointerMove);
        shyWatching = true;
      }
      return;
    }
    if (persona === 'sudden') {
      actors.forEach(function (a) { a.btn.classList.add('is-away'); render(a); });
      setTimeout(function () {
        if (!isOn() || persona !== 'sudden' || motionMq.matches) return;
        actors.forEach(function (a) {
          a.btn.classList.remove('is-away');
          a.body.classList.remove('is-pop');
          void a.body.offsetWidth;
          a.body.classList.add('is-pop');
          render(a);
        });
        sync();
      }, 700);
      return;
    }
    if (persona === 'bold') {
      actors.forEach(function (a) {
        a.x = Math.min(8, maxX());
        a.dir = 1;
        render(a);
        say(a, HELLO, true);
      });
    }
  }

  function running() {
    if (!isOn() || paused || motionMq.matches || document.hidden) return false;
    if (moving) return true;
    if (!isHome) {
      if (persona === 'shy') return false;
      if (persona === 'sudden' && actors.some(function (a) { return a.btn.classList.contains('is-away'); })) return false;
    }
    return true;
  }

  function sync() {
    var on = isOn();
    var reduce = motionMq.matches;
    var frozen = on && (paused || document.hidden);
    var walk = on && !paused && !reduce && !moving && !document.hidden;
    if (!isHome && walk) {
      if (persona === 'shy') walk = false;
      if (persona === 'sudden' && actors.some(function (a) { return a.btn.classList.contains('is-away'); })) walk = false;
    }
    stage.hidden = !on;
    if (isHome) document.body.classList.toggle('pf-on', on);
    pauseBtn.hidden = !on || reduce;
    pauseBtn.textContent = paused ? '繼續走動' : '暫停動畫';
    toggleBtn.textContent = on ? '關閉小人' : '顯示小人';
    if (!on) {
      clearTimeout(bubbleTimer);
      bubble.textContent = '';
      bubble.classList.remove('is-loud');
      if (moving) stopMove();
    }
    if (reduce && moving) stopMove();
    actors.forEach(function (a) {
      a.btn.classList.toggle('is-live', on && !reduce && !document.hidden);
      a.btn.classList.toggle('is-walk', walk && !a.btn.classList.contains('is-peek') && !a.btn.classList.contains('is-away'));
      a.btn.classList.toggle('is-frozen', frozen);
      if (reduce) {
        a.btn.classList.remove('is-peek', 'is-away', 'is-dance', 'is-loop', 'is-walk');
        a.body.classList.remove('is-jump', 'is-pop');
      }
      render(a);
    });
    if (running() && !raf) {
      lastTs = 0;
      raf = window.requestAnimationFrame(loop);
    } else if (!running() && raf) {
      window.cancelAnimationFrame(raf);
      raf = null;
      lastTs = 0;
    }
  }

  function armAuto() {
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
    if (!isHome || !isOn() || motionMq.matches || readAuto() || pfParam() === 'dance') return;
    autoTimer = setTimeout(function () {
      autoTimer = null;
      if (!isOn() || paused || motionMq.matches || document.hidden || readAuto()) return;
      saveAuto();
      startMove(false);
    }, autoMs);
  }

  pauseBtn.addEventListener('click', function () { paused = !paused; sync(); });
  toggleBtn.addEventListener('click', function () {
    var next = !isOn();
    pref = next ? 'on' : 'off';
    savePref(next);
    if (next && !isHome) startArticle();
    sync();
    if (isHome) armAuto();
  });
  document.addEventListener('visibilitychange', function () {
    sync();
    if (isHome && !document.hidden) armAuto();
  });
  onChange(motionMq, function () {
    if (!isHome) startArticle();
    sync();
    if (isHome) armAuto();
  });
  onChange(narrowMq, measure);
  window.addEventListener('resize', measure);

  measure();
  if (!isHome) startArticle();
  sync();
  if (isHome && pfParam() === 'dance' && isOn() && !motionMq.matches) startMove(true);
  else if (isHome) armAuto();
})();
