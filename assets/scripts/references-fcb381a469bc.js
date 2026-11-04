window.rvInitCite = function initCite() {
  var KEY = 'slzpt-show-cites';
  var root = document.documentElement;
  var sheet = document.getElementById('cite-sheet');
  var body = sheet.querySelector('.cs-body');
  var label = sheet.querySelector('.cs-label');
  var lastTrigger = null;
  function getPref() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function setPref(v) { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) {} }
  function apply(show) {
    root.classList.toggle('hide-cites', !show);
    var btns = document.querySelectorAll('.cite-toggle');
    for (var i = 0; i < btns.length; i++) btns[i].setAttribute('aria-pressed', show ? 'true' : 'false');
  }
  function openRefs() { var d = document.getElementById('refs'); if (d) d.open = true; }
  function closeSheet() {
    sheet.hidden = true;
    if (lastTrigger) { lastTrigger.focus(); lastTrigger = null; }
  }
  function openSheet(n, trigger) {
    var li = document.getElementById('ref-' + n);
    if (!li) return;
    body.innerHTML = li.innerHTML;
    label.textContent = '文獻 ' + n;
    lastTrigger = trigger;
    sheet.hidden = false;
    sheet.querySelector('.cs-close').focus();
  }
  function onClick(e) {
    var t = e.target;
    var ref = t.closest && t.closest('sup.cref a');
    if (ref) { e.preventDefault(); openSheet(ref.getAttribute('data-ref'), ref); return; }
    var tog = t.closest && t.closest('.cite-toggle');
    if (tog) { var show = tog.getAttribute('aria-pressed') !== 'true'; apply(show); setPref(show); return; }
    if (t.closest && t.closest('.cs-close')) { closeSheet(); return; }
    if (t.closest && t.closest('.cs-all')) { openRefs(); closeSheet(); return; }
    if (!sheet.hidden && !(t.closest && t.closest('.cs-card'))) closeSheet();
  }
  function onKey(e) { if (e.key === 'Escape' && !sheet.hidden) closeSheet(); }
  function onHash() { if (/^#ref-\d+$/.test(location.hash) || location.hash === '#refs') openRefs(); }
  if (!window.__citeBound) {
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', onHash);
    window.__citeBound = true;
  }
  apply(getPref());
  onHash();
};
window.rvInitCite();
