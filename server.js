const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3000;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// The platform signs user-identity tokens with an RSA private key it never
// shares. Containers get only the PUBLIC half, so this app can verify who a
// user is but cannot mint an identity — and neither can any other app.
const JWT_PUBLIC_KEY = (process.env.USERNODE_JWT_PUBLIC_KEY || '')
  .replace(/\\n/g, '\n');

// Tokens are minted for one app: the audience is this app's numeric id, so a
// token issued for a different app is rejected below rather than accepted as
// a valid user.
const APP_AUDIENCE = process.env.USERNODE_APP_ID
  ? 'usernode:app:' + process.env.USERNODE_APP_ID
  : null;

// Visitors with no Homeroom account ("guests") may look around this app at
// its own address, read-only (every public app). The platform marks
// them with a token of their own: ES256, signed by a key of its own (its
// public half is USERNODE_GUEST_JWT_PUBLIC_KEY), this audience, `pur:
// 'guest'`, `guest: true`, and no id or username. Such a visitor is
// `req.guest`, never `req.user`, and every write they try is answered 401
// `account_required`, which the bridge turns into "Make an account to
// continue".
const GUEST_AUDIENCE = APP_AUDIENCE ? APP_AUDIENCE + ':guest' : null;
const GUEST_PUBLIC_KEY = (process.env.USERNODE_GUEST_JWT_PUBLIC_KEY || '')
  .replace(/\\n/g, '\n');

// Paths that stay open without authentication. Add a path here (and add it
// with `app.get`/`app.post` below) if you deliberately want it public.
// Everything else requires a valid platform-issued JWT.
const PUBLIC_API_PATHS = new Set(['/health', '/api/me', '/api/reports']);

app.use(express.json());

// The platform's three centrally hosted files — the bridge, the native UI
// kit and the Tailwind runtime — are reachable at these paths on this app's
// OWN origin, so index.html can load them with a RELATIVE path and never
// name the platform's hostname. A hostname baked into an app is what breaks
// every app at once when the platform's domain moves.
//
// In production and on a staging preview the platform's edge answers these
// before the request ever reaches this process (a per-app Ingress rule on
// Kubernetes, the wildcard site's matcher on the docker runtime). This
// handler is what makes the same relative paths work under a plain
// `node server.js`, where there is no edge in front of the app at all.
//
// Registered BEFORE the auth middleware because these three files are
// public: the platform serves them anonymously from any app origin, and a
// login redirect arriving where a <script> was expected is exactly the
// failure a relative path is meant to avoid.
// The platform's origin, at RUNTIME, and ONLY from the variable the platform
// injects. No hostname is written into this file: a baked-in one is what left
// the whole fleet pointing at a domain the platform had moved away from.
// Unset only outside the platform (a plain local `node server.js`) — set
// USERNODE_PLATFORM_ORIGIN there too if you want the hosted assets locally.
const PLATFORM_ORIGIN = (process.env.USERNODE_PLATFORM_ORIGIN || '')
  .replace(/\/+$/, '');

app.get(/^\/usernode-(?:bridge|native|tailwind)\//, async (req, res) => {
  try {
    if (!PLATFORM_ORIGIN) return res.sendStatus(503);
    const upstream = await fetch(PLATFORM_ORIGIN + req.path);
    if (!upstream.ok) return res.sendStatus(upstream.status);
    const type = upstream.headers.get('content-type');
    if (type) res.type(type);
    // max-age=0 with revalidation, never a long TTL: the whole point of
    // central hosting is that a platform-side fix lands on the next load.
    res.set('Cache-Control', 'public, max-age=0, must-revalidate');
    return res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (err) {
    console.warn('hosted asset fetch failed: ' + err.message);
    return res.sendStatus(502);
  }
});

// "Now" for this request, as a Date: `req.now`, set for every request by
// the middleware below. Read the day and the time through it (and
// `usernode.now()` in the page), never `new Date()` or SQL's NOW(),
// wherever they decide what shows: a reminder, a rota, a deadline.
// Production always gets the real time. A staging preview may be shown as of
// a chosen moment: the platform opens it with `?un-now=<ISO time>`, and the
// page sends `usernode.now()` on as the `x-usernode-now` header. Only a
// staging container reads either. See "Time-dependent features" in the
// platform conventions.
const IS_STAGING = process.env.USERNODE_ENV === 'staging';
const PREVIEW_NOW = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;
function requestNow(req) {
  const raw = IS_STAGING ? (req.headers['x-usernode-now'] || req.query['un-now']) : null;
  return typeof raw === 'string' && PREVIEW_NOW.test(raw) ? new Date(raw) : new Date();
}

// Verify platform-issued JWT if one was passed, then enforce auth on
// anything not explicitly marked public. The iframe adds `?token=…`
// on load; the frontend script forwards the token via `x-usernode-token`
// on subsequent fetches.
app.use((req, res, next) => {
  req.now = requestNow(req);
  const token = req.query.token || req.headers['x-usernode-token'];
  if (token && JWT_PUBLIC_KEY && APP_AUDIENCE) {
    try {
      // Pin the algorithm, issuer and audience. Without `algorithms` a
      // caller could hand us an HS256 token signed with the public PEM
      // (which every app knows) and forge any user.
      const claims = jwt.verify(token, JWT_PUBLIC_KEY, {
        algorithms: ['RS256'],
        issuer: 'usernode',
        audience: APP_AUDIENCE,
      });
      // `pur` names what the token is for. Only user-identity tokens
      // authenticate a person here.
      if (claims && claims.pur === 'iframe') req.user = claims;
    } catch {}
  }
  if (!req.user && token && GUEST_PUBLIC_KEY && GUEST_AUDIENCE) {
    try {
      const guest = jwt.verify(token, GUEST_PUBLIC_KEY, {
        algorithms: ['ES256'],
        issuer: 'usernode',
        audience: GUEST_AUDIENCE,
      });
      if (guest && guest.pur === 'guest' && guest.guest === true) req.guest = true;
    } catch {}
  }

  // Static assets (CSS/JS/images) are always served; the API and the HTML
  // shell are gated so direct hits to the staging/prod subdomain don't
  // leak app data to the public internet. A guest may READ: every GET,
  // `/api/*` included, so read routes must not assume req.user (use
  // `req.user ? req.user.id : null`). Every write needs an account.
  if (req.method !== 'GET' || req.path.startsWith('/api/')) {
    if (PUBLIC_API_PATHS.has(req.path) && req.method === 'GET') return next();
    if (!req.user && req.guest) {
      if (req.method === 'GET' || req.method === 'HEAD') return next();
      return res.status(401).json({ error: 'account_required' });
    }
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── Mountain Trail ─────────────────────────────────────────────────────────
// The guide ships with the app (public/trail-data.js); the server requires
// the same file so a report can only name a real stop and a real condition.
const trailData = require('./public/trail-data.js');
const STOP_IDS = new Set(trailData.STOPS.map((s) => s.id));
const CONDITION_IDS = new Set(trailData.CONDITIONS.map((c) => c.id));

// Both tables are public (staging copies their rows): they carry Homeroom
// usernames, which are public, plus trail notes and photo URLs. No personal
// data.
async function migrate() {
  await pool.query(`CREATE TABLE IF NOT EXISTS trail_reports (
    id SERIAL PRIMARY KEY,
    client_id TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    stop_id TEXT NOT NULL,
    condition TEXT NOT NULL CHECK (condition IN ('slippery','landslide','no-water','heavy-fog')),
    note TEXT CHECK (char_length(note) <= 200),
    photo_url TEXT,
    photo_id TEXT,
    created_at TIMESTAMPTZ NOT NULL
  )`);
  await pool.query(
    'CREATE INDEX IF NOT EXISTS trail_reports_created_at_idx ON trail_reports (created_at DESC)'
  );
  await pool.query(`CREATE TABLE IF NOT EXISTS report_flags (
    report_id INT REFERENCES trail_reports(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (report_id, user_id)
  )`);
}

function rowToReport(r) {
  return {
    id: r.id,
    clientId: r.client_id,
    stopId: r.stop_id,
    condition: r.condition,
    note: r.note || '',
    photoUrl: r.photo_url || null,
    username: r.username,
    mine: false,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
  };
}

// The staging demo: eight made-up reports across five stops, merged into
// GET /api/reports and never stored. Production never runs this branch, and
// the plain route never returns demo rows.
const DEMO_PHOTO_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="320" height="240" fill="#8a8f86"/><path d="M0 190 L110 90 L170 150 L210 120 L320 200 L320 240 L0 240 Z" fill="#5c6158"/><circle cx="250" cy="60" r="22" fill="#e8e6de"/><text x="16" y="30" font-family="system-ui" font-size="16" fill="#ffffff">Staging demo photo</text></svg>'
  );
const DEMO_REPORTS = [
  { id: -1, username: 'demo-hiker-sari', stopId: 'puncak-gede', condition: 'heavy-fog', minsAgo: 25, note: "Can't see past the crater rim. Wait at the shelter below." },
  { id: -2, username: 'demo-hiker-dewi', stopId: 'air-panas', condition: 'slippery', minsAgo: 40, note: 'The rope is fine, the rocks are wet.' },
  { id: -3, username: 'demo-hiker-raka', stopId: 'tanjakan-setan', condition: 'landslide', minsAgo: 60, note: 'Part of the path is buried. Pass on the left by the ropes.', photoUrl: DEMO_PHOTO_SVG },
  { id: -4, username: 'demo-hiker-bima', stopId: 'kandang-badak', condition: 'no-water', minsAgo: 120, note: 'The spring is only dripping. Fill up at Kandang Batu.' },
  { id: -5, username: null, stopId: 'rawa-gayonggong', condition: 'slippery', minsAgo: 180, note: 'Boardwalk planks are mossy.' },
  { id: -6, username: 'demo-hiker-nina', stopId: 'kandang-badak', condition: 'heavy-fog', minsAgo: 300, note: '' },
  { id: -7, username: 'demo-hiker-oki', stopId: 'air-panas', condition: 'slippery', minsAgo: 540, note: '' },
];

app.get('/api/me', (req, res) => {
  res.json({
    user: req.user ? { id: req.user.id, username: req.user.username } : null,
    guest: !!req.guest,
    demo: IS_STAGING && req.query.demo === '1',
  });
});

app.get('/api/reports', async (req, res) => {
  const viewerId = req.user ? req.user.id : null;
  const since = new Date(req.now.getTime() - 24 * 3600 * 1000);
  let rows;
  try {
    const q = await pool.query(
      `SELECT r.id, r.client_id, r.stop_id, r.condition, r.note, r.photo_url, r.user_id, r.username, r.created_at
         FROM trail_reports r
        WHERE r.created_at > $2
          AND NOT EXISTS (SELECT 1 FROM report_flags f WHERE f.report_id = r.id AND f.user_id = $1)
          AND (r.user_id = $1 OR (SELECT count(*) FROM report_flags f WHERE f.report_id = r.id) < 2)
        ORDER BY r.created_at DESC
        LIMIT 100`,
      [viewerId, since]
    );
    rows = q.rows;
  } catch (err) {
    console.warn('reports query failed: ' + err.message);
    return res.status(500).json({ error: 'Could not load reports' });
  }
  const reports = rows.map((r) => {
    const rep = rowToReport(r);
    rep.mine = !!viewerId && r.user_id === viewerId;
    return rep;
  });
  if (IS_STAGING && req.query.demo === '1') {
    const viewerName = req.user ? req.user.username : 'you';
    const demoRows = DEMO_REPORTS.map((d) => ({
      id: d.id,
      clientId: null,
      stopId: d.stopId,
      condition: d.condition,
      note: d.note || '',
      photoUrl: d.photoUrl || null,
      username: d.username || viewerName,
      mine: d.username === null,
      createdAt: new Date(req.now.getTime() - d.minsAgo * 60000).toISOString(),
    }));
    reports.push(...demoRows);
    reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  res.json({ now: req.now.toISOString(), reports });
});

app.post('/api/reports', async (req, res) => {
  const b = req.body || {};
  const clientId = typeof b.clientId === 'string' && b.clientId.length > 0 && b.clientId.length <= 64 ? b.clientId : null;
  const note = typeof b.note === 'string' ? b.note.trim().slice(0, 200) : null;
  if (!clientId || !STOP_IDS.has(b.stopId) || !CONDITION_IDS.has(b.condition)) {
    return res.status(400).json({ error: 'Unknown stop or condition' });
  }
  try {
    await pool.query(
      `INSERT INTO trail_reports (client_id, user_id, username, stop_id, condition, note, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (client_id) DO NOTHING`,
      [clientId, req.user.id, req.user.username, b.stopId, b.condition, note, req.now]
    );
    const q = await pool.query(
      `SELECT id, client_id, stop_id, condition, note, photo_url, username, created_at
         FROM trail_reports WHERE client_id = $1`,
      [clientId]
    );
    const rep = rowToReport(q.rows[0]);
    rep.mine = true;
    res.status(201).json({ report: rep });
  } catch (err) {
    console.warn('report insert failed: ' + err.message);
    res.status(500).json({ error: 'Could not save the report' });
  }
});

async function ownReportOr404(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.sendStatus(404);
    return null;
  }
  const q = await pool.query('SELECT id, user_id, client_id, stop_id, condition, note, photo_url, photo_id, username, created_at FROM trail_reports WHERE id = $1', [id]);
  const row = q.rows[0];
  if (!row || row.user_id !== req.user.id) {
    res.sendStatus(404);
    return null;
  }
  return row;
}

app.patch('/api/reports/:id', async (req, res) => {
  const row = await ownReportOr404(req, res);
  if (!row) return;
  if (req.now.getTime() - new Date(row.created_at).getTime() > 24 * 3600 * 1000) {
    return res.status(403).json({ error: 'Reports can be edited for 24 hours' });
  }
  const b = req.body || {};
  const sets = [];
  const params = [];
  if (typeof b.note === 'string') {
    params.push(b.note.trim().slice(0, 200));
    sets.push('note = $' + (params.length + 1));
  }
  if (typeof b.photoUrl === 'string' && b.photoUrl.length <= 2048) {
    params.push(b.photoUrl);
    sets.push('photo_url = $' + (params.length + 1));
  }
  if (typeof b.photoId === 'string' && b.photoId.length <= 128) {
    params.push(b.photoId);
    sets.push('photo_id = $' + (params.length + 1));
  }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
  try {
    params.push(row.id);
    await pool.query('UPDATE trail_reports SET ' + sets.join(', ') + ' WHERE id = $' + params.length, params);
    const q = await pool.query(
      'SELECT id, client_id, stop_id, condition, note, photo_url, username, created_at FROM trail_reports WHERE id = $1',
      [row.id]
    );
    const rep = rowToReport(q.rows[0]);
    rep.mine = true;
    res.json({ report: rep });
  } catch (err) {
    console.warn('report update failed: ' + err.message);
    res.status(500).json({ error: 'Could not update the report' });
  }
});

app.delete('/api/reports/:id', async (req, res) => {
  const row = await ownReportOr404(req, res);
  if (!row) return;
  try {
    await pool.query('DELETE FROM trail_reports WHERE id = $1', [row.id]);
    res.json({ ok: true });
  } catch (err) {
    console.warn('report delete failed: ' + err.message);
    res.status(500).json({ error: 'Could not remove the report' });
  }
});

app.post('/api/reports/:id/flag', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.sendStatus(404);
  const q = await pool.query('SELECT id, user_id FROM trail_reports WHERE id = $1', [id]);
  const row = q.rows[0];
  if (!row) return res.sendStatus(404);
  if (row.user_id === req.user.id) {
    return res.status(400).json({ error: 'You cannot flag your own report' });
  }
  try {
    await pool.query(
      'INSERT INTO report_flags (report_id, user_id, created_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [id, req.user.id, req.now]
    );
    res.json({ ok: true });
  } catch (err) {
    console.warn('flag insert failed: ' + err.message);
    res.status(500).json({ error: 'Could not flag the report' });
  }
});

// The template ships no favicon file; index.html carries an inline SVG
// icon instead. Answer 204 here so anything that still probes
// /favicon.ico (older browsers, direct visits) doesn't fall through to
// the auth-gated catch-all and surface a 401 in the console on every
// fresh load.
app.get('/favicon.ico', (_req, res) => res.status(204).end());

app.use(express.static(path.join(__dirname, 'public')));

// HTML shell: serve the app if authenticated. Unauthenticated top-level
// visits (share links pasted into a browser — Sec-Fetch-Dest: document)
// are sent to the platform's chromeless view of this app, where the shell
// embeds it with a real token so the link just works. Every other
// tokenless case (iframe loads with an expired token, old browsers
// without Sec-Fetch-*) gets the "open in Homeroom" landing page instead
// of a redirect, so the platform shell is never loaded INSIDE its own
// app iframe and stray visits still don't reveal the app.
app.get('*', (req, res) => {
  if (!req.user && !req.guest) {
    // Deep-link pass-through (platform #743): carry the visited
    // path+query into the chromeless view so share links land on the
    // shared screen, not Home. The clean platform route stores `path`
    // as one encoded query value so an inner ?, &, or = survives. The
    // shell decodes and validates it as relative-only before use. The
    // character test keeps the
    // value attribute-safe for the landing anchor below — anything
    // unusual falls back to the bare link.
    const deepPath = /^\/[A-Za-z0-9\-._~!$&()*+,;=:@\/%?]*$/.test(req.originalUrl)
      ? '?path=' + encodeURIComponent(req.originalUrl) : '';
    if (PLATFORM_ORIGIN && req.get('sec-fetch-dest') === 'document') {
      return res.redirect(302, PLATFORM_ORIGIN + '/app/mountain-trail-30028a/full' + deepPath);
    }
    return res.status(401).send(`<!doctype html><meta charset=utf-8><title>Open in Homeroom</title>
<body style="font-family:system-ui;background:#09090b;color:#e4e4e7;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
  <div style="max-width:24rem;padding:2rem;text-align:center">
    <h1 style="font-size:1.25rem;margin:0 0 0.5rem">Open this app inside Homeroom</h1>
    <p style="color:#a1a1aa;font-size:0.9rem;margin:0 0 1.25rem">This page is served via the platform; direct visits aren't authenticated.</p>
    <a href="${PLATFORM_ORIGIN}/app/mountain-trail-30028a/full${deepPath}" style="display:inline-block;padding:0.5rem 1rem;background:#7c3aed;color:white;border-radius:0.5rem;text-decoration:none;font-size:0.9rem">Open in Homeroom</a>
  </div>
</body>`);
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function start() {
  await migrate();
  const server = app.listen(port, () => console.log(`Listening on :${port}`));
  // Let Envoy retire idle upstream connections at 60s, with a 15s margin.
  server.keepAliveTimeout = 75_000;
  // Stop accepting connections, drain in-flight requests, close the pool.
  let closing = false;
  async function shutdown(signal) {
    if (closing) return;
    closing = true;
    console.log(`${signal} received, shutting down`);
    server.close(() => {});
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await pool.end().catch(() => {});
    process.exit(0);
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch(err => { console.error(err); process.exit(1); });
