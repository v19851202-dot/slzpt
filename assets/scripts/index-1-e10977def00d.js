(function () {
  // ===== 分類設定 =====
  // 大分類：mood = 心情、note = 專業分享。
  // 細項：依貼文的標題與摘要文字比對關鍵字（標 first 的先比，其餘由上往下），第一個符合的就是它的細項；都不符合就歸到最後一項。
  // 陣列順序也是細項按鈕的顯示順序。
  // 想新增細項，在對應的陣列加一行 { id, name, re } 即可；要強制指定，在貼文加 data-sub="id"。
  var CATS = {
    note: [
      { id: 'postop',   name: '術後復健',    re: /術後|開刀|手術|置換|重建/ },
      { id: 'spine',    name: '頸肩・背痛',  re: /肩頸|頸部|頸椎|脖子|落枕|背痛|下背|腰痛|腰椎|脊椎|椎間盤|坐骨/ },
      { id: 'upper',    name: '肩・肘・手',  re: /肩膀|肩關節|五十肩|旋轉肌|手肘|網球肘|高爾夫球肘|手腕|腕隧道|手指|板機指|媽媽手/ },
      { id: 'lower',    name: '髖・膝・踝',  re: /髖|膝|十字韌帶|半月板|踝|腳跟|足底|阿基里斯|跟腱|小腿|大腿|鼠蹊|跑者/ },
      { id: 'training', name: '運動訓練',    re: /肌力|阻力訓練|重訓|訓練|體能|ACSM|NSCA|有氧|伸展|暖身/i },
      { id: 'cscs',     name: 'CSCS 筆記',   re: /CSCS/i, first: true },
      { id: 'other',    name: '其他',        re: null }
    ],
    mood: [
      { id: 'ride',     name: '騎車',        re: /騎車|單車|公路車|自行車|車友|踩踏/ },
      { id: 'outdoor',  name: '爬山・露營',  re: /爬山|登山|健行|百岳|露營|山屋|步道/ },
      { id: 'work',     name: '工作日常',    re: /客人|個案|病人|教練|治療|診所|居家|臨床/ },
      { id: 'life',     name: '生活碎念',    re: null }
    ]
  };

  var tabs = document.querySelectorAll('.tab');
  var subbar = document.querySelector('.subtabs');
  var posts = document.querySelectorAll('.grid > [data-cat]');
  var empty = document.querySelector('.empty');
  var q = document.getElementById('q');
  var current = 'all', currentSub = 'all';

  function textOf(p) {
    var t = p.querySelector('.note-title, .post-text');
    var d = p.querySelector('.note-sub');
    return (t ? t.textContent : '') + ' ' + (d ? d.textContent : '');
  }
  function find(cat, id) {
    var list = CATS[cat] || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  // 自動分類，並把細項名稱補進日期前面
  posts.forEach(function (p) {
    var cat = p.getAttribute('data-cat'), list = CATS[cat];
    if (!list) return;
    var sub = find(cat, p.getAttribute('data-sub'));
    if (!sub) {
      var txt = textOf(p);
      var order = list.filter(function (c) { return c.first; }).concat(list.filter(function (c) { return !c.first; }));
      for (var i = 0; i < order.length; i++) {
        if (!order[i].re || order[i].re.test(txt)) { sub = order[i]; break; }
      }
    }
    p.setAttribute('data-sub', sub.id);
    var meta = p.querySelector('.meta');
    if (meta && meta.textContent.indexOf(sub.name) < 0) {
      var tag = document.createElement('span');
      tag.textContent = sub.name;
      meta.insertBefore(tag, meta.querySelector('time'));
    }
  });

  function buildSubs(cat) {
    subbar.innerHTML = '';
    var list = CATS[cat];
    if (!list) { subbar.hidden = true; return; }
    var items = [{ id: 'all', name: '全部' }];
    var total = 0;
    list.forEach(function (c) {
      var n = document.querySelectorAll('.grid > [data-cat="' + cat + '"][data-sub="' + c.id + '"]').length;
      total += n;
      if (n) items.push({ id: c.id, name: c.name, n: n });
    });
    items[0].n = total;
    items.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'subtab';
      b.setAttribute('data-sub', c.id);
      b.setAttribute('aria-pressed', c.id === currentSub ? 'true' : 'false');
      b.innerHTML = '';
      b.appendChild(document.createTextNode(c.name));
      var n = document.createElement('span'); n.className = 'n'; n.textContent = c.n;
      b.appendChild(n);
      b.addEventListener('click', function () { currentSub = c.id; apply(current); });
      subbar.appendChild(b);
    });
    subbar.hidden = items.length < 3; // 只有一個細項時不必顯示
  }

  function apply(filter) {
    if (filter !== current) currentSub = 'all';
    current = filter;
    var term = q.value.trim().toLowerCase();
    var shown = 0;
    posts.forEach(function (p) {
      var on = (filter === 'all' || p.getAttribute('data-cat') === filter) &&
        (currentSub === 'all' || p.getAttribute('data-sub') === currentSub) &&
        (!term || p.textContent.toLowerCase().indexOf(term) >= 0);
      p.hidden = !on;
      if (on) shown++;
    });
    tabs.forEach(function (t) { t.setAttribute('aria-pressed', t.getAttribute('data-filter') === filter ? 'true' : 'false'); });
    buildSubs(filter);
    empty.textContent = term ? '找不到「' + q.value.trim() + '」相關的貼文。' : '這個分類還沒有貼文。';
    empty.hidden = shown > 0;
    try {
      var h = filter === 'all' ? '' : '#' + filter + (currentSub !== 'all' ? '/' + currentSub : '');
      if (location.hash !== h && (h || location.hash.match(/^#(mood|note)/))) history.replaceState(null, '', h || location.pathname + location.search);
    } catch (e) {}
  }
  q.addEventListener('input', function () {
    apply(current);
    if (q.value.trim()) document.getElementById('feed').scrollIntoView({ block: 'nearest' });
  });
  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      var f = t.getAttribute('data-filter');
      // 再點一次已選的大分類 = 收起細項、回到全部
      apply(f === current && f !== 'all' ? 'all' : f);
    });
  });
  // 網址可直接指定分類，例如 slzpt.com/#note/spine
  var m = location.hash.match(/^#(mood|note)(?:\/([\w-]+))?$/);
  if (m) { current = m[1]; currentSub = (m[2] && find(m[1], m[2])) ? m[2] : 'all'; apply(m[1]); }
  else apply('all');
})();
