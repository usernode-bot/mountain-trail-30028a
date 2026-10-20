const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const S = require('../public/status.js');

test('statusTone maps the three levels to the three tones', () => {
  assert.equal(S.statusTone('open'), 'accent');
  assert.equal(S.statusTone('limited'), 'warn');
  assert.equal(S.statusTone('closed'), 'danger');
  assert.equal(S.statusTone('nonsense'), 'accent');
  assert.ok(S.isStatusLevel('open') && S.isStatusLevel('limited') && S.isStatusLevel('closed'));
  assert.ok(!S.isStatusLevel('nonsense'));
});

const NOW = new Date('2026-10-15T06:00:00Z');
const WARNED = { windKmh: 45, rainPct: 20 };
const RAINY = { windKmh: 10, rainPct: 80 };
const CALM = { windKmh: 12, rainPct: 30 };

test('a forecast day warns at 40 km/h wind or 70% rain, and not below', () => {
  const w = { days: [WARNED, RAINY, CALM] };
  const out = S.weatherWarnings(w, null, NOW, 1);
  assert.deepEqual(out.map((x) => x.index), [0, 1]);
  assert.deepEqual(out[0].reasons, ['wind']);
  assert.deepEqual(out[1].reasons, ['rain']);
  const calm = { days: [{ windKmh: 39, rainPct: 69 }, CALM, CALM] };
  assert.deepEqual(S.weatherWarnings(calm, null, NOW, 1), []);
});

test('both reasons land when a day crosses both thresholds', () => {
  const w = { days: [{ windKmh: 50, rainPct: 90 }, CALM, CALM] };
  const out = S.weatherWarnings(w, null, NOW, 1);
  assert.deepEqual(out[0].reasons, ['wind', 'rain']);
});

test('with no climb date every warned day counts; with one, only the window', () => {
  const w = { days: [WARNED, RAINY, CALM] };
  // Climb starting tomorrow, one day on the mountain: only index 1 is inside.
  const out = S.weatherWarnings(w, '2026-10-16', NOW, 1);
  assert.deepEqual(out.map((x) => x.index), [1]);
  // Two days on the mountain covers tomorrow and the day after (calm).
  assert.deepEqual(S.weatherWarnings(w, '2026-10-16', NOW, 2).map((x) => x.index), [1]);
  // Climb in three days: the warned days are all before the window.
  assert.deepEqual(S.weatherWarnings(w, '2026-10-18', NOW, 1), []);
});

test('a report expires 24 hours after its last confirmation', () => {
  const created = '2026-10-15T00:00:00Z';
  const confirmed = '2026-10-15T18:00:00Z';
  // A later confirmation pushes the window out; an earlier one does not.
  assert.equal(S.reportExpiresAt(created, confirmed).toISOString(), '2026-10-16T18:00:00.000Z');
  assert.equal(S.reportExpiresAt(created, '2026-10-14T00:00:00Z').toISOString(), '2026-10-16T00:00:00.000Z');
  assert.equal(S.reportExpiresAt(created, null).toISOString(), '2026-10-16T00:00:00.000Z');
  // Garbage in, window out: a nonsense confirmation is ignored.
  assert.equal(S.reportExpiresAt(created, 'not-a-date').toISOString(), '2026-10-16T00:00:00.000Z');
});
test('packPhotoUrls keeps http(s) photos once and skips the rest', () => {
  const urls = S.packPhotoUrls([
    { photoUrl: 'https://app.onhomeroom.com/app-files/abc' },
    { photoUrl: 'https://app.onhomeroom.com/app-files/abc' },
    { photoUrl: 'http://127.0.0.1:3000/app-files/def' },
    { photoUrl: 'data:image/svg+xml;utf8,%3Csvg%3E' },
    { photoUrl: null },
    { photoUrl: 'javascript:alert(1)' },
    {},
  ]);
  assert.deepEqual(urls, [
    'https://app.onhomeroom.com/app-files/abc',
    'http://127.0.0.1:3000/app-files/def',
  ]);
  assert.deepEqual(S.packPhotoUrls(null), []);
});

test('the service worker precaches exactly SHELL_FILES', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'sw.js'), 'utf8');
  const m = src.match(/var PRECACHE = \[([\s\S]*?)\];/);
  assert.ok(m, 'sw.js declares PRECACHE');
  const paths = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  assert.deepEqual(paths, S.SHELL_FILES);
});

test('the service worker keeps /api/ off the cache and serves saved photos', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'sw.js'), 'utf8');
  // /api/ is answered by the network only, before anything can respondWith.
  assert.ok(src.includes("if (url.pathname.startsWith('/api/')) return;"));
  assert.ok(src.indexOf("startsWith('/api/')") < src.indexOf('// Everything else same-origin'));
  // The photo branch never answers an /api/ path.
  const photoAt = src.indexOf("startsWith('/app-files/')");
  assert.ok(photoAt > 0 && src.indexOf("startsWith('/api/')") < photoAt);
  // The photo cache is named as in app.js and survives a shell upgrade.
  assert.ok(src.includes("var PHOTOS = 'mt-photos';"));
  assert.ok(/url\.pathname\.startsWith\('\/app-files\/'\)/.test(src));
  assert.ok(src.includes('k !== CACHE && k !== PHOTOS'));
});
