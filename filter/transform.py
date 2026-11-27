"""Aggregate a user's Instagram activity exports into one reels-only DataFrame.

Reads <user>_liked_posts.json, <user>_saved_posts.json and
<user>_videos_watched.json from data/, keeps only reels (URL path /reel/),
drops ads (non-empty "Ad library public URL" or a brand partner), keeps only
likes/saves made during the videos_watched date range (that export covers just
the last week, while likes/saves go back a year), collapses
everything to ONE ROW PER REEL with watched/liked/saved flag columns and the
time of each action, estimates the time spent on each reel, and writes:

  data/<user>_reels.parquet  - keeps pandas dtypes (datetimes, lists); use this
  data/<user>_reels.csv      - same data for spreadsheets / quick viewing

Usage:
  python3 filter/transform.py [user]          (default: justin)

From other code:
  from filter.transform import load_reels
  df = load_reels("justin")

Time spent (watch_seconds) is an ESTIMATE: Instagram's export has no duration
field. We use the viewing stream (videos_watched, ads and non-reels
included since they take screen time too), keep the first time each
URL appears (the export re-logs items in batches), and take the gap until the
next item. Items that share a timestamp split that gap evenly. Gaps longer than
SESSION_GAP_SECONDS are treated as the end of a session and left as NaN.
"""

import json
import re
import sys
from pathlib import Path

import pandas as pd

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
SOURCES = ["liked_posts", "saved_posts", "videos_watched"]
VIEW_SOURCES = ["videos_watched"]
SESSION_GAP_SECONDS = 300
# Drop likes/saves outside the videos_watched date range so all three line up.
MATCH_WATCH_WINDOW = True
URL_RE = re.compile(r"https?://(?:www\.)?instagram\.com/([^/]+)/([^/?#]+)")
# Which flag / time column each source becomes in the one-row-per-reel table.
ACTIONS = {"videos_watched": "watched", "liked_posts": "liked",
           "saved_posts": "saved"}
COLUMNS = ["url", "shortcode", "owner_username", "owner_name", "caption",
           "hashtags", "watched", "liked", "saved", "first_seen",
           "watched_at", "liked_at", "saved_at", "watch_seconds"]


def fix_text(s):
    """Instagram exports UTF-8 text as latin-1 escaped mojibake; undo that."""
    if not s:
        return ""
    try:
        return s.encode("latin-1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return s


def parse_entry(entry):
    """Flatten an entry's label_values into a simple dict."""
    out = {"url": "", "caption": "", "hashtags": [], "owner_username": "",
           "owner_name": "", "is_ad": False}
    for item in entry.get("label_values", []):
        label, title = item.get("label"), item.get("title")
        if label == "URL":
            out["url"] = item.get("value", "")
        elif label == "Caption" and not out["caption"]:
            out["caption"] = fix_text(item.get("value", ""))
        elif label == "Ad library public URL" and item.get("value"):
            out["is_ad"] = True
        elif label == "Brand partner" and item.get("vec"):
            out["is_ad"] = True
        elif title == "Brand partner" and item.get("dict"):
            out["is_ad"] = True
        elif title == "Hashtags":
            for tag in item.get("dict", []):
                for kv in tag.get("dict", []):
                    if kv.get("label") == "Name" and kv.get("value"):
                        out["hashtags"].append(fix_text(kv["value"]))
        elif title == "Owner":
            for owner in item.get("dict", []):
                for kv in owner.get("dict", []):
                    if kv.get("label") == "Username":
                        out["owner_username"] = kv.get("value", "")
                    elif kv.get("label") == "Name":
                        out["owner_name"] = fix_text(kv.get("value", ""))
    return out


def load_raw(user):
    """Every entry from every source as one DataFrame (no filtering)."""
    records = []
    for source in SOURCES:
        path = DATA_DIR / f"{user}_{source}.json"
        if not path.exists():
            print(f"skip {source}: {path.name} not found")
            continue
        for entry in json.loads(path.read_text()):
            info = parse_entry(entry)
            m = URL_RE.match(info["url"])
            records.append({
                "source": source,
                "timestamp": entry.get("timestamp", 0),
                "url": info["url"],
                "kind": m.group(1) if m else "",
                "shortcode": m.group(2) if m else "",
                "owner_username": info["owner_username"],
                "owner_name": info["owner_name"],
                "caption": info["caption"],
                "hashtags": info["hashtags"],
                "is_ad": info["is_ad"],
            })
    return pd.DataFrame.from_records(records)


def estimate_watch_seconds(raw):
    """Estimated seconds on screen per URL, from gaps in the viewing stream."""
    views = (raw[raw["source"].isin(VIEW_SOURCES)]
             .sort_values("timestamp", kind="stable")
             .drop_duplicates("url", keep="first"))
    # Gap from each distinct timestamp to the next, split among items sharing it.
    per_ts = views.groupby("timestamp").size().rename("n").reset_index()
    per_ts["gap"] = per_ts["timestamp"].shift(-1) - per_ts["timestamp"]
    per_ts.loc[per_ts["gap"] > SESSION_GAP_SECONDS, "gap"] = float("nan")
    per_ts["each"] = per_ts["gap"] / per_ts["n"]
    views = views.merge(per_ts[["timestamp", "each"]], on="timestamp")
    return views.set_index("url")["each"]


def build_reels(user="justin", verbose=True):
    raw = load_raw(user)
    watch = estimate_watch_seconds(raw)

    is_reel = raw["kind"] == "reel"
    in_window = pd.Series(True, index=raw.index)
    watched_ts = raw.loc[raw["source"].isin(VIEW_SOURCES), "timestamp"]
    if MATCH_WATCH_WINDOW and not watched_ts.empty:
        start, end = watched_ts.min(), watched_ts.max()
        in_window = raw["timestamp"].between(start, end)
        if verbose:
            fmt = lambda t: pd.to_datetime(t, unit="s", utc=True).strftime("%Y-%m-%d %H:%M")
            print(f"keeping activity from {fmt(start)} to {fmt(end)} UTC")
    keep = is_reel & ~raw["is_ad"] & in_window
    df = raw[keep].copy()
    if verbose:
        for source in SOURCES:
            s = raw["source"] == source
            print(f"{source}: {s.sum()} entries -> {(s & keep).sum()} reels "
                  f"({(s & ~is_reel).sum()} non-reels, {(s & is_reel & raw['is_ad']).sum()} ads, "
                  f"{(s & is_reel & ~raw['is_ad'] & ~in_window).sum()} outside window removed)")

    df = df.sort_values("timestamp", kind="stable")
    df["action"] = df["source"].map(ACTIONS)

    # One row per reel: details from the first row that has them (the same
    # reel's caption/owner can be blank in one export and filled in another).
    details = ["shortcode", "owner_username", "owner_name", "caption", "hashtags"]
    blank = df[details].map(lambda v: len(v) == 0)
    reels = (df[details].mask(blank)
             .groupby(df["url"], sort=False).first()
             .reindex(columns=details))
    reels["hashtags"] = reels["hashtags"].map(lambda v: v if isinstance(v, list) else [])
    reels = reels.fillna("")

    # Earliest time of each action, plus a True/False flag for it.
    times = df.pivot_table(index="url", columns="action", values="timestamp",
                           aggfunc="min")
    for action in ACTIONS.values():
        ts = times[action] if action in times else pd.Series(dtype=float)
        reels[f"{action}_at"] = pd.to_datetime(ts.reindex(reels.index), unit="s", utc=True)
        reels[action] = reels[f"{action}_at"].notna()
    reels["first_seen"] = reels[[f"{a}_at" for a in ACTIONS.values()]].min(axis=1)

    # watch_seconds is keyed by URL, so each reel gets it exactly once.
    reels["watch_seconds"] = reels.index.map(watch).where(reels["watched"])
    reels = reels.reset_index().sort_values("first_seen", kind="stable")
    return reels[COLUMNS].reset_index(drop=True)


def load_reels(user="justin"):
    """Load the saved reels DataFrame, building it first if needed."""
    path = DATA_DIR / f"{user}_reels.parquet"
    if not path.exists():
        main(user)
    df = pd.read_parquet(path)
    df["hashtags"] = df["hashtags"].map(list)  # parquet returns numpy arrays
    return df


def main(user="justin"):
    df = build_reels(user)
    pq = DATA_DIR / f"{user}_reels.parquet"
    csv = DATA_DIR / f"{user}_reels.csv"
    df.to_parquet(pq, index=False)
    df.assign(hashtags=df["hashtags"].str.join(" ")).to_csv(csv, index=False)
    known = df["watch_seconds"].notna()
    print(f"wrote {len(df)} reels to {pq.name} and {csv.name} "
          f"(watched {df['watched'].sum()}, liked {df['liked'].sum()}, "
          f"saved {df['saved'].sum()}); watch time estimated for {known.sum()}")
    return df


if __name__ == "__main__":
    main(*sys.argv[1:2])
