import { AmbientSocialPost } from './ambientsocial';
import { SocialReaction } from '../types';
import { nanoid } from '../utils/nanoid';
import { randomBetween } from '../utils/random';

// ─────────────────────────────────────────────────────────────────────────────
// Unlike ambientSocial.ts, these are NOT weekly dice rolls — each function
// here is called directly from the exact spot in the store/engine where the
// underlying event happens (setAirDate, renewShow, Emmy resolution), the same
// way makePremiereNews/makeFinaleNews already fire deterministically rather
// than being rolled for. A milestone the player caused should reliably get a
// reaction, not maybe-get one.
// ─────────────────────────────────────────────────────────────────────────────

const P = {
  stan: { username: 'unhinged tv stan', handle: '@watchingrn' },
  insider: { username: 'The Wrap Line', handle: '@thewrapline' },
  recapper: { username: 'TV Obsessed', handle: '@tvobsessed' },
  numbers: { username: 'PrimeTimeFeed', handle: '@primetimefeed' },
  meme: { username: 'tv memes daily', handle: '@tvmemesdaily' },
  parasocial: { username: 'ride or die', handle: '@notokaythough' },
} as const;

function make(week: number, year: number, r: SocialReaction, relatedShowTitle?: string): AmbientSocialPost {
  return { ...r, id: nanoid(), week, year, relatedShowTitle };
}

function pickN<T>(pool: T[], n: number): T[] {
  return [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(n, pool.length));
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PREMIERE DATE ANNOUNCED — fires the moment setAirDate() is called.
// ─────────────────────────────────────────────────────────────────────────────

type DateTemplate = (title: string, weeksOut: number) => SocialReaction;

const DATE_ANNOUNCED: DateTemplate[] = [
  (title) => ({ ...P.stan, content: `counting down the days until ${title} premieres, I NEED it`, likes: randomBetween(300, 1800), reposts: randomBetween(90, 550) }),
  (title) => ({ ...P.recapper, content: `${title} finally has a premiere date. mark your calendars people`, likes: randomBetween(200, 1200), reposts: randomBetween(60, 380) }),
  (title, weeksOut) => ({ ...P.numbers, content: `${weeksOut} week${weeksOut === 1 ? '' : 's'} until ${title}. the wait is almost over`, likes: randomBetween(150, 900), reposts: randomBetween(40, 280) }),
  (title) => ({ ...P.meme, content: `me setting a reminder the second ${title} announced its premiere date [alarm clock emoji]`, likes: randomBetween(250, 1400), reposts: randomBetween(70, 420) }),
  (title) => ({ ...P.insider, content: `${title} has locked in a date. Expect the marketing push to ramp up fast from here.`, likes: randomBetween(160, 850), reposts: randomBetween(45, 270) }),
];

export function generatePremiereDateAnnouncedPosts(
  showTitle: string,
  weeksOut: number,
  week: number,
  year: number,
): AmbientSocialPost[] {
  return pickN(DATE_ANNOUNCED, randomBetween(1, 2)).map(fn => make(week, year, fn(showTitle, weeksOut), showTitle));
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. RENEWAL — fires the moment renewShow() succeeds.
// ─────────────────────────────────────────────────────────────────────────────

type RenewalTemplate = (title: string, seasonNumber: number) => SocialReaction;

const RENEWAL: RenewalTemplate[] = [
  (title) => ({ ...P.stan, content: `${title} got RENEWED. we are so back`, likes: randomBetween(300, 1900), reposts: randomBetween(90, 580) }),
  (title, n) => ({ ...P.recapper, content: `${title} season ${n} confirmed. let's gooo`, likes: randomBetween(220, 1300), reposts: randomBetween(65, 400) }),
  (title) => ({ ...P.parasocial, content: `no cap ${title} deserved this renewal, so happy for this cast`, likes: randomBetween(250, 1500), reposts: randomBetween(70, 460) }),
  (title) => ({ ...P.numbers, content: `${title} renewal isn't a surprise given the numbers, but still good news for fans`, likes: randomBetween(150, 850), reposts: randomBetween(40, 270) }),
  (title, n) => ({ ...P.insider, content: `${title} picked up for season ${n}. The network clearly likes what they're seeing.`, likes: randomBetween(160, 900), reposts: randomBetween(45, 290) }),
];

export function generateRenewalPosts(
  showTitle: string,
  newSeasonNumber: number,
  week: number,
  year: number,
): AmbientSocialPost[] {
  return pickN(RENEWAL, randomBetween(1, 2)).map(fn => make(week, year, fn(showTitle, newSeasonNumber), showTitle));
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. EMMY NOMINATIONS — fires once per player-nominated show, alongside
//    makeEmmyNominationsNews.
// ─────────────────────────────────────────────────────────────────────────────

type EmmyTemplate = (title: string) => SocialReaction;

const EMMY_NOMINATION: EmmyTemplate[] = [
  (title) => ({ ...P.stan, content: `${title} just picked up an Emmy nomination and I am SCREAMING, so deserved`, likes: randomBetween(400, 2200), reposts: randomBetween(120, 650) }),
  (title) => ({ ...P.recapper, content: `Emmy nom for ${title}, finally some recognition for that cast and crew`, likes: randomBetween(300, 1600), reposts: randomBetween(90, 480) }),
  (title) => ({ ...P.insider, content: `${title} lands an Emmy nomination this morning. Not exactly a shock given the season it had.`, likes: randomBetween(200, 1100), reposts: randomBetween(55, 340) }),
  (title) => ({ ...P.numbers, content: `Emmy nominations dropped and ${title} is on the list. Well earned.`, likes: randomBetween(180, 1000), reposts: randomBetween(50, 310) }),
];

export function generateEmmyNominationPosts(
  nominatedShowTitles: string[],
  week: number,
  year: number,
): AmbientSocialPost[] {
  // One post per distinct nominated show, not one per individual nomination —
  // a show with 4 nominations doesn't need 4 near-identical tweets.
  const uniqueTitles = [...new Set(nominatedShowTitles)];
  return uniqueTitles.flatMap(title =>
    pickN(EMMY_NOMINATION, 1).map(fn => make(week, year, fn(title), title)),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. EMMY WINS — fires once per player-winning show, alongside
//    makeEmmyCeremonyNews.
// ─────────────────────────────────────────────────────────────────────────────

const EMMY_WIN: EmmyTemplate[] = [
  (title) => ({ ...P.stan, content: `${title} WON. I never doubted it for a second`, likes: randomBetween(500, 3000), reposts: randomBetween(150, 900) }),
  (title) => ({ ...P.parasocial, content: `crying actual tears, ${title} just won an Emmy and this cast deserves every bit of it`, likes: randomBetween(450, 2600), reposts: randomBetween(130, 800) }),
  (title) => ({ ...P.recapper, content: `Emmy win for ${title}. what a night for this show.`, likes: randomBetween(350, 1900), reposts: randomBetween(100, 580) }),
  (title) => ({ ...P.insider, content: `${title} takes home the win. Expect this to matter a lot for next season's negotiations.`, likes: randomBetween(220, 1200), reposts: randomBetween(60, 360) }),
  (title) => ({ ...P.numbers, content: `${title} winning tonight is going to be great for the show's numbers going forward.`, likes: randomBetween(200, 1100), reposts: randomBetween(55, 340) }),
];

export function generateEmmyWinPosts(
  winningShowTitles: string[],
  week: number,
  year: number,
): AmbientSocialPost[] {
  const uniqueTitles = [...new Set(winningShowTitles)];
  return uniqueTitles.flatMap(title =>
    pickN(EMMY_WIN, 1).map(fn => make(week, year, fn(title), title)),
  );
}