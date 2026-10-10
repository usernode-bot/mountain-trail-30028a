'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { parseLocation } = require('../lib/location.js');

// A fixed "now" so the time-window tests never depend on the clock.
const NOW = new Date('2026-10-10T14:30:00Z');

function good(overrides) {
  return Object.assign({
    clientId: 'a-1b2c3d4e',
    lat: -6.7649,
    lng: 106.987,
    accuracy: 12,
    at: '2026-10-10T14:28:00Z',
  }, overrides || {});
}

test('parseLocation accepts a valid body', () => {
  const loc = parseLocation(good(), NOW);
  assert.ok(loc, 'expected a parsed location');
  assert.strictEqual(loc.clientId, 'a-1b2c3d4e');
  assert.strictEqual(loc.lat, -6.7649);
  assert.strictEqual(loc.lng, 106.987);
  assert.strictEqual(loc.accuracy, 12);
  assert.strictEqual(loc.takenAt.toISOString(), '2026-10-10T14:28:00.000Z');
});

test('parseLocation rejects out-of-range coordinates', () => {
  assert.strictEqual(parseLocation(good({ lat: 91 }), NOW), null);
  assert.strictEqual(parseLocation(good({ lat: -90.5 }), NOW), null);
  assert.strictEqual(parseLocation(good({ lng: -181 }), NOW), null);
  assert.strictEqual(parseLocation(good({ lng: 181 }), NOW), null);
  assert.strictEqual(parseLocation(good({ lat: NaN }), NOW), null);
  // A coordinate sent as a string is not a number the route will store.
  assert.strictEqual(parseLocation(good({ lat: '-6.7649' }), NOW), null);
  assert.strictEqual(parseLocation(good({ accuracy: -1 }), NOW), null);
});

test('parseLocation rejects a missing or oversized clientId', () => {
  assert.strictEqual(parseLocation(good({ clientId: '' }), NOW), null);
  assert.strictEqual(parseLocation(good({ clientId: 'x'.repeat(65) }), NOW), null);
});

test('parseLocation enforces the time window', () => {
  // 11 minutes in the future: past the clock-skew margin.
  assert.strictEqual(parseLocation(good({ at: '2026-10-10T14:41:00Z' }), NOW), null);
  // 31 days in the past: past the offline-replay horizon.
  assert.strictEqual(parseLocation(good({ at: '2026-09-09T00:00:00Z' }), NOW), null);
  // 2 days in the past: a normal offline replay, accepted.
  assert.ok(parseLocation(good({ at: '2026-10-08T14:30:00Z' }), NOW), 'expected 2 days old to be accepted');
  assert.strictEqual(parseLocation(good({ at: 'not a date' }), NOW), null);
});

test('parseLocation treats accuracy as optional', () => {
  const noAcc = parseLocation(good({ accuracy: undefined }), NOW);
  assert.ok(noAcc);
  assert.strictEqual(noAcc.accuracy, null);
  const nullAcc = parseLocation(good({ accuracy: null }), NOW);
  assert.ok(nullAcc);
  assert.strictEqual(nullAcc.accuracy, null);
  // Accuracy of exactly 0 is valid.
  assert.strictEqual(parseLocation(good({ accuracy: 0 }), NOW).accuracy, 0);
});
