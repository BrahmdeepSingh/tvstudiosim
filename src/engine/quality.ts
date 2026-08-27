import { Talent } from '../types';
import { clamp, randomFloat } from '../utils/random';

const WRITERS_ROOM_PRESTIGE = 80;
export { WRITERS_ROOM_PRESTIGE };

function showrunnerRaw(t: Talent): number {
  if (t.stats.role !== 'showrunner') return 0;
  return t.stats.writing * 0.50 + t.stats.creativity * 0.30 + t.stats.consistency * 0.20;
}

export function calculateScriptScore(showrunners: Talent[]): number {
  const primary = showrunners[0];
  if (!primary || primary.stats.role !== 'showrunner') return 50;

  const primaryRaw = showrunnerRaw(primary);
  const variance = randomFloat(-6, 6);

  if (showrunners.length === 1) {
    return clamp(Math.round(primaryRaw + variance), 0, 95);
  }

  // Writers room: additional showrunners each contribute 35% of their weighted stats
  const additionalBonus = showrunners.slice(1).reduce((sum, t) => sum + showrunnerRaw(t) * 0.35, 0);

  // Chemistry modifier: all same color → +8; any red paired with non-red → -10
  const colors = showrunners.map(t => t.chemistryColor);
  const allSame = colors.every(c => c === colors[0]);
  const hasRedClash = colors.includes('red') && colors.some(c => c !== 'red');
  const chemMod = allSame ? 8 : hasRedClash ? -10 : 0;

  return clamp(Math.round(primaryRaw + additionalBonus + chemMod + variance), 0, 135);
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