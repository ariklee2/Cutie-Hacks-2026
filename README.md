# Insta Snapshot

**A Wrapped for your Instagram Reels.** Upload your Instagram data download (the .zip) and get a snapshot of your last week of reels: who you watched most, what you watched, how long you scrolled, your longest binge, whether you're a loyal or variety watcher, your club, and reels and accounts you might like next.

Built for Cutie Hacks 2026.

## What's in your snapshot

After you upload your files, the snapshot plays as a sequence of pages (use the Back / Next links or the ← → keys):

1. **Top creators**: the accounts whose reels you watched most.
2. **Top hashtags**: the hashtags on the reels you watched.
3. **Time on reels**: total time this week, your busiest day, and time per day.
4. **Longest binge**: your longest stretch of non-stop scrolling.
5. **Loyal or variety**: whether you keep coming back to the same creators.
6. **Your club**: Sporty, Gamer, Nerd, Brainrot, Foodie, Music, Drama, Travel, News, Gym Bro, Looksmaxxer, or Hufflepuff (the all-rounder).
7. **For you**: reels and accounts you haven't seen yet that match your taste.
8. **The credits**: a closing roll of your week's highlights.
9. **Share card**: everything on one card to share or copy.

## Getting your Instagram files

In Instagram, request a download of your information in **JSON** format (include your activity and ads information). Then drop the whole **`.zip`** you get onto the upload page: it finds the three files it needs inside, in your browser, and uploads only those:

- `liked_posts.json`
- `saved_posts.json`
- `videos_watched.json`

You can also drop those three files on their own. The upload page checks each file is really that export and tells you what's wrong or still missing.

## Running it locally

You need **Node.js 20.9+** and **Python 3** with `pandas`, `pyarrow`, `numpy` and `scikit-learn`.

```bash
pip install pandas pyarrow numpy scikit-learn
```

```bash
cd frontend
npm install
npm run dev
```

Then open http://localhost:3000, click **Get Snapshot**, drop in your Instagram download (.zip), enter a name, and click **Create Snapshot**.

The website runs the Python backend on your machine, so it has to run from this repository (it reads and writes the `data/` folder). If `python3` on your PATH doesn't have the packages above, point it at one that does with `SNAPSHOT_PYTHON=/path/to/python3` in `frontend/.env.local`.

### Recommendations (optional)

The **For you** page uses [Apify](https://apify.com) to find new reels on Instagram. To enable it, create a `.env` file in the repository root:

```bash
APIFY_TOKEN=your_apify_api_token
```

`.env` is ignored by git; never commit your token. Recommendations start being found in the background as soon as an upload is processed (and the page starts a search itself if there are still none when someone gets there): each new search costs about $0.16 of Apify credit and takes up to a minute (repeat searches for the same interests are cached and free).

## How it works

```
your 3 JSON files
   │  POST /api/snapshot (checks the files, saves them to data/<name>_*.json)
   ▼
filter/transform.py      → data/<name>_reels.parquet / .csv   (one row per reel)
   ▼
features/snapshot.py     → data/<name>_snapshot.json          (every feature below)
   ▼
/snapshot/<name>/…       the snapshot pages read that file
```

| Step | File | What it does |
| --- | --- | --- |
| Clean the data | `filter/transform.py` | Combines the three exports into one row per reel, keeps reels only, drops ads, limits likes and saves to the watch-history week, and estimates time spent on each reel. |
| Top creators / hashtags | `features/top_creators.py`, `features/top_hashtags.py` | Counts watched reels per creator and per hashtag. |
| Time on reels | `features/reels_watched_duration.py` | Total and per-day watch time. |
| Binge sessions | `features/binge_session.py` | Groups reels into sessions (each within 2 minutes of the last). |
| Loyal or variety | `features/loyal_or_variety.py` | Scores 0–100 from how concentrated your engagement is on a few creators. |
| Clubs | `features/clubs.py` | Sorts each reel into a club from its hashtags, caption and creator, then picks yours. |
| Snapshot | `features/snapshot.py` | Runs every feature and saves the results to one JSON file. |
| Recommendations | `features/recommender.py` | Builds a taste profile from what you saved, liked and watched for a while, finds new reels under your top hashtags via Apify, and ranks them by similarity. |

Each Python file also runs on its own, e.g. `python3 features/top_creators.py <name>`.

## Deploying it

The app needs a host that can run **Node and Python together** and keep files on a **persistent disk** (it runs the Python scripts on each upload and keeps every snapshot in `data/`). Vercel/Netlify-style serverless hosts can't do either, so it ships as one Docker container:

- `Dockerfile`: Node 20 plus Python with `requirements.txt`, builds the site, runs `next start` on `$PORT`. `data/` is `/app/data`; mount a disk there for snapshots that survive restarts.
- `render.yaml`: a [Render](https://render.com) Blueprint on the **free plan**. Free means no disk: every snapshot is wiped when the service restarts, redeploys, or wakes from sleep (it sleeps after ~15 minutes without visitors, and the first visit after that takes 30–60 seconds). Fine for a demo; for snapshots that last, switch to `plan: starter` with a disk (about $7/month; the lines are in the file's comments).

**On Render:**
1. Push this repo to GitHub.
2. In Render: **New → Blueprint**, connect GitHub and pick this repo and the `main` branch.
3. When it asks for `APIFY_TOKEN`, paste your Apify token (it's stored by Render, never in the repo). Leave it empty to run without recommendations.
4. Create it. The first build takes a few minutes; your site is at the `onrender.com` URL it shows. Pushes to the branch redeploy automatically.

Any other Docker host with a volume (Railway, Fly.io, a VPS) works the same way: build the `Dockerfile`, mount a volume at `/app/data`, set `APIFY_TOKEN`.

**What changes on a public server** (`NODE_ENV=production`, set in the image; each can be overridden with an environment variable, see `frontend/src/lib/server/deployPolicy.ts`):

| Rule | Production default | Override |
| --- | --- | --- |
| An upload can't replace an existing name | on | `ALLOW_SNAPSHOT_OVERWRITE=true` |
| The raw JSON uploads and CSV copy are deleted once the snapshot is built | on | `KEEP_UPLOADS=true` |
| Recommender runs (Apify credit) per day, across all users | 20 | `RECOMMENDATIONS_DAILY_LIMIT` |
| Find recommendations button | on | `RECOMMENDATIONS_ENABLED=false` |
| Image-signal fetches for the club classifier (≈ $0.65 each) per day | 20 | `IMAGE_SIGNALS_DAILY_LIMIT` |
| Fetch image signals after uploads | on | `IMAGE_SIGNALS_ENABLED=false` |
| Upload size per file | 30 MB | — |

Snapshots are found by name, so anyone who knows a name can open that snapshot; the upload page says so.

## Project structure

```
data/        your uploaded exports and generated files (local only; a disk on a server)
filter/      transform.py: raw exports → one row per reel
features/    the analysis behind each snapshot page, the recommender, and reel_media.py (image objects via Apify)
frontend/    Next.js + Mantine website (landing, upload, snapshot pages)
Dockerfile   one container with Node + Python, for deploying
render.yaml  Render Blueprint (free web service; a paid plan + disk keeps snapshots)
CLAUDE.md    detailed notes on the design system and how everything fits together
```

## Privacy

Your files stay on the machine running the app: they're saved to `data/` and processed there. Nothing is sent anywhere, except the hashtag searches made when you ask for recommendations (sent to Apify). On a deployed server, the raw files are deleted as soon as the snapshot is built; the snapshot and the reels table stay, findable by name.
