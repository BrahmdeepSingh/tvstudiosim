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

// ─────────────────────────────────────────────────────────────────────────────
// 5. CANCELLATION — fires the moment cancelShow() succeeds.
//    Four buckets:
//      cleanHigh   — show ran, not renewed, avg ≥ 7.5  (fans are upset)
//      cleanMid    — show ran, not renewed, avg 6.0–7.4 (sad but understandable)
//      cleanLow    — show ran, not renewed, avg < 6.0   (saw it coming)
//      sudden      — cancelled mid-production            (nobody saw this)
// ─────────────────────────────────────────────────────────────────────────────

type CancelTemplate = (title: string) => SocialReaction;

const CANCEL_CLEAN_HIGH: CancelTemplate[] = [
  (title) => ({ ...P.stan, content: `they CANCELLED ${title}??? this show was doing so well what are they thinking`, likes: randomBetween(600, 3000), reposts: randomBetween(180, 900) }),
  (title) => ({ ...P.recapper, content: `${title} is cancelled. Genuinely a shame — this one had more to give and the numbers didn't lie. 📺`, likes: randomBetween(400, 2000), reposts: randomBetween(110, 600) }),
  (title) => ({ ...P.parasocial, content: `${title} is cancelled and I actually need a moment. that cast deserved another season. we deserved another season.`, likes: randomBetween(500, 2600), reposts: randomBetween(140, 780) }),
  (title) => ({ ...P.insider, content: `${title} has been cancelled. Sources say budget priorities, not performance — which will not sit well with the fanbase.`, likes: randomBetween(300, 1600), reposts: randomBetween(85, 480) }),
  (title) => ({ ...P.numbers, content: `${title} cancelled despite the numbers. That's a call that raises questions about what the network actually values.`, likes: randomBetween(350, 1800), reposts: randomBetween(95, 540) }),
  (title) => ({ ...P.meme, content: `the ${title} fanbase finding out it's cancelled [person staring at phone in complete silence]`, likes: randomBetween(450, 2400), reposts: randomBetween(130, 720) }),
];

const CANCEL_CLEAN_MID: CancelTemplate[] = [
  (title) => ({ ...P.stan, content: `${title} got cancelled. sad about it but honestly I get it`, likes: randomBetween(250, 1300), reposts: randomBetween(70, 390) }),
  (title) => ({ ...P.recapper, content: `${title} won't be returning. A show that had its moments but never quite locked in what it wanted to be. 📺`, likes: randomBetween(200, 1100), reposts: randomBetween(55, 330) }),
  (title) => ({ ...P.insider, content: `${title} has been cancelled after this season. Not a shock, but not a clean story for the network either.`, likes: randomBetween(180, 950), reposts: randomBetween(50, 285) }),
  (title) => ({ ...P.numbers, content: `${title} not returning. The trajectory had been pointing here for a while. The data made this call easier than it looked.`, likes: randomBetween(150, 800), reposts: randomBetween(40, 240) }),
  (title) => ({ ...P.meme, content: `${title} cancelled. placing it in the 'had potential' folder [filing cabinet gif]`, likes: randomBetween(200, 1100), reposts: randomBetween(55, 330) }),
  (title) => ({ ...P.parasocial, content: `${title} is cancelled. I really wanted this one to get there. I thought it would get there.`, likes: randomBetween(180, 950), reposts: randomBetween(50, 285) }),
];

const CANCEL_CLEAN_LOW: CancelTemplate[] = [
  (title) => ({ ...P.stan, content: `${title} got cancelled. I kind of saw it coming but I still feel some type of way about it`, likes: randomBetween(100, 600), reposts: randomBetween(25, 180) }),
  (title) => ({ ...P.recapper, content: `${title} cancelled, as expected. The show never recovered the audience after the early stumbles. 📺`, likes: randomBetween(130, 700), reposts: randomBetween(35, 210) }),
  (title) => ({ ...P.insider, content: `${title} not returning. Given the season it had, this was the expected outcome.`, likes: randomBetween(120, 650), reposts: randomBetween(30, 195) }),
  (title) => ({ ...P.numbers, content: `${title} cancelled. The viewership data had been pointing this direction for weeks. No surprises here.`, likes: randomBetween(110, 600), reposts: randomBetween(28, 180) }),
  (title) => ({ ...P.meme, content: `${title} cancellation watch: complete. [checks item off clipboard]`, likes: randomBetween(150, 800), reposts: randomBetween(40, 240) }),
];

const CANCEL_SUDDEN: CancelTemplate[] = [
  (title) => ({ ...P.stan, content: `wait ${title} got CANCELLED?? mid-production?? what is going on over there`, likes: randomBetween(400, 2200), reposts: randomBetween(120, 660) }),
  (title) => ({ ...P.recapper, content: `${title} has been cancelled mid-production. No official explanation from the network yet. 📺`, likes: randomBetween(300, 1600), reposts: randomBetween(85, 480) }),
  (title) => ({ ...P.insider, content: `${title} is shutting down mid-production. Sources are pointing to budget disputes and creative tensions. Messy situation.`, likes: randomBetween(350, 1800), reposts: randomBetween(95, 540) }),
  (title) => ({ ...P.parasocial, content: `the ${title} cast finding out their show was cancelled mid-production via a press release is so bleak actually`, likes: randomBetween(500, 2600), reposts: randomBetween(140, 780) }),
  (title) => ({ ...P.meme, content: `${title} cancelled mid-production. nobody: / the network: [pulls fire alarm during pre-production meeting]`, likes: randomBetween(350, 1900), reposts: randomBetween(95, 570) }),
  (title) => ({ ...P.numbers, content: `${title} cancelled before it could air. A rare outcome, and one the network will have to explain at some point.`, likes: randomBetween(200, 1100), reposts: randomBetween(55, 330) }),
];

function getCancelBucket(isClean: boolean, avgRating: number | undefined): CancelTemplate[] {
  if (!isClean) return CANCEL_SUDDEN;
  if (avgRating === undefined) return CANCEL_CLEAN_MID;
  if (avgRating >= 7.5) return CANCEL_CLEAN_HIGH;
  if (avgRating >= 6.0) return CANCEL_CLEAN_MID;
  return CANCEL_CLEAN_LOW;
}

export function generateCancellationPosts(
  showTitle: string,
  isClean: boolean,
  week: number,
  year: number,
  avgRating?: number,
): AmbientSocialPost[] {
  const pool = getCancelBucket(isClean, avgRating);
  return pickN(pool, randomBetween(1, 2)).map(fn => make(week, year, fn(showTitle), showTitle));
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. DIRECTOR CASTING — fires when hireDirector() succeeds.
//    Three tiers keyed to the director's popularity (0–100):
//      high  ≥ 75 — known name, changes the profile of the project
//      mid  50–74 — working professional, solid hire
//      low   < 50 — emerging talent, lower-key reaction
// ─────────────────────────────────────────────────────────────────────────────

type CastTemplate = (show: string, name: string) => SocialReaction;

const DIRECTOR_HIGH: CastTemplate[] = [
  (show, name) => ({ ...P.stan, content: `${name} is directing ${show}??? I wasn't paying attention to this show before but I absolutely am now`, likes: randomBetween(350, 1800), reposts: randomBetween(100, 540) }),
  (show, name) => ({ ...P.insider, content: `${name} signed on to direct ${show}. A real get. Expect the profile of this project to shift considerably.`, likes: randomBetween(300, 1600), reposts: randomBetween(85, 480) }),
  (show, name) => ({ ...P.recapper, content: `${name} directing ${show} changes what I expect from this season. That's a name that genuinely matters. 📺`, likes: randomBetween(280, 1400), reposts: randomBetween(75, 420) }),
  (show, name) => ({ ...P.numbers, content: `${name} attached to ${show}. Director attachments at this level tend to move the needle before a single frame is shot.`, likes: randomBetween(220, 1200), reposts: randomBetween(60, 360) }),
  (show, name) => ({ ...P.parasocial, content: `${name} directing ${show} and I genuinely cannot wait. two of my absolute favorites.`, likes: randomBetween(250, 1300), reposts: randomBetween(70, 390) }),
  (show, name) => ({ ...P.meme, content: `${show} got ${name} to direct. the bar has been raised before the show even starts [immediately moves to top of watchlist]`, likes: randomBetween(300, 1600), reposts: randomBetween(85, 480) }),
];

const DIRECTOR_MID: CastTemplate[] = [
  (show, name) => ({ ...P.insider, content: `${name} attached to ${show} as director. A solid, reliable hire for this kind of material.`, likes: randomBetween(150, 800), reposts: randomBetween(40, 240) }),
  (show, name) => ({ ...P.recapper, content: `${name} directing ${show}. Consistent work, right instincts. Looking forward to seeing the vision come together. 📺`, likes: randomBetween(130, 700), reposts: randomBetween(35, 210) }),
  (show, name) => ({ ...P.numbers, content: `${name} comes aboard ${show}. Not the flashiest hire but a reliable one.`, likes: randomBetween(100, 550), reposts: randomBetween(25, 165) }),
  (show, name) => ({ ...P.stan, content: `ooh ${name} is directing ${show}? that's actually a really interesting choice`, likes: randomBetween(120, 650), reposts: randomBetween(30, 195) }),
];

const DIRECTOR_LOW: CastTemplate[] = [
  (show, name) => ({ ...P.insider, content: `${show} has found its director in ${name}. An emerging voice with a distinctive POV worth watching.`, likes: randomBetween(80, 450), reposts: randomBetween(20, 135) }),
  (show, name) => ({ ...P.stan, content: `don't know much about ${name} but if ${show} hired them they must see something`, likes: randomBetween(90, 500), reposts: randomBetween(22, 150) }),
  (show, name) => ({ ...P.recapper, content: `${name} directing ${show}. New to me but the industry has been talking about this one. 📺`, likes: randomBetween(70, 400), reposts: randomBetween(18, 120) }),
];

export function generateDirectorCastingPosts(
  showTitle: string,
  directorName: string,
  popularity: number,
  week: number,
  year: number,
): AmbientSocialPost[] {
  const pool = popularity >= 75 ? DIRECTOR_HIGH : popularity >= 50 ? DIRECTOR_MID : DIRECTOR_LOW;
  return pickN(pool, 1).map(fn => make(week, year, fn(showTitle, directorName), showTitle));
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. ACTOR CASTING — fires when hireActor() succeeds.
//    Six pools: lead × [high/mid/low popularity] + supporting × [high/mid/low]
//    Popularity thresholds: ≥ 75 high, 50–74 mid, < 50 low.
// ─────────────────────────────────────────────────────────────────────────────

const LEAD_HIGH: CastTemplate[] = [
  (show, name) => ({ ...P.stan, content: `${name} is going to be in ${show}?? the cast is STACKED and they haven't even started filming`, likes: randomBetween(450, 2400), reposts: randomBetween(130, 720) }),
  (show, name) => ({ ...P.parasocial, content: `${name} cast in ${show} and I have been a fan since before it was cool so I feel very validated right now`, likes: randomBetween(400, 2200), reposts: randomBetween(115, 660) }),
  (show, name) => ({ ...P.recapper, content: `${name} leading ${show} is the kind of casting that raises the ceiling before the show airs a single frame. 📺`, likes: randomBetween(350, 1800), reposts: randomBetween(100, 540) }),
  (show, name) => ({ ...P.insider, content: `${name} has been cast in ${show}. A name that brings heat before production even starts.`, likes: randomBetween(280, 1500), reposts: randomBetween(75, 450) }),
  (show, name) => ({ ...P.meme, content: `them: ${show} cast ${name} / me: [immediately adds to watchlist without reading anything else]`, likes: randomBetween(350, 1900), reposts: randomBetween(100, 570) }),
  (show, name) => ({ ...P.numbers, content: `${name} attached to ${show} in a lead role. Star power like this tends to show up in the premiere numbers.`, likes: randomBetween(250, 1300), reposts: randomBetween(70, 390) }),
];

const LEAD_MID: CastTemplate[] = [
  (show, name) => ({ ...P.stan, content: `they cast ${name} for ${show} and I think that's actually a really solid choice`, likes: randomBetween(180, 950), reposts: randomBetween(50, 285) }),
  (show, name) => ({ ...P.recapper, content: `${name} for ${show} makes sense. Good range, right instincts for the material. 📺`, likes: randomBetween(150, 800), reposts: randomBetween(40, 240) }),
  (show, name) => ({ ...P.insider, content: `${name} cast in ${show}. A working professional with a strong track record — the show is in good hands.`, likes: randomBetween(130, 700), reposts: randomBetween(35, 210) }),
  (show, name) => ({ ...P.parasocial, content: `${name} in ${show} is the casting that doesn't get enough hype. quietly one of the best working right now`, likes: randomBetween(160, 850), reposts: randomBetween(45, 255) }),
];

const LEAD_LOW: CastTemplate[] = [
  (show, name) => ({ ...P.stan, content: `I don't know who ${name} is but ${show} hired them so I'm choosing to trust the process`, likes: randomBetween(100, 550), reposts: randomBetween(25, 165) }),
  (show, name) => ({ ...P.insider, content: `${show} has cast its lead. ${name} is an emerging name — worth paying attention to.`, likes: randomBetween(90, 500), reposts: randomBetween(22, 150) }),
  (show, name) => ({ ...P.recapper, content: `${name} headlining ${show}. Newer face, but there's clearly something there if the casting team went this direction. 📺`, likes: randomBetween(80, 450), reposts: randomBetween(20, 135) }),
];

const SUPPORTING_HIGH: CastTemplate[] = [
  (show, name) => ({ ...P.stan, content: `wait ${name} is in ${show} TOO?? they are genuinely building something special here`, likes: randomBetween(300, 1600), reposts: randomBetween(85, 480) }),
  (show, name) => ({ ...P.recapper, content: `${name} in a supporting role on ${show} — that kind of depth tells you everything about the ambition level here. 📺`, likes: randomBetween(250, 1300), reposts: randomBetween(70, 390) }),
  (show, name) => ({ ...P.parasocial, content: `${name} joining ${show} in any capacity is news. obsessed with this cast already.`, likes: randomBetween(280, 1500), reposts: randomBetween(75, 450) }),
  (show, name) => ({ ...P.insider, content: `${name} cast in a supporting role on ${show}. Signing names like this for supporting parts sends a clear message about expectations.`, likes: randomBetween(220, 1200), reposts: randomBetween(60, 360) }),
];

const SUPPORTING_MID: CastTemplate[] = [
  (show, name) => ({ ...P.stan, content: `${name} joining ${show} in a supporting role is a really nice get actually`, likes: randomBetween(120, 650), reposts: randomBetween(30, 195) }),
  (show, name) => ({ ...P.recapper, content: `${name} rounding out the ${show} cast. Solid supporting choice. 📺`, likes: randomBetween(100, 550), reposts: randomBetween(25, 165) }),
  (show, name) => ({ ...P.insider, content: `${name} in a supporting capacity on ${show}. A reliable choice to fill out the ensemble.`, likes: randomBetween(90, 500), reposts: randomBetween(22, 150) }),
];

const SUPPORTING_LOW: CastTemplate[] = [
  (show, name) => ({ ...P.stan, content: `${name} has a role in ${show} now. always happy to see them get the opportunity`, likes: randomBetween(70, 400), reposts: randomBetween(18, 120) }),
  (show, name) => ({ ...P.insider, content: `${show} fills out its supporting cast with ${name}. A name to watch.`, likes: randomBetween(60, 350), reposts: randomBetween(15, 105) }),
];

export function generateActorCastingPosts(
  showTitle: string,
  actorName: string,
  role: 'lead' | 'supporting',
  popularity: number,
  week: number,
  year: number,
): AmbientSocialPost[] {
  let pool: CastTemplate[];
  if (role === 'lead') {
    pool = popularity >= 75 ? LEAD_HIGH : popularity >= 50 ? LEAD_MID : LEAD_LOW;
  } else {
    pool = popularity >= 75 ? SUPPORTING_HIGH : popularity >= 50 ? SUPPORTING_MID : SUPPORTING_LOW;
  }
  return pickN(pool, 1).map(fn => make(week, year, fn(showTitle, actorName), showTitle));
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. FINAL SEASON ANNOUNCED — fires at renewShow() when isFinalSeason=true.
//    Tone: bittersweet excitement. "Ending on their terms."
// ─────────────────────────────────────────────────────────────────────────────

type FinalSeasonTemplate = (title: string, seasonNumber: number) => SocialReaction;

const FINAL_SEASON_ANNOUNCED: FinalSeasonTemplate[] = [
  (title, n) => ({ ...P.stan, content: `they just announced ${title} season ${n} is the FINAL SEASON and I have so many emotions right now`, likes: randomBetween(500, 2800), reposts: randomBetween(150, 840) }),
  (title, n) => ({ ...P.recapper, content: `${title} will end after season ${n}. If they stick the landing, this goes down as one of the greats. 📺`, likes: randomBetween(400, 2000), reposts: randomBetween(110, 600) }),
  (title) => ({ ...P.parasocial, content: `${title} is ending on its own terms and I'm devastated but I also respect it so much. this is rare.`, likes: randomBetween(450, 2400), reposts: randomBetween(130, 720) }),
  (title, n) => ({ ...P.insider, content: `${title} confirmed for a final season ${n}. A planned ending — the rarest, most precious thing in television.`, likes: randomBetween(280, 1500), reposts: randomBetween(75, 450) }),
  (title) => ({ ...P.numbers, content: `${title} final season announced. Expect viewership to spike. Farewell seasons almost always pull numbers.`, likes: randomBetween(220, 1200), reposts: randomBetween(60, 360) }),
  (title, n) => ({ ...P.meme, content: `${title} season ${n} is the FINAL season confirmed. me for this entire run: [sobbing while clapping]`, likes: randomBetween(400, 2200), reposts: randomBetween(115, 660) }),
  (title) => ({ ...P.stan, content: `not ready to accept that ${title} is ending but also I want them to go out on top so I will support this decision while crying`, likes: randomBetween(350, 1900), reposts: randomBetween(95, 570) }),
  (title, n) => ({ ...P.recapper, content: `The ${title} final season announcement is the rare good news in television. Season ${n} will be something to watch. 📺`, likes: randomBetween(300, 1600), reposts: randomBetween(85, 480) }),
];

export function generateFinalSeasonAnnouncedPosts(
  showTitle: string,
  seasonNumber: number,
  week: number,
  year: number,
): AmbientSocialPost[] {
  return pickN(FINAL_SEASON_ANNOUNCED, randomBetween(2, 3)).map(fn =>
    make(week, year, fn(showTitle, seasonNumber), showTitle),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. SERIES FINALE AIRED — fires when the last episode of a final season airs.
//    Distinct from cancellation. Tone: the show is over, cultural moment,
//    "this is how you end something."
// ─────────────────────────────────────────────────────────────────────────────

type SeriesFinaleTemplate = (title: string, seasonNumber: number) => SocialReaction;

const SERIES_FINALE_AIRED: SeriesFinaleTemplate[] = [
  (title) => ({ ...P.stan, content: `${title} is OVER. I genuinely do not know what to do with myself right now`, likes: randomBetween(600, 3200), reposts: randomBetween(180, 960) }),
  (title) => ({ ...P.recapper, content: `${title} has aired its series finale. Full review going up tonight. This is how you end a show. 📺`, likes: randomBetween(500, 2600), reposts: randomBetween(140, 780) }),
  (title) => ({ ...P.parasocial, content: `watching the ${title} series finale and I am not okay. not even slightly. what do we watch now. what do we DO`, likes: randomBetween(550, 2900), reposts: randomBetween(160, 870) }),
  (title, n) => ({ ...P.insider, content: `${title} ends its ${n}-season run tonight. A complete story, told on its own terms. That's genuinely rare.`, likes: randomBetween(350, 1800), reposts: randomBetween(95, 540) }),
  (title) => ({ ...P.numbers, content: `${title} series finale pulling the kind of numbers you only see when a show ends exactly right.`, likes: randomBetween(280, 1500), reposts: randomBetween(75, 450) }),
  (title) => ({ ...P.meme, content: `${title} is over and I am sobbing at 2am but I made this choice and I would make it again [crying emoji][crying emoji]`, likes: randomBetween(500, 2700), reposts: randomBetween(145, 810) }),
  (title, n) => ({ ...P.stan, content: `${n} seasons. it's done. ${title} just ended and the group chat has been going for three hours straight`, likes: randomBetween(450, 2400), reposts: randomBetween(130, 720) }),
  (title) => ({ ...P.recapper, content: `The ${title} finale debate starts now. Was it everything? Did it earn it? Either way — that was television. 📺`, likes: randomBetween(400, 2100), reposts: randomBetween(115, 630) }),
  (title) => ({ ...P.parasocial, content: `${title} is over and I genuinely feel like I have to go through grief stages about this`, likes: randomBetween(380, 2000), reposts: randomBetween(105, 600) }),
  (title) => ({ ...P.insider, content: `The ${title} era is officially closed. Whatever you thought of the finale, the show earned its place in the conversation.`, likes: randomBetween(300, 1600), reposts: randomBetween(85, 480) }),
];

export function generateSeriesFinaleAiredPosts(
  showTitle: string,
  seasonNumber: number,
  week: number,
  year: number,
): AmbientSocialPost[] {
  return pickN(SERIES_FINALE_AIRED, randomBetween(2, 3)).map(fn =>
    make(week, year, fn(showTitle, seasonNumber), showTitle),
  );
}