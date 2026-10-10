# Mountain Trail

An offline trail guide and safety companion for hikers, built around Mount
Gede Pangrango by the Cibodas route. Four tabs along the bottom:

- **Trail** — the guide: the mountain header, a status strip with the worst
  condition reported in the last 24 hours, a height profile, and the trail
  line from Basecamp Cibodas to Puncak Gede. Each of the nine stops (posts,
  water sources, camps) shows its latest condition; tapping a stop opens its
  description and reports.
- **Report** — one tap on Slippery, Landslide, No water or Heavy fog sends a
  condition report, with an optional note (200 characters) and photo. Reports
  are shared with every hiker and show for 24 hours. Made offline, they wait
  on the phone and send when the signal is back. A report flagged by two
  people is hidden; authors can remove their own.
- **Packing** — a checklist that builds itself from the days on the mountain
  and the group size, and from the mountain itself (cold nights, frequent
  rain, water at Kandang Batu and Kandang Badak, all rubbish carried down).
- **Location** — the last saved coordinates, the nearest stop, and a message
  ready to share with basecamp or family (the device's share sheet, or copy).
  Every message carries Indonesia's emergency number, 112.

## Offline

The guide is static content that ships with the app (`public/trail-data.js`),
and a small service worker (`public/sw.js`) caches the app shell after one
online visit, so the app opens with no connection. Reports go through the
server; the checklist, last location, name and basecamp contact live only on
the phone.

## Development

- `npm run build` compiles the stylesheet from `styles/tailwind-input.css`
  and `tailwind.config.js` to `public/tailwind.css` (the image build does
  this on every deploy).
- `npm test` runs the unit tests for the packing rules and the guide data.
- `npm start` runs the app; the platform injects `DATABASE_URL`,
  `USERNODE_JWT_PUBLIC_KEY` and the rest. Reports are stored in Postgres
  (`trail_reports`, `report_flags`, created on boot).

To change the app, ask Homeroom bot on the platform, or run Claude Code
against this repo: start with `CLAUDE.md`, which carries the app-specific
notes and points at the platform rules.
