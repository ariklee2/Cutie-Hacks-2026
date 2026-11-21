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
  (including any snapshot sections that failed).

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
movie screen's masking frame). There is no
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
(`src/components/upload/`). Film and clapperboard are the only places motion
is allowed; everything else stays still.

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
  edge with a dashed red outline. Under it, a single **counter** ("2 of 3 files
  added") — no per-file markers. Any problem (unreadable file, a file that isn't
  one of the three) is listed as a short line under the counter.
- Don't add new animations outside the film motif. Film art is built from
  tokens in `cinema/filmArt.ts`, never hard-coded colors.
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
