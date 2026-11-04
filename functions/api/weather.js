// 天氣功能已停用，不再查詢訪客位置或第三方服務。
export function onRequestGet() {
  return new Response(JSON.stringify({ error: 'retired' }), {
    status: 410,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'strict-transport-security': 'max-age=86400'
    }
  });
}
