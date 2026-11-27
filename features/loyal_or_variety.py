"""Classify a user as LOYAL (keeps coming back to the same creators) or VARIETY
(spreads their attention across lots of different creators).

How it works
------------
1. Engagement points per reel: watched for MIN_WATCH_SECONDS+ = 1 point,
   liked = 2, saved = 3 (they add up). Liking/saving is a stronger signal
   than scrolling past, so it weighs more. Reels watched under 3 seconds with
   no like/save earn nothing.
2. Three metrics, each 0-1 where higher = more loyal:
   - repeat_share:  share of points going to creators you engaged with on
                    REPEAT_MIN_REELS + different reels ("came back to them").
   - top5_share:    share of points going to your top 5 creators.
   - concentration: 1 - (distinct creators / engaged reels). 0 means every
                    reel was a new creator; near 1 means a handful of creators.
3. loyalty_score = average of the three, scaled to 0-100.
   score >= LOYAL_THRESHOLD -> "Loyal", otherwise "Variety".

Usage:
  python3 features/loyal_or_variety.py [user]     (default: justin)

From other code:
  from features.loyal_or_variety import classify
  result = classify("justin")   # dict with label, score and the metrics
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from filter.transform import load_reels  # noqa: E402

MIN_WATCH_SECONDS = 3   # shorter views count as scrolling past
POINTS = {"watched": 1, "liked": 2, "saved": 3}
REPEAT_MIN_REELS = 3    # creators you engaged with on this many reels = repeat
LOYAL_THRESHOLD = 50    # loyalty_score at or above this -> Loyal


def classify(user="justin"):
    df = load_reels(user)
    df = df[df["owner_username"] != ""]
    real_watch = df["watched"] & ~(df["watch_seconds"] < MIN_WATCH_SECONDS)
    points = (real_watch * POINTS["watched"]
              + df["liked"] * POINTS["liked"]
              + df["saved"] * POINTS["saved"])
    engaged = df[points > 0].assign(points=points[points > 0])
    if engaged.empty:
        return {"label": "Unknown", "score": None}

    per_creator = engaged.groupby("owner_username").agg(
        points=("points", "sum"), reels=("url", "size"))
    per_creator = per_creator.sort_values("points", ascending=False)
    total = per_creator["points"].sum()

    repeat_share = per_creator.loc[per_creator["reels"] >= REPEAT_MIN_REELS, "points"].sum() / total
    top5_share = per_creator["points"].head(5).sum() / total
    concentration = 1 - len(per_creator) / len(engaged)
    score = round(100 * (repeat_share + top5_share + concentration) / 3)

    return {
        "label": "Loyal" if score >= LOYAL_THRESHOLD else "Variety",
        "score": score,
        "repeat_share": repeat_share,
        "top5_share": top5_share,
        "concentration": concentration,
        "engaged_reels": len(engaged),
        "creators": len(per_creator),
        "one_time_creators": int((per_creator["reels"] == 1).sum()),
        "top_creators": list(per_creator["points"].head(5).items()),
    }


def main(user="justin"):
    r = classify(user)
    if r["score"] is None:
        print("No engaged reels found.")
        return
    print(f"{user} is a {r['label'].upper()} viewer (loyalty score {r['score']}/100; "
          f"{LOYAL_THRESHOLD}+ = Loyal)")
    print(f"  {r['engaged_reels']} reels from {r['creators']} creators "
          f"({r['one_time_creators']} seen only once)")
    print(f"  Repeat creators ({REPEAT_MIN_REELS}+ reels): {r['repeat_share']:.0%} of engagement")
    print(f"  Top 5 creators: {r['top5_share']:.0%} of engagement")
    print(f"  Concentration: {r['concentration']:.0%}")
    print("  Top creators: " + ", ".join(f"{c} ({p} pts)" for c, p in r["top_creators"]))


if __name__ == "__main__":
    main(*sys.argv[1:2])