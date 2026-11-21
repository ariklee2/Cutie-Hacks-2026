"""
Run every feature for one user and save the results to a single JSON file:

  data/<user>_snapshot.json

This is the file the frontend reads to build the snapshot pages and charts.
It runs after filter/transform.py (which builds data/<user>_reels.parquet).

Usage:
  python3 features/snapshot.py <user>

Each feature runs independently; if one fails, its section is
{"error": "..."} and the rest are still written. Times are ISO 8601 (UTC
unless a field says otherwise); shares are 0–1.
"""

import json
import sys
import traceback
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from features.binge_session import binge_sessions  # noqa: E402
from features.clubs import assign_club  # noqa: E402
from features.loyal_or_variety import classify  # noqa: E402
from features.reels_watched_duration import TIMEZONE, watch_hours  # noqa: E402
from features.top_creators import top_creators  # noqa: E402
from features.top_hashtags import top_hashtags  # noqa: E402
from filter.transform import DATA_DIR  # noqa: E402

SCHEMA_VERSION = 1
TOP_N = 5  # top creators / hashtags to keep (the features' own default)
ALL = 1_000_000  # ask a feature for its whole ranking
TOP_SESSIONS = 3  # longest binge sessions to list


def _num(x):
    """numpy / pandas scalars -> plain float/int (JSON-safe), NaN -> None."""
    if x is None:
        return None
    value = float(x)
    if value != value:  # NaN
        return None
    return int(value) if value.is_integer() and not isinstance(x, float) else value


def _iso(ts):
    return ts.isoformat() if ts is not None else None


def _top_n_stable(ranked):
    """
    The features break ties arbitrarily (top_hashtags' order even changes
    between Python processes, via set ordering). For a saved file that pages
    read, ties are broken alphabetically so rebuilding gives the same result.
    `ranked` is the feature's full (name, count) list.
    """
    return sorted(ranked, key=lambda item: (-item[1], item[0]))[:TOP_N]


def snapshot_top_creators(user):
    ranked = _top_n_stable(top_creators(user, n=ALL))
    return [{"creator": name, "reels": _num(n)} for name, n in ranked]


def snapshot_top_hashtags(user):
    ranked = _top_n_stable(top_hashtags(user, n=ALL))
    return [{"hashtag": tag, "reels": _num(n)} for tag, n in ranked]


def snapshot_watch_time(user):
    total, per_day = watch_hours(user)
    days = [
        {"date": day.strftime("%Y-%m-%d"), "weekday": day.strftime("%A"), "hours": _num(hours)}
        for day, hours in per_day.items()
    ]
    busiest = max(days, key=lambda d: d["hours"]) if days else None
    return {"timezone": TIMEZONE, "total_hours": _num(total), "per_day": days, "busiest_day": busiest}


def snapshot_binge_sessions(user):
    sessions = binge_sessions(user)
    rows = [
        {"start": _iso(s.start), "end": _iso(s.end), "minutes": _num(s.minutes), "reels": _num(s.reels)}
        for s in sessions.itertuples()
    ]
    return {
        "count": len(rows),
        "median_minutes": _num(sessions["minutes"].median()) if rows else None,
        "longest": rows[:TOP_SESSIONS],
        "sessions": rows,  # longest first
    }


def snapshot_loyal_or_variety(user):
    r = classify(user)
    out = {k: (_num(v) if k != "label" and not isinstance(v, (list, str)) else v) for k, v in r.items()}
    if "top_creators" in r:
        out["top_creators"] = [{"creator": c, "points": _num(p)} for c, p in r["top_creators"]]
    return out


def snapshot_club(user):
    r = assign_club(user)
    out = {
        "club": r["club"],
        "reason": r["reason"],
        "shares": [{"club": club, "share": _num(share)} for club, share in r["shares"].items()],
    }
    if "reels_counted" in r:
        out["reels_counted"] = _num(r["reels_counted"])
        out["reels_unclassified"] = _num(r["reels_unclassified"])
        out["by_source"] = {k: _num(v) for k, v in r["by_source"].items()}
    return out


SECTIONS = {
    "top_creators": snapshot_top_creators,
    "top_hashtags": snapshot_top_hashtags,
    "watch_time": snapshot_watch_time,
    "binge_sessions": snapshot_binge_sessions,
    "loyal_or_variety": snapshot_loyal_or_variety,
    "club": snapshot_club,
}


def build_snapshot(user):
    snapshot = {
        "user": user,
        "schema_version": SCHEMA_VERSION,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    failed = []
    for name, build in SECTIONS.items():
        try:
            snapshot[name] = build(user)
        except Exception as error:  # keep going; record what broke
            traceback.print_exc(file=sys.stderr)
            snapshot[name] = {"error": f"{type(error).__name__}: {error}"}
            failed.append(name)
    snapshot["failed_sections"] = failed
    return snapshot


def main(user):
    snapshot = build_snapshot(user)
    path = DATA_DIR / f"{user}_snapshot.json"
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False))
    tmp.replace(path)  # never leave a half-written file
    ok = len(SECTIONS) - len(snapshot["failed_sections"])
    print(f"wrote {path.name} ({ok}/{len(SECTIONS)} sections"
          + (f"; failed: {', '.join(snapshot['failed_sections'])}" if snapshot["failed_sections"] else "")
          + ")")
    return snapshot


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: python3 features/snapshot.py <user>")
    main(sys.argv[1])
