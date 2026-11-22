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
- `features/recommender.py <user> [--dry-run|--offline|--refresh]` — reels and
  profiles the user would enjoy → **`data/<user>_recommendations.json`**.
  Taste profile from the reels table: weight per reel = saved 3, liked 2,
  watched ≥ 15s 1–2 (scaled by seconds); weighted hashtags (generic ones like
  #fyp dropped) and a TF-IDF profile of captions + hashtags. Candidates: recent
  reels under the top 5 hashtags via Apify's `instagram-hashtag-scraper`
  (12 per hashtag ≈ $0.16 per uncached run at $0.0026/result). Ranking: 80%
  similarity (rescaled so the best match = 1) + 20% log popularity; reels
  already seen and reels with zero similarity are dropped; ≤ 2 per creator;
  each has a `why`. Profiles = unseen creators of the scored reels, by summed
  score. (Apify's profile scraper no longer returns Instagram's related
  profiles, so it isn't used.) Raw Apify responses are cached in
  `data/<user>_apify_*.json` (gitignored) and reused for the same hashtags in
  any order; `--dry-run` prints the queries and cost without calling anything.
  Ties sort alphabetically so runs are reproducible.
- **Secrets:** the Apify token is `APIFY_TOKEN` in the repo-root `.env`
  (gitignored; template in `.env.example`) or the environment. Never print it,
  log it, put it in a URL or commit it.
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
**`GET /api/snapshot?name=<name>`** (same file) answers `{ name, exists }`:
whether `data/<name>_snapshot.json` is there, so a saved snapshot can be
reopened without uploading again (`snapshotExists` in `lib/api/snapshot.ts`).
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
  Each file is checked against the real export format
  (`checkInstagramExport` in `src/lib/instagramFiles.ts`; the same function
  runs in the browser and again in `POST /api/snapshot`, so nothing unusable
  reaches `data/`): identified by name, then it must be a top-level JSON list
  whose every entry has a numeric `timestamp` and `label_values` with a `URL`
  (exactly what `filter/transform.py` reads — wrapped/other export formats are
  rejected). `videos_watched` entries carry the ad field "Ad library public
  URL" and liked/saved ones don't, so a swapped watched ↔ liked/saved file is
  caught; liked vs saved are identical in content, so their names decide.
  Rejected files get a plain reason ("liked_posts.json can't be used: it
  contains videos or posts you viewed, not liked posts…"; "notes.json isn't
  one of the files Insta Snapshot needs."), followed by "Still needed: …"
  naming every file not yet added. Under the
  screen, a name field and **Create Snapshot** (enabled once all three are in
  and the name is valid) send them to `POST /api/snapshot`; the screen shows
  "Saving and processing…", then "Snapshot created" with the reel count from
  `transform.py` and the snapshot file name, or the error under the toolbar
  (including any snapshot sections that failed). On success it goes straight
  to `/snapshot/<name>/top-creators`.
  At the bottom of the window, above a hairline, **"Already made one?"**
  (`OpenSavedSnapshot`): a name field and **Open Snapshot** that check
  `GET /api/snapshot` and go straight to that snapshot's first scene, or
  say there's no saved snapshot by that name. No files are uploaded.
- **Saved snapshots**: results are files on the server (`data/`), so they
  outlive uploads and restarts. The browser remembers the last snapshot it
  created or opened (`lib/savedSnapshot.ts`, the name only, in
  `localStorage`); on `/` the header then shows **View @name's snapshot**
  beside Get Snapshot, once `GET /api/snapshot` confirms it still exists (a
  stale name is forgotten).
- `/snapshot/<name>/<step>` — **the snapshot sequence**, a run of full-screen
  **scenes** (Wrapped-style) in the order of `src/lib/snapshotSequence.ts`.
  Every scene is a server component reading `data/<name>_snapshot.json`
  through `src/lib/server/snapshotStore.ts` (`readSnapshot`; 404 if missing),
  wrapped in `SnapshotPage`: at least one screen tall, content centered,
  title / subtitle / content / links entering one after another, an optional
  giant faint **backdrop** word (`backdrop` prop, `watermark` color) cropped
  off the bottom-right, and Back / Next links (the last scene's Next is
  "Start over"). The shared layout (`app/snapshot/[name]/layout.tsx`) stays
  mounted between scenes and holds:
  - **`SceneProgress`** — one thin segment per scene under the header (past
    full, current filling in, upcoming faint).
  - **`SceneTransition`** — the **film wipe**: moving to another scene
    sweeps a wall of film over the screen — `FilmStrip`s stacked at a
    natural 18rem height (frames about square, like the landing film, never
    stretched to the full screen) — loads the next scene behind it, then the
    film carries on out the other side. It always comes **from the side of
    the destination**: from the right going forward, from the left going
    back (by sequence order, so "Start over" comes from the left). Each half
    takes `--snapshot-scene-wipe` (0.55s) with `--snapshot-ease-in-out`.
    Every way of moving goes through it (`useSceneNav()`): the Back / Next
    links (`SceneLink`), ← → keys (`ArrowKeyNav`; stop at both ends, ignored
    while typing or with a modifier key), and **taps** (`SceneTapArea`: a
    click on the left 30% of a scene goes back, elsewhere forward, unless it
    lands on a link, button, chart or other control).
  - **Scene colors**: each scene root has `data-scene="<step>"` and
    `globals.css` paints the whole body with that scene's `scene.*` token,
    easing between them (`--snapshot-scene-fade`).
  Big numbers count up from 0 (`CountUp`, used by `HeroStat` and `StatList`).
  A failed or empty section shows one line of copy (`SnapshotMessage`)
  instead. Copy lives in `src/content/snapshot.ts`; formatting helpers
  (week range, "4h 57m", local times) in `src/lib/snapshotFormat.ts`; the
  per-scene highlights used by the credits and share card in
  `src/lib/snapshotHighlights.ts`.
  1. `top-creators` (theatre.8) — first scene; upload success lands here.
     `top_creators` (top 10) as a `BarChart` with no table toggle; backdrop
     is the #1 account. The subtitle's date range comes from
     `watch_time.per_day`.
  2. `top-hashtags` (theatre.6) — `top_hashtags` (top 10) as a `BarChart`
     with no table toggle; backdrop is the #1 hashtag.
  3. `watch-time` (ink) — total time as a `HeroStat` with a movie comparison
     (total ÷ 2h films) and the busiest day, then a `StatList` (scroll
     distance in inches and miles from `watch_time.scroll`: one reel = one
     scroll = one ~6in phone screen, `SCROLL_INCHES_PER_REEL` in
     `reels_watched_duration.py`, with a football-field comparison under a
     mile; reels and time per day on average), then a `ColumnLineChart`:
     one vertical column per day with a line joining the column tops, the
     busiest day's column, dot and value in gold (`peak`) (tooltip adds that
     day's reel count).
  4. `binge` (theatre.9) — the longest session as a `HeroStat` (local day and
     times, reel count), session count and median in a `StatList`, then the
     longest sessions as a `BarChart`.
  5. `loyalty` (theatre.7) — a `SuspenseReveal`: the question first, then
     (after 1.6s, or on click) the Loyal / Variety verdict snaps in as a
     `HeroStat`, the 0–100 score on a `ScoreMeter` (dashed tick at 50, the
     backend's threshold), then the metrics in a `StatList`. Backdrop "?".
  6. `club` (theatre.5) — a `SuspenseReveal` of the club as a `HeroStat`
     (every club name, here and in the chart, credits and share card, carries
     its emoji: `clubEmoji` / `clubLabel` in `content/snapshot.ts`, e.g.
     "Sporty 🏀"),
     then every club's share as a `BarChart`. Backdrop "?".
  7. `recommendations` (theatre.6) ("For you") — reads `data/<name>_recommendations.json`
     (`readRecommendations`; shape in `src/lib/recommendationsData.ts`) from
     `features/recommender.py`: a "based on #…" line, then **Reels** (creator,
     two-line caption preview, `why`, "Watch on Instagram ↗") and **Accounts**
     (username · name, `why`, "View on Instagram ↗") side by side, stacked on
     narrow screens; links open Instagram in a new tab. If the file doesn't
     exist yet, `FindRecommendations` shows a square **Find recommendations**
     button that POSTs `/api/recommendations` (`src/app/api/recommendations/
     route.ts`), which runs the recommender for that name (needs a snapshot;
     one run per name at a time) and the page refreshes. It's only ever run on
     click: an uncached run spends ≈ $0.16 of Apify credit and takes up to a
     minute. The token never leaves the Python process.
  8. `credits` (ink) — the finale: the highlights as film end credits
     (`CreditsRoll`, role above name — "Starring @f1", "Running time 4h 57m",
     …, "Directed by @<name>", "The End") rolling up once.
  9. `share` (theatre.8) — `ShareCard`: a **carousel of color schemes**
     centered on the scene. The chosen card faces front; the others turn
     away to either side (3D, solid but dimmed with distance — no
     see-through overlaps). Switch with ‹ ›, the named swatches below
     (Classic, Midnight, Cherry, Gold, Mono; `shareSchemes` in tokens), or by
     clicking a side card; it wraps around. Switching is locked while the
     camera is on. Save image saves the front card
     (`<name>-insta-snapshot-<year>-<scheme>.png`). Each card: a
     **story-shaped (9:16)** card
     laid out like a year-in-review card, colored by its scheme. Top half
     (the art): clapperboard stripes (the scheme's text / card colors,
     hard-edged) along the top and right, the **year** (from the snapshot's
     week, e.g. 2026) running up the left, and a film frame (always ink with
     sprocket holes) holding a picture titled
     **Insta Snapshot** with the week's dates — where a cover image would go.
     Below: **Top Creators** and **Top Hashtags** 1–5 side by side (long
     handles end in "…"), then **Reels Watched** (`watch_time.total_reels`)
     and **Club** (with its emoji) as big numbers, then a footer: `@name` and
     INSTA SNAPSHOT. No other brand's logo or URL. **Take a photo**
     (`useWebcamPhoto`) asks for the camera and shows a live, mirrored
     preview in the frame; **Snap** counts down 3-2-1 (instant under reduced
     motion), takes a square photo from the middle of the frame (mirrored,
     like the preview) and turns the camera off; the photo then fills the
     frame instead of the title (Retake / Remove photo). The photo is a data
     URL in memory only — never uploaded or stored — and only ends up in the
     image you save. It shows on every scheme's card. Blocked or missing cameras get a one-line message. The
     card is `data-no-tap`, so clicks on it never change scene. **Save image** downloads it
     as `<name>-insta-snapshot-<year>.png` (`html-to-image`, 3× pixel ratio);
     **Share** (the device share sheet, only where `navigator.share` exists)
     and **Copy text** send the same content as plain text.

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
for the drop zone's dashed border and the button outline. `lightError` =
theatre.5 `#A82535` (7.0:1 on white) is only for error messages the user must
act on (the upload page's wrong-file / still-needed lines). Components keep using
the normal text variables; never hard-code light colors in a component.

No gradients: the page background is a single solid color. Hard-edged stripe
patterns (film, clapper) are patterns, not gradients. If the background red
ever changes, recheck white text contrast (it must stay ≥ 4.5:1).

**Share card schemes** (`shareSchemes` in tokens): five card color sets for
the share carousel — card, text, picture, title on picture, year — built from
paper, ink, theatre and gold; contrasts are listed in `tokens.ts` (all ≥ 7:1
for text). Midnight's gold year is the one use of gold outside chart peaks.

**Snapshot scenes** (`scene` in tokens / `--snapshot-scene-<step>`): each
scene's solid background, all from existing scales — top creators and share
theatre.8 (13.9:1 with white), top hashtags theatre.6 (9.4:1), time on reels
and credits ink (19.8:1), binge theatre.9 (16.9:1), loyalty theatre.7
(12.0:1), club theatre.5 (7.0:1), recommendations ("For you") theatre.6
(9.4:1). Don't go lighter than theatre.5 behind
white text. `peak` = gold `#F5C542` — **only for the one standout point in
a chart**: the top bar of every `BarChart` (top creator, hashtag, binge,
club; bar only, its number stays white since gold text is 4.3:1 on the
club scene) and the busiest day's column, dot and value on the
time-on-reels chart (12.2:1 on ink). Not on the loyalty meter. Never
decoration. `watermark` = white at 7%, only for the giant backdrop word
behind a scene (decorative, never text to read).

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
(only the landing page's credit lines under the film's bottom-left corner:
"Created by Arik Lee & Justin Pun" in `xl` | "Inspired by Spotify Wrapped" in
`lg`, on one line, both white). Line height:
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
(`src/components/upload/`). Motion is allowed for the film and
clapperboard, **chart entrances**, and the **snapshot scenes** (film wipe
between scenes, background color easing, staggered entrances, count-ups,
the progress bar filling, suspense reveals, the credits roll, the share
card arriving); the landing and upload pages otherwise stay still.

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
- **Square buttons** (header Get Snapshot / Go Back, Create Snapshot): on
  hover / keyboard focus they light up — fill with their accent, text flipping
  to the page color — and grow slightly. On red pages the accent is white
  (white border; fills white with red text); on light pages it's dark red
  (`lightAccent`; fills dark red with white text). They grow by
  `--snapshot-hover-scale` (1.06) over `--snapshot-hover-duration` (0.15s). Disabled buttons don't react. The transition is off under
  `prefers-reduced-motion` (the state still changes, instantly).
- **Snapshot scene motion** (`components/snapshot/`): entrances rise 24px and
  fade in with `--snapshot-ease-out`, `--snapshot-scene-stagger` (0.12s)
  apart; the suspense answer snaps in with `--snapshot-ease-in` (the clapper's
  easing); while waiting, the question breathes by scale, never by fading
  (there is no dimmer text). All of it is off under `prefers-reduced-motion`:
  scenes cut instead of wiping, numbers show their final value, the answer
  shows at once, the credits stand still.
- Don't add other animations. Film art is built from tokens in
  `cinema/filmArt.ts`, never hard-coded colors.
- The header shows the **Instagram glyph** (white, 2rem, `public/instagram-glyph-white.svg`,
  from Instagram's official brand assets, unmodified) in the window's top-left
  corner on the landing page only. No other page has a logo.

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
  - on `/`: **Get Snapshot** → `/upload`, top right, with **View @name's
    snapshot** before it when this browser remembers one that still exists;
  - on `/upload`: **Go Back** → `/`, in the window's top-left corner (full
    window width, like Get Snapshot in the top-right on `/`) (a link home, not browser
    history, so it works when `/upload` is opened directly).
  - on the snapshot scenes (`/snapshot/…`): **no link** — the files are
    already in and the scenes have their own Back / Next. The header stays
    (empty, same height) so the scenes' full-screen sizing doesn't change.
  Both are square boxes sized like Create Snapshot (`sm` text, xs/sm padding,
  1px border) with the same light-up hover.
- Visually hidden text (for screen readers) uses a local `.visuallyHidden`
  class: absolutely positioned, 1px, clipped.
