import { Talent } from '../types';
import { clamp, randomFloat } from '../utils/random';

export function calculateQualityScore(
  showrunner: Talent,
  director: Talent,
  cast: Talent[],
): number {
  if (showrunner.stats.role !== 'showrunner') return 50;
  if (director.stats.role !== 'director') return 50;

  const actors = cast.filter(t => t.stats.role === 'actor');

  const avgActing =
    actors.length > 0
      ? actors.reduce((sum, a) => sum + (a.stats.role === 'actor' ? a.stats.acting : 0), 0) /
        actors.length
      : 50;

  const chemistryBonus = calculateChemistryBonus(actors);

  const raw =
    showrunner.stats.writing    * 0.30 +
    showrunner.stats.creativity * 0.15 +
    director.stats.direction    * 0.20 +
    director.stats.vision       * 0.10 +
    avgActing                   * 0.15 +
    chemistryBonus              * 0.10;

  const variance = randomFloat(-8, 8);
  return clamp(Math.round(raw + variance), 0, 100);
}

function calculateChemistryBonus(actors: Talent[]): number {
  if (actors.length < 2) return 50;

  let matchCount = 0;
  let totalPairs = 0;

  for (let i = 0; i < actors.length; i++) {
    for (let j = i + 1; j < actors.length; j++) {
      totalPairs++;
      if (actors[i].chemistryColor === actors[j].chemistryColor) {
        matchCount++;
      }
    }
  }

  const matchRatio = totalPairs > 0 ? matchCount / totalPairs : 0;
  // Same color = up to 100 (max boost), no matches = 50 (neutral)
  return 50 + matchRatio * 50;
}
