// アプリを更新したら必ずこの数字を上げること。
// キャッシュ名が変わることで install 時に全アセットを取得し直し、古いキャッシュを破棄する。
const CACHE_VERSION = "v7";
const CACHE_NAME = `itpass-adventure-${CACHE_VERSION}`;

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/questions.js",
  "./js/items.js",
  "./js/sound.js",
  "./js/storage.js",
  "./js/game.js",
  "./js/app.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS.map(url => new Request(url, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// アプリ本体(HTML/CSS/JS)はネットワーク優先。
// 更新がすぐ反映され、オフライン時はキャッシュにフォールバックする。
function isAppShell(url) {
  return url.origin === self.location.origin && /\.(html|css|js)$|\/$/.test(url.pathname);
}

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  if (isAppShell(url)) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then(c => c || caches.match("./index.html")))
    );
    return;
  }

  // 画像などはキャッシュ優先(裏で更新)
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
