# Mountain Trail

An offline trail guide and safety companion for hikers, built around Mount
Gede Pangrango by the Cibodas route. Five tabs along the bottom:

- **Mountains** — a catalog of Indonesia's climbable mountains, grouped by
  island and province, with a search field and filters (island, province,
  difficulty, duration, status). Tapping a mountain opens its guide page:
  height, difficulty, duration, basecamp, permit, routes and a climber
  note. Gede Pangrango links straight into the stop-by-stop Trail tab.
  The catalog ships with the app as static content
  (`public/mountain-catalog.js`) and works offline; approved corrections
  from the server are merged in when there is signal. Anyone signed in can
  suggest a correction to a mountain's facts; an app admin reviews the
  suggestions and approving one changes what every hiker sees.
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

The guide and the mountain catalog are static content that ship with the
app (`public/trail-data.js`, `public/mountain-catalog.js`), and a small
service worker (`public/sw.js`) caches the app shell after one online
visit, so the app opens with no connection. Reports and corrections go
through the server; the checklist, last location, name and basecamp
contact live only on the phone.

## Development

- `npm run build` compiles the stylesheet from `styles/tailwind-input.css`
  and `tailwind.config.js` to `public/tailwind.css` (the image build does
  this on every deploy).
- `npm test` runs the unit tests for the packing rules, the guide data and
  the mountain catalog.
- `npm start` runs the app; the platform injects `DATABASE_URL`,
  `USERNODE_JWT_PUBLIC_KEY` and the rest. Reports are stored in Postgres
  (`trail_reports`, `report_flags`, `mountain_edits`, created on boot).

To change the app, ask Homeroom bot on the platform, or run Claude Code
against this repo: start with `CLAUDE.md`, which carries the app-specific
notes and points at the platform rules.
