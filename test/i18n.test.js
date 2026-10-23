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
  M.ALL_STOPS.forEach(function (s) {
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
        // A note that depends on the mountain comes from noteKey, so its
        // dictionary string carries the placeholder rather than the source.
        if (f === 'note' && it.noteKey) {
          assert.ok(ID[it.noteKey], 'missing id string ' + it.noteKey);
          assert.ok(EN[it.noteKey], 'missing en string ' + it.noteKey);
          return;
        }
        var k = 'pack.' + it.id + '.' + f;
        assert.ok(ID[k], 'missing id string ' + k);
        assert.ok(EN[k] === it[f], 'en mirror of ' + k + ' drifted from packing.js');
      });
    });
  });
});

test('stop names are not in the dictionary', function () {
  M.ALL_STOPS.forEach(function (s) {
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

test('every difficulty level is translated, and the label takes the level', function () {
  M.DIFFICULTIES.forEach(function (id) {
    assert.ok(EN['diff.' + id], 'missing en string diff.' + id);
    assert.ok(ID['diff.' + id], 'missing id string diff.' + id);
  });
  ['en', 'id'].forEach(function (lang) {
    var s = I18N.STRINGS[lang]['trail.difficulty'];
    assert.ok(s, 'missing trail.difficulty in ' + lang);
    assert.strictEqual(placeholders(s), 'level', 'trail.difficulty needs {level} in ' + lang);
  });
});

test('lookup and fallback', function () {
  assert.strictEqual(I18N.t('id', 'reports.more.one'), EN['reports.more.one']); // en-only key falls back to English
  assert.strictEqual(I18N.t('en', 'no.such.key'), 'no.such.key');
  assert.strictEqual(I18N.tx('en', 'any.key', 'X'), 'X');
  assert.strictEqual(I18N.tx('id', 'any.key', 'X'), 'X'); // falls back to the English source
  // Bahasa Indonesia is the default for anything unknown or unset (#42).
  assert.strictEqual(I18N.normalizeLang('fr'), 'id');
  assert.strictEqual(I18N.normalizeLang('id'), 'id');
  assert.strictEqual(I18N.normalizeLang('en'), 'en');
  assert.strictEqual(I18N.normalizeLang(null), 'id');
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
test('five languages, each in its own file, Indonesian first and default', function () {
  assert.deepStrictEqual(I18N.LANGS, ['id', 'en', 'jv', 'su', 'ms']);
  assert.strictEqual(I18N.DEFAULT_LANG, 'id');
  I18N.LANGS.forEach(function (l) {
    var file = require('../public/lang/' + l + '.js');
    assert.ok(Object.keys(file).length > 100, l + '.js carries too few strings');
    assert.ok(I18N.LANG_NAMES[l], 'no name for ' + l);
    assert.strictEqual(I18N.normalizeLang(l), l);
  });
});

test('jv, su and ms only carry keys Indonesian has, with the same placeholders', function () {
  ['jv', 'su', 'ms'].forEach(function (l) {
    var d = require('../public/lang/' + l + '.js');
    Object.keys(d).forEach(function (k) {
      assert.ok(ID[k] !== undefined, l + ' has a key id lacks: ' + k);
      assert.strictEqual(placeholders(d[k]), placeholders(ID[k]), 'placeholder mismatch on ' + l + ' ' + k);
    });
    ['tab.trail', 'tab.mountains', 'catalog.saved', 'lang.title', 'lang.aria', 'time.at'].forEach(function (k) {
      assert.ok(d[k], l + ' is missing ' + k);
    });
    for (var i = 0; i < 7; i++) assert.ok(d['weekday.' + i], l + ' is missing weekday.' + i);
  });
});

test('a key a language lacks reads in Indonesian', function () {
  var jv = require('../public/lang/jv.js');
  assert.strictEqual(jv['pack.tent.label'], undefined, 'pick a key jv does not carry');
  assert.strictEqual(I18N.t('jv', 'pack.tent.label'), ID['pack.tent.label']);
  assert.strictEqual(I18N.t('jv', 'tab.trail'), jv['tab.trail']);
  assert.strictEqual(I18N.tx('su', 'cond.wildlife.label', 'Wildlife'), require('../public/lang/su.js')['cond.wildlife.label']);
  var stop = M.ALL_STOPS[0];
  assert.strictEqual(I18N.tx('ms', 'stop.' + stop.id + '.detail', stop.detail), ID['stop.' + stop.id + '.detail']);
  assert.strictEqual(I18N.t('xx', 'tab.trail'), ID['tab.trail']);
});

test('dates and numbers in the new languages', function () {
  assert.strictEqual(I18N.fmtNum('jv', 2958), '2.958');
  assert.strictEqual(I18N.fmtNum('su', 2958), '2.958');
  assert.strictEqual(I18N.fmtNum('ms', 2958), '2,958');
  assert.strictEqual(I18N.fmtKm('jv', 9.6), '9,6');
  assert.strictEqual(I18N.months('ms')[7], 'Ogo');
  assert.strictEqual(I18N.weekday('en', 1), 'Monday');
  assert.strictEqual(I18N.weekday('id', 5), 'Jumat');
  assert.strictEqual(I18N.t('en', 'time.at', { time: '07:05', date: '3 Oct' }), '07:05 on 3 Oct');
  assert.strictEqual(I18N.t('id', 'time.at', { time: '07:05', date: '3 Okt' }), 'pukul 07:05, 3 Okt');
});

test('the catalog carries the language button, and the pages load every language before i18n.js', function () {
  var html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  var saved = html.indexOf('id="catalog-saved"');
  var btn = html.indexOf('id="lang-btn"');
  assert.ok(saved > 0 && btn > saved, 'the language button sits after Saved');
  var core = html.indexOf('src="/i18n.js"');
  I18N.LANGS.forEach(function (l) {
    var at = html.indexOf('src="/lang/' + l + '.js"');
    assert.ok(at > 0 && at < core, '/lang/' + l + '.js loads before i18n.js');
    assert.ok(html.indexOf('data-lang="' + l + '"') > 0, 'the Location tab offers ' + l);
  });
});

test('fmtDate writes a data date in each language, in UTC', function () {
  assert.strictEqual(I18N.fmtDate('en', '2026-10-15T00:00:00Z'), '15 Oct 2026');
  assert.strictEqual(I18N.fmtDate('id', '2026-10-15T00:00:00Z'), '15 Okt 2026');
  assert.strictEqual(I18N.fmtDate('en', '2026-05-01T23:30:00Z'), '1 May 2026');
  assert.strictEqual(I18N.fmtDate('id', null), '');
  assert.strictEqual(I18N.fmtDate('en', 'not a date'), '');
});
