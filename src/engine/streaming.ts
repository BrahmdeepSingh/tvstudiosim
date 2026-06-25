import { Show, Season } from '../types';
import {
  STREAMING_PLATFORMS,
  STREAMING_OFFER_MIN_RATING,
  STREAMING_OFFER_EXPIRY_WEEKS,
  WEEKS_PER_YEAR,
} from '../constants/game';
import { randomItem } from '../utils/random';
import { getSeasonAverageRating } from './ratings';

export interface StreamingOffer {
  platformName: string;
  amount: number;
  expiresWeek: number;
  expiresYear: number;
}

export function generateStreamingOffer(
  show: Show,
  season: Season,
  networkPrestige: number,
  totalEmmyWins: number,
  currentWeek: number,
  currentYear: number,
): StreamingOffer | null {
  if (season.streamingOfferReceived) return null;
  if (season.episodesAired < season.episodeCount) return null; // must be complete

  const avgRating = getSeasonAverageRating(season);
  if (avgRating < STREAMING_OFFER_MIN_RATING) return null;

  const platform = randomItem([...STREAMING_PLATFORMS]);

  // Base: total viewers across season × platform multiplier
  const baseAmount = season.totalViewers * platform.rateMultiplier;

  const prestigeMod = 1 + networkPrestige / 200; // up to 1.5×
  const emmyMod = 1 + totalEmmyWins * 0.05;      // +5% per win

  const amount = Math.round((baseAmount * prestigeMod * emmyMod) / 100_000) * 100_000;

  const rawExpiry = currentWeek + STREAMING_OFFER_EXPIRY_WEEKS;
  const expiresWeek = rawExpiry > WEEKS_PER_YEAR ? rawExpiry - WEEKS_PER_YEAR : rawExpiry;
  const expiresYear = rawExpiry > WEEKS_PER_YEAR ? currentYear + 1 : currentYear;

  return { platformName: platform.name, amount, expiresWeek, expiresYear };
}
