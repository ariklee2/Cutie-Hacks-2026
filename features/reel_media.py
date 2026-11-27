"""Extra signals about each reel in a user's history, from Apify.

The Instagram export only has each reel's link, caption and hashtags. This
looks every reel up with Apify's `instagram-scraper` (direct reel URLs) and
keeps three cheap, text-shaped signals per reel:

  - music:  the song and artist ("Nicole Kidman — ADÉLA"), or "original audio"
  - visual: Instagram's own image recognition from the alt text
            ("May be an image of temple and text" -> ["temple"])
  - comments: the latest comments' text

Raw responses are cached in data/<user>_apify_media.json (gitignored, keyed
by shortcode), so each reel is only ever bought once (~$0.0026 each).

Usage:
    python3 features/reel_media.py <user> [--dry-run] [--offline]
"""
import argparse
import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from filter.transform import DATA_DIR, load_reels  # noqa: E402

COST_PER_RESULT_USD = 0.0026  # same rate as the recommender's searches

ACTOR = "apify~instagram-scraper"
BATCH = 60  # reels per Apify call (keeps each synchronous run well under the timeout)

# Words in Instagram's alt text that describe the frame, not the content.
ALT_STOPWORDS = {"text", "one person", "person", "people", "2 people", "3 people", "screen", "and"}


def cache_path(user):
    return DATA_DIR / f"{user}_apify_media.json"


def load_cache(user):
    path = cache_path(user)
    return json.loads(path.read_text()) if path.exists() else {}


def fetch_media(user, *, dry_run=False, offline=False):
    """Every reel's scraped item, by shortcode; only uncached reels are fetched."""
    reels = load_reels(user)
    cache = load_cache(user)
    todo = [r.url for r in reels.itertuples() if r.shortcode not in cache]
    cost = len(todo) * COST_PER_RESULT_USD
    print(f"{len(reels)} reels, {len(reels) - len(todo)} cached, {len(todo)} to fetch (≈ ${cost:.2f})")
    if dry_run or offline or not todo:
        return cache
    for start in range(0, len(todo), BATCH):
        batch = todo[start:start + BATCH]
        from features.recommender import run_actor  # only when actually fetching
        items = run_actor(ACTOR, {"directUrls": batch, "resultsType": "posts",
                                  "resultsLimit": len(batch), "addParentData": False})
        for item in items:
            code = item.get("shortCode")
            if code:
                cache[code] = item
        cache_path(user).write_text(json.dumps(cache, ensure_ascii=False))
        print(f"  fetched {start + len(batch)}/{len(todo)}: {len(items)} items")
    return cache


ALT_RE = re.compile(r"May be (?:an? )?(?:image|meme|graphic|illustration|screenshot)s? of (.+?)\.?$", re.I)


def alt_objects(alt):
    """'… May be an image of temple, statue and text.' -> ['temple', 'statue']"""
    match = ALT_RE.search(alt or "")
    if not match:
        return []
    parts = re.split(r",\s*|\s+and\s+", match.group(1))
    return [p.strip().lower() for p in parts if p.strip() and p.strip().lower() not in ALT_STOPWORDS]


def visual_objects(user):
    """{shortcode: ["tennis", "racket", …]} from the cache; {} when there's none yet."""
    return {code: alt_objects(item.get("alt")) for code, item in load_cache(user).items()}


def media_signals(item):
    """The text-shaped signals kept from one scraped reel."""
    music = item.get("musicInfo") or {}
    original = bool(music.get("uses_original_audio"))
    song = "" if original else " ".join(filter(None, [music.get("song_name"), music.get("artist_name")]))
    comments = " ".join((c.get("text") or "") for c in (item.get("latestComments") or [])[:10])
    return {
        "music": song,
        "original_audio": original,
        "visual": alt_objects(item.get("alt")),
        "comments": comments,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("user", nargs="?", default="arik")
    parser.add_argument("--dry-run", action="store_true", help="print what would be fetched and the cost")
    parser.add_argument("--offline", action="store_true", help="use only cached results")
    args = parser.parse_args()
    cache = fetch_media(args.user, dry_run=args.dry_run, offline=args.offline)
    if args.dry_run:
        return
    signals = [media_signals(item) for item in cache.values()]
    print(f"{len(signals)} reels with media info: "
          f"{sum(bool(s['music']) for s in signals)} with a named song, "
          f"{sum(bool(s['visual']) for s in signals)} with recognised objects, "
          f"{sum(bool(s['comments']) for s in signals)} with comments")


if __name__ == "__main__":
    main()
