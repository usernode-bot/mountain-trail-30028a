const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../public/trail-data.js');

test('stops climb in km and height, with the summit last', () => {
  const stops = T.STOPS;
  for (let i = 1; i < stops.length; i++) {
    assert.ok(stops[i].km > stops[i - 1].km, 'km increases');
    assert.ok(stops[i].elevM > stops[i - 1].elevM, 'height increases');
  }
  assert.equal(stops[stops.length - 1].id, 'puncak-gede');
  assert.equal(stops[0].id, 'cibodas');
});

test("every leg's climb matches the height difference to the next stop", () => {
  for (let i = 0; i < T.STOPS.length - 1; i++) {
    const s = T.STOPS[i];
    assert.ok(s.legToNext, s.id + ' has a leg to the next stop');
    assert.equal(s.legToNext.climbM, T.STOPS[i + 1].elevM - s.elevM, s.id + ' leg climb');
    assert.ok(T.STOPS[i + 1].legToNext || i + 1 === T.STOPS.length - 1);
  }
  assert.equal(T.STOPS[T.STOPS.length - 1].legToNext, null, 'the summit has no next stop');
});

test('minutes from basecamp add up each leg', () => {
  assert.equal(T.MIN_FROM_BASECAMP.cibodas, 0);
  for (let i = 1; i < T.STOPS.length; i++) {
    assert.equal(
      T.MIN_FROM_BASECAMP[T.STOPS[i].id],
      T.MIN_FROM_BASECAMP[T.STOPS[i - 1].id] + T.STOPS[i - 1].legToNext.min,
      T.STOPS[i].id + ' cumulative minutes'
    );
  }
  assert.equal(T.MIN_FROM_BASECAMP['puncak-gede'], 320);
  assert.equal(Object.keys(T.MIN_FROM_BASECAMP).length, T.STOPS.length, 'one key per stop');
});

test('nearestStop returns air-panas for its own coordinates', () => {
  const ap = T.STOPS.find((s) => s.id === 'air-panas');
  const near = T.nearestStop(ap.lat, ap.lng);
  assert.equal(near.stop.id, 'air-panas');
  assert.ok(near.meters < 10);
});

test('condition severities are unique and landslide is highest', () => {
  const sev = T.CONDITIONS.map((c) => c.severity);
  assert.equal(new Set(sev).size, sev.length);
  const landslide = T.COND_BY_ID['landslide'];
  assert.equal(landslide.severity, Math.max(...sev));
  assert.equal(landslide.tone, 'danger');
});

test('the guide names the mountain and its seven conditions', () => {
  assert.equal(T.MOUNTAIN.name, 'Gede Pangrango');
  assert.deepEqual(
    T.CONDITIONS.map((c) => c.id).sort(),
    ['extreme-weather', 'fallen-tree', 'heavy-fog', 'landslide', 'no-water', 'slippery', 'wildlife']
  );
});

test('the curated status block is a valid level with a timestamp', () => {
  const s = T.MOUNTAIN.status;
  assert.ok(['open', 'limited', 'closed'].includes(s.level), 'level is one of three');
  assert.ok(!Number.isNaN(new Date(s.updatedAt).getTime()), 'updatedAt parses');
  assert.equal(typeof s.verified, 'boolean');
  if (s.reason) assert.ok(['weather', 'fire', 'eruption', 'maintenance'].includes(s.reason));
});

test('the permits block names the booking route and quota', () => {
  const p = T.MOUNTAIN.permits;
  assert.ok(['online', 'onsite', 'none'].includes(p.booking));
  assert.ok(p.quotaDaily > 0);
  assert.ok(p.feeWeekdayIdr > 0 && p.feeWeekendIdr >= p.feeWeekdayIdr);
  if (p.booking === 'online') {
    assert.ok(/^https:\/\//.test(p.bookingUrl), 'the booking site is https');
  }
  assert.ok(!Number.isNaN(new Date(p.checkedAt).getTime()));
});

test('the weather block carries basecamp, summit and three forecast days', () => {
  const w = T.MOUNTAIN.weather;
  assert.ok(Number.isFinite(w.basecamp.tempC) && Number.isFinite(w.summit.tempC));
  assert.ok(w.summit.tempC < w.basecamp.tempC, 'the summit is colder than basecamp');
  assert.equal(w.days.length, 3);
  w.days.forEach((d) => {
    assert.ok(d.tempLowC <= d.tempHighC);
    assert.ok(d.windKmh >= 0 && d.rainPct >= 0 && d.rainPct <= 100);
  });
  assert.ok(!Number.isNaN(new Date(w.updatedAt).getTime()));
});

test('formatConfirms words the count and is blank for none', () => {
  assert.equal(T.formatConfirms(0), '');
  assert.equal(T.formatConfirms(-1), '');
  assert.equal(T.formatConfirms(undefined), '');
  assert.equal(T.formatConfirms('3'), '');
  assert.equal(T.formatConfirms(1), "1 hiker says it's still there.");
  assert.equal(T.formatConfirms(3), "3 hikers say it's still there.");
  assert.equal(T.formatConfirms(24), "24 hikers say it's still there.");
});

test('every stop has landscape types: known ids, no duplicates, in display order', () => {
  for (const s of T.STOPS) {
    assert.ok(Array.isArray(s.landscape) && s.landscape.length > 0, s.id + ' has a landscape');
    const order = s.landscape.map((id) => T.LANDSCAPES.indexOf(id));
    order.forEach((o, i) => {
      assert.ok(o >= 0, s.id + ' landscape id is known');
      if (i > 0) assert.ok(o > order[i - 1], s.id + ' landscape is in order, no duplicates');
    });
  }
  assert.deepEqual(T.LANDSCAPES, ['gunung', 'bukit', 'lembah']);
});

test('the Cibodas route: every stop is gunung, only Rawa Gayonggong is also lembah, none bukit', () => {
  for (const s of T.STOPS) {
    assert.ok(s.landscape.includes('gunung'), s.id + ' is gunung');
    assert.ok(!s.landscape.includes('bukit'), s.id + ' is not bukit');
    assert.equal(s.landscape.includes('lembah'), s.id === 'rawa-gayonggong', s.id + ' lembah');
  }
  assert.deepEqual(T.MOUNTAIN.landscape, ['gunung']);
});

test('landscapeOf applies the height, climb and flat-leg thresholds', () => {
  const steep = { legToNext: { climbM: 200 } };
  // 800 m, 300 m above basecamp: a hill.
  assert.deepEqual(T.landscapeOf({ elevM: 800, legToNext: { climbM: 200 } }, steep, 500), ['bukit']);
  // 800 m but 700 m of climbing: a mountain.
  assert.deepEqual(T.landscapeOf({ elevM: 800, legToNext: { climbM: 200 } }, steep, 100), ['gunung']);
  // Exactly 1,000 m is a mountain.
  assert.deepEqual(T.landscapeOf({ elevM: 1000, legToNext: null }, steep, 900), ['gunung']);
  // Flat on both sides below 1,000 m: hill and valley.
  assert.deepEqual(T.landscapeOf({ elevM: 600, legToNext: { climbM: 10 } }, { legToNext: { climbM: 50 } }, 550), ['bukit', 'lembah']);
  // One steep side is not a valley.
  assert.deepEqual(T.landscapeOf({ elevM: 600, legToNext: { climbM: 51 } }, { legToNext: { climbM: 5 } }, 550), ['bukit']);
  // A curated landscape wins over the derived one, kept in display order.
  assert.deepEqual(T.landscapeOf({ elevM: 2000, landscape: ['lembah', 'gunung'], legToNext: null }, null, 2000), ['gunung', 'lembah']);
});
