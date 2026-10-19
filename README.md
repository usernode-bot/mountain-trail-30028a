# Mountain Trail

An offline trail guide and safety companion for hikers, built around Mount
Gede Pangrango by the Cibodas route. The whole interface speaks Indonesian
and English; the Location tab switches language. Four tabs along the
bottom:

- **Trail** — the guide: the mountain header, the trail's current status
  (open, open with limits, or closed, with the reason and how fresh the
  figure is), permits and daily quota with a link to the park's official
  SIMAKSI booking site, basecamp and summit weather with a three-day
  forecast and automatic warnings for strong wind or heavy rain on your own
  climbing days, a height profile, and the trail line from Basecamp Cibodas
  to Puncak Gede. Each of the nine stops (posts, water sources, camps) shows
  its latest condition and its landscape type (Mountain, Hill, Valley);
  chips above the trail line filter the stops by type. Tapping a stop opens
  its description and reports.
  A notifications section keeps you posted on status and weather changes if
  you follow the mountain.
- **Report** — one tap on Slippery, Landslide, No water, Heavy fog, Wildlife,
  Extreme weather or Fallen tree sends a condition report, with an optional
  note (200 characters) and photo. Reports are shared with every hiker and
  show for 24 hours; a "Still valid" tap from another hiker confirms the
  report (the count shows; it does not extend the 24 hours). Made offline, they wait on the
  phone and send when the signal is back. A report flagged by two people is
  hidden; authors can remove their own.
- **Packing** — a checklist that builds itself from the days on the mountain
  and the group size, and from the mountain itself (cold nights, frequent
  rain, water at Kandang Batu and Kandang Badak, all rubbish carried down).
- **Location** — the last saved coordinates, the nearest stop, and a message
  ready to share with basecamp or family (the device's share sheet, or copy).
  Every message carries Indonesia's emergency number, 112.

The trail status, permits and weather figures are curated with the app's
releases (`public/trail-data.js`): the platform offers no live source, so
each block says how old it is and shows "not verified" until a person has
confirmed it against the park's official pages.

## Language

The app reads in English or Bahasa Indonesia; the choice sits on the
Location tab and is kept on the phone (`mt:lang`, never sent anywhere).
Trail stop names stay as they are; conditions and every other string are
translated in `public/i18n.js`.

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
- `npm test` runs the unit tests for the packing rules, the guide data,
  status/weather/report-window logic and the language strings.
- `npm start` runs the app; the platform injects `DATABASE_URL`,
  `USERNODE_JWT_PUBLIC_KEY` and the rest. Reports are stored in Postgres
  (`trail_reports`, `report_flags`, `report_confirms`, created on boot).

To change the app, ask Homeroom bot on the platform, or run Claude Code
against this repo: start with `CLAUDE.md`, which carries the app-specific
notes and points at the platform rules.
