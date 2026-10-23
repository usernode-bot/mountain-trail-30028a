/*
 * Pure helpers for the curated mountain state. Unit tested in
 * test/status.test.js. No DOM, no storage: app.js wires them up.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MT_STATUS = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DAY_MS = 24 * 60 * 60 * 1000;

  // Which accent a status level takes: green when open, amber when limited,
  // red when closed. Same colours as the condition tones.
  function statusTone(level) {
    if (level === 'closed') return 'danger';
    if (level === 'limited') return 'warn';
    return 'accent';
  }

  function isStatusLevel(level) {
    return level === 'open' || level === 'limited' || level === 'closed';
  }

  // The threshold a forecast day has to cross before it becomes a warning,
  // shown on the day itself and alerted for the climb window.
  var WIND_KMH = 40;
  var RAIN_PCT = 70;

  // ISO date string (UTC day) for a Date, and back. Day-only comparisons so
  // a climb dated any hour that day counts as that day.
  function dayKey(d) {
    return d.toISOString().slice(0, 10);
  }

  function parseDayKey(key) {
    return new Date(key + 'T00:00:00Z');
  }

  function dayWarning(day) {
    return (day.windKmh >= WIND_KMH) || (day.rainPct >= RAIN_PCT);
  }

  function warningReasons(day) {
    var reasons = [];
    if (day.windKmh >= WIND_KMH) reasons.push('wind');
    if (day.rainPct >= RAIN_PCT) reasons.push('rain');
    return reasons;
  }

  /*
   * Which forecast days carry a warning, for the day list and for the
   * climb window. weather.days is the curated 3-day array with date: null;
   * day i means "now's day + i" so old static data never reads stale.
   *
   * climbDate: the hiker's chosen climb day ('YYYY-MM-DD' or a Date) or
   * null; daysOnMountain: nights on the mountain, at least 1. When a climb
   * date is set, the climb window is [climbDate, climbDate + days - 1] and
   * only days inside it are returned; without one, every warned day counts
   * (the forecast card still shows all three).
   */
  function weatherWarnings(weather, climbDate, now, daysOnMountain) {
    if (!weather || !Array.isArray(weather.days) || !now) return [];
    var startKey = null;
    var endKey = null;
    var climb = climbDate instanceof Date ? climbDate : (climbDate ? parseDayKey(String(climbDate)) : null);
    if (climb && !isNaN(climb.getTime())) {
      var nights = Math.max(1, Math.floor(Number(daysOnMountain) || 1));
      startKey = dayKey(climb);
      endKey = dayKey(new Date(climb.getTime() + (nights - 1) * DAY_MS));
    }
    var out = [];
    weather.days.forEach(function (day, i) {
      if (!day || !dayWarning(day)) return;
      var dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) + i * DAY_MS);
      var key = dayKey(dayStart);
      if (startKey && (key < startKey || key > endKey)) return;
      out.push({ index: i, dayKey: key, reasons: warningReasons(day), windKmh: day.windKmh, rainPct: day.rainPct });
    });
    return out;
  }

  // The files the service worker precaches, in the same order. sw.js keeps
  // its own PRECACHE array (it cannot import this module); the two lists
  // are asserted equal in test/status.test.js.
  var SHELL_FILES = [
    '/',
    '/tailwind.css',
    '/i18n.js',
    '/app.js',
    '/trail-data.js',
    '/packing.js',
    '/status.js',
    '/share-links.js',
    '/catalog.js',
  ];

  // The photo URLs an offline save should fetch: http(s) only, each once.
  // A data: photo is already inside the report, so it needs no download.
  function packPhotoUrls(reports) {
    var seen = {};
    var out = [];
    (reports || []).forEach(function (r) {
      var url = r && r.photoUrl;
      if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return;
      if (seen[url]) return;
      seen[url] = true;
      out.push(url);
    });
    return out;
  }

  // A report is visible for 24 hours from its creation, and every
  // confirmation pushes that 24-hour window out again.
  function reportExpiresAt(createdAt, lastConfirmedAt) {
    var created = createdAt instanceof Date ? createdAt : new Date(createdAt);
    var latest = created;
    var confirmed = lastConfirmedAt instanceof Date ? lastConfirmedAt : (lastConfirmedAt ? new Date(lastConfirmedAt) : null);
    if (confirmed && !isNaN(confirmed.getTime()) && confirmed.getTime() > latest.getTime()) latest = confirmed;
    return new Date(latest.getTime() + DAY_MS);
  }

  return {
    statusTone: statusTone,
    isStatusLevel: isStatusLevel,
    weatherWarnings: weatherWarnings,
    reportExpiresAt: reportExpiresAt,
    SHELL_FILES: SHELL_FILES,
    packPhotoUrls: packPhotoUrls,
    WIND_KMH: WIND_KMH,
    RAIN_PCT: RAIN_PCT,
  };
});