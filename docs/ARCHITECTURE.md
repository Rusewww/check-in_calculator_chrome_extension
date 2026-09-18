# Check-in Calculator — Architecture & Tech Stack Proposal

Status: **Approved 2026-09-13** (decisions recorded in §8). Phases 1–2 (website)
implemented; phase 4 (Chrome extension) pending.
Date: 2026-09-13

> **Kept for provenance.** This record describes the original website (its own,
> separate repository now). This repository has since been converted to the
> Chrome extension described here — see the top-level [README.md](../README.md)
> for the extension's current architecture and layout.

## 1. What the product does

A user enters a departure airport (by IATA code), the scheduled local departure
date/time, and the airline's check-in opening window (N hours or N days before
departure). The app answers:

1. **When does online check-in open?** — shown in the airport's local time and in
   the user's chosen time zone, with the UTC offset of each.
2. **Status right now** — not open yet (with a live countdown), open, or the
   departure has already passed.
3. **Time-zone difference** between the airport and the user at the moment
   check-in opens (and a note if it differs at departure time, e.g. because a DST
   change falls inside a 30- or 60-day window).

Everything runs in the browser. No accounts, no server, no analytics, no data
leaves the device. This makes the web app and the future Chrome extension share
one code base and one deployment model.

## 2. Tech stack

| Concern             | Choice                                                                                       | Why                                                                                                                                                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Language            | JavaScript (ES2022 modules), `// @ts-check` + JSDoc types, checked with `tsc --noEmit` in CI | Requirement is JS. JSDoc gives editor autocomplete and CI type checks without a TypeScript compile step.                                                                                                                    |
| Build tool          | Vite 8                                                                                       | Fast, zero-config ESM bundling; one project can produce two outputs (website, extension popup) from separate configs.                                                                                                       |
| UI                  | Vanilla DOM, small component modules, one central state store                                | The UI is a single screen. No framework keeps the bundle tiny, avoids framework churn, and sidesteps Manifest V3 CSP problems (no inline scripts, no eval, no remote code). Can be swapped to Preact later if the UI grows. |
| Styling             | Plain CSS with custom properties; light/dark via `prefers-color-scheme`                      | No build-time CSS framework needed; same stylesheet in the extension popup.                                                                                                                                                 |
| Date/time           | Browser `Intl` API + IANA zone names, thin helper layer (`src/core/timezone.js`)             | See §5. Zero runtime dependencies.                                                                                                                                                                                          |
| Tests               | Vitest (unit, core logic) + Playwright (a few end-to-end smoke tests)                        | Core is pure functions → cheap, deterministic tests incl. DST edge cases.                                                                                                                                                   |
| Lint / format       | ESLint 10 (flat config) + Prettier                                                           | Consistency; runs in CI.                                                                                                                                                                                                    |
| Data pipeline       | Node 22+ script `scripts/build-airports.mjs`, `geo-tz` (dev-only)                            | See §4.                                                                                                                                                                                                                     |
| CI/CD               | GitHub Actions                                                                               | Lint + test + build on every PR; deploy to GitHub Pages on `main`; monthly data refresh PR.                                                                                                                                 |
| Hosting             | GitHub Pages (project site: `https://rusewww.github.io/check-in_calculator/`)                | Free, HTTPS, CDN, zero ops. Custom domain can be added later.                                                                                                                                                               |
| Extension (phase 2) | Chrome Manifest V3, action popup reusing `src/ui`, `storage` permission only                 | No host permissions needed because data is bundled.                                                                                                                                                                         |

Runtime dependencies: **none**. Everything else is a devDependency.

## 3. Repository layout

```
check-in_calculator/
├─ index.html                 # web entry (Vite)
├─ vite.config.js             # web build → dist/
├─ vite.extension.config.js   # phase 2: popup build → dist-extension/
├─ package.json
├─ jsconfig.json              # checkJs + strict for JSDoc types
├─ eslint.config.js, .prettierrc
├─ public/
│  └─ data/
│     ├─ airports.json        # generated, committed (see §4)
│     └─ airports.meta.json   # generated date, sources, counts, licences
├─ scripts/
│  └─ build-airports.mjs      # data pipeline
├─ src/
│  ├─ core/                   # PURE logic: no DOM, no fetch, fully unit-tested
│  │  ├─ timezone.js          # zonedToEpoch, epochToZoned, offsetAt, canonicalizeZone, listZones
│  │  ├─ period.js            # presets, custom-value validation, "hours" vs "days" semantics
│  │  ├─ checkin.js           # computeCheckIn({...}) → opensAt, status, countdown, offsets
│  │  ├─ airports.js          # search index: exact IATA → IATA prefix → name/city substring
│  │  └─ urlState.js          # app state ⇄ query string (shareable links)
│  ├─ data/
│  │  └─ airportSource.js     # loads airports.json (web: fetch same-origin; ext: bundled)
│  ├─ ui/                     # DOM components, each `mount(el, store)`
│  │  ├─ AirportSearch.js     # accessible combobox (ARIA), keyboard navigation
│  │  ├─ DepartureField.js    # <input type="datetime-local"> + validation
│  │  ├─ PeriodPicker.js      # tabs Hours/Days, preset chips, custom number input
│  │  ├─ TimeZoneSelect.js    # grouped by region, "Use my time zone" button
│  │  ├─ ResultPanel.js       # opens-at in both zones, offsets, status
│  │  ├─ Countdown.js         # 1 s ticker
│  │  ├─ store.js             # tiny observable state
│  │  └─ strings.js           # all UI text (ready for localisation)
│  ├─ web/main.js             # web entry: wires store, components, URL sync
│  └─ extension/              # phase 2: manifest.json, popup.html, popup.js
├─ tests/                     # Vitest unit tests (core), Playwright e2e
├─ docs/ARCHITECTURE.md       # this file
└─ .github/workflows/
   ├─ ci.yml                  # lint, typecheck, test, build (PR + push)
   ├─ deploy-pages.yml        # build + deploy to GitHub Pages on main
   └─ refresh-airports.yml    # monthly cron: rebuild data, open PR if changed
```

Rule: `src/core` never imports from `src/ui`, `src/data`, or the DOM. That is what
makes the same logic reusable in the extension and testable in Node.

## 4. Airport data ("the airports API")

### Why not a third-party live API

Every API evaluated either needs an API key (aviationstack, AirLabs, Aviation Edge,
Amadeus, API Ninjas) — which cannot be hidden in a public static site and would be
abused/rate-limited — or is keyless but lacks the airport time zone (airport-data.com)
or is not offered for third-party use (Travelpayouts data dump). A live dependency
also breaks the extension offline and adds latency and CORS risk to every search.

### What we do instead

We publish **our own static JSON endpoint** on GitHub Pages
(`/data/airports.json`), generated from open data by a build-time pipeline and
refreshed automatically. From the app's point of view it is an HTTP API (fetched at
runtime, cached by the browser); it is keyless, CORS-clean, and versioned. The loader
sits behind a small `AirportSource` interface so a live API could be plugged in later
without touching the UI.

### Sources (verified 2026-09-13)

| Source                                                                                                 | Licence       | What we take                                                                                                              |
| ------------------------------------------------------------------------------------------------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| OurAirports `airports.csv`, `regions.csv`, `countries.csv` (davidmegginson.github.io/ourairports-data) | Public domain | IATA/ICAO codes, name, municipality, ISO region → region name, country → country name, type, `scheduled_service`, lat/lon |
| mwgg/Airports `airports.json` (GitHub)                                                                 | MIT           | IANA time zone per airport (joined by ICAO, fallback IATA)                                                                |
| `geo-tz` npm package (build-time only)                                                                 | MIT           | Time zone from lat/lon for airports missing in mwgg                                                                       |

Measured today: 9,055 non-closed airports with a 3-letter IATA code, 0 duplicate
codes; mwgg supplies a zone for 7,807, the rest come from `geo-tz`. All 399 zone
names are accepted by `Intl.DateTimeFormat`.

### Pipeline (`scripts/build-airports.mjs`)

1. Download the four source files.
2. Keep rows with a valid 3-letter IATA code and `type != closed`.
3. Join region and country names; join time zone (ICAO → IATA → geo-tz).
4. **Validate** every zone with `Intl.DateTimeFormat` and **fail the build** if any zone
   is rejected or any IATA code is duplicated. Zone names are kept exactly as published
   by the source: current engines no longer canonicalize aliases through
   `resolvedOptions().timeZone`, so the app matches zones by exact identifier and the
   zone selector adds the airport's zone whenever the engine's own list lacks it.
5. Write `airports.json` (`{ fields: [...], airports: [[...], ...] }`, one airport per
   line so refresh diffs are reviewable) and `airports.meta.json` (generated timestamp,
   source URLs, counts, licence texts).

Size: ~1.1 MB raw, **~270 KB gzip** (GitHub Pages compresses). Loaded once, cached.
Search ranking: exact IATA code → IATA prefix (1–2 letters) or exact ICAO code → word of
the name or city → word of the region or country → substring of name/city → substring of
region/country. Within a tier, `scheduled_service=yes` and larger airports first. Free
text needs two characters, substrings three, so a single letter only matches codes.

The generated files are committed so the site build never depends on a third-party
download. A monthly GitHub Action reruns the pipeline and opens a PR when the data
changes, so updates are reviewable.

## 5. Time zones and the calculation

### Time-zone math: browser `Intl`, no network

The browser ships the IANA tz database (updated with the browser) and `Intl`
handles DST and historical rule changes. With an IANA zone per airport we never need
a network call to convert times. Reasons to avoid a time-zone web API
(worldtimeapi.org, timeapi.io): they add latency and a failure mode to every
calculation, have rate limits, sometimes lack CORS, don't work offline in the
extension, and reveal the user's zone to a third party. Requirement 4 says the
difference "can" be calculated with open APIs; the recommendation is to compute it
locally. The helper layer is ~80 lines with exhaustive tests; `Temporal` can replace
it once shipped in all target browsers.

Helpers (all in `src/core/timezone.js`):

- `offsetAt(epochMs, zone)` → UTC offset in minutes at that instant.
- `zonedToEpoch({y,m,d,hh,mm}, zone, disambiguation)` → epoch ms. DST policy follows
  the `Temporal` "compatible" rule: a non-existent wall time (spring-forward gap) is
  moved forward; an ambiguous wall time (fall-back overlap) takes the earlier
  instant. The UI shows a notice in both cases.
- `epochToZoned(epochMs, zone)` → wall-clock parts + UTC offset.
- `addDays(wall, n)` → calendar-day arithmetic for the "days" semantics.
- `listZones()` → `Intl.supportedValuesOf('timeZone')` (+ `UTC`), grouped by region in
  the UI, with the airport's and the device's zone added if missing.
- `isValidZone(name)` → whether the engine accepts the identifier (aliases included).

### Inputs

| Input          | Form                                                                                                                                             | Notes                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Airport        | IATA code via combobox                                                                                                                           | Also searchable by name/city for convenience.                                              |
| Departure      | `<input type="datetime-local">`                                                                                                                  | Interpreted as **local wall-clock time at the departure airport** (what the ticket shows). |
| Period         | Tabs **Hours** / **Days**; presets Hours: 12, 24, 36, 48, 72; Days: 3, 5, 7, 10, 30, 60; plus a custom positive integer in the active tab's unit | Limits: hours 1–8760, days 1–365.                                                          |
| User time zone | Select, **defaults to the airport's zone**; button "Use my device zone" (`Intl.DateTimeFormat().resolvedOptions().timeZone`)                     | Remembered in `localStorage` / `chrome.storage`.                                           |

### Semantics (approved)

- **Hours** = exact elapsed hours: `opensAt = departureEpoch − hours × 3600 s`.
- **Days** = same local wall-clock time N calendar days earlier, in the airport's zone
  (this is how "check-in opens 30 days before departure" is normally understood; it
  differs from `N × 24 h` only when a DST change falls inside the window, by 1 h).
  Implemented as one flag in `period.js`, so it can be switched if you prefer exact
  24-hour multiples.

### Outputs

- Opens-at in airport zone and user zone, each with `UTC±hh:mm`.
- Zone difference at the opening instant; note if the difference at departure differs.
- Status: `before-open` (countdown d/h/m/s, updated every second), `open` (opened X ago),
  `departed`.
- Notices when the departure or opening wall-clock time fell into a DST gap or overlap.
- Shareable URL: `?apt=LHR&dep=2026-10-05T14:30&per=24h&tz=Europe/Kyiv` (the `tz`
  parameter is only written when the user picked a zone explicitly).
- "Add to calendar" (see below) and "Copy link".

### Add to calendar

The opening moment can be saved as a 30-minute event (`src/core/calendar.js`):

- **Google Calendar**: a `calendar.google.com/calendar/render?action=TEMPLATE` link with
  the start and end written in UTC (`…Z`) so the event lands at the right instant in any
  calendar zone; `ctz` is set to the zone the user chose for display. Opens in a new tab;
  the user confirms inside Google Calendar, so nothing is written on their behalf.
- **.ics file** (Apple Calendar, Outlook, Thunderbird, …): a single `VEVENT` with UTC
  `DTSTART`/`DTEND`, a stable `UID` (re-importing updates instead of duplicating), a
  `VALARM` 10 minutes before opening, RFC 5545 text escaping and 75-octet line folding
  that never splits a multi-byte character. Generated in the browser as a Blob download;
  the same code will work in the extension popup.
- The event title, description (airport, opening time in both zones, departure, link
  back to the calculator) and location come from `src/ui/strings.js`, so they localise
  with the rest of the UI.

## 6. Quality bar

- Unit tests for every core function, including DST gap/overlap (Europe/London,
  America/New_York), 30-minute zones (Asia/Kolkata), 45-minute (Asia/Kathmandu),
  Lord Howe 30-minute DST, zones east of the date line (Pacific/Kiritimati), a
  60-day window spanning a DST change, and the 12/24/36/48/72 h and 3–60 d presets.
- Data tests: every airport has a canonical zone; no duplicate IATA codes; well-known
  codes (LHR, JFK, KBP, NRT, SYD…) resolve to the expected zone.
- Accessibility: ARIA combobox, tab-list semantics, keyboard-only operation,
  visible focus, colour-contrast AA.
- Browser support: evergreen Chrome/Edge/Firefox/Safari (needs `Intl.supportedValuesOf`, 2022+).
- No runtime dependencies → no supply-chain surface; `npm audit` in CI for dev deps.
- Conventional commits; PRs to `main` must pass CI; semantic version tags for releases.

## 7. Delivery phases

1. **Foundation** — scaffold (Vite, ESLint, Prettier, Vitest, CI), data pipeline,
   `src/core` with full tests.
2. **Web app** — UI components, URL state, dark mode, deploy to GitHub Pages.
3. **Polish** — Playwright smoke tests, localisation hooks, README, privacy page.
4. **Chrome extension** — MV3 popup reusing the UI, extension Vite config, store
   listing assets, privacy policy (hosted on the Pages site), CI job that zips the
   build on a version tag.

## 8. Decisions (approved 2026-09-13)

1. Airport data: self-hosted static JSON built from OurAirports + mwgg + geo-tz, not a
   keyed third-party API. **Approved.**
2. Time-zone math: local `Intl`, no time-zone web API. **Approved.**
3. "Days" semantics: calendar days at the same local time at the airport (a single
   `daysMode` flag in `computeCheckIn` switches to exact N × 24 h). **Approved.**
4. Custom value: a positive integer in the unit of the active tab (Hours tab → hours,
   Days tab → days); limits 1–8760 h and 1–365 d. **Approved.**
5. UI approach: vanilla JS components, no framework. **Approved.**
6. UI language: English first, strings isolated for later localisation. **Approved.**
7. Add to calendar: Google Calendar link as the primary action plus a downloadable
   `.ics` file for other calendars. **Approved (added at the user's request).**
8. Settings dialog: theme (system default, light, dark) and interface language
   (English default, Ukrainian, German). **Added at the user's request, 2026-09-13.**

## 9. Settings, theme and languages

- `src/ui/settings.js` persists `{ theme, language }` in `localStorage`
  (`checkin-calculator.settings`). The theme is applied by stamping `data-theme` on
  `<html>`; the stylesheet defines every colour as a `light-dark()` pair and only
  switches `color-scheme`, so "system" simply removes the attribute.
- `src/ui/strings.js` holds one table per language (`en`, `uk`, `de`). `t(key, params)`
  reads the active table with English as fallback, fills `{placeholders}`, and picks
  plural forms (`one/few/many/other`) with `Intl.PluralRules` when a value is an object.
  Ukrainian phrases that inflect after "за" use separate accusative keys. The type
  checker enforces that every language defines every key; a test checks placeholders
  and plural coverage.
- Components render their text when they mount and return a dispose function, so a
  language change re-mounts the UI on the same store (inputs and results are
  preserved). Dates use the language's locale (`uk-UA`, `de-DE`); English keeps the
  browser's own English variant and otherwise uses `en-GB`. Clock times on the
  boarding pass are always 24-hour (`formatClock`), as on departure boards.
- The controls live in the top bar (`src/ui/components/HeaderControls.js`): an
  Auto / Light / Dark segmented switch and a language button showing the current code
  that opens a menu.

## 10. Visual design

The UI implements the Claude Design project "Check-In Calculator UI mockups"
(`Mockups.dc.html`, screens 1a–1d; screen 1e is the future extension popup):

- Brand mark: a paper plane on a rounded tile, supplied by the user as two logos. The
  top bar renders one inline SVG (`src/ui/logo.js`) whose colours are theme tokens, so
  the light theme shows the white plane on the dark-violet tile and the dark theme the
  dark plane on the light-violet tile. Standalone copies: `public/logo-light.svg`,
  `public/logo-dark.svg`; `public/favicon.svg` follows the OS colour scheme.
- Type: Geist (UI) and Geist Mono (codes, times, labels) from Google Fonts, with system
  fallbacks.
- Palette: warm neutrals (`#f7f5f2` / `#15130f` backgrounds, `#e2dcd3` / `#322d27`
  borders) with a violet accent (`#6a35e0` light, `#a87dff` dark); the dark result band
  is solid `#4a2b8f`. All tokens are `light-dark()` pairs in `src/ui/styles.css`.
- Layout: a 436px inputs panel (airport "ticket" with inline search results, Date and
  Time boxes, preset row with an inline custom box, zone select) beside the result
  column; one column under 900px.
- Result: a boarding pass with a status band (countdown / open / departed), a hero
  opening time in the user's own zone (the airport time sits beside it, described
  relative to the user; when the zones match the airport time is the hero), a
  perforated tear line, and a stub. The mockup's third stub cell reads "Closes · at the gate"; since the app
  has no closing-time data, that cell shows the countdown to departure instead.
- Mockup-only extras that are not implemented: the mobile status bar and phone frame.
  The "Use my device time zone" link was dropped because the mockup has no such
  control; the device zone is still available in the select.
