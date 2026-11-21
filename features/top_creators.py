"""

Top creators by number of reels watched.

Usage:
  python3 features/top_creators.py [user]     (default: justin)

From other code:
  from features.top_creators import top_creators
  top_creators("justin")  # -> [("username", 12), ...]

"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from filter.transform import load_reels  # noqa: E402

# Reels watched for less than this many seconds were scrolled past, not viewed.
MIN_WATCH_SECONDS = 3


def top_creators(user="justin", n=5, min_seconds=MIN_WATCH_SECONDS):
    """

    Return the n creators with the most watched reels, most first.

    Each item is (creator username, reels watched). The table has one row per
    reel, so this counts distinct reels; ties are ordered arbitrarily.

    Reels with an estimated watch time under min_seconds are skipped. Reels
    with no estimate (the last one before a break in scrolling) are kept, since
    how long they were watched is unknown.
    
    """

    df = load_reels(user)
    too_short = df["watch_seconds"] < min_seconds  # NaN compares False -> kept
    watched = df[df["watched"] & ~too_short & (df["owner_username"] != "")]
    counts = watched["owner_username"].value_counts().head(n)
    return list(counts.items())


if __name__ == "__main__":
    for rank, (creator, count) in enumerate(top_creators(*sys.argv[1:2]), 1):
        print(f"{rank}. {creator}: {count} reels")
