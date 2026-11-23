(function () {
  var btn = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.site-nav');
  if (btn && nav) {
    function setOpen(open) {
      nav.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? '關閉選單' : '開啟選單');
    }
    btn.addEventListener('click', function () {
      setOpen(!nav.classList.contains('is-open'));
    });
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false);
        btn.focus();
      }
    });
  }

  var cards = document.querySelectorAll('.svc-card');
  if (!cards.length) return;
  function select(card) {
    cards.forEach(function (c) {
      var on = c === card;
      c.classList.toggle('is-on', on);
      var tab = c.querySelector('.svc-tab');
      if (tab) tab.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }
  cards.forEach(function (card) {
    var tab = card.querySelector('.svc-tab');
    if (!tab) return;
    tab.addEventListener('click', function () { select(card); });
  });
})();
