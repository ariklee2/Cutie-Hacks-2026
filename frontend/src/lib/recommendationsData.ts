/**
 * Shape of data/<user>_recommendations.json, written by
 * features/recommender.py. Keep in sync with that script.
 */

export interface RecommendedReel {
  shortcode: string;
  url: string;
  creator: string;
  creator_name: string;
  caption: string;
  hashtags: string[];
  likes: number;
  views: number;
  /** The hashtag search that found it, e.g. "#bwfworldtour". */
  found_via: string | null;
  timestamp: string | null;
  score: number;
  similarity: number;
  /** Plain-language reason, e.g. "Shares #f1, #formula1 with reels you liked or watched". */
  why: string;
}

export interface RecommendedProfile {
  username: string;
  full_name: string;
  url: string;
  matching_reels: number;
  score: number;
  why: string;
}

export interface RecommendationsData {
  user: string;
  generated_at: string;
  based_on: {
    engaged_reels: number;
    saved: number;
    liked: number;
    long_watched: number;
    top_hashtags: { hashtag: string; weight: number }[];
    top_creators: { creator: string; weight: number }[];
  };
  apify: { reel_results: number; from_cache: boolean };
  reels: RecommendedReel[];
  profiles: RecommendedProfile[];
}
