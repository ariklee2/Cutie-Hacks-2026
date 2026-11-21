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

# Whole words / whole hashtags, all lowercase with no spaces or punctuation
# (captions, hashtags and usernames are split into lowercase words before
# matching). Multi-word keywords are written joined up here ("lockedin") so
# they match hashtags and usernames, and spaced out in PHRASES below so they
# match captions.
WORDS = {
    "Brainrot": {
        "funny", "comedy", "meme", "memes", "lol", "lmao", "humor", "humour",
        "relatable", "prank", "pranks", "fail", "fails", "skit", "skits",
        "brainrot", "pov", "satire", "joke", "jokes", "hilarious", "troll",
        "couplehumor", "karen", "larp", "slop", "unhinged", "cursed",
        "skibidi", "rizz", "sigma", "gyatt", "fanumtax", "ohio", "mewing",
        "looksmaxxing", "mogging", "gooning", "edging", "bussin", "sus",
        "sussy", "delulu", "pookie", "yapping", "cooked", "lethimcook",
        "nocap", "frfr", "ong", "based", "cringe", "mid", "goated", "bop",
        "aura", "aurafarming", "negativeaura", "unspokenrizz", "rizzler",
        "rizzgod", "sigmamale", "alpha", "beta", "npc", "sidequest",
        "maincharacter", "canonevent", "lore", "chronicallyonline",
        "touchgrass", "ratio", "skillissue", "skilldiff", "yapsession",
        "broiscooked", "brofelloff", "itsgiving", "ate", "leftnocrumbs",
        "slay", "periodt", "sheesh", "bruh", "blud", "fam", "gang", "tuff",
        "valid", "wild", "crashout", "tweaking", "standingonbusiness",
        "lockedin", "goofyahh", "ahh", "typeshit", "deadass", "lowkey",
        "highkey", "ifear", "whatthesigma", "ermwhatthesigma", "thosewhoknow",
        "stillwater", "noradrenaline", "winterarc", "englishorspanish",
        "justputthefriesinthebag", "babygronk", "livvydunne", "icespice",
        "quandaledingle", "dukedennis", "kaicenat", "ishowspeed",
        "tungtungtungsahur", "tralalerotralala", "bombardirocrocodilo",
        "ballerinacappuccina", "chimpanzinibananini", "lirililarila",
        "brrbrrpatapim", "cappuccinoassassino", "johnpork", "amogus",
        "amongus", "minecraftparkour", "subwaysurfers", "familyguyclips",
        "goofy", "skibiditoilet", "fanumtaxed", "sigmagrindset", "thugshaker",
        "whatdadogdoin", "bombasticsideeye", "emotionaldamage",
    },
    "Nerd": {
        "ai", "tech", "technology", "science", "math", "mathematics",
        "statistics", "physics", "chemistry", "biology", "engineering",
        "engineer", "computerscience", "cs", "csmajor", "coding",
        "programming", "code", "python", "datascience", "machinelearning",
        "softwareengineer", "softwareengineering", "artificialintelligence",
        "chatgpt", "claude", "anthropic", "openai", "nvidia", "study",
        "studying", "studytips", "education", "educational", "learn",
        "learning", "explained", "history", "economics", "finance",
        "investing", "stocks", "ipo", "internship", "intern", "techjobs",
        "bigtech", "premed", "womeninstem", "stem", "research", "howitworks",
        "documentary", "startup", "lecture", "professor", "college",
        "university", "algorithm", "data", "geek", "dork", "nerdy",
        "intellectual", "genius", "bookworm", "einstein", "scholar",
        "academic", "overachiever", "knowitall", "calculus", "algebra",
        "geometry", "probability", "java", "datastructures", "debugging",
        "compiler", "syntax", "recursion", "database", "sql", "neuralnetwork",
        "deeplearning", "astronomy", "quantummechanics", "theoreticalphysics",
        "laboratory", "experiment", "hypothesis", "scientist", "equation",
        "textbook", "homework", "flashcards", "quiz", "exam", "straighta",
        "honorroll", "valedictorian", "extracredit", "studygroup", "tutoring",
        "chess", "dungeonsanddragons", "minecraft", "pokmon", "starwars",
        "anime", "comicbooks", "superhero", "marvel", "dccomics",
        "lordoftherings", "harrypotter", "scifi", "fantasy", "cosplay",
        "convention", "worldbuilding", "lore", "glasses", "pocketprotector",
        "suspenders", "bowtie", "awkward", "sociallyawkward", "calculator",
        "periodictable", "whiteboard", "graphingcalculator", "spreadsheet",
        "notebook", "wikipedia", "encyclopedia", "wikipediarabbithole",
        "trivia", "factchecker", "overthinking", "perfectionist", "introvert",
        "logical", "analytical", "detailoriented", "syntaxerror", "404error",
        "linux", "terminal", "keyboard", "mechanicalkeyboard", "robotics",
        "circuitboard", "microprocessor", "electronics", "raspberrypi",
        "piday", "eulersnumber", "infinity", "pythagoreantheorem", "theorem",
        "hypotenuse",
    },
    "Gym Bro": {
        "gymbro", "gains", "swole", "jacked", "shredded", "ripped", "bulking",
        "cutting", "pump", "pr", "onerepmax", "progressiveoverload",
        "benchpress", "deadlift", "squat", "bicepcurls", "tricepextensions",
        "latpulldown", "dumbbells", "barbell", "kettlebell", "weightlifting",
        "powerlifting", "bodybuilding", "protein", "proteinshake", "creatine",
        "preworkout", "bcaas", "wheyprotein", "chickenandrice", "mealprep",
        "macros", "caloriedeficit", "caloriesurplus", "highprotein", "tren",
        "natty", "enhanced", "testosterone", "steroids", "gear", "zyzz",
        "davidgoggins", "arnoldschwarzenegger", "cbum", "samsulek",
        "mikementzer", "stayhard", "lightweightbaby", "wegojim",
        "aintnothingbutapeanut", "nopainnogain", "beastmode", "lockedin",
        "grindset", "discipline", "motivation", "consistency", "mindset",
        "legday", "armday", "pushday", "pullday", "chestday", "backday",
        "shoulderday", "restday", "activerecovery", "cardio", "treadmill",
        "stairmaster", "gymrat", "mirrorselfie", "veinpopping", "vascularity",
        "sixpack", "abs", "lovehandles", "bodyfat", "leanbulk", "dirtybulk",
        "cutseason", "summershred", "spotme", "onemorerep", "failure",
        "dropset", "superset", "preworkouttingles", "gymcrush", "egolifting",
        "formcheck", "mindmuscleconnection", "timeundertension",
        "skullcrushers", "hammercurls", "inclinebench", "cablefly", "legpress",
        "calfraises", "proteinmaxxing", "mewing", "looksmaxxing", "aesthetic",
        "vtaper", "goldenera", "mirin", "mogging", "zyzzbrah", "anabolic",
        "hypertrophy",
    },
    "Sporty": {
        "sports", "sport", "nba", "nfl", "mlb", "nhl", "mls", "ufc", "mma",
        "f1", "formula1", "grandprix", "motorsport", "nascar", "football",
        "basketball", "baseball", "soccer", "hockey", "tennis", "golf",
        "boxing", "wrestling", "volleyball", "cfb", "ncaa", "olympics",
        "highlights", "dunk", "touchdown", "playoffs", "fifa", "premierleague",
        "euroleague", "skate", "skateboarding", "parkour", "surfing", "49ers",
        "warriors", "lakers", "dubnation", "niners", "dodgers",
        "bleacherreport", "espn", "houseofhighlights", "ufc334", "athlete",
        "athletic", "sporty", "competitive", "champion", "mvp", "teamwork",
        "sportsmanship", "coach", "captain", "teammate", "rookie", "training",
        "practice", "warmup", "stretching", "conditioning", "endurance",
        "stamina", "agility", "speed", "strength", "flexibility",
        "coordination", "sprint", "marathon", "relay", "hurdles", "track",
        "field", "rugby", "lacrosse", "swimming", "badminton", "pickleball",
        "gymnastics", "cheerleading", "snowboarding", "skiing", "cycling",
        "running", "jogging", "homerun", "slamdunk", "threepointer",
        "hattrick", "goal", "penalty", "freethrow", "cornerkick", "offside",
        "foul", "referee", "championship", "tournament", "finals",
        "scoreboard", "victory", "defeat", "comeback", "undefeated",
        "winningstreak", "rivalry", "underdog", "playmaker", "defense",
        "offense", "striker", "quarterback", "goalkeeper", "athleticwear",
        "jersey", "cleats", "sneakers", "sweatband", "mouthguard",
        "waterbottle", "gatorade", "electrolytes", "proteinshake",
        "sportsdrink", "hydration", "nike", "adidas", "underarmour",
        "sportscenter", "highlightreel", "lockerroom", "teambus", "sideline",
        "bleachers", "stadium", "arena", "pregame", "halftime", "postgame",
        "gameday", "teamspirit", "schoolspirit", "coachswhistle", "playbook",
        "drills", "scrimmage", "tryouts", "varsity", "jv", "intramurals",
        "clubsports", "peclass", "fieldday", "athletemindset",
    },
    "Looksmaxxer": {
        "fashion", "outfit", "outfits", "ootd", "style", "streetwear",
        "fitcheck", "makeup", "beauty", "skincare", "hair", "haircut",
        "hairstyle", "barber", "grwm", "glowup", "looksmaxxing", "looksmax",
        "looksmaxxer", "mewing", "aesthetic", "jewelry", "sneakers", "drip",
        "cologne", "fragrance", "perfume", "nails", "lashes", "jawline",
        "vogue", "thrift", "thrifting", "mogging", "huntereyes", "canthaltilt",
        "sharpjaw", "highcheekbones", "facialsymmetry", "hollowcheeks",
        "definedchin", "mandible", "bonestructure", "facialaesthetics",
        "goldenratio", "masculinefeatures", "modelface", "facialharmony",
        "softmaxxing", "hardmaxxing", "mogger", "gigachad", "chad", "stacy",
        "psl", "sub5", "subhuman", "hightier", "lowtier", "retinol",
        "moisturizer", "sunscreen", "cleanser", "exfoliating", "acne",
        "clearskin", "glassskin", "dermarolling", "microneedling", "tretinoin",
        "hairline", "hairtransplant", "buzzcut", "middlepart", "curtainbangs",
        "texturedfringe", "wolfcut", "hairvolume", "hairdensity",
        "hairstyling", "fade", "eyebrowgrooming", "eyelashes", "eyearea",
        "undereyebags", "darkcircles", "eyebrowshape", "teethwhitening",
        "braces", "veneers", "straightteeth", "orthodontics", "smile",
        "bodyfat", "leanphysique", "vtaper", "broadshoulders", "smallwaist",
        "sixpack", "posture", "necktraining", "neckcurls", "gymmaxxing",
        "heightmaxxing", "framemaxxing", "fashionmaxxing", "coloranalysis",
        "accessories", "deodorant", "hygiene", "grooming", "facerating",
        "rateme", "beforeandafter", "glowupjourney", "selfimprovement", "aura",
        "tiktok", "reddit", "looksmaxorg", "blackpill", "whitepill", "redpill",
        "bonesmashing", "facepulling", "jawexerciser", "mewingstreak",
        "huntereyestutorial", "mogbattle",
    },
    "Gamer": {
        "gaming", "gamer", "gamers", "videogame", "videogames", "gta", "gta5",
        "gta6", "gtavi", "gtaonline", "grandtheftauto", "grandtheftauto6",
        "rockstargames", "fortnite", "minecraft", "roblox", "leagueoflegends",
        "valorant", "overwatch", "callofduty", "warzone", "pokemon", "zelda",
        "mario", "nintendo", "switch2", "playstation", "ps5", "xbox",
        "pcgaming", "esports", "twitch", "streamer", "gtastunts", "vicecity",
        "leonida", "speedrun", "gameplay", "cs2", "counterstrike",
        "gamingcommunity", "gamingreels", "gamerlife", "gamingsetup",
        "gamingpc", "pcmasterrace", "steam", "epicgames", "xboxseriesx",
        "xboxseries", "ps4", "ps5pro", "nintendoswitch", "switch",
        "handheldgaming", "controller", "keyboard", "mouse", "headset",
        "gamingchair", "rgb", "fps", "rpg", "mmorpg", "battleroyale",
        "multiplayer", "singleplayer", "coop", "indiegame", "openworld",
        "sandbox", "darksouls", "eldenring", "cyberpunk2077",
        "reddeadredemption", "rdr2", "assassinscreed", "fifa", "eafc", "nba2k",
        "apexlegends", "pubg", "rocketleague", "fallguys", "amongus",
        "terraria", "stardewvalley", "genshinimpact", "hoyoverse",
        "speedrunning", "gamingmemes", "ranked", "competitivegaming", "noob",
        "proplayer", "gg", "ggwp", "nerf", "buff", "patchnotes", "dlc",
        "lootbox", "battlepass", "achievement", "platinumtrophy", "clutch",
    },
    "News": {
        "news", "breakingnews", "headlines", "politics", "political",
        "election", "elections", "vote", "president", "trump", "biden",
        "congress", "senate", "government", "governor", "policy", "war",
        "police", "cops", "crime", "arrested", "court", "lawsuit", "judge",
        "investigation", "reporter", "journalism", "protest", "immigration",
        "worldnews", "cnn", "foxnews", "msnbc", "nbc", "cbs", "abc7",
        "reuters", "apnews", "nytimes", "tmz", "tariffs", "breaking",
        "latestnews", "currentevents", "localnews", "nationalnews",
        "internationalnews", "worldaffairs", "pressconference", "whitehouse",
        "supremecourt", "democrat", "republican", "conservative", "liberal",
        "legislation", "bill", "law", "constitution", "voting", "ballot",
        "campaign", "politicaldebate", "politicalnews", "governmentshutdown",
        "economy", "inflation", "recession", "stockmarket", "federalreserve",
        "unemployment", "taxes", "fbi", "cia", "doj", "federal", "military",
        "defense", "conflict", "ceasefire", "peace", "terrorism", "security",
        "shooting", "accident", "disaster", "earthquake", "wildfire",
        "hurricane", "flood", "weatheralert", "publicsafety", "missingperson",
        "criminaljustice", "trial", "verdict", "sentencing", "press", "media",
        "journalist", "newsreport", "newsupdate", "factcheck", "editorial",
        "opinion", "bbc", "abcnews", "usatoday", "washingtonpost", "bloomberg",
        "politico", "axios", "theguardian",
    },
    "Foodie": {
        "food", "foodie", "foodies", "foodtok", "recipe", "recipes", "cooking",
        "cook", "baking", "bake", "chef", "tbsp", "tsp", "ingredients",
        "dinner", "lunch", "breakfast", "brunch", "dinnerideas", "easyrecipes",
        "mealprep", "snack", "snacks", "dessert", "restaurant", "restaurants",
        "eats", "foodreview", "mukbang", "costco", "aldi", "traderjoes",
        "boba", "ramen", "sushi", "pizza", "burger", "tacos", "bbq",
        "delicious", "yummy", "tasty", "italianfood", "streetfood",
        "foodlover", "foodblogger", "foodphotography", "foodstagram",
        "foodinspo", "foodreels", "homecooking", "homemade", "comfortfood",
        "fastfood", "takeout", "delivery", "mealideas", "healthyrecipes",
        "highprotein", "lowcalorie", "vegetarian", "vegan", "glutenfree",
        "dairyfree", "organic", "freshingredients", "seasoning", "spices",
        "sauce", "marinade", "grilled", "fried", "roasted", "airfryer",
        "slowcooker", "instantpot", "kitchen", "kitchenhacks", "bakingtips",
        "sourdough", "bread", "cookies", "brownies", "cake", "cupcakes",
        "icecream", "chocolate", "cheesecake", "pasta", "noodles", "dumplings",
        "pho", "koreanfood", "chinesefood", "japanesefood", "mexicanfood",
        "indianfood", "thaifood", "frenchfood", "seafood", "steak", "chicken",
        "wings", "fries", "foodchallenge", "tastetest", "foodhaul",
        "groceryhaul", "restaurantreview", "foodcritic", "foodfestival",
        "michelinstar", "buffet", "allyoucaneat",
    },
    "Music": {
        "music", "song", "songs", "singing", "singer", "cover", "songcover",
        "originalsong", "newmusic", "album", "concert", "concerts", "tour",
        "festival", "edm", "edc", "rave", "raving", "dj", "rapper", "rap",
        "hiphop", "kpop", "guitar", "piano", "drums", "producer", "lyrics",
        "spotify", "dance", "dancer", "dancecover", "choreography", "acoustic",
        "lovesong", "band", "musician", "suno", "musiclover", "musicvideo",
        "musicproducer", "musicproduction", "newrelease", "albumrelease",
        "playlist", "spotifyplaylist", "applemusic", "soundcloud",
        "youtubemusic", "musicstreaming", "pop", "rock", "indierock",
        "alternative", "metal", "heavymetal", "punk", "jazz", "blues",
        "country", "classical", "orchestra", "symphony", "soul", "rnb",
        "randb", "reggae", "afrobeats", "latinmusic", "reggaeton", "drill",
        "trap", "phonk", "housemusic", "technomusic", "trance", "dubstep",
        "dnb", "lofi", "indie", "undergroundrap", "freestyle", "cypher",
        "beatbox", "guitarsolo", "guitarist", "pianist", "drummer",
        "bassguitar", "saxophone", "violin", "synthesizer", "songwriting",
        "songwriter", "vocals", "vocalist", "remix", "mashup", "instrumental",
        "beats", "beatmaker", "mixtape", "vinyl", "recordplayer", "headphones",
        "livemusic", "livestream", "concertphotography", "backstage",
        "setlist", "encore", "moshpit", "crowdsurfing", "musicfestival",
        "coachella", "lollapalooza", "rollingloud", "billboard", "grammys",
        "musiccharts",
    },
    "Drama": {
        "dating", "relationship", "relationships", "relationshipgoals",
        "boyfriend", "girlfriend", "husband", "wife", "ex", "cheater",
        "cheating", "cheated", "breakup", "situationship", "couple", "couples",
        "storytime", "reddit", "redditstories", "aita", "drama", "tea",
        "exposed", "landlord", "tenant", "roommate", "coworker", "boss",
        "customerservice", "entitled", "accountability", "divorce", "wedding",
        "inlaws", "toxic", "gossip", "rumors", "beef", "controversy",
        "conflict", "argument", "fight", "confrontation", "revenge",
        "revengestory", "betrayal", "trustissues", "redflags", "greenflags",
        "gaslighting", "manipulation", "narcissist", "toxicrelationship",
        "lovetriangle", "friendzone", "friendship", "bestfriend",
        "bestfriends", "frienddrama", "familydrama", "familyissues",
        "motherinlaw", "fatherinlaw", "sisterinlaw", "brotherinlaw",
        "cheaterexposed", "caughtcheating", "infidelity", "affair", "secret",
        "confession", "confessions", "anonymous", "anonymousstory",
        "truthcomesout", "receipts", "screenshots", "textmessages", "dm",
        "exposedvideo", "callout", "cancelled", "cancelculture",
        "internetdrama", "influencerdrama", "celebritydrama", "tiktokdrama",
        "youtubedrama", "workplacedrama", "officedrama", "badboss",
        "badroommate", "nightmaretenant", "entitledparents", "karens",
        "customercomplaint", "customerfromhell", "weddingdrama", "bridezilla",
        "divorcestory", "custodybattle", "inheritance", "familysecret",
        "aitapost", "amiwrong", "amitheasshole", "whoiswrong",
        "storytimevideo", "redditconfessions", "relationshipadvice",
        "datingadvice", "breakupstory",
    },
    "Travel": {
        "travel", "traveling", "travelling", "traveler", "travelgram", "trip",
        "vacation", "holiday", "itinerary", "flight", "airport", "hotel",
        "resort", "backpacking", "roadtrip", "hike", "hiking", "outdoors",
        "nature", "camping", "beach", "island", "mountains", "nationalpark",
        "japan", "tokyo", "vietnam", "danang", "hawaii", "bali", "europe",
        "italy", "paris", "dolomites", "mexico", "thailand", "korea", "seoul",
        "wanderlust", "travelblogger", "travelphotography", "travelvlog",
        "travelguide", "travelinspiration", "explore", "adventure",
        "adventuretravel", "tourism", "tourist", "sightseeing", "citybreak",
        "weekendgetaway", "getaway", "staycation", "bucketlist", "destination",
        "destinations", "exploremore", "passport", "visa", "boardingpass",
        "layover", "airportlife", "airline", "businessclass", "firstclass",
        "economyclass", "flightdeal", "cheapflights", "travelhacks", "packing",
        "packinglist", "luggage", "suitcase", "carryon", "hostel", "airbnb",
        "booking", "cruise", "cruiseship", "allinclusive", "luxurytravel",
        "budgettravel", "solotravel", "solotrip", "grouptravel",
        "familyvacation", "honeymoon", "backpacker", "roadtripping", "vanlife",
        "scenicviews", "sunset", "sunrise", "waterfall", "nationalparks",
        "hikingtrails", "mountainviews", "scubadiving", "snorkeling",
        "surftrip", "skiresort", "snowboarding", "safari", "wildlife",
        "ecotourism", "asia", "africa", "northamerica", "southamerica",
        "australia", "newzealand", "canada", "usa", "london", "rome",
        "barcelona", "amsterdam", "switzerland", "greece", "santorini",
        "portugal", "lisbon", "dubai", "singapore", "hongkong", "taiwan",
        "indonesia", "philippines", "culturaltravel", "hiddengems",
        "travelcommunity",
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
        "trump", "biden", "immigration", "protest", "lawsuit", "court",
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
    """

    Every keyword rule that fired for one reel, as dicts with club, kind
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