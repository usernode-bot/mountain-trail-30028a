'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { parseCorrection } = require('../lib/correction.js');
const T = require('../public/trail-data.js');

const ROUTE_IDS = new Set(Object.keys(T.ROUTE_BY_ID));

function good(overrides) {
  return Object.assign({
    clientId: 'c-1b2c3d4e',
    routeId: 'cibodas',
    message: 'Kandang Badak to the summit took us 3 hours, not 2',
  }, overrides || {});
}

test('parseCorrection accepts a valid body, with and without a route', () => {
  const withRoute = parseCorrection(good(), ROUTE_IDS);
  assert.ok(withRoute, 'expected a parsed correction');
  assert.strictEqual(withRoute.clientId, 'c-1b2c3d4e');
  assert.strictEqual(withRoute.routeId, 'cibodas');

  const general = parseCorrection(good({ routeId: null }), ROUTE_IDS);
  assert.ok(general);
  assert.strictEqual(general.routeId, null);

  const missing = parseCorrection(good({ routeId: undefined }), ROUTE_IDS);
  assert.ok(missing);
  assert.strictEqual(missing.routeId, null);
});

test('parseCorrection rejects an unknown route or a non-string route', () => {
  assert.strictEqual(parseCorrection(good({ routeId: 'no-such-route' }), ROUTE_IDS), null);
  assert.strictEqual(parseCorrection(good({ routeId: 42 }), ROUTE_IDS), null);
});

test('parseCorrection trims the message and rejects an empty one', () => {
  const trimmed = parseCorrection(good({ message: '  Too short a walk  ' }), ROUTE_IDS);
  assert.strictEqual(trimmed.message, 'Too short a walk');
  assert.strictEqual(parseCorrection(good({ message: '' }), ROUTE_IDS), null);
  assert.strictEqual(parseCorrection(good({ message: '   \n\t ' }), ROUTE_IDS), null);
});

test('parseCorrection rejects a message over 500 characters', () => {
  assert.ok(parseCorrection(good({ message: 'x'.repeat(500) }), ROUTE_IDS));
  assert.strictEqual(parseCorrection(good({ message: 'x'.repeat(501) }), ROUTE_IDS), null);
});

test('parseCorrection rejects non-string fields and a bad clientId', () => {
  assert.strictEqual(parseCorrection(good({ message: 12 }), ROUTE_IDS), null);
  assert.strictEqual(parseCorrection(good({ clientId: '' }), ROUTE_IDS), null);
  assert.strictEqual(parseCorrection(good({ clientId: 'x'.repeat(65) }), ROUTE_IDS), null);
  assert.strictEqual(parseCorrection(good({ clientId: 7 }), ROUTE_IDS), null);
  assert.strictEqual(parseCorrection(null, ROUTE_IDS), null);
});
