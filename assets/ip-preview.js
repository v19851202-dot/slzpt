/* 透明貼圖：優先播 VP9 WebM，Safari 等不支援時改用 GIF。 */
(function () {
  var video = document.querySelector('.ip-sticker-webm');
  var gif = document.querySelector('.ip-sticker-gif');
  if (!video || !gif) return;

  function showGif() {
    if (!gif.hidden && video.hidden) return;
    try { video.pause(); } catch (err) {}
    video.hidden = true;
    video.removeAttribute('autoplay');
    gif.hidden = false;
  }

  var probe = document.createElement('video');
  var canVp9 = probe.canPlayType('video/webm; codecs="vp9"') !== '';
  if (!canVp9) {
    showGif();
    return;
  }

  video.addEventListener('error', showGif);
  if (video.error) showGif();
})();
