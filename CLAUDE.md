# Insta Snapshot

Instagram "Reels Wrapped": turns a user's Instagram data export into a weekly
profile (top creators, hashtags, watch time, binge sessions, loyal vs variety,
clubs).

## Repository layout

- `data/` — per-user Instagram exports (`<user>_liked_posts.json`,
  `_saved_posts.json`, `_videos_watched.json`) and the generated
  `<user>_reels.parquet` / `.csv`.
- `filter/transform.py` — builds the one-row-per-reel table; `load_reels(user)`.
- `features/*.py` — analysis functions over that table (`top_creators`,
  `top_hashtags`, `watch_hours`, `binge_sessions`, `classify`, `assign_club`).
  Each also runs as a CLI: `python3 features/<name>.py [user]`.
- `features/snapshot.py <user>` — runs every feature above and writes the
  results to **`data/<user>_snapshot.json`** (plain JSON: ISO times, 0–1
  shares; one section per feature plus `watch_time.busiest_day`). This file is
  what the frontend's snapshot pages and charts read; its shape is typed in
  `frontend/src/lib/snapshotData.ts` (keep in sync with `SCHEMA_VERSION`). A
  feature that raises becomes `{"error": "..."}` and is listed in
  `failed_sections`; the rest are still written. Top creators/hashtags keep the top 10 (`TOP_N`) and break
  ties alphabetically in the snapshot (the features themselves break ties
  arbitrarily, and `top_hashtags` can even change between runs), so
  rebuilding a snapshot gives the same file. When adding a feature, add a
  section to `SECTIONS` in `snapshot.py` and to `SnapshotData`.
- `frontend/` — Next.js (App Router) + Mantine + TypeScript app.

The backend is plain Python functions with no HTTP server of its own. The
one bridge is a Next.js route handler, **`POST /api/snapshot`**
(`frontend/src/app/api/snapshot/route.ts`): it saves the three uploaded files
as `data/<name>_liked_posts.json` / `_saved_posts.json` /
`_videos_watched.json`, runs `python3 filter/transform.py <name>` unchanged
(cwd = repo root), producing `data/<name>_reels.parquet` / `.csv`, then runs
`python3 features/snapshot.py <name>`, producing `data/<name>_snapshot.json`. It only
works when the Next server runs locally next to the repo (it writes to disk).
Env overrides: `SNAPSHOT_PYTHON` (a Python with pandas + pyarrow, default
`python3`), `SNAPSHOT_REPO_ROOT` (default: `frontend/..`). Names must match
`src/lib/snapshotName.ts` (lowercase letters, numbers, `-`, `_`; ≤ 40); an
existing name is overwritten.

The frontend must not fake responses. Call the backend only through
`frontend/src/lib/api/` (one small function per endpoint: `snapshot.ts` for
the route above; `apiRequest` in `client.ts` for a future external API),
never with `fetch` inside components.

## Pages

- `/` — landing: film hero with the left-aligned title, then the description
  blocks below the film (white on the deep red).
- `/upload` — the movie screen on the deep red background: the user adds
  `liked_posts.json`, `saved_posts.json` and `videos_watched.json` by dropping
  them on the screen or clicking it; a counter under it shows how many are in.
  The browser first checks each file (`src/lib/instagramFiles.ts` identifies it
  by name and checks it's a JSON list of entries with `timestamp`s). Below the
  counter, a name field and **Create Snapshot** (enabled once all three are in
  and the name is valid) send them to `POST /api/snapshot`; the screen shows
  "Saving and processing…", then "Snapshot created" with the reel count from
  `transform.py` and the snapshot file name, or the error under the counter
  (including any snapshot sections that failed). On success it goes straight
  to `/snapshot/<name>/top-creators`.
- `/snapshot/<name>/<step>` — **the snapshot sequence**, in the order of
  `src/lib/snapshotSequence.ts`. Every page is a server component reading
  `data/<name>_snapshot.json` through `src/lib/server/snapshotStore.ts`
  (`readSnapshot`; 404 if missing), wrapped in `SnapshotPage` (title,
  subtitle, then Back / Next links to its neighbours; the last page's Next
  is "Start over"). The left / right arrow keys do the same (`ArrowKeyNav`),
  but stop at both ends: no wrap from the share card back to the start;
  ignored while typing in a field or with a modifier key held. A failed or empty section shows one line of copy
  (`SnapshotMessage`) instead. Copy lives in `src/content/snapshot.ts`;
  formatting helpers (week range, "4h 57m", local times) in
  `src/lib/snapshotFormat.ts`.
  1. `top-creators` — first page; upload success lands here. `top_creators`
     (top 10) as a `BarChart` with no table toggle; the subtitle's date range comes from `watch_time.per_day`.
  2. `top-hashtags` — `top_hashtags` (top 10) as a `BarChart` with no
     table toggle.
  3. `watch-time` — total time as a `HeroStat`, the busiest day under it,
     then a `StatList` (scroll distance in inches and miles from
     `watch_time.scroll`: one reel = one scroll = one ~6in phone screen,
     `SCROLL_INCHES_PER_REEL` in `reels_watched_duration.py`; reels and time
     per day on average), then a `ColumnLineChart`:
     one vertical column per day with a line joining the column tops, the
     busiest day's value labeled (tooltip adds that day's reel count).
  4. `binge` — the longest session as a `HeroStat` (local day and times,
     reel count), session count and median in a `StatList`, then the
     longest sessions as a `BarChart`.
  5. `loyalty` — the Loyal / Variety verdict as a `HeroStat`, the 0–100
     score on a `ScoreMeter` (dashed tick at 50, the backend's threshold),
     then the metrics in a `StatList`.
  6. `club` — the club as a `HeroStat`, then every club's share as a
     `BarChart`.
  7. `share` — `ShareCard`: one line per earlier page on a white card in a
     black frame (the movie-screen look, red text), with **Share** (the
     device share sheet, only shown where `navigator.share` exists) and
     **Copy text** (clipboard) sending the same lines as plain text.

## Running the frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
npm run build      # production build + type check
npm run typecheck
```

Requires Node 20.9+. API base URL goes in `frontend/.env.local` as
`NEXT_PUBLIC_API_URL` (see `.env.example`); unset until a backend API exists.

## Frontend design system

The design should read like a cinema: a deep red background, film running
across the screen, a clapperboard to open, a movie screen to drop files on. Beyond that motif it stays quiet:
hierarchy comes from type size and 1px rules, not from color, shadows or boxes.

**All values live in `frontend/src/theme/tokens.ts`.** `theme.ts` maps them into
Mantine and exposes the rest as `--snapshot-*` CSS variables. Components read
tokens through Mantine props (`c="ink.9"`, `p="lg"`) or CSS variables in CSS
modules — never raw hex, px or font names. Do not add a color, font, spacing
step, radius or shadow without a clear reason; if you must, add it to
`tokens.ts` and document it here.

### Color

| Token | Value | Use |
| --- | --- | --- |
| `theatre` | `#5C0A14` | Deep red: the solid page background on every page (Mantine `white`, `color.background`), and red text on white (`textOnFilm`). Scale `theatre.0`–`theatre.9`. |
| `paper` | `#FFFFFF` | Pure white: all text on red (Mantine `black`), the film's frames and sprocket holes, clapperboard stripes. |
| `ink` | `#0B0A09` | Deep black: the film's edges and gaps, the clapperboard, the movie screen's frame (scale `ink.0`–`ink.9`). |

Semantic roles (`color.*` in tokens / `--snapshot-color-*`): `text` = white
(13.9:1 on the deep red), `textMuted` = white too —
**there is no dimmer text**; make secondary text smaller or lighter-weight
instead. `border` = white at 40% (decorative hairlines), `borderStrong` = white
(placeholder outlines, a UI boundary). `filmEdge` = ink, `filmFrame` = white,
`textOnFilm` = theatre (red copy on white, 13.9:1), `screenFrame` = ink (the
movie screen's masking frame), `added` = `#4ADE80` — **status green, used only
for an upload file name once that file is in** (filled green with ink text:
8.0:1 against the deep red, ink on it 11.4:1); never decoration. There is no
accent color. Mantine's color scheme is forced to "light", which here means
red background and white text.

No gradients: the page background is a single solid color. Hard-edged stripe
patterns (film, clapper) are patterns, not gradients. If the background red
ever changes, recheck white text contrast (it must stay ≥ 4.5:1).

### Typography (1 font)

**Instrument Sans** (variable, via `next/font` in `src/app/fonts.ts`). Never add
a second family; create hierarchy with size and weight.

| Token | Size | Use |
| --- | --- | --- |
| `xs` | 12px | Fine print |
| `sm` | 14px | Labels, meta |
| `md` | 16px | Body |
| `lg` | 20px | Lead text |
| `xl` | 24px | Section headings (`h2`) |
| `display` | `clamp(56px, 12vw, 152px)` | Hero title only (`h1`) |

Weights: 400 regular, 500 medium, 600 semibold (headings, labels), 700 bold
(only for instructions that must read as bold — the upload screen's line). Line height:
0.92 display / 1.2 headings / 1.55 body. Letter spacing: −0.045em display,
−0.015em headings.

### Spacing (4px base)

Component spacing: `xs` 4, `sm` 8, `md` 16, `lg` 24, `xl` 40 (Mantine spacing
keys). Page rhythm: `--snapshot-space-section` 64 (between sections),
`--snapshot-space-page` 96 (top/bottom of major areas). Content width 1152px
(`Container` default), side padding `lg`. Header height 64.

### Radius

One radius: **4px** for anything with corners (every Mantine radius key is
4px; `--snapshot-radius`). Layout regions and dividers are square. No pills,
no large rounded cards.

### Lines, depth and motion

- Structure comes from 1px rules: `--snapshot-border-hairline` (`border`).
- Unfilled content slots use `--snapshot-border-placeholder` (1px dashed
  `borderStrong`) so placeholders are visibly unfinished.
- Shadows are disabled (all Mantine shadows are `none`). No glows, gradients or
  floating decoration.

### Cinema motif and motion

The visual motif is **cinema**: film and the clapperboard
(`src/components/cinema/`), and the movie screen on the upload page
(`src/components/upload/`). Motion is allowed only for the film and
clapperboard, and for **chart entrances** on snapshot pages (below);
everything else stays still.

- **Film** (`FilmStrip`): fills the whole hero, directly from the header to the
  description section below, with no rules at either edge —
  the film's own black edge meets the red background. Full-strength
  ink edges with square paper sprocket holes, paper frames with ink gaps; fixed pixel
  geometry (`film` tokens: 44px edges, 200px frame period, 16px gap), so frames
  stretch vertically like portrait reel frames. Runs right-to-left, one frame
  per `--snapshot-film-frame-duration` (3s), linear, looping.
- **Text over film** (see `Hero.module.css`):
  - The hero title uses `mix-blend-mode: difference` with plain paper color:
    black on frames, paper on edges/gaps, so it is always readable as the film
    moves. Only neutral colors work with this blend; tinted ones shift hue.
  - The title is vertically centered on the film and left-aligned to the
    content container (same left edge as the blocks below). Nothing
    else sits on the film; copy goes below it, in white on the deep red.
  - If copy ever has to sit on the film, use `textOnFilm` (theatre red) with no
    blend, inside the frame area (clear of the 52px sprocket edges).
- **Intro** (`IntroClapper` + `Clapperboard`): a full-screen deep-black
  clapperboard (striped arms across the top, slate below) snaps shut, then the
  whole board lifts off the top of the screen (~1.75s). Plays once per browser
  session (`sessionStorage`), skippable by click. Ink and paper only.
- Easing: `--snapshot-ease-out` for entrances, `--snapshot-ease-in` for the
  clapper snap, `--snapshot-ease-in-out` for the board lifting away. Tokens live
  in `motion` / `film` in `tokens.ts`.
- **Every animation is off under `prefers-reduced-motion`**: the strip stands
  still and the intro never renders.
- **Movie screen = drop zone** (`upload/UploadScreen`): a white picture inside
  a black masking frame (`screenFrame`), text in `textOnFilm`, directly on the
  deep red background (no theatre decor). Dragging files over it marks the picture's
  edge with a dashed red outline. Inside the screen: **"From your Instagram
  data export add:"** in bold, then "Click or drag them in". Under it, one row:
  the three file names as pills on the left (white outline while waiting;
  **filled green** with ink text once that exact file is in, plus a hidden
  "added" for screen readers — no check marks), then the counter ("2 of 3
  files added", regular weight) on the right. Any problem (unreadable file, a
  file that isn't one of the three) is listed as a short line below that row.
- **Charts** (`src/components/snapshot/BarChart`, shared by every snapshot
  page, following the dataviz guidance; `ScoreMeter` uses the same bar spec;
  `ColumnLineChart` on the time-on-reels page is the vertical variant below):
  one white series on the deep red (13.9:1), so no legend — the page title
  names it. Bars ≤ 24px thick, square at the baseline (a 1px hairline), 4px
  rounded data-end, value at the tip in the text color. Entrance: bars grow
  from the baseline one after another (0.7s `--snapshot-ease-out`, 0.1s
  stagger), each value fades in as its bar lands; off under
  `prefers-reduced-motion`. The whole row is the hover/focus target: the bar
  gets a white outline and a white tooltip at its tip (value first, then the
  row's label). Every chart has a "View as table" toggle with the same numbers, except
  top creators and top hashtags (`table={false}`).
- **Column + line chart** (`ColumnLineChart`): vertical columns ≤ 24px wide,
  4px rounded top, in white at 40% (`border`) so the solid white 2px line
  over their tops and its dots (2px deep-red ring) stay readable; one series,
  one axis — the line traces the same values. Only the highlighted point
  (busiest day) is labeled. Entrance: columns grow up (0.08s stagger), then
  the line is wiped in left to right (a clip, not a dash animation, which
  breaks with `vector-effect: non-scaling-stroke`); off under
  `prefers-reduced-motion`.
- Don't add other animations. Film art is built from tokens in
  `cinema/filmArt.ts`, never hard-coded colors.
- The header has no logo. (`public/logo-black.webp` is no longer used.)

### Component conventions

- Components live in `src/components/<area>/`, one component per file with a
  co-located `*.module.css`. Shared layout pieces go in `components/layout/`.
- Page copy lives in `src/content/` (e.g. `landing.ts`), not inside components.
  A `null` copy value renders a `PlaceholderBlock`; never invent copy, features,
  stats, testimonials or sample results.
- Navigation only links to pages that exist. The header (`AppHeader`, a client
  component because it reads the path) holds one plain white text link, no box
  (copy in `src/content/navigation.ts`):
  - on `/`: **Get Snapshot** → `/upload`, top right;
  - on `/upload`: **Go Back** → `/`, top left (a link home, not browser
    history, so it works when `/upload` is opened directly).
- Visually hidden text (for screen readers) uses a local `.visuallyHidden`
  class: absolutely positioned, 1px, clipped.
