const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCatalogEdit } = require('../lib/catalog-edit.js');
const C = require('../public/mountain-catalog.js');

const good = { clientId: 'c-1', mountainId: 'semeru', field: 'elevM', value: '3,676', note: 'the park board' };

test('accepts every editable field', () => {
  const cases = {
    elevM: '3676',
    difficulty: 'hard',
    duration: 'day-hike',
    status: 'closed',
    permit: 'SIMAKSI, booked at the new portal',
    basecamp: 'Ranu Kumbolo',
    note: 'the gate now opens at 5 am',
  };
  Object.keys(cases).forEach((field) => {
    const e = parseCatalogEdit(Object.assign({}, good, { field, value: cases[field] }), C);
    assert.ok(e, field);
    assert.equal(e.field, field);
    assert.equal(e.mountainId, 'semeru');
  });
});

test('normalizes a comma-separated elevation into a plain number', () => {
  const e = parseCatalogEdit(good, C);
  assert.equal(e.value, '3676');
  assert.equal(e.note, 'the park board');
});

test('keeps a free-text note field to 300 characters', () => {
  const e = parseCatalogEdit(Object.assign({}, good, { field: 'note', note: 'x'.repeat(301) }), C);
  assert.equal(e.note.length, 300);
});

test('rejects the bad shapes', () => {
  assert.equal(parseCatalogEdit(null, C), null);
  assert.equal(parseCatalogEdit('nope', C), null);
  assert.equal(parseCatalogEdit(Object.assign({}, good, { clientId: '' }), C), null);
  assert.equal(parseCatalogEdit(Object.assign({}, good, { clientId: 'x'.repeat(65) }), C), null);
  assert.equal(parseCatalogEdit(Object.assign({}, good, { mountainId: 'twin-towers' }), C), null);
  assert.equal(parseCatalogEdit(Object.assign({}, good, { field: 'routes' }), C), null);
  assert.equal(parseCatalogEdit(Object.assign({}, good, { value: '   ' }), C), null);
  assert.equal(parseCatalogEdit(Object.assign({}, good, { value: 'x'.repeat(301) }), C), null);
  assert.equal(parseCatalogEdit(Object.assign({}, good, { field: 'elevM', value: '8848' }), C), null);
  assert.equal(parseCatalogEdit(Object.assign({}, good, { field: 'elevM', value: 'not a number' }), C), null);
  assert.equal(parseCatalogEdit(Object.assign({}, good, { field: 'difficulty', value: 'extreme' }), C), null);
  assert.equal(parseCatalogEdit(Object.assign({}, good, { field: 'duration', value: 'all week' }), C), null);
  assert.equal(parseCatalogEdit(Object.assign({}, good, { field: 'status', value: 'maybe' }), C), null);
});
