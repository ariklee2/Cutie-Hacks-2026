"""Sort a user into a Reels Wrapped club based on what their reels are about.

Clubs: Brainrot (funny / memes), Nerd (educational), Gym Bro (gym), Sporty
(sports), Looksmaxxer (fashion + makeup), Gamer (video games), News (news,
politics, current events), Foodie (food + recipes), Music (songs, covers,
concerts, raves), Drama (relationships + storytimes), Travel (trips +
outdoors), and Hufflepuff (all-rounder: no single club clearly wins).

How each reel gets a club
-------------------------
1. Keyword rules. Every reel's hashtags, caption words, emojis, creator
   username and image objects are matched against a keyword list per club.
   Hashtags count double (they're the creator's own label for the reel).
   Image objects are what Instagram's own image recognition saw in the
   reel's thumbnail ("tennis, racket, stadium"), fetched with Apify by
   features/reel_media.py and cached in data/<user>_apify_media.json; when
   there's no cache they're simply missing and everything else still works. The club with the
   most points wins; a reel with no hits stays unlabeled for now.
2. Machine learning for the rest. A TF-IDF + logistic regression model
   (scikit-learn) is trained on the reels the rules labeled, then predicts the
   unlabeled ones from their wording, creator and image objects. Predictions under
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
from features.reel_media import visual_objects  # noqa: E402

CLUBS = [
    "Brainrot", "Nerd", "Gym Bro", "Sporty", 
    "Looksmaxxer", "Gamer", "News",
    "Foodie", "Music", "Drama", "Travel"
]
HUFFLEPUFF = "Hufflepuff"
UNCLASSIFIED = "Unclassified"

MIN_WATCH_SECONDS = 3
POINTS = {"watched": 1, "liked": 2, "saved": 3}
MIN_MODEL_CONFIDENCE = 1 / 3   # model guesses below this stay Unclassified
HUFFLEPUFF_MAX_SHARE = 1 / 3  # top club needs at least this share...
HUFFLEPUFF_MIN_LEAD = 0.10   # ...and this lead over 2nd place, else Hufflepuff

HASHTAG_WEIGHT = 2
CAPTION_WEIGHT = 1
IMAGE_WEIGHT = 1   # an object Instagram recognised in the thumbnail counts like a caption word

# Whole words / whole hashtags, all lowercase with no spaces or punctuation
# (captions, hashtags and usernames are split into lowercase words before
# matching). Multi-word keywords are written joined up here ("lockedin") so
# they match hashtags and usernames, and spaced out in PHRASES below so they
# match captions.
WORDS = {
    "Brainrot": {
        "lol", "lmao", "humor", "humour", "relatable", "fail", "fails", "skit",
        "skits", "pov", "joke", "jokes", "hilarious", "troll", "couplehumor",
        "karen", "larp", "slop", "unhinged", "cursed", "mewing",
        "looksmaxxing", "gooning", "edging", "bussin", "sus", "sussy",
        "pookie", "lethimcook", "nocap", "frfr", "ong", "based", "cringe",
        "mid", "goated", "bop", "alpha", "beta", "sidequest", "maincharacter",
        "canonevent", "lore", "chronicallyonline", "touchgrass", "ratio",
        "skillissue", "skilldiff", "yapsession", "brofelloff", "itsgiving",
        "ate", "leftnocrumbs", "slay", "periodt", "sheesh", "bruh", "fam",
        "gang", "tuff", "valid", "wild", "tweaking", "standingonbusiness",
        "lockedin", "ahh", "typeshit", "deadass", "lowkey", "highkey", "ifear",
        "thosewhoknow", "stillwater", "noradrenaline", "winterarc",
        "englishorspanish", "justputthefriesinthebag", "babygronk",
        "livvydunne", "icespice", "dukedennis", "kaicenat", "ishowspeed",
        "ballerinacappuccina", "chimpanzinibananini", "lirililarila",
        "brrbrrpatapim", "cappuccinoassassino", "johnpork", "amogus",
        "amongus", "minecraftparkour", "subwaysurfers", "familyguyclips",
        "thugshaker", "whatdadogdoin", "bombasticsideeye", "emotionaldamage",
    },
    "Nerd": {
        "ai", "cs", "csmajor", "code", "chatgpt", "claude", "anthropic",
        "openai", "nvidia", "study", "studytips", "education", "educational",
        "learn", "learning", "explained", "history", "economics", "finance",
        "investing", "stocks", "ipo", "internship", "intern", "premed",
        "womeninstem", "stem", "howitworks", "documentary", "startup",
        "lecture", "professor", "data", "dork", "intellectual", "genius",
        "bookworm", "einstein", "scholar", "overachiever", "knowitall",
        "algebra", "geometry", "probability", "compiler", "syntax",
        "recursion", "neuralnetwork", "deeplearning", "astronomy",
        "quantummechanics", "laboratory", "hypothesis", "scientist",
        "equation", "flashcards", "quiz", "exam", "straighta", "honorroll",
        "valedictorian", "extracredit", "studygroup", "tutoring",
        "dungeonsanddragons", "minecraft", "pokmon", "starwars", "anime",
        "comicbooks", "superhero", "marvel", "dccomics", "lordoftherings",
        "harrypotter", "scifi", "fantasy", "cosplay", "convention",
        "worldbuilding", "lore", "glasses", "pocketprotector", "suspenders",
        "bowtie", "awkward", "sociallyawkward", "calculator", "periodictable",
        "whiteboard", "graphingcalculator", "spreadsheet", "notebook",
        "wikipedia", "encyclopedia", "wikipediarabbithole", "trivia",
        "factchecker", "overthinking", "perfectionist", "introvert", "logical",
        "analytical", "detailoriented", "syntaxerror", "404error", "terminal",
        "keyboard", "mechanicalkeyboard", "circuitboard", "microprocessor",
        "electronics", "raspberrypi", "piday", "eulersnumber", "infinity",
        "pythagoreantheorem", "theorem", "hypotenuse",
    },
    "Gym Bro": {
        "jacked", "ripped", "pump", "pr", "onerepmax", "progressiveoverload",
        "latpulldown", "dumbbells", "barbell", "kettlebell", "bcaas",
        "chickenandrice", "mealprep", "macros", "caloriedeficit",
        "caloriesurplus", "tren", "enhanced", "testosterone", "gear",
        "arnoldschwarzenegger", "cbum", "samsulek", "mikementzer", "stayhard",
        "lightweightbaby", "wegojim", "aintnothingbutapeanut", "nopainnogain",
        "beastmode", "lockedin", "grindset", "discipline", "motivation",
        "consistency", "mindset", "pushday", "pullday", "restday",
        "activerecovery", "treadmill", "stairmaster", "mirrorselfie",
        "veinpopping", "vascularity", "lovehandles", "cutseason",
        "summershred", "spotme", "onemorerep", "failure", "dropset",
        "superset", "formcheck", "timeundertension", "skullcrushers",
        "hammercurls", "inclinebench", "cablefly", "legpress", "calfraises",
        "mewing", "looksmaxxing", "vtaper", "goldenera", "mirin", "mogging",
    },
    "Sporty": {
        "sport", "nhl", "mls", "ufc", "mma", "grandprix", "nascar", "cfb",
        "ncaa", "dunk", "euroleague", "skate", "parkour", "49ers", "warriors",
        "lakers", "dubnation", "niners", "dodgers", "bleacherreport", "ufc334",
        "competitive", "champion", "mvp", "coach", "captain", "teammate",
        "rookie", "training", "practice", "warmup", "stretching",
        "conditioning", "endurance", "stamina", "agility", "speed", "strength",
        "flexibility", "coordination", "relay", "hurdles", "track", "field",
        "cheerleading", "snowboarding", "skiing", "jogging", "threepointer",
        "hattrick", "goal", "penalty", "freethrow", "cornerkick", "offside",
        "foul", "referee", "tournament", "finals", "scoreboard", "victory",
        "defeat", "comeback", "undefeated", "winningstreak", "rivalry",
        "underdog", "playmaker", "defense", "offense", "jersey", "cleats",
        "sneakers", "sweatband", "mouthguard", "waterbottle", "gatorade",
        "electrolytes", "proteinshake", "hydration", "nike", "adidas",
        "underarmour", "highlightreel", "lockerroom", "teambus", "sideline",
        "bleachers", "stadium", "arena", "pregame", "halftime", "postgame",
        "teamspirit", "schoolspirit", "coachswhistle", "playbook", "drills",
        "scrimmage", "tryouts", "jv", "intramurals", "peclass", "fieldday",
    },
    "Looksmaxxer": {
        "ootd", "fitcheck", "hair", "grwm", "jewelry", "sneakers", "drip",
        "perfume", "nails", "lashes", "vogue", "thrift", "thrifting",
        "hollowcheeks", "definedchin", "mandible", "bonestructure",
        "goldenratio", "masculinefeatures", "mogger", "gigachad", "chad",
        "stacy", "psl", "sub5", "subhuman", "hightier", "lowtier", "cleanser",
        "exfoliating", "glassskin", "dermarolling", "microneedling",
        "tretinoin", "hairline", "hairtransplant", "buzzcut", "middlepart",
        "curtainbangs", "texturedfringe", "wolfcut", "hairvolume",
        "hairdensity", "fade", "eyelashes", "eyearea", "undereyebags",
        "darkcircles", "eyebrowshape", "braces", "veneers", "straightteeth",
        "orthodontics", "smile", "bodyfat", "vtaper", "broadshoulders",
        "smallwaist", "sixpack", "posture", "necktraining", "neckcurls",
        "framemaxxing", "coloranalysis", "accessories", "deodorant", "hygiene",
        "facerating", "rateme", "beforeandafter", "aura", "tiktok", "reddit",
        "blackpill", "whitepill", "redpill", "bonesmashing", "facepulling",
        "mogbattle",
    },
    "Gamer": {
        "grandtheftauto", "grandtheftauto6", "rockstargames", "switch2", "ps5",
        "vicecity", "leonida", "pcmasterrace", "steam", "epicgames", "ps4",
        "ps5pro", "switch", "keyboard", "mouse", "headset", "rgb", "fps",
        "rpg", "mmorpg", "battleroyale", "coop", "indiegame", "openworld",
        "sandbox", "rdr2", "eafc", "fallguys", "hoyoverse", "proplayer", "gg",
        "ggwp", "nerf", "buff", "patchnotes", "dlc", "lootbox", "achievement",
        "platinumtrophy",
    },
    "News": {
        "vote", "trump", "governor", "policy", "cops", "judge", "abc7",
        "worldaffairs", "conservative", "liberal", "legislation", "bill",
        "law", "constitution", "voting", "ballot", "campaign", "recession",
        "federalreserve", "unemployment", "taxes", "fbi", "cia", "doj",
        "federal", "defense", "ceasefire", "peace", "terrorism", "security",
        "shooting", "accident", "disaster", "earthquake", "wildfire",
        "hurricane", "flood", "weatheralert", "publicsafety", "missingperson",
        "criminaljustice", "trial", "verdict", "sentencing", "press", "media",
        "factcheck", "editorial", "opinion", "usatoday", "bloomberg", "axios",
        "theguardian",
    },
    "Foodie": {
        "bake", "tbsp", "tsp", "eats", "aldi", "bbq", "takeout", "delivery",
        "mealideas", "highprotein", "lowcalorie", "vegetarian", "vegan",
        "glutenfree", "dairyfree", "organic", "seasoning", "spices", "sauce",
        "marinade", "grilled", "fried", "roasted", "instantpot", "kitchen",
        "kitchenhacks", "bread", "brownies", "dumplings", "pho", "steak",
        "chicken", "wings", "fries", "michelinstar", "buffet", "allyoucaneat",
    },
    "Music": {
        "cover", "tour", "edc", "raving", "dance", "band", "suno",
        "newrelease", "pop", "rock", "alternative", "blues", "orchestra",
        "symphony", "soul", "reggae", "drill", "trance", "dnb", "freestyle",
        "cypher", "beatbox", "synthesizer", "vocals", "vocalist",
        "instrumental", "beats", "mixtape", "vinyl", "recordplayer",
        "headphones", "livestream", "backstage", "encore", "moshpit",
        "crowdsurfing", "lollapalooza", "rollingloud",
    },
    "Drama": {
        "ex", "boss", "accountability", "rumors", "beef", "conflict",
        "trustissues", "narcissist", "lovetriangle", "friendzone",
        "familyissues", "motherinlaw", "fatherinlaw", "sisterinlaw",
        "brotherinlaw", "secret", "anonymous", "anonymousstory",
        "truthcomesout", "textmessages", "dm", "cancelculture", "badboss",
        "karens", "customercomplaint", "customerfromhell", "custodybattle",
        "inheritance", "familysecret", "amiwrong", "amitheasshole",
        "whoiswrong",
    },
    "Travel": {
        "hike", "citybreak", "visa", "businessclass", "firstclass",
        "economyclass", "packing", "packinglist", "luggage", "suitcase",
        "carryon", "booking", "allinclusive", "backpacker", "scenicviews",
        "safari", "wildlife", "asia", "africa", "northamerica", "southamerica",
        "australia", "newzealand", "canada", "usa", "santorini", "portugal",
        "lisbon", "dubai", "singapore", "hongkong", "taiwan", "indonesia",
        "philippines", "hiddengems",
    },
}

# Multi-word keywords, matched as a word sequence in captions. Write them
# lowercase, with punctuation replaced by spaces ("it's giving" -> "it s giving").
PHRASES = {
    "Brainrot": [
        "fanum tax", "let him cook", "no cap", "fr fr", "aura farming",
        "negative aura", "unspoken rizz", "rizz god", "sigma male",
        "side quest", "main character", "canon event", "chronically online",
        "touch grass", "skill issue", "skill diff", "yap session",
        "bro is cooked", "bro fell off", "it s giving", "left no crumbs",
        "standing on business", "locked in", "goofy ahh", "type shit",
        "i fear", "what the sigma", "erm what the sigma", "those who know",
        "still water", "winter arc", "english or spanish",
        "just put the fries in the bag", "baby gronk", "livvy dunne",
        "ice spice", "quandale dingle", "duke dennis", "kai cenat",
        "tung tung tung sahur", "tralalero tralala", "bombardiro crocodilo",
        "ballerina cappuccina", "chimpanzini bananini", "lirili larila",
        "brr brr patapim", "cappuccino assassino", "john pork", "among us",
        "minecraft parkour", "subway surfers", "family guy clips",
        "skibidi toilet", "fanum taxed", "sigma grindset", "thug shaker",
        "what da dog doin", "bombastic side eye", "emotional damage",
    ],
    "Nerd": [
        "know it all", "computer science", "data structures",
        "machine learning", "artificial intelligence", "neural network",
        "deep learning", "quantum mechanics", "theoretical physics",
        "straight a", "honor roll", "extra credit", "study group",
        "dungeons and dragons", "pok mon", "star wars", "comic books",
        "dc comics", "lord of the rings", "harry potter", "sci fi",
        "pocket protector", "bow tie", "socially awkward", "periodic table",
        "graphing calculator", "wikipedia rabbit hole", "fact checker",
        "detail oriented", "syntax error", "404 error", "mechanical keyboard",
        "circuit board", "raspberry pi", "pi day", "euler s number",
        "pythagorean theorem",
    ],
    "Gym Bro": [
        "gym bro", "one rep max", "progressive overload", "bench press",
        "bicep curls", "tricep extensions", "lat pulldown", "protein shake",
        "pre workout", "whey protein", "chicken and rice", "meal prep",
        "calorie deficit", "calorie surplus", "high protein", "david goggins",
        "arnold schwarzenegger", "sam sulek", "mike mentzer", "stay hard",
        "lightweight baby", "we go jim", "ain t nothing but a peanut",
        "no pain no gain", "beast mode", "locked in", "leg day", "arm day",
        "push day", "pull day", "chest day", "back day", "shoulder day",
        "rest day", "active recovery", "gym rat", "mirror selfie",
        "vein popping", "six pack", "love handles", "body fat", "lean bulk",
        "dirty bulk", "cut season", "summer shred", "spot me", "one more rep",
        "drop set", "pre workout tingles", "gym crush", "ego lifting",
        "form check", "mind muscle connection", "time under tension",
        "skull crushers", "hammer curls", "incline bench", "cable fly",
        "leg press", "calf raises", "v taper", "golden era", "zyzz brah",
    ],
    "Sporty": [
        "home run", "slam dunk", "three pointer", "hat trick", "free throw",
        "corner kick", "winning streak", "athletic wear", "water bottle",
        "protein shake", "sports drink", "under armour", "highlight reel",
        "locker room", "team bus", "game day", "team spirit", "school spirit",
        "coach s whistle", "club sports", "pe class",
    ],
    "Looksmaxxer": [
        "hunter eyes", "canthal tilt", "sharp jaw", "high cheekbones",
        "facial symmetry", "hollow cheeks", "defined chin", "bone structure",
        "facial aesthetics", "golden ratio", "masculine features",
        "model face", "facial harmony", "glow up", "high tier", "low tier",
        "skin care", "clear skin", "glass skin", "hair transplant", "buzz cut",
        "middle part", "curtain bangs", "textured fringe", "wolf cut",
        "hair volume", "hair density", "hair styling", "eyebrow grooming",
        "eye area", "under eye bags", "dark circles", "eyebrow shape",
        "teeth whitening", "straight teeth", "body fat", "lean physique",
        "v taper", "broad shoulders", "small waist", "six pack",
        "neck training", "neck curls", "color analysis", "face rating",
        "rate me", "before and after", "glow up journey", "self improvement",
        "looksmax org", "face pulling", "jaw exerciser", "mewing streak",
        "hunter eyes tutorial",
    ],
    "Gamer": [
        "battle royale",
    ],
    "News": [],
    "Foodie": [
        "thai food", "taste test", "all you can eat",
    ],
    "Music": [
        "youtube music",
    ],
    "Drama": [
        "revenge story", "love triangle", "workplace drama", "office drama",
        "aita post", "am i wrong", "am i the asshole",
    ],
    "Travel": [
        "weekend getaway", "hidden gems",
    ],
}

# Substrings for joined-up hashtags / usernames (e.g. "#brazilgp",
# "kevtrainhard", "santimaxxer"). Lowercase, no spaces. Kept to distinctive
# stems to avoid false hits.
STEMS = {
    "Brainrot": [
        "meme", "funny", "comedy", "prank", "brainrot", "skibidi", "sigma",
        "rizz", "gyatt", "ohio", "fanum", "goofy", "shitpost", "shitposting",
        "ironic", "satire", "dank", "viral", "tiktok", "npc", "mogging",
        "yapping", "crashout", "aura", "delulu", "cooked", "blud", "tungtung",
        "tralalero", "bombardiro", "quandale",
    ],
    "Nerd": [
        "science", "engineer", "coding", "datascience", "computer", "math",
        "program", "developer", "software", "algorithm", "python",
        "javascript", "java", "sql", "database", "machinelearning",
        "artificialintelligence", "robotics", "physics", "chemistry",
        "biology", "calculus", "statistics", "research", "experiment",
        "academic", "studying", "homework", "textbook", "university",
        "college", "chess", "geek", "nerd", "technology", "tech", "linux",
        "debug", "github", "datastructure", "engineering",
    ],
    "Gym Bro": [
        "gym", "workout", "fitness", "bodybuild", "trainhard", "lifting",
        "weightlift", "powerlift", "muscle", "gains", "swole", "shredded",
        "bulk", "cutting", "hypertrophy", "benchpress", "deadlift", "squat",
        "bicep", "tricep", "protein", "creatine", "preworkout", "supplement",
        "physique", "aesthetic", "legday", "chestday", "backday", "armday",
        "shoulderday", "gymrat", "gymbro", "bodyfat", "sixpack", "abs",
        "natty", "steroid", "anabolic", "zyzz", "goggins", "personaltrainer",
        "calisthenics", "crossfit", "cardio", "fitnessmotivation",
        "gymmotivation", "fitlife",
    ],
    "Sporty": [
        "nba", "nfl", "mlb", "formula1", "football", "basketball", "baseball",
        "soccer", "highlights", "tennis", "golf", "sports", "athlete",
        "athletic", "sporty", "espn", "championship", "playoffs", "touchdown",
        "slamdunk", "homerun", "goalkeeper", "quarterback", "striker",
        "volleyball", "hockey", "rugby", "lacrosse", "cricket", "badminton",
        "pickleball", "swimming", "trackandfield", "marathon", "sprint",
        "running", "cycling", "boxing", "wrestling", "gymnastics",
        "skateboarding", "surfing", "olympics", "olympic", "premierleague",
        "championsleague", "worldcup", "fifa", "uefa", "f1", "racing",
        "motorsport", "redbullracing", "ferrari", "mercedesamgf1", "lewis",
        "verstappen", "leclerc", "mclaren", "rally", "matchday", "gameday",
        "sportscenter", "sportsnews", "varsity", "teamwork", "athletics",
    ],
    "Looksmaxxer": [
        "fashion", "makeup", "beauty", "skincare", "outfit", "barber",
        "looksmax", "maxxer", "haircut", "mewing", "mogging", "jawline", "jaw",
        "facial", "aesthetic", "glowup", "glow", "looksmaxxing", "softmaxxing",
        "hardmaxxing", "haircare", "hairstyle", "hairgrowth",
        "skincareroutine", "moisturizer", "retinol", "sunscreen", "acne",
        "clearskin", "teethwhitening", "whitening", "fragrance", "cologne",
        "grooming", "mensfashion", "womensfashion", "streetwear", "style",
        "styling", "model", "modeling", "physique", "symmetry", "cheekbone",
        "huntereyes", "canthal", "mew", "heightmax", "gymmax", "fashionmax",
        "hairmax", "selfimprovement", "beautytips", "outfitinspo",
    ],
    "Gamer": [
        "gta", "gaming", "gamer", "fortnite", "minecraft", "roblox", "esports",
        "playstation", "xbox", "videogame", "gameplay", "streamer", "twitch",
        "speedrun", "speedrunning", "nintendo", "pokemon", "zelda", "mario",
        "valorant", "overwatch", "leagueoflegends", "callofduty", "warzone",
        "counterstrike", "cs2", "apexlegends", "pubg", "rocketleague",
        "amongus", "eldenring", "darksouls", "cyberpunk", "reddead",
        "assassinscreed", "fifa", "nba2k", "genshin", "terraria", "stardew",
        "gamingpc", "pcgaming", "gamingsetup", "controller", "multiplayer",
        "singleplayer", "battlepass", "ranked", "clutch", "noob", "gamerlife",
        "gamingcommunity", "gamingmemes", "gamereview",
    ],
    "News": [
        "news", "politic", "cnn", "cbs", "nbc", "tmz", "breakingnews",
        "headlines", "journalism", "reporter", "journalist", "reuters",
        "apnews", "foxnews", "msnbc", "abcnews", "nytimes", "washingtonpost",
        "bbc", "political", "election", "president", "congress", "senate",
        "government", "whitehouse", "supremecourt", "democrat", "republican",
        "biden", "immigration", "protest", "lawsuit", "court",  # "trump" is a whole word only (not "trumpet")
        "investigation", "police", "crime", "arrest", "military", "war",
        "conflict", "tariff", "economy", "inflation", "stockmarket",
        "worldnews", "localnews", "currentevents", "newsupdate",
        "pressconference", "politicalnews", "breaking",
    ],
    "Foodie": [
        "recipe", "food", "cooking", "foodie", "chef", "bakery", "baking",
        "cook", "restaurant", "foodreview", "foodtok", "foodblogger",
        "foodlover", "foodphotography", "foodporn", "mealprep", "dinner",
        "breakfast", "lunch", "brunch", "dessert", "snack", "streetfood",
        "homemade", "homecooking", "ingredients", "delicious", "yummy",
        "tasty", "mukbang", "taste", "foodchallenge", "pizza", "burger",
        "sushi", "ramen", "tacos", "pasta", "noodles", "boba", "coffee",
        "cafe", "starbucks", "costco", "traderjoes", "grocery", "airfryer",
        "sourdough", "chocolate", "cake", "cookies", "icecream", "foodreels",
        "easyrecipes", "healthyrecipes", "foodinspo", "restaurantreview",
    ],
    "Music": [
        "music", "song", "singing", "kpop", "dancecover", "guitar", "singer",
        "rapper", "hiphop", "rap", "edm", "dj", "concert", "festival", "album",
        "newmusic", "songcover", "musician", "producer", "songwriter",
        "lyrics", "spotify", "soundcloud", "applemusic", "playlist",
        "popmusic", "rockmusic", "indie", "jazz", "classical", "metal", "punk",
        "country", "rnb", "randb", "afrobeats", "reggaeton", "phonk",
        "housemusic", "technomusic", "dubstep", "lofi", "acoustic", "piano",
        "drums", "violin", "saxophone", "guitarist", "pianist", "drummer",
        "beatmaker", "musicproducer", "musicvideo", "remix", "mashup",
        "choreography", "dancer", "livemusic", "rave", "coachella", "grammys",
        "billboard", "setlist",
    ],
    "Drama": [
        "dating", "relationship", "storytime", "cheat", "reddit", "drama",
        "boyfriend", "girlfriend", "husband", "wife", "breakup",
        "situationship", "couple", "couples", "cheating", "cheater", "exposed",
        "gossip", "tea", "confession", "confessions", "aita", "redditstories",
        "redditstory", "toxic", "toxicrelationship", "redflag", "greenflag",
        "gaslighting", "manipulation", "betrayal", "revenge", "argument",
        "fight", "confrontation", "controversy", "friendship", "bestfriend",
        "roommate", "landlord", "tenant", "coworker", "workplace",
        "customerservice", "entitled", "inlaws", "divorce", "wedding",
        "bridezilla", "infidelity", "affair", "caughtcheating",
        "storytimevideo", "relationshipadvice", "datingadvice",
        "influencerdrama", "celebritydrama", "internetdrama", "cancelled",
        "callout", "receipts", "screenshots",
    ],
    "Travel": [
        "travel", "hiking", "vacation", "wanderlust", "traveling",
        "travelling", "traveler", "travelgram", "trip", "holiday", "itinerary",
        "flight", "airport", "hotel", "resort", "backpacking", "roadtrip",
        "outdoors", "nature", "camping", "beach", "island", "mountain",
        "nationalpark", "adventure", "explore", "tourism", "tourist",
        "sightseeing", "destination", "travelblogger", "travelvlog",
        "travelphotography", "travelguide", "travelhacks", "travelinspo",
        "passport", "airline", "boardingpass", "layover", "airbnb", "hostel",
        "cruise", "luxurytravel", "budgettravel", "solotravel", "grouptravel",
        "familyvacation", "honeymoon", "getaway", "staycation", "bucketlist",
        "scenery", "waterfall", "sunset", "sunrise", "snorkeling",
        "scubadiving", "surfing", "skiing", "snowboarding", "vanlife", "japan",
        "tokyo", "vietnam", "danang", "hawaii", "bali", "europe", "italy",
        "paris", "dolomites", "mexico", "thailand", "korea", "seoul",
        "switzerland", "london", "rome", "barcelona", "amsterdam", "greece",
    ],
}

SUFFIXES = {
    "Sporty": ["gp"],
}

EMOJIS = {
    "Brainrot": ["😂", "🤣", "😭", "💀", "🤡", "🗿", "🤓", "🥀", "🙏", "💔"],
    "Nerd": ["🤓", "🧠", "🔬", "🧪", "💻", "📚", "📐"],
    "Gym Bro": ["💪", "🏋️", "🏋️‍♂️", "🦍", "🔥", "🥶"],
    "Sporty": ["🏀", "🏈", "⚽", "⚾", "🏎️", "🏆", "🎾", "🥇"],
    "Looksmaxxer": ["💅", "✨", "🧴", "💇", "🪞", "🧏"],
    "Gamer": ["🎮", "🕹️", "👾", "🏆", "🎧"],
    "News": ["📰", "🚨", "📢", "🌎", "⚖️"],
    "Foodie": ["🍔", "🍕", "🍜", "🍣", "🍰", "😋", "🍳"],
    "Music": ["🎵", "🎶", "🎤", "🎧", "🎸", "🥁"],
    "Drama": ["🍵", "👀", "💅", "😭", "🤯", "💔"],
    "Travel": ["✈️", "🌍", "🌎", "🏝️", "🏔️", "📍", "🧳"],
}

WORD_RE = re.compile(r"[a-z0-9]+")

def _tokens(text):
    return WORD_RE.findall(text.lower())


def _matches(token, club, suffixes=False):
    """Every keyword/stem/suffix of `club` that matches one token."""
    hits = [("word", token)] if token in WORDS[club] else []
    hits += [("stem", s) for s in STEMS[club] if s in token]
    if suffixes:
        hits += [("suffix", x) for x in SUFFIXES.get(club, []) if token.endswith(x)]
    return hits


def _rule_hits(row):
    """Every keyword rule that fired for one reel, as dicts with club, kind
    (word/stem/suffix/emoji), keyword, where it matched (hashtag/caption/
    username) and points. A token that matches several keywords of the same
    club still scores once; each matching keyword is listed, and the points
    sit on the first one.
    """
    hits = []
    tags = [t.lower().lstrip("#") for t in row["hashtags"]]
    caption = row["caption"] or ""

    # Extract caption words, excluding inline hashtags
    words = _tokens(re.sub(r"#\w+", " ", caption))

    # Objects Instagram recognised in the thumbnail ("tennis", "racket", …)
    visual = row.get("visual")
    image_words = _tokens(" ".join(visual)) if isinstance(visual, list) else []

    # Extract username tokens
    user_bits = _tokens(
        row["owner_username"].replace(".", " ").replace("_", " ")
    )

    def add(club, matched, where, points):
        for i, (kind, kw) in enumerate(matched):
            hits.append({"club": club, "kind": kind, "keyword": kw, "where": where,
                         "points": points if i == 0 else 0})

    for club in CLUBS:
        # Hashtags: exact keywords, stems, and suffixes
        for t in tags:
            add(club, _matches(t, club, suffixes=True), "hashtag", HASHTAG_WEIGHT)
        # Caption words: exact keywords and stems
        for w in words:
            add(club, _matches(w, club), "caption", CAPTION_WEIGHT)
        # Caption phrases: multi-word keywords appearing as a word sequence
        for phrase in PHRASES[club]:
            phrase = tuple(phrase.split())
            n = len(phrase)
            count = sum(tuple(words[i:i + n]) == phrase
                        for i in range(len(words) - n + 1))
            if count:
                hits.append({"club": club, "kind": "phrase", "keyword": " ".join(phrase),
                             "where": "caption", "points": CAPTION_WEIGHT * count})
        # Image objects: exact keywords and stems
        for w in image_words:
            add(club, _matches(w, club), "image", IMAGE_WEIGHT)
        # Username pieces: exact keywords and stems
        for u in user_bits:
            add(club, _matches(u, club), "username", HASHTAG_WEIGHT)
        # Emojis
        for e in EMOJIS.get(club, []):
            n = caption.count(e)
            if n:
                hits.append({"club": club, "kind": "emoji", "keyword": e,
                             "where": "caption", "points": CAPTION_WEIGHT * n})
    return hits


def _rule_scores(row):
    """Points per club for one reel from the keyword rules."""
    scores = dict.fromkeys(CLUBS, 0)
    for h in _rule_hits(row):
        scores[h["club"]] += h["points"]
    return scores


def _model_text(row):
    visual = row.get("visual")
    return " ".join([row["caption"] or "", " ".join(row["hashtags"]),
                     f"user_{row['owner_username']}",
                     " ".join(visual) if isinstance(visual, list) else ""])


def classify_reels(user="arik"):
    """Return the reels table with a `club` and `club_source` (rules/model) column."""
    df = load_reels(user).copy()
    df["visual"] = df["shortcode"].map(visual_objects(user)).apply(lambda v: v if isinstance(v, list) else [])
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