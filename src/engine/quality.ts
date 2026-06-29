import { Talent } from '../types';
import { clamp, randomFloat } from '../utils/random';

export function calculateScriptScore(showrunner: Talent): number {
  if (showrunner.stats.role !== 'showrunner') return 50;
  const raw =
    showrunner.stats.writing     * 0.50 +
    showrunner.stats.creativity  * 0.30 +
    showrunner.stats.consistency * 0.20;
  const variance = randomFloat(-6, 6);
  return clamp(Math.round(raw + variance), 0, 100);
}

export function calculateQualityScore(
  director: Talent,
  cast: Talent[],
): number {
  if (director.stats.role !== 'director') return 50;

  const actors = cast.filter(t => t.stats.role === 'actor');

  const avgActing =
    actors.length > 0
      ? actors.reduce((sum, a) => sum + (a.stats.role === 'actor' ? a.stats.acting : 0), 0) /
        actors.length
      : 50;

  const chemistryBonus = calculateChemistryBonus(actors);

  const raw =
    director.stats.direction * 0.35 +
    director.stats.vision    * 0.20 +
    avgActing                * 0.25 +
    chemistryBonus           * 0.20;

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
  return 50 + matchRatio * 50;
}
