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

test('the guide names the mountain and its four conditions', () => {
  assert.equal(T.MOUNTAIN.name, 'Gede Pangrango');
  assert.deepEqual(
    T.CONDITIONS.map((c) => c.id).sort(),
    ['heavy-fog', 'landslide', 'no-water', 'slippery']
  );
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
