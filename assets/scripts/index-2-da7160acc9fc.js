(function () {
  // 手機版漢堡選單：點 ≡ 展開搜尋、關於、IG
  var side = document.querySelector('.side');
  var btn = side && side.querySelector('.menu-btn');
  if (!btn) return;
  function set(open) {
    side.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? '關閉選單' : '開啟選單');
  }
  btn.addEventListener('click', function () { set(!side.classList.contains('is-open')); });
  side.querySelectorAll('nav a').forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && side.classList.contains('is-open')) { set(false); btn.focus(); } });
})();
(function () {
  // 點心情貼文：用彈出視窗看完整內容（方格裡只顯示前兩行）
  var dlg = document.querySelector('.post-dialog');
  if (!dlg || typeof dlg.showModal !== 'function') return;
  var box = dlg.querySelector('.pd-content');
  var last = null;
  function open(tile) {
    last = tile;
    box.innerHTML = '';
    var img = tile.querySelector('img');
    if (img) box.appendChild(img.cloneNode(true));
    var body = document.createElement('div');
    body.className = 'pd-body';
    var rest = tile.querySelector('img') ? tile.querySelector('img').nextElementSibling : tile.firstElementChild;
    if (rest) body.appendChild(rest.cloneNode(true));
    box.appendChild(body);
    dlg.showModal();
  }
  document.querySelectorAll('.imgpost').forEach(function (tile) {
    tile.addEventListener('click', function () { open(tile); });
    tile.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(tile); }
    });
  });
  dlg.querySelector('.pd-close').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', function () { if (last) last.focus(); });
})();
