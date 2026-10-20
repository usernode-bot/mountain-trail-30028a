/*
 * Mountain Trail's offline cache. Precaches the app shell so the app opens
 * with no connection after one online visit, runtime-caches the static
 * files and the platform's centrally hosted bridge and native kit (copies
 * fetched from the network, never files vendored into the repo), and never
 * touches /api/.
 */
var CACHE = 'mt-shell-v6';
// Report photos saved by the explicit offline save (app.js). Only the page
// writes here; this worker serves them when the network fails. Kept across
// shell versions.
var PHOTOS = 'mt-photos';
var PRECACHE = [
  '/',
  '/tailwind.css',
  '/i18n.js',
  '/app.js',
  '/trail-data.js',
  '/packing.js',
  '/status.js',
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
      return Promise.all(keys.filter(function (k) { return k !== CACHE && k !== PHOTOS; }).map(function (k) {
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

  // The API goes straight to the network, never cached: a report list from
  // the cache would read as today's trail state.
  if (url.pathname.startsWith('/api/')) return;

  // Report photos, on this origin or the platform's: network first, and the
  // copy the offline save stored when the network fails. Online a photo is
  // always fetched fresh, so a removed one disappears.
  if (url.pathname.startsWith('/app-files/')) {
    event.respondWith(
      fetch(req).catch(function () {
        return caches.open(PHOTOS).then(function (cache) { return cache.match(req.url); });
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

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
