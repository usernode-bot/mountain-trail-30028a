const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../public/mountain-catalog.js');
const T = require('../public/trail-data.js');

test('ids are unique kebab strings, usable as the guide-page hash key', () => {
  const ids = C.MOUNTAINS.map((m) => m.id);
  assert.equal(new Set(ids).size, ids.length);
  ids.forEach((id) => assert.match(id, /^[a-z0-9-]+$/));
});

test('every mountain sits on a known island with facts and at least one route', () => {
  const islandIds = C.ISLANDS.map((i) => i.id);
  C.MOUNTAINS.forEach((m) => {
    assert.ok(islandIds.includes(m.island), m.id + ' island');
    assert.ok(m.province && m.province.length > 0, m.id + ' province');
    assert.ok(m.elevM > 1000 && m.elevM < 5000, m.id + ' elevation in range');
    assert.ok(C.DIFFICULTIES.some((d) => d.id === m.difficulty), m.id + ' difficulty');
    assert.ok(C.DURATIONS.some((d) => d.id === m.duration), m.id + ' duration');
    assert.ok(C.STATUSES.some((s) => s.id === m.status), m.id + ' status');
    assert.ok(typeof m.permit === 'string' && m.permit.length > 0, m.id + ' permit');
    assert.ok(typeof m.basecamp === 'string' && m.basecamp.length > 0, m.id + ' basecamp');
    assert.ok(Array.isArray(m.routes) && m.routes.length >= 1, m.id + ' routes');
    m.routes.forEach((r) => {
      assert.ok(r.km > 0, m.id + ' route km');
      assert.ok(r.climbM > 0, m.id + ' route climb');
      assert.ok(typeof r.hoursUp === 'string' && r.hoursUp.length > 0, m.id + ' route hours');
    });
  });
});

test('the six starter mountains of the first batch are all present', () => {
  const ids = C.MOUNTAINS.map((m) => m.id);
  ['semeru', 'rinjani', 'kerinci', 'merbabu', 'gede-pangrango', 'prau'].forEach((id) => {
    assert.ok(ids.includes(id), id);
  });
});

test('island sections come in the fixed west-to-east order, all seven groups', () => {
  assert.deepEqual(
    C.ISLANDS.map((i) => i.id),
    ['sumatra', 'java', 'bali-nusa-tenggara', 'kalimantan', 'sulawesi', 'maluku', 'papua']
  );
});

test("Gede Pangrango's entry matches the trail guide's own figures and links to it", () => {
  const g = C.MOUNTAIN_BY_ID['gede-pangrango'];
  assert.equal(g.elevM, T.MOUNTAIN.summitM);
  assert.equal(g.routes[0].km, T.MOUNTAIN.lengthKm);
  assert.equal(g.routes[0].climbM, T.MOUNTAIN.climbM);
  assert.equal(g.guide, 'trail-data');
});

test('editable fields are the overlay whitelist only, routes deliberately out', () => {
  assert.deepEqual(C.EDITABLE_FIELDS, ['elevM', 'difficulty', 'duration', 'status', 'permit', 'basecamp', 'note']);
});
