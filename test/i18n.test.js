/*
 * Tests for the i18n layer: both dictionaries stay in step, every guide
 * item is translated, the keys index.html points at exist, and lookup,
 * plurals, times and numbers behave.
 */
var test = require('node:test');
var assert = require('node:assert');
var fs = require('node:fs');
var path = require('node:path');

var I18N = require('../public/i18n.js');
var M = require('../public/trail-data.js');
var P = require('../public/packing.js');

var EN = I18N.STRINGS.en;
var ID = I18N.STRINGS.id;

function placeholders(s) {
  var out = [];
  String(s).replace(/\{(\w+)\}/g, function (_, name) { out.push(name); });
  return out.sort().join(',');
}

test('both dictionaries have the same keys', function () {
  Object.keys(EN).forEach(function (k) {
    if (/\.one$/.test(k)) return; // English plural forms only
    assert.ok(ID[k] !== undefined, 'missing from id: ' + k);
  });
  Object.keys(ID).forEach(function (k) {
    assert.ok(EN[k] !== undefined, 'missing from en: ' + k);
  });
});

test('placeholders match between the languages', function () {
  Object.keys(EN).forEach(function (k) {
    if (ID[k] === undefined) return;
    assert.strictEqual(placeholders(ID[k]), placeholders(EN[k]), 'placeholder mismatch on ' + k);
  });
});

test('every guide item is translated', function () {
  M.STOPS.forEach(function (s) {
    ['short', 'detail'].forEach(function (f) {
      var k = 'stop.' + s.id + '.' + f;
      assert.ok(ID[k], 'missing id string ' + k);
      assert.ok(EN[k] === s[f], 'en mirror of ' + k + ' drifted from trail-data.js');
    });
  });
  M.CONDITIONS.forEach(function (c) {
    ['label', 'hint'].forEach(function (f) {
      var k = 'cond.' + c.id + '.' + f;
      assert.ok(ID[k], 'missing id string ' + k);
      assert.ok(EN[k] === c[f], 'en mirror of ' + k + ' drifted from trail-data.js');
    });
  });
  var groups = P.buildPackingList({ days: 5, people: 12 });
  groups.forEach(function (g) {
    assert.ok(g.key, 'packing group has no key');
    var gk = 'pack.group.' + g.key;
    assert.ok(ID[gk], 'missing id string ' + gk);
    assert.ok(EN[gk] === g.group, 'en mirror of ' + gk + ' drifted from packing.js');
    g.items.forEach(function (it) {
      ['label', 'note'].forEach(function (f) {
        var k = 'pack.' + it.id + '.' + f;
        assert.ok(ID[k], 'missing id string ' + k);
        assert.ok(EN[k] === it[f], 'en mirror of ' + k + ' drifted from packing.js');
      });
    });
  });
});

test('stop names are not in the dictionary', function () {
  M.STOPS.forEach(function (s) {
    assert.strictEqual(ID['stop.' + s.id + '.name'], undefined);
    assert.strictEqual(EN['stop.' + s.id + '.name'], undefined);
  });
});

test('index.html keys exist in both dictionaries', function () {
  var html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  var re = /data-i18n(?:-label|-placeholder)?="([^"]+)"/g;
  var found = 0;
  var m;
  while ((m = re.exec(html)) !== null) {
    found++;
    assert.ok(EN[m[1]] !== undefined, 'data-i18n key missing from en: ' + m[1]);
    assert.ok(ID[m[1]] !== undefined, 'data-i18n key missing from id: ' + m[1]);
  }
  assert.ok(found > 20, 'expected the markup to carry i18n keys, found ' + found);
});

test('every difficulty level and the difficulty line are translated', function () {
  M.DIFFICULTIES.forEach(function (d) {
    assert.ok(ID['diff.' + d], 'missing id string diff.' + d);
    assert.ok(EN['diff.' + d], 'missing en string diff.' + d);
  });
  assert.ok(EN['trail.difficulty'].includes('{level}'), 'trail.difficulty carries the level');
  assert.ok(ID['trail.difficulty'].includes('{level}'), 'trail.difficulty carries the level');
});

test('lookup and fallback', function () {
  assert.strictEqual(I18N.t('id', 'reports.more.one'), EN['reports.more.one']); // en-only key falls back to English
  assert.strictEqual(I18N.t('en', 'no.such.key'), 'no.such.key');
  assert.strictEqual(I18N.tx('en', 'any.key', 'X'), 'X');
  assert.strictEqual(I18N.tx('id', 'any.key', 'X'), 'X'); // falls back to the English source
  assert.strictEqual(I18N.normalizeLang('fr'), 'en');
  assert.strictEqual(I18N.normalizeLang('id'), 'id');
  assert.strictEqual(I18N.normalizeLang(null), 'en');
});

test('plurals and relative times', function () {
  assert.notStrictEqual(I18N.tn('en', 'reports.more', 1), I18N.tn('en', 'reports.more', 3));
  // Indonesian has a single form: both counts come from the same .other key.
  assert.strictEqual(I18N.tn('id', 'reports.more', 1), ID['reports.more.other'].replace('{n}', '1'));
  assert.strictEqual(I18N.tn('id', 'reports.more', 3), ID['reports.more.other'].replace('{n}', '3'));
  assert.strictEqual(I18N.ago('id', 0), 'baru saja');
  assert.strictEqual(I18N.ago('id', 2 * 3600000), '2 jam lalu');
  assert.strictEqual(I18N.ago('en', 5 * 60000), '5 min ago');
  assert.strictEqual(I18N.ago('id', 25 * 3600000), 'lebih dari sehari lalu');
});

test('numbers use the language’s separators', function () {
  assert.strictEqual(I18N.fmtNum('id', 2958), '2.958');
  assert.strictEqual(I18N.fmtNum('en', 2958), '2,958');
  assert.strictEqual(I18N.fmtKm('id', 9.6), '9,6');
  assert.strictEqual(I18N.fmtKm('en', 9.6), '9.6');
  assert.strictEqual(I18N.fmtKm('id', 0), '0');
});