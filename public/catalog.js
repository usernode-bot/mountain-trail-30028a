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

  // opts: { q, difficulty, height, status, savedOnly, savedIds }. Every
  // filter is optional; 'all' or a missing value means no constraint.
  function filterEntries(entries, opts) {
    var o = opts || {};
    var q = String(o.q || '').trim().toLowerCase();
    var saved = o.savedIds || [];
    return (entries || []).filter(function (e) {
      if (!matchesQuery(e, q)) return false;
      if (o.difficulty && o.difficulty !== 'all' && e.difficulty !== o.difficulty) return false;
      if (o.height && o.height !== 'all' && !matchesHeight(e, o.height)) return false;
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

  return {
    HEIGHT_BANDS: HEIGHT_BANDS,
    heightBand: heightBand,
    filterEntries: filterEntries,
    groupByIsland: groupByIsland,
    popularEntries: popularEntries,
  };
});
