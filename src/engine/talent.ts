import { Talent, TalentStats, ChemistryColor, TalentRole } from '../types';
import { nanoid } from '../utils/nanoid';
import { randomBetween, randomItem } from '../utils/random';
import { STARTING_YEAR } from '../constants/game';

const CHEMISTRY_COLORS: ChemistryColor[] = ['green', 'blue', 'red'];

// ─── Name pools ───────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  'James', 'Maria', 'David', 'Sarah', 'Michael', 'Elena', 'Robert', 'Angela',
  'Thomas', 'Diana', 'Kevin', 'Nicole', 'Daniel', 'Rachel', 'Marcus', 'Lauren',
  'Eric', 'Vanessa', 'Brian', 'Tara', 'Jason', 'Melissa', 'Chris', 'Dana',
  'Nathan', 'Olivia', 'Patrick', 'Claire', 'Derek', 'Simone', 'Aaron', 'Priya',
  'Leon', 'Cassandra', 'Owen', 'Nina', 'Victor', 'Sofia', 'Adrian', 'Maya',
];

const LAST_NAMES = [
  'Webb', 'Reeves', 'Torres', 'Nolan', 'Chen', 'Hayes', 'Park', 'Brennan',
  'Morales', 'Cross', 'Voss', 'Flynn', 'Shah', 'Kirby', 'Walsh', 'Crane',
  'Okafor', 'Steele', 'Monroe', 'Holt', 'Diaz', 'Mercer', 'Lane', 'Rhodes',
  'Sinclair', 'Patel', 'Graham', 'Moss', 'Burke', 'Adler', 'Yates', 'Kim',
];

function randomName(): string {
  return `${randomItem(FIRST_NAMES)} ${randomItem(LAST_NAMES)}`;
}

// ─── Flavor pools ─────────────────────────────────────────────────────────────

const BIRTHPLACES = [
  'Tulsa, OK', 'Portland, OR', 'Albuquerque, NM', 'Savannah, GA', 'Boise, ID',
  'Madison, WI', 'Richmond, VA', 'Spokane, WA', 'Tucson, AZ', 'Asheville, NC',
  'Baton Rouge, LA', 'Reno, NV', 'Akron, OH', 'Charleston, SC', 'Fresno, CA',
  'London, UK', 'Toronto, Canada', 'Dublin, Ireland', 'Melbourne, Australia',
  'Vancouver, Canada', 'Manchester, UK', 'Cape Town, South Africa',
  'Edinburgh, Scotland', 'Auckland, New Zealand', 'Montreal, Canada',
];

const QUIRKS = [
  'Refuses to read scripts past midnight.',
  'Brings a lucky coin to every table read.',
  'Insists on doing their own stunts whenever possible.',
  'Keeps a journal of every character they have played.',
  'Has never missed a call time in their career.',
  'Learned the entire cast and crew\'s names on day one, every job.',
  'Known for unforgettable wrap-party karaoke.',
  'Reads the trade papers cover to cover every morning.',
  'Collects vintage cameras from past productions.',
  'Always requests the same trailer number for good luck.',
  'Mentors younger talent on every set they join.',
  'Won\'t discuss a role until the contract is signed.',
  'Famous for memorizing the entire script, not just their lines.',
  'Travels with a small library of paperback novels.',
  'Has a pre-shoot ritual nobody fully understands.',
];

function randomBirthplace(): string {
  return randomItem(BIRTHPLACES);
}

function randomQuirk(): string {
  return randomItem(QUIRKS);
}

// ─── Stat generation by tier ──────────────────────────────────────────────────

function statInRange(low: number, high: number): number {
  return randomBetween(low, high);
}

function makeShowrunnerStats(tier: 'low' | 'mid' | 'high'): TalentStats {
  const ranges = {
    low:  { writing: [30, 55], creativity: [28, 52], consistency: [32, 56] },
    mid:  { writing: [55, 75], creativity: [52, 73], consistency: [56, 76] },
    high: { writing: [75, 95], creativity: [73, 93], consistency: [76, 96] },
  };
  const r = ranges[tier];
  return {
    role: 'showrunner',
    writing:     statInRange(r.writing[0], r.writing[1]),
    creativity:  statInRange(r.creativity[0], r.creativity[1]),
    consistency: statInRange(r.consistency[0], r.consistency[1]),
  };
}

function makeDirectorStats(tier: 'low' | 'mid' | 'high'): TalentStats {
  const ranges = {
    low:  { direction: [30, 55], vision: [28, 52], efficiency: [32, 56] },
    mid:  { direction: [55, 75], vision: [52, 73], efficiency: [56, 76] },
    high: { direction: [75, 95], vision: [73, 93], efficiency: [76, 96] },
  };
  const r = ranges[tier];
  return {
    role: 'director',
    direction:  statInRange(r.direction[0], r.direction[1]),
    vision:     statInRange(r.vision[0], r.vision[1]),
    efficiency: statInRange(r.efficiency[0], r.efficiency[1]),
  };
}

function makeActorStats(tier: 'low' | 'mid' | 'high'): TalentStats {
  const ranges = {
    low:  { acting: [30, 55], chemistry: [28, 55] },
    mid:  { acting: [55, 76], chemistry: [54, 76] },
    high: { acting: [76, 96], chemistry: [75, 96] },
  };
  const r = ranges[tier];
  return {
    role: 'actor',
    acting:    statInRange(r.acting[0], r.acting[1]),
    chemistry: statInRange(r.chemistry[0], r.chemistry[1]),
  };
}

function popularityForTier(tier: 'low' | 'mid' | 'high'): number {
  return tier === 'low'
    ? randomBetween(10, 35)
    : tier === 'mid'
    ? randomBetween(36, 68)
    : randomBetween(69, 95);
}

function prestigeRequiredForTier(tier: 'low' | 'mid' | 'high'): number {
  return tier === 'low' ? 0 : tier === 'mid' ? 21 : 61;
}

function makeTalent(
  role: TalentRole,
  tier: 'low' | 'mid' | 'high',
): Talent {
  const stats: TalentStats =
    role === 'showrunner'
      ? makeShowrunnerStats(tier)
      : role === 'director'
      ? makeDirectorStats(tier)
      : makeActorStats(tier);

  const age = randomBetween(28, 58);
  const yearsActive = randomBetween(1, Math.max(1, age - 24));

  return {
    id: nanoid(),
    name: randomName(),
    role,
    age,
    popularity: popularityForTier(tier),
    stats,
    chemistryColor: randomItem(CHEMISTRY_COLORS),
    available: true,
    bookedForSeasonID: null,
    bookedByCompetitorShowID: null,
    awards: [],
    careerShowIDs: [],
    prestigeRequired: prestigeRequiredForTier(tier),
    birthplace: randomBirthplace(),
    debutYear: STARTING_YEAR - yearsActive,
    quirk: randomQuirk(),
  };
}

// ─── Initial Pool ─────────────────────────────────────────────────────────────

export function generateInitialTalentPool(): Talent[] {
  const pool: Talent[] = [];

  // Low tier (available from the start)
  for (let i = 0; i < 6; i++) pool.push(makeTalent('showrunner', 'low'));
  for (let i = 0; i < 6; i++) pool.push(makeTalent('director', 'low'));
  for (let i = 0; i < 14; i++) pool.push(makeTalent('actor', 'low'));

  // Mid tier (unlocked at prestige 21)
  for (let i = 0; i < 5; i++) pool.push(makeTalent('showrunner', 'mid'));
  for (let i = 0; i < 5; i++) pool.push(makeTalent('director', 'mid'));
  for (let i = 0; i < 10; i++) pool.push(makeTalent('actor', 'mid'));

  // High tier (unlocked at prestige 61)
  for (let i = 0; i < 3; i++) pool.push(makeTalent('showrunner', 'high'));
  for (let i = 0; i < 3; i++) pool.push(makeTalent('director', 'high'));
  for (let i = 0; i < 6; i++) pool.push(makeTalent('actor', 'high'));

  return pool;
}

export function getAvailableTalent(talent: Talent[]): Talent[] {
  return talent.filter(t => t.available);
}

export function getYearsActive(talent: Talent, currentYear: number): number {
  return Math.max(1, currentYear - talent.debutYear);
}
