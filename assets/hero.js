(function () {
  var hero = document.querySelector('.hero');
  if (!hero) return;
  var slides = Array.from(hero.querySelectorAll('.slide'));
  var tabs = Array.from(hero.querySelectorAll('.hn'));
  var toggle = hero.querySelector('.hero-toggle');
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  var mobile = matchMedia('(max-width: 900px)');
  var connection = navigator.connection;
  var current = 0, timer = 0, inView = false, focused = false, hovered = false, stopped = false;
  function quiet() { return reduced.matches || mobile.matches || Boolean(connection && connection.saveData); }
  function running() { return !quiet() && !document.hidden && inView && !focused && !hovered && !stopped; }
  function stopMedia() {
    clearTimeout(timer);
    slides.forEach(function (slide) { var video = slide.querySelector('video'); if (video) video.pause(); });
    tabs.forEach(function (tab) { tab.classList.remove('run'); });
  }
  function refresh() {
    stopMedia();
    toggle.hidden = quiet();
    toggle.textContent = stopped ? '播放輪播' : '暫停輪播';
    if (!running()) return;
    var slide = slides[current], video = slide.querySelector('video');
    if (video) {
      var source = video.querySelector('source');
      // 未允許播放前，不提供 MP4 src，手機及省流量模式只載入封面。
      if (!source.hasAttribute('src')) { source.src = source.dataset.src; video.load(); }
      video.preload = 'auto';
      var result = video.play();
      if (result && result.catch) result.catch(function () {});
    }
    var duration = Number(slide.dataset.dur) || 7000;
    tabs[current].style.setProperty('--dur', duration + 'ms');
    void tabs[current].offsetWidth;
    tabs[current].classList.add('run');
    timer = setTimeout(function () { select((current + 1) % slides.length); }, duration);
  }
  function select(index) {
    current = index;
    slides.forEach(function (slide, i) {
      var active = i === current;
      slide.classList.toggle('is-on', active);
      slide.setAttribute('aria-hidden', String(!active));
      slide.inert = !active;
      tabs[i].setAttribute('aria-selected', String(active));
      tabs[i].tabIndex = active ? 0 : -1;
    });
    refresh();
  }
  slides.forEach(function (slide, i) {
    slide.id = 'hero-slide-' + i;
    slide.setAttribute('role', 'tabpanel');
    slide.setAttribute('aria-labelledby', 'hero-tab-' + i);
    tabs[i].id = 'hero-tab-' + i;
    tabs[i].setAttribute('aria-controls', slide.id);
    tabs[i].addEventListener('click', function () { select(i); });
    tabs[i].addEventListener('keydown', function (event) {
      var next = event.key === 'ArrowRight' ? (i + 1) % tabs.length :
        event.key === 'ArrowLeft' ? (i + tabs.length - 1) % tabs.length :
        event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
      if (next === null) return;
      event.preventDefault(); select(next); tabs[next].focus();
    });
  });
  toggle.addEventListener('click', function () { stopped = !stopped; refresh(); });
  hero.addEventListener('focusin', function () { focused = true; refresh(); });
  hero.addEventListener('focusout', function (event) { focused = hero.contains(event.relatedTarget); refresh(); });
  hero.addEventListener('mouseenter', function () { hovered = true; refresh(); });
  hero.addEventListener('mouseleave', function () { hovered = false; refresh(); });
  document.addEventListener('visibilitychange', refresh);
  reduced.addEventListener('change', refresh);
  mobile.addEventListener('change', refresh);
  if (connection && connection.addEventListener) connection.addEventListener('change', refresh);
  if ('IntersectionObserver' in window) {
    // 至少一半仍在視窗內才自動播放，避免只剩一小角時繼續耗電。
    new IntersectionObserver(function (entries) { inView = entries[0].intersectionRatio >= 0.5; refresh(); }, { threshold: 0.5 }).observe(hero);
  } // 不支援 IntersectionObserver 時維持靜態封面，手動切換仍可用。
  select(0);

  document.querySelectorAll('.topnav [data-go]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      event.preventDefault();
      var target = link.dataset.go;
      if (target === 'search') {
        var search = document.getElementById('q');
        if (!search.offsetParent) { var menu = document.querySelector('.menu-btn'); if (menu) menu.click(); }
        search.scrollIntoView({ block: 'center' }); search.focus({ preventScroll: true }); return;
      }
      var filter = document.querySelector('.tab[data-filter="' + target + '"]');
      if (filter && filter.getAttribute('aria-pressed') !== 'true') filter.click();
      document.getElementById('feed').scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth' });
    });
  });
})();
