/*
 * Tests for the colour mode: the Auto / Light / Dark cycle, and which look
 * Auto resolves to. The storage and DOM wiring live in index.html and
 * app.js; the decision itself is pure and tested here.
 */
var test = require('node:test');
var assert = require('node:assert/strict');

var T = require('../public/theme.js');

test('the colour mode cycles Auto, Light, Dark and back', function () {
  assert.equal(T.next('auto'), 'light');
  assert.equal(T.next('light'), 'dark');
  assert.equal(T.next('dark'), 'auto');
  assert.equal(T.next('nonsense'), 'light', 'an unknown mode starts from Auto');
});

test('any stored value that is not one of the three modes is Auto', function () {
  assert.deepEqual(T.PREFS, ['auto', 'light', 'dark']);
  assert.equal(T.normalize('auto'), 'auto');
  assert.equal(T.normalize('light'), 'light');
  assert.equal(T.normalize('dark'), 'dark');
  assert.equal(T.normalize('system'), 'auto');
  assert.equal(T.normalize(''), 'auto');
  assert.equal(T.normalize(null), 'auto');
  assert.equal(T.normalize(undefined), 'auto');
});

test('Auto follows Homeroom, then the device preference', function () {
  assert.equal(T.resolve('auto', 'dark', false), 'dark');
  assert.equal(T.resolve('auto', 'light', true), 'light');
  assert.equal(T.resolve('auto', null, true), 'dark');
  assert.equal(T.resolve('auto', null, false), 'light');
  assert.equal(T.resolve('auto', 'system', true), 'dark', 'a value outside light/dark is ignored');
});

test('a pick wins over Homeroom and the device', function () {
  assert.equal(T.resolve('light', 'dark', true), 'light');
  assert.equal(T.resolve('dark', 'light', false), 'dark');
});

test('the preference is optional, so Auto is the safe default', function () {
  assert.equal(T.preference(), 'auto', 'no storage in this process');
  assert.equal(T.save('dark'), 'dark');
  assert.equal(T.save('nonsense'), 'auto');
});
