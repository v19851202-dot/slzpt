(function () {
  function $(id) { return document.getElementById(id); }
  function v(id) { var x = parseFloat($(id).value); return isFinite(x) ? x : NaN; }
  function c(id) { return $(id).checked ? 1 : 0; }
  // 依 Picot 2023 Table 3 計分；邊界值歸入中間級距
  function tier(x, rules) { if (isNaN(x)) return 0; for (var i = 0; i < rules.length; i++) { if (rules[i][0](x)) return rules[i][1]; } return 0; }
  function score() {
    var sls = tier(v('sls-err'), [[function (x) { return x === 0; }, 2], [function (x) { return x >= 1 && x <= 3; }, 1]]) + c('sls-st');
    var comp = v('sebt-comp');
    var sebt = tier(comp, [[function (x) { return x > 95; }, 4], [function (x) { return x >= 90; }, 2]])
      + (v('sebt-ant') > 60 ? 1 : 0) + (v('sebt-pm') > 90 ? 1 : 0) + c('sebt-st');
    var sht = tier(v('sht-s'), [[function (x) { return x < 10; }, 4], [function (x) { return x <= 13; }, 2]]) + c('sht-st');
    var f8 = tier(v('f8-s'), [[function (x) { return x < 13; }, 2], [function (x) { return x <= 18; }, 1]]) + c('f8-st');
    var adl = tier(v('faam-adl'), [[function (x) { return x > 95; }, 2], [function (x) { return x >= 90; }, 1]]);
    var sp = tier(v('faam-sp'), [[function (x) { return x > 95; }, 2], [function (x) { return x >= 80; }, 1]]);
    var rsi = tier(v('rsi'), [[function (x) { return x > 76; }, 3], [function (x) { return x >= 63; }, 2], [function (x) { return x >= 55; }, 1]]);
    var parts = [['p-sls', sls, 3], ['p-sebt', sebt, 7], ['p-sht', sht, 5], ['p-f8', f8, 3], ['p-faam', adl + sp, 4], ['p-rsi', rsi, 3]];
    var total = 0;
    parts.forEach(function (p) { total += p[1]; $(p[0]).innerHTML = p[1] + ' <small>/ ' + p[2] + '</small>'; });
    $('go-total').textContent = total;
    var r = $('go-result'), band, text;
    if (total < 8) {
      band = 'low'; text = '低於 8 分';
      $('go-explain').textContent = '若這是傷後 2 個月的分數：研究中低於 8 分的人，4 個月時較不可能回到傷前運動水準 [11]，兩年內再扭傷風險約高 9 倍（OR 8.6）[12]。建議針對得分低的項目加強復健。';
    } else if (total <= 11) {
      band = 'mid'; text = '8 到 11 分';
      $('go-explain').textContent = '若這是傷後 2 個月的分數：已達 8 分門檻 [11]，但還沒超過與「一年後成為 coper」相關的 11 分 [15]。可以看哪個項目失分最多，作為下一階段的復健重點。';
    } else {
      band = 'high'; text = '高於 11 分';
      $('go-explain').textContent = '若這是傷後 2 個月的分數：研究中高於 11 分的人，一年後成為 coper 的機率較高（OR 12.1）[15]。重返運動仍要綜合疼痛等 Ankle-GO 沒有納入的面向一起判斷 [13]。';
    }
    r.setAttribute('data-band', band);
    $('go-band').textContent = text;
  }
  var SAMPLE = { 'sls-err': 2, 'sebt-comp': 88, 'sebt-ant': 62, 'sebt-pm': 92, 'sht-s': 14.5, 'f8-s': 16, 'faam-adl': 91, 'faam-sp': 72, 'rsi': 58 };
  var SAMPLE_CHK = { 'sls-st': true, 'sebt-st': false, 'sht-st': false, 'f8-st': true };
  document.querySelectorAll('#go-lab input').forEach(function (el) { el.addEventListener('input', score); el.addEventListener('change', score); });
  $('go-sample').addEventListener('click', function () {
    Object.keys(SAMPLE).forEach(function (k) { $(k).value = SAMPLE[k]; });
    Object.keys(SAMPLE_CHK).forEach(function (k) { $(k).checked = SAMPLE_CHK[k]; });
    score();
  });
  $('go-clear').addEventListener('click', function () {
    Object.keys(SAMPLE).forEach(function (k) { $(k).value = ''; });
    Object.keys(SAMPLE_CHK).forEach(function (k) { $(k).checked = false; });
    score(); $('sls-err').focus();
  });
  score();
})();
