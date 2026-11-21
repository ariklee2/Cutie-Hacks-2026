"""

Sort a user into a Reels Wrapped club based on what their reels are about.

Clubs: Brainrot (funny / memes), Nerd (educational), Gym Bro (gym), Sporty
(sports), Looksmaxxer (fashion + makeup), Gamer (video games), News (news,
politics, current events), Foodie (food + recipes), Music (songs, covers,
concerts, raves), Drama (relationships + storytimes), Travel (trips +
outdoors), and Hufflepuff (all-rounder: no single club clearly wins).

How each reel gets a club
-------------------------
1. Keyword rules. Every reel's hashtags, caption words, emojis and creator
   username are matched against a keyword list per club. Hashtags count
   double (they're the creator's own label for the reel). The club with the
   most points wins; a reel with no hits stays unlabeled for now.
2. Machine learning for the rest. A TF-IDF + logistic regression model
   (scikit-learn) is trained on the reels the rules labeled, then predicts the
   unlabeled ones from their wording and creator. Predictions under
   MIN_MODEL_CONFIDENCE stay "Unclassified".

How the user gets a club
------------------------
Each reel earns engagement points (watched 3+ seconds = 1, liked = 2,
saved = 3) for its club. The club with the biggest share of points wins,
unless it has under HUFFLEPUFF_MAX_SHARE of the points or leads the runner-up
by under HUFFLEPUFF_MIN_LEAD; then the user is a Hufflepuff.

Usage:
  python3 features/clubs.py [user]     (default: justin)

From other code:
  from features.clubs import classify_reels, assign_club
  reels = classify_reels("justin")   # reels DataFrame + club, club_source
  result = assign_club("justin")     # dict: club, shares, ...

"""

import re
import sys
from pathlib import Path

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from filter.transform import load_reels  # noqa: E402

CLUBS = ["Brainrot", "Nerd", "Gym Bro", "Sporty", "Looksmaxxer", "Gamer", "News",
         "Foodie", "Music", "Drama", "Travel"]
HUFFLEPUFF = "Hufflepuff"
UNCLASSIFIED = "Unclassified"

MIN_WATCH_SECONDS = 3
POINTS = {"watched": 1, "liked": 2, "saved": 3}
MIN_MODEL_CONFIDENCE = 1 / 3   # model guesses below this stay Unclassified
HUFFLEPUFF_MAX_SHARE = 1 / 3  # top club needs at least this share...
HUFFLEPUFF_MIN_LEAD = 0.10   # ...and this lead over 2nd place, else Hufflepuff

HASHTAG_WEIGHT = 2
CAPTION_WEIGHT = 1

# Whole words / whole hashtags. Matched against caption words, hashtags and
# the pieces of a creator's username.
WORDS = {
    "Brainrot": {
        "funny", "comedy", "meme", "memes", "lol", "lmao", "humor", "humour",
        "relatable", "prank", "pranks", "fail", "fails", "skit", "skits",
        "brainrot", "pov", "satire", "joke", "jokes", "hilarious", "troll",
        "couplehumor", "karen", "larp", "slop", "unhinged", "cursed",
    },
    "Nerd": {
        "ai", "tech", "technology", "science", "math", "mathematics",
        "statistics", "physics", "chemistry", "biology", "engineering",
        "engineer", "computerscience", "cs", "csmajor", "coding", "programming",
        "code", "python", "datascience", "machinelearning", "softwareengineer",
        "softwareengineering", "artificialintelligence", "chatgpt", "claude",
        "anthropic", "openai", "nvidia", "study", "studying", "studytips",
        "education", "educational", "learn", "learning", "explained", "history",
        "economics", "finance", "investing", "stocks", "ipo", "internship",
        "intern", "techjobs", "bigtech", "premed", "womeninstem", "stem",
        "research", "howitworks", "documentary", "startup", "lecture",
        "professor", "college", "university", "ucrbcoe", "algorithm", "data",
    },
    "Gym Bro": {
        "gym", "gymrat", "gymtok", "workout", "workouts", "fitness",
        "bodybuilding", "bodybuilder", "lifting", "powerlifting",
        "deadlift", "squat", "benchpress", "protein", "gains", "bulk",
        "bulking", "hypertrophy", "calisthenics", "creatine",
        "cardio", "physique", "trainhard", "personaltrainer",
        "running", "marathon", "hybridathlete", "pilates",
    },
    "Sporty": {
        "sports", "sport", "nba", "nfl", "mlb", "nhl", "mls", "ufc", "mma",
        "f1", "formula1", "grandprix", "motorsport", "nascar", "football",
        "basketball", "baseball", "soccer", "hockey", "tennis", "golf",
        "boxing", "wrestling", "volleyball", "cfb", "ncaa", "olympics",
        "highlights", "dunk", "touchdown", "playoffs", "fifa", "premierleague",
        "euroleague", "skate", "skateboarding", "parkour", "surfing",
        "49ers", "warriors", "lakers", "dubnation", "niners", "dodgers",
        "bleacherreport", "espn", "houseofhighlights", "ufc334",
    },
    "Looksmaxxer": {
        "fashion", "outfit", "outfits", "ootd", "style", "streetwear",
        "fitcheck", "makeup", "beauty", "skincare", "hair", "haircut",
        "hairstyle", "barber", "grwm", "glowup", "looksmaxxing",
        "looksmax", "looksmaxxer", "mewing", "aesthetic", "jewelry", "sneakers",
        "drip", "cologne", "fragrance", "perfume", "nails", "lashes",
        "jawline", "vogue", "thrift", "thrifting",
    },
    "Gamer": {
        "gaming", "gamer", "gamers", "videogame", "videogames", "gta", "gta5",
        "gta6", "gtavi", "gtaonline", "grandtheftauto", "grandtheftauto6",
        "rockstargames", "fortnite", "minecraft", "roblox",
        "leagueoflegends", "valorant", "overwatch", "callofduty",
        "warzone", "pokemon", "zelda", "mario", "nintendo", "switch2",
        "playstation", "ps5", "xbox", "pcgaming", "esports", "twitch",
        "streamer", "gtastunts", "vicecity", "leonida", "speedrun", "gameplay",
        "cs2", "counterstrike", "gamingcommunity", "gamingreels",
    },
    "News": {
        "news", "breakingnews", "headlines", "politics",
        "political", "election", "elections", "vote", "president", "trump",
        "biden", "congress", "senate", "government", "governor", "policy",
        "war", "police", "cops", "crime", "arrested", "court", "lawsuit",
        "judge", "investigation", "reporter", "journalism", "protest",
        "immigration", "worldnews", "cnn", "foxnews", "msnbc", "nbc", "cbs",
        "abc7", "reuters", "apnews", "nytimes", "tmz", "tariffs",
    },
    "Foodie": {
        "food", "foodie", "foodies", "foodtok", "recipe", "recipes", "cooking",
        "cook", "baking", "bake", "chef", "tbsp", "tsp", "ingredients",
        "dinner", "lunch", "breakfast", "brunch", "dinnerideas", "easyrecipes",
        "mealprep", "snack", "snacks", "dessert", "restaurant", "restaurants",
        "eats", "foodreview", "mukbang", "costco", "aldi", "traderjoes",
        "boba", "ramen", "sushi", "pizza", "burger", "tacos", "bbq", "delicious",
        "yummy", "tasty", "italianfood", "streetfood",
    },
    "Music": {
        "music", "song", "songs", "singing", "singer", "cover", "songcover",
        "originalsong", "newmusic", "album", "concert", "concerts", "tour",
        "festival", "edm", "edc", "rave", "raving", "dj", "rapper", "rap",
        "hiphop", "kpop", "guitar", "piano", "drums", "producer", "lyrics",
        "spotify", "dance", "dancer", "dancecover", "choreography", "acoustic",
        "lovesong", "band", "musician", "suno",
    },
    "Drama": {
        "dating", "relationship", "relationships", "relationshipgoals",
        "boyfriend", "girlfriend", "husband", "wife", "ex", "cheater",
        "cheating", "cheated", "breakup", "situationship", "couple", "couples",
        "storytime", "reddit", "redditstories", "aita", "drama",
        "tea", "exposed", "landlord", "tenant", "roommate", "coworker", "boss",
        "customerservice", "entitled", "accountability", "divorce", "wedding",
        "inlaws", "toxic",
    },
    "Travel": {
        "travel", "traveling", "travelling", "traveler", "travelgram", "trip",
        "vacation", "holiday", "itinerary", "flight", "airport", "hotel",
        "resort", "backpacking", "roadtrip", "hike", "hiking", "outdoors",
        "nature", "camping", "beach", "island", "mountains", "nationalpark",
        "japan", "tokyo", "vietnam", "danang", "hawaii", "bali",
        "europe", "italy", "paris", "dolomites", "mexico", "thailand", "korea",
        "seoul", "wanderlust",
    },
}

# Substrings for joined-up hashtags / usernames (e.g. "#brazilgp",
# "kevtrainhard", "santimaxxer"). Kept to distinctive stems to avoid false hits.

STEMS = {
    "Brainrot": ["meme", "funny", "comedy", "prank"],
    "Nerd": ["science", "engineer", "coding", "datascience", "computer", "math"],
    "Gym Bro": ["gym", "workout", "fitness", "bodybuild", "trainhard", "lifting"],
    "Sporty": ["nba", "nfl", "mlb", "formula1", "football", "basketball",
               "baseball", "soccer", "highlights", "tennis", "golf"],
    "Looksmaxxer": ["fashion", "makeup", "beauty", "skincare", "outfit",
                    "barber", "looksmax", "maxxer", "haircut"],
    "Gamer": ["gta", "gaming", "gamer", "fortnite", "minecraft", "roblox",
              "esports", "playstation", "xbox"],
    "News": ["news", "politic", "cnn", "cbs", "nbc", "tmz"],
    "Foodie": ["recipe", "food", "cooking", "foodie", "chef", "bakery"],
    "Music": ["music", "song", "singing", "kpop", "dancecover", "guitar"],
    "Drama": ["dating", "relationship", "storytime", "cheat", "reddit", "drama"],
    "Travel": ["travel", "hiking", "vacation", "wanderlust"],
}

# Endings for joined-up hashtags, e.g. "#brazilgp", "#lasvegasgp" (race names).
SUFFIXES = {"Sporty": ["gp"]}
EMOJIS = {"Brainrot": ["😂", "🤣", "😭", "💀", "🤡"]}

WORD_RE = re.compile(r"[a-z0-9]+")


def _tokens(text):
    return WORD_RE.findall(text.lower())


def _rule_scores(row):
    """Points per club for one reel from the keyword rules."""
    scores = dict.fromkeys(CLUBS, 0)
    tags = [t.lower().lstrip("#") for t in row["hashtags"]]
    caption = row["caption"] or ""
    # Hashtags written inline in the caption are already in row["hashtags"].
    words = _tokens(re.sub(r"#\w+", " ", caption))
    user_bits = _tokens(row["owner_username"].replace(".", " ").replace("_", " "))
    for club in CLUBS:
        for t in tags:
            if (t in WORDS[club] or any(s in t for s in STEMS[club])
                    or any(t.endswith(x) for x in SUFFIXES.get(club, []))):
                scores[club] += HASHTAG_WEIGHT
        scores[club] += CAPTION_WEIGHT * sum(w in WORDS[club] for w in words)
        for u in user_bits:
            if u in WORDS[club] or any(s in u for s in STEMS[club]):
                scores[club] += HASHTAG_WEIGHT
        scores[club] += CAPTION_WEIGHT * sum(caption.count(e) for e in EMOJIS.get(club, []))
    return scores


def _model_text(row):
    return " ".join([row["caption"] or "", " ".join(row["hashtags"]),
                     f"user_{row['owner_username']}"])


def classify_reels(user="arik"):
    """Return the reels table with a `club` and `club_source` (rules/model) column."""
    df = load_reels(user).copy()
    scores = pd.DataFrame([_rule_scores(r) for _, r in df.iterrows()], index=df.index)
    best = scores.max(axis=1)
    df["club"] = scores.idxmax(axis=1).where(best > 0, UNCLASSIFIED)
    df["club_source"] = pd.Series("rules", index=df.index).where(best > 0, "")

    labeled = df["club"] != UNCLASSIFIED
    if labeled.sum() >= 20 and df.loc[labeled, "club"].nunique() >= 2 and (~labeled).any():
        text = df.apply(_model_text, axis=1)
        vec = TfidfVectorizer(ngram_range=(1, 2), min_df=1, sublinear_tf=True,
                              token_pattern=r"[^\s]+")
        X = vec.fit_transform(text)
        model = LogisticRegression(max_iter=1000, class_weight="balanced")
        model.fit(X[labeled.to_numpy()], df.loc[labeled, "club"])
        proba = model.predict_proba(X[(~labeled).to_numpy()])
        guess = model.classes_[proba.argmax(axis=1)]
        sure = proba.max(axis=1) >= MIN_MODEL_CONFIDENCE
        idx = df.index[~labeled]
        df.loc[idx[sure], "club"] = guess[sure]
        df.loc[idx[sure], "club_source"] = "model"
    return df


def assign_club(user="arik"):
    df = classify_reels(user)
    real_watch = df["watched"] & ~(df["watch_seconds"] < MIN_WATCH_SECONDS)
    df["points"] = (real_watch * POINTS["watched"] + df["liked"] * POINTS["liked"]
                    + df["saved"] * POINTS["saved"])
    counted = df[(df["points"] > 0) & (df["club"] != UNCLASSIFIED)]
    shares = (counted.groupby("club")["points"].sum()
              .reindex(CLUBS, fill_value=0))
    if shares.sum() == 0:
        return {"club": HUFFLEPUFF, "shares": shares, "reason": "no classified reels"}
    shares = (shares / shares.sum()).sort_values(ascending=False)
    top, second = shares.iloc[0], shares.iloc[1]
    if top < HUFFLEPUFF_MAX_SHARE or top - second < HUFFLEPUFF_MIN_LEAD:
        club, reason = HUFFLEPUFF, "no club clearly dominates"
    else:
        club, reason = shares.index[0], f"{top:.0%} of engagement"
    return {
        "club": club,
        "reason": reason,
        "shares": shares,
        "reels_counted": len(counted),
        "reels_unclassified": int(((df["points"] > 0) & (df["club"] == UNCLASSIFIED)).sum()),
        "by_source": df.loc[df["points"] > 0, "club_source"].replace("", "none").value_counts(),
    }


def main(user="arik"):
    r = assign_club(user)
    print(f"{user} is in the {r['club'].upper()} club ({r['reason']})")
    for club, share in r["shares"].items():
        print(f"  {club:<12} {share:6.1%}")
    if "reels_counted" in r:
        src = r["by_source"]
        print(f"  based on {r['reels_counted']} reels "
              f"({src.get('rules', 0)} by keywords, {src.get('model', 0)} by model); "
              f"{r['reels_unclassified']} left unclassified")


if __name__ == "__main__":
    main(*sys.argv[1:2])