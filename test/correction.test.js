'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { parseCorrection, CORRECTION_FIELDS } = require('../lib/correction.js');
const M = require('../public/trail-data.js');

const ROUTES = new Set(Object.keys(M.ROUTE_BY_ID));

function good(overrides) {
  return Object.assign({
    clientId: 'c-1b2c3d4e',
    routeId: 'cibodas',
    field: 'height',
    note: 'The sign at Puncak Gede says 2,958 m.',
  }, overrides || {});
}

test('parseCorrection accepts a valid body and trims the note', () => {
  const c = parseCorrection(good({ note: '  Takes 8 hours with packs.  ', field: 'time' }), ROUTES);
  assert.deepStrictEqual(c, { clientId: 'c-1b2c3d4e', routeId: 'cibodas', field: 'time', note: 'Takes 8 hours with packs.' });
});

test('parseCorrection accepts every field the form offers', () => {
  CORRECTION_FIELDS.forEach((f) => assert.ok(parseCorrection(good({ field: f }), ROUTES), f));
});

test('parseCorrection allows no route (sent from the catalog)', () => {
  assert.strictEqual(parseCorrection(good({ routeId: null }), ROUTES).routeId, null);
  assert.strictEqual(parseCorrection(good({ routeId: undefined }), ROUTES).routeId, null);
});

test('parseCorrection rejects an unknown route or field', () => {
  assert.strictEqual(parseCorrection(good({ routeId: 'not-a-route' }), ROUTES), null);
  assert.strictEqual(parseCorrection(good({ routeId: 7 }), ROUTES), null);
  assert.strictEqual(parseCorrection(good({ field: 'weather' }), ROUTES), null);
  assert.strictEqual(parseCorrection(good({ field: undefined }), ROUTES), null);
});

test('parseCorrection rejects an empty, blank or oversized note', () => {
  assert.strictEqual(parseCorrection(good({ note: '' }), ROUTES), null);
  assert.strictEqual(parseCorrection(good({ note: '   ' }), ROUTES), null);
  assert.strictEqual(parseCorrection(good({ note: 'x'.repeat(301) }), ROUTES), null);
  assert.ok(parseCorrection(good({ note: 'x'.repeat(300) }), ROUTES));
  assert.strictEqual(parseCorrection(good({ note: 12 }), ROUTES), null);
});

test('parseCorrection rejects a missing or oversized clientId', () => {
  assert.strictEqual(parseCorrection(good({ clientId: '' }), ROUTES), null);
  assert.strictEqual(parseCorrection(good({ clientId: 'x'.repeat(65) }), ROUTES), null);
  assert.strictEqual(parseCorrection(null, ROUTES), null);
});
