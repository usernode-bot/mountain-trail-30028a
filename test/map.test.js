/*
 * Tests for the Map tab's geometry (trail-map.js): the route is drawn
 * north up at one scale on both axes, inside the padding, and the scale
 * bar picks a round length that fits.
 */
const test = require('node:test');
const assert = require('node:assert');
const MAP = require('../public/trail-map.js');
const T = require('../public/trail-data.js');

const PAD = { top: 44, right: 150, bottom: 52, left: 28 };

test('every stop of the route gets a point, in trail order', () => {
  const geo = MAP.project(T.STOPS, 358, PAD);
  assert.deepEqual(geo.points.map((p) => p.id), T.STOPS.map((s) => s.id));
});

test('north is up and east is right: basecamp top right, summit bottom left', () => {
  const geo = MAP.project(T.STOPS, 358, PAD);
  const base = geo.points[0];
  const summit = geo.points[geo.points.length - 1];
  assert.ok(base.y < summit.y, 'basecamp (further north) is drawn above the summit');
  assert.ok(base.x > summit.x, 'basecamp (further east) is drawn right of the summit');
});

test('points stay inside the padding', () => {
  const geo = MAP.project(T.STOPS, 358, PAD);
  geo.points.forEach((p) => {
    assert.ok(p.x >= PAD.left - 0.01 && p.x <= 358 - PAD.right + 0.01, p.id + ' x ' + p.x);
    assert.ok(p.y >= PAD.top - 0.01 && p.y <= geo.height - PAD.bottom + 0.01, p.id + ' y ' + p.y);
  });
});

test('one scale on both axes: drawn distances match ground distances', () => {
  const geo = MAP.project(T.STOPS, 358, PAD);
  const a = T.STOPS[0], b = T.STOPS[T.STOPS.length - 1];
  const pa = geo.points[0], pb = geo.points[geo.points.length - 1];
  const R = 6371000, rad = Math.PI / 180;
  const h = Math.sin((b.lat - a.lat) * rad / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2;
  const groundKm = 2 * R * Math.asin(Math.sqrt(h)) / 1000;
  const drawnKm = Math.hypot(pb.x - pa.x, pb.y - pa.y) / geo.pxPerKm;
  assert.ok(Math.abs(drawnKm - groundKm) / groundKm < 0.01, drawnKm + ' vs ' + groundKm);
});

test('the scale bar picks the largest round length that fits', () => {
  assert.deepEqual(MAP.scaleBar(100, 110), { km: 1, px: 100 });
  assert.deepEqual(MAP.scaleBar(40, 110), { km: 2, px: 80 });
  assert.deepEqual(MAP.scaleBar(300, 110), { km: 0.2, px: 60 });
});

test('no stops draws nothing', () => {
  assert.deepEqual(MAP.project([], 358, PAD).points, []);
});
