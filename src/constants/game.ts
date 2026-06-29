import { Genre, TalentRole } from '../types';

// ─── Timing ───────────────────────────────────────────────────────────────────

export const WEEKS_PER_YEAR = 52;
export const WRITING_WEEKS = 3;
export const FILMING_WEEKS = 4;
export const MIN_EPISODES = 8;
export const MAX_EPISODES = 12;
export const EMMY_NOMINATION_WEEK = 40;
export const EMMY_CEREMONY_WEEK = 44;

// ─── Starting State ───────────────────────────────────────────────────────────

export const STARTING_CASH = 15_000_000;
export const STARTING_PRESTIGE = 10;
export const STARTING_WEEK = 1;
export const STARTING_YEAR = 1;

// ─── Competitors ──────────────────────────────────────────────────────────────

export const COMPETITOR_STUDIO_COUNT = 5;
export const MAX_COMPETITOR_ACTIVE_SHOWS = 3;
export const COMPETITOR_CANCEL_THRESHOLD = 4.5;
export const COMPETITOR_GREENLIGHT_CHANCE = 0.08; // per week

export const COMPETITOR_NAMES = [
  'Pinnacle TV',
  'Meridian Studios',
  'Harbor Network',
  'Solstice Entertainment',
  'Ironwood Pictures',
];

// ─── Streaming ────────────────────────────────────────────────────────────────

export const STREAMING_OFFER_MIN_RATING = 6.5;
export const STREAMING_OFFER_EXPIRY_WEEKS = 4;

export const STREAMING_PLATFORMS = [
  { id: 'streamflix', name: 'Streamflix', rateMultiplier: 1.2 },
  { id: 'apex-plus', name: 'Apex+', rateMultiplier: 1.0 },
  { id: 'primewatch', name: 'Primewatch', rateMultiplier: 0.9 },
  { id: 'skyvault', name: 'SkyVault', rateMultiplier: 0.85 },
] as const;

// ─── Pitches ──────────────────────────────────────────────────────────────────

export const PITCH_EXPIRY_WEEKS = 8;
export const MAX_PITCHES_PER_YEAR = 4;
export const PITCH_GENERATE_CHANCE = 0.08; // per week

// ─── Talent Fee Ranges (per season flat fee) ──────────────────────────────────

export const TALENT_FEES: Record<TalentRole, {
  low: [number, number];
  mid: [number, number];
  high: [number, number];
}> = {
  showrunner: {
    low:  [300_000,   600_000],
    mid:  [700_000, 1_400_000],
    high: [1_500_000, 3_000_000],
  },
  director: {
    low:  [200_000,   400_000],
    mid:  [500_000, 1_000_000],
    high: [1_100_000, 2_000_000],
  },
  actor: {
    low:  [400_000,   800_000],
    mid:  [900_000, 1_800_000],
    high: [2_000_000, 4_000_000],
  },
};

export const SUPPORTING_ACTOR_FEES = {
  low:  [150_000,   350_000],
  mid:  [400_000,   800_000],
  high: [900_000, 1_500_000],
} as const;

// ─── Genre Config ─────────────────────────────────────────────────────────────

export const GENRE_CONFIG: Record<Genre, {
  ratingCeiling: number;
  baseViewers: number;
  cpm: number; // in-game CPM, tuned for financial balance (not realistic)
  emmySeriesCategory: string | null;
  emmyActorCategories: string[];
}> = {
  drama: {
    ratingCeiling: 9.5,
    baseViewers: 2_000_000,
    cpm: 600,
    emmySeriesCategory: 'best-drama-series',
    emmyActorCategories: ['best-drama-actor', 'best-drama-actress'],
  },
  comedy: {
    ratingCeiling: 8.0,
    baseViewers: 2_500_000,
    cpm: 450,
    emmySeriesCategory: 'best-comedy-series',
    emmyActorCategories: ['best-comedy-actor', 'best-comedy-actress'],
  },
  'sci-fi': {
    ratingCeiling: 9.0,
    baseViewers: 1_800_000,
    cpm: 550,
    emmySeriesCategory: 'best-drama-series',
    emmyActorCategories: ['best-drama-actor', 'best-drama-actress'],
  },
  procedural: {
    ratingCeiling: 7.5,
    baseViewers: 3_500_000,
    cpm: 300,
    emmySeriesCategory: 'best-drama-series',
    emmyActorCategories: ['best-drama-actor', 'best-drama-actress'],
  },
  reality: {
    ratingCeiling: 6.5,
    baseViewers: 4_000_000,
    cpm: 150,
    emmySeriesCategory: null,
    emmyActorCategories: [],
  },
  'limited-series': {
    ratingCeiling: 10.0,
    baseViewers: 1_500_000,
    cpm: 900,
    emmySeriesCategory: 'best-limited-series',
    emmyActorCategories: ['best-drama-actor', 'best-drama-actress'],
  },
};

// ─── Marketing Channels ───────────────────────────────────────────────────────

export const MARKETING_CHANNELS = [
  {
    id: 'tv-commercials',
    name: 'TV Commercials',
    cost: 1_500_000,
    reachMultiplier: 0.80,
    genreAffinities: [] as Genre[], // works for all
  },
  {
    id: 'social-media',
    name: 'Social Media Campaign',
    cost: 800_000,
    reachMultiplier: 0.60,
    genreAffinities: ['comedy', 'reality'] as Genre[],
  },
  {
    id: 'streaming-ads',
    name: 'Streaming Platform Ads',
    cost: 1_000_000,
    reachMultiplier: 0.65,
    genreAffinities: ['drama', 'sci-fi', 'limited-series'] as Genre[],
  },
  {
    id: 'press-junket',
    name: 'Press Junket & Interviews',
    cost: 400_000,
    reachMultiplier: 0.35,
    genreAffinities: ['drama', 'limited-series'] as Genre[],
  },
  {
    id: 'billboards',
    name: 'Billboards',
    cost: 500_000,
    reachMultiplier: 0.30,
    genreAffinities: [] as Genre[],
  },
] as const;

// ─── Prestige Tiers ───────────────────────────────────────────────────────────

export const PRESTIGE_TIERS = [
  { label: 'Indie',       min: 0,  max: 20  },
  { label: 'Mid-Tier',    min: 21, max: 40  },
  { label: 'Established', min: 41, max: 60  },
  { label: 'Major',       min: 61, max: 80  },
  { label: 'Elite',       min: 81, max: 100 },
] as const;

export function getPrestigeTierLabel(prestige: number): string {
  for (const tier of PRESTIGE_TIERS) {
    if (prestige >= tier.min && prestige <= tier.max) return tier.label;
  }
  return 'Indie';
}

// ─── Emmy Categories ──────────────────────────────────────────────────────────

export const EMMY_CATEGORIES = [
  'best-drama-series',
  'best-comedy-series',
  'best-limited-series',
  'best-drama-actor',
  'best-drama-actress',
  'best-comedy-actor',
  'best-comedy-actress',
  'best-director',
  'best-writing',
] as const;

export const EMMY_CATEGORY_LABELS: Record<string, string> = {
  'best-drama-series':    'Best Drama Series',
  'best-comedy-series':   'Best Comedy Series',
  'best-limited-series':  'Best Limited Series',
  'best-drama-actor':     'Best Actor — Drama',
  'best-drama-actress':   'Best Actress — Drama',
  'best-comedy-actor':    'Best Actor — Comedy',
  'best-comedy-actress':  'Best Actress — Comedy',
  'best-director':        'Best Director',
  'best-writing':         'Best Writing',
};
