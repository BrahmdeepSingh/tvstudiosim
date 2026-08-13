import { Genre, TalentRole } from '../types';

type StudioTier = 'powerhouse' | 'established' | 'independent';

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

export const COMPETITOR_STUDIO_COUNT = 8;
export const MAX_COMPETITOR_ACTIVE_SHOWS = 2;
export const MAX_COMPETITOR_SHOWS_PER_YEAR = 2;
export const COMPETITOR_CANCEL_THRESHOLD = 4.5;

export const COMPETITOR_GREENLIGHT_CHANCES: Record<StudioTier, number> = {
  powerhouse:  0.12,
  established: 0.10,
  independent: 0.08,
};

export const COMPETITOR_PRODUCTION_COSTS: Record<StudioTier, number> = {
  powerhouse:  30_000_000,
  established: 15_000_000,
  independent:  8_000_000,
};

export interface CompetitorStudioConfig {
  name: string;
  tier: StudioTier;
  startingCapital: number;
  preferredGenres: Genre[];
  startingPrestige: number;
}

export const COMPETITOR_STUDIO_CONFIGS: CompetitorStudioConfig[] = [
  { name: 'Magic Castle Studios',   tier: 'powerhouse',    startingCapital: 65_000_000, preferredGenres: ['drama', 'limited-series'],  startingPrestige: 52 },
  { name: 'Globe Pictures',         tier: 'powerhouse',    startingCapital: 60_000_000, preferredGenres: ['drama', 'sci-fi'],           startingPrestige: 48 },
  { name: 'Shield Bros.',           tier: 'established',   startingCapital: 32_000_000, preferredGenres: ['comedy', 'drama'],           startingPrestige: 35 },
  { name: 'Eyeconic Network',       tier: 'established',   startingCapital: 28_000_000, preferredGenres: ['procedural', 'reality'],     startingPrestige: 30 },
  { name: 'LionClub Entertainment', tier: 'established',   startingCapital: 25_000_000, preferredGenres: ['sci-fi', 'limited-series'],  startingPrestige: 28 },
  { name: 'Ironwood TV',            tier: 'independent',   startingCapital: 14_000_000, preferredGenres: ['comedy', 'drama'],           startingPrestige: 18 },
  { name: 'Smooth House Pictures',  tier: 'independent',   startingCapital: 12_000_000, preferredGenres: ['reality', 'procedural'],     startingPrestige: 16 },
  { name: 'Green Grass Studios',    tier: 'independent',   startingCapital: 10_000_000, preferredGenres: ['drama', 'comedy'],           startingPrestige: 14 },
];

// ─── Streaming ────────────────────────────────────────────────────────────────

export const STREAMING_OFFER_MIN_RATING = 5.5;
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
    low:  [1_500_000,  3_000_000],
    mid:  [4_000_000,  8_000_000],
    high: [10_000_000, 20_000_000],
  },
  director: {
    low:  [1_000_000,  2_000_000],
    mid:  [3_000_000,  6_000_000],
    high: [7_000_000, 15_000_000],
  },
  actor: {
    low:  [2_000_000,  4_000_000],
    mid:  [5_000_000, 10_000_000],
    high: [12_000_000, 25_000_000],
  },
};

export const SUPPORTING_ACTOR_FEES = {
  low:  [1_000_000, 2_000_000],
  mid:  [2_500_000, 5_000_000],
  high: [6_000_000, 12_000_000],
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
    genreAffinities: [] as Genre[],
    prestigeRequired: 0,
  },
  {
    id: 'social-media',
    name: 'Social Media Campaign',
    cost: 800_000,
    reachMultiplier: 0.60,
    genreAffinities: ['comedy', 'reality'] as Genre[],
    prestigeRequired: 0,
  },
  {
    id: 'streaming-ads',
    name: 'Streaming Platform Ads',
    cost: 1_000_000,
    reachMultiplier: 0.65,
    genreAffinities: ['drama', 'sci-fi', 'limited-series'] as Genre[],
    prestigeRequired: 0,
  },
  {
    id: 'press-junket',
    name: 'Press Junket & Interviews',
    cost: 400_000,
    reachMultiplier: 0.35,
    genreAffinities: ['drama', 'limited-series'] as Genre[],
    prestigeRequired: 0,
  },
  {
    id: 'billboards',
    name: 'Billboards',
    cost: 500_000,
    reachMultiplier: 0.30,
    genreAffinities: [] as Genre[],
    prestigeRequired: 0,
  },
  {
    id: 'celebrity-deal',
    name: 'Celebrity Talent Deal',
    cost: 3_000_000,
    reachMultiplier: 1.10,
    genreAffinities: [] as Genre[],
    prestigeRequired: 61,
  },
  {
    id: 'international-push',
    name: 'International Distribution Push',
    cost: 5_000_000,
    reachMultiplier: 0.90,
    genreAffinities: [] as Genre[],
    prestigeRequired: 90,
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

export function getShowCapacity(prestige: number): number {
  if (prestige <= 20) return 2;
  if (prestige <= 40) return 3;
  return Infinity;
}

export const ACTIVE_SHOW_STATUSES = new Set([
  'writing', 'filming', 'marketing', 'airing', 'renewal-pending',
]);

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