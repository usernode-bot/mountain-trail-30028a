const test = require('node:test');
const assert = require('node:assert/strict');
const { buildPackingList } = require('../public/packing.js');

function flat(list) {
  const out = {};
  list.forEach((g) => g.items.forEach((it) => { out[it.id] = it.qty; }));
  return out;
}

test('a one-day trip carries no overnight gear', () => {
  const items = flat(buildPackingList({ days: 1, people: 3 }));
  ['tent', 'stove', 'gas', 'sleeping-bag', 'sleeping-mat', 'warm-jacket', 'gloves', 'tablets', 'dry-clothes'].forEach((id) => {
    assert.ok(!(id in items), 'a 1-day trip should not list ' + id);
  });
});

test('2 days and 4 people: 2 tents, 1 stove, 16 meals, 8 L of water', () => {
  const items = flat(buildPackingList({ days: 2, people: 4 }));
  assert.equal(items.tent, 2);
  assert.equal(items.stove, 1);
  assert.equal(items.meals, 16);
  assert.equal(items.water, 8);
});

test('5 people need 3 tents', () => {
  const items = flat(buildPackingList({ days: 3, people: 5 }));
  assert.equal(items.tent, 3);
});

test('item ids stay the same across inputs', () => {
  const small = buildPackingList({ days: 1, people: 1 });
  const big = buildPackingList({ days: 5, people: 12 });
  const labelsOf = {};
  const groupsOf = {};
  big.forEach((g) => g.items.forEach((it) => { labelsOf[it.id] = it.label; groupsOf[it.id] = g.group; }));
  small.forEach((g) => g.items.forEach((it) => {
    assert.equal(labelsOf[it.id], it.label, it.id + ' names the same item in both inputs');
    assert.equal(groupsOf[it.id], g.group, it.id + ' sits in the same group in both inputs');
  }));
  assert.ok(Object.keys(labelsOf).length > 15);
});

test('the list comes in three groups', () => {
  const list = buildPackingList({ days: 2, people: 2 });
  assert.deepEqual(list.map((g) => g.group), ['Shared by the group', 'Each person', 'Food and water']);
});
