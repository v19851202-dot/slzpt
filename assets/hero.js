(function () {
  var hero = document.querySelector('.hero');
  if (!hero) return;
  var slides = Array.from(hero.querySelectorAll('.slide'));
  var tabs = Array.from(hero.querySelectorAll('.hn'));
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  var current = 0, timer = 0;
  // 手機與電腦都自動輪播、播放影片；只有分頁在背景或系統設定「減少動態效果」時才停。
  function running() { return !reduced.matches && !document.hidden; }
  function stopMedia() {
    clearTimeout(timer);
    slides.forEach(function (slide) { var video = slide.querySelector('video'); if (video) video.pause(); });
    tabs.forEach(function (tab) { tab.classList.remove('run'); });
  }
  function refresh() {
    stopMedia();
    if (!running()) return;
    var slide = slides[current], video = slide.querySelector('video');
    if (video) {
      var source = video.querySelector('source');
      // 輪到這張時才載入 MP4，先顯示封面圖。
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
  document.addEventListener('visibilitychange', refresh);
  reduced.addEventListener('change', refresh);
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
