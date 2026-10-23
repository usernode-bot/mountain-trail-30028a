/*
 * Pure rules for the mountain catalog. Filtering, grouping and the Popular
 * strip live here so they can be unit tested; app.js only renders the
 * result. Entries are the flat views made by MT_TRAIL.catalogView(), with a
 * searchText added by the caller for the current language.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MT_CATALOG = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Height bands, in chip order. low < 2,000; mid 2,000 to 2,999; high
  // 3,000 and above. Boundaries are inclusive at the bottom only.
  var HEIGHT_BANDS = ['low', 'mid', 'high'];

  // The kit's colour tone for a route difficulty: green for easy, amber for
  // moderate, red for hard. An unknown or missing rating has no badge.
  var DIFFICULTY_TONES = { easy: 'accent', moderate: 'warn', hard: 'danger' };
  function difficultyTone(d) {
    return DIFFICULTY_TONES[d] || null;
  }

  function heightBand(m) {
    if (!Number.isFinite(m)) return null;
    if (m < 2000) return 'low';
    if (m < 3000) return 'mid';
    return 'high';
  }

  function matchesQuery(entry, q) {
    if (!q) return true;
    var text = entry.searchText || ((entry.name || '') + ' ' + (entry.province || ''));
    return String(text).toLowerCase().indexOf(q) >= 0;
  }

  function matchesHeight(entry, band) {
    if (band === 'all') return true;
    return heightBand(entry.summitM) === band;
  }

  // opts: { q, difficulty, height, island, status, savedOnly, savedIds }.
  // Every filter is optional; 'all' or a missing value means no constraint.
  function filterEntries(entries, opts) {
    var o = opts || {};
    var q = String(o.q || '').trim().toLowerCase();
    var saved = o.savedIds || [];
    return (entries || []).filter(function (e) {
      if (!matchesQuery(e, q)) return false;
      if (o.difficulty && o.difficulty !== 'all' && e.difficulty !== o.difficulty) return false;
      if (o.height && o.height !== 'all' && !matchesHeight(e, o.height)) return false;
      if (o.island && o.island !== 'all' && e.island !== o.island) return false;
      var level = e.status && e.status.level;
      if (o.status && o.status !== 'all' && level !== o.status) return false;
      if (o.savedOnly && saved.indexOf(e.id) < 0) return false;
      return true;
    });
  }

  // Ordered island groups; an island with no entries is left out.
  function groupByIsland(entries, islands) {
    var out = [];
    (islands || []).forEach(function (island) {
      var list = (entries || []).filter(function (e) { return e.island === island; });
      if (list.length) out.push({ island: island, entries: list });
    });
    return out;
  }

  // Popular entries in the order the app names them; unknown ids skipped.
  function popularEntries(entries, popular) {
    var byId = {};
    (entries || []).forEach(function (e) { byId[e.id] = e; });
    return (popular || []).map(function (id) { return byId[id]; }).filter(Boolean);
  }

  // The drawn picture on a mountain card: one silhouette whose height
  // follows the summit and whose shape follows the landscape (two shoulders
  // and a peak for a mountain, a rounded hump for a hill, a dip for a
  // valley), placed by a hash of the id so neighbouring cards differ. The
  // viewBox is 160 x 90; returns the back ridge and the front shape.
  var SCENE_W = 160;
  var SCENE_H = 90;
  var SCENE_TOP_M = 5000;

  function hashId(id) {
    var h = 0;
    var s = String(id || '');
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  }

  function scenePaths(entry) {
    var e = entry || {};
    var h = hashId(e.id);
    var m = Number.isFinite(e.summitM) ? Math.max(0, Math.min(e.summitM, SCENE_TOP_M)) : 2000;
    // The peak rises from 26 to 76 units above the foot with height.
    var peakY = Math.round(SCENE_H - (26 + 50 * m / SCENE_TOP_M));
    var peakX = 56 + (h % 49); // 56..104
    var backX = (h >> 3) % 2 ? peakX - 38 : peakX + 38;
    var backY = Math.min(SCENE_H - 18, peakY + 16);
    var back = 'M0 ' + (SCENE_H - 22) + ' L' + (backX - 34) + ' ' + (backY + 14) +
      ' L' + backX + ' ' + backY + ' L' + (backX + 36) + ' ' + (backY + 16) +
      ' L' + SCENE_W + ' ' + (SCENE_H - 26) + ' L' + SCENE_W + ' ' + SCENE_H + ' L0 ' + SCENE_H + ' Z';
    var front;
    if (e.category === 'bukit') {
      front = 'M0 ' + SCENE_H + ' L0 ' + (SCENE_H - 10) +
        ' C' + (peakX - 40) + ' ' + peakY + ' ' + (peakX + 40) + ' ' + peakY + ' ' + SCENE_W + ' ' + (SCENE_H - 12) +
        ' L' + SCENE_W + ' ' + SCENE_H + ' Z';
    } else if (e.category === 'lembah') {
      front = 'M0 ' + SCENE_H + ' L0 ' + peakY + ' C' + (peakX - 30) + ' ' + (peakY + 4) + ' ' + (peakX - 20) + ' ' + (SCENE_H - 8) +
        ' ' + peakX + ' ' + (SCENE_H - 8) + ' C' + (peakX + 20) + ' ' + (SCENE_H - 8) + ' ' + (peakX + 30) + ' ' + (peakY + 4) +
        ' ' + SCENE_W + ' ' + peakY + ' L' + SCENE_W + ' ' + SCENE_H + ' Z';
    } else {
      var shoulder = Math.round(peakY + (SCENE_H - peakY) * 0.45);
      front = 'M0 ' + SCENE_H + ' L0 ' + (SCENE_H - 8) + ' L' + (peakX - 30) + ' ' + shoulder +
        ' L' + (peakX - 18) + ' ' + (shoulder + 5) + ' L' + peakX + ' ' + peakY +
        ' L' + (peakX + 22) + ' ' + (shoulder - 2) + ' L' + (peakX + 32) + ' ' + (shoulder + 6) +
        ' L' + SCENE_W + ' ' + (SCENE_H - 12) + ' L' + SCENE_W + ' ' + SCENE_H + ' Z';
    }
    return { back: back, front: front, peakX: peakX, peakY: peakY };
  }

  return {
    SCENE_W: SCENE_W,
    SCENE_H: SCENE_H,
    scenePaths: scenePaths,
    HEIGHT_BANDS: HEIGHT_BANDS,
    difficultyTone: difficultyTone,
    heightBand: heightBand,
    filterEntries: filterEntries,
    groupByIsland: groupByIsland,
    popularEntries: popularEntries,
  };
});
