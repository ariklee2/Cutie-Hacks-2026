"""Top hashtags across the reels watched in the past week.

Usage:
  python3 features/top_hashtags.py [user]     (default: justin)

From other code:
  from features.top_hashtags import top_hashtags
  top_hashtags("justin")  # -> [("hashtag", 12), ...]
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from filter.transform import load_reels  # noqa: E402


def top_hashtags(user="justin", n=5, min_seconds=0):
    """Return the n hashtags on the most watched reels, most first.

    Each item is (hashtag, number of watched reels using it). A hashtag counts
    once per reel; case is ignored. The reels table only covers the
    videos_watched week, so this is the past week. Pass min_seconds (e.g. 3)
    to skip reels scrolled past quickly; reels with no estimate are kept.
    Ties are ordered arbitrarily.
    """
    
    df = load_reels(user)
    too_short = df["watch_seconds"] < min_seconds  # NaN compares False -> kept
    watched = df[df["watched"] & ~too_short]
    tags = (watched["hashtags"]
            .map(lambda ts: {t.strip().lower().lstrip("#") for t in ts} - {""})
            .explode()
            .dropna())
    return list(tags.value_counts().head(n).items())


if __name__ == "__main__":
    for rank, (tag, count) in enumerate(top_hashtags(*sys.argv[1:2]), 1):
        print(f"{rank}. #{tag}: {count} reels")
