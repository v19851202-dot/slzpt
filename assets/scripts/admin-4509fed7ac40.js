// 後台頁面程式（CSP 規定執行程式必須是同源外部檔）
(function () {
  var $ = function (id) { return document.getElementById(id); };
  function api(path, opts) {
    opts = opts || {};
    opts.credentials = 'same-origin';
    opts.headers = { 'content-type': 'application/json' };
    return fetch('/api/admin/' + path, opts).then(function (r) {
      return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || '發生錯誤'); return d; });
    });
  }
  function show(loggedIn) { $('login').hidden = loggedIn; $('editor').hidden = !loggedIn; }
  function msg(id, text, ok) { var el = $(id); el.textContent = text; el.className = 'msg ' + (ok ? 'ok' : 'err'); }

  function load() {
    return api('content').then(function (d) {
      var box = $('fields'); box.textContent = '';
      d.fields.forEach(function (f) {
        var label = document.createElement('label'); label.textContent = f.label;
        var input = document.createElement(f.multiline ? 'textarea' : 'input');
        input.name = f.key; input.maxLength = f.max; input.value = d.values[f.key] || '';
        input.placeholder = '留空＝使用網站原本的文字';
        if (f.multiline) input.rows = 5;
        label.appendChild(input); box.appendChild(label);
      });
      var list = $('news-list'); list.textContent = '';
      if (!d.news.length) { var li0 = document.createElement('li'); li0.textContent = '目前沒有公告'; list.appendChild(li0); }
      d.news.forEach(function (n) {
        var li = document.createElement('li');
        var t = document.createElement('b'); t.textContent = n.title + '（' + n.created_at.slice(0, 10) + '）';
        var b = document.createElement('button'); b.type = 'button'; b.textContent = '刪除';
        b.addEventListener('click', function () {
          if (!window.confirm('確定刪除「' + n.title + '」？')) return;
          api('news/' + n.id, { method: 'DELETE' }).then(load);
        });
        li.appendChild(t); li.appendChild(b); list.appendChild(li);
      });
    });
  }

  $('login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    api('login', { method: 'POST', body: JSON.stringify({ email: $('email').value, password: $('password').value }) })
      .then(function (d) { $('who').textContent = d.email; show(true); return load(); })
      .catch(function (err) { msg('login-msg', err.message); });
  });
  $('content-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var body = {};
    Array.prototype.forEach.call($('fields').querySelectorAll('input,textarea'), function (el) { body[el.name] = el.value; });
    api('content', { method: 'PUT', body: JSON.stringify(body) })
      .then(function () { msg('content-msg', '已儲存，重新整理「關於我」頁就會看到。', true); })
      .catch(function (err) { msg('content-msg', err.message); });
  });
  $('news-form').addEventListener('submit', function (e) {
    e.preventDefault();
    api('news', { method: 'POST', body: JSON.stringify({ title: $('news-title').value, body: $('news-body').value }) })
      .then(function () { $('news-title').value = ''; $('news-body').value = ''; msg('news-msg', '已發布', true); return load(); })
      .catch(function (err) { msg('news-msg', err.message); });
  });
  $('logout').addEventListener('click', function () { api('logout', { method: 'POST' }).finally(function () { show(false); }); });

  api('me').then(function (d) { $('who').textContent = d.email; show(true); return load(); }).catch(function () { show(false); });
})();
