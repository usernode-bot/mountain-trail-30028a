/*
 * Mountain Trail's languages. The strings live one file per language in
 * public/lang/ (id.js, en.js, jv.js, su.js, ms.js); this module loads them
 * and holds the lookup, plurals, times and numbers. Pure: strings and
 * formatters in, strings out, so it can be unit tested. Bahasa Indonesia is
 * the default and the fallback for any key a language does not carry.
 * English stays the source text of the guide data (trail-data.js,
 * packing.js); the id dictionary holds its translations keyed by stable ids.
 * In the page the lang/*.js scripts load before this one.
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var M = node ? require('./trail-data.js') : root.MT_TRAIL;
  var D = node ? {
    id: require('./lang/id.js'),
    en: require('./lang/en.js'),
    jv: require('./lang/jv.js'),
    su: require('./lang/su.js'),
    ms: require('./lang/ms.js'),
  } : (root.MT_LANG || {});
  var api = factory(M, D);
  if (node) module.exports = api;
  root.MT_I18N = api;
})(typeof self !== 'undefined' ? self : this, function (M, D) {
  'use strict';

  // The picker's order. Each language is named in itself.
  var LANGS = ['id', 'en', 'jv', 'su', 'ms'];
  var DEFAULT_LANG = 'id';
  var LANG_NAMES = { id: 'Bahasa Indonesia', en: 'English', jv: 'Basa Jawa', su: 'Basa Sunda', ms: 'Bahasa Melayu' };
  // Indonesia's separators (2.958 and 9,6) for the languages spoken there;
  // English and Malaysian Malay write 2,958 and 9.6.
  var COMMA_DECIMAL = { id: true, jv: true, su: true };

  var EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var ID_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var MS_MONTHS = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];

  var STRINGS = {};
  LANGS.forEach(function (l) { STRINGS[l] = Object.assign({}, D[l] || {}); });

  // Every stop's two guide sentences live with the guide data (the English
  // source and its Indonesian translation), so the dictionaries above carry
  // the chrome and this copies the stop text in. The i18n test still checks
  // that every stop has both.
  if (M && M.ALL_STOPS) {
    M.ALL_STOPS.forEach(function (s) {
      STRINGS.en['stop.' + s.id + '.short'] = s.short;
      STRINGS.en['stop.' + s.id + '.detail'] = s.detail;
      var sk = 'stop.' + s.id + '.short', dk = 'stop.' + s.id + '.detail';
      if (STRINGS.id[sk] === undefined) STRINGS.id[sk] = s.shortId || s.short;
      if (STRINGS.id[dk] === undefined) STRINGS.id[dk] = s.detailId || s.detail;
    });
  }

  // Any stored value that is not one of the five languages (or nothing at
  // all) is Bahasa Indonesia.
  function normalizeLang(v) { return LANGS.indexOf(v) >= 0 ? v : DEFAULT_LANG; }

  // The chosen language first, then Bahasa Indonesia, then English (which
  // only holds the English plural forms id has no use for).
  function lookup(lang, key) {
    var d = STRINGS[lang];
    var s = d ? d[key] : undefined;
    if (s === undefined) s = STRINGS.id[key];
    if (s === undefined) s = STRINGS.en[key];
    return s;
  }

  function t(lang, key, vars) {
    var s = lookup(lang, key);
    if (s === undefined) return key;
    if (vars) {
      for (var k in vars) s = s.split('{' + k + '}').join(String(vars[k]));
    }
    return s;
  }

  // Plurals: English has .one/.other, the other languages only .other. n is
  // always available as a {n} placeholder.
  function tn(lang, key, n, vars) {
    var v = Object.assign({}, vars, { n: n });
    var d = STRINGS[lang] || STRINGS.id;
    var k = (n === 1 && d[key + '.one'] !== undefined) ? key + '.one' : key + '.other';
    return t(lang, k, v);
  }

  // For strings whose English source lives in the data files: English
  // returns the given source text as is; any other language looks the key
  // up, falls back to Bahasa Indonesia and then to the English source,
  // never to an empty string.
  function tx(lang, key, english) {
    if (lang === 'en') return english;
    var d = STRINGS[lang];
    var s = d ? d[key] : undefined;
    if (s === undefined) s = STRINGS.id[key];
    return s === undefined ? english : s;
  }

  // Same buckets as trail-data.formatAgo, in the chosen language.
  function ago(lang, ms) {
    if (typeof ms !== 'number' || !isFinite(ms) || ms < 0) ms = 0;
    var min = Math.floor(ms / 60000);
    if (min < 1) return t(lang, 'ago.now');
    if (min < 60) return t(lang, 'ago.min', { n: min });
    var h = Math.floor(min / 60);
    if (h < 24) return t(lang, 'ago.hour', { n: h });
    return t(lang, 'ago.day');
  }

  function groupDigits(intStr, sep) {
    var s = intStr;
    var out = '';
    while (s.length > 3) {
      out = sep + s.slice(-3) + out;
      s = s.slice(0, -3);
    }
    return s + out;
  }

  function fmtNum(lang, n) {
    var s = String(n);
    var neg = s.charAt(0) === '-';
    if (neg) s = s.slice(1);
    var intPart = s, frac = '';
    var dot = s.indexOf('.');
    if (dot >= 0) { intPart = s.slice(0, dot); frac = s.slice(dot + 1); }
    var comma = !!COMMA_DECIMAL[normalizeLang(lang)];
    var out = groupDigits(intPart, comma ? '.' : ',');
    if (frac) out += (comma ? ',' : '.') + frac;
    return (neg ? '-' : '') + out;
  }

  function fmtKm(lang, km) {
    if (km % 1 === 0) return String(km);
    var s = km.toFixed(1);
    return COMMA_DECIMAL[normalizeLang(lang)] ? s.replace('.', ',') : s;
  }

  function months(lang) {
    if (lang === 'en') return EN_MONTHS;
    if (lang === 'ms') return MS_MONTHS;
    return ID_MONTHS;
  }

  // A weekday's name, 0 = Sunday as Date.getDay() counts.
  function weekday(lang, day) { return t(lang, 'weekday.' + day); }

  // "15 Oct 2026" / "15 Okt 2026" for a data date. Read in UTC: the guide's
  // dates are whole days, so the phone's zone never moves them.
  function fmtDate(lang, iso) {
    var d = new Date(iso);
    if (!iso || !isFinite(d.getTime())) return '';
    return d.getUTCDate() + ' ' + months(lang)[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
  }

  return {
    LANGS: LANGS,
    DEFAULT_LANG: DEFAULT_LANG,
    LANG_NAMES: LANG_NAMES,
    STRINGS: STRINGS,
    normalizeLang: normalizeLang,
    t: t,
    tn: tn,
    tx: tx,
    ago: ago,
    fmtNum: fmtNum,
    fmtKm: fmtKm,
    months: months,
    weekday: weekday,
    fmtDate: fmtDate,
  };
});