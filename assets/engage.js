// 文章下方的「分享」與「留言」區塊。
// 每篇文章只要在 <head> 加上：
//   <link rel="stylesheet" href="/assets/engage.css">
//   <script src="/assets/engage.js" defer></script>
// 區塊會自動放在文章最後一個「← 回到所有貼文」連結前面。
(function () {
  var article = document.querySelector('article.page') || document.querySelector('article') || document.body;
  var backs = article.querySelectorAll('a.back');
  var anchor = backs.length ? backs[backs.length - 1] : null;

  var canonical = document.querySelector('link[rel="canonical"]');
  var shareUrl = canonical ? canonical.href : location.origin + location.pathname;
  var title = (document.querySelector('h1') || {}).textContent || document.title;
  title = title.trim();
  var page = location.pathname.replace(/\.html$/, '').replace(/\/+$/, '');

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    if (text != null) e.textContent = text;
    return e;
  }
  function enc(s) { return encodeURIComponent(s); }

  // ===== 分享 =====
  var share = el('section', { class: 'engage-share', 'aria-labelledby': 'engage-share-title' });
  share.appendChild(el('h2', { id: 'engage-share-title' }, '分享這篇'));
  var row = el('div', { class: 'engage-btns' });
  if (navigator.share) {
    var native = el('button', { type: 'button', class: 'engage-btn engage-primary' }, '分享…');
    native.addEventListener('click', function () {
      navigator.share({ title: title, url: shareUrl }).catch(function () {});
    });
    row.appendChild(native);
  }
  [
    ['LINE', 'https://social-plugins.line.me/lineit/share?url=' + enc(shareUrl) + '&text=' + enc(title)],
    ['Facebook', 'https://www.facebook.com/sharer/sharer.php?u=' + enc(shareUrl)],
    ['Threads', 'https://www.threads.com/intent/post?text=' + enc(title) + '&url=' + enc(shareUrl)]
  ].forEach(function (s) {
    row.appendChild(el('a', {
      class: 'engage-btn', href: s[1], target: '_blank', rel: 'noopener',
      'aria-label': '分享到 ' + s[0] + '（另開新視窗）'
    }, s[0]));
  });
  var copy = el('button', { type: 'button', class: 'engage-btn' }, '複製連結');
  copy.addEventListener('click', function () {
    function done() { copy.textContent = '已複製 ✓'; setTimeout(function () { copy.textContent = '複製連結'; }, 2000); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(done, fallback);
    } else fallback();
    function fallback() {
      var t = el('textarea'); t.value = shareUrl; t.setAttribute('readonly', '');
      t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); done(); } catch (e) { window.prompt('複製這個連結：', shareUrl); }
      document.body.removeChild(t);
    }
  });
  row.appendChild(copy);
  share.appendChild(row);

  // ===== 留言 =====
  var box = el('section', { class: 'engage-comments', id: 'comments', 'aria-labelledby': 'engage-c-title' });
  var h = el('h2', { id: 'engage-c-title' }, '留言');
  box.appendChild(h);
  var list = el('ol', { class: 'engage-list' });
  var empty = el('p', { class: 'engage-empty' }, '還沒有人留言，搶頭香吧！');
  box.appendChild(list);
  box.appendChild(empty);

  var form = el('form', { class: 'engage-form', novalidate: '' });
  var nameWrap = el('div', { class: 'engage-field' });
  nameWrap.appendChild(el('label', { for: 'engage-name' }, '暱稱'));
  var nameIn = el('input', { id: 'engage-name', name: 'name', type: 'text', maxlength: '20', autocomplete: 'nickname', required: '' });
  nameWrap.appendChild(nameIn);
  var bodyWrap = el('div', { class: 'engage-field' });
  var bodyLabel = el('label', { for: 'engage-body' }, '留言');
  var counter = el('span', { class: 'engage-count', 'aria-hidden': 'true' }, '0/500');
  bodyLabel.appendChild(counter);
  bodyWrap.appendChild(bodyLabel);
  var bodyIn = el('textarea', { id: 'engage-body', name: 'body', rows: '4', maxlength: '500', required: '' });
  bodyWrap.appendChild(bodyIn);
  // 機器人陷阱：真人看不到這一格
  var trap = el('div', { class: 'engage-trap', 'aria-hidden': 'true' });
  trap.appendChild(el('label', { for: 'engage-website' }, '網站（請留空）'));
  trap.appendChild(el('input', { id: 'engage-website', name: 'website', type: 'text', tabindex: '-1', autocomplete: 'off' }));
  var note = el('p', { class: 'engage-note' },
    '留言會公開顯示暱稱與內容，請不要留下電話、病歷等個人資料。這裡無法提供個別的醫療建議。廣告與無關留言會被自動過濾。');
  var send = el('button', { type: 'submit', class: 'engage-btn engage-primary' }, '送出留言');
  var msg = el('p', { class: 'engage-msg', role: 'status', 'aria-live': 'polite' });
  form.appendChild(nameWrap);
  form.appendChild(bodyWrap);
  form.appendChild(trap);
  form.appendChild(note);
  form.appendChild(send);
  form.appendChild(msg);
  box.appendChild(form);

  var wrap = el('div', { class: 'engage' });
  wrap.appendChild(share);
  wrap.appendChild(box);
  if (anchor) anchor.parentNode.insertBefore(wrap, anchor);
  else article.appendChild(wrap);

  var openedAt = Date.now();
  try { nameIn.value = localStorage.getItem('engage-name') || ''; } catch (e) {}
  bodyIn.addEventListener('input', function () { counter.textContent = bodyIn.value.length + '/500'; });

  function fmt(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return d.getFullYear() + '.' + (d.getMonth() + 1) + '.' + d.getDate() + ' ' +
      String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  var count = 0;
  function setCount() {
    h.textContent = count ? '留言（' + count + '）' : '留言';
    empty.hidden = count > 0;
  }
  function add(c, highlight) {
    var li = el('li', { class: 'engage-item' + (c.is_owner ? ' is-owner' : '') + (highlight ? ' is-new' : '') });
    var head = el('div', { class: 'engage-head' });
    head.appendChild(el('b', null, c.name));
    if (c.is_owner) head.appendChild(el('span', { class: 'engage-badge' }, '大叔'));
    head.appendChild(el('time', { datetime: c.created_at }, fmt(c.created_at)));
    li.appendChild(head);
    li.appendChild(el('p', { class: 'engage-text' }, c.body));
    list.appendChild(li);
    count++;
    setCount();
  }

  fetch('/api/comments?page=' + enc(page), { headers: { accept: 'application/json' } })
    .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
    .then(function (d) { (d.comments || []).forEach(function (c) { add(c); }); setCount(); })
    .catch(function () { empty.textContent = '留言暫時載入不了，稍後再試。'; });

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    msg.className = 'engage-msg';
    var name = nameIn.value.trim();
    var body = bodyIn.value.trim();
    if (!name) { msg.textContent = '請填暱稱。'; nameIn.focus(); return; }
    if (body.length < 2) { msg.textContent = '留言至少 2 個字。'; bodyIn.focus(); return; }
    send.disabled = true;
    send.textContent = '送出中…';
    msg.textContent = '';
    fetch('/api/comments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ page: page, name: name, body: body, website: form.website.value, t: openedAt })
    })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (d) {
        if (d.ok && d.comment) {
          add(d.comment, true);
          bodyIn.value = '';
          counter.textContent = '0/500';
          msg.textContent = '留言成功，謝謝你！';
          msg.className = 'engage-msg is-ok';
          try { localStorage.setItem('engage-name', name); } catch (e) {}
        } else {
          msg.textContent = d.message || '送出失敗，請稍後再試。';
          msg.className = 'engage-msg is-err';
        }
      })
      .catch(function () {
        msg.textContent = '網路好像斷了，請稍後再試。';
        msg.className = 'engage-msg is-err';
      })
      .then(function () {
        send.disabled = false;
        send.textContent = '送出留言';
      });
  });
})();
