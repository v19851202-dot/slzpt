// Google Search Console 網站驗證：讓 /googleefd284a3a4907713.html 直接回應，不經過 Cloudflare Pages 去掉 .html 的轉址
export function onRequestGet() {
  return new Response('google-site-verification: googleefd284a3a4907713.html', {
    headers: { 'content-type': 'text/html; charset=utf-8' }
  });
}
