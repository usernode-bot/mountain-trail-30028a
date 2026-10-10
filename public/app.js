/*
 * Mountain Trail's whole UI. Hash routing for the four tabs; the guide and
 * packing rules come from trail-data.js and packing.js; reports go through
 * the server; the checklist, last location, name and contact live only in
 * localStorage. Every class name is written as a whole literal so the
 * precompiled Tailwind build can see it.
 */
(function () {
  'use strict';

  var M = window.MT_TRAIL;
  var P = window.MT_PACKING;
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
  function fmtM(n) { return n.toLocaleString('en-US'); }
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
        return copy;
      });
    }
    var n = nowDate().getTime();
    list = list.filter(function (r) {
      var t = new Date(r.createdAt).getTime();
      return isFinite(t) && t <= n + 60000 && n - t < 86400000;
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
  // missing. Returns nothing; the caller wires its own buttons.
  function presentSheet(contentEl) {
    try {
      if (window.unNative && typeof unNative.presentSheet === 'function') {
        unNative.presentSheet({ contentEl: contentEl });
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
        window.usernode.askForAccount({ action: 'report a trail condition' });
        return;
      }
    } catch (e) {}
    kitToast('Make a Homeroom account to report conditions');
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
      line.innerHTML = iconSvg('clock', 'h-4 w-4') + ' Offline. Reports from ' + fmtClock(usingCache.at);
    } else if (swReady) {
      line.hidden = false;
      line.innerHTML = '<span class="text-accent">' + iconSvg('check', 'h-4 w-4') + '</span> Guide saved for offline use';
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

  function renderStatus() {
    var el = $('status-strip');
    el.className = 'status-strip mt-4';
    if (loading) {
      el.classList.add('status-strip-skeleton');
      el.removeAttribute('role');
      el.innerHTML = '<div class="flex-1 flex flex-col gap-2 py-1">' +
        '<span class="skeleton h-4 w-48"></span>' +
        '<span class="skeleton h-3.5 w-64"></span></div>';
      return;
    }
    if (failed) {
      el.innerHTML = '<div class="flex-1"><p class="text-body">Couldn\'t load today\'s reports.</p>' +
        '<p class="text-small text-muted">The guide, packing list and location still work.</p></div>' +
        '<button type="button" id="status-retry" class="btn-secondary self-center">Retry</button>';
      $('status-retry').addEventListener('click', function () { loadReports(); });
      return;
    }
    var list = visibleReports();
    if (!list.length) {
      el.innerHTML = iconSvg('check', 'status-strip-icon') +
        '<div><p class="text-body font-medium">No trail warnings in the last 24 hours</p>' +
        '<p class="text-small text-muted">Seen something? The Report tab takes one tap.</p></div>';
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
    el.setAttribute('aria-label', 'Open ' + STOP_BY_ID[worst.stopId].name);
    el.innerHTML = iconSvg(worst.condition === 'landslide' ? 'landslide' : worst.condition, 'status-strip-icon') +
      '<div><p class="text-body font-medium">' + esc(cond.label) + ' at ' + esc(STOP_BY_ID[worst.stopId].name) + '</p>' +
      '<p class="text-small text-muted">Reported ' + esc(M.formatAgo(nowDate().getTime() - new Date(worst.createdAt).getTime())) +
      (others > 0 ? '. ' + others + ' more report' + (others === 1 ? '' : 's') + ' in the last 24 hours.' : '.') + '</p></div>';
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
      '<svg viewBox="0 0 358 80" class="block w-full" role="img" aria-label="Height profile from basecamp to summit">' +
      '<line x1="0" y1="77" x2="358" y2="77" style="stroke:rgb(var(--line));stroke-width:1"/>' +
      '<polyline class="profile-line" points="' + pts + '"/>' + dots + '</svg>';
    $('profile-ends').innerHTML = '<span>Basecamp ' + fmtM(STOPS[0].elevM) + ' m</span><span>Summit ' + fmtM(eMax) + ' m</span>';
  }

  function condLineHtml(stop) {
    var reps = latestForStop(stop.id);
    if (loading) {
      return '<p class="cond-line cond-line-none"><i></i><span class="skeleton h-3.5 w-32"></span></p>';
    }
    if (!reps.length) {
      return '<p class="cond-line cond-line-none"><i></i>No reports in 24 h</p>';
    }
    var rep = reps[0];
    var c = COND_BY_ID[rep.condition];
    var extra = reps.length > 1 ? ', and ' + (reps.length - 1) + ' more' : '';
    var waiting = rep.pending && rep.waiting ? ' · Waiting for signal' : '';
    return '<p class="cond-line cond-line-' + (c.tone === 'danger' ? 'danger' : 'warn') + '"><i></i>' +
      esc(c.label) + ', ' + esc(M.formatAgo(nowDate().getTime() - new Date(rep.createdAt).getTime())) + esc(extra) + esc(waiting) + '</p>';
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
        facs += '<span class="fac-water">' + iconSvg('drop', 'h-4 w-4') + 'Water</span>';
      }
      if (s.kinds.indexOf('camp') >= 0 || s.kinds.indexOf('basecamp') >= 0) {
        facs += '<span>' + iconSvg('tent', 'h-4 w-4') + 'Camp</span>';
      }
      html += '<li class="stop-row" id="stop-' + s.id + '" data-stop="' + s.id + '">' +
        '<span class="stop-node' + stopTone(s) + '">' + iconSvg(stopIcon(s), 'h-5 w-5') + '</span>' +
        '<div class="stop-body">' +
        '<p class="text-body font-semibold">' + esc(s.name) + '</p>' +
        '<p class="mt-1 text-small text-muted">' + fmtM(s.elevM) + ' m, km ' + fmtKm(s.km) + '. ' + esc(s.short) + '</p>' +
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
        '<span class="report-icon report-icon-' + (c.tone === 'danger' ? 'danger' : 'warn') + '">' + iconSvg(r.condition === 'landslide' ? 'landslide' : r.condition, 'h-4 w-4') + '</span>' +
        '<div class="min-w-0 flex-1"><p class="text-body font-medium">' + esc(c.label) + '</p>' +
        '<p class="text-small text-muted">' + (r.mine ? 'You' : esc(r.username)) + ', ' + esc(M.formatAgo(nowDate().getTime() - new Date(r.createdAt).getTime())) + '</p>' +
        (r.note ? '<p class="mt-0.5 text-small">' + esc(r.note) + '</p>' : '') + '</div></li>';
    }).join('');
    return '<p class="mt-2 text-body">' + esc(s.detail) + '</p>' +
      (rows ? '<ul class="list mt-3">' + rows + '</ul>' : '<p class="mt-2 text-small text-muted">No reports here in the last 24 hours.</p>') +
      '<button type="button" class="btn-secondary mt-3" data-report-here="' + s.id + '">Report here</button>';
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
        ? 'Closest stop to your last location, ' + M.formatAgo(nowDate().getTime() - new Date(loc.at).getTime())
        : 'Your last location is closest to ' + n.stop.name;
    } else if (lsGet('lastStop', null) && STOP_BY_ID[lsGet('lastStop', null)]) {
      hint = 'The stop you reported from last time';
    } else {
      hint = 'Basecamp, where the route starts';
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
      kitToast('That report could not be sent. Try again.');
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
        var entry = null;
        pending.forEach(function (p) { if (p.clientId === stored.clientId) entry = p; });
        if (!entry) {
          entry = Object.assign({ pending: true, waiting: true, mine: true, photoUrl: null }, stored);
          pending.push(entry);
        }
        var sent = await postReport(entry);
        if (!sent) break;
      }
    } finally {
      replaying = false;
    }
  }

  function showSentNote(entry) {
    var el = $('sent-note');
    var cond = COND_BY_ID[entry.condition];
    var stop = STOP_BY_ID[entry.stopId];
    el.hidden = false;
    el.innerHTML = '<p class="text-body font-semibold">' + esc(cond.label) + ' at ' + esc(stop.name) + ' reported.</p>' +
      '<p class="mt-0.5 text-small text-muted">' + (entry.waiting ? 'Kept on this phone. It sends when the signal is back.' : 'Other hikers see it on the trail now.') + '</p>' +
      '<div class="mt-3 flex flex-wrap items-center gap-2">' +
      '<button type="button" class="btn-secondary" data-act="photo">' + iconSvg('camera', 'h-5 w-5') + 'Add photo</button>' +
      '<button type="button" class="btn-secondary" data-act="note">' + iconSvg('note', 'h-5 w-5') + 'Add note</button>' +
      '<button type="button" class="btn-text" data-act="undo">Undo</button></div>';
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
        kitToast('Report removed');
      } else {
        kitToast('Couldn\'t remove the report. Try again.');
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
    wrap.innerHTML = '<p class="font-display text-heading">Add a note</p>' +
      '<textarea id="note-box" class="field" rows="3" maxlength="200" placeholder="e.g. The rope is fine, the rocks are wet"></textarea>' +
      '<p class="text-small text-muted"><span id="note-count">0</span> of 200 characters</p>' +
      '<div class="flex justify-end gap-2">' +
      '<button type="button" class="btn-secondary" data-close>Cancel</button>' +
      '<button type="button" class="btn-primary" data-save>Save note</button></div>';
    var box = wrap.querySelector('#note-box');
    var count = wrap.querySelector('#note-count');
    box.value = r.note || '';
    function upd() { count.textContent = String(box.value.length); }
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
      kitToast('Note added');
      return;
    }
    api('/api/reports/' + r.id, { method: 'PATCH', body: { note: text } }).then(function (res) {
      if (res.ok && res.data && res.data.report) {
        var live = null;
        reports.forEach(function (x) { if (x.id === r.id) live = x; });
        if (live) live.note = res.data.report.note;
        kitToast('Note added');
      } else {
        kitToast('Couldn\'t add the note. Try again.');
      }
      renderReportsAndTrail();
    });
  }

  var photoTarget = null;
  function addPhoto(entryOrReport) {
    var r = entryOrReport;
    if (!navigator.onLine) {
      kitToast('Photos need a connection. The report keeps its note.');
      return;
    }
    if (!window.usernode || typeof window.usernode.uploadFile !== 'function') {
      kitToast('Photos are unavailable here. The report keeps its note.');
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
          kitToast('Photo attached. It sends with the report.');
          return;
        }
        if (isDemoRow(r)) {
          var ov = lsGet('overrides', {});
          ov[r.id] = Object.assign({}, ov[r.id], { photoUrl: url });
          lsSet('overrides', ov);
          renderReportsAndTrail();
          kitToast('Photo added');
          return;
        }
        var res = await api('/api/reports/' + r.id, { method: 'PATCH', body: { photoUrl: url, photoId: pid } });
        if (res.ok && res.data && res.data.report) {
          var live = null;
          reports.forEach(function (x) { if (x.id === r.id) live = x; });
          if (live) { live.photoUrl = res.data.report.photoUrl; live.photoId = pid; }
          kitToast('Photo added');
        } else {
          kitToast('Couldn\'t attach the photo. Try again.');
        }
        renderReportsAndTrail();
      } catch (e) {
        kitToast('Photos are unavailable right now. The report keeps its note.');
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
      kitToast('Report removed');
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
        kitToast('Report removed');
      } else {
        kitToast('Couldn\'t remove the report. Try again.');
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
      kitToast('Flagged. It\'s hidden for you.');
      return;
    }
    api('/api/reports/' + r.id + '/flag', { method: 'POST' }).then(function (res) {
      if (res.ok) {
        reports = reports.filter(function (x) { return x.id !== r.id; });
        kitToast('Flagged. It\'s hidden for you.');
      } else if (res.status === 400) {
        kitToast('You can\'t flag your own report');
      } else {
        kitToast('Couldn\'t flag the report. Try again.');
      }
      renderReportsAndTrail();
    });
  }

  function reportMenu(anchorEl, id) {
    var r = findReportById(id);
    if (!r) return;
    var items;
    if (r.mine) {
      items = [
        { label: 'Add note', handler: function () { addNote(r); } },
        { label: 'Add photo', handler: function () { addPhoto(r); } },
        { label: 'Remove report', destructive: true, handler: function () { removeReport(r); } },
      ];
    } else {
      items = [
        { label: 'Flag as wrong or inappropriate', destructive: true, handler: function () { flagReport(r); } },
      ];
    }
    rowMenu(anchorEl, null, items);
  }

  function showPhoto(url) {
    var wrap = document.createElement('div');
    wrap.className = 'p-3';
    wrap.innerHTML = '<img src="' + esc(url) + '" alt="Report photo" style="max-height:70vh" class="w-full rounded-lg">';
    presentModal(wrap);
  }

  function reportRowHtml(r) {
    var c = COND_BY_ID[r.condition];
    var stop = STOP_BY_ID[r.stopId];
    var tone = c.tone === 'danger' ? 'danger' : 'warn';
    var who = r.mine ? 'You' : esc(r.username);
    var ago = r.pending ? 'just now' : M.formatAgo(nowDate().getTime() - new Date(r.createdAt).getTime());
    var sub = who + ', ' + ago + (r.pending && r.waiting ? ' · Waiting for signal' : '');
    return '<li class="list-row items-start" data-id="' + r.id + '">' +
      '<span class="report-icon report-icon-' + tone + '">' + iconSvg(r.condition === 'landslide' ? 'landslide' : r.condition, 'h-5 w-5') + '</span>' +
      '<div class="min-w-0 flex-1">' +
      '<p class="text-body font-semibold">' + esc(c.label) + ' at ' + esc(stop.name) + '</p>' +
      '<p class="text-small text-muted">' + sub + '</p>' +
      (r.note ? '<p class="mt-0.5 text-small">' + esc(r.note) + '</p>' : '') +
      '</div>' +
      (r.photoUrl ? '<button type="button" class="report-thumb" data-photo="' + esc(r.photoUrl) + '" aria-label="Open the photo">' + iconSvg('photo', 'h-6 w-6') + '</button>' : '') +
      '<button type="button" class="flex h-11 w-11 flex-none items-center justify-center rounded-lg text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus" data-menu aria-label="Report options">' + iconSvg('dots', 'h-5 w-5') + '</button>' +
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
      ul.innerHTML = '<li class="state-error"><p class="text-body font-medium">Couldn\'t load today\'s reports.</p>' +
        '<p class="text-small text-muted">The guide, packing list and location still work.</p>' +
        '<button type="button" id="reports-retry" class="btn-secondary mt-1">Retry</button></li>';
      var rb = $('reports-retry');
      if (rb) rb.addEventListener('click', function () { loadReports(); });
      el.textContent = '';
      return;
    }
    var list = visibleReports();
    if (!list.length) {
      ul.innerHTML = '<li class="state-empty"><p class="text-body font-medium">No reports in the last 24 hours.</p>' +
        '<p class="text-small text-muted">Seen something on the trail? Report it.</p></li>';
      el.textContent = '';
      return;
    }
    ul.innerHTML = list.map(reportRowHtml).join('');
    if (failed && usingCache) {
      el.textContent = 'Offline. Reports from ' + fmtClock(usingCache.at) + '.';
    } else {
      el.textContent = 'Updated ' + fmtClock(usingCache ? usingCache.at : nowISO()) + '.';
    }
    Array.prototype.forEach.call(ul.querySelectorAll('[data-menu]'), function (btn) {
      btn.addEventListener('click', function () {
        reportMenu(btn, Number(btn.closest('li').getAttribute('data-id')));
      });
    });
    Array.prototype.forEach.call(ul.querySelectorAll('[data-photo]'), function (btn) {
      btn.addEventListener('click', function () { showPhoto(btn.getAttribute('data-photo')); });
    });
  }

  function renderReportsAndTrail() {
    renderStatus();
    renderReports();
    renderProfile();
    renderStops();
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
    var total = 0, done = 0;
    var html = '';
    groups.forEach(function (g) {
      html += '<h2 class="section-label mt-5">' + esc(g.group) + '</h2><ul class="list">';
      g.items.forEach(function (it) {
        total++;
        var isPacked = !!packedSet[it.id];
        if (isPacked) done++;
        html += '<li class="list-row' + (isPacked ? ' bg-raised/40' : '') + '">' +
          '<input type="checkbox" class="pack-box mt-0.5 h-5 w-5 flex-none accent-accent" data-pack="' + it.id + '"' + (isPacked ? ' checked' : '') + ' aria-label="' + esc(it.label) + '">' +
          '<div class="min-w-0 flex-1"><p class="text-body' + (isPacked ? ' line-through decoration-line' : '') + '">' + esc(it.label) + '</p>' +
          '<p class="text-small text-muted">' + esc(it.note) + '</p></div>' +
          '<span class="flex-none text-small text-muted">× ' + it.qty + (it.unit ? ' ' + it.unit : '') + '</span></li>';
      });
      html += '</ul>';
    });
    $('packing-groups').innerHTML = html;
    $('packed-count').textContent = done + ' of ' + total + ' packed';
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
            title: 'Start over?',
            message: 'This clears every packed tick. The list stays.',
            buttons: [
              { label: 'Cancel', style: 'cancel' },
              { label: 'Start over', style: 'destructive', handler: function () { resetPacking(); } },
            ],
          });
          return;
        }
      } catch (e) {}
      if (window.confirm('Start over? This clears every packed tick. The list stays.')) resetPacking();
    });
  }
  function resetPacking() {
    packing.packed = [];
    savePacking();
    renderPacking();
    kitToast('List cleared');
  }

  // ── Location tab ───────────────────────────────────────────────────────
  var AUTO_FIX_MS = 20 * 60000;
  var fixInFlight = false;
  var autoLocOn = false;
  function nearestLine(loc) {
    var n = M.nearestStop(loc.lat, loc.lng);
    var d = Math.round(n.meters / 10) * 10;
    if (n.meters > 2000) {
      return 'About ' + (n.meters / 1000).toFixed(1) + ' km from the route';
    }
    return 'About ' + d + ' m from ' + n.stop.name + ', ' + fmtM(n.stop.elevM) + ' m';
  }
  function renderLocation() {
    var loc = lsGet('location', null);
    var body = $('loc-body');
    if (loc) {
      var acc = loc.accuracy ? ' (within ' + Math.round(loc.accuracy) + ' m)' : '';
      body.innerHTML = '<p class="font-semibold tabular-nums">' + loc.lat.toFixed(5) + ', ' + loc.lng.toFixed(5) + esc(acc) + '</p>' +
        '<p class="mt-0.5 text-small text-muted">' + nearestLine(loc) + ' · taken at ' + fmtClock(loc.at) + '</p>' +
        (autoLocOn ? '<p class="mt-0.5 text-small text-muted">Updates on its own about every 20 minutes while Mountain Trail is open.</p>' : '');
    } else {
      body.innerHTML = '<p class="text-body text-muted">No location yet. Tap Update my location to take one.</p>';
    }
    renderMsgPreview();
  }
  function fmtWhen(iso) {
    var d = new Date(iso);
    if (!isFinite(d.getTime())) return '';
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var h = d.getHours(), m = d.getMinutes();
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m + ' on ' + d.getDate() + ' ' + months[d.getMonth()];
  }
  function buildMessage() {
    var loc = lsGet('location', null);
    var name = ($('name-field').value || '').trim();
    var contact = ($('contact-field').value || '').trim();
    var parts = [];
    parts.push('This is ' + (name || 'a hiker') + ' on ' + MOUNTAIN.name + ' (Cibodas route).');
    if (loc) {
      parts.push('My last location, ' + fmtWhen(loc.at) + ': ' + loc.lat.toFixed(5) + ', ' + loc.lng.toFixed(5) +
        (loc.accuracy ? ' (within ' + Math.round(loc.accuracy) + ' m)' : '') + ', ' + nearestLine(loc) + '.');
      parts.push('Map: https://www.google.com/maps?q=' + loc.lat.toFixed(5) + ',' + loc.lng.toFixed(5));
    } else {
      parts.push('Location not found yet.');
    }
    if (contact) parts.push('Basecamp Cibodas contact: ' + contact + '.');
    parts.push('Indonesia emergency number: 112.');
    return parts.join(' ');
  }
  function renderMsgPreview() {
    $('msg-preview').textContent = buildMessage();
  }
  function wireLocation() {
    function takeFix(onOk, onFail) {
      if (fixInFlight || !('geolocation' in navigator)) return;
      fixInFlight = true;
      navigator.geolocation.getCurrentPosition(function (pos) {
        fixInFlight = false;
        lsSet('location', { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, at: nowISO() });
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
            status.textContent = 'Location permission is off for Mountain Trail. Turn it on in Homeroom’s settings for this app.';
            return;
          }
          if (r && r.active === false) return; // granted; the frame reloads
        } catch (e) {}
      }
      if (!('geolocation' in navigator)) {
        status.textContent = 'This device can\'t read a position.';
        return;
      }
      status.textContent = 'Finding your position…';
      takeFix(function () {
        status.textContent = '';
        renderLocation();
        buildPicker();
        renderPickerHint();
        kitToast('Location updated');
      }, function () {
        status.textContent = 'Couldn\'t find your position. Try again in the open.';
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
    autoLocationTick();
    setInterval(autoLocationTick, 60000);
  }
  async function copyMessage(text) {
    try {
      await navigator.clipboard.writeText(text);
      kitToast('Message copied');
      return;
    } catch (e) {}
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      kitToast('Message copied');
    } catch (e) {
      kitToast('Couldn\'t copy. Select the message text yourself.');
    }
  }

  // ── Demo seeding (staging, ?demo=1) ────────────────────────────────────
  function seedDemo() {
    if (lsGet('seeded', false)) return;
    lsSet('packing', { days: 2, people: 4, packed: ['permit', 'tent', 'stove', 'gas', 'first-aid', 'rain-jacket', 'headlamp', 'water', 'meals'] });
    var here = STOP_BY_ID['air-panas'];
    lsSet('location', { lat: here.lat + 0.0011, lng: here.lng, accuracy: 12, at: new Date(nowDate().getTime() - 2 * 60000).toISOString() });
    lsSet('name', 'Demo hiker');
    lsSet('contact', '0800 0000 000 (demo)');
    lsSet('seeded', true);
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
    }
    packing = lsGet('packing', null) || { days: 2, people: 1, packed: [] };
    buildPicker();
    wirePacking();
    wireLocation();
    wirePhotoInput();
    renderPacking();
    renderLocation();
    renderReportsAndTrail();
    renderPickerHint();
    TABS.forEach(function (t) {
      $('tabbtn-' + t).addEventListener('click', function () { switchTab(t); });
    });
    var t = tabFromHash() || lsGet('tab', null) || 'trail';
    switchTab(t);
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
    });
    window.addEventListener('offline', renderHeader);
    loadReports();
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
