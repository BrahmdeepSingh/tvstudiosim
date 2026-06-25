import { Season, Episode, Genre } from '../types';
import { GENRE_CONFIG, MARKETING_CHANNELS } from '../constants/game';
import { clamp, randomFloat } from '../utils/random';

export interface EpisodeResult {
  rating: number;
  viewers: number;
  adRevenue: number;
}

export function calculateEpisodeRating(
  season: Season,
  episodeNumber: number,
  genre: Genre,
  previousEpisodes: Episode[],
): EpisodeResult {
  const config = GENRE_CONFIG[genre];

  const baseRating = season.qualityScore / 10; // 0–10

  const marketingBoost = calculateMarketingBoost(season, episodeNumber, genre);

  const momentum = calculateMomentum(previousEpisodes);

  // Scale to genre ceiling
  const ceilingScale = config.ratingCeiling / 10;
  let rating = (baseRating + marketingBoost + momentum) * ceilingScale;

  // Variance
  rating += randomFloat(-0.4, 0.4);
  rating = clamp(Math.round(rating * 10) / 10, 1.0, 10.0);

  const viewers = Math.round(config.baseViewers * (rating / 5));
  const adRevenue = Math.round((viewers / 1000) * config.cpm);

  return { rating, viewers, adRevenue };
}

function calculateMarketingBoost(
  season: Season,
  episodeNumber: number,
  genre: Genre,
): number {
  if (season.marketingChannelIDs.length === 0) return 0;

  const purchased = MARKETING_CHANNELS.filter(c =>
    season.marketingChannelIDs.includes(c.id),
  );

  let boost = 0;
  for (const channel of purchased) {
    const hasAffinity =
      channel.genreAffinities.length === 0 ||
      (channel.genreAffinities as readonly string[]).includes(genre);
    const affinityMod = hasAffinity ? 1.2 : 0.8;
    boost += channel.reachMultiplier * affinityMod;
  }

  // Awareness decays as season progresses
  const decayFactor = Math.max(0.2, 1 - (episodeNumber - 1) * 0.08);
  return Math.min(1.5, boost * decayFactor);
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
