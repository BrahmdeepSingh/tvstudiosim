import { Pitch, Talent, Genre, Tone } from '../types';
import {
  MIN_EPISODES,
  MAX_EPISODES,
  TALENT_FEES,
  PITCH_EXPIRY_WEEKS,
  WEEKS_PER_YEAR,
} from '../constants/game';
import { nanoid } from '../utils/nanoid';
import { randomBetween, randomItem, randomFloat, roundToNearest } from '../utils/random';

const GENRES: Genre[] = ['drama', 'comedy', 'sci-fi', 'procedural', 'reality', 'limited-series'];
const TONES: Tone[] = ['prestige', 'mainstream', 'experimental', 'procedural'];

const TITLES: Record<Genre, string[]> = {
  drama:            ['The Hollow Hours', 'Salt & Smoke', 'The Weight of Proof', 'River Deep', 'The Last Signal', 'Without Witness'],
  comedy:           ['Crash Landing', 'The Soft Pitch', 'Almost Right', 'The Back Nine', 'Damage Control', 'Reasonable People'],
  'sci-fi':         ['Signal Lost', 'The Outer Drift', 'Memory Protocol', 'Phase Shift', 'Dark Frequency', 'Cascade'],
  procedural:       ['By the Book', 'Clean Slate', 'The Long Game', 'Ground Truth', 'First Response', 'Hard Line'],
  reality:          ['The Full Story', 'Raw Footage', 'The Real Deal', 'Behind the Line', 'No Script', 'Open Floor'],
  'limited-series': ['Seven Weeks', 'The Incident', 'Point of Origin', 'The Long Goodbye', 'Last Contact', 'Aftermath'],
};

const LOGLINES: Record<Genre, string[]> = {
  drama: [
    'A disgraced attorney rebuilds her life in a small coastal town where everyone has something to hide.',
    'Two estranged siblings inherit their father\'s failing newspaper and uncover a decades-old conspiracy.',
    'A veteran detective returns to the city she fled and finds the case that drove her out has never been closed.',
  ],
  comedy: [
    'A mid-career chef abandons a Michelin-starred restaurant to open a food truck — nothing goes as planned.',
    'Three friends try to launch a podcast while holding down jobs, families, and increasingly complicated lives.',
    'A family of professional mediators is somehow incapable of resolving anything within their own household.',
  ],
  'sci-fi': [
    'The last crew of a decommissioned space station receives a transmission that shouldn\'t be possible.',
    'A city planner discovers the urban grid she designed is slowly becoming sentient.',
    'After a corporate blackout event, one engineer holds the only copy of what really happened.',
  ],
  procedural: [
    'A forensic accountant and a homicide detective team up — financial crimes keep turning into murder scenes.',
    'The overnight shift at a major metropolitan hospital, where every case is a story and nothing is routine.',
    'A cold-case unit in a small city reopens files that the original investigators actively want to stay closed.',
  ],
  reality: [
    'Twenty emerging chefs compete to become the creative director of a new restaurant empire.',
    'Amateur home designers transform abandoned properties in a rust-belt city with a $50K budget.',
    'Ten strangers are dropped in a remote location with nothing but a concept and three weeks to build a business.',
  ],
  'limited-series': [
    'The true story of a whistleblower who changed an entire industry — told from four conflicting perspectives.',
    'Over twelve weeks, a family grapples with the aftermath of an event none of them are allowed to discuss publicly.',
    'A tech founder\'s rise and collapse, reconstructed through documents, depositions, and the people who stayed.',
  ],
};

export function generatePitch(
  availableShowrunners: Talent[],
  currentWeek: number,
  currentYear: number,
): Pitch | null {
  if (availableShowrunners.length === 0) return null;

  const showrunner = randomItem(availableShowrunners);
  const genre = randomItem(GENRES);
  const tone = randomItem(TONES);

  // Hidden quality influenced by showrunner stats + variance
  let baseQuality = 50;
  if (showrunner.stats.role === 'showrunner') {
    baseQuality =
      showrunner.stats.writing * 0.5 + showrunner.stats.creativity * 0.5;
  }
  const hiddenQualityScore = Math.round(
    Math.max(10, Math.min(95, baseQuality + randomFloat(-12, 12))),
  );

  const feeRange =
    showrunner.popularity < 40
      ? TALENT_FEES.showrunner.low
      : showrunner.popularity < 70
      ? TALENT_FEES.showrunner.mid
      : TALENT_FEES.showrunner.high;

  const askingFlatFee = roundToNearest(
    randomBetween(feeRange[0], feeRange[1]),
    50_000,
  );
  const askingRevenueSharePercent =
    Math.random() < 0.4 ? randomBetween(1, 5) : 0;

  const rawExpiry = currentWeek + PITCH_EXPIRY_WEEKS;
  const expiresWeek = rawExpiry > WEEKS_PER_YEAR ? rawExpiry - WEEKS_PER_YEAR : rawExpiry;
  const expiresYear = rawExpiry > WEEKS_PER_YEAR ? currentYear + 1 : currentYear;

  return {
    id: nanoid(),
    title: randomItem(TITLES[genre]),
    genre,
    tone,
    logline: randomItem(LOGLINES[genre]),
    showrunnerID: showrunner.id,
    askingFlatFee,
    askingRevenueSharePercent,
    proposedEpisodeCount: randomBetween(MIN_EPISODES, MAX_EPISODES),
    submittedWeek: currentWeek,
    submittedYear: currentYear,
    hiddenQualityScore,
    greenlitByPlayer: false,
    passed: false,
    expiresWeek,
    expiresYear,
  };
}
