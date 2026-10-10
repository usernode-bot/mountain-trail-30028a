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

An offline trail guide and safety companion for hikers, built around one
mountain: Gede Pangrango by the Cibodas route. The guide (posts, water
sources, camps, the trail line) ships with the app as static content in
`public/trail-data.js`, so it works with no signal. Hikers report current
trail conditions (Slippery, Landslide, No water, Heavy fog) with one tap and
an optional photo, build a packing checklist from days and group size, and
share their last location as a message for basecamp or family. Reports are
shared through the server so the next hiker sees them. When a signed-in
hiker updates their location, a copy is sent to the server (queued offline
and replayed on reconnect) into a private, append-only table that nothing in
the app reads back; the phone keeps its own copy, and the checklist, name
and basecamp contact stay on the phone.

## Design

This app's look. Every later change follows it, and updates it when a
request changes the look on purpose.

- **Palette:** cool lichen and stone grey neutrals with a hint of green
  (not a warm cream), forest green as the action colour, and the trail's
  own subject colours: amber for warnings (Slippery, No water, Heavy fog),
  red for a blocked path (Landslide), map blue for water sources. Light
  and dark values live in `styles/tailwind-input.css` (`--ground`,
  `--accent`, `--warn`, `--danger`, `--water`, ...); `tailwind.config.js`
  names them.
- **Signature element:** the trail line. A dashed rail, drawn the way
  trails are drawn on a map, runs from basecamp down the screen to the
  summit. Each stop is a round node carrying its kind's icon (hut,
  signpost, drop, tent, peak), and the node's ring takes the colour of the
  stop's latest condition. The walk to the next stop sits on the line
  between nodes, and the height profile at the top repeats the same stops
  as coloured dots.
- **Type scale:** `text-title` (28 px bold, the mountain's name),
  `text-heading` (20 px semibold, tab headings), `text-body` (16 px),
  `text-small` (14 px). Headings use the system's rounded face
  (`font-display`, `ui-rounded`); body text the system sans.
- **Icons:** one drawn line set, one stroke width. Basecamp (a hut), post
  (a signpost), water (a drop), camp (a tent), summit (a peak with a
  flag), and one per condition: wet waves, a shedding slope, a crossed-out
  drop, stacked haze lines.

The kit is in `styles/tailwind-input.css`: colour tokens with a light and
a dark value (named in `tailwind.config.js`), and components
(`btn-primary`, `btn-secondary`, `field`, `list` and `list-row`,
`card`, `section-label`, `skeleton`, `state-empty`, `state-error`, plus
the trail line, status strip, condition buttons and tab bar).
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

- The guide data (mountain, stops, conditions) lives in
  `public/trail-data.js` and is shared with `server.js`, which validates
  every report's `stop_id` and `condition` against it. The stop table in
  this file's history is the source of truth; heights and distances are
  approximate, and a line on the Trail tab says so.
- The packing checklist (`public/packing.js`), the hiker's name and the
  basecamp contact are device-only, in `localStorage` under `mt:`
  (`mt:demo:` in the demo). They are never sent to the server.
- The last location is kept on the phone in `localStorage` under `mt:` and
  is ALSO sent to the server on each "Update my location" tap (queued in
  `mt:queue` while offline, replayed like reports). The server stores it in
  `hiker_locations`, an append-only table marked `staging:private`: no GET
  route reads it back and no hiker sees another's location. Guests and
  locations taken before this change are not sent.
- Reports show for 24 hours. Older ones stay stored but are never
  displayed anywhere.
- Two flags hide a report for everyone; the author's own reports are never
  hidden by flags. A report flagged by you disappears for you at once.
- The app ships no basecamp phone number: a wrong number in a safety app
  is worse than none. Every share message carries Indonesia's emergency
  number, 112.
- Offline: a service worker (`public/sw.js`) caches the shell after one
  online visit; it never caches `/api/`. Reports made offline queue in
  `mt:queue` and replay by `client_id`, so replays are idempotent.
- Geolocation is first asked for only on the tap of "Update my location". Once permission is granted, the
  app re-reads the position about every 20 minutes while it is open (never prompting on its own), and keeps
  the last fix and its timestamp when a read fails.
