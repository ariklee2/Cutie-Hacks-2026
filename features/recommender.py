"""

Recommend reels and profiles a user would enjoy, from what they engaged with.

  python3 features/recommender.py <user> [--dry-run] [--refresh] [--offline]

1. Taste profile (from data/<user>_reels.parquet):
     each reel gets a weight from how the user engaged with it —
       saved = 3, liked = 2, watched a long time = 1 to 2 (scaled by seconds,
       counting only views of LONG_WATCH_SECONDS or more)
     → weighted hashtags, weighted creators, and a TF-IDF text profile over
       caption words + hashtags.
2. Candidates (Apify, paid per result — see the limits below):
     recent reels under the user's top hashtags (apify/instagram-hashtag-scraper).
     (Apify's profile scraper no longer returns Instagram's "related profiles",
     so similar profiles come from the creators of the matching reels.)
   Raw responses are cached in data/<user>_apify_*.json (gitignored) and
   reused while the query is unchanged, so re-running costs nothing.
3. Ranking:
     reels    — cosine similarity to the taste profile (80%) + a light
                popularity signal (20%); reels already seen are skipped; at
                most MAX_PER_CREATOR per creator; each has a "why".
     profiles — creators of the scraped reels, by how many of their reels
                matched and how well; creators already seen are skipped.
4. Writes data/<user>_recommendations.json.

The Apify token is read from the APIFY_TOKEN environment variable or the
repo-root .env file (gitignored). It is never printed or written elsewhere.

"""

import argparse
import json
import math
import os
import re
import sys
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from filter.transform import DATA_DIR, load_reels  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parent.parent

# --- Engagement weights ---
SAVED_WEIGHT = 3.0
LIKED_WEIGHT = 2.0
LONG_WATCH_SECONDS = 15  # a view this long or longer counts as "enjoyed"
LONG_WATCH_MAX_WEIGHT = 2.0  # reached at LONG_WATCH_SECONDS * 4

# --- Apify query size (cost control: ~$0.0026 per result on the free tier) ---
TOP_HASHTAGS = 5  # hashtags to search
REELS_PER_HASHTAG = 12
COST_PER_RESULT_USD = 0.0026
APIFY_TIMEOUT_SECONDS = 300

# --- Output ---
TOP_REELS = 12
TOP_PROFILES = 8
MAX_PER_CREATOR = 2

# Tags on nearly everything; they say nothing about taste.
GENERIC_TAGS = {
    "fyp", "foryou", "foryoupage", "viral", "viralreels", "viralvideo", "explore",
    "explorepage", "reels", "reel", "reelsinstagram", "instagram", "instagood",
    "trending", "trend", "shorts", "tiktok", "funny", "memes", "love", "foryourpage",
}

APIFY_HASHTAG_ACTOR = "apify~instagram-hashtag-scraper"


# -- token --
def apify_token():
    """APIFY_TOKEN from the environment, else from the repo-root .env file."""
    token = os.environ.get("APIFY_TOKEN")
    env_file = REPO_ROOT / ".env"
    if not token and env_file.exists():
        for line in env_file.read_text().splitlines():
            key, _, value = line.partition("=")
            if key.strip() == "APIFY_TOKEN":
                token = value.strip().strip('"').strip("'")
    return token or None


def run_actor(actor, actor_input):
    """Run an Apify actor synchronously and return its dataset items."""
    token = apify_token()
    if not token:
        sys.exit("APIFY_TOKEN is not set (environment or .env). See .env.example.")
    url = f"https://api.apify.com/v2/acts/{actor}/run-sync-get-dataset-items"
    request = urllib.request.Request(
        url,
        data=json.dumps(actor_input).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=APIFY_TIMEOUT_SECONDS) as response:
            return json.loads(response.read())
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors="replace")[:300]
        sys.exit(f"Apify {actor} failed: HTTP {error.code} {detail}")


def _same_query(a, b):
    """Equal inputs, ignoring the order of list values (same hashtags = same query)."""
    norm = lambda d: {k: sorted(v) if isinstance(v, list) else v for k, v in (d or {}).items()}
    return norm(a) == norm(b)


def cached_actor(user, name, actor, actor_input, *, refresh, offline):
    """run_actor, cached in data/<user>_apify_<name>.json per query."""
    path = DATA_DIR / f"{user}_apify_{name}.json"
    if path.exists() and not refresh:
        cached = json.loads(path.read_text())
        if _same_query(cached.get("input"), actor_input):
            return cached["items"], True
    if offline:
        sys.exit(f"--offline: no cached results for this {name} query ({path.name}).")
    items = run_actor(actor, actor_input)
    path.write_text(json.dumps({"input": actor_input, "items": items}, ensure_ascii=False))
    return items, False


# -- taste --
URL_RE = re.compile(r"https?://\S+|@\w[\w.]*")


def reel_text(caption, hashtags):
    """Caption words (no links or @mentions) plus hashtags as '#tag' tokens."""
    words = URL_RE.sub(" ", (caption or "").lower())
    words = re.sub(r"#\w+", " ", words)
    tags = " ".join(f"#{t.lower().lstrip('#')}" for t in hashtags if t)
    return f"{words} {tags}".strip()


def engagement_weights(df):
    long_watch = df["watch_seconds"].fillna(0)
    watch_weight = np.where(
        long_watch >= LONG_WATCH_SECONDS,
        np.minimum(1 + (long_watch - LONG_WATCH_SECONDS) / (LONG_WATCH_SECONDS * 3), LONG_WATCH_MAX_WEIGHT),
        0.0,
    )
    return df["saved"] * SAVED_WEIGHT + df["liked"] * LIKED_WEIGHT + watch_weight


def taste_profile(user):
    df = load_reels(user).copy()
    df["weight"] = engagement_weights(df)
    engaged = df[df["weight"] > 0].copy()
    if engaged.empty:
        sys.exit(f"{user} has no saved, liked or long-watched reels to learn from.")

    tags, creators = Counter(), Counter()
    for row in engaged.itertuples():
        for tag in sorted({t.lower().lstrip("#") for t in row.hashtags if t}):
            if tag not in GENERIC_TAGS:
                tags[tag] += row.weight
        if row.owner_username:
            creators[row.owner_username] += row.weight

    engaged["text"] = [reel_text(r.caption, r.hashtags) for r in engaged.itertuples()]
    return {
        "engaged": engaged,
        "seen_shortcodes": set(df["shortcode"]),
        "known_creators": set(df["owner_username"]),
        "hashtags": tags,
        "creators": creators,
        "counts": {
            "engaged_reels": len(engaged),
            "saved": int(df["saved"].sum()),
            "liked": int(df["liked"].sum()),
            "long_watched": int((df["watch_seconds"] >= LONG_WATCH_SECONDS).sum()),
        },
    }


# -- candidates --
def top_items(counter, n):
    """Highest weights first; ties broken alphabetically (stable across runs)."""
    return sorted(counter.items(), key=lambda kv: (-kv[1], kv[0]))[:n]


def queries(profile):
    return [t for t, _ in top_items(profile["hashtags"], TOP_HASHTAGS)]


def estimated_cost(hashtags):
    results = len(hashtags) * REELS_PER_HASHTAG
    return results, round(results * COST_PER_RESULT_USD, 4)


def is_reel(item):
    return item.get("productType") == "clips" or item.get("type") == "Video"


def _query_tag(item):
    """The hashtag search that found this item, e.g. "#bwfworldtour"."""
    match = re.search(r"/explore/tags/([^/?#]+)", item.get("inputUrl") or "")
    tag = match.group(1) if match else item.get("queryTag")
    return f"#{tag}" if tag else None


def candidate_reels(items, profile):
    seen, out = profile["seen_shortcodes"], {}
    for item in items:
        code = item.get("shortCode")
        if not code or code in seen or code in out or not is_reel(item) or item.get("error"):
            continue
        out[code] = {
            "shortcode": code,
            "url": item.get("url") or f"https://www.instagram.com/reel/{code}/",
            "creator": item.get("ownerUsername") or "",
            "creator_name": item.get("ownerFullName") or "",
            "caption": (item.get("caption") or "")[:500],
            "hashtags": [h.lower() for h in (item.get("hashtags") or [])],
            "likes": item.get("likesCount") or 0,
            "views": item.get("videoPlayCount") or item.get("igPlayCount") or item.get("videoViewCount") or 0,
            "found_via": _query_tag(item),
            "timestamp": item.get("timestamp"),
        }
    return list(out.values())


# -- ranking --
def score_reels(candidates, profile):
    """Every candidate with score, similarity and a why, best first."""
    if not candidates:
        return []
    engaged = profile["engaged"]
    docs = list(engaged["text"]) + [reel_text(c["caption"], c["hashtags"]) for c in candidates]
    vectorizer = TfidfVectorizer(token_pattern=r"#?\w[\w']+", stop_words="english",
                                 sublinear_tf=True, min_df=1)
    matrix = vectorizer.fit_transform(docs)
    n = len(engaged)
    weights = engaged["weight"].to_numpy()
    user_vector = np.asarray(matrix[:n].T.dot(weights) / weights.sum()).reshape(1, -1)
    similarity = cosine_similarity(user_vector, matrix[n:]).ravel()
    # Rescale so the best match is 1: fit, not popularity, decides the order.
    fit = similarity / similarity.max() if similarity.max() > 0 else similarity

    popularity = np.array([math.log1p(c["views"] or c["likes"]) for c in candidates])
    if popularity.max() > 0:
        popularity = popularity / popularity.max()

    top_tags = dict(top_items(profile["hashtags"], 30))
    scored = []
    for c, sim, f, pop in zip(candidates, similarity, fit, popularity):
        if sim <= 0:
            continue  # nothing in common with the taste profile
        shared = sorted((t for t in set(c["hashtags"]) if t in top_tags), key=lambda t: (-top_tags[t], t))
        score = 0.8 * f + 0.2 * pop
        why = (f"Shares #{', #'.join(shared[:3])} with reels you liked or watched"
               if shared else f"Similar captions to reels you liked or watched (found via {c['found_via']})")
        scored.append({**c, "score": round(float(score), 4), "similarity": round(float(sim), 4), "why": why})

    scored.sort(key=lambda r: -r["score"])
    return scored


def pick_reels(scored):
    """The top TOP_REELS, at most MAX_PER_CREATOR per creator."""
    per_creator, picked = Counter(), []
    for reel in scored:
        if per_creator[reel["creator"]] >= MAX_PER_CREATOR:
            continue
        per_creator[reel["creator"]] += 1
        picked.append(reel)
        if len(picked) == TOP_REELS:
            break
    return picked


def rank_profiles(all_scored_reels, profile):
    """Creators of the scored reels the user hasn't seen, by matching reels."""
    known = profile["known_creators"]
    profiles = {}
    for reel in all_scored_reels:
        username = reel["creator"]
        if not username or username in known:
            continue
        p = profiles.setdefault(username, {"username": username, "full_name": reel["creator_name"],
                                           "score": 0.0, "reels": 0, "tags": Counter()})
        p["score"] += reel["score"]
        p["reels"] += 1
        p["tags"].update(t for t in reel["hashtags"] if t in profile["hashtags"])

    out = []
    for p in profiles.values():
        tags = [t for t, _ in top_items(p["tags"], 3)]
        why = f"Posts {p['reels']} reel{'s' if p['reels'] != 1 else ''} matching your taste"
        if tags:
            why += " (#" + ", #".join(tags) + ")"
        out.append({"username": p["username"], "full_name": p["full_name"],
                    "url": f"https://www.instagram.com/{p['username']}/",
                    "matching_reels": p["reels"], "score": round(p["score"], 4), "why": why})
    out.sort(key=lambda p: (-p["score"], p["username"]))
    return out[:TOP_PROFILES]


# -- main --
def recommend(user, *, refresh=False, offline=False, dry_run=False):
    profile = taste_profile(user)
    hashtags = queries(profile)
    results, usd = estimated_cost(hashtags)
    print(f"{user}: {profile['counts']['engaged_reels']} engaged reels "
          f"(saved {profile['counts']['saved']}, liked {profile['counts']['liked']}, "
          f"watched {LONG_WATCH_SECONDS}s+ {profile['counts']['long_watched']})")
    print(f"  search hashtags: {', '.join('#' + h for h in hashtags) or '(none)'}")
    print(f"  Apify: up to {results} results ≈ ${usd} if not cached")
    if dry_run:
        return None

    hashtag_input = {"hashtags": hashtags, "resultsType": "reels", "resultsLimit": REELS_PER_HASHTAG}
    reel_items, reels_cached = (
        cached_actor(user, "hashtags", APIFY_HASHTAG_ACTOR, hashtag_input, refresh=refresh, offline=offline)
        if hashtags else ([], True))

    candidates = candidate_reels(reel_items, profile)
    scored = score_reels(candidates, profile)
    reels = pick_reels(scored)
    profiles = rank_profiles(scored, profile)

    out = {
        "user": user,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "based_on": {
            **profile["counts"],
            "top_hashtags": [{"hashtag": t, "weight": round(w, 2)} for t, w in top_items(profile["hashtags"], TOP_HASHTAGS)],
            "top_creators": [{"creator": c, "weight": round(w, 2)} for c, w in top_items(profile["creators"], 3)],
        },
        "apify": {"reel_results": len(reel_items), "from_cache": reels_cached},
        "reels": reels,
        "profiles": profiles,
    }
    path = DATA_DIR / f"{user}_recommendations.json"
    path.write_text(json.dumps(out, indent=2, ensure_ascii=False))
    print(f"  {len(reel_items)} posts scraped → {len(candidates)} new reels → {len(scored)} with something in common")
    print(f"wrote {path.name}: {len(reels)} reels, {len(profiles)} profiles"
          + (" (from cache, no Apify cost)" if out["apify"]["from_cache"] else ""))
    return out


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("user")
    parser.add_argument("--dry-run", action="store_true", help="show queries and cost, call nothing")
    parser.add_argument("--refresh", action="store_true", help="ignore cached Apify results")
    parser.add_argument("--offline", action="store_true", help="use cached Apify results only")
    args = parser.parse_args()
    recommend(args.user, refresh=args.refresh, offline=args.offline, dry_run=args.dry_run)