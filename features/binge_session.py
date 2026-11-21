"""

Binge sessions: stretches of continuous reel scrolling in the past week.

A session keeps going as long as each reel starts within MAX_GAP_SECONDS of the
previous one; a longer gap ends it. A session's length runs from its first
reel to its last reel, plus the last reel's estimated watch time (capped at
MAX_GAP_SECONDS). Sessions with fewer than MIN_REELS reels (opening the app
for a single reel) are dropped.

Usage:
  python3 features/binge_session.py [user]     (default: justin)

From other code:
  from features.binge_session import binge_sessions
  sessions = binge_sessions("justin")   # DataFrame, longest first

"""

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from filter.transform import load_reels  # noqa: E402

MAX_GAP_SECONDS = 120  # up to 2 minutes between reels keeps a session going
MIN_REELS = 2  # a session needs at least this many reels
TIMEZONE = "America/Los_Angeles"  # for printing start/end times


def binge_sessions(user="justin", max_gap=MAX_GAP_SECONDS, min_reels=MIN_REELS):
    
    """

    Return every scrolling session as a DataFrame, longest first.

    Columns: start, end (UTC datetimes), minutes, reels.

    """
    df = load_reels(user)
    watched = df[df["watched"]].sort_values("watched_at")
    ts = watched["watched_at"]
    gap = ts.diff().dt.total_seconds()
    session_id = (gap.isna() | (gap > max_gap)).cumsum()

    last_watch = watched["watch_seconds"].fillna(0).clip(upper=max_gap)
    sessions = (pd.DataFrame({"session": session_id, "ts": ts,
                              "last_watch": last_watch})
                .groupby("session")
                .agg(start=("ts", "min"), end=("ts", "max"),
                     reels=("ts", "size"), last_watch=("last_watch", "last")))
    sessions = sessions[sessions["reels"] >= min_reels].copy()
    sessions["end"] += pd.to_timedelta(sessions["last_watch"], unit="s")
    sessions["minutes"] = (sessions["end"] - sessions["start"]).dt.total_seconds() / 60
    return (sessions[["start", "end", "minutes", "reels"]]
            .sort_values("minutes", ascending=False)
            .reset_index(drop=True))


def fmt_minutes(m):
    """Seconds under a minute ("45s"), whole minutes from 1 minute up ("22m")."""
    if m < 1:
        return f"{round(m * 60)}s"
    h, mins = divmod(round(m), 60)
    return f"{h}h {mins}m" if h else f"{mins}m"


def main(user="justin"):
    sessions = binge_sessions(user)
    if sessions.empty:
        print("No watched reels found.")
        return
    labels = ["Longest binge session", "2nd longest", "3rd longest"]
    for label, s in zip(labels, sessions.head(3).itertuples()):
        start = s.start.tz_convert(TIMEZONE)
        end = s.end.tz_convert(TIMEZONE)
        print(f"{label}: {fmt_minutes(s.minutes)} ({s.reels} reels) - "
              f"{start:%A %b %d, %I:%M %p} to {end:%I:%M %p}")
    print(f"Median session length: {fmt_minutes(sessions['minutes'].median())} "
          f"across {len(sessions)} sessions")


if __name__ == "__main__":
    main(*sys.argv[1:2])
