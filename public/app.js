/*
 * Mountain Trail's whole UI. Hash routing for the tabs; the mountain
 * catalog comes from mountain-catalog.js (the guide and packing rules from
 * trail-data.js and packing.js); reports go through the server; the
 * checklist, last location, name and contact live only in localStorage.
 * A location taken with an account is also sent to the server (queued
 * offline, replayed on reconnect) but is shown to nobody. Every class name
 * is written as a whole literal so the precompiled Tailwind build can see
 * it.
 */
(function () {
  'use strict';

  var M = window.MT_TRAIL;
  var C = window.MT_CATALOG;
  var P = window.MT_PACKING;
  var S = window.MT_SHARE;
  var I18N = window.MT_I18N;
  var ST = window.MT_STATUS;
  var MOUNTAIN = M.MOUNTAIN;
  var STOPS = M.STOPS;
  var STOP_BY_ID = M.STOP_BY_ID;
  var MIN_FROM_BASECAMP = M.MIN_FROM_BASECAMP;
  var COND_BY_ID = M.COND_BY_ID;

  // ── Small helpers ──────────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtM(n) { return I18N.fmtNum(LANG, n); }
  function fmtKm(km) { return I18N.fmtKm(LANG, km); }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'r-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }
  function nowDate() {
    try {
      if (window.usernode && typeof window.usernode.now === 'function') return window.usernode.now();
    } catch (e) {}
    return new Date();
  }
  function nowISO() { return nowDate().toISOString(); }

  // ── Icons: one drawn line set, one stroke width ────────────────────────
  var ICON = {
    basecamp: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
    post: '<path d="M12 3v18"/><path d="M5 6h11l3 2.5-3 2.5H5z"/><path d="M9 21h6"/>',
    tent: '<path d="M2 20h20"/><path d="M4 20L12 5l8 15"/><path d="M12 12l-3 8"/><path d="M12 12l3 8"/>',
    summit: '<path d="M3 20l6-10 4 6 2-3 6 7z"/><path d="M9 10V4l4 1.5L9 7"/>',
    drop: '<path d="M12 3c3.5 4.5 6 7.6 6 10.5a6 6 0 0 1-12 0C6 10.6 8.5 7.5 12 3z"/>',
    slippery: '<path d="M3 14c2 0 2-2 4.5-2S10 14 12 14s2.5-2 4.5-2 2.5 2 4.5 2"/><path d="M3 19c2 0 2-2 4.5-2S10 19 12 19s2.5-2 4.5-2 2.5 2 4.5 2"/><path d="M9 4l3 4 3-4"/>',
    landslide: '<path d="M3 20h18"/><path d="M3 20L10 6l4 7"/><circle cx="16" cy="15" r="1.6"/><circle cx="19" cy="18" r="1.2"/><circle cx="13.5" cy="17.5" r="1.2"/>',
    'no-water': '<path d="M12 3c3.5 4.5 6 7.6 6 10.5a6 6 0 0 1-12 0C6 10.6 8.5 7.5 12 3z"/><path d="M4 4l16 16"/>',
    'heavy-fog': '<path d="M8 5h9"/><path d="M4 9h16"/><path d="M3 13h14"/><path d="M6 17h15"/><path d="M9 21h8"/>',
    wildlife: '<path d="M5 9c0-3 2.5-5 7-5s7 2 7 5-3 5-7 5-7-2-7-5z"/><path d="M12 14v3"/><path d="M8 18c1.5-1 6.5-1 8 0"/><circle cx="9" cy="8.5" r="0.75" fill="currentColor" stroke="none"/><circle cx="15" cy="8.5" r="0.75" fill="currentColor" stroke="none"/>',
    'extreme-weather': '<path d="M5 7c2 0 2-1.5 4-1.5S11 7 13 7s2-1.5 4-1.5 2 1.5 4 1.5"/><path d="M5 12c2 0 2-1.5 4-1.5S11 12 13 12s2-1.5 4-1.5 2 1.5 4 1.5"/><path d="M5 17c2 0 2-1.5 4-1.5S11 17 13 17s2-1.5 4-1.5 2 1.5 4 1.5"/>',
    'fallen-tree': '<path d="M4 21L20 5"/><path d="M20 5l-1.5-3"/><path d="M20 5l3 1.5"/><path d="M9 16l2 2"/><path d="M13 12l2 2"/><path d="M17 8l2 2"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    chevron: '<path d="M6 9l6 6 6-6"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    note: '<path d="M5 4h14v12l-4 4H5z"/><path d="M15 20v-4h4"/><path d="M9 9h6"/><path d="M9 13h4"/>',
    dots: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    photo: '<path d="M3 19l6-9 4 6 2-3 6 6z"/><circle cx="17" cy="7" r="2"/>',
    warning: '<path d="M3 20h18"/><path d="M3 20L10 6l4 7"/><circle cx="16" cy="15" r="1.6"/><circle cx="19" cy="18" r="1.2"/><circle cx="13.5" cy="17.5" r="1.2"/>',
    pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
    gunung: '<path d="M2 20l7-12 4 6 3-4 6 10z"/>',
    bukit: '<path d="M2 19c3-7 7-9 10-9s7 2 10 9z"/>',
    lembah: '<path d="M2 5c2 8 5 11 10 11s8-3 10-11"/><path d="M7 20c2-1 3 1 5 0s3 1 5 0"/>',
    junction: '<path d="M12 21v-8"/><path d="M12 13L6 3"/><path d="M12 13l6-10"/>',
  };
  function iconSvg(name, cls) {
    return '<svg class="' + cls + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[name] + '</svg>';
  }
  var KIND_ICON = { summit: 'summit', camp: 'tent', basecamp: 'basecamp', post: 'post', water: 'drop', junction: 'junction' };
  function stopIcon(stop) {
    var order = ['summit', 'camp', 'basecamp', 'post', 'water'];
    for (var i = 0; i < order.length; i++) {
      if (stop.kinds.indexOf(order[i]) >= 0) return KIND_ICON[order[i]];
    }
    return 'post';
  }

  // ── Token, demo mode and storage ───────────────────────────────────────
  // The language is read straight from mt:lang (never through lsGet: the
  // first render happens before /api/me says whether this is the demo, and
  // the language is the same setting in the demo and outside it).
  var LANG = 'en';
  try { LANG = I18N.normalizeLang(localStorage.getItem('mt:lang')); } catch (e) {}
  function t(key, vars) { return I18N.t(LANG, key, vars); }
  function tn(key, n, vars) { return I18N.tn(LANG, key, n, vars); }
  function tx(key, english) { return I18N.tx(LANG, key, english); }
  function fmtNum(n) { return I18N.fmtNum(LANG, n); }
  function fmtAgo(ms) { return I18N.ago(LANG, ms); }
  function condLabel(id) { return COND_BY_ID[id] ? tx('cond.' + id + '.label', COND_BY_ID[id].label) : id; }
  function levelLabel(level) { return t('banner.' + level); }
  var TOKEN = '';
  var PAGE_DEMO = /[?&]demo=1/.test(location.search);
  try { TOKEN = new URLSearchParams(location.search).get('token') || ''; } catch (e) {}
  var demo = false; // switched on when /api/me says so
  var ME = { user: null, guest: false, demo: false, admin: false };

  function lsGet(k, d) {
    try {
      var v = localStorage.getItem((demo ? 'mt:demo:' : 'mt:') + k);
      return v === null ? d : JSON.parse(v);
    } catch (e) { return d; }
  }
  function lsSet(k, v) {
    try { localStorage.setItem((demo ? 'mt:demo:' : 'mt:') + k, JSON.stringify(v)); } catch (e) {}
  }

  async function api(path, opts) {
    opts = opts || {};
    // demo=1 rides on every call while the page has it, so /api/me can say
    // demo:true the moment it answers (demo mode is only known then).
    var url = path + (path.indexOf('?') >= 0 ? '&' : '?') + (PAGE_DEMO ? 'demo=1' : '');
    var headers = {};
    if (TOKEN) headers['x-usernode-token'] = TOKEN;
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    var res = await fetch(url, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    var data = null;
    try { data = await res.json(); } catch (e) {}
    return { ok: res.ok, status: res.status, data: data };
  }

  // ── Reports state ──────────────────────────────────────────────────────
  var reports = [];        // from the server (or the cache), newest first
  var pending = [];        // this device's unsent reports
  var loading = true;
  var failed = false;
  var usingCache = null;   // { at, now, reports } when offline
  var swReady = false;
  // A page loaded by an already-registered service worker (every visit after
  // the first) knows the shell is cached at once, so the "Guide saved for
  // offline use" line is up from the first frame and the header holds still
  // while reports load.
  if (navigator.serviceWorker && navigator.serviceWorker.controller) swReady = true;
  var expandedStop = null;
  // The Trail tab's stop-type filter: 'all' or a STOP_TYPES id. Not kept
  // between visits, so no stop is ever hidden by surprise.
  var typeFilter = 'all';
  var lastAction = null;   // the entry behind the sent note

  function visibleReports() {
    var list = reports.slice();
    if (demo) {
      var ov = lsGet('overrides', {});
      list = list.filter(function (r) {
        var o = ov[r.id];
        return !(o && (o.removed || o.flagged));
      }).map(function (r) {
        var o = ov[r.id];
        if (!o) return r;
        var copy = Object.assign({}, r);
        if ('note' in o) copy.note = o.note;
        if ('photoUrl' in o) copy.photoUrl = o.photoUrl;
        if (o.confirmed && !r.confirmedByMe) {
          copy.confirmedByMe = true;
          copy.confirms = (r.confirms || 0) + 1;
        }
        return copy;
      });
    }
    var n = nowDate().getTime();
    list = list.filter(function (r) {
      var c = new Date(r.createdAt).getTime();
      if (!isFinite(c) || c > n + 60000) return false;
      // A report shows for 24 hours from its creation, and every
      // "still valid" confirmation pushes that window out again.
      var exp = r.expiresAt ? new Date(r.expiresAt).getTime() : c + 86400000;
      return isFinite(exp) ? n < exp : n - c < 86400000;
    });
    pending.forEach(function (p) { list.push(p); });
    list.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    return list;
  }

  function latestForStop(stopId) {
    var list = visibleReports().filter(function (r) { return r.stopId === stopId; });
    return list;
  }

  // ── Kit shims (the bridge or native kit may be missing on a plain run) ──
  function kitToast(msg) {
    try {
      if (window.unNative && typeof unNative.toast === 'function') { unNative.toast(msg); return; }
    } catch (e) {}
    var t = document.createElement('div');
    t.className = 'toast-fallback';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2600);
  }
  // Presents content in a bottom sheet, or a plain overlay when the kit is
  // missing. Returns { dismiss } either way, so the caller can close the
  // sheet itself and learn when it is gone.
  function presentSheet(contentEl) {
    var onDismiss = null;
    function fireDismiss() {
      if (onDismiss) { var f = onDismiss; onDismiss = null; f(); }
    }
    try {
      if (window.unNative && typeof unNative.presentSheet === 'function') {
        var handle = unNative.presentSheet({ contentEl: contentEl, onDismiss: fireDismiss });
        var kitDismiss = handle && typeof handle.dismiss === 'function'
          ? function () { try { handle.dismiss(); } catch (e) {} }
          : function () { try { if (unNative.dismissTop) unNative.dismissTop(); } catch (e) {} };
        return { dismiss: function () { kitDismiss(); fireDismiss(); } };
      }
    } catch (e) {}
    var backdrop = document.createElement('div');
    backdrop.className = 'overlay-fallback';
    var card = document.createElement('div');
    card.className = 'overlay-card';
    card.appendChild(contentEl);
    backdrop.appendChild(card);
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) { backdrop.remove(); fireDismiss(); }
    });
    return {
      dismiss: function () {
        backdrop.remove();
        fireDismiss();
      },
    };
  }
  function presentModal(contentEl) {
    try {
      if (window.unNative && typeof unNative.presentModal === 'function') {
        unNative.presentModal({ contentEl: contentEl, dismissible: true });
        return;
      }
    } catch (e) {}
    var backdrop = document.createElement('div');
    backdrop.className = 'overlay-fallback';
    var card = document.createElement('div');
    card.className = 'overlay-card';
    card.appendChild(contentEl);
    backdrop.appendChild(card);
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) backdrop.remove();
    });
  }
  // A row menu: the kit's menu() when present, else a small sheet.
  function rowMenu(anchorEl, title, items) {
    try {
      if (window.unNative && typeof unNative.menu === 'function') {
        return unNative.menu({ anchorEl: anchorEl, title: title, items: items });
      }
    } catch (e) {}
    var wrap = document.createElement('div');
    var list = document.createElement('ul');
    list.className = 'list';
    items.forEach(function (it) {
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'list-row w-full text-left text-body' + (it.destructive ? ' text-danger' : '');
      b.textContent = it.label;
      b.addEventListener('click', function () { wrap.remove(); if (it.handler) it.handler(); });
      li.appendChild(b);
      list.appendChild(li);
    });
    wrap.appendChild(list);
    presentSheet(wrap);
    return Promise.resolve(null);
  }
  function askForAccount(action) {
    try {
      if (window.usernode && typeof window.usernode.askForAccount === 'function') {
        window.usernode.askForAccount({ action: action || t('account.report') });
        return;
      }
    } catch (e) {}
    kitToast(t('toast.account'));
  }

  // ── Language ───────────────────────────────────────────────────────────
  // Every static string in index.html carries its English text and a key;
  // this walks them and applies the chosen language. English stays in the
  // markup, so a missing script still reads.
  function applyStaticText() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-label]'), function (el) {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-label')));
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-placeholder]'), function (el) {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    document.documentElement.lang = LANG;
  }
  var LANG_TEXT = { en: 'English', id: 'Bahasa Indonesia' };
  function renderLangButtons() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-lang]'), function (btn) {
      var on = btn.getAttribute('data-lang') === LANG;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.innerHTML = on ? iconSvg('check', 'h-4 w-4') + esc(LANG_TEXT[btn.getAttribute('data-lang')]) : esc(LANG_TEXT[btn.getAttribute('data-lang')]);
    });
  }
  function setLang(v) {
    LANG = I18N.normalizeLang(v);
    try { localStorage.setItem('mt:lang', LANG); } catch (e) {}
    rerenderAll();
  }
  function wireLang() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-lang]'), function (btn) {
      btn.addEventListener('click', function () { setLang(btn.getAttribute('data-lang')); });
    });
  }
  // The whole app switches at once, no reload. A sheet already open keeps
  // the language it opened with; everything re-rendered uses the new one.
  function rerenderAll() {
    applyStaticText();
    renderLangButtons();
    renderHeader();
    renderReportsAndTrail();
    renderPermits();
    renderWeather();
    renderNotifs();
    renderMountainsRoute();
    if (picker) { buildPicker(); renderPickerHint(); }
    if (packing) renderPacking();
    renderLocation();
    renderShareQueue();
    if (lastAction) showSentNote(lastAction);
    var status = $('loc-status');
    if (status) status.textContent = '';
  }

  // ── Tabs ───────────────────────────────────────────────────────────────
  var TABS = ['mountains', 'trail', 'report', 'packing', 'location'];
  function switchTab(name) {
    if (TABS.indexOf(name) < 0) name = 'mountains';
    // Inside the Mountains tab the hash may name a guide page instead.
    if (name === 'mountains') {
      var mm = /^mountains\/([a-z0-9-]+)/.exec((location.hash || '').replace('#', ''));
      currentMountain = mm && C.MOUNTAIN_BY_ID[mm[1]] ? mm[1] : null;
    }
    TABS.forEach(function (t) {
      $('tab-' + t).hidden = t !== name;
      var btn = $('tabbtn-' + t);
      btn.classList.toggle('tab-item-on', t === name);
      btn.setAttribute('aria-selected', t === name ? 'true' : 'false');
    });
    var wantHash = name === 'mountains' && currentMountain ? '#mountains/' + currentMountain : '#' + name;
    if (location.hash !== wantHash) {
      try { history.replaceState(null, '', wantHash); } catch (e) {}
    }
    lsSet('tab', name);
  }
  function tabFromHash() {
    var h = (location.hash || '').replace('#', '');
    if (h.indexOf('mountains') === 0) return 'mountains';
    return TABS.indexOf(h) >= 0 ? h : null;
  }
  window.addEventListener('hashchange', function () {
    var t = tabFromHash();
    if (t) switchTab(t);
  });

  // ── Mountains tab: the catalog of Indonesia's mountains ────────────────
  // The catalog ships with the app (mountain-catalog.js), so the list and
  // every guide page render with no signal. Approved corrections come from
  // the server as a flat overlay, cached under mt:catalogOverrides and
  // merged over the shipped values at render; nothing here can change a
  // mountain until an admin approves it.
  var overrides = {};      // mountainId -> { field: value }, approved only
  var pendingEdits = [];   // the admin's review queue
  var currentMountain = null; // the guide page open inside the tab
  var EDIT_TOPICS = [
    { field: 'elevM', label: 'Elevation' },
    { field: 'difficulty', label: 'Difficulty' },
    { field: 'duration', label: 'Duration' },
    { field: 'status', label: 'Status (open or closed)' },
    { field: 'permit', label: 'Permit and registration' },
    { field: 'basecamp', label: 'Basecamp' },
    { field: 'note', label: 'Something else' },
  ];

  var DIFF_LABEL = {}, DUR_LABEL = {}, DUR_LABEL_SHORT = {}, STATUS_LABEL = {}, ISLAND_NAME = {};
  C.DIFFICULTIES.forEach(function (d) { DIFF_LABEL[d.id] = d.label; });
  C.DURATIONS.forEach(function (d) {
    DUR_LABEL[d.id] = d.label + ' (' + d.local + ')';
    DUR_LABEL_SHORT[d.id] = d.label;
  });
  C.STATUSES.forEach(function (s) { STATUS_LABEL[s.id] = s.label; });
  C.ISLANDS.forEach(function (i) { ISLAND_NAME[i.id] = i.name; });

  // A mountain as the catalog shows it: shipped values with the approved
  // overlay merged on top.
  function effMountain(id) {
    var m = C.MOUNTAIN_BY_ID[id];
    if (!m) return null;
    var ov = overrides[id];
    if (!ov) return m;
    var out = {};
    Object.keys(m).forEach(function (k) { out[k] = m[k]; });
    var e = parseInt(ov.elevM, 10);
    if (isFinite(e) && e > 999 && e < 5001) out.elevM = e;
    if (DIFF_LABEL[ov.difficulty]) out.difficulty = ov.difficulty;
    if (DUR_LABEL_SHORT[ov.duration]) out.duration = ov.duration;
    if (STATUS_LABEL[ov.status]) out.status = ov.status;
    if (typeof ov.permit === 'string' && ov.permit) out.permit = ov.permit;
    if (typeof ov.basecamp === 'string' && ov.basecamp) out.basecamp = ov.basecamp;
    out.climberNote = typeof ov.note === 'string' && ov.note ? ov.note : '';
    return out;
  }

  // Grouped by island, and by province then height within an island.
  function sortedMountains() {
    return C.MOUNTAINS.slice().sort(function (a, b) {
      var A = effMountain(a.id), B = effMountain(b.id);
      if (A.province !== B.province) return A.province < B.province ? -1 : 1;
      return B.elevM - A.elevM;
    });
  }

  function catalogFiltersAll() {
    var f = lsGet('catalogFilters', null);
    if (!f || typeof f !== 'object') f = {};
    return {
      island: f.island || '',
      province: f.province || '',
      difficulty: f.difficulty || '',
      duration: f.duration || '',
      status: f.status || '',
      search: f.search || '',
    };
  }
  function catalogFiltersSave(f) { lsSet('catalogFilters', f); }

  function filteredMountains() {
    var f = catalogFiltersAll();
    var q = (f.search || '').trim().toLowerCase();
    return sortedMountains().filter(function (m) {
      var e = effMountain(m.id);
      if (f.island && e.island !== f.island) return false;
      if (f.province && e.province !== f.province) return false;
      if (f.difficulty && e.difficulty !== f.difficulty) return false;
      if (f.duration && e.duration !== f.duration) return false;
      if (f.status && e.status !== f.status) return false;
      if (q && (e.name + ' ' + e.province + ' ' + (ISLAND_NAME[e.island] || '')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }

  function setFilter(key, value) {
    var f = catalogFiltersAll();
    f[key] = value;
    if (key === 'island') f.province = ''; // a province lives on one island
    catalogFiltersSave(f);
    renderCatalogAll();
  }

  function menuItemsFor(key) {
    var items = [{ label: 'All', value: '' }];
    var f = catalogFiltersAll();
    if (key === 'island') {
      C.ISLANDS.forEach(function (i) { items.push({ label: i.name, value: i.id }); });
    } else if (key === 'province') {
      var provs = [];
      sortedMountains().forEach(function (m) {
        if ((!f.island || m.island === f.island) && provs.indexOf(m.province) < 0) provs.push(m.province);
      });
      provs.sort().forEach(function (p) { items.push({ label: p, value: p }); });
    } else if (key === 'difficulty') {
      C.DIFFICULTIES.forEach(function (d) { items.push({ label: d.label, value: d.id }); });
    } else if (key === 'duration') {
      C.DURATIONS.forEach(function (d) { items.push({ label: DUR_LABEL[d.id], value: d.id }); });
    } else if (key === 'status') {
      C.STATUSES.forEach(function (s) { items.push({ label: s.label, value: s.id }); });
    }
    return items;
  }

  function chipMenu(key, anchorEl) {
    var items = menuItemsFor(key).map(function (it) {
      return { label: it.label, handler: function () { setFilter(key, it.value); } };
    });
    rowMenu(anchorEl, 'Filter by ' + (key === 'island' ? 'island' : key), items);
  }

  function renderChips() {
    var f = catalogFiltersAll();
    var defs = [
      { key: 'island', label: 'Island' },
      { key: 'province', label: 'Province' },
      { key: 'difficulty', label: 'Difficulty' },
      { key: 'duration', label: 'Duration' },
      { key: 'status', label: 'Status' },
    ];
    $('filter-chips').innerHTML = defs.map(function (d) {
      var val = f[d.key];
      var shown = val ? (DIFF_LABEL[val] || DUR_LABEL_SHORT[val] || STATUS_LABEL[val] || ISLAND_NAME[val] || val) : '';
      return '<button type="button" class="filter-chip' + (shown ? ' filter-chip-on' : '') + '" data-chip="' + d.key + '">' +
        esc(d.label) + ' · ' + esc(shown || 'All') + '</button>';
    }).join('');
    Array.prototype.forEach.call($('filter-chips').querySelectorAll('[data-chip]'), function (btn) {
      btn.addEventListener('click', function () { chipMenu(btn.getAttribute('data-chip'), btn); });
    });
  }

  function mountainRowHtml(m) {
    var e = effMountain(m.id);
    var closed = e.status === 'closed';
    var sub = [e.province, fmtM(e.elevM) + ' m', DIFF_LABEL[e.difficulty]];
    if (e.duration === 'day-hike') sub.push('Day hike');
    return '<li><button type="button" class="list-row w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus" data-mountain="' + e.id + '">' +
      iconSvg('summit', 'h-6 w-6 flex-none text-accent') +
      '<span class="min-w-0 flex-1"><span class="block text-body font-semibold">' + esc(e.name) + '</span>' +
      '<span class="mt-0.5 block text-small text-muted">' + esc(sub.join(' · ')) + '</span></span>' +
      '<span class="badge-' + (closed ? 'closed' : 'open') + ' flex-none">' + (closed ? 'Closed' : 'Open') + '</span>' +
      '</button></li>';
  }

  function renderCatalogList() {
    var el = $('mountain-list');
    var list = filteredMountains();
    $('mountain-count').textContent = list.length === 1 ? '1 mountain' : list.length + ' mountains';
    if (!list.length) {
      el.innerHTML = '<div class="state-empty"><p class="text-body font-medium">No mountains match these filters.</p>' +
        '<p class="text-small text-muted">Clear them to see all ' + C.MOUNTAINS.length + '.</p>' +
        '<button type="button" id="clear-filters" class="btn-secondary mt-1">Clear filters</button></div>';
      var b = $('clear-filters');
      if (b) b.addEventListener('click', function () {
        catalogFiltersSave({ island: '', province: '', difficulty: '', duration: '', status: '', search: '' });
        $('catalog-search').value = '';
        renderCatalogAll();
      });
      return;
    }
    var html = '';
    C.ISLANDS.forEach(function (isle) {
      var rows = list.filter(function (m) { return m.island === isle.id; });
      if (!rows.length) return;
      html += '<h2 class="section-label mt-5">' + esc(isle.name) + '</h2>' +
        '<ul class="list">' + rows.map(mountainRowHtml).join('') + '</ul>';
    });
    el.innerHTML = html;
    Array.prototype.forEach.call(el.querySelectorAll('[data-mountain]'), function (btn) {
      btn.addEventListener('click', function () { openMountain(btn.getAttribute('data-mountain')); });
    });
  }

  // The admin's review queue, above the catalog. Everybody else sees nothing
  // here: the server only answers it for a name in dapp.json's admins list.
  function renderAdminCard() {
    var el = $('admin-card');
    if (!ME.admin || !pendingEdits.length) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    el.innerHTML = '<h2 class="section-label mt-4">Review edits</h2><ul class="list">' +
      pendingEdits.map(function (ed) {
        var m = C.MOUNTAIN_BY_ID[ed.mountainId];
        var topic = EDIT_TOPICS.filter(function (t) { return t.field === ed.field; })[0];
        return '<li class="list-row items-start">' +
          '<div class="min-w-0 flex-1"><p class="text-body font-medium">' + esc(m ? m.name : ed.mountainId) +
          ' · ' + esc(topic ? topic.label : ed.field) + '</p>' +
          '<p class="mt-0.5 break-words text-small">' + esc(ed.value) + '</p>' +
          (ed.note ? '<p class="mt-0.5 break-words text-small text-muted">' + esc(ed.note) + '</p>' : '') +
          '<p class="mt-0.5 text-small text-muted">' + esc(ed.username) + ', waiting for review</p></div>' +
          '<button type="button" class="btn-secondary flex-none" data-decide="approve" data-edit="' + ed.id + '">Approve</button>' +
          '<button type="button" class="btn-secondary flex-none" data-decide="reject" data-edit="' + ed.id + '">Reject</button>' +
          '</li>';
      }).join('') + '</ul>';
    Array.prototype.forEach.call(el.querySelectorAll('[data-decide]'), function (btn) {
      btn.addEventListener('click', function () {
        decideEdit(Number(btn.getAttribute('data-edit')), btn.getAttribute('data-decide'));
      });
    });
  }

  function openMountain(id) {
    try { history.replaceState(null, '', '#mountains/' + id); } catch (e) {}
    currentMountain = id;
    renderMountainsRoute();
    window.scrollTo({ top: 0 });
  }

  function closeMountain() {
    try { history.replaceState(null, '', '#mountains'); } catch (e) {}
    currentMountain = null;
    renderMountainsRoute();
  }

  function routeLine(r) {
    return fmtKm(r.km) + ' km, +' + fmtM(r.climbM) + ' m, ' + r.hoursUp + ' hours up';
  }

  function renderMountainPage(id) {
    var e = effMountain(id);
    var closed = e.status === 'closed';
    var html = '<button type="button" class="back-link" id="mtn-back">‹ Mountains</button>' +
      '<header><h1 class="font-display text-title">' + esc(e.name) + '</h1>' +
      '<p class="mt-1 text-body text-muted">' + esc(e.province) + ', ' + esc(C.islandName(e.island)) + ' · ' + fmtM(e.elevM) + ' m</p></header>' +
      '<p class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5">' +
      '<span class="badge-' + (closed ? 'closed' : 'open') + '">' + (closed ? 'Closed' : 'Open') + '</span>' +
      (e.statusNote ? '<span class="text-small text-muted">' + esc(e.statusNote) + '</span>' : '') +
      '</p>' +
      '<div class="card mt-3">' +
      '<dl><div class="flex justify-between gap-3 py-1.5"><dt class="text-small text-muted">Difficulty</dt><dd class="text-body text-right">' + esc(DIFF_LABEL[e.difficulty]) + '</dd></div>' +
      '<div class="flex justify-between gap-3 py-1.5"><dt class="text-small text-muted">Duration</dt><dd class="text-body text-right">' + esc(DUR_LABEL[e.duration]) + '</dd></div>' +
      '<div class="flex justify-between gap-3 py-1.5"><dt class="text-small text-muted">Basecamp</dt><dd class="text-body text-right">' + esc(e.basecamp) + '</dd></div>' +
      '<div class="flex justify-between gap-3 py-1.5"><dt class="text-small text-muted">Permit</dt><dd class="text-body text-right">' + esc(e.permit) + '</dd></div></dl></div>' +
      '<h2 class="section-label mt-6">Routes</h2><ul class="list">' +
      e.routes.map(function (r) {
        return '<li class="list-row"><div class="min-w-0 flex-1">' +
          '<p class="text-body font-semibold">' + esc(r.name) + '</p>' +
          '<p class="mt-0.5 text-small text-muted">' + esc(routeLine(r)) + (r.note ? '. ' + esc(r.note) : '') + '</p>' +
          '</div></li>';
      }).join('') + '</ul>' +
      (e.climberNote ? '<p class="mt-2 text-small text-muted">Checked by climbers: ' + esc(e.climberNote) + '</p>' : '') +
      '<p class="mt-2 text-small text-muted">Heights, distances and times are approximate guide figures, not a survey.</p>' +
      '<div class="mt-3 flex flex-col gap-2">';
    if (e.guide === 'trail-data') {
      html += '<button type="button" id="mtn-guide-btn" class="btn-primary">Open the trail guide</button>';
    } else {
      html += '<p class="text-small text-muted">The stop-by-stop trail guide for this mountain is not here yet. It arrives mountain by mountain.</p>';
    }
    html += '<button type="button" id="mtn-edit-btn" class="btn-secondary">Suggest an edit</button></div>';
    var wrap = $('mountain-page');
    wrap.innerHTML = html;
    $('mtn-back').addEventListener('click', closeMountain);
    var gb = $('mtn-guide-btn');
    if (gb) gb.addEventListener('click', function () { switchTab('trail'); window.scrollTo({ top: 0 }); });
    $('mtn-edit-btn').addEventListener('click', function () { suggestEdit(id); });
  }

  function renderMountainsRoute() {
    var onPage = !!(currentMountain && C.MOUNTAIN_BY_ID[currentMountain]);
    if (!onPage) currentMountain = null;
    $('catalog-view').hidden = onPage;
    $('mountain-page').hidden = !onPage;
    if (onPage) {
      $('admin-card').hidden = true;
      renderMountainPage(currentMountain);
    } else {
      renderCatalogAll();
    }
  }

  function renderCatalogAll() {
    renderAdminCard();
    renderChips();
    renderCatalogList();
  }

  // A correction: topic, the fix, and where the climber saw it. One tap to
  // send, reviewed before anything shows to anyone else.
  function suggestEdit(id) {
    if (!ME.user) { askForAccount('suggest an edit'); return; }
    var m = C.MOUNTAIN_BY_ID[id];
    var wrap = document.createElement('div');
    wrap.className = 'flex flex-col gap-3 p-4';
    wrap.innerHTML = '<p class="font-display text-heading">Suggest an edit</p>' +
      '<p class="text-small text-muted">For ' + esc(m.name) + '. A reviewer checks every suggestion before it shows to anyone.</p>' +
      '<label for="edit-topic" class="block text-small font-medium">What it is about</label>' +
      '<select id="edit-topic" class="field">' +
      EDIT_TOPICS.map(function (t) { return '<option value="' + t.field + '">' + esc(t.label) + '</option>'; }).join('') +
      '</select>' +
      '<label for="edit-value" class="block text-small font-medium">The correction</label>' +
      '<textarea id="edit-value" class="field" rows="2" maxlength="300" placeholder="e.g. The summit is 3,676 m"></textarea>' +
      '<label for="edit-note" class="block text-small font-medium">Where you saw it, optional</label>' +
      '<input type="text" id="edit-note" class="field" maxlength="300" placeholder="e.g. the park\'s booking page">' +
      '<div class="flex justify-end gap-2">' +
      '<button type="button" class="btn-secondary" data-close>Cancel</button>' +
      '<button type="button" class="btn-primary" data-send>Send for review</button></div>' +
      '<p class="text-small text-muted">Sent with your Homeroom name.</p>';
    document.body.appendChild(wrap);
    var handle = presentSheet(wrap);
    function close() {
      if (handle) handle.dismiss(); else wrap.remove();
    }
    var closeBtn = wrap.querySelector('[data-close]');
    if (closeBtn) closeBtn.addEventListener('click', close);
    wrap.querySelector('[data-send]').addEventListener('click', function () {
      var body = {
        clientId: uuid(),
        mountainId: id,
        field: wrap.querySelector('#edit-topic').value,
        value: wrap.querySelector('#edit-value').value.trim().slice(0, 300),
        note: wrap.querySelector('#edit-note').value.trim().slice(0, 300),
      };
      if (!body.value) { kitToast('Write the correction first.'); return; }
      api('/api/mountains/' + id + '/edits', { method: 'POST', body: body }).then(function (res) {
        if (res && res.ok) {
          close();
          kitToast('Sent for review. A reviewer checks it before it shows.');
          if (ME.admin) loadPendingEdits();
        } else if (res && res.status === 401) {
          askForAccount();
        } else if (res && res.status === 429) {
          kitToast('You have a lot waiting already. Try again later.');
        } else {
          kitToast("Couldn't send it. Try again.");
        }
      });
    });
  }

  async function loadOverrides() {
    var res = null;
    try { res = await api('/api/catalog/overrides'); } catch (e) {}
    if (res && res.ok && res.data && res.data.overrides) {
      overrides = res.data.overrides;
      lsSet('catalogOverrides', { at: nowISO(), overrides: overrides });
    } else {
      var c = lsGet('catalogOverrides', null);
      if (c && c.overrides) overrides = c.overrides;
    }
  }

  async function loadPendingEdits() {
    if (!ME.admin) return;
    var res = null;
    try { res = await api('/api/catalog/edits?status=pending'); } catch (e) {}
    if (res && res.ok && res.data && res.data.edits) pendingEdits = res.data.edits;
  }

  function decideEdit(id, decision) {
    api('/api/catalog/edits/' + id + '/' + decision, { method: 'POST' }).then(function (res) {
      if (res && res.ok) {
        pendingEdits = pendingEdits.filter(function (e) { return e.id !== id; });
        kitToast(decision === 'approve' ? 'Approved. It shows for everyone now.' : 'Rejected.');
        loadOverrides().then(renderMountainsRoute);
      } else {
        kitToast("Couldn't do that. Try again.");
        renderAdminCard();
      }
    });
  }

  function wireCatalogSearch() {
    var input = $('catalog-search');
    input.value = catalogFiltersAll().search || '';
    input.addEventListener('input', function () {
      var f = catalogFiltersAll();
      f.search = input.value;
      catalogFiltersSave(f);
      renderCatalogList();
    });
  }

  // ── Trail tab ──────────────────────────────────────────────────────────
  function renderHeader() {
    $('mtn-route').textContent = t('trail.route', {
      elev: fmtM(MOUNTAIN.summitM),
      km: fmtKm(MOUNTAIN.lengthKm),
      climb: fmtM(MOUNTAIN.climbM),
      hours: t('trail.hours'),
    });
    // The route's difficulty, on its own short line above the category.
    // A route without a known rating shows no line at all.
    var diff = $('mtn-difficulty');
    if (diff) {
      var dIdx = M.DIFFICULTIES.indexOf(MOUNTAIN.difficulty);
      if (dIdx >= 0) {
        var steps = '';
        for (var i = 0; i < 3; i++) steps += '<i' + (i <= dIdx ? ' class="on"' : '') + '></i>';
        diff.hidden = false;
        diff.innerHTML = '<span><span class="diff-meter" aria-hidden="true">' + steps + '</span>' +
          '<span>' + esc(t('trail.difficulty', { level: '' })) +
          '<span class="text-fg font-medium">' + esc(t('diff.' + MOUNTAIN.difficulty)) + '</span></span></span>';
      } else {
        diff.hidden = true;
        diff.innerHTML = '';
      }
    }
    // The category belongs to the mountain, so it shows once, here.
    var cat = $('mtn-category');
    if (cat) cat.innerHTML = '<span>' + iconSvg(MOUNTAIN.category, 'h-4 w-4') + esc(t('ls.' + MOUNTAIN.category)) + '</span>';
    var line = $('offline-line');
    if (!navigator.onLine && usingCache) {
      line.hidden = false;
      line.innerHTML = iconSvg('clock', 'h-4 w-4') + ' ' + esc(t('trail.offline', { time: fmtClock(usingCache.at) }));
    } else if (swReady) {
      line.hidden = false;
      line.innerHTML = '<span class="text-accent">' + iconSvg('check', 'h-4 w-4') + '</span> ' + esc(t('trail.saved'));
    } else {
      line.hidden = true;
      line.textContent = '';
    }
  }
  function fmtClock(iso) {
    var d = new Date(iso);
    if (!isFinite(d.getTime())) return '';
    var h = d.getHours(), m = d.getMinutes();
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  // The official level the banner shows. In the staging demo a client-side
    // override turns it "limited / bad weather" so the banner's warning look
    // can be seen; the plain route keeps the shipped "open".
    function shownStatus() {
      var s = MOUNTAIN.status || { level: 'open', reason: null, updatedAt: null, verified: true };
      if (demo) {
        var o = lsGet('statusOverride', null);
        if (o && ST.isStatusLevel(o.level)) {
          return { level: o.level, reason: o.reason || null, updatedAt: s.updatedAt, checkedAt: s.checkedAt, verified: s.verified };
        }
      }
      return s;
    }
    function statusSig() {
      var s = shownStatus();
      return s.level + ':' + (s.reason || '') + ':' + (s.updatedAt || '');
    }
    function quotaSig() {
      var p = MOUNTAIN.permits;
      return p ? (p.quotaDaily + ':' + (p.checkedAt || '')) : '';
    }
    function weatherSig() {
      var w = MOUNTAIN.weather;
      return w ? (w.updatedAt || '') : '';
    }

    // ── The official status banner: Buka / Dibuka Terbatas / Ditutup ──────
    function renderStatusBanner() {
      var el = $('status-banner');
      var s = shownStatus();
      if (!s.updatedAt) { el.hidden = true; return; }
      el.hidden = false;
      var tone = ST.statusTone(s.level);
      var toneClass = tone === 'danger' ? 'status-banner-danger'
        : (tone === 'warn' ? 'status-banner-warn' : 'status-banner-accent');
      el.className = 'status-banner ' + toneClass + ' mt-4';
      var icon = s.level === 'open' ? 'check' : 'warning';
      var ago = fmtAgo(nowDate().getTime() - new Date(s.updatedAt).getTime());
      var meta = t(s.reason ? 'banner.updated' : 'banner.checked', { ago: ago });
      var badge = s.verified ? '' : ' <span class="badge">' + esc(t('permits.notVerified')) + '</span>';
      el.setAttribute('role', 'status');
      el.innerHTML = iconSvg(icon, 'status-banner-icon') +
        '<div><p class="text-body font-semibold">' + esc(levelLabel(s.level)) +
        (s.reason ? '<span class="text-small font-normal text-muted"> · ' + esc(t('reason.' + s.reason)) + '</span>' : '') + '</p>' +
        '<p class="text-small text-muted">' + esc(meta) + badge + '</p></div>';
    }

    // ── Permits and quota: the curated SIMAKSI facts ──────────────────────
    function kvRow(label, value) {
      return '<div class="kv-row"><span class="kv-label">' + label + '</span><span class="kv-value">' + value + '</span></div>';
    }
    function renderPermits() {
      var el = $('permits-card');
      var p = MOUNTAIN.permits;
      if (!p) { el.innerHTML = ''; return; }
      var titleKey = p.booking === 'online' ? 'permits.onlineTitle'
        : (p.booking === 'onsite' ? 'permits.onsiteTitle' : 'permits.noneTitle');
      var reqs = (p.requirements || []).map(function (r) { return esc(t('req.' + r)); });
      if (p.minGroupSize) reqs.push(esc(t('permits.minGroup', { n: p.minGroupSize })));
      var html = '<p class="text-body font-semibold">' + esc(t(titleKey)) + '</p>' +
        '<div class="mt-1 divide-y divide-line">' +
        kvRow(esc(t('permits.quota')), esc(t('permits.quotaValue', { n: fmtNum(p.quotaDaily) }))) +
        kvRow(esc(t('permits.fee')), esc(t('permits.feeValue', { wd: fmtNum(p.feeWeekdayIdr), we: fmtNum(p.feeWeekendIdr) }))) +
        kvRow(esc(t('permits.reqs')), reqs.join(', ')) +
        '</div>';
      if (p.booking === 'online' && p.bookingUrl) {
        html += '<a class="btn-secondary mt-3 w-full" href="' + esc(p.bookingUrl) + '" target="_blank" rel="noopener">' + esc(t('permits.openSite')) + '</a>';
      }
      var checked = p.checkedAt ? esc(t('banner.checked', { ago: fmtAgo(nowDate().getTime() - new Date(p.checkedAt).getTime()) })) : '';
      if (!p.verified) checked += ' <span class="badge">' + esc(t('permits.notVerified')) + '</span>';
      html += '<p class="mt-3 text-small text-muted">' + checked + '</p>';
      el.innerHTML = html;
    }

    // ── Summit weather: curated 3-day forecast, warnings highlighted ──────
    function forecastDays(now) {
      var locale = LANG === 'id' ? 'id-ID' : 'en-US';
      var out = [];
      for (var i = 0; i < 3; i++) {
        var d = new Date(now.getTime() + i * 86400000);
        var name = i === 0 ? t('weather.today')
          : (i === 1 ? t('weather.tomorrow')
            : new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(d));
        out.push({ name: name, when: name });
      }
      return out;
    }
    function renderWeather() {
      var el = $('weather-card');
      var w = MOUNTAIN.weather;
      if (!w || !Array.isArray(w.days)) { el.innerHTML = ''; return; }
      var climbDate = lsGet('climbDate', null);
      var now = nowDate();
      var warnings = ST.weatherWarnings(w, climbDate, now, (packing && packing.days) || 1);
      function cell(name, s) {
        return '<div class="wx-cell"><p class="text-small text-muted">' + esc(name) + '</p>' +
          '<p class="mt-0.5 text-body font-semibold">' + s.tempC + ' °C</p>' +
          '<p class="mt-0.5 text-small text-muted">' + esc(t('weather.windKmh', { w: s.windKmh })) + '</p>' +
          '<p class="text-small text-muted">' + esc(t('weather.rainPct', { p: s.rainPct })) + '</p></div>';
      }
      var dayNames = forecastDays(now);
      function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
      var days = w.days.slice(0, 3).map(function (d, i) {
        var warned = warnings.some(function (x) { return x.index === i; });
        return '<div class="wx-day' + (warned ? ' wx-day-warn' : '') + '">' +
          '<p class="wx-day-name">' + esc(cap(dayNames[i].name)) + '</p>' +
          '<p class="mt-0.5 text-body font-semibold">' + d.tempLowC + '–' + d.tempHighC + ' °C</p>' +
          '<p class="text-small text-muted">' + esc(t('weather.windKmh', { w: d.windKmh })) + '</p>' +
          '<p class="text-small text-muted">' + esc(t('weather.rainPct', { p: d.rainPct })) + '</p></div>';
      }).join('');
      var alerts = '';
      warnings.forEach(function (x) {
        var d = w.days[x.index] || {};
        var when = dayNames[x.index] ? dayNames[x.index].when : '';
        (x.reasons || []).forEach(function (r) {
          var text = r === 'wind'
            ? t('weather.alert.wind', { w: d.windKmh, when: when })
            : t('weather.alert.rain', { p: d.rainPct, when: when });
          alerts += '<p class="wx-alert">' + iconSvg('warning', 'wx-alert-icon') + '<span>' + esc(text) + '</span></p>';
        });
      });
      var html = '<div class="wx-grid">' + cell(t('weather.basecamp'), w.basecamp || {}) + cell(t('weather.summit'), w.summit || {}) + '</div>' +
        '<p class="mt-3 text-small font-medium">' + esc(t('weather.forecast')) + '</p>' +
        '<div class="wx-days">' + days + '</div>' +
        alerts +
        '<label for="climb-date" class="mb-1 mt-3 block text-small font-medium">' + esc(t('weather.climbDate')) + '</label>' +
        '<input type="date" id="climb-date" class="field" value="' + esc(climbDate || '') + '">' +
        '<p class="mt-1 text-small text-muted">' + esc(t('weather.climbHint')) + '</p>';
      var updated = w.updatedAt ? esc(t('weather.updated', { ago: fmtAgo(now.getTime() - new Date(w.updatedAt).getTime()) })) : '';
      if (!w.verified) updated += ' <span class="badge">' + esc(t('permits.notVerified')) + '</span>';
      html += '<p class="mt-3 text-small text-muted">' + updated + '</p>' +
        '<p class="mt-0.5 text-small text-muted">' + esc(t('weather.curated')) + '</p>';
      el.innerHTML = html;
      var input = $('climb-date');
      input.addEventListener('change', function () {
        lsSet('climbDate', input.value || null);
        renderWeather();
        renderNotifs();
      });
    }

    // ── Notifications: a device-only list for followed mountains ──────────
    function checkForNotifs() {
      var follows = lsGet('follows', []);
      if (follows.indexOf(MOUNTAIN.id) < 0) return;
      var seen = lsGet('seen', null);
      var now = nowDate();
      var entries = [];
      if (seen) {
        if (seen.statusSig !== statusSig()) {
          entries.push({ key: 'notif.statusChanged', params: { level: shownStatus().level } });
        }
        if (seen.quotaSig !== quotaSig()) entries.push({ key: 'notif.quotaChanged' });
        var warned = ST.weatherWarnings(MOUNTAIN.weather, lsGet('climbDate', null), now, (packing && packing.days) || 1).length > 0;
        if (seen.weatherSig !== weatherSig() && warned) entries.push({ key: 'notif.weatherWarning' });
        var rn = 'n:' + visibleReports().length;
        // A 'seed' snapshot is the baseline the demo seeds to; it starts
        // counting from there instead of announcing everything as new.
        if (seen.reportsSig && seen.reportsSig !== 'seed' && seen.reportsSig !== rn) {
          var prev = Number(String(seen.reportsSig).slice(2)) || 0;
          var added = Math.max(1, (visibleReports().length - prev));
          entries.push(added === 1 ? { key: 'notif.newReportsOne' } : { key: 'notif.newReportsMany', params: { n: added } });
        }
        if (seen.reportsSig === 'seed') seen.reportsSig = rn;
      }
      var notifs = lsGet('notifs', []);
      entries.forEach(function (e) {
        var dedupe = e.key + ':' + JSON.stringify(e.params || {});
        var exists = notifs.some(function (n) { return n.key + ':' + JSON.stringify(n.params || {}) === dedupe; });
        if (!exists) notifs.unshift({ key: e.key, params: e.params || {}, at: now.toISOString(), read: false });
      });
      if (entries.length) lsSet('notifs', notifs.slice(0, 10));
      lsSet('seen', { statusSig: statusSig(), quotaSig: quotaSig(), weatherSig: weatherSig(), reportsSig: seen && seen.reportsSig ? seen.reportsSig : 'n:' + visibleReports().length });
      renderNotifs();
    }
    // Notification text is re-translated at render; the level in a
    // statusChanged entry is stored as the raw level, not a label.
    function notifText(n) {
      var params = Object.assign({}, n.params);
      if (n.key === 'notif.statusChanged' && params.level) params.level = levelLabel(params.level);
      return t(n.key, params);
    }
    function renderNotifs() {
      var follows = lsGet('follows', []);
      var toggle = $('follow-toggle');
      if (toggle) toggle.checked = follows.indexOf(MOUNTAIN.id) >= 0;
      var notifs = lsGet('notifs', []);
      var unread = notifs.filter(function (n) { return !n.read; }).length;
      var unreadEl = $('notif-unread');
      if (unread > 0) {
        unreadEl.hidden = false;
        unreadEl.textContent = t('notif.unread', { n: unread });
      } else {
        unreadEl.hidden = true;
        unreadEl.textContent = '';
      }
      var ul = $('notif-list');
      var btn = $('notif-read');
      ul.hidden = false;
      if (!notifs.length) {
        ul.innerHTML = '<li class="state-empty"><p class="text-small text-muted">' + esc(t('notif.empty')) + '</p></li>';
        btn.hidden = true;
        return;
      }
      ul.innerHTML = notifs.map(function (n) {
        return '<li class="list-row items-start">' +
          '<span class="report-icon report-icon-warn">' + iconSvg('warning', 'h-4 w-4') + '</span>' +
          '<div class="min-w-0 flex-1"><p class="text-body' + (n.read ? '' : ' font-medium') + '">' + esc(notifText(n)) + '</p>' +
          '<p class="text-small text-muted">' + esc(fmtAgo(nowDate().getTime() - new Date(n.at).getTime())) + '</p></div></li>';
      }).join('');
      btn.hidden = unread === 0;
    }

    function renderStatus() {
    var el = $('status-strip');
    el.className = 'status-strip mt-4';
    el.onclick = null;
    if (loading) {
      el.classList.add('status-strip-skeleton');
      el.removeAttribute('role');
      el.innerHTML = '<div class="flex-1 flex flex-col gap-2 py-1">' +
        '<span class="skeleton h-4 w-48"></span>' +
        '<span class="skeleton h-3.5 w-64"></span></div>';
      return;
    }
    if (failed) {
      el.innerHTML = '<div class="flex-1"><p class="text-body">' + esc(t('err.reports')) + '</p>' +
        '<p class="text-small text-muted">' + esc(t('err.still')) + '</p></div>' +
        '<button type="button" id="status-retry" class="btn-secondary self-center">' + esc(t('retry')) + '</button>';
      $('status-retry').addEventListener('click', function () { loadReports(); });
      return;
    }
    var list = visibleReports();
    if (!list.length) {
      el.innerHTML = iconSvg('check', 'status-strip-icon') +
        '<div><p class="text-body font-medium">' + esc(t('strip.none')) + '</p>' +
        '<p class="text-small text-muted">' + esc(t('strip.none.sub')) + '</p></div>';
      el.removeAttribute('role');
      return;
    }
    var worst = null;
    list.forEach(function (r) {
      var c = COND_BY_ID[r.condition];
      if (!c) return;
      if (!worst || c.severity > COND_BY_ID[worst.condition].severity ||
          (c.severity === COND_BY_ID[worst.condition].severity && new Date(r.createdAt) > new Date(worst.createdAt))) {
        worst = r;
      }
    });
    var cond = COND_BY_ID[worst.condition];
    el.classList.add(cond.tone === 'danger' ? 'status-strip-danger' : 'status-strip-warn');
    var others = list.length - 1;
    // The strip is no longer one button: it holds a confirm button and
    // maybe a photo, which must not sit inside a clickable role. The title
    // button is the keyboard target; pointer taps anywhere else still open
    // the stop.
    el.removeAttribute('role');
    el.removeAttribute('tabindex');
    el.removeAttribute('aria-label');
    var confirmBtn = '';
    if (!worst.mine && !worst.pending) {
      confirmBtn = '<button type="button" class="btn-secondary mt-2" data-confirm' +
        (worst.confirmedByMe
          ? ' aria-pressed="true" aria-disabled="true">' + iconSvg('check', 'h-5 w-5 text-accent') + esc(t('confirm.stillValid')) + '</button>'
          : '>' + esc(t('confirm.stillValid')) + '</button>');
    }
    el.innerHTML = iconSvg(worst.condition === 'landslide' ? 'landslide' : worst.condition, 'status-strip-icon') +
      '<div class="min-w-0 flex-1">' +
      '<button type="button" class="status-strip-open" aria-label="' + esc(t('strip.open', { name: STOP_BY_ID[worst.stopId].name })) + '">' +
      '<span class="text-body font-medium">' + esc(tx('cond.' + cond.id + '.label', cond.label)) + ' ' + esc(t('strip.at')) + ' ' + esc(STOP_BY_ID[worst.stopId].name) + '</span></button>' +
      '<p class="text-small text-muted">' + esc(t('strip.reported', { ago: I18N.ago(LANG, nowDate().getTime() - new Date(worst.createdAt).getTime()) })) +
      (others > 0 ? '. ' + esc(tn('reports.more', others)) : '') + '.</p>' +
      (worst.confirms > 0 ? '<p class="text-small text-muted">' + esc(tn('confirm.count', worst.confirms)) + '</p>' : '') +
      confirmBtn + '</div>' +
      (worst.photoUrl
        ? '<button type="button" class="status-strip-photo" data-photo="' + esc(worst.photoUrl) + '" aria-label="Open the photo">' +
          iconSvg('photo', 'h-6 w-6') + '<img alt="" src="' + esc(worst.photoUrl) + '"></button>'
        : '');
    function openWorst() {
      expandedStop = worst.stopId;
      if (typeFilter !== 'all' && STOP_BY_ID[worst.stopId].kinds.indexOf(typeFilter) < 0) typeFilter = 'all';
      renderStops();
      var row = document.getElementById('stop-' + worst.stopId);
      if (row) row.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
    el.onclick = function (e) {
      if (e.target.closest('[data-confirm], [data-photo]')) return;
      openWorst();
    };
    var photoBtn = el.querySelector('[data-photo]');
    if (photoBtn) {
      photoBtn.addEventListener('click', function () { showPhoto(photoBtn.getAttribute('data-photo')); });
      var pimg = photoBtn.querySelector('img');
      // Offline the photo cannot load; the drawn icon behind it shows.
      if (pimg) pimg.addEventListener('error', function () { pimg.hidden = true; });
    }
    var cBtn = el.querySelector('[data-confirm]');
    if (cBtn && !worst.confirmedByMe) cBtn.addEventListener('click', function () { confirmReport(worst); });
  }

  // The stop picked on the height profile (module state, so the pick and
  // its ring survive a report reload), or null for the default two ends.
  var profileStop = null;

  function pickProfileStop(id, fromChart) {
    profileStop = profileStop === id ? null : id;
    renderProfile();
    // A tap on the chart may land on a chip that is scrolled out of view.
    if (profileStop && fromChart) {
      var chip = document.querySelector('[data-profile-stop="' + profileStop + '"]');
      if (chip) chip.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }

  function renderProfile() {
    var W = 358, H = 80, x0 = 8, x1 = 350, yTop = 12, yBot = 72;
    var kmMax = STOPS[STOPS.length - 1].km;
    var eMin = STOPS[0].elevM, eMax = STOPS[STOPS.length - 1].elevM;
    function px(km) { return x0 + (km / kmMax) * (x1 - x0); }
    function py(e) { return yBot - ((e - eMin) / (eMax - eMin)) * (yBot - yTop); }
    var cond = {};
    visibleReports().forEach(function (r) {
      if (!cond[r.stopId]) cond[r.stopId] = r; // list is newest first
    });
    var pts = STOPS.map(function (s) { return px(s.km).toFixed(1) + ',' + py(s.elevM).toFixed(1); }).join(' ');
    var dots = STOPS.map(function (s) {
      var rep = cond[s.id];
      var tone = rep ? COND_BY_ID[rep.condition].tone : null;
      var cls = tone === 'danger' ? 'profile-danger' : (tone === 'warn' ? 'profile-warn' : 'profile-base');
      var r = tone ? 4.5 : 4;
      return '<circle class="' + cls + '" cx="' + px(s.km).toFixed(1) + '" cy="' + py(s.elevM).toFixed(1) + '" r="' + r + '"/>';
    }).join('');
    var ring = '';
    var picked = profileStop && STOP_BY_ID[profileStop] ? STOP_BY_ID[profileStop] : null;
    if (picked) {
      ring = '<circle class="profile-selected" cx="' + px(picked.km).toFixed(1) + '" cy="' + py(picked.elevM).toFixed(1) + '" r="7.5"/>';
    }
    var box = $('profile');
    box.innerHTML =
      '<svg viewBox="0 0 358 80" class="block w-full" role="img" aria-label="' + esc(t('profile.aria')) + '">' +
      '<line x1="0" y1="77" x2="358" y2="77" style="stroke:rgb(var(--line));stroke-width:1"/>' +
      '<polyline class="profile-line" points="' + pts + '"/>' + dots + ring + '</svg>';
    // Tapping the chart picks the stop whose dot is nearest left or right
    // of the tap, so the closely spaced dots stay easy to hit.
    box.onclick = function (e) {
      var rect = box.getBoundingClientRect();
      var vx = ((e.clientX - rect.left) / rect.width) * W;
      var best = null, bestD = Infinity;
      STOPS.forEach(function (s) {
        var d = Math.abs(px(s.km) - vx);
        if (d < bestD) { bestD = d; best = s.id; }
      });
      if (best) pickProfileStop(best, true);
    };
    var ends = $('profile-ends');
    if (picked) {
      ends.innerHTML =
        '<p><span class="font-semibold text-fg">' + esc(picked.name) + '</span>, km ' + fmtKm(picked.km) +
        ', ' + fmtM(picked.elevM) + ' m. ' +
        (picked.id === STOPS[0].id ? 'Where the walk starts.' : 'About ' + fmtDur(MIN_FROM_BASECAMP[picked.id]) + ' from basecamp.') +
        '</p>';
    } else {
      ends.innerHTML = '<span>' + esc(t('profile.base', { m: fmtM(STOPS[0].elevM) })) + '</span><span>' + esc(t('profile.summit', { m: fmtM(eMax) })) + '</span>';
    }
    // One chip per stop, in trail order: the labels the chart is too small
    // to carry, and the keyboard and screen-reader path to the profile.
    var row = $('profile-stops');
    row.innerHTML = STOPS.map(function (s) {
      var on = profileStop === s.id;
      var meta = s.id === STOPS[0].id
        ? 'km 0, start'
        : 'km ' + fmtKm(s.km) + ', ' + fmtDur(MIN_FROM_BASECAMP[s.id]);
      return '<li><button type="button" class="profile-stop' + (on ? ' profile-stop-selected' : '') +
        '" data-profile-stop="' + s.id + '" aria-pressed="' + (on ? 'true' : 'false') + '">' +
        '<span class="profile-stop-name">' + esc(s.name) + '</span>' +
        '<span class="profile-stop-meta">' + meta + '</span></button></li>';
    }).join('');
    Array.prototype.forEach.call(row.querySelectorAll('[data-profile-stop]'), function (btn) {
      btn.addEventListener('click', function () {
        pickProfileStop(btn.getAttribute('data-profile-stop'), false);
      });
    });
  }

  function condLineHtml(stop) {
    var reps = latestForStop(stop.id);
    if (loading) {
      return '<p class="cond-line cond-line-none"><i></i><span class="skeleton h-3.5 w-32"></span></p>';
    }
    if (!reps.length) {
      return '<p class="cond-line cond-line-none"><i></i>' + esc(t('stops.noreports')) + '</p>';
    }
    var rep = reps[0];
    var c = COND_BY_ID[rep.condition];
    var extra = reps.length > 1 ? t('stops.more', { n: reps.length - 1 }) : '';
    var waiting = rep.pending && rep.waiting ? ' · ' + t('share.section') : '';
    return '<p class="cond-line cond-line-' + (c.tone === 'danger' ? 'danger' : 'warn') + '"><i></i>' +
      esc(tx('cond.' + c.id + '.label', c.label)) + ', ' + esc(I18N.ago(LANG, nowDate().getTime() - new Date(rep.createdAt).getTime())) + esc(extra) + esc(waiting) + '</p>';
  }

  function stopTone(stop) {
    var reps = latestForStop(stop.id);
    if (!reps.length || loading) return '';
    var c = COND_BY_ID[reps[0].condition];
    return c.tone === 'danger' ? ' stop-node-danger' : (c.tone === 'warn' ? ' stop-node-warn' : '');
  }

  // All / Post / Water / Camp / Junction above the stop list, each with
  // the number of stops of that type on this route.
  function renderTypeChips() {
    var row = $('type-chips');
    if (!row) return;
    var ids = ['all'].concat(M.STOP_TYPES);
    row.innerHTML = ids.map(function (id) {
      var n = id === 'all' ? STOPS.length : STOPS.filter(function (s) { return s.kinds.indexOf(id) >= 0; }).length;
      var on = typeFilter === id;
      return '<button type="button" class="chip' + (on ? ' chip-on' : '') + '" data-stop-type="' + id + '" aria-pressed="' + on + '">' +
        (id === 'all' ? '' : iconSvg(KIND_ICON[id], 'h-4 w-4')) + esc(t('type.' + id)) +
        '<span class="chip-count">' + n + '</span></button>';
    }).join('');
    Array.prototype.forEach.call(row.querySelectorAll('[data-stop-type]'), function (btn) {
      btn.addEventListener('click', function () {
        typeFilter = btn.getAttribute('data-stop-type');
        renderStops();
      });
    });
  }

  function renderStops() {
    renderTypeChips();
    var ol = $('trail-line');
    var html = '';
    var filtering = typeFilter !== 'all';
    var shown = STOPS.filter(function (s) { return !filtering || s.kinds.indexOf(typeFilter) >= 0; });
    ol.classList.toggle('trail-line-bare', shown.length < 2);
    if (!shown.length) {
      ol.innerHTML = '<li class="state-empty rounded-xl border border-line bg-surface">' +
        '<p class="text-body font-semibold">' + esc(t('type.empty.' + typeFilter)) + '</p>' +
        '<button type="button" class="btn-secondary" data-type-all>' + esc(t('type.showAll')) + '</button></li>';
      ol.querySelector('[data-type-all]').addEventListener('click', function () {
        typeFilter = 'all';
        renderStops();
      });
      return;
    }
    shown.forEach(function (s, i) {
      var open = expandedStop === s.id;
      var facs = '';
      if (s.kinds.indexOf('water') >= 0) {
        facs += '<span class="fac-water">' + iconSvg('drop', 'h-4 w-4') + esc(t('fac.water')) + '</span>';
      }
      if (s.kinds.indexOf('camp') >= 0 || s.kinds.indexOf('basecamp') >= 0) {
        facs += '<span>' + iconSvg('tent', 'h-4 w-4') + esc(t('fac.camp')) + '</span>';
      }
      if (s.kinds.indexOf('junction') >= 0) {
        facs += '<span class="text-muted">' + iconSvg('junction', 'h-4 w-4') + esc(t('fac.junction')) + '</span>';
      }
      html += '<li class="stop-row" id="stop-' + s.id + '" data-stop="' + s.id + '">' +
        '<span class="stop-node' + stopTone(s) + '">' + iconSvg(stopIcon(s), 'h-5 w-5') + '</span>' +
        '<div class="stop-body">' +
        '<p class="text-body font-semibold">' + esc(s.name) + '</p>' +
        '<p class="mt-1 text-small text-muted">' + fmtM(s.elevM) + ' m, km ' + fmtKm(s.km) + '. ' + esc(tx('stop.' + s.id + '.short', s.short)) + '</p>' +
        (facs ? '<p class="fac">' + facs + '</p>' : '') +
        condLineHtml(s) +
        (open ? expandedHtml(s) : '') +
        '</div></li>';
      if (s.legToNext && !filtering) {
        var leg = fmtLeg(s.legToNext);
        html += '<li class="leg-line">' + leg + '</li>';
      }
    });
    ol.innerHTML = html;
    Array.prototype.forEach.call(ol.querySelectorAll('.stop-row'), function (row) {
      row.addEventListener('click', function (e) {
        if (e.target.closest('button')) return;
        var id = row.getAttribute('data-stop');
        expandedStop = expandedStop === id ? null : id;
        renderStops();
      });
    });
    var reportBtn = ol.querySelector('[data-report-here]');
    if (reportBtn) {
      reportBtn.addEventListener('click', function () {
        setPicker(reportBtn.getAttribute('data-report-here'));
        switchTab('report');
        window.scrollTo({ top: 0 });
      });
    }
    var menuBtn = ol.querySelector('[data-stop-flag]');
    if (menuBtn) {
      menuBtn.addEventListener('click', function () { reportMenu(menuBtn, Number(menuBtn.getAttribute('data-stop-flag'))); });
    }
  }

  function expandedHtml(s) {
    var reps = latestForStop(s.id).filter(function (r) { return !r.pending; });
    var rows = reps.map(function (r) {
      var c = COND_BY_ID[r.condition];
      return '<li class="list-row items-start">' +
        '<span class="report-icon report-icon-' + (c.tone === 'danger' ? 'danger' : 'warn') + '">' + iconSvg(r.condition === 'landslide' ? 'landslide' : r.condition, 'h-4 w-4') + '</span>' +
        '<div class="min-w-0 flex-1"><p class="text-body font-medium">' + esc(tx('cond.' + c.id + '.label', c.label)) + '</p>' +
        '<p class="text-small text-muted">' + (r.mine ? esc(t('who.you')) : esc(r.username)) + ', ' + esc(I18N.ago(LANG, nowDate().getTime() - new Date(r.createdAt).getTime())) + '</p>' +
        (r.confirms > 0 ? '<p class="text-small text-muted">' + esc(tn('confirm.count', r.confirms)) + '</p>' : '') +
        (r.note ? '<p class="mt-0.5 text-small">' + esc(r.note) + '</p>' : '') + '</div></li>';
    }).join('');
    return '<p class="mt-2 text-body">' + esc(tx('stop.' + s.id + '.detail', s.detail)) + '</p>' +
      (rows ? '<ul class="list mt-3">' + rows + '</ul>' : '<p class="mt-2 text-small text-muted">' + esc(t('stops.noreports.here')) + '</p>') +
      '<button type="button" class="btn-secondary mt-3" data-report-here="' + s.id + '">' + esc(t('stops.report.here')) + '</button>';
  }

  // "40 min", "3 h", "3 h 40 min" — the walk-time half of fmtLeg.
  function fmtDur(min) {
    var h = Math.floor(min / 60), m = min % 60;
    return h > 0 ? (h + ' ' + t('unit.h') + (m ? ' ' + m + ' ' + t('unit.min') : '')) : m + ' ' + t('unit.min');
  }
  function fmtLeg(leg) {
    return fmtDur(leg.min) + ', +' + fmtM(leg.climbM) + ' m';
  }

  // ── Report tab ─────────────────────────────────────────────────────────
  var picker = null;
  function setPicker(stopId) {
    if (STOP_BY_ID[stopId]) picker.value = stopId;
    renderPickerHint();
    lsSet('lastStop', picker.value);
  }
  function renderPickerHint() {
    var loc = lsGet('location', null);
    var s = STOP_BY_ID[picker.value];
    var hint = '';
    if (loc) {
      var n = M.nearestStop(loc.lat, loc.lng);
      hint = n.stop.id === s.id
        ? t('pick.closest', { ago: I18N.ago(LANG, nowDate().getTime() - new Date(loc.at).getTime()) })
        : t('pick.near', { name: n.stop.name });
    } else if (lsGet('lastStop', null) && STOP_BY_ID[lsGet('lastStop', null)]) {
      hint = t('pick.last');
    } else {
      hint = t('pick.base');
    }
    $('picker-hint').textContent = hint;
  }
  function buildPicker() {
    var loc = lsGet('location', null);
    var initial = null;
    if (loc) initial = M.nearestStop(loc.lat, loc.lng).stop.id;
    if (!initial) initial = lsGet('lastStop', null);
    if (!initial || !STOP_BY_ID[initial]) initial = STOPS[0].id;
    picker.innerHTML = STOPS.map(function (s) {
      return '<option value="' + s.id + '">' + esc(s.name) + ', ' + fmtM(s.elevM) + ' m</option>';
    }).join('');
    picker.value = initial;
  }

  function sendReport(conditionId) {
    if (!ME.user) { askForAccount(); return; }
    var stopId = picker.value;
    lsSet('lastStop', stopId);
    var entry = {
      clientId: uuid(),
      stopId: stopId,
      condition: conditionId,
      note: null,
      photoUrl: null,
      createdAt: nowISO(),
      username: ME.user.username,
      mine: true,
      pending: true,
      waiting: !navigator.onLine,
    };
    pending.push(entry);
    lastAction = entry;
    renderReportsAndTrail();
    showSentNote(entry);
    postReport(entry);
  }

  function queueAll() { return lsGet('queue', []); }
  function queueSave(q) { lsSet('queue', q); }
  function queueAdd(entry) {
    var q = queueAll();
    if (!q.some(function (e) { return e.clientId === entry.clientId; })) {
      q.push({ clientId: entry.clientId, stopId: entry.stopId, condition: entry.condition, note: entry.note, photoUrl: entry.photoUrl, createdAt: entry.createdAt, username: entry.username });
      queueSave(q);
    }
  }
  function queueRemove(clientId) {
    queueSave(queueAll().filter(function (e) { return e.clientId !== clientId; }));
  }

  async function postReport(entry) {
    var res = null;
    try {
      res = await api('/api/reports', {
        method: 'POST',
        body: { clientId: entry.clientId, stopId: entry.stopId, condition: entry.condition, note: entry.note },
      });
    } catch (e) {}
    if (res && res.ok && res.data && res.data.report) {
      queueRemove(entry.clientId);
      var rep = res.data.report;
      var i = pending.indexOf(entry);
      if (i >= 0) pending.splice(i, 1);
      var existing = null;
      reports.forEach(function (r) { if (r.clientId === entry.clientId) existing = r; });
      if (existing) Object.assign(existing, rep);
      else reports.unshift(rep);
      if (entry._photo) {
        // A photo picked while the report was still in flight: attach it now.
        var pid = entry._photo;
        delete entry._photo;
        api('/api/reports/' + rep.id, { method: 'PATCH', body: { photoUrl: pid.url, photoId: pid.id } }).then(function (pres) {
          if (pres.ok && pres.data && pres.data.report) {
            rep.photoUrl = pres.data.report.photoUrl;
            renderReportsAndTrail();
          }
        });
      }
      if (lastAction === entry) { entry.id = rep.id; entry.pending = false; }
      renderReportsAndTrail();
      return true;
    }
    var status = res ? res.status : 0;
    if (status >= 400 && status < 500 && status !== 401) {
      var i2 = pending.indexOf(entry);
      if (i2 >= 0) pending.splice(i2, 1);
      kitToast(t('toast.sendfail'));
      renderReportsAndTrail();
      return true;
    }
    entry.waiting = true;
    queueAdd(entry);
    renderReportsAndTrail();
    return false;
  }

  var replaying = false;
  async function replayQueue() {
    if (replaying) return;
    var q = queueAll();
    if (!q.length) return;
    replaying = true;
    try {
      for (var i = 0; i < q.length; i++) {
        var stored = q[i];
        var sent;
        if (stored.kind === 'location') {
          sent = await postLocation(stored);
        } else {
          var entry = null;
          pending.forEach(function (p) { if (p.clientId === stored.clientId) entry = p; });
          if (!entry) {
            entry = Object.assign({ pending: true, waiting: true, mine: true, photoUrl: null }, stored);
            pending.push(entry);
          }
          sent = await postReport(entry);
        }
        if (!sent) break;
      }
    } finally {
      replaying = false;
    }
  }

  function showSentNote(entry) {
    var el = $('sent-note');
    var stop = STOP_BY_ID[entry.stopId];
    el.hidden = false;
    el.innerHTML = '<p class="text-body font-semibold">' + esc(t('sent.title', { cond: tx('cond.' + cond.id + '.label', cond.label), stop: stop.name })) + '</p>' +
      '<p class="mt-0.5 text-small text-muted">' + esc(entry.waiting ? t('sent.waiting') : t('sent.live')) + '</p>' +
      '<div class="mt-3 flex flex-wrap items-center gap-2">' +
      '<button type="button" class="btn-secondary" data-act="photo">' + iconSvg('camera', 'h-5 w-5') + esc(t('act.photo')) + '</button>' +
      '<button type="button" class="btn-secondary" data-act="note">' + iconSvg('note', 'h-5 w-5') + esc(t('act.note')) + '</button>' +
      '<button type="button" class="btn-text" data-act="undo">' + esc(t('undo')) + '</button></div>';
    el.querySelector('[data-act="photo"]').addEventListener('click', function () { addPhoto(entry); });
    el.querySelector('[data-act="note"]').addEventListener('click', function () { addNote(entry); });
    el.querySelector('[data-act="undo"]').addEventListener('click', function () { undoEntry(entry); });
  }
  function hideSentNote() {
    $('sent-note').hidden = true;
    $('sent-note').innerHTML = '';
    lastAction = null;
  }

  async function undoEntry(entry) {
    if (entry.id) {
      var res = null;
      try { res = await api('/api/reports/' + entry.id, { method: 'DELETE' }); } catch (e) {}
      if (res && res.ok) {
        reports = reports.filter(function (r) { return r.id !== entry.id; });
        kitToast(t('toast.removed'));
      } else {
        kitToast(t('toast.removefail'));
        return;
      }
    } else {
      pending = pending.filter(function (p) { return p.clientId !== entry.clientId; });
      queueRemove(entry.clientId);
    }
    if (lastAction === entry) hideSentNote();
    renderReportsAndTrail();
  }

  // Report actions: a note, a photo, remove, flag.
  function findReportById(id) {
    var found = null;
    visibleReports().forEach(function (r) { if (r.id === id) found = r; });
    return found;
  }
  function isDemoRow(r) { return typeof r.id === 'number' && r.id < 0; }

  function addNote(entryOrReport) {
    var r = entryOrReport;
    var wrap = document.createElement('div');
    wrap.className = 'flex flex-col gap-3 p-4';
    wrap.innerHTML = '<p class="font-display text-heading">' + esc(t('note.title')) + '</p>' +
      '<textarea id="note-box" class="field" rows="3" maxlength="200" placeholder="' + esc(t('note.ph')) + '"></textarea>' +
      '<p class="text-small text-muted"><span id="note-count">0</span> ' + esc(t('note.count', { n: 0 }).replace(/^0 /, '')) + '</p>' +
      '<div class="flex justify-end gap-2">' +
      '<button type="button" class="btn-secondary" data-close>' + esc(t('cancel')) + '</button>' +
      '<button type="button" class="btn-primary" data-save>' + esc(t('note.save')) + '</button></div>';
    var box = wrap.querySelector('#note-box');
    var count = wrap.querySelector('#note-count');
    box.value = r.note || '';
    function upd() { count.textContent = t('note.count', { n: box.value.length }); }
    box.addEventListener('input', upd);
    upd();
    wrap.querySelector('[data-close]').addEventListener('click', function () {
      var b = wrap.closest('.overlay-fallback');
      if (b) b.remove();
      try { if (window.unNative && unNative.dismissTop) unNative.dismissTop(); } catch (e) {}
    });
    wrap.querySelector('[data-save]').addEventListener('click', function () {
      var text = box.value.trim().slice(0, 200);
      saveNote(r, text);
      var b = wrap.closest('.overlay-fallback');
      if (b) b.remove();
      try { if (window.unNative && unNative.dismissTop) unNative.dismissTop(); } catch (e) {}
    });
    presentSheet(wrap);
    try { box.focus(); } catch (e) {}
  }

  function saveNote(r, text) {
    if (r.pending) {
      r.note = text || null;
      queueRemove(r.clientId); queueAdd(r); // rewrite with the note
      if (lastAction === r) showSentNote(r);
      renderReportsAndTrail();
      return;
    }
    if (isDemoRow(r)) {
      var ov = lsGet('overrides', {});
      ov[r.id] = Object.assign({}, ov[r.id], { note: text });
      lsSet('overrides', ov);
      renderReportsAndTrail();
      kitToast(t('toast.note'));
      return;
    }
    api('/api/reports/' + r.id, { method: 'PATCH', body: { note: text } }).then(function (res) {
      if (res.ok && res.data && res.data.report) {
        var live = null;
        reports.forEach(function (x) { if (x.id === r.id) live = x; });
        if (live) live.note = res.data.report.note;
        kitToast(t('toast.note'));
      } else {
        kitToast(t('toast.notefail'));
      }
      renderReportsAndTrail();
    });
  }

  var photoTarget = null;
  function addPhoto(entryOrReport) {
    var r = entryOrReport;
    if (!navigator.onLine) {
      kitToast(t('toast.photo.offline'));
      return;
    }
    if (!window.usernode || typeof window.usernode.uploadFile !== 'function') {
      kitToast(t('toast.photo.na'));
      return;
    }
    photoTarget = r;
    var input = $('photo-input');
    input.value = '';
    input.click();
  }
  var photoInput = null;
  function wirePhotoInput() {
    photoInput = $('photo-input');
    photoInput.addEventListener('change', async function () {
      var file = photoInput.files && photoInput.files[0];
      var r = photoTarget;
      photoTarget = null;
      if (!file || !r) return;
      try {
        var scaled = await downscaleImage(file);
        var up = await window.usernode.uploadFile(scaled, { visibility: 'public' });
        var url = up && (up.url || up.location || up.href);
        var pid = up && (up.id || up.fileId || null);
        if (!url) throw new Error('no url');
        if (r.pending) {
          // The report is still in flight; the photo rides with it once sent.
          r._photo = { url: url, id: pid };
          kitToast(t('toast.photo.pending'));
          return;
        }
        if (isDemoRow(r)) {
          var ov = lsGet('overrides', {});
          ov[r.id] = Object.assign({}, ov[r.id], { photoUrl: url });
          lsSet('overrides', ov);
          renderReportsAndTrail();
          kitToast(t('toast.photo'));
          return;
        }
        var res = await api('/api/reports/' + r.id, { method: 'PATCH', body: { photoUrl: url, photoId: pid } });
        if (res.ok && res.data && res.data.report) {
          var live = null;
          reports.forEach(function (x) { if (x.id === r.id) live = x; });
          if (live) { live.photoUrl = res.data.report.photoUrl; live.photoId = pid; }
          kitToast(t('toast.photo'));
        } else {
          kitToast(t('toast.photofail'));
        }
        renderReportsAndTrail();
      } catch (e) {
        kitToast(t('toast.photo.error'));
      }
    });
  }
  function downscaleImage(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var objUrl = URL.createObjectURL(file);
      img.onload = function () {
        try {
          var max = 1600;
          var w = img.width, h = img.height;
          var scale = Math.min(1, max / Math.max(w, h));
          var c = document.createElement('canvas');
          c.width = Math.round(w * scale);
          c.height = Math.round(h * scale);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          c.toBlob(function (blob) {
            URL.revokeObjectURL(objUrl);
            if (blob) resolve(blob); else reject(new Error('no blob'));
          }, 'image/jpeg', 0.82);
        } catch (e) { URL.revokeObjectURL(objUrl); reject(e); }
      };
      img.onerror = function () { URL.revokeObjectURL(objUrl); reject(new Error('bad image')); };
      img.src = objUrl;
    });
  }

  function removeReport(r) {
    if (isDemoRow(r)) {
      var ov = lsGet('overrides', {});
      ov[r.id] = Object.assign({}, ov[r.id], { removed: true });
      lsSet('overrides', ov);
      renderReportsAndTrail();
      kitToast(t('toast.removed'));
      return;
    }
    api('/api/reports/' + r.id, { method: 'DELETE' }).then(function (res) {
      if (res.ok) {
        try {
          if (r.photoId && window.usernode && typeof window.usernode.deleteFile === 'function') {
            window.usernode.deleteFile(r.photoId);
          }
        } catch (e) {}
        reports = reports.filter(function (x) { return x.id !== r.id; });
        kitToast(t('toast.removed'));
      } else {
        kitToast(t('toast.removefail'));
      }
      renderReportsAndTrail();
    });
  }

  function flagReport(r) {
    if (isDemoRow(r)) {
      var ov = lsGet('overrides', {});
      ov[r.id] = Object.assign({}, ov[r.id], { flagged: true });
      lsSet('overrides', ov);
      renderReportsAndTrail();
      kitToast(t('toast.flagged'));
      return;
    }
    api('/api/reports/' + r.id + '/flag', { method: 'POST' }).then(function (res) {
      if (res.ok) {
        reports = reports.filter(function (x) { return x.id !== r.id; });
        kitToast(t('toast.flagged'));
      } else if (res.status === 400) {
        kitToast(t('toast.flagown'));
      } else {
        kitToast(t('toast.flagfail'));
      }
      renderReportsAndTrail();
    });
  }

  // "Masih berlaku": the hiker can see the condition is still there. One
  // confirmation per hiker per report; never queued offline — a tap with no
  // signal just asks to try again.
  async function confirmReport(r) {
    if (!ME.user) { askForAccount(); return; }
    if (!navigator.onLine) { kitToast(t('confirm.offline')); return; }
    if (isDemoRow(r)) {
      var dov = lsGet('overrides', {});
      dov[r.id] = Object.assign({}, dov[r.id], { confirmed: true });
      lsSet('overrides', dov);
      kitToast(t('confirm.sent'));
      renderReportsAndTrail();
      return;
    }
    var live = null;
    reports.forEach(function (x) { if (x.id === r.id) live = x; });
    if (!live) return;
    var prevConfirms = live.confirms || 0;
    live.confirmedByMe = true;
    live.confirms = prevConfirms + 1;
    renderReportsAndTrail();
    var res = null;
    try {
      res = await api('/api/reports/' + r.id + '/confirm', { method: 'POST', body: { clientId: uuid() } });
    } catch (e) {}
    if (res && res.ok && res.data) {
      live.confirms = res.data.confirms;
      live.confirmedByMe = res.data.confirmedByMe !== false;
      kitToast(t('confirm.sent'));
    } else if (res && res.status === 400) {
      live.confirmedByMe = false;
      live.confirms = prevConfirms;
      kitToast(t('confirm.own'));
    } else if (res && res.status === 404) {
      reports = reports.filter(function (x) { return x.id !== r.id; });
    } else {
      live.confirmedByMe = false;
      live.confirms = prevConfirms;
      kitToast(t('confirm.fail'));
    }
    renderReportsAndTrail();
  }

  function reportMenu(anchorEl, id) {
    var r = findReportById(id);
    if (!r) return;
    var items;
    if (r.mine) {
      items = [
        { label: t('act.note'), handler: function () { addNote(r); } },
        { label: t('act.photo'), handler: function () { addPhoto(r); } },
        { label: t('menu.remove'), destructive: true, handler: function () { removeReport(r); } },
      ];
    } else {
      items = [
        { label: t('menu.flag'), destructive: true, handler: function () { flagReport(r); } },
      ];
    }
    rowMenu(anchorEl, null, items);
  }

  function showPhoto(url) {
    var wrap = document.createElement('div');
    wrap.className = 'p-3';
    wrap.innerHTML = '<img src="' + esc(url) + '" alt="' + esc(t('photo.alt')) + '" style="max-height:70vh" class="w-full rounded-lg">';
    presentModal(wrap);
  }

  function reportRowHtml(r) {
    var c = COND_BY_ID[r.condition];
    var stop = STOP_BY_ID[r.stopId];
    var tone = c.tone === 'danger' ? 'danger' : 'warn';
    var who = r.mine ? t('who.you') : esc(r.username);
    var ago = r.pending ? I18N.ago(LANG, 0) : I18N.ago(LANG, nowDate().getTime() - new Date(r.createdAt).getTime());
    var sub = who + ', ' + ago + (r.pending && r.waiting ? ' · ' + t('share.section') : '');
    var confirmLine = '';
    if (!r.pending && !r.mine) {
      if (r.confirmedByMe) {
        confirmLine = '<p class="mt-1 text-small font-medium text-accent">' + esc(t('confirm.you')) + '</p>';
      } else {
        confirmLine = '<button type="button" class="btn-text" data-confirm="' + r.id + '">' + esc(t('confirm.stillValid')) + '</button>';
      }
    }
    if (r.confirms > 0) {
      confirmLine += '<p class="mt-0.5 text-small text-muted">' + esc(tn('confirm.count', r.confirms)) + '</p>';
    }
    return '<li class="list-row items-start" data-id="' + r.id + '">' +
      '<span class="report-icon report-icon-' + tone + '">' + iconSvg(r.condition, 'h-5 w-5') + '</span>' +
      '<div class="min-w-0 flex-1">' +
      '<p class="text-body font-semibold">' + esc(tx('cond.' + c.id + '.label', c.label)) + ' ' + esc(t('strip.at')) + ' ' + esc(stop.name) + '</p>' +
      '<p class="text-small text-muted">' + esc(sub) + '</p>' +
      (r.note ? '<p class="mt-0.5 text-small">' + esc(r.note) + '</p>' : '') +
      confirmLine +
      '</div>' +
      (r.photoUrl ? '<button type="button" class="report-thumb" data-photo="' + esc(r.photoUrl) + '" aria-label="' + esc(t('photo.open')) + '">' + iconSvg('photo', 'h-6 w-6') + '</button>' : '') +
      '<button type="button" class="flex h-11 w-11 flex-none items-center justify-center rounded-lg text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus" data-menu aria-label="' + esc(t('menu.options')) + '">' + iconSvg('dots', 'h-5 w-5') + '</button>' +
      '</li>';
  }

  function renderReports() {
    var ul = $('reports-list');
    var el = $('reports-refreshed');
    if (loading) {
      ul.innerHTML = '<li class="list-row items-start"><div class="flex-1 flex flex-col gap-2 py-1">' +
        '<span class="skeleton h-4 w-40"></span><span class="skeleton h-3.5 w-56"></span></div></li>' +
        '<li class="list-row items-start"><div class="flex-1 flex flex-col gap-2 py-1">' +
        '<span class="skeleton h-4 w-48"></span><span class="skeleton h-3.5 w-52"></span></div></li>';
      el.textContent = '';
      return;
    }
    if (failed && !usingCache) {
      ul.innerHTML = '<li class="state-error"><p class="text-body font-medium">' + esc(t('err.reports')) + '</p>' +
        '<p class="text-small text-muted">' + esc(t('err.still')) + '</p>' +
        '<button type="button" id="reports-retry" class="btn-secondary mt-1">' + esc(t('retry')) + '</button></li>';
      var rb = $('reports-retry');
      if (rb) rb.addEventListener('click', function () { loadReports(); });
      el.textContent = '';
      return;
    }
    var list = visibleReports();
    if (!list.length) {
      ul.innerHTML = '<li class="state-empty"><p class="text-body font-medium">' + esc(t('reports.empty')) + '</p>' +
        '<p class="text-small text-muted">' + esc(t('reports.empty.sub')) + '</p></li>';
      el.textContent = '';
      return;
    }
    ul.innerHTML = list.map(reportRowHtml).join('');
    if (failed && usingCache) {
      el.textContent = t('reports.offline', { time: fmtClock(usingCache.at) });
    } else {
      el.textContent = t('reports.updated', { time: fmtClock(usingCache ? usingCache.at : nowISO()) });
    }
    Array.prototype.forEach.call(ul.querySelectorAll('[data-menu]'), function (btn) {
      btn.addEventListener('click', function () {
        reportMenu(btn, Number(btn.closest('li').getAttribute('data-id')));
      });
    });
    Array.prototype.forEach.call(ul.querySelectorAll('[data-confirm]'), function (btn) {
      btn.addEventListener('click', function () {
        confirmReport(findReportById(Number(btn.getAttribute('data-confirm'))));
      });
    });
    Array.prototype.forEach.call(ul.querySelectorAll('[data-photo]'), function (btn) {
      btn.addEventListener('click', function () { showPhoto(btn.getAttribute('data-photo')); });
    });
  }

  function renderReportsAndTrail() {
    renderStatusBanner();
    renderStatus();
    renderReports();
    renderProfile();
    renderStops();
  }
  async function loadReports() {
    loading = true;
    failed = false;
    renderHeader();
    renderReportsAndTrail();
    var res = null;
    try { res = await api('/api/reports'); } catch (e) {}
    if (res && res.ok && res.data && res.data.reports) {
      reports = res.data.reports;
      failed = false;
      usingCache = null;
      lsSet('reportsCache', { at: nowISO(), reports: reports });
    } else {
      failed = true;
      var c = lsGet('reportsCache', null);
      if (c && c.reports) {
        usingCache = c;
        reports = c.reports;
      }
    }
    loading = false;
    renderReportsAndTrail();
    renderHeader();
    checkForNotifs();
    replayQueue();
  }

  // ── Packing tab ────────────────────────────────────────────────────────
  var packing = null;
  function savePacking() { lsSet('packing', packing); }
  function renderPacking() {
    $('days-value').textContent = String(packing.days);
    $('people-value').textContent = String(packing.people);
    var groups = P.buildPackingList({ days: packing.days, people: packing.people });
    var packedSet = {};
    (packing.packed || []).forEach(function (id) { packedSet[id] = true; });
    var GROUP_KEY = {
      'Shared by the group': 'group.shared',
      'Each person': 'group.each',
      'Food and water': 'group.food',
    };
    var total = 0, done = 0;
    var html = '';
    groups.forEach(function (g) {
      html += '<h2 class="section-label mt-5">' + esc(tx('pack.group.' + g.key, g.group)) + '</h2><ul class="list">';
      g.items.forEach(function (it) {
        total++;
        var isPacked = !!packedSet[it.id];
        if (isPacked) done++;
        var itLabel = tx('pack.' + it.id + '.label', it.label);
        html += '<li class="list-row' + (isPacked ? ' bg-raised/40' : '') + '">' +
          '<input type="checkbox" class="pack-box mt-0.5 h-5 w-5 flex-none accent-accent" data-pack="' + it.id + '"' + (isPacked ? ' checked' : '') + ' aria-label="' + esc(itLabel) + '">' +
          '<div class="min-w-0 flex-1"><p class="text-body' + (isPacked ? ' line-through decoration-line' : '') + '">' + esc(itLabel) + '</p>' +
          '<p class="text-small text-muted">' + esc(tx('pack.' + it.id + '.note', it.note)) + '</p></div>' +
          '<span class="flex-none text-small text-muted">× ' + it.qty + (it.unit ? ' ' + it.unit : '') + '</span></li>';
      });
      html += '</ul>';
    });
    $('packing-groups').innerHTML = html;
    $('packed-count').textContent = t('pack.count', { done: done, total: total });
    Array.prototype.forEach.call(document.querySelectorAll('.pack-box'), function (box) {
      box.addEventListener('change', function () {
        var id = box.getAttribute('data-pack');
        var set = {};
        (packing.packed || []).forEach(function (x) { set[x] = true; });
        if (box.checked) set[id] = true; else delete set[id];
        packing.packed = Object.keys(set);
        savePacking();
        renderPacking();
      });
    });
  }
  function wirePacking() {
    function step(which, delta) {
      if (which === 'days') packing.days = Math.min(5, Math.max(1, packing.days + delta));
      else packing.people = Math.min(12, Math.max(1, packing.people + delta));
      savePacking();
      renderPacking();
    }
    $('days-minus').addEventListener('click', function () { step('days', -1); });
    $('days-plus').addEventListener('click', function () { step('days', 1); });
    $('people-minus').addEventListener('click', function () { step('people', -1); });
    $('people-plus').addEventListener('click', function () { step('people', 1); });
    $('packing-reset').addEventListener('click', function () {
      try {
        if (window.unNative && typeof unNative.alert === 'function') {
          unNative.alert({
            title: t('reset.title'),
            message: t('reset.msg'),
            buttons: [
              { label: t('cancel'), style: 'cancel' },
              { label: t('pack.reset'), style: 'destructive', handler: function () { resetPacking(); } },
            ],
          });
          return;
        }
      } catch (e) {}
      if (window.confirm(t('reset.title') + ' ' + t('reset.msg'))) resetPacking();
    });
  }
  function resetPacking() {
    packing.packed = [];
    savePacking();
    renderPacking();
    kitToast(t('toast.cleared'));
  }

  // ── Location tab ───────────────────────────────────────────────────────
  var AUTO_FIX_MS = 20 * 60000;
  var fixInFlight = false;
  var autoLocOn = false;
  function nearestLine(loc) {
    var n = M.nearestStop(loc.lat, loc.lng);
    var d = Math.round(n.meters / 10) * 10;
    if (n.meters > 2000) {
      return t('loc.far', { km: fmtKm(n.meters / 1000) });
    }
    return t('loc.near', { d: d, name: n.stop.name, elev: fmtM(n.stop.elevM) });
  }
  function renderLocation() {
    var loc = lsGet('location', null);
    var body = $('loc-body');
    if (loc) {
      var acc = loc.accuracy ? t('loc.within', { m: Math.round(loc.accuracy) }) : '';
      body.innerHTML = '<p class="font-semibold tabular-nums">' + loc.lat.toFixed(5) + ', ' + loc.lng.toFixed(5) + esc(acc) + '</p>' +
        '<p class="mt-0.5 text-small text-muted">' + esc(nearestLine(loc)) + esc(t('loc.taken', { time: fmtClock(loc.at) })) + '</p>' +
        (autoLocOn ? '<p class="mt-0.5 text-small text-muted">' + esc(t('loc.auto')) + '</p>' : '');
    } else {
      body.innerHTML = '<p class="text-body text-muted">' + esc(t('loc.none')) + '</p>';
    }
    renderLocSync();
    $('coords-copy').hidden = !loc;
    renderMsgPreview();
  }
  // The one status line under the coordinates: has the latest location
  // reached Mountain Trail yet? Same style as the "Guide saved for offline
  // use" line on the Trail tab.
  var locSending = null;   // clientId of the location request in flight
  function renderLocSync() {
    var el = $('loc-sync');
    if (!el) return;
    var loc = lsGet('location', null);
    var html = null;
    if (loc && loc.clientId) {
      if (locSending === loc.clientId) {
        html = iconSvg('clock', 'h-4 w-4') + ' ' + esc(t('loc.sending'));
      } else if (loc.sentAt) {
        html = '<span class="text-accent">' + iconSvg('check', 'h-4 w-4') + '</span> ' + esc(t('loc.sent', { time: fmtClock(loc.sentAt) }));
      } else if (loc.sendFailed) {
        html = iconSvg('warning', 'h-4 w-4') + ' ' + esc(t('loc.sendfail'));
      } else {
        var queued = false;
        queueAll().forEach(function (e) { if (e.kind === 'location' && e.clientId === loc.clientId) queued = true; });
        if (queued) {
          html = iconSvg('clock', 'h-4 w-4') + ' ' + esc(t('loc.queued'));
        }
      }
    }
    if (html) {
      el.hidden = false;
      el.innerHTML = html;
    } else {
      el.hidden = true;
      el.textContent = '';
    }
  }
  // Send the latest location to the server, queued in the offline queue
  // first so closing the app mid-request cannot lose it. At most one
  // location ever waits: a newer one replaces an older queued entry.
  function sendLocation(loc) {
    var entry = { kind: 'location', clientId: loc.clientId, lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy, at: loc.at };
    var q = queueAll().filter(function (e) { return e.kind !== 'location'; });
    q.push(entry);
    queueSave(q);
    return postLocation(entry);
  }
  // Returns true when the entry is settled (sent, or refused for good —
  // it was removed from the queue), false when it should stay queued.
  async function postLocation(entry) {
    locSending = entry.clientId;
    renderLocSync();
    var res = null;
    try {
      res = await api('/api/locations', {
        method: 'POST',
        body: { clientId: entry.clientId, lat: entry.lat, lng: entry.lng, accuracy: entry.accuracy, at: entry.at },
      });
    } catch (e) {}
    var settled = false;
    if (res && res.ok && res.data && res.data.location) {
      queueRemove(entry.clientId);
      var loc = lsGet('location', null);
      if (loc && loc.clientId === entry.clientId) {
        loc.sentAt = res.data.location.receivedAt;
        delete loc.sendFailed;
        lsSet('location', loc);
      }
      settled = true;
    } else if (res && res.status >= 400 && res.status < 500 && res.status !== 401) {
      // Mountain Trail refused it (bad coordinates, an expired client_id);
      // drop it rather than retry forever, matching reports.
      queueRemove(entry.clientId);
      var loc2 = lsGet('location', null);
      if (loc2 && loc2.clientId === entry.clientId) {
        loc2.sendFailed = true;
        lsSet('location', loc2);
      }
      settled = true;
    }
    // Anything else (no connection, 401, 500): the entry stays queued and a
    // later replay tries again.
    locSending = null;
    renderLocSync();
    return settled;
  }
  function fmtWhen(iso) {
    var d = new Date(iso);
    if (!isFinite(d.getTime())) return '';
    var months = I18N.months(LANG);
    var h = d.getHours(), m = d.getMinutes();
    var time = (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    var date = d.getDate() + ' ' + months[d.getMonth()];
    return LANG === 'id' ? 'pukul ' + time + ', ' + date : time + ' on ' + date;
  }
  function buildMessage() {
    var loc = lsGet('location', null);
    var name = ($('name-field').value || '').trim();
    var contact = ($('contact-field').value || '').trim();
    var parts = [];
    parts.push(t('msg.who', { name: name || t('msg.hiker') }));
    if (loc) {
      parts.push(t('msg.loc', {
        when: fmtWhen(loc.at),
        coords: loc.lat.toFixed(5) + ', ' + loc.lng.toFixed(5),
        acc: loc.accuracy ? t('loc.within', { m: Math.round(loc.accuracy) }) : '',
        near: nearestLine(loc),
      }));
      parts.push(t('msg.map', { url: 'https://www.google.com/maps?q=' + loc.lat.toFixed(5) + ',' + loc.lng.toFixed(5) }));
    } else {
      parts.push(t('msg.noloc'));
    }
    if (contact) parts.push(t('msg.contact', { contact: contact }));
    parts.push(t('msg.emergency'));
    return parts.join(' ');
  }
  function contactValue() {
    return ($('contact-field').value || '').trim();
  }
  function renderMsgPreview() {
    var text = buildMessage();
    $('msg-preview').textContent = text;
    var contact = contactValue();
    // Real anchors: the user's tap opens them directly, which a
    // cross-origin frame needs. No window.open.
    $('wa-btn').href = S.whatsappUrl(text, contact);
    $('sms-btn').href = S.smsUrl(text, contact);
  }

  // ── Share queue: messages tapped with no signal, kept on the phone ─────
  var SHARE_QUEUE_MAX = 5;
  var shareQueueRefreshing = null; // the Back online sheet's re-render, while open
  function shareQueueAll() { return lsGet('shareQueue', []); }
  function shareQueueSave(q) { lsSet('shareQueue', q); }
  function shareQueueAdd(entry) {
    shareQueueSave(S.queueWith(shareQueueAll(), entry, SHARE_QUEUE_MAX));
  }
  function shareQueueRemove(id) {
    shareQueueSave(shareQueueAll().filter(function (e) { return e.id !== id; }));
  }
  function renderShareQueue() {
    var q = shareQueueAll();
    $('share-queue-wrap').hidden = q.length === 0;
    var ul = $('share-queue');
    ul.textContent = '';
    shareQueueRows(afterQueueChange).forEach(function (row) { ul.appendChild(row); });
  }
  function afterQueueChange() {
    renderShareQueue();
    if (shareQueueRefreshing) shareQueueRefreshing();
  }
  // One li per waiting message. Message text goes in with textContent,
  // never innerHTML. Removing a row happens on the next tick so the tap's
  // navigation to WhatsApp or SMS is not interrupted.
  function shareQueueRows(onChange) {
    var contact = contactValue();
    var rows = [];
    shareQueueAll().forEach(function (entry) {
      var li = document.createElement('li');
      li.className = 'list-row items-start';
      var body = document.createElement('div');
      body.className = 'min-w-0 flex-1';
      li.appendChild(body);
      var title = document.createElement('p');
      title.className = 'text-body';
      title.textContent = t('share.from', { when: fmtWhen(entry.at) });
      body.appendChild(title);
      if (entry.coords) {
        var coords = document.createElement('p');
        coords.className = 'text-small text-muted tabular-nums';
        coords.textContent = entry.coords;
        body.appendChild(coords);
      }
      var grid = document.createElement('div');
      grid.className = 'mt-2 grid grid-cols-3 gap-2';
      var wa = document.createElement('a');
      wa.className = 'btn-secondary';
      wa.target = '_blank';
      wa.rel = 'noopener';
      wa.setAttribute('aria-label', t('share.wa'));
      wa.textContent = 'WhatsApp';
      wa.href = S.whatsappUrl(entry.text, contact);
      wa.addEventListener('click', function (e) {
        if (!navigator.onLine) {
          e.preventDefault();
          kitToast(t('toast.nosignal'));
          return;
        }
        setTimeout(function () { shareQueueRemove(entry.id); onChange(); }, 0);
      });
      var sms = document.createElement('a');
      sms.className = 'btn-secondary';
      sms.target = '_blank';
      sms.rel = 'noopener';
      sms.setAttribute('aria-label', t('share.sms'));
      sms.textContent = 'SMS';
      sms.href = S.smsUrl(entry.text, contact);
      sms.addEventListener('click', function () {
        setTimeout(function () { shareQueueRemove(entry.id); onChange(); }, 0);
      });
      var rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'btn-secondary';
      rm.textContent = t('share.remove');
      rm.addEventListener('click', function () {
        shareQueueRemove(entry.id);
        onChange();
      });
      grid.appendChild(wa);
      grid.appendChild(sms);
      grid.appendChild(rm);
      body.appendChild(grid);
      rows.push(li);
    });
    return rows;
  }
  function maybeShareSheet() {
    if (shareQueueRefreshing) return; // a queue sheet is already open
    if (!shareQueueAll().length) return;
    var wrap = document.createElement('div');
    wrap.className = 'flex flex-col gap-3 p-4';
    var h = document.createElement('h2');
    h.className = 'font-display text-heading';
    h.textContent = t('share.back');
    wrap.appendChild(h);
    var p = document.createElement('p');
    p.className = 'text-body text-muted';
    wrap.appendChild(p);
    var ul = document.createElement('ul');
    ul.className = 'list mt-3';
    wrap.appendChild(ul);
    var handle = presentSheet(wrap);
    function close() {
      shareQueueRefreshing = null;
      handle.dismiss();
    }
    shareQueueRefreshing = function () {
      var q = shareQueueAll();
      p.textContent = q.length === 1
        ? tn('share.ready', 1)
        : tn('share.ready', q.length);
      ul.textContent = '';
      shareQueueRows(function () {
        renderShareQueue();
        if (!shareQueueAll().length) close();
      }).forEach(function (row) { ul.appendChild(row); });
    };
    shareQueueRefreshing();
  }
  function seedDemoShare() {
    if (lsGet('seededShare', false)) return;
    var loc = lsGet('location', null);
    shareQueueAdd({
      id: uuid(),
      text: buildMessage(),
      coords: loc ? S.coordsLine(loc.lat, loc.lng) : null,
      at: new Date(nowDate().getTime() - 20 * 60000).toISOString(),
    });
    lsSet('seededShare', true);
  }
  function wireLocation() {
    function takeFix(onOk, onFail) {
      if (fixInFlight || !('geolocation' in navigator)) return;
      fixInFlight = true;
      navigator.geolocation.getCurrentPosition(function (pos) {
        fixInFlight = false;
        var loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, at: nowISO() };
        // With an account the location is also sent to Mountain Trail
        // (queued while offline); guests keep it on the phone only, as
        // before, and see no status line.
        if (ME.user) {
          loc.clientId = uuid();
          lsSet('location', loc);
          sendLocation(loc);
        } else {
          lsSet('location', loc);
        }
        if (onOk) onOk(pos);
      }, function () {
        fixInFlight = false;
        if (onFail) onFail();
      }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
    }
    $('loc-update').addEventListener('click', async function () {
      if (fixInFlight) return;
      var status = $('loc-status');
      if (window.usernode && typeof window.usernode.requestPermission === 'function') {
        try {
          var r = await window.usernode.requestPermission('geolocation');
          if (r && r.state !== 'granted') {
            status.textContent = t('loc.perm');
            return;
          }
          if (r && r.active === false) return; // granted; the frame reloads
        } catch (e) {}
      }
      if (!('geolocation' in navigator)) {
        status.textContent = t('loc.nodevice');
        return;
      }
      status.textContent = t('loc.finding');
      takeFix(function () {
        status.textContent = '';
        renderLocation();
        buildPicker();
        renderPickerHint();
        kitToast(t('toast.loc'));
      }, function () {
        status.textContent = t('loc.findfail');
      });
    });
    async function autoLocationTick() {
      if (fixInFlight || !('geolocation' in navigator)) return;
      var granted = false;
      try {
        if (window.usernode && typeof window.usernode.getPermission === 'function') {
          var p = await window.usernode.getPermission('geolocation');
          var cap = typeof window.usernode.hasCapability === 'function' ? window.usernode.hasCapability('geolocation') : true;
          granted = !!p && p.state === 'granted' && p.active !== false && cap !== false;
        } else if (navigator.permissions && typeof navigator.permissions.query === 'function') {
          var q = await navigator.permissions.query({ name: 'geolocation' });
          granted = q.state === 'granted';
        }
      } catch (e) { granted = false; }
      var was = autoLocOn;
      autoLocOn = granted;
      if (was !== autoLocOn) renderLocation();
      if (!autoLocOn) return;
      var loc = lsGet('location', null);
      if (loc && loc.at) {
        var t = new Date(loc.at).getTime();
        if (isFinite(t) && nowDate().getTime() - t < AUTO_FIX_MS) return;
      }
      takeFix(function () {
        renderLocation();
        renderPickerHint();
      }, function () {});
    }
    function savedField(id, key) {
      var el = $(id);
      el.value = lsGet(key, '') || '';
      el.addEventListener('input', function () {
        lsSet(key, el.value.trim());
        renderMsgPreview();
      });
    }
    savedField('name-field', 'name');
    savedField('contact-field', 'contact');
    $('share-btn').addEventListener('click', async function () {
      var text = buildMessage();
      if (navigator.share) {
        try { await navigator.share({ text: text }); return; } catch (e) {
          if (e && e.name === 'AbortError') return;
        }
      }
      copyMessage(text);
    });
    $('copy-btn').addEventListener('click', function () { copyMessage(buildMessage()); });
    $('coords-copy').addEventListener('click', function () {
      var loc = lsGet('location', null);
      if (loc) copyMessage(S.coordsLine(loc.lat, loc.lng), t('toast.coords'));
    });
    // Offline, WhatsApp cannot open: keep the message on the phone instead.
    // Online, the anchor opens wa.me as normal.
    $('wa-btn').addEventListener('click', function (e) {
      if (!navigator.onLine) {
        e.preventDefault();
        var loc = lsGet('location', null);
        shareQueueAdd({
          id: uuid(),
          text: buildMessage(),
          coords: loc ? S.coordsLine(loc.lat, loc.lng) : null,
          at: nowISO(),
        });
        renderShareQueue();
        kitToast(t('toast.saved.offline'));
      }
    });
    autoLocationTick();
    setInterval(autoLocationTick, 60000);
  }
  async function copyMessage(text, doneMsg) {
    var done = doneMsg || t('toast.copied');
    try {
      await navigator.clipboard.writeText(text);
      kitToast(done);
      return;
    } catch (e) {}
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      kitToast(done);
    } catch (e) {
      kitToast(t('toast.copyfail'));
    }
  }

  // ── Demo seeding (staging, ?demo=1) ────────────────────────────────────
  function seedDemo() {
    if (lsGet('seeded', false)) return;
    lsSet('packing', { days: 2, people: 4, packed: ['permit', 'tent', 'stove', 'gas', 'first-aid', 'rain-jacket', 'headlamp', 'water', 'meals'] });
    var here = STOP_BY_ID['air-panas'];
    lsSet('location', {
      lat: here.lat + 0.0011, lng: here.lng, accuracy: 12,
      at: new Date(nowDate().getTime() - 2 * 60000).toISOString(),
      // Seeded as already sent so the status line can be seen in the demo;
      // it was never queued, so nothing real is sent for it.
      clientId: 'demo-location',
      sentAt: new Date(nowDate().getTime() - 2 * 60000).toISOString(),
    });
    lsSet('name', 'Demo hiker');
    lsSet('contact', '0800 0000 000 (demo)');
    // The demo shows the banner's warning look and a climb date in the
    // window, so the weather warning is visible too. Seeded once; the
    // plain route keeps the shipped "open" and no climb date.
    lsSet('statusOverride', { level: 'limited', reason: 'weather' });
    lsSet('follows', ['gede-pangrango']);
    lsSet('climbDate', dayKeyOffset(1));
    // Seeded notifications: one unread (the status change the override
    // stands for) and one already read. The 'seen' snapshot carries
    // reportsSig 'seed' so the first real check counts from this baseline
    // instead of announcing every seeded report as new.
    lsSet('notifs', [
      { key: 'notif.statusChanged', params: { level: 'limited' }, at: new Date(nowDate().getTime() - 30 * 60000).toISOString(), read: false },
      { key: 'notif.newReportsOne', params: {}, at: new Date(nowDate().getTime() - 3 * 3600000).toISOString(), read: true },
    ]);
    lsSet('seen', { statusSig: statusSig(), quotaSig: quotaSig(), weatherSig: weatherSig(), reportsSig: 'seed' });
    lsSet('seeded', true);
  }
  // 'YYYY-MM-DD' for now's UTC day plus n days; the climb-date input's
  // format and status.js's day keys.
  function dayKeyOffset(n) {
    var d = nowDate();
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }

  // ── Offline / service worker ───────────────────────────────────────────
  function registerSw() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').then(function () {
      swReady = true;
      renderHeader();
    }).catch(function (e) {
      console.info('Mountain Trail: offline cache not registered (' + ((e && e.message) || e) + ')');
    });
  }

  // ── Boot ───────────────────────────────────────────────────────────────
  async function boot() {
    applyStaticText();
    renderLangButtons();
    wireLang();
    picker = $('stop-picker');
    // The guide is part of the app, so it renders from trail-data at once,
    // before anything waits on the network: header, profile and all nine
    // stops now, skeleton bars only where the reports will land.
    renderReportsAndTrail();
    renderHeader(); // the header too, so it never shifts while reports load
    try {
      var me = await api('/api/me');
      if (me && me.ok && me.data) {
        ME = me.data;
        demo = ME.demo === true;
      }
    } catch (e) {}
    if (demo) {
      $('demo-line').hidden = false;
      seedDemo();
    }
    packing = lsGet('packing', null) || { days: 2, people: 1, packed: [] };
    buildPicker();
    wirePacking();
    wireLocation();
    if (demo) seedDemoShare(); // after wireLocation fills the name and contact fields
    wirePhotoInput();
    wireNotifs();
    renderPacking();
    renderPermits();
    renderWeather();
    renderLocation();
    renderShareQueue();
    if (navigator.onLine && shareQueueAll().length) {
      kitToast(t('toast.queued'));
    }
    renderReportsAndTrail();
    renderPickerHint();
    wireCatalogSearch();
    renderMountainsRoute(); // the shipped catalog, before anything waits on the network
    TABS.forEach(function (name) {
      $('tabbtn-' + name).addEventListener('click', function () {
        // Tapping the Mountains tab itself returns to the list, not the page
        // the tab was last left on; the back link does that on purpose.
        if (name === 'mountains' && currentMountain) {
          try { history.replaceState(null, '', '#mountains'); } catch (e) {}
        }
        switchTab(name);
      });
    });
    var startTab = tabFromHash() || lsGet('tab', null) || 'mountains';
    switchTab(startTab);
    Array.prototype.forEach.call(document.querySelectorAll('.condition-button'), function (btn) {
      btn.addEventListener('click', function () { sendReport(btn.getAttribute('data-cond')); });
    });
    picker.addEventListener('change', function () {
      lsSet('lastStop', picker.value);
      renderPickerHint();
    });
    registerSw();
    try {
      if (window.unNative && typeof unNative.attachPullToRefresh === 'function') {
        unNative.attachPullToRefresh(window, function () { return loadReports(); }, { content: $('app-main') });
      }
    } catch (e) {}
    window.addEventListener('online', function () {
      renderHeader();
      replayQueue();
      loadReports();
      maybeShareSheet();
      loadOverrides().then(renderMountainsRoute); // fresh approved corrections
    });
    window.addEventListener('offline', renderHeader);
    // Approved corrections and, for an admin, the review queue: both merge
    // into the already-rendered catalog when they land.
    loadOverrides().then(renderMountainsRoute);
    loadPendingEdits().then(function () {
      if (ME.admin && !currentMountain) renderAdminCard();
    });
    loadReports();
    window.addEventListener('offline', renderHeader);
    loadReports();
  }

  // The Notifications controls.
  function wireNotifs() {
    var follow = $('follow-toggle');
    if (follow) follow.addEventListener('change', function () {
      var follows = lsGet('follows', []);
      var at = follows.indexOf(MOUNTAIN.id);
      if (follow.checked) {
        if (at < 0) follows.push(MOUNTAIN.id);
      } else if (at >= 0) {
        follows.splice(at, 1);
      }
      lsSet('follows', follows);
      checkForNotifs();
      renderNotifs();
    });
    var read = $('notif-read');
    if (read) read.addEventListener('click', function () {
      lsSet('notifs', lsGet('notifs', []).map(function (n) {
        return Object.assign({}, n, { read: true });
      }));
      renderNotifs();
    });
  }
  // A toast fallback and a plain-overlay fallback live here so a missing
  // native kit still reads as the app. The fallback toast clears the tab
  // bar (68 px + the safe-area inset) by 12 px, as the kit's own toast does.
  var style = document.createElement('style');
  style.textContent =
    '.toast-fallback{position:fixed;left:50%;bottom:calc(80px + var(--un-safe-inset-bottom, env(safe-area-inset-bottom, 0px)));transform:translateX(-50%);z-index:60;background:rgb(var(--fg));color:rgb(var(--ground));padding:10px 16px;border-radius:9999px;font-size:14px;line-height:20px;max-width:90vw}' +
    '.overlay-fallback{position:fixed;inset:0;z-index:50;display:flex;align-items:flex-end;justify-content:center;background:rgb(var(--fg)/0.4);padding:16px}' +
    '.overlay-card{width:100%;max-width:26rem;background:rgb(var(--surface));border-radius:1rem;padding:8px;max-height:80vh;overflow:auto}';
  document.head.appendChild(style);

  boot().catch(function (e) {
    console.error('Mountain Trail: boot failed', e && (e.stack || e.message || e));
  });
})();
