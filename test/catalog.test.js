const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../public/catalog.js');
const T = require('../public/trail-data.js');

const ENTRIES = [
  { id: 'semeru', name: 'Semeru', province: 'Jawa Timur', island: 'jawa', summitM: 3676, difficulty: 'hard', status: { level: 'open' }, searchText: 'Semeru Jawa Timur Java' },
  { id: 'prau', name: 'Prau', province: 'Jawa Tengah', island: 'jawa', summitM: 2565, difficulty: 'moderate', status: { level: 'limited' }, searchText: 'Prau Jawa Tengah Java' },
  { id: 'batur', name: 'Batur', province: 'Bali', island: 'bali', summitM: 1717, difficulty: 'easy', status: { level: 'closed' }, searchText: 'Batur Bali Bali' },
  { id: 'kerinci', name: 'Kerinci', province: 'Jambi', island: 'sumatra', summitM: 3805, difficulty: 'hard', status: { level: 'open' }, searchText: 'Kerinci Jambi Sumatra' },
];

test('the search matches name, province or island, case-insensitively', () => {
  assert.deepEqual(C.filterEntries(ENTRIES, { q: 'semer' }).map((e) => e.id), ['semeru']);
  assert.deepEqual(C.filterEntries(ENTRIES, { q: 'JAMBI' }).map((e) => e.id), ['kerinci']);
  assert.deepEqual(C.filterEntries(ENTRIES, { q: 'java' }).map((e) => e.id), ['semeru', 'prau']);
  assert.deepEqual(C.filterEntries(ENTRIES, { q: '  ' }).length, 4);
});

test('difficulty, height and status filters compose', () => {
  assert.deepEqual(C.filterEntries(ENTRIES, { difficulty: 'hard' }).map((e) => e.id), ['semeru', 'kerinci']);
  assert.deepEqual(C.filterEntries(ENTRIES, { height: 'low' }).map((e) => e.id), ['batur']);
  assert.deepEqual(C.filterEntries(ENTRIES, { height: 'mid' }).map((e) => e.id), ['prau']);
  assert.deepEqual(C.filterEntries(ENTRIES, { height: 'high' }).map((e) => e.id), ['semeru', 'kerinci']);
  assert.deepEqual(C.filterEntries(ENTRIES, { status: 'limited' }).map((e) => e.id), ['prau']);
  assert.deepEqual(
    C.filterEntries(ENTRIES, { difficulty: 'hard', status: 'open', height: 'high' }).map((e) => e.id),
    ['semeru', 'kerinci']
  );
});

test('height bands break at 2,000 and 3,000 metres', () => {
  assert.equal(C.heightBand(1999), 'low');
  assert.equal(C.heightBand(2000), 'mid');
  assert.equal(C.heightBand(2999), 'mid');
  assert.equal(C.heightBand(3000), 'high');
  assert.equal(C.heightBand(undefined), null);
});

test('saved-only keeps the saved ids, in input order', () => {
  assert.deepEqual(
    C.filterEntries(ENTRIES, { savedOnly: true, savedIds: ['batur', 'semeru'] }).map((e) => e.id),
    ['semeru', 'batur']
  );
});

test('grouping follows the island order and leaves empty islands out', () => {
  const groups = C.groupByIsland(ENTRIES, ['sumatra', 'jawa', 'bali', 'papua']);
  assert.deepEqual(groups.map((g) => g.island), ['sumatra', 'jawa', 'bali']);
  assert.deepEqual(groups.map((g) => g.entries.length), [1, 2, 1]);
});

test('popular keeps the named order and skips a missing id', () => {
  assert.deepEqual(C.popularEntries(ENTRIES, ['kerinci', 'nope', 'semeru']).map((e) => e.id), ['kerinci', 'semeru']);
});

test('the real catalog filters to at least 40 rows and every island groups', () => {
  const all = T.DESTINATIONS.map((d) => {
    const e = T.catalogView(d);
    e.searchText = e.name + ' ' + e.province;
    return e;
  });
  assert.ok(C.filterEntries(all, {}).length >= 40);
  assert.deepEqual(C.groupByIsland(all, T.ISLANDS).map((g) => g.island), T.ISLANDS);
  assert.equal(C.filterEntries(all, { q: 'semeru' })[0].id, 'semeru');
  assert.equal(C.filterEntries(all, { q: 'no such mountain' }).length, 0);
});

test('the island filter keeps one island and composes with the others', () => {
  assert.deepEqual(C.filterEntries(ENTRIES, { island: 'jawa' }).map((e) => e.id), ['semeru', 'prau']);
  assert.deepEqual(C.filterEntries(ENTRIES, { island: 'sumatra', difficulty: 'hard' }).map((e) => e.id), ['kerinci']);
  assert.deepEqual(C.filterEntries(ENTRIES, { island: 'jawa', height: 'low' }).map((e) => e.id), []);
  assert.equal(C.filterEntries(ENTRIES, { island: 'all' }).length, 4);
});

test('the Filter button counts the panel filters that are set', () => {
  assert.equal(C.activeFilterCount({}), 0);
  assert.equal(C.activeFilterCount({ island: 'all', difficulty: 'all', height: 'all', status: 'all' }), 0);
  assert.equal(C.activeFilterCount({ island: 'bali', difficulty: 'hard', height: 'all', status: 'open' }), 3);
  // The search and Saved stay on the screen and are not counted.
  assert.equal(C.activeFilterCount({ q: 'semeru', savedOnly: true }), 0);
});

test('every catalog entry carries an island the filter offers', () => {
  T.DESTINATIONS.forEach((d) => {
    assert.ok(T.ISLANDS.indexOf(T.catalogView(d).island) >= 0, d.id + ' has island ' + d.island);
  });
  const all = T.DESTINATIONS.map((d) => T.catalogView(d));
  const bali = C.filterEntries(all, { island: 'bali' });
  assert.ok(bali.length > 0);
  assert.ok(bali.every((e) => e.island === 'bali'));
});
