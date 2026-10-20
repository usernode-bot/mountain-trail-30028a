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

test('packPhotoUrls keeps real http(s) photos once each', () => {
  const urls = S.packPhotoUrls([
    { photoUrl: 'https://app.example/app-files/a.jpg' },
    { photoUrl: 'https://app.example/app-files/a.jpg' },
    { photoUrl: 'http://127.0.0.1:4010/app-files/b.jpg' },
    null,
    {},
    { photoUrl: null },
    { photoUrl: 'data:image/svg+xml;base64,abc' },
    { photoUrl: 'javascript:alert(1)' },
  ]);
  assert.deepEqual(urls, [
    'https://app.example/app-files/a.jpg',
    'http://127.0.0.1:4010/app-files/b.jpg',
  ]);
  assert.deepEqual(S.packPhotoUrls(null), []);
});

test('the shell file list stays in step with the worker precache', () => {
  const sw = fs.readFileSync(path.join(__dirname, '..', 'public', 'sw.js'), 'utf8');
  const m = sw.match(/var PRECACHE = \[([\s\S]*?)\];/);
  assert.ok(m, 'sw.js has no PRECACHE array');
  const listed = (m[1].match(/'([^']+)'/g) || []).map((s) => s.slice(1, -1));
  assert.deepEqual(listed, S.SHELL_FILES);
});

test('the worker answers saved photos but never caches /api/', () => {
  const sw = fs.readFileSync(path.join(__dirname, '..', 'public', 'sw.js'), 'utf8');
  assert.match(sw, /var PHOTOS = 'mt-photos'/);
  // The photo cache survives shell upgrades.
  assert.match(sw, /k !== CACHE && k !== PHOTOS/);
  assert.match(sw, /\/app-files\//);
  assert.match(sw, /caches\.open\(PHOTOS\)[\s\S]{0,80}cache\.match\(req\.url\)/);
  // The API return comes before the navigation and same-origin handlers, so
  // an /api/ request is never answered (or cached) by the worker.
  const apiAt = sw.indexOf("url.pathname.startsWith('/api/')");
  const navAt = sw.indexOf("if (req.mode === 'navigate')");
  const genericAt = sw.lastIndexOf('event.respondWith');
  assert.ok(apiAt > -1 && navAt > apiAt && genericAt > apiAt, 'the /api/ return must come before the generic handlers');
});