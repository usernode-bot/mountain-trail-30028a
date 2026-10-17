/*
 * Mountain Trail's whole UI. Hash routing for the four tabs; the guide and
 * packing rules come from trail-data.js and packing.js; reports go through
 * the server; the checklist, last location, name and contact live only in
 * localStorage. A location taken with an account is also sent to the server
 * (queued offline, replayed on reconnect) but is shown to nobody. Every
 * class name is written as a whole literal so the precompiled Tailwind build
 * can see it.
 */
(function () {
  'use strict';

  var M = window.MT_TRAIL;
  var P = window.MT_PACKING;
  var S = window.MT_SHARE;
  var I18N = window.MT_I18N;
  var ST = window.MT_STATUS;
  var MOUNTAIN = M.MOUNTAIN;
  var STOPS = M.STOPS;
  var STOP_BY_ID = M.STOP_BY_ID;
  var COND_BY_ID = M.COND_BY_ID;

  // ── Small helpers ──────────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ── Language: the hiker's own choice, then the platform locale, then the
  //    device, then English. One LANG for the whole app; rerenderAll()
  //    re-renders every screen when it changes. ───────────────────────────
  var LANG = 'en';
  function t(key, vars) { return I18N.t(LANG, key, vars); }
  function fmtNum(n) { return Number(n).toLocaleString(LANG === 'id' ? 'id-ID' : 'en-US'); }
  function fmtM(n) { return fmtNum(n); }
  function fmtAgo(ms) {
    if (typeof ms !== 'number' || !isFinite(ms) || ms < 0) ms = 0;
    var min = Math.floor(ms / 60000);
    if (min < 1) return t('ago.now');
    if (min < 60) return t('ago.min', { n: min });
    var h = Math.floor(min / 60);
    if (h < 24) return h === 1 ? t('ago.hourOne') : t('ago.hourMany', { n: h });
    return t('ago.overDay');
  }
  var MONTHS = {
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    id: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
  };
  // "14:28, 10 Oct" — hour and minute are the ride leader's clock, the day
  // name follows the chosen language.
  function fmtWhen(iso) {
    var d = new Date(iso);
    if (!isFinite(d.getTime())) return '';
    var h = d.getHours(), m = d.getMinutes();
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m + ', ' + d.getDate() + ' ' + MONTHS[LANG][d.getMonth()];
  }
  function condLabel(id) {
    if (I18N.has(LANG, 'cond.' + id)) return t('cond.' + id);
    return COND_BY_ID[id] ? COND_BY_ID[id].label : id;
  }
  function levelLabel(level) { return t('banner.' + level); }
  // Fills every [data-i18n] span, [data-i18n-ph] placeholder and
  // [data-i18n-aria] label in the static HTML.
  function applyI18n() {
    document.documentElement.lang = LANG;
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-ph]'), function (el) {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph')));
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-aria]'), function (el) {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });
  }
  function fmtKm(km) { return km % 1 === 0 ? String(km) : km.toFixed(1); }
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
  };
  function iconSvg(name, cls) {
    return '<svg class="' + cls + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[name] + '</svg>';
  }
  var KIND_ICON = { summit: 'summit', camp: 'tent', basecamp: 'basecamp', post: 'post', water: 'drop' };
  function stopIcon(stop) {
    var order = ['summit', 'camp', 'basecamp', 'post', 'water'];
    for (var i = 0; i < order.length; i++) {
      if (stop.kinds.indexOf(order[i]) >= 0) return KIND_ICON[order[i]];
    }
    return 'post';
  }

  // ── Token, demo mode and storage ───────────────────────────────────────
  var TOKEN = '';
  var PAGE_DEMO = /[?&]demo=1/.test(location.search);
  try { TOKEN = new URLSearchParams(location.search).get('token') || ''; } catch (e) {}
  var demo = false; // switched on when /api/me says so
  var ME = { user: null, guest: false, demo: false };

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
  var expandedStop = null;
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
        if ('confirmedByMe' in o) copy.confirmedByMe = o.confirmedByMe;
        if ('confirmCount' in o) copy.confirmCount = o.confirmCount;
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
  function askForAccount() {
    try {
      if (window.usernode && typeof window.usernode.askForAccount === 'function') {
        window.usernode.askForAccount({ action: t('account.report') });
        return;
      }
    } catch (e) {}
    kitToast(t('account.fallback'));
  }

  // ── Tabs ───────────────────────────────────────────────────────────────
  var TABS = ['trail', 'report', 'packing', 'location'];
  function switchTab(name) {
    if (TABS.indexOf(name) < 0) name = 'trail';
    TABS.forEach(function (t) {
      $('tab-' + t).hidden = t !== name;
      var btn = $('tabbtn-' + t);
      btn.classList.toggle('tab-item-on', t === name);
      btn.setAttribute('aria-selected', t === name ? 'true' : 'false');
    });
    if (location.hash !== '#' + name) {
      try { history.replaceState(null, '', '#' + name); } catch (e) {}
    }
    lsSet('tab', name);
  }
  function tabFromHash() {
    var h = (location.hash || '').replace('#', '');
    return TABS.indexOf(h) >= 0 ? h : null;
  }
  window.addEventListener('hashchange', function () {
    var t = tabFromHash();
    if (t) switchTab(t);
  });

  // ── Trail tab ──────────────────────────────────────────────────────────
  function renderHeader() {
    var line = $('offline-line');
    if (!navigator.onLine && usingCache) {
      line.hidden = false;
      line.innerHTML = iconSvg('clock', 'h-4 w-4') + ' ' + esc(t('offline.cache', { time: fmtClock(usingCache.at) }));
    } else if (swReady) {
      line.hidden = false;
      line.innerHTML = '<span class="text-accent">' + iconSvg('check', 'h-4 w-4') + '</span> ' + esc(t('offline.saved'));
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
  // The route line under the mountain's name, translated on every rerender.
  function renderRouteLine() {
    var el = $('mtn-route');
    if (!el) return;
    el.textContent = t('route.line', {
      summit: fmtM(MOUNTAIN.summitM),
      km: fmtNum(MOUNTAIN.lengthKm),
      climb: fmtM(MOUNTAIN.climbM),
      hours: t('route.hours', { min: MOUNTAIN.hoursUpMin, max: MOUNTAIN.hoursUpMax }),
    });
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
    el.className = 'status-strip mt-2.5';
    if (loading) {
      el.classList.add('status-strip-skeleton');
      el.removeAttribute('role');
      el.innerHTML = '<div class="flex-1 flex flex-col gap-2 py-1">' +
        '<span class="skeleton h-4 w-48"></span>' +
        '<span class="skeleton h-3.5 w-64"></span></div>';
      return;
    }
    if (failed) {
      el.innerHTML = '<div class="flex-1"><p class="text-body">' + esc(t('status.loadFail')) + '</p>' +
        '<p class="text-small text-muted">' + esc(t('status.loadFailSub')) + '</p></div>' +
        '<button type="button" id="status-retry" class="btn-secondary self-center">' + esc(t('status.retry')) + '</button>';
      $('status-retry').addEventListener('click', function () { loadReports(); });
      return;
    }
    var list = visibleReports();
    if (!list.length) {
      el.innerHTML = iconSvg('check', 'status-strip-icon') +
        '<div><p class="text-body font-medium">' + esc(t('status.noneTitle')) + '</p>' +
        '<p class="text-small text-muted">' + esc(t('status.noneSub')) + '</p></div>';
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
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', t('status.openStop', { stop: STOP_BY_ID[worst.stopId].name }));
    el.innerHTML = iconSvg(worst.condition, 'status-strip-icon') +
      '<div><p class="text-body font-medium">' + esc(condLabel(worst.condition)) + ' ' + esc(t('status.at')) + ' ' + esc(STOP_BY_ID[worst.stopId].name) + '</p>' +
      '<p class="text-small text-muted">' + esc(t('status.reported', { ago: fmtAgo(nowDate().getTime() - new Date(worst.createdAt).getTime()) })) +
      (others > 0 ? esc(others === 1 ? t('status.moreOne') : t('status.moreMany', { n: others })) : '.') + '</p></div>';
    function openWorst() {
      expandedStop = worst.stopId;
      renderStops();
      var row = document.getElementById('stop-' + worst.stopId);
      if (row) row.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
    el.onclick = openWorst;
    el.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openWorst(); } };
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
    $('profile').innerHTML =
      '<svg viewBox="0 0 358 80" class="block w-full" role="img" aria-label="' + esc(t('profile.aria')) + '">' +
      '<line x1="0" y1="77" x2="358" y2="77" style="stroke:rgb(var(--line));stroke-width:1"/>' +
      '<polyline class="profile-line" points="' + pts + '"/>' + dots + '</svg>';
    $('profile-ends').innerHTML = '<span>' + esc(t('profile.basecamp', { m: fmtM(STOPS[0].elevM) })) + '</span><span>' + esc(t('profile.summit', { m: fmtM(eMax) })) + '</span>';
  }

  function condLineHtml(stop) {
    var reps = latestForStop(stop.id);
    if (loading) {
      return '<p class="cond-line cond-line-none"><i></i><span class="skeleton h-3.5 w-32"></span></p>';
    }
    if (!reps.length) {
      return '<p class="cond-line cond-line-none"><i></i>' + esc(t('stops.none')) + '</p>';
    }
    var rep = reps[0];
    var c = COND_BY_ID[rep.condition];
    var extra = reps.length > 1 ? esc(t('cond.more', { n: reps.length - 1 })) : '';
    var waiting = rep.pending && rep.waiting ? esc(t('cond.waiting')) : '';
    return '<p class="cond-line cond-line-' + (c.tone === 'danger' ? 'danger' : 'warn') + '"><i></i>' +
      esc(condLabel(rep.condition)) + ', ' + esc(fmtAgo(nowDate().getTime() - new Date(rep.createdAt).getTime())) + extra + waiting + '</p>';
  }

  function stopTone(stop) {
    var reps = latestForStop(stop.id);
    if (!reps.length || loading) return '';
    var c = COND_BY_ID[reps[0].condition];
    return c.tone === 'danger' ? ' stop-node-danger' : (c.tone === 'warn' ? ' stop-node-warn' : '');
  }

  function renderStops() {
    var ol = $('trail-line');
    var html = '';
    STOPS.forEach(function (s, i) {
      var open = expandedStop === s.id;
      var facs = '';
      if (s.kinds.indexOf('water') >= 0) {
        facs += '<span class="fac-water">' + iconSvg('drop', 'h-4 w-4') + esc(t('fac.water')) + '</span>';
      }
      if (s.kinds.indexOf('camp') >= 0 || s.kinds.indexOf('basecamp') >= 0) {
        facs += '<span>' + iconSvg('tent', 'h-4 w-4') + esc(t('fac.camp')) + '</span>';
      }
      html += '<li class="stop-row" id="stop-' + s.id + '" data-stop="' + s.id + '">' +
        '<span class="stop-node' + stopTone(s) + '">' + iconSvg(stopIcon(s), 'h-5 w-5') + '</span>' +
        '<div class="stop-body">' +
        '<p class="text-body font-semibold">' + esc(s.name) + '</p>' +
        '<p class="mt-1 text-small text-muted">' + fmtM(s.elevM) + ' m, km ' + fmtKm(s.km) + '. ' +
        esc(I18N.has(LANG, 'stop.' + s.id) ? t('stop.' + s.id) : s.short) + '</p>' +
        (facs ? '<p class="fac">' + facs + '</p>' : '') +
        condLineHtml(s) +
        (open ? expandedHtml(s) : '') +
        '</div></li>';
      if (s.legToNext) {
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
        '<span class="report-icon report-icon-' + (c.tone === 'danger' ? 'danger' : 'warn') + '">' + iconSvg(r.condition, 'h-4 w-4') + '</span>' +
        '<div class="min-w-0 flex-1"><p class="text-body font-medium">' + esc(condLabel(r.condition)) + '</p>' +
        '<p class="text-small text-muted">' + (r.mine ? esc(t('who.you')) : esc(r.username)) + ', ' + esc(fmtAgo(nowDate().getTime() - new Date(r.createdAt).getTime())) + '</p>' +
        (r.note ? '<p class="mt-0.5 text-small">' + esc(r.note) + '</p>' : '') + '</div></li>';
    }).join('');
    return '<p class="mt-2 text-body">' +
      esc(I18N.has(LANG, 'stop.' + s.id + '.detail') ? t('stop.' + s.id + '.detail') : s.detail) + '</p>' +
      (rows ? '<ul class="list mt-3">' + rows + '</ul>' : '<p class="mt-2 text-small text-muted">' + esc(t('stops.noneHere')) + '</p>') +
      '<button type="button" class="btn-secondary mt-3" data-report-here="' + s.id + '">' + esc(t('stops.reportHere')) + '</button>';
  }

  function fmtLeg(leg) {
    var min = leg.min;
    var h = Math.floor(min / 60), m = min % 60;
    var t = h > 0 ? (h + ' h' + (m ? ' ' + m + ' min' : '')) : m + ' min';
    return t + ', +' + fmtM(leg.climbM) + ' m';
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
        ? t('report.whereClosest', { ago: fmtAgo(nowDate().getTime() - new Date(loc.at).getTime()) })
        : t('report.whereOther', { stop: n.stop.name });
    } else if (lsGet('lastStop', null) && STOP_BY_ID[lsGet('lastStop', null)]) {
      hint = t('report.whereLast');
    } else {
      hint = t('report.whereDefault');
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
      kitToast(t('report.sendFail'));
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
    el.innerHTML = '<p class="text-body font-semibold">' + esc(t('sent.title', { cond: condLabel(entry.condition), stop: stop.name })) + '</p>' +
      '<p class="mt-0.5 text-small text-muted">' + esc(entry.waiting ? t('sent.queued') : t('sent.live')) + '</p>' +
      '<div class="mt-3 flex flex-wrap items-center gap-2">' +
      '<button type="button" class="btn-secondary" data-act="photo">' + iconSvg('camera', 'h-5 w-5') + esc(t('sent.photo')) + '</button>' +
      '<button type="button" class="btn-secondary" data-act="note">' + iconSvg('note', 'h-5 w-5') + esc(t('sent.note')) + '</button>' +
      '<button type="button" class="btn-text" data-act="undo">' + esc(t('sent.undo')) + '</button></div>';
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
        kitToast(t('report.removed'));
      } else {
        kitToast(t('report.removeFail'));
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
      '<textarea id="note-box" class="field" rows="3" maxlength="200" placeholder="' + esc(t('note.placeholder')) + '"></textarea>' +
      '<p class="text-small text-muted"><span id="note-count">0</span></p>' +
      '<div class="flex justify-end gap-2">' +
      '<button type="button" class="btn-secondary" data-close>' + esc(t('note.cancel')) + '</button>' +
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
      kitToast(t('note.added'));
      return;
    }
    api('/api/reports/' + r.id, { method: 'PATCH', body: { note: text } }).then(function (res) {
      if (res.ok && res.data && res.data.report) {
        var live = null;
        reports.forEach(function (x) { if (x.id === r.id) live = x; });
        if (live) live.note = res.data.report.note;
        kitToast(t('note.added'));
      } else {
        kitToast(t('note.fail'));
      }
      renderReportsAndTrail();
    });
  }

  var photoTarget = null;
  function addPhoto(entryOrReport) {
    var r = entryOrReport;
    if (!navigator.onLine) {
      kitToast(t('photo.needConnection'));
      return;
    }
    if (!window.usernode || typeof window.usernode.uploadFile !== 'function') {
      kitToast(t('photo.unavailable'));
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
          kitToast(t('photo.attached'));
          return;
        }
        if (isDemoRow(r)) {
          var ov = lsGet('overrides', {});
          ov[r.id] = Object.assign({}, ov[r.id], { photoUrl: url });
          lsSet('overrides', ov);
          renderReportsAndTrail();
          kitToast(t('photo.added'));
          return;
        }
        var res = await api('/api/reports/' + r.id, { method: 'PATCH', body: { photoUrl: url, photoId: pid } });
        if (res.ok && res.data && res.data.report) {
          var live = null;
          reports.forEach(function (x) { if (x.id === r.id) live = x; });
          if (live) { live.photoUrl = res.data.report.photoUrl; live.photoId = pid; }
          kitToast(t('photo.added'));
        } else {
          kitToast(t('photo.fail'));
        }
        renderReportsAndTrail();
      } catch (e) {
        kitToast(t('photo.unavailableNow'));
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
      kitToast(t('report.removed'));
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
        kitToast(t('report.removed'));
      } else {
        kitToast(t('report.removeFail'));
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
      kitToast(t('report.flagged'));
      return;
    }
    api('/api/reports/' + r.id + '/flag', { method: 'POST' }).then(function (res) {
      if (res.ok) {
        reports = reports.filter(function (x) { return x.id !== r.id; });
        kitToast(t('report.flagged'));
      } else if (res.status === 400) {
        kitToast(t('report.flagOwn'));
      } else {
        kitToast(t('report.flagFail'));
      }
      renderReportsAndTrail();
    });
  }

  // "Still valid": one tap from another hiker keeps a report's 24-hour
  // window alive. Guests are asked for an account; offline it stays a toast.
  async function confirmReport(r) {
    if (!ME.user) { askForAccount(); return; }
    if (!navigator.onLine) { kitToast(t('confirm.offline')); return; }
    if (isDemoRow(r)) {
      var ov = lsGet('overrides', {});
      var o = ov[r.id] || {};
      o.confirmedByMe = true;
      o.confirmCount = (r.confirmCount || 0) + 1;
      ov[r.id] = o;
      lsSet('overrides', ov);
      kitToast(t('confirm.sent'));
      renderReportsAndTrail();
      return;
    }
    var res = null;
    try { res = await api('/api/reports/' + r.id + '/confirm', { method: 'POST' }); } catch (e) {}
    if (res && res.ok && res.data && res.data.ok) {
      var live = null;
      reports.forEach(function (x) { if (x.id === r.id) live = x; });
      if (live) {
        live.confirmCount = res.data.confirmCount;
        live.confirmedByMe = true;
        live.expiresAt = res.data.expiresAt;
      }
      kitToast(t('confirm.sent'));
    } else {
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
        { label: t('sent.note'), handler: function () { addNote(r); } },
        { label: t('sent.photo'), handler: function () { addPhoto(r); } },
        { label: t('report.removeItem'), destructive: true, handler: function () { removeReport(r); } },
      ];
    } else {
      items = [
        { label: t('report.flagItem'), destructive: true, handler: function () { flagReport(r); } },
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
    var who = r.mine ? esc(t('who.you')) : esc(r.username);
    var ago = r.pending ? t('ago.now') : fmtAgo(nowDate().getTime() - new Date(r.createdAt).getTime());
    var sub = who + ', ' + ago + (r.pending && r.waiting ? esc(t('cond.waiting')) : '');
    var confirmLine = '';
    if (!r.pending && !r.mine) {
      if (r.confirmedByMe) {
        confirmLine = '<p class="mt-1 text-small font-medium text-accent">' + esc(t('confirm.you')) + '</p>';
      } else {
        confirmLine = '<button type="button" class="btn-text" data-confirm="' + r.id + '">' + esc(t('confirm.stillValid')) + '</button>';
      }
    }
    if (r.confirmCount > 0) {
      confirmLine += '<p class="mt-0.5 text-small text-muted">' + esc(t('confirm.count', { n: fmtNum(r.confirmCount) })) + '</p>';
    }
    return '<li class="list-row items-start" data-id="' + r.id + '">' +
      '<span class="report-icon report-icon-' + tone + '">' + iconSvg(r.condition, 'h-5 w-5') + '</span>' +
      '<div class="min-w-0 flex-1">' +
      '<p class="text-body font-semibold">' + esc(condLabel(r.condition)) + ' ' + esc(t('status.at')) + ' ' + esc(stop.name) + '</p>' +
      '<p class="text-small text-muted">' + sub + '</p>' +
      (r.note ? '<p class="mt-0.5 text-small">' + esc(r.note) + '</p>' : '') +
      confirmLine +
      '</div>' +
      (r.photoUrl ? '<button type="button" class="report-thumb" data-photo="' + esc(r.photoUrl) + '" aria-label="' + esc(t('photo.open')) + '">' + iconSvg('photo', 'h-6 w-6') + '</button>' : '') +
      '<button type="button" class="flex h-11 w-11 flex-none items-center justify-center rounded-lg text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus" data-menu aria-label="' + esc(t('report.aria')) + '">' + iconSvg('dots', 'h-5 w-5') + '</button>' +
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
      ul.innerHTML = '<li class="state-error"><p class="text-body font-medium">' + esc(t('status.loadFail')) + '</p>' +
        '<p class="text-small text-muted">' + esc(t('status.loadFailSub')) + '</p>' +
        '<button type="button" id="reports-retry" class="btn-secondary mt-1">' + esc(t('status.retry')) + '</button></li>';
      var rb = $('reports-retry');
      if (rb) rb.addEventListener('click', function () { loadReports(); });
      el.textContent = '';
      return;
    }
    var list = visibleReports();
    if (!list.length) {
      ul.innerHTML = '<li class="state-empty"><p class="text-body font-medium">' + esc(t('report.empty')) + '</p>' +
        '<p class="text-small text-muted">' + esc(t('report.emptySub')) + '</p></li>';
      el.textContent = '';
      return;
    }
    ul.innerHTML = list.map(reportRowHtml).join('');
    if (failed && usingCache) {
      el.textContent = t('report.offlineCache', { time: fmtClock(usingCache.at) });
    } else {
      el.textContent = t('report.updated', { time: fmtClock(usingCache ? usingCache.at : nowISO()) });
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
    renderRouteLine();
    renderStatusBanner();
    renderStatus();
    renderReports();
    renderProfile();
    renderStops();
  }
  // Everything a language switch re-renders: the static HTML strings via
  // applyI18n, then every screen drawn from JS state.
  function rerenderAll() {
    applyI18n();
    renderHeader();
    renderReportsAndTrail();
    renderPermits();
    renderWeather();
    renderNotifs();
    renderPickerHint();
    renderPacking();
    renderLocation();
    renderShareQueue();
  }

  async function loadReports() {
    loading = true;
    failed = false;
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
      var gKey = GROUP_KEY[g.group];
      html += '<h2 class="section-label mt-5">' + esc(gKey ? t(gKey) : g.group) + '</h2><ul class="list">';
      g.items.forEach(function (it) {
        total++;
        var isPacked = !!packedSet[it.id];
        if (isPacked) done++;
        var label = I18N.has(LANG, 'pack.' + it.id) ? t('pack.' + it.id) : it.label;
        var note = I18N.has(LANG, 'pack.' + it.id + '.note') ? t('pack.' + it.id + '.note') : (it.note || '');
        html += '<li class="list-row' + (isPacked ? ' bg-raised/40' : '') + '">' +
          '<input type="checkbox" class="pack-box mt-0.5 h-5 w-5 flex-none accent-accent" data-pack="' + it.id + '"' + (isPacked ? ' checked' : '') + ' aria-label="' + esc(label) + '">' +
          '<div class="min-w-0 flex-1"><p class="text-body' + (isPacked ? ' line-through decoration-line' : '') + '">' + esc(label) + '</p>' +
          (note ? '<p class="text-small text-muted">' + esc(note) + '</p>' : '') + '</div>' +
          '<span class="flex-none text-small text-muted">× ' + it.qty + (it.unit ? ' ' + it.unit : '') + '</span></li>';
      });
      html += '</ul>';
    });
    $('packing-groups').innerHTML = html;
    $('packed-count').textContent = t('packing.packed', { done: done, total: total });
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
            title: t('packing.resetTitle'),
            message: t('packing.resetBody'),
            buttons: [
              { label: t('note.cancel'), style: 'cancel' },
              { label: t('packing.reset'), style: 'destructive', handler: function () { resetPacking(); } },
            ],
          });
          return;
        }
      } catch (e) {}
      if (window.confirm(t('packing.resetTitle') + ' ' + t('packing.resetBody'))) resetPacking();
    });
  }
  function resetPacking() {
    packing.packed = [];
    savePacking();
    renderPacking();
    kitToast(t('packing.cleared'));
  }

  // ── Location tab ───────────────────────────────────────────────────────
  var AUTO_FIX_MS = 20 * 60000;
  var fixInFlight = false;
  var autoLocOn = false;
  function nearestLine(loc) {
    var n = M.nearestStop(loc.lat, loc.lng);
    var d = Math.round(n.meters / 10) * 10;
    if (n.meters > 2000) {
      return t('loc.far', { km: (n.meters / 1000).toFixed(1) });
    }
    return t('loc.near', { m: d, stop: n.stop.name, elev: fmtM(n.stop.elevM) });
  }
  function renderLocation() {
    var loc = lsGet('location', null);
    var body = $('loc-body');
    if (loc) {
      var acc = loc.accuracy ? t('loc.within', { m: Math.round(loc.accuracy) }) : '';
      body.innerHTML = '<p class="font-semibold tabular-nums">' + loc.lat.toFixed(5) + ', ' + loc.lng.toFixed(5) + esc(acc) + '</p>' +
        '<p class="mt-0.5 text-small text-muted">' + esc(nearestLine(loc)) + ' · ' + esc(t('loc.takenAt', { time: fmtClock(loc.at) })) + '</p>' +
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
        html = iconSvg('warning', 'h-4 w-4') + ' ' + esc(t('loc.sendFail'));
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
  function buildMessage() {
    var loc = lsGet('location', null);
    var name = ($('name-field').value || '').trim();
    var contact = ($('contact-field').value || '').trim();
    var parts = [];
    parts.push(name ? t('msg.iam', { name: name, mountain: MOUNTAIN.name })
      : t('msg.iamNameless', { mountain: MOUNTAIN.name }));
    if (loc) {
      parts.push(t('msg.lastLocation', {
        when: fmtWhen(loc.at),
        coords: loc.lat.toFixed(5) + ', ' + loc.lng.toFixed(5),
        acc: loc.accuracy ? t('loc.within', { m: Math.round(loc.accuracy) }) : '',
        near: nearestLine(loc),
      }));
      parts.push(t('msg.map', { url: 'https://www.google.com/maps?q=' + loc.lat.toFixed(5) + ',' + loc.lng.toFixed(5) }));
    } else {
      parts.push(t('msg.noLocation'));
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
      title.textContent = t('loc.msgFrom', { when: fmtWhen(entry.at) });
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
      wa.setAttribute('aria-label', t('loc.shareWhatsapp'));
      wa.textContent = t('loc.shareWhatsapp');
      wa.href = S.whatsappUrl(entry.text, contact);
      wa.addEventListener('click', function (e) {
        if (!navigator.onLine) {
          e.preventDefault();
          kitToast(t('loc.stillOffline'));
          return;
        }
        setTimeout(function () { shareQueueRemove(entry.id); onChange(); }, 0);
      });
      var sms = document.createElement('a');
      sms.className = 'btn-secondary';
      sms.target = '_blank';
      sms.rel = 'noopener';
      sms.setAttribute('aria-label', t('loc.shareSms'));
      sms.textContent = t('loc.shareSms');
      sms.href = S.smsUrl(entry.text, contact);
      sms.addEventListener('click', function () {
        setTimeout(function () { shareQueueRemove(entry.id); onChange(); }, 0);
      });
      var rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'btn-secondary';
      rm.textContent = t('loc.remove');
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
    h.textContent = t('loc.backOnline');
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
      p.textContent = q.length === 1 ? t('loc.readyOne') : t('loc.readyMany', { n: q.length });
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
            status.textContent = t('loc.permOff');
            return;
          }
          if (r && r.active === false) return; // granted; the frame reloads
        } catch (e) {}
      }
      if (!('geolocation' in navigator)) {
        status.textContent = t('loc.noGps');
        return;
      }
      status.textContent = t('loc.finding');
      takeFix(function () {
        status.textContent = '';
        renderLocation();
        buildPicker();
        renderPickerHint();
        kitToast(t('loc.updated'));
      }, function () {
        status.textContent = t('loc.notFound');
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
      if (loc) copyMessage(S.coordsLine(loc.lat, loc.lng), t('loc.copiedCoords'));
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
        kitToast(t('loc.savedOffline'));
      }
    });
    autoLocationTick();
    setInterval(autoLocationTick, 60000);
  }
  async function copyMessage(text, doneMsg) {
    var done = doneMsg || t('loc.copied');
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
      kitToast(t('loc.copyFail'));
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
    picker = $('stop-picker');
    // Language first, so the first paint is already in the right tongue:
    // the hiker's own choice, then the platform locale, then the device,
    // then English. A later platform answer refines it when there is no
    // stored override.
    LANG = I18N.resolveLang(storedLang(), null, navigator.language);
    applyI18n();
    // The guide is part of the app, so it renders from trail-data at once,
    // before anything waits on the network: header, profile and all nine
    // stops now, skeleton bars only where the reports will land.
    renderReportsAndTrail();
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
      // A demo reload reads its own mt:demo:lang, which the plain-key read
      // above could not see before the demo flag settled.
      var demoLang = storedLang();
      if (demoLang && demoLang !== LANG) {
        LANG = demoLang;
        applyI18n();
      }
    }
    // No stored override: let the platform locale refine the guess, and
    // follow it live when the hiker changes it in Homeroom's settings.
    if (!storedLang()) {
      refineLocale();
      window.addEventListener('usernode:locale-changed', function (e) {
        var want = e && e.detail && e.detail.locale
          ? I18N.resolveLang(null, e.detail.locale, navigator.language) : null;
        var next = want || I18N.resolveLang(null, null, navigator.language);
        if (next && next !== LANG) { LANG = next; rerenderAll(); }
      });
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
      kitToast(t('loc.waitingToast'));
    }
    renderReportsAndTrail();
    renderPickerHint();
    TABS.forEach(function (name) {
      $('tabbtn-' + name).addEventListener('click', function () { switchTab(name); });
    });
    var startTab = tabFromHash() || lsGet('tab', null) || 'trail';
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
    });
    window.addEventListener('offline', renderHeader);
    loadReports();
  }

  // The stored language choice ('id' | 'en'), or null.
  function storedLang() {
    var v = lsGet('lang', null);
    return v === 'id' || v === 'en' ? v : null;
  }
  // Asks the platform for the signed-in hiker's locale and refines LANG
  // when it maps to a language we ship. Silent when there is no shell.
  async function refineLocale() {
    var platformLocale = null;
    try {
      if (window.usernode && typeof window.usernode.getUserLocale === 'function') {
        var r = await window.usernode.getUserLocale();
        platformLocale = r && r.locale ? r.locale : null;
      }
    } catch (e) {}
    var next = I18N.resolveLang(null, platformLocale, navigator.language);
    if (next && next !== LANG) { LANG = next; rerenderAll(); }
  }
  // The Trail header's language pill and the Notifications controls.
  function wireNotifs() {
    var pill = $('lang-toggle');
    if (pill) pill.addEventListener('click', function () {
      LANG = LANG === 'en' ? 'id' : 'en';
      lsSet('lang', LANG);
      renderLangPill();
      rerenderAll();
    });
    renderLangPill();
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
  // The pill shows the language you would switch TO.
  function renderLangPill() {
    var pill = $('lang-toggle');
    if (pill) pill.textContent = LANG === 'en' ? 'ID' : 'EN';
  }

  // A toast fallback and a plain-overlay fallback live here so a missing
  // native kit still reads as the app.
  var style = document.createElement('style');
  style.textContent =
    '.toast-fallback{position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:60;background:rgb(var(--fg));color:rgb(var(--ground));padding:10px 16px;border-radius:9999px;font-size:14px;line-height:20px;max-width:90vw}' +
    '.overlay-fallback{position:fixed;inset:0;z-index:50;display:flex;align-items:flex-end;justify-content:center;background:rgb(var(--fg)/0.4);padding:16px}' +
    '.overlay-card{width:100%;max-width:26rem;background:rgb(var(--surface));border-radius:1rem;padding:8px;max-height:80vh;overflow:auto}';
  document.head.appendChild(style);

  boot();
})();
