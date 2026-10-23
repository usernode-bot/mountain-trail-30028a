# Mountain Trail — notes for Claude Code

This app runs on **Homeroom**. If you're Claude Code
editing this repo, read the platform conventions before making
changes:

**Platform conventions (authoritative, always current):**
https://app.onhomeroom.com/claude.md

Fetch that URL at the start of each session — it's the single source
of truth for platform-wide behavior (auth model, `USERNODE_ENV`,
public/private tables, "don't `git push`", etc.). The hosted copy is
updated in place when platform rules change, so fetching it gives you
today's rules, not a stale snapshot.

When running inside Homeroom's dev-chat, those same conventions are
already injected into your system prompt, so the fetch is a no-op in
that path — but it's the right reflex when someone runs Claude Code
against this repo locally or from another harness.

## Connector permission prompts

This repo ships `.claude/settings.json`, which allows the **read-only**
Homeroom connector calls (`mcp__homeroom__get_*`,
`…__list_*`, `…__whoami`) so they stop prompting one at a time. Everything
that acts — filing a request, opening or advancing a proposal — still asks.
Claude Code applies those rules only after you accept the
workspace trust dialog, which lists them for review. See `.claude/README.md`
for the whole story, including what to do if you are still being prompted
(usually: your connector is registered under a different name than the rules
assume).

## Check that this checkout is current

You may be working in a fork of this app whose `main` is behind the app's
canonical repository, and nothing in the checkout says so: `git fetch origin`
compares the fork with itself. This matters before you **read** code to answer
a question about how the app behaves now, not only before you edit it.

The canonical repository is named in `.claude/homeroom-canonical-repo`. Check against
it, not against `origin`:

```sh
git fetch "$(cat .claude/homeroom-canonical-repo)" main
git merge-base --is-ancestor FETCH_HEAD HEAD && echo current || echo behind
```

`behind` means this checkout does not contain the canonical `main`. To answer
a question, read the canonical code instead (`git show FETCH_HEAD:<path>`,
`git grep <pattern> FETCH_HEAD`). To change code, start from the exact base
commit your Homeroom work order gives, and never merge or rebase onto the
canonical `main` yourself: which commit a change is diffed against decides
what the group votes on. With the Homeroom connector, `get_checkout_status`
answers the same question.

A session-start hook (`.claude/hooks/homeroom-freshness.sh`, see `.claude/README.md`) runs
this check for you and tells you when you are behind. It is silent offline, so
its silence is not proof the checkout is current. Inside Homeroom's dev-chat
the platform fixes the base commit, and none of this applies.

## Starter template

The screen this app currently ships — the "Starter template" hero with
the app's thumbnail tile and the plain-English note on how the app gets
built (by asking Homeroom bot) — is placeholder content from the
Homeroom starter template, not product intent.

When the user asks for their first real feature, REPLACE the template
screen rather than building alongside it:

- remove the `usernode-starter-notice@1` block in `public/index.html`
  (both sentinel comments and everything between them),
- rewrite `README.md` to describe the actual app.

Keep the `usernode-dev-console@1` forwarder `<script>` when rewriting the
HTML — that block is platform infrastructure, not template content. So is
the bridge `<script>`. The design kit is not placeholder either: build the
real app with it, and fill in "## Design" below.

The screen has a light and a dark look and follows the viewer's Homeroom
theme, switching live when they change it: the theme `<script>` right after
the bridge tag sets a `dark` class on `<html>`. Keep that script, and give
everything you build both looks (the design kit's colour tokens carry both), unless one
fixed look is the point of this app, like a game's own scene; then say so
under "## Design" below. Unless a request asks for one, add
no theme picker: the viewer's Homeroom setting is the control. "The
platform's light/dark theme inside the app frame" in the platform
conventions has the details.

If a rule below this line conflicts with the hosted conventions, the
hosted conventions win. This file is **app-specific** — write down
things about *this* app that belong in the repo: product intent,
data-model quirks, style preferences, opt-in policies (e.g. which
tables you've marked private), etc.

---

## About Mountain Trail

An offline trail guide and safety companion for hikers, built around a
national catalog of Indonesian mountains grouped by island, with Gede
Pangrango by the Cibodas route as the default destination. The Mountains
tab lists every mountain with search, difficulty, height and status
filters, a Popular strip and saved guides; tapping one opens its own copy
of the existing guide (Trail, Report, Packing, Location) with the same
status, permits, weather, stops and reports. The whole interface speaks
Bahasa Indonesia (the default), English, Basa Jawa, Basa Sunda and Bahasa
Melayu (one file per language in `public/lang/`, loaded by
`public/i18n.js`; a globe button beside Saved on the Mountains tab and the
buttons on the Location tab switch, the choice is remembered on the
phone). The guide ships with the app as static
content in `public/trail-data.js`, which also carries each route's curated
status, permits and quota, and Gede's 3-day forecast, every block
timestamped and marked "not verified" until a person confirms it, because
the platform offers no live source. Every route's figures carry an
"Estimate, not a survey" label. Hikers report current trail conditions
(Slippery, Landslide, No water, Heavy fog, Wildlife, Extreme weather,
Fallen tree) with one tap and an optional photo, confirm someone else's
report as "Still valid" (a count, it does not extend the 24 hours), build
a packing checklist from days, group size and the open mountain, and share
their last location as a message for basecamp or family. Reports are shared
through the server so the next hiker sees them. When a signed-in hiker
updates their location, a copy is sent to the server (queued offline and
replayed on reconnect) into a private, append-only table that nothing in
the app reads back; the phone keeps its own copy, and the checklist, name
and basecamp contact stay on the phone.

## Design

This app's look. Every later change follows it, and updates it when a
request changes the look on purpose.

- **Palette:** cool lichen and stone grey neutrals with a hint of green
  (not a warm cream), forest green as the action colour, and the trail's
  own subject colours: amber for warnings (Slippery, No water, Heavy fog),
  red for a blocked path (Landslide), map blue for water sources. The
  mountain banner adds its own sky — dawn, morning mist and dusk
  (`--sky-1` / `--sky-2` / `--sky-3` with `--sky-glow`), and the forest
  ridgeline (`--ridge`, `--mist`). These are subject colours, not a second
  accent. Light and dark values live in `styles/tailwind-input.css`
  (`--ground`, `--accent`, `--warn`, `--danger`, `--water`, ...);
  `tailwind.config.js` names them.
- **Signature elements:** the mountain banner and the trail line.
  - The banner (`.hero`) opens the Trail tab and every tab's heading: a
    soft dawn-to-dusk gradient card with layered ridge silhouettes and a
    slow band of drifting mist (`motion-safe`; still where the viewer asks
    for reduced motion). The Trail tab's version carries the mountain's
    name and summit height in large type, the route line, the colour-mode
    button, and small chips for difficulty, distance and trail status.
    The Report, Packing and Location tabs use the compact `.banner` at the
    same sky.
  - The trail line. A dashed rail, drawn the way trails are drawn on a map,
    runs from basecamp down the screen to the summit. Each stop is a round
    node carrying its kind's icon (hut, signpost, drop, tent, peak), and
    the node's ring takes the colour of the stop's latest condition. The
    walk to the next stop sits on the line between nodes, and the height
    profile above it repeats the same stops as coloured dots.
- **Type scale:** `text-hero` (34 px bold, the mountain's name),
  `text-title` (28 px bold, the summit height), `text-heading` (20 px
  semibold, banner headings), `text-body` (16 px), `text-small` (14 px).
  Headings use the system's rounded face (`font-display`, `ui-rounded`);
  body text the system sans. Spacing is roomy: sections are 32 px apart,
  cards pad 20 px and list rows 14 px.
- **Icons:** one drawn line set, one stroke width. Basecamp (a hut), post
  (a signpost), water (a drop), camp (a tent), summit (a peak with a
  flag), and one per condition: wet waves, a shedding slope, a crossed-out
  drop, stacked haze lines. Landscape types: two peaks (Mountain), one
  rounded hump (Hill), a U-shaped dip over a stream line (Valley), shown
  once beside the mountain's name.
- **Filter chips:** `chip` / `chip-on` above the trail line (All, Post,
  Water, Camp, Junction, each with its count of stops), shaped like the
  profile's stop chips. A junction (a side path leaves) is a forked line.
- **Mountain cards:** every mountain on the Mountains tab is a card
  (`mtn-cards`, `mtn-card`): the Trail tab's mountain banner shrunk to a
  card, with a soft green band and ridgeline, the status chip over it, the
  landscape icon and name beside the summit height, the province, the time
  up and a bookmark button of its own in the top corner. The difficulty
  badge (`diff-badge`) is the one place difficulty takes a colour: green
  for Easy, amber for Moderate, red for Hard, always with its three-step
  meter so the level reads without the colour. The Trail tab keeps its
  neutral meter.

The kit is in `styles/tailwind-input.css`: colour tokens with a light and
a dark value (named in `tailwind.config.js`), and components
(`btn-primary`, `btn-secondary`, `field`, `list` and `list-row`,
`card`, `section-label`, `skeleton`, `state-empty`, `state-error`, plus
the mountain banner `hero` / `hero-chip` / `hero-theme`, the compact
`banner`, the trail line, status strip, condition buttons and tab bar).
Re-theme by changing the token values there, keeping every text pair at
4.5:1 or more in both looks.

- Colour comes only from the tokens (`bg-ground`, `bg-surface`,
  `text-fg`, `text-muted`, `border-line`, `bg-accent` with
  `text-on-accent`, ...): never a raw hex value or a stock palette class.
- Tap targets are at least 44 px; the buttons and fields already are.
- A field's label says what it is; its placeholder, if any, is an example
  that says so ("e.g. 0812 0000 0000"), never a bare value that could pass
  for one already entered.
- Every screen that loads data has honest loading, empty and error states.
  Never show the empty state while loading or after a failure; an error says
  what failed, what still works, and offers Retry. The guide itself never
  loads: it is part of the app.
- Seed obviously fake staging demo data so the populated screen can be seen
  ("Staging mock data" in the platform conventions).
- No cards in cards, no uppercase eyebrows, no emoji as icons.

## App-specific conventions

- The colour mode is a device setting in `mt:theme` (the same key in the
  demo): `auto`, `light` or `dark`. Auto follows the viewer's Homeroom
  theme first and the device preference outside Homeroom; a pick wins
  until the hiker cycles back to Auto. The button in the mountain banner
  (`public/theme.js` for the decision, `index.html` for applying it,
  `app.js` for the label) is the only control. The pick is never sent to
  the server, and a new copy string goes in both dictionaries under
  `theme.*`.

- The app reads in Bahasa Indonesia, English, Basa Jawa, Basa Sunda or
  Bahasa Melayu (request #42). The language lives in `mt:lang` in
  localStorage (the same key in the demo and outside it) and is never sent
  to the server; Bahasa Indonesia is the default and any unknown value is
  Indonesian. Each language's strings are one file in `public/lang/`
  (`id.js`, `en.js`, `jv.js`, `su.js`, `ms.js`), loaded before `i18n.js`
  in `index.html` and precached by the service worker. A key a language
  lacks reads in Indonesian (then English, which only adds English
  plurals). New user-facing strings go in BOTH `id.js` and `en.js` (with a
  `data-i18n`/`data-i18n-label`/`data-i18n-placeholder` attribute in
  `index.html` for static text); the test in `test/i18n.test.js` keeps
  those two in step. `jv.js`, `su.js` and `ms.js` translate the interface
  chrome; the guide's long texts (stop descriptions, packing items) fall
  back to Indonesian until someone translates them, and may carry only
  keys `id.js` has. The `dapp.json` checks read the Indonesian text. Stop names are never
  translated. Reports store condition ids on the server; labels are only
  for display and translate per viewer.
- The guide data (mountain, stops, conditions) lives in
  `public/trail-data.js` and is shared with `server.js`, which validates
  every report's `stop_id` and `condition` against it. The stop table in
  this file's history is the source of truth; heights and distances are
  approximate, and a line on the Trail tab says so.
- The packing checklist (`public/packing.js`), the hiker's name and the
  basecamp contact are device-only, in `localStorage` under `mt:`
  (`mt:demo:` in the demo). They are never sent to the server.
  The same goes for the share queue `mt:shareQueue` (`mt:demo:shareQueue`):
  location messages tapped with no signal, at most 5, each sent only through
  the WhatsApp or SMS app the hiker opens themselves.
- The last location is kept on the phone in `localStorage` under `mt:` and
  is ALSO sent to the server on each "Update my location" tap (queued in
  `mt:queue` while offline, replayed like reports). The server stores it in
  `hiker_locations`, an append-only table marked `staging:private`: no GET
  route reads it back and no hiker sees another's location. Guests and
  locations taken before this change are not sent.
- The Offline section on the Trail tab saves today's reports and their
  photos on demand: `mt:offlinePack` (its record) and the `mt-photos` Cache
  Storage entry are device-only and never sent. A save never changes which
  data wins online: live reports always do. `public/sw.js`'s `PRECACHE` and
  `SHELL_FILES` in `public/status.js` must stay in step (tested).
- Reports show for 24 hours. Older ones stay stored but are never
  displayed anywhere.
- Two flags hide a report for everyone; the author's own reports are never
  hidden by flags. A report flagged by you disappears for you at once.
- Shared front-end logic lives in small UMD factory modules next to the
  guide: `public/status.js` (status tones, weather-warning thresholds, the
  24-hour report window) and `public/i18n.js` (lookup, plurals, dates and
  numbers over the per-language files in `public/lang/`). All are precached
  by the service worker like `trail-data.js`. New user-facing copy goes in
  `public/lang/`, never inline.
- "Masih berlaku" confirmations live in `report_confirms`, a public
  append-only table like `report_flags`: one row per hiker per report (the
  primary key), a re-sent tap no-ops on its `client_id`. The count shows on
  the trail banner and the stop's report row; confirming never extends a
  report's 24 hours, and old reports cannot be confirmed.
- The app ships no basecamp phone number: a wrong number in a safety app
  is worse than none. Every share message carries Indonesia's emergency
  number, 112.
- Offline: a service worker (`public/sw.js`) caches the shell after one
  online visit; it never caches `/api/`. Reports made offline queue in
  `mt:queue` and replay by `client_id`, so replays are idempotent.
- The guide is three levels deep (request #30): destination (a mountain,
  hill or valley) > route > stop. `public/trail-data.js` declares
  `DESTINATIONS` (each with `category`, one of `LANDSCAPES` = `gunung` /
  `bukit` / `lembah`, plus `island`, province, peaks, status and permits),
  each with `routes` (figures, weather, optional own status/permits,
  `stops`). `ISLANDS` is the catalog's display order and `POPULAR` its
  eight named mountains. The category lives on the destination only; stops
  carry no category, only their `kinds` (basecamp, post, water, camp,
  junction, summit). Stop ids are unique across every route because reports
  store a bare `stop_id`; never rename the Cibodas ids, and new routes use
  the `<route-id>-<slug>` prefix. `MOUNTAIN` and `STOPS` are views of the
  default route (`mountainView`), so the screens and `server.js` read one
  shape; the server validates reports against `ALL_STOPS`.
- The Mountains tab (`public/catalog.js`) filters and groups by island.
  Its Difficulty, Height, Island and Status filters live in one Filter
  sheet, session-only like the search.
  The selected mountain lives in `mt:mountain` and `?mountain=<id>`; its
  four guide tabs read the same data as Gede Pangrango. Saved guides live
  in `mt:savedMountains` on the phone only. Reports, the nearest stop and
  the packing notes are scoped to the open route.
- The Trail tab's chips filter stops by type (`STOP_TYPES`: Post, Water,
  Camp, Junction, plus All), each counting stops on the route. The filter
  starts at All on every visit and is never stored; while filtered, leg
  lines are hidden. The profile and the Report picker are not filtered.
  The mountain's category shows once, under its name.
- Each route may carry a `difficulty` from `DIFFICULTIES` (easy, moderate,
  hard), shown under the route description on the Trail tab and approximate
  like the other route figures. A route without one shows nothing. The
  server does not read it.
- Geolocation is first asked for only on the tap of "Update my location". Once permission is granted, the
  app re-reads the position about every 20 minutes while it is open (never prompting on its own), and keeps
  the last fix and its timestamp when a read fails.
