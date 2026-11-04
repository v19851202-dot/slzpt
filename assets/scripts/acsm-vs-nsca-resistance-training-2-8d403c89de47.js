(function () {
  var lab = document.getElementById('cmp-lab');
  var table = document.getElementById('cmp-table');
  if (!lab || !table) return;
  var btns = lab.querySelectorAll('[data-goal]');
  function show(goal) {
    var row = table.querySelector('tr[data-goal="' + goal + '"]');
    if (!row) return;
    var td = row.querySelectorAll('td');
    document.getElementById('vs-acsm').textContent = td[1].textContent.trim();
    document.getElementById('vs-nsca').textContent = td[2].textContent.trim();
    table.querySelectorAll('tbody tr').forEach(function (r) { r.classList.toggle('is-on', r === row); });
    btns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-goal') === goal ? 'true' : 'false'); });
  }
  btns.forEach(function (b) { b.addEventListener('click', function () { show(b.getAttribute('data-goal')); }); });
  show('strength');
})();
