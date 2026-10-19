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

test('the category belongs to the destination, never to a stop', () => {
  assert.deepEqual(T.LANDSCAPES, ['gunung', 'bukit', 'lembah']);
  for (const d of T.DESTINATIONS) assert.ok(T.LANDSCAPES.includes(d.category), d.id + ' category is known');
  assert.equal(T.MOUNTAIN.category, 'gunung');
  for (const s of T.ALL_STOPS) assert.equal(s.landscape, undefined, s.id + ' carries no category');
});

test('route difficulty: three levels, Cibodas is hard, missing means null', () => {
  assert.deepEqual(T.DIFFICULTIES, ['easy', 'moderate', 'hard']);
  for (const d of T.DESTINATIONS) {
    for (const r of d.routes) {
      assert.ok(r.difficulty === undefined || T.DIFFICULTIES.includes(r.difficulty), r.id + ' difficulty is known');
    }
  }
  assert.equal(T.ROUTE_BY_ID.cibodas.difficulty, 'hard');
  assert.equal(T.MOUNTAIN.difficulty, 'hard');
  const bare = T.mountainView(Object.assign({}, T.ROUTE_BY_ID.cibodas, { difficulty: undefined }));
  assert.equal(bare.difficulty, null, 'a route without a rating carries null');
});

test('stop types: known kinds, and the chip counts count stops on the route', () => {
  const KINDS = ['basecamp', 'post', 'water', 'camp', 'junction', 'summit'];
  for (const s of T.ALL_STOPS) {
    assert.ok(s.kinds.length > 0, s.id + ' has a type');
    s.kinds.forEach((k) => assert.ok(KINDS.includes(k), s.id + ' kind ' + k + ' is known'));
  }
  assert.deepEqual(T.STOP_TYPES, ['post', 'water', 'camp', 'junction']);
  const count = (k) => T.STOPS.filter((s) => s.kinds.includes(k)).length;
  assert.equal(T.STOPS.length, 9);
  assert.deepEqual(T.STOP_TYPES.map(count), [5, 3, 2, 2]);
  assert.deepEqual(T.STOPS.filter((s) => s.kinds.includes('junction')).map((s) => s.id), ['panyancangan', 'kandang-badak']);
});

test('destination > route > stop: Gede Pangrango by Cibodas holds the nine stops', () => {
  assert.equal(T.DESTINATIONS.length, 1);
  const d = T.DEST_BY_ID['gede-pangrango'];
  assert.equal(d.province, 'Jawa Barat');
  assert.deepEqual(d.routes.map((r) => r.id), ['cibodas']);
  const r = T.ROUTE_BY_ID.cibodas;
  assert.equal(r.destinationId, 'gede-pangrango');
  assert.equal(r.stops, T.STOPS, 'STOPS is the default route');
  assert.equal(T.MOUNTAIN.id, 'gede-pangrango', 'followers keep their mountain id');
  assert.equal(T.MOUNTAIN.routeId, 'cibodas');
  assert.equal(T.MOUNTAIN.status, d.status, 'a route without its own status uses the destination');
  assert.equal(T.MOUNTAIN.permits, d.permits);
  assert.equal(T.MOUNTAIN.weather, r.weather);
  assert.equal(T.routeOfStop('air-panas'), r);
  assert.equal(T.routeOfStop('nowhere'), null);
});

test('every destination and route resolves, and stop ids are unique across routes', () => {
  const seen = new Set();
  for (const d of T.DESTINATIONS) {
    assert.ok(d.routes.length > 0, d.id + ' has a route');
    for (const r of d.routes) {
      assert.equal(r.destinationId, d.id, r.id + ' points at its destination');
      assert.equal(T.ROUTE_BY_ID[r.id], r);
      for (let i = 0; i < r.stops.length; i++) {
        const s = r.stops[i];
        assert.ok(!seen.has(s.id), s.id + ' is unique');
        seen.add(s.id);
        if (i > 0) assert.ok(s.km > r.stops[i - 1].km, s.id + ' km ascends');
        assert.equal(T.STOP_BY_ID[s.id], s);
      }
    }
  }
  assert.equal(seen.size, T.ALL_STOPS.length);
});

test('the existing stop ids are unchanged, so stored reports still resolve', () => {
  assert.deepEqual(T.ALL_STOPS.map((s) => s.id), [
    'cibodas', 'telaga-biru', 'rawa-gayonggong', 'panyancangan', 'air-panas',
    'kandang-batu', 'kandang-badak', 'tanjakan-setan', 'puncak-gede',
  ]);
});
