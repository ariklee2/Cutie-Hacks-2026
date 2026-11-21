"""

Hours spent watching reels in the past week, in total and per day.

Usage:
  python3 features/reels_watched_duration.py [user]     (default: justin)

From other code:
  from features.reels_watched_duration import watch_hours
  total, per_day = watch_hours("justin")

"""

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from filter.transform import load_reels  # noqa: E402

# Days are split at local midnight in this timezone, not UTC.
TIMEZONE = "America/Los_Angeles"


def watch_hours(user="justin", tz=TIMEZONE):
    """

    Return (total_hours, per_day) for the reels watched in the past week.

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


def main(user="justin"):
    total, per_day = watch_hours(user)
    if per_day.empty:
        print("No watched reels found.")
        return
    start, end = per_day.index.min(), per_day.index.max()
    print(f"Week of {start:%b %d} - {end:%b %d, %Y}: {total:.2f} hours")
    for day, hours in per_day.items():
        print(f"  {day:%A} ({day:%b %d}): {hours:.2f} hours")


if __name__ == "__main__":
    main(*sys.argv[1:2])