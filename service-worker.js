/* Mosquito Shooter — service worker (offline caching)
   To ship an update to players, change CACHE_VERSION (e.g. v2) and redeploy. */
const CACHE_VERSION = 'v2';
const CACHE = 'mosquito-shooter-' + CACHE_VERSION;
const ASSETS = [
  './', 'index.html', 'style.css', 'manifest.json',
  'js/audio.js', 'js/art.js', 'js/game.js',
  'assets/sounds/mosquito-flying.mp3', 'assets/sounds/mosquito-excess.mp3',
  'assets/sounds/mosquito-bite.mp3', 'assets/sounds/game-over.mp3', 'assets/sounds/rekha-scream.mp3',
  'assets/fonts/bangers-latin-400-normal.woff2', 'assets/fonts/fredoka-latin-500-normal.woff2', 'assets/fonts/fredoka-latin-700-normal.woff2',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-192.png', 'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png', 'icons/favicon-48.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => Promise.all(ASSETS.map(a => c.add(a).catch(() => {})))).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('mosquito-shooter-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Safari requests media with Range headers: answer from the cached file */
async function rangeResponse(req, res) {
  const buf = await res.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '');
  const start = m && m[1] ? parseInt(m[1], 10) : 0;
  const end = m && m[2] ? Math.min(parseInt(m[2], 10), buf.byteLength - 1) : buf.byteLength - 1;
  return new Response(buf.slice(start, end + 1), {
    status: 206, statusText: 'Partial Content',
    headers: { 'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg', 'Content-Range': `bytes ${start}-${end}/${buf.byteLength}`, 'Content-Length': String(end - start + 1) }
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const isNav = req.mode === 'navigate';
    const cached = await cache.match(isNav ? 'index.html' : req, { ignoreSearch: isNav });
    const network = fetch(req).then(res => { if (res && res.ok && res.status === 200) cache.put(isNav ? 'index.html' : req, res.clone()); return res; }).catch(() => null);
    if (req.headers.has('range')) {
      const full = cached || await fetch(req.url).catch(() => null);
      return full && full.status === 200 ? rangeResponse(req, full) : (await network) || Response.error();
    }
    // stale-while-revalidate: instant + works offline; fresh copy is stored for next launch
    if (cached) { e.waitUntil(network); return cached; }
    return (await network) || (isNav ? cache.match('index.html') : Response.error());
  })());
});
