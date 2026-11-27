(function () {
  var CAST = [
    { id: 'mom', name: '媽媽', line: '嗨，歡迎你來' },
    { id: 'sis', name: '姊姊', line: '哈囉，你好呀' },
    { id: 'dad', name: '爸爸', line: '你好，慢慢逛喔' },
    { id: 'mei', name: '妹妹', line: '嘿，很高興見到你' }
  ];
  var SIZE = 72, FRAMES = 4, TICK = 140, STEP = 3;
  var narrowMq = window.matchMedia('(max-width: 900px)');
  var motionMq = window.matchMedia('(prefers-reduced-motion: reduce)');

  function readPref() {
    try {
      var v = window.localStorage.getItem('slzpt-pixel-family');
      return v === 'on' || v === 'off' ? v : null;
    } catch (e) { return null; }
  }
  function savePref(on) {
    try {
      if (on) window.localStorage.setItem('slzpt-pixel-family', 'on');
      else window.localStorage.setItem('slzpt-pixel-family', 'off');
    } catch (e) {}
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

  var pref = readPref();
  var paused = false;
  var timer = null;
  var bubbleTimer = null;
  var width = 0;

  var layer = el('div', 'pixel-family');
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

  var first = Math.floor(Math.random() * CAST.length);
  var second = (first + 1 + Math.floor(Math.random() * (CAST.length - 1))) % CAST.length;
  var actors = [CAST[first], CAST[second]].map(function (c, i) {
    var btn = el('button', 'pf-char pf-' + c.id);
    btn.type = 'button';
    btn.setAttribute('aria-label', c.name + '像素小人');
    var body = el('span', 'pf-body');
    var sprite = el('span', 'pf-sprite');
    sprite.setAttribute('aria-hidden', 'true');
    body.appendChild(sprite);
    btn.appendChild(body);
    stage.appendChild(btn);
    var a = { data: c, btn: btn, body: body, sprite: sprite, x: 0, ratio: i ? 0.62 : 0.18, dir: i ? -1 : 1, frame: 0 };
    btn.addEventListener('click', function () { say(a); });
    return a;
  });
  stage.appendChild(bubble);
  layer.appendChild(stage);
  layer.appendChild(ctrl);

  function isOn() { return pref ? pref === 'on' : !narrowMq.matches; }
  function maxX() { return Math.max(0, width - SIZE); }

  function render(a) {
    a.btn.style.transform = 'translate3d(' + a.x + 'px,0,0)';
    a.sprite.style.backgroundPosition = (-a.frame * SIZE) + 'px 0';
    a.sprite.classList.toggle('is-left', a.dir < 0);
  }

  function tick() {
    var max = maxX();
    actors.forEach(function (a) {
      a.frame = (a.frame + 1) % FRAMES;
      a.x += a.dir * STEP;
      if (a.x <= 0) { a.x = 0; a.dir = 1; }
      else if (a.x >= max) { a.x = max; a.dir = -1; }
      render(a);
    });
  }

  function say(a) {
    bubble.textContent = a.data.line;
    var left = Math.min(Math.max(a.x + SIZE / 2 - 60, 8), Math.max(8, width - 180));
    bubble.style.transform = 'translate3d(' + left + 'px,0,0)';
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(function () { bubble.textContent = ''; }, 2500);
    if (motionMq.matches) return;
    a.body.classList.remove('is-jump');
    void a.body.offsetWidth;
    a.body.classList.add('is-jump');
  }

  function measure() {
    var prev = width;
    width = document.documentElement.clientWidth;
    actors.forEach(function (a) {
      a.x = prev ? Math.min(a.x, maxX()) : Math.round(maxX() * a.ratio);
      render(a);
    });
  }

  function sync() {
    var on = isOn();
    var reduce = motionMq.matches;
    stage.hidden = !on;
    document.body.classList.toggle('pf-on', on);
    pauseBtn.hidden = !on || reduce;
    pauseBtn.textContent = paused ? '繼續走動' : '暫停動畫';
    toggleBtn.textContent = on ? '關閉小人' : '顯示小人';
    if (!on) { clearTimeout(bubbleTimer); bubble.textContent = ''; }
    if (reduce) {
      actors.forEach(function (a) { a.frame = 0; a.body.classList.remove('is-jump'); render(a); });
    }
    var run = on && !paused && !reduce && !document.hidden;
    if (run && !timer) timer = setInterval(tick, TICK);
    else if (!run && timer) { clearInterval(timer); timer = null; }
  }

  pauseBtn.addEventListener('click', function () { paused = !paused; sync(); });
  toggleBtn.addEventListener('click', function () {
    var next = !isOn();
    pref = next ? 'on' : 'off';
    savePref(next);
    sync();
  });
  document.addEventListener('visibilitychange', sync);
  onChange(motionMq, sync);
  onChange(narrowMq, sync);
  window.addEventListener('resize', measure);

  document.body.appendChild(layer);
  document.body.classList.add('pf-ready');
  measure();
  sync();
})();
