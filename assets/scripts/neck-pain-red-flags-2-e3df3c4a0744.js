(function () {
  var lab = document.getElementById('rf-lab');
  if (!lab) return;
  var boxes = lab.querySelectorAll('input[type="checkbox"]');
  var out = document.getElementById('rf-result');
  function update() {
    var er = 0, doc = 0;
    boxes.forEach(function (b) { if (b.checked) { if (b.getAttribute('data-level') === 'er') er++; else doc++; } });
    if (er) { out.setAttribute('data-level', 'er'); out.innerHTML = '<b>請立即就醫（急診）</b>你勾選的情況需要先排除心臟或血管的急症，不要等、也不要先按摩或拉筋。'; }
    else if (doc) { out.setAttribute('data-level', 'doc'); out.innerHTML = '<b>建議先就醫評估</b>你勾選的情況需要醫師先排除嚴重問題，再考慮運動或徒手治療。'; }
    else { out.setAttribute('data-level', 'ok'); out.innerHTML = '<b>目前沒有勾選警訊</b>多數肩頸痛是良性的，可以先保持活動、觀察。但沒有警訊不代表百分之百沒事，症狀變嚴重或出現新症狀，請就醫。若症狀反覆或影響生活，可以找物理治療師評估（<a href="#pt">看第 5 段</a>）。'; }
  }
  boxes.forEach(function (b) { b.addEventListener('change', update); });
  update();
})();
