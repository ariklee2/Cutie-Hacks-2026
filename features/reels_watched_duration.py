"""Hours spent watching reels in the past week, in total and per day, and how
many reels were scrolled through (one reel = one scroll).

Usage:
  python3 features/reels_watched_duration.py [user]     (default: justin)

From other code:
  from features.reels_watched_duration import watch_hours
  total, per_day = watch_hours("justin")
  from features.reels_watched_duration import reels_scrolled
  count, per_day_count = reels_scrolled("justin")
"""

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from filter.transform import load_reels  # noqa: E402

# Days are split at local midnight in this timezone, not UTC.
TIMEZONE = "America/Los_Angeles"

# One scroll moves one reel off the screen, so each reel scrolled is about one
# phone screen of thumb travel. ~6 inches is a typical phone screen height.
SCROLL_INCHES_PER_REEL = 6
INCHES_PER_MILE = 63_360


def watch_hours(user="justin", tz=TIMEZONE):
    """Return (total_hours, per_day) for the reels watched in the past week.

    per_day is a pandas Series of hours indexed by local date, oldest first,
    including days with no watching (0 hours). Each reel's estimated
    watch_seconds counts on the day it was watched. Reels with no estimate
    (the last one before a break in scrolling) add nothing, so these totals
    lean slightly low. The reels table only covers the videos_watched week.
    """

    df = load_reels(user)
    watched = df[df["watched"]]
    day = watched["watched_at"].dt.tz_convert(tz).dt.normalize()
    per_day = watched["watch_seconds"].fillna(0).groupby(day).sum() / 3600
    if not per_day.empty:  # fill in days with no watching as 0 hours
        all_days = pd.date_range(per_day.index.min(), per_day.index.max(), freq="D")
        per_day = per_day.reindex(all_days, fill_value=0.0)
    return float(per_day.sum()), per_day


def reels_scrolled(user="justin", tz=TIMEZONE):
    """Return (total_reels, per_day) for the reels scrolled through in the past
    week. Every reel in the viewing history counts as one scroll, however long
    it was watched (unlike top creators, which only count 3s+ views). A reel
    seen more than once counts once (the reels table has one row per reel),
    on the day it was first watched.

    per_day is a pandas Series of reel counts indexed by local date, oldest
    first, with the same days as watch_hours (days with none are 0).
    """

    df = load_reels(user)
    watched = df[df["watched"]]
    day = watched["watched_at"].dt.tz_convert(tz).dt.normalize()
    per_day = day.value_counts().sort_index()
    if not per_day.empty:  # fill in days with no scrolling as 0 reels
        all_days = pd.date_range(per_day.index.min(), per_day.index.max(), freq="D")
        per_day = per_day.reindex(all_days, fill_value=0)
    return int(per_day.sum()), per_day.astype(int)


def scroll_distance(total_reels, inches_per_reel=SCROLL_INCHES_PER_REEL):
    """Return (inches, miles) scrolled for a number of reels (one screen each)."""
    inches = total_reels * inches_per_reel
    return inches, inches / INCHES_PER_MILE


def main(user="justin"):
    total, per_day = watch_hours(user)
    count, per_day_count = reels_scrolled(user)
    if per_day.empty:
        print("No watched reels found.")
        return
    start, end = per_day.index.min(), per_day.index.max()
    inches, miles = scroll_distance(count)
    print(f"Week of {start:%b %d} - {end:%b %d, %Y}: {total:.2f} hours, {count} reels"
          f" ({inches:,} inches = {miles:.2f} miles scrolled)")
    for day, hours in per_day.items():
        print(f"  {day:%A} ({day:%b %d}): {hours:.2f} hours, {per_day_count.get(day, 0)} reels")


if __name__ == "__main__":
    main(*sys.argv[1:2])