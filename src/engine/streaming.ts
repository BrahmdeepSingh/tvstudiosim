import { Show, StreamingOffer } from '../types';
import {
  STREAMING_PLATFORMS,
  STREAMING_OFFER_MIN_RATING,
  STREAMING_OFFER_EXPIRY_WEEKS,
  WEEKS_PER_YEAR,
} from '../constants/game';
import { randomItem, randomBetween } from '../utils/random';
import { nanoid } from '../utils/nanoid';

const BASE_PER_EPISODE_VALUE = 800_000;

export function tryGenerateStreamingOffer(
  show: Show,
  currentWeek: number,
  currentYear: number,
): StreamingOffer | null {
  if (show.pendingStreamingOffer) return null;

  const completedSeasons = show.seasons.filter(s => s.episodesAired >= s.episodeCount);
  if (completedSeasons.length === 0) return null;

  // Active exclusive deal blocks new offers
  const hasActiveExclusive = show.streamingDeals.some(
    d => d.dealType === 'exclusive' && d.expiresYear >= currentYear,
  );
  if (hasActiveExclusive) return null;

  const allEpisodes = completedSeasons.flatMap(s => s.episodes.filter(e => e.rating !== null));
  if (allEpisodes.length === 0) return null;

  // Eligibility: use the latest season's avg rating so an improving show qualifies
  const lastSeasonEps = completedSeasons[completedSeasons.length - 1].episodes.filter(e => e.rating !== null);
  const latestAvgRating = lastSeasonEps.length > 0
    ? lastSeasonEps.reduce((sum, e) => sum + (e.rating ?? 0), 0) / lastSeasonEps.length
    : 0;
  if (latestAvgRating < STREAMING_OFFER_MIN_RATING) return null;

  // Use all-seasons average for the quality modifier (payout value)
  const avgRating = allEpisodes.reduce((sum, e) => sum + (e.rating ?? 0), 0) / allEpisodes.length;

  const totalEpisodes = completedSeasons.reduce((sum, s) => sum + s.episodeCount, 0);
  const seasonsToInclude = completedSeasons.map(s => s.seasonNumber);

  const qualityMod = avgRating >= 7.5 ? 1.5 : avgRating >= 6.0 ? 1.0 : 0.55;
  const bundleMod = 1 + 0.3 * (completedSeasons.length - 1);

  const lastSeason = completedSeasons[completedSeasons.length - 1];
  const yearsSinceAired = Math.max(0, currentYear - (lastSeason.airDateYear ?? currentYear));
  const freshnessMod = Math.max(0.3, 1 - yearsSinceAired * 0.15);

  const cancelPenalty = show.status === 'cancelled' && !show.cancelledClean ? 0.3 : 1.0;

  const platform = randomItem([...STREAMING_PLATFORMS]);
  const baseValue = totalEpisodes * BASE_PER_EPISODE_VALUE * qualityMod * bundleMod * freshnessMod * cancelPenalty * platform.rateMultiplier;

  const nonExclusiveAmount = Math.round(baseValue / 100_000) * 100_000;
  const exclusiveAmount = Math.round(baseValue * 1.4 / 100_000) * 100_000;

  const rawExpiry = currentWeek + STREAMING_OFFER_EXPIRY_WEEKS;
  const expiresWeek = rawExpiry > WEEKS_PER_YEAR ? rawExpiry - WEEKS_PER_YEAR : rawExpiry;
  const expiresYear = rawExpiry > WEEKS_PER_YEAR ? currentYear + 1 : currentYear;

  const durationYears = avgRating >= 8 ? 3 : avgRating >= 6.5 ? 2 : 1;

  return {
    id: nanoid(),
    platformName: platform.name,
    nonExclusiveAmount,
    exclusiveAmount,
    seasonsToInclude,
    expiresWeek,
    expiresYear,
    durationYears,
  };
}

export function scheduleNextOfferCheck(
  currentWeek: number,
  currentYear: number,
  delayMin: number,
  delayMax: number,
): { checkWeek: number; checkYear: number } {
  const delay = randomBetween(delayMin, delayMax);
  const raw = currentWeek + delay;
  return {
    checkWeek: raw > WEEKS_PER_YEAR ? raw - WEEKS_PER_YEAR : raw,
    checkYear: raw > WEEKS_PER_YEAR ? currentYear + 1 : currentYear,
  };
}
