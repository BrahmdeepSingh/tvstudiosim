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
//    Three buckets keyed to the completed season's average rating:
//      strong  ≥ 7.5  — deserved it, the numbers backed it up
//      decent  6.0–7.4 — solid enough, network saw a path forward
//      weak    < 6.0  — renewed despite soft numbers, some skepticism
// ─────────────────────────────────────────────────────────────────────────────

type RenewalTemplate = (title: string, seasonNumber: number) => SocialReaction;

const RENEWAL_STRONG: RenewalTemplate[] = [
  (title) => ({ ...P.stan, content: `${title} got RENEWED. honestly would've rioted if they didn't`, likes: randomBetween(500, 2500), reposts: randomBetween(150, 750) }),
  (title, n) => ({ ...P.recapper, content: `${title} season ${n} confirmed. after the season it just had? absolutely had to happen`, likes: randomBetween(350, 1800), reposts: randomBetween(100, 540) }),
  (title) => ({ ...P.parasocial, content: `${title} renewed and I genuinely teared up a little. this show earned every bit of it`, likes: randomBetween(400, 2200), reposts: randomBetween(120, 660) }),
  (title) => ({ ...P.numbers, content: `${title} renewal is a formality at this point. the numbers never really gave the network a choice`, likes: randomBetween(250, 1400), reposts: randomBetween(70, 420) }),
  (title, n) => ({ ...P.insider, content: `${title} picked up for season ${n}. this was locked before the finale even aired.`, likes: randomBetween(220, 1200), reposts: randomBetween(60, 360) }),
  (title) => ({ ...P.meme, content: `${title} renewed and the haters have gone quiet real fast`, likes: randomBetween(350, 1900), reposts: randomBetween(100, 580) }),
];

const RENEWAL_DECENT: RenewalTemplate[] = [
  (title) => ({ ...P.stan, content: `${title} got RENEWED. we are so back`, likes: randomBetween(300, 1600), reposts: randomBetween(90, 490) }),
  (title, n) => ({ ...P.recapper, content: `${title} season ${n} confirmed. solid enough season to justify it`, likes: randomBetween(200, 1100), reposts: randomBetween(55, 340) }),
  (title) => ({ ...P.parasocial, content: `no cap ${title} deserved this renewal, so happy for this cast`, likes: randomBetween(220, 1300), reposts: randomBetween(65, 400) }),
  (title) => ({ ...P.numbers, content: `${title} renewal isn't a surprise given the numbers, but still good news for fans`, likes: randomBetween(150, 850), reposts: randomBetween(40, 270) }),
  (title, n) => ({ ...P.insider, content: `${title} picked up for season ${n}. The network clearly sees a path forward with this one.`, likes: randomBetween(160, 900), reposts: randomBetween(45, 290) }),
  (title) => ({ ...P.meme, content: `${title} renewed. not shocked, the show's been doing its thing`, likes: randomBetween(180, 950), reposts: randomBetween(50, 290) }),
];

const RENEWAL_WEAK: RenewalTemplate[] = [
  (title) => ({ ...P.stan, content: `${title} renewed?? okay I'll take it, still want more`, likes: randomBetween(150, 800), reposts: randomBetween(40, 240) }),
  (title, n) => ({ ...P.recapper, content: `${title} season ${n} is happening. interesting call given how the last season landed`, likes: randomBetween(130, 700), reposts: randomBetween(35, 210) }),
  (title) => ({ ...P.numbers, content: `${title} renewed despite the soft numbers. the network must see something we're not`, likes: randomBetween(120, 650), reposts: randomBetween(30, 195) }),
  (title, n) => ({ ...P.insider, content: `${title} picked up for season ${n}. Sources say it was closer than the announcement makes it look.`, likes: randomBetween(180, 950), reposts: randomBetween(50, 285) }),
  (title) => ({ ...P.meme, content: `${title} got renewed and honestly I have questions. respecting the hustle though`, likes: randomBetween(200, 1050), reposts: randomBetween(55, 315) }),
  (title) => ({ ...P.parasocial, content: `${title} renewal is confirmed and look, I want to be excited, I just need season ${0} to have been a fluke`, likes: randomBetween(110, 600), reposts: randomBetween(30, 180) }),
];

function getRenewalBucket(avgRating: number | undefined): RenewalTemplate[] {
  if (avgRating === undefined) return RENEWAL_DECENT;
  if (avgRating >= 7.5) return RENEWAL_STRONG;
  if (avgRating >= 6.0) return RENEWAL_DECENT;
  return RENEWAL_WEAK;
}

export function generateRenewalPosts(
  showTitle: string,
  newSeasonNumber: number,
  week: number,
  year: number,
  avgRating?: number,
): AmbientSocialPost[] {
  const pool = getRenewalBucket(avgRating);
  return pickN(pool, randomBetween(1, 2)).map(fn => make(week, year, fn(showTitle, newSeasonNumber), showTitle));
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