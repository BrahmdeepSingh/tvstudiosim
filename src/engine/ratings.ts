import { Season, Episode, Genre } from '../types';
import { GENRE_CONFIG, MARKETING_CHANNELS } from '../constants/game';
import { clamp, randomFloat } from '../utils/random';

export interface EpisodeResult {
  rating: number;
  viewers: number;
  adRevenue: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Season decay: each genre has a sweet-spot window where the ceiling is fully
// available. Past that window, the ceiling compresses gradually. The player
// fights this through shorter seasons (episode count) and final-season bonus.
//
// Index 0 = season 1. Last entry applies to all seasons beyond the array length.
// ─────────────────────────────────────────────────────────────────────────────

const DECAY_TABLE: Record<Genre, number[]> = {
  'drama':          [1.00, 1.00, 1.00, 0.95, 0.88, 0.80, 0.72, 0.64, 0.58],
  'procedural':     [1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 0.97, 0.93],
  'comedy':         [1.00, 1.00, 1.00, 1.00, 0.97, 0.92, 0.86, 0.80, 0.74],
  'sci-fi':         [1.00, 1.00, 1.00, 1.00, 0.97, 0.92, 0.85, 0.78, 0.72],
  'limited-series': [1.00, 0.82, 0.68, 0.55, 0.44, 0.35, 0.28, 0.22, 0.18],
  'reality':        [1.00, 1.00, 0.90, 0.80, 0.70, 0.62, 0.55, 0.49, 0.44],
};

// Episode count micro-modifier: shorter seasons age the show slightly slower.
// Baseline is 10 episodes; ±0.01 per episode away from baseline, capped at ±0.02.
function episodeCountModifier(episodeCount: number): number {
  const delta = 10 - episodeCount; // positive when fewer than 10
  return Math.max(-0.02, Math.min(0.02, delta * 0.01));
}

export function getSeasonDecayMultiplier(genre: Genre, seasonNumber: number, episodeCount: number): number {
  const table = DECAY_TABLE[genre];
  const idx = Math.max(0, seasonNumber - 1);
  const base = table[Math.min(idx, table.length - 1)];
  return Math.max(0.15, base + episodeCountModifier(episodeCount));
}

export function calculateEpisodeRating(
  season: Season,
  episodeNumber: number,
  genre: Genre,
  previousEpisodes: Episode[],
): EpisodeResult {
  const config = GENRE_CONFIG[genre];

  // Combined quality: script (writing phase) + production (filming phase)
  const combinedQuality =
    season.scriptScore > 0
      ? season.scriptScore * 0.45 + season.qualityScore * 0.55
      : season.qualityScore;

  // Decay compresses the ceiling over seasons; final season partially offsets it
  const decayMultiplier = getSeasonDecayMultiplier(genre, season.seasonNumber, season.episodeCount);
  const finalBonus = season.isFinalSeason ? 0.08 : 0;
  const effectiveCeiling = config.ratingCeiling * Math.min(1.0, decayMultiplier + finalBonus);

  const baseRating = (combinedQuality / 100) * effectiveCeiling;

  const momentum = calculateMomentum(previousEpisodes);

  let rating = baseRating + momentum + randomFloat(-0.4, 0.4);
  rating = clamp(Math.round(rating * 10) / 10, 1.0, 10.0);

  // Marketing drives audience reach, not rating quality
  const marketingReach = calculateMarketingReach(season, episodeNumber, genre);

  // Organic word-of-mouth scales super-linearly with quality
  const organicBuzz = Math.pow(rating / 5.0, 1.3);

  const viewers = Math.round(config.baseViewers * marketingReach * organicBuzz);

  // Higher-rated shows command premium ad rates
  const effectiveCPM = config.cpm * (1 + (rating - 5) / 10);
  const adRevenue = Math.round((viewers / 1000) * effectiveCPM);

  return { rating, viewers, adRevenue };
}

function calculateMarketingReach(
  season: Season,
  episodeNumber: number,
  genre: Genre,
): number {
  if (season.marketingChannelIDs.length === 0) return 1.0;

  const purchased = MARKETING_CHANNELS.filter(c =>
    season.marketingChannelIDs.includes(c.id),
  );

  let boost = 0;
  for (const channel of purchased) {
    const hasAffinity =
      channel.genreAffinities.length === 0 ||
      (channel.genreAffinities as readonly string[]).includes(genre);
    const affinityMod = hasAffinity ? 1.2 : 0.8;
    const decay = getChannelDecay(channel.id, episodeNumber);
    boost += channel.reachMultiplier * affinityMod * decay;
  }

  return Math.min(2.2, 1.0 + boost);
}

function getChannelDecay(channelId: string, episodeNumber: number): number {
  const ep = episodeNumber - 1; // 0-indexed
  switch (channelId) {
    case 'tv-commercials':
      return Math.max(0.3, 1 - ep * 0.06);       // steady, slow decay
    case 'social-media':
      return Math.max(0.05, 1 - ep * 0.18);       // big spike early, drops fast
    case 'streaming-ads':
      return Math.max(0.2, 1 - ep * 0.07);        // moderate gradual decay
    case 'press-junket':
      return Math.min(1.2, 0.3 + ep * 0.1);       // builds throughout season
    case 'billboards':
      return 1.0;                                   // constant, no decay
    case 'celebrity-deal':
      return Math.max(0.05, 1 - ep * 0.22);         // huge premiere spike, craters fastest
    case 'international-push':
      return 1.0;                                    // flat constant — overseas audiences don't decay
    default:
      return Math.max(0.2, 1 - ep * 0.08);
  }
}

function calculateMomentum(previousEpisodes: Episode[]): number {
  const aired = previousEpisodes.filter(ep => ep.rating !== null);
  if (aired.length < 2) return 0;

  const last2 = aired.slice(-2);
  const avg = last2.reduce((sum, ep) => sum + (ep.rating ?? 0), 0) / last2.length;
  return (avg / 10) * 0.15; // up to +0.15 boost
}

export function getSeasonAverageRating(season: Season): number {
  const aired = season.episodes.filter(ep => ep.rating !== null);
  if (aired.length === 0) return 0;
  return (
    Math.round(
      (aired.reduce((sum, ep) => sum + (ep.rating ?? 0), 0) / aired.length) * 10,
    ) / 10
  );
}