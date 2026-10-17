/*
 * Mountain Trail's offline cache. Precaches the app shell so the app opens
 * with no connection after one online visit, runtime-caches the static
 * files and the platform's centrally hosted bridge and native kit (copies
 * fetched from the network, never files vendored into the repo), and never
 * touches /api/.
 */
var CACHE = 'mt-shell-v3';
var PRECACHE = [
  '/',
  '/tailwind.css',
  '/app.js',
  '/trail-data.js',
  '/mountain-catalog.js',
  '/packing.js',
  '/share-links.js',
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) { return cache.addAll(PRECACHE); }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) {
        return caches.delete(k);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // The API goes straight to the network, never cached: a report list from
  // the cache would read as today's trail state.
  if (url.pathname.startsWith('/api/')) return;

  // Navigations: network first, the cached shell as the offline fallback.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (cache) { cache.put('/', copy); });
        }
        return res;
      }).catch(function () {
        return caches.match('/');
      })
    );
    return;
  }

  // Everything else same-origin (including the hosted bridge and native
  // kit paths, answered by the edge in production): network first, cache
  // fallback, runtime-caching what succeeds.
  event.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req);
    })
  );
});
