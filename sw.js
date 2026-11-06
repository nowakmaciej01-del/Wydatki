// „Service worker” – mały pomocnik, który zapisuje aplikację w telefonie,
// dzięki czemu otwiera się ona także bez internetu.
// Po każdej większej zmianie aplikacji podnieś numer wersji poniżej (v1 → v2).
const CACHE = 'wydatki-v4';
const SHELL = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.hostname === 'api.nbp.pl') return; // kursy walut zawsze świeże

  if (u.origin === location.origin) {
    // pliki aplikacji: najpierw internet (żeby nowe wersje docierały od razu), bez internetu – zapisana kopia
    e.respondWith(
      fetch(r)
        .then(res => { const c = res.clone(); caches.open(CACHE).then(ca => ca.put(r, c)); return res; })
        .catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match('index.html')))
    );
    return;
  }

  // czcionki i czytnik paragonów: najpierw zapisana kopia, potem internet
  e.respondWith(
    caches.match(r).then(m => m || fetch(r).then(res => {
      if (res.ok || res.type === 'opaque') { const c = res.clone(); caches.open(CACHE).then(ca => ca.put(r, c)); }
      return res;
    }))
  );
});
