(function () {
  function $(id) { return document.getElementById(id); }
  function num(el) { var v = parseFloat(el.value); return isFinite(v) ? v : NaN; }
  function fmt(v, d) { return v.toLocaleString('zh-TW', { minimumFractionDigits: d, maximumFractionDigits: d }); }

  /* 互動 1：槓桿 */
  var LEVERS = {
    1: { order: 'E – F – L', ma: 'MA 可 >1、=1 或 <1', pos: { e: 40, f: 170, l: 300 },
         note: '支點在中間，像蹺蹺板。常見例子：頸部伸展抬頭，支點是頭頸交界的關節，抗力是頭的重量，施力是頸後肌群。' },
    2: { order: 'F – L – E', ma: 'MA > 1（省力）', pos: { f: 40, l: 170, e: 300 },
         note: '抗力在中間，施力臂比抗力臂長，所以省力。常見例子：站姿提踵，支點在蹠趾關節，抗力是體重，施力是小腿三頭肌透過阿基里斯腱拉起腳跟。人體裡少見。' },
    3: { order: 'F – E – L', ma: 'MA < 1（費力）', pos: { f: 40, e: 170, l: 300 },
         note: '施力點在中間，施力臂比抗力臂短，所以費力，但換到末端速度與活動範圍。常見例子：二頭肌彎舉，支點是肘關節，施力是二頭肌附著處，抗力是前臂與啞鈴。人體最常見的槓桿。' }
  };
  var lvBtns = document.querySelectorAll('[data-lever]');
  function setLever(k) {
    var L = LEVERS[k];
    $('lv-f').setAttribute('transform', 'translate(' + L.pos.f + ',73)');
    $('lv-e').setAttribute('transform', 'translate(' + L.pos.e + ',0)');
    $('lv-l').setAttribute('transform', 'translate(' + L.pos.l + ',0)');
    $('lv-order').textContent = L.order;
    $('lv-ma').textContent = L.ma;
    $('lv-note').textContent = L.note;
    lvBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-lever') === String(k) ? 'true' : 'false'); });
  }
  lvBtns.forEach(function (b) { b.addEventListener('click', function () { setLever(b.getAttribute('data-lever')); }); });
  setLever(3);

  /* 互動 2：力矩 */
  var EX = 110, EY = 110, PX = 130;
  function drawTorque() {
    var deg = num($('tq-angle')), m = num($('tq-mass')), len = num($('tq-len'));
    $('tq-angle-o').textContent = deg + '°';
    var r = deg * Math.PI / 180, s = Math.sin(r), c = Math.cos(r);
    var tx = EX + PX * s, ty = EY + PX * c;
    $('tq-fore').setAttribute('x2', tx.toFixed(1)); $('tq-fore').setAttribute('y2', ty.toFixed(1));
    $('tq-db').setAttribute('transform', 'translate(' + tx.toFixed(1) + ',' + ty.toFixed(1) + ') rotate(' + (-deg) + ')');
    $('tq-grav').setAttribute('x1', tx.toFixed(1)); $('tq-grav').setAttribute('y1', (ty + 12).toFixed(1));
    $('tq-grav').setAttribute('x2', tx.toFixed(1)); $('tq-grav').setAttribute('y2', '245');
    $('tq-gravlabel').setAttribute('x', (tx + 6).toFixed(1)); $('tq-gravlabel').setAttribute('y', '242');
    $('tq-arm').setAttribute('x1', EX); $('tq-arm').setAttribute('y1', '232');
    $('tq-arm').setAttribute('x2', tx.toFixed(1)); $('tq-arm').setAttribute('y2', '232');
    $('tq-armlabel').setAttribute('x', ((EX + tx) / 2).toFixed(1)); $('tq-armlabel').setAttribute('y', '226');
    $('tq-armlabel').style.display = s < 0.08 ? 'none' : '';
    var ok = isFinite(m) && isFinite(len) && m >= 0 && len >= 0;
    if (!ok) { $('tq-f').textContent = $('tq-d').textContent = $('tq-t').textContent = '—'; $('tq-note').textContent = '請輸入有效的重量與長度。'; return; }
    var F = m * 9.8, d = len * s, T = F * d;
    $('tq-f').textContent = fmt(F, 1) + ' N';
    $('tq-d').textContent = fmt(d, 3) + ' m';
    $('tq-t').textContent = fmt(T, 1) + ' N·m';
    var note;
    if (deg === 90) note = '前臂水平，力臂等於整條前臂長，阻力力矩最大。';
    else if (deg < 15) note = '手臂接近伸直下垂，重力線幾乎通過肘關節，力臂很短，阻力力矩很小。';
    else if (deg > 90) note = '前臂已經過水平，力臂開始變短，阻力力矩下降。';
    else note = '前臂還沒到水平，越接近 90° 力臂越長。';
    $('tq-note').textContent = note + '（' + fmt(F, 1) + ' N × ' + fmt(d, 3) + ' m = ' + fmt(T, 1) + ' N·m）';
  }
  ['tq-angle', 'tq-mass', 'tq-len'].forEach(function (id) { $(id).addEventListener('input', drawTorque); });
  drawTorque();

  /* 互動 3：SSC */
  function drawSSC() {
    var t = num($('ssc-t'));
    $('ssc-t-o').textContent = t + ' ms';
    $('ssc-dot').setAttribute('cx', (10 + (t - 100) / 500 * 320).toFixed(1));
    var fast = t < 250;
    $('ssc-class').textContent = fast ? '快速 SSC' : '慢速 SSC';
    $('ssc-note').textContent = fast
      ? (t <= 150
          ? '觸地時間在 150 毫秒內：屬於快速 SSC，也符合跳深這類衝擊法約 0.15 秒的標準。'
          : '觸地時間短於 250 毫秒，屬於快速 SSC；但若是跳深這類衝擊法，已超過約 0.15 秒的標準。')
      : '觸地時間超過 250 毫秒。轉換期越長，儲存的彈性能量越容易以熱散失。';
  }
  $('ssc-t').addEventListener('input', drawSSC);
  drawSSC();

  /* 互動 4：Margaria-Kalamen */
  function calcMK() {
    var m = num($('mk-m')), h = num($('mk-h')), t = num($('mk-t'));
    if (!(m > 0 && h > 0 && t > 0)) {
      $('mk-s1').textContent = $('mk-s2').textContent = $('mk-s3').textContent = '—';
      $('mk-warn').textContent = '三個數字都要大於 0。';
      return;
    }
    var F = m * 9.8, W = F * h, P = W / t;
    $('mk-s1').innerHTML = '步驟 1：F = ' + fmt(m, 1) + ' × 9.8 = <b>' + fmt(F, 1) + ' N</b>';
    $('mk-s2').innerHTML = '步驟 2：W = ' + fmt(F, 1) + ' × ' + fmt(h, 2) + ' = <b>' + fmt(W, 1) + ' J</b>';
    $('mk-s3').innerHTML = '步驟 3：P = ' + fmt(W, 1) + ' ÷ ' + fmt(t, 2) + ' = <b>' + fmt(P, 1) + ' W</b>';
    $('mk-warn').textContent = '如果漏乘 9.8，會算成 ' + fmt(m * h / t, 1) + '，差了將近 10 倍。';
  }
  ['mk-m', 'mk-h', 'mk-t'].forEach(function (id) { $(id).addEventListener('input', calcMK); });
  calcMK();

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
