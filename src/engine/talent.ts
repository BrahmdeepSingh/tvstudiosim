import { Talent, TalentStats, ChemistryColor, TalentRole, Genre, EmmyCategory, LegacyCredit, LegacyAward } from '../types';
import { nanoid } from '../utils/nanoid';
import { randomBetween, randomItem, clamp } from '../utils/random';
import { STARTING_YEAR, TALENT_FEES } from '../constants/game';

const LEGACY_FEE_TIER: Record<'low' | 'mid' | 'high', 'd' | 'c' | 'a'> = { low: 'd', mid: 'c', high: 'a' };
import { MALE_AVATAR_IDS, FEMALE_AVATAR_IDS } from '../utils/avatars';

const CHEMISTRY_COLORS: ChemistryColor[] = ['green', 'blue', 'red'];

// ─── Name pools ───────────────────────────────────────────────────────────────

const MALE_FIRST_NAMES = [
  'James', 'David', 'Michael', 'Robert', 'Thomas', 'Kevin', 'Daniel', 'Marcus',
  'Eric', 'Brian', 'Jason', 'Nathan', 'Patrick', 'Derek', 'Aaron', 'Leon',
  'Owen', 'Victor', 'Adrian', 'Chris', 'Raymond', 'Curtis', 'Miles', 'Grant',
  'Elliot', 'Calvin', 'Brendan', 'Theo', 'Silas', 'Hugo',
];

const FEMALE_FIRST_NAMES = [
  'Maria', 'Sarah', 'Elena', 'Angela', 'Diana', 'Nicole', 'Rachel', 'Lauren',
  'Vanessa', 'Tara', 'Melissa', 'Dana', 'Olivia', 'Claire', 'Simone', 'Priya',
  'Cassandra', 'Nina', 'Sofia', 'Maya', 'Layla', 'Audrey', 'Camille', 'Iris',
  'Serena', 'Jade', 'Amara', 'Fiona', 'Nadia', 'Celeste',
];

const LAST_NAMES = [
  'Webb', 'Reeves', 'Torres', 'Nolan', 'Chen', 'Hayes', 'Park', 'Brennan',
  'Morales', 'Cross', 'Voss', 'Flynn', 'Shah', 'Kirby', 'Walsh', 'Crane',
  'Okafor', 'Steele', 'Monroe', 'Holt', 'Diaz', 'Mercer', 'Lane', 'Rhodes',
  'Sinclair', 'Patel', 'Graham', 'Moss', 'Burke', 'Adler', 'Yates', 'Kim',
];

function randomName(gender: 'male' | 'female'): string {
  const first = gender === 'male' ? randomItem(MALE_FIRST_NAMES) : randomItem(FEMALE_FIRST_NAMES);
  return `${first} ${randomItem(LAST_NAMES)}`;
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

// ─── Legacy career generation (pre-game backstory) ───────────────────────────

const LEGACY_GENRES: Genre[] = ['drama', 'comedy', 'sci-fi', 'procedural', 'reality', 'limited-series'];

const LEGACY_TITLE_ADJECTIVES = [
  'Borrowed', 'Crooked', 'Hollow', 'Silent', 'Northern', 'Last', 'Quiet',
  'Restless', 'Burning', 'Forgotten', 'Open', 'Bitter', 'Common', 'Wild',
];

const LEGACY_TITLE_NOUNS = [
  'Harbor', 'Static', 'Ledger', 'Frontier', 'Verdict', 'Echo', 'Crossing',
  'Signal', 'Ward', 'Reckoning', 'Hour', 'Pattern', 'Address', 'Current',
];

function randomLegacyTitle(): string {
  return `${randomItem(LEGACY_TITLE_ADJECTIVES)} ${randomItem(LEGACY_TITLE_NOUNS)}`;
}

function categoryForLegacyCredit(
  role: TalentRole,
  genre: Genre,
  gender: 'male' | 'female',
): EmmyCategory | null {
  if (role === 'showrunner') return 'best-writing';
  if (role === 'director') return 'best-director';
  // actor — reality has no acting Emmy in this game's model
  if (genre === 'reality') return null;
  if (genre === 'comedy') return gender === 'male' ? 'best-comedy-actor' : 'best-comedy-actress';
  return gender === 'male' ? 'best-drama-actor' : 'best-drama-actress';
}

function generateLegacyCareer(
  role: TalentRole,
  tier: 'low' | 'mid' | 'high',
  popularity: number,
  yearsActive: number,
  debutYear: number,
  gender: 'male' | 'female',
): { legacyCredits: LegacyCredit[]; legacyAwards: LegacyAward[]; priorCareerEarnings: number } {
  if (yearsActive <= 0) {
    return { legacyCredits: [], legacyAwards: [], priorCareerEarnings: 0 };
  }

  const maxCredits = Math.min(8, Math.ceil(yearsActive / 1.2));
  const numCredits = randomBetween(yearsActive >= 2 ? 1 : 0, Math.max(1, maxCredits));

  const legacyCredits: LegacyCredit[] = [];
  const legacyAwards: LegacyAward[] = [];

  const nominationChance = clamp(0.12 + popularity / 250, 0, 0.55);
  const winChanceGivenNom = clamp(0.25 + popularity / 400, 0, 0.6);

  for (let i = 0; i < numCredits; i++) {
    const genre = randomItem(LEGACY_GENRES);
    const year = debutYear === STARTING_YEAR - 1
      ? debutYear
      : randomBetween(debutYear, STARTING_YEAR - 1);

    legacyCredits.push({ title: randomLegacyTitle(), genre, year });

    const category = categoryForLegacyCredit(role, genre, gender);
    if (category && Math.random() < nominationChance) {
      const won = Math.random() < winChanceGivenNom;
      legacyAwards.push({ category, year, won });
    }
  }

  legacyCredits.sort((a, b) => a.year - b.year);

  const minFeeForTier = TALENT_FEES[role][LEGACY_FEE_TIER[tier]][0];
  const priorCareerEarnings = numCredits * minFeeForTier;

  return { legacyCredits, legacyAwards, priorCareerEarnings };
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
  gender: 'male' | 'female',
  avatarId: string,
): Talent {
  const stats: TalentStats =
    role === 'showrunner'
      ? makeShowrunnerStats(tier)
      : role === 'director'
      ? makeDirectorStats(tier)
      : makeActorStats(tier);

  const age = randomBetween(18, 71);
  const yearsActive = randomBetween(0, Math.max(0, age - 18));
  const debutYear = STARTING_YEAR - yearsActive;
  const popularity = popularityForTier(tier);

  const { legacyCredits, legacyAwards, priorCareerEarnings } =
    generateLegacyCareer(role, tier, popularity, yearsActive, debutYear, gender);

  return {
    id: nanoid(),
    name: randomName(gender),
    gender,
    avatarId,
    role,
    age,
    popularity,
    stats,
    chemistryColor: randomItem(CHEMISTRY_COLORS),
    available: true,
    bookedForSeasonID: null,
    bookedByCompetitorShowID: null,
    awards: [],
    careerShowIDs: [],
    prestigeRequired: prestigeRequiredForTier(tier),
    birthplace: randomBirthplace(),
    debutYear,
    quirk: randomQuirk(),
    legacyCredits,
    legacyAwards,
    priorCareerEarnings,
  };
}

// ─── Avatar pool helpers ──────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Initial Pool ─────────────────────────────────────────────────────────────

export function generateInitialTalentPool(): Talent[] {
  const pool: Talent[] = [];

  // Shuffle avatar pools once per game — guarantees no duplicates within a game,
  // random variety across games.
  const maleAvatars = shuffle([...MALE_AVATAR_IDS]);
  const femaleAvatars = shuffle([...FEMALE_AVATAR_IDS]);
  let maleIdx = 0;
  let femaleIdx = 0;

  function nextAvatar(gender: 'male' | 'female'): string {
    return gender === 'male' ? maleAvatars[maleIdx++] : femaleAvatars[femaleIdx++];
  }

  function make(role: TalentRole, tier: 'low' | 'mid' | 'high'): Talent {
    const gender: 'male' | 'female' = Math.random() < 0.5 ? 'male' : 'female';
    return makeTalent(role, tier, gender, nextAvatar(gender));
  }

  // Low tier (available from the start)
  for (let i = 0; i < 8; i++) pool.push(make('showrunner', 'low'));
  for (let i = 0; i < 8; i++) pool.push(make('director', 'low'));
  for (let i = 0; i < 26; i++) pool.push(make('actor', 'low'));

  // Mid tier (unlocked at prestige 21)
  for (let i = 0; i < 6; i++) pool.push(make('showrunner', 'mid'));
  for (let i = 0; i < 6; i++) pool.push(make('director', 'mid'));
  for (let i = 0; i < 16; i++) pool.push(make('actor', 'mid'));

  // High tier (unlocked at prestige 61)
  for (let i = 0; i < 4; i++) pool.push(make('showrunner', 'high'));
  for (let i = 0; i < 4; i++) pool.push(make('director', 'high'));
  for (let i = 0; i < 12; i++) pool.push(make('actor', 'high'));

  return pool;
}

export function getAvailableTalent(talent: Talent[]): Talent[] {
  return talent.filter(t => t.available);
}

export function getYearsActive(talent: Talent, currentYear: number): number {
  return Math.max(0, currentYear - talent.debutYear);
}

// ─── Replacement talent (retirements) ────────────────────────────────────────
// Generates a single fresh talent to replace a retiree. Age range is capped
// lower than the initial pool to represent genuinely new industry entrants.

export function generateReplacementTalent(
  role: TalentRole,
  tier: 'low' | 'mid' | 'high',
  existingTalent: Talent[],
  currentYear: number,
): Talent {
  const gender: 'male' | 'female' = Math.random() < 0.5 ? 'male' : 'female';

  // Prefer an avatar not already in the active pool
  const usedIds = new Set(existingTalent.map(t => t.avatarId));
  const pool = gender === 'male' ? MALE_AVATAR_IDS : FEMALE_AVATAR_IDS;
  const freePool = pool.filter(id => !usedIds.has(id));
  const avatarId = freePool.length > 0 ? randomItem(freePool) : randomItem(pool);

  const stats: TalentStats =
    role === 'showrunner' ? makeShowrunnerStats(tier)
    : role === 'director' ? makeDirectorStats(tier)
    : makeActorStats(tier);

  // Age range matches the global rule: 18–71 (72 triggers retirement)
  const age = randomBetween(18, 65);
  const yearsActive = randomBetween(0, Math.max(0, age - 18));
  const debutYear = currentYear - yearsActive;
  const popularity = popularityForTier(tier);

  const { legacyCredits, legacyAwards, priorCareerEarnings } =
    generateLegacyCareer(role, tier, popularity, yearsActive, debutYear, gender);

  return {
    id: nanoid(),
    name: randomName(gender),
    gender,
    avatarId,
    role,
    age,
    popularity,
    stats,
    chemistryColor: randomItem(CHEMISTRY_COLORS),
    available: true,
    bookedForSeasonID: null,
    bookedByCompetitorShowID: null,
    awards: [],
    careerShowIDs: [],
    prestigeRequired: prestigeRequiredForTier(tier),
    birthplace: randomBirthplace(),
    debutYear,
    quirk: randomQuirk(),
    legacyCredits,
    legacyAwards,
    priorCareerEarnings,
  };
}