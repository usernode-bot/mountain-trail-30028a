/*
 * Mountain Trail's colour mode. The app follows Homeroom's own light or dark
 * setting, with the device's preference as the fallback outside Homeroom,
 * until the hiker picks Light, Dark or Auto in the mountain banner. The pick
 * lives on this phone under mt:theme and is never sent anywhere.
 *
 * Pure helpers so the cycle and the resolution can be unit tested;
 * index.html applies the answer to <html> and app.js labels the button.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MT_THEME = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var KEY = 'mt:theme';
  var PREFS = ['auto', 'light', 'dark'];

  // Any value that is not one of the three modes is Auto, never a crash.
  function normalize(pref) {
    return PREFS.indexOf(pref) >= 0 ? pref : 'auto';
  }

  // A tap always moves on: Auto, then Light, then Dark, then Auto again.
  // Auto is the mode that follows Homeroom, so it stays first.
  function next(pref) {
    return PREFS[(PREFS.indexOf(normalize(pref)) + 1) % PREFS.length];
  }

  // The look on screen. A pick wins; on Auto, Homeroom's own setting wins
  // over the device, and with neither the device decides.
  function resolve(pref, platformTheme, osDark) {
    var p = normalize(pref);
    if (p !== 'auto') return p;
    if (platformTheme === 'light' || platformTheme === 'dark') return platformTheme;
    return osDark ? 'dark' : 'light';
  }

  function preference() {
    try { return normalize(localStorage.getItem(KEY)); } catch (e) { return 'auto'; }
  }

  // Stored as the pick itself; Auto is stored by removing the key, so a
  // later change to the Homeroom setting reaches the app again.
  function save(pref) {
    var p = normalize(pref);
    try {
      if (p === 'auto') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, p);
    } catch (e) {}
    return p;
  }

  return {
    KEY: KEY,
    PREFS: PREFS,
    normalize: normalize,
    next: next,
    resolve: resolve,
    preference: preference,
    save: save,
  };
});
