(function () {
  var CAST = [
    { id: 'mom', name: '媽媽', line: '嗨，歡迎你來' },
    { id: 'sis', name: '姊姊', line: '哈囉，你好呀' },
    { id: 'dad', name: '爸爸', line: '你好，慢慢逛喔' },
    { id: 'mei', name: '妹妹', line: '嘿，很高興見到你' }
  ];
  var PERSONAS = ['shy', 'sudden', 'bold'];
  var SIZE = 72, FRAMES = 4, MOVE_FRAMES = 8, TICK = 140, STEP = 3, BOLD_STEP = 6;
  var MOVE_MS = 3000, AUTO_MS = 8000, TAP_GAP = 320, SHY_BACK_MS = 1800;
  var KEY = 'slzpt-pixel-family', AUTO_KEY = 'slzpt-pixel-family-auto';
  var HELLO = '嘿！你好啊！';
  var motionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
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

  var pref = readPref();
  var paused = false;
  var timer = null;
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
  layer.setAttribute('aria-label', '全家像素小人');
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
    btn.setAttribute('aria-label', c.name + '像素小人');
    var body = el('span', 'pf-body');
    var sprite = el('span', 'pf-sprite');
    sprite.setAttribute('aria-hidden', 'true');
    body.appendChild(sprite);
    btn.appendChild(body);
    stage.appendChild(btn);
    var a = { data: c, btn: btn, body: body, sprite: sprite, x: 0, ratio: ratio, dir: dir, frame: 0 };
    btn.addEventListener('pointerup', function (ev) { onTap(a, ev); });
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
  function maxX() { return Math.max(0, width - SIZE - reserve); }

  function render(a) {
    a.btn.style.transform = 'translate3d(' + a.x + 'px,0,0)';
    var frames = moving ? MOVE_FRAMES : FRAMES;
    a.sprite.style.backgroundPosition = (-(a.frame % frames) * SIZE) + 'px 0';
    a.sprite.classList.toggle('is-left', !moving && a.dir < 0);
    a.sprite.classList.toggle('is-dance', moving);
  }

  function tick() {
    if (moving) {
      actors.forEach(function (a) {
        a.frame = (a.frame + 1) % MOVE_FRAMES;
        render(a);
      });
      return;
    }
    var max = maxX();
    actors.forEach(function (a) {
      if (a.btn.classList.contains('is-peek') || a.btn.classList.contains('is-away')) return;
      a.frame = (a.frame + 1) % FRAMES;
      a.x += a.dir * (persona === 'bold' ? BOLD_STEP : STEP);
      if (a.x <= 0) { a.x = 0; a.dir = 1; }
      else if (a.x >= max) { a.x = max; a.dir = -1; }
      render(a);
    });
  }

  function say(a, text, loud) {
    bubble.textContent = text || a.data.line;
    bubble.classList.toggle('is-loud', !!loud);
    var left = Math.min(Math.max(a.x + SIZE / 2 - 60, 8), Math.max(8, width - 180));
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
      a.frame = 0;
      a.sprite.classList.remove('is-dance');
      render(a);
    });
    sync();
  }

  function startMove(loop) {
    if (!isOn() || motionMq.matches) return;
    moving = true;
    moveLoop = !!loop;
    moveLeft = MOVE_MS;
    layer.setAttribute('data-pf-dancing', '1');
    actors.forEach(function (a) {
      a.btn.classList.remove('is-peek', 'is-away');
      a.body.classList.remove('is-jump', 'is-pop');
      a.frame = 0;
      render(a);
    });
    sync();
  }

  function onTap(a, ev) {
    if (ev.button && ev.button !== 0) return;
    if (!isOn()) return;
    if (!isHome) {
      if (persona === 'shy' && !motionMq.matches) { shyHide(); return; }
      if (!motionMq.matches) say(a);
      else say(a);
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
      a.btn.classList.remove('is-peek');
    });
    clearTimeout(shyTimer);
    shyTimer = setTimeout(function () {
      if (!isOn() || persona !== 'shy') return;
      actors.forEach(function (a) {
        a.btn.classList.remove('is-away');
        a.btn.classList.add('is-peek');
        a.x = Math.round(maxX() * a.ratio);
        a.frame = 0;
        render(a);
      });
    }, SHY_BACK_MS);
  }

  function onPointerMove(ev) {
    if (persona !== 'shy' || !isOn() || motionMq.matches || moving) return;
    var a = actors[0];
    if (!a || a.btn.classList.contains('is-away')) return;
    var r = a.btn.getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var dx = ev.clientX - cx, dy = ev.clientY - cy;
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
      actors.forEach(function (a) { a.frame = 0; render(a); });
      return;
    }
    if (persona === 'shy') {
      actors.forEach(function (a) {
        a.btn.classList.add('is-peek');
        a.x = Math.round(maxX() * a.ratio);
        a.frame = 0;
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
    if (reduce) {
      actors.forEach(function (a) {
        a.frame = 0;
        a.btn.classList.remove('is-peek', 'is-away');
        a.body.classList.remove('is-jump', 'is-pop');
        a.sprite.classList.remove('is-dance');
        render(a);
      });
    }
    if (timer) { clearInterval(timer); timer = null; }
    if (running()) timer = setInterval(function () {
      if (moving && !moveLoop) {
        moveLeft -= TICK;
        if (moveLeft <= 0) { stopMove(); return; }
      }
      tick();
    }, TICK);
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
  window.addEventListener('resize', measure);

  measure();
  if (!isHome) startArticle();
  sync();
  if (isHome && pfParam() === 'dance' && isOn() && !motionMq.matches) startMove(true);
  else if (isHome) armAuto();
})();
