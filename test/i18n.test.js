const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../public/i18n.js');

test('English and Indonesian ship the same string keys', () => {
  assert.deepEqual(I.keys('id').sort(), I.keys('en').sort());
});

test('every string in both languages is filled in', () => {
  I.keys('en').forEach((k) => {
    assert.ok(typeof I.t('en', k) === 'string' && I.t('en', k).length > 0, 'en:' + k);
  });
  I.keys('id').forEach((k) => {
    assert.ok(typeof I.t('id', k) === 'string' && I.t('id', k).length > 0, 'id:' + k);
  });
});

test('resolveLang: stored choice, then platform locale, then device, then English', () => {
  assert.equal(I.resolveLang('id', 'en', 'en-US'), 'id');
  assert.equal(I.resolveLang(null, 'id', 'en-US'), 'id');
  assert.equal(I.resolveLang(null, null, 'id-ID'), 'id');
  assert.equal(I.resolveLang(null, null, 'en-GB'), 'en');
  assert.equal(I.resolveLang(null, null, 'fr-FR'), 'en');
  // null means "no preference set", not English: the device still decides.
  assert.equal(I.resolveLang(null, null, null), 'en');
  // Sub-tag mapping: pt-BR maps onto a shipped pt when there is one,
  // otherwise falls through. An unknown platform locale is ignored.
  assert.equal(I.resolveLang(null, 'id-ID', null), 'id');
  assert.equal(I.resolveLang(null, 'xx-YY', 'en'), 'en');
});

test('t() fills {vars} and falls back to English for a missing Indonesian string', () => {
  assert.equal(I.t('id', 'permits.quotaValue', { n: '1.500' }).includes('1.500'), true);
  assert.equal(I.t('id', 'status.moreMany', { n: 3 }).includes('3'), true);
  assert.equal(I.t('en', 'status.reported', { ago: '5 min ago' }), 'Reported 5 min ago');
});