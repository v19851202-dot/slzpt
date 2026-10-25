// Cloudflare Pages Function: GET /api/weather
// 用 Cloudflare 提供的訪客大略位置（不會跳出定位授權），向 Open-Meteo 取得今天的天氣。
// 不儲存任何訪客資料。天氣資料來源：Open-Meteo.com（CC BY 4.0）。

function json(body, status, cache) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cache || 'no-store'
    }
  });
}

export async function onRequestGet({ request }) {
  const cf = request.cf || {};
  const lat = parseFloat(cf.latitude);
  const lon = parseFloat(cf.longitude);
  if (!isFinite(lat) || !isFinite(lon)) {
    return json({ error: 'no-location' }, 200);
  }

  const url =
    'https://api.open-meteo.com/v1/forecast' +
    '?latitude=' + lat.toFixed(2) +
    '&longitude=' + lon.toFixed(2) +
    '&current=temperature_2m,weather_code,is_day' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
    '&timezone=auto&forecast_days=1';

  let data;
  try {
    const res = await fetch(url, { cf: { cacheTtl: 900, cacheEverything: true } });
    if (!res.ok) return json({ error: 'upstream' }, 502);
    data = await res.json();
  } catch (e) {
    return json({ error: 'upstream' }, 502);
  }

  const cur = data.current || {};
  const day = data.daily || {};
  const first = (arr) => (Array.isArray(arr) && arr.length ? arr[0] : null);

  return json(
    {
      city: cf.city || '',
      country: cf.country || '',
      temp: cur.temperature_2m,
      code: cur.weather_code,
      isDay: cur.is_day,
      todayCode: first(day.weather_code),
      max: first(day.temperature_2m_max),
      min: first(day.temperature_2m_min),
      pop: first(day.precipitation_probability_max)
    },
    200,
    'private, max-age=600'
  );
}
