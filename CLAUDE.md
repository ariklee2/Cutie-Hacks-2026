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
  `failed_sections`; the rest are still written. Top creators/hashtags break
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

- `/` — landing: the first screen (`Hero` `.stage`, viewport height minus the
  header) is plain page red with the film near the top — a 24px strip of red
  between it and the header, the rest of the screen red below — nothing else
  visible, so the sections start just below the fold.
  Then one full-width
  **section band** per copy block (`AboutSection`): large heading on the left,
  text on the right, each band one shade lighter red than the one above
  (`band1` = theatre.7 `#6E0F1C` → `band2` = theatre.6 `#8A1626`; white text
  12.0:1 / 9.4:1). A new section takes the next band token; don't go lighter
  than theatre.6 behind white text.
- `/upload` — a **light page** (white background, black text) with the drop zone: the user adds
  `liked_posts.json`, `saved_posts.json` and `videos_watched.json` by dropping
  them on the screen or clicking it; each file's name under the screen turns green once it's in.
  The browser first checks each file (`src/lib/instagramFiles.ts` identifies it
  by name and checks it's a JSON list of entries with `timestamp`s). Under the
  screen, a name field and **Create Snapshot** (enabled once all three are in
  and the name is valid) send them to `POST /api/snapshot`; the screen shows
  "Saving and processing…", then "Snapshot created" with the reel count from
  `transform.py` and the snapshot file name, or the error under the toolbar
  (including any snapshot sections that failed). On success it goes straight
  to `/snapshot/<name>/top-creators`.
- `/snapshot/<name>/top-creators` — **first page of the snapshot sequence**.
  Server component reading `data/<name>_snapshot.json` through
  `src/lib/server/snapshotStore.ts` (`readSnapshot`; 404 if missing). Shows
  `top_creators` as an animated horizontal bar chart (`TopCreatorsChart`); the
  subtitle's date range comes from `watch_time.per_day`. Later sequence pages
  go under `/snapshot/<name>/…` and read the same file; copy lives in
  `src/content/snapshot.ts`.

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
`textOnFilm` = theatre (red copy on white, 13.9:1), `added` = `#4ADE80` —
**status green, used only for an upload file name once that file is in**
(filled green with ink text, 11.4:1); never decoration. There is no accent
color. Mantine's color scheme is forced to "light", which here means red
background and white text.

**Light pages** (currently only `/upload`): a page puts
`data-surface="light"` on its root element, and `globals.css` switches the
whole `<body>` (so the shared header too) via `body:has([data-surface='light'])`
to `lightBackground` = white with `lightText` = ink (19.8:1), re-pointing
`--snapshot-color-text`, `-text-muted`, `-text-on-film`, `-background` and the
hairline/placeholder borders. `lightAccent` = theatre red (13.9:1 on white) is
for the drop zone's dashed border and the button outline. Components keep using
the normal text variables; never hard-code light colors in a component.

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

Weights: 400 regular, 500 medium, 600 semibold (headings, labels). Line height:
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
no large rounded cards. Exception — **square (0) corners** on the upload
page's drop zone, its `.json` file labels and name field, and on the buttons: the header link
(Get Snapshot / Go Back) and Create Snapshot.

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

- **Film** (`FilmStrip`): fills the film block edge to edge sideways, near the
  top of the red first screen (red above and below, no rules) — the
  film's own black edge meets the red background. Full-strength
  ink edges with square paper sprocket holes, paper frames with ink gaps; fixed pixel
  geometry (`film` tokens: 44px edges, 200px frame period, 16px gap), so frames
  stretch vertically like portrait reel frames. Runs right-to-left, one frame
  per `--snapshot-film-frame-duration` (3s), linear, looping.
- **Text over film** (see `Hero.module.css`):
  - The hero title uses `mix-blend-mode: difference` with plain paper color:
    black on frames, paper on edges/gaps, so it is always readable as the film
    moves. Only neutral colors work with this blend; tinted ones shift hue.
  - The title is vertically centered on the film and left-aligned to the
    content container (same left edge as the sections below). Nothing
    else sits on the film; copy goes below it, in the section bands.
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
- **Drop zone** (`upload/UploadScreen`), on the light upload page: a white box
  with square corners, a **2px dashed dark red border** (`lightAccent`) and no
  black frame;
  black text. Dragging files over it turns the dashes solid. Inside while
  waiting: just
  "Click or Drag" (regular weight) with the three file names on the line
  below. Directly under the screen, a toolbar flush
  with its edges (`SnapshotForm`): the three file names as pills at the
  bottom-left corner; the name field (placeholder "Name", label for screen
  readers only) then **Create Snapshot** at the bottom-right — the field is
  stretched to the button's height so their tops and bottoms line up. Name
  field and button use the pills' exact sizing (xs/sm padding, `sm` text, 1px
  border). The button: a square box, white, black text, 1px solid dark red
  border. Pills: black
  outline while waiting, **filled green** with ink text once that exact file
  is in, plus a hidden "added" for screen readers — no check marks, no
  counter. Any problem (unreadable file, a file that isn't one of the three,
  a failed run) is listed as a short line below the toolbar.
- **Charts** (`src/components/snapshot/`, following the dataviz guidance):
  one white series on the deep red (13.9:1), so no legend — the page title
  names it. Bars ≤ 24px thick, square at the baseline (a 1px hairline), 4px
  rounded data-end, value at the tip in the text color. Entrance: bars grow
  from the baseline one after another (0.7s `--snapshot-ease-out`, 0.1s
  stagger), each value fades in as its bar lands; off under
  `prefers-reduced-motion`. The whole row is the hover/focus target: the bar
  gets a white outline and a white tooltip at its tip (value first, then the
  account). Every chart has a "View as table" toggle with the same numbers.
- **Square buttons** (header Get Snapshot / Go Back, Create Snapshot): on
  hover / keyboard focus they light up — fill with their accent, text flipping
  to the page color — and grow slightly. On red pages the accent is white
  (white border; fills white with red text); on light pages it's dark red
  (`lightAccent`; fills dark red with white text). They grow by
  `--snapshot-hover-scale` (1.06) over `--snapshot-hover-duration` (0.15s). Disabled buttons don't react. The transition is off under
  `prefers-reduced-motion` (the state still changes, instantly).
- Don't add other animations. Film art is built from tokens in
  `cinema/filmArt.ts`, never hard-coded colors.
- The header has no logo. (`public/logo-black.webp` is no longer used.)

### Component conventions

- Components live in `src/components/<area>/`, one component per file with a
  co-located `*.module.css`. Shared layout pieces go in `components/layout/`.
- Page copy lives in `src/content/` (e.g. `landing.ts`), not inside components.
  A `null` copy value renders a dashed "Placeholder — to be written" box in
  its section; never invent copy, features,
  stats, testimonials or sample results.
- Navigation only links to pages that exist. The header (`AppHeader`, a client
  component because it reads the path) holds one link in a square box
  (copy in `src/content/navigation.ts`):
  - on `/`: **Get Snapshot** → `/upload`, top right;
  - on `/upload`: **Go Back** → `/`, top left (a link home, not browser
    history, so it works when `/upload` is opened directly).
  Both are square boxes sized like Create Snapshot (`sm` text, xs/sm padding,
  1px border) with the same light-up hover.
- Visually hidden text (for screen readers) uses a local `.visuallyHidden`
  class: absolutely positioned, 1px, clipped.
