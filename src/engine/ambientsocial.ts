import { CompetitorStudio, Show, SocialReaction, Genre } from '../types';
import { generateIndustryChatterPost } from './industrychatter';
import { generateCompetitorReactionPost } from './competitorreaction';
import { randomBetween, randomItem, randomChance } from '../utils/random';
import { nanoid } from '../utils/nanoid';

// ─────────────────────────────────────────────────────────────────────────────
// A social post not tied to a specific aired episode — anticipation chatter,
// competitor reactions, cross-network comparisons, general industry noise.
// Lives in its own flat list in GameState (see integration notes) so the
// Social tab can merge it with episode-tied SocialReactions and sort by date.
// ─────────────────────────────────────────────────────────────────────────────

export interface AmbientSocialPost extends SocialReaction {
  id: string;
  week: number;
  year: number;
  relatedShowTitle?: string;
  isCompetitor?: boolean;
}

interface AmbientContext {
  playerShows: Show[];
  competitors: CompetitorStudio[];
  week: number;
  year: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// PERSONAS (reused voices from social.ts — kept in sync manually since these
// are small, stable lists; if you rename a persona there, mirror it here)
// ─────────────────────────────────────────────────────────────────────────────

const P = {
  stan: { username: 'unhinged tv stan', handle: '@watchingrn' },
  insider: { username: 'The Wrap Line', handle: '@thewrapline' },
  recapper: { username: 'TV Obsessed', handle: '@tvobsessed' },
  numbers: { username: 'PrimeTimeFeed', handle: '@primetimefeed' },
  meme: { username: 'tv memes daily', handle: '@tvmemesdaily' },
  hatewatcher: { username: 'StreamNerve', handle: '@streamnerve' },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 1. ANTICIPATION — player shows currently in writing/filming/marketing.
//    Split by what the show actually knows about itself:
//      - NEW_SHOW_NO_DATE: season 1, no premiere date locked in yet ("what even
//        is this show going to be")
//      - RETURNING_SEASON_*: season 2+, tone bucketed off how the *previous*
//        season actually went (qualitative — no numbers surfaced, real fans
//        don't cite rating scores)
//    Note: once a premiere date IS locked in, this system stays quiet — that
//    moment is handled by the milestone-triggered post in milestoneSocial.ts,
//    so the "counting down the days" line doesn't get diluted into ambient
//    noise unrelated to the actual announcement.
// ─────────────────────────────────────────────────────────────────────────────

type ShowTemplate = (title: string, genre: Genre) => SocialReaction;

const NEW_SHOW_NO_DATE: ShowTemplate[] = [
  (title) => ({ ...P.stan, content: `no premiere date for ${title} yet and I am losing my mind slowly`, likes: randomBetween(180, 1000), reposts: randomBetween(50, 320) }),
  (title, genre) => ({ ...P.hatewatcher, content: `not gonna lie ${title} looks like it could go either way. ${genre} is a hard genre to get right.`, likes: randomBetween(100, 600), reposts: randomBetween(25, 190) }),
  (title) => ({ ...P.insider, content: `Sources close to ${title} say the tone is darker than the initial pitch suggested. Interesting choice.`, likes: randomBetween(160, 850), reposts: randomBetween(45, 270) }),
  (title) => ({ ...P.insider, content: `Hearing good things out of the ${title} production. Keep an eye on this one.`, likes: randomBetween(150, 900), reposts: randomBetween(40, 300) }),
  (title, genre) => ({ ...P.recapper, content: `${title} is shaping up to be one of the more interesting ${genre} shows on the schedule this year`, likes: randomBetween(120, 750), reposts: randomBetween(30, 240) }),
  (title) => ({ ...P.numbers, content: `${title} is one to watch for once it actually airs. The early buzz is real.`, likes: randomBetween(140, 800), reposts: randomBetween(35, 260) }),
];

const RETURNING_SEASON_STRONG: ShowTemplate[] = [
  (title) => ({ ...P.stan, content: `${title} earned my trust last season, going in with actual excitement this time`, likes: randomBetween(250, 1400), reposts: randomBetween(70, 420) }),
  (title) => ({ ...P.recapper, content: `still thinking about how good last season of ${title} was, ready for more whenever it drops`, likes: randomBetween(200, 1100), reposts: randomBetween(55, 340) }),
  (title) => ({ ...P.numbers, content: `${title} coming back after a season like that? no notes, just excited.`, likes: randomBetween(180, 950), reposts: randomBetween(45, 290) }),
  (title) => ({ ...P.insider, content: `Expectations are high for the next run of ${title} after how well last season landed. No pressure.`, likes: randomBetween(160, 850), reposts: randomBetween(40, 260) }),
];

const RETURNING_SEASON_MIXED: ShowTemplate[] = [
  (title) => ({ ...P.hatewatcher, content: `cautiously optimistic about ${title} coming back, last season had its moments but also its rough patches`, likes: randomBetween(150, 800), reposts: randomBetween(35, 250) }),
  (title) => ({ ...P.recapper, content: `${title} lost me a little last season if I'm honest but I'm back for another round, we'll see`, likes: randomBetween(140, 750), reposts: randomBetween(30, 230) }),
  (title) => ({ ...P.stan, content: `going into the next season of ${title} with tempered expectations. show it to me.`, likes: randomBetween(160, 820), reposts: randomBetween(40, 260) }),
];

const RETURNING_SEASON_ROUGH: ShowTemplate[] = [
  (title) => ({ ...P.hatewatcher, content: `not gonna lie ${title} needs to turn it around this season or I might actually be done`, likes: randomBetween(200, 1050), reposts: randomBetween(55, 320) }),
  (title) => ({ ...P.recapper, content: `giving ${title} one more season after how rough that last stretch got. last chance territory.`, likes: randomBetween(180, 950), reposts: randomBetween(45, 300) }),
  (title) => ({ ...P.insider, content: `There's real pressure on the ${title} writers room to course correct after last season. Everyone knows it.`, likes: randomBetween(160, 850), reposts: randomBetween(40, 270) }),
];

/**
 * Buckets the *previous* completed season's average rating into a vague,
 * fan-voice-appropriate tier. Returns null for season 1 (no previous season
 * to reference) or if the previous season somehow has no rated episodes yet.
 */
function previousSeasonBucket(show: Show): 'strong' | 'mixed' | 'rough' | null {
  const idx = show.currentSeasonIndex;
  if (idx <= 0) return null;
  const prev = show.seasons[idx - 1];
  if (!prev) return null;
  const rated = prev.episodes.map(e => e.rating).filter((r): r is number => r != null);
  if (rated.length === 0) return null;
  const avg = rated.reduce((a, b) => a + b, 0) / rated.length;
  return avg >= 7.5 ? 'strong' : avg >= 5.5 ? 'mixed' : 'rough';
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CROSS-NETWORK COMPARISON — fires when a player show and a competitor show
//    are both airing the same week. This is the "feels like a real ecosystem"
//    ingredient — the world has more than one network in it.
// ─────────────────────────────────────────────────────────────────────────────

type ComparisonTemplate = (playerTitle: string, rivalTitle: string, rivalStudio: string) => SocialReaction;

const COMPARISON: ComparisonTemplate[] = [
  (a, b) => ({ ...P.hatewatcher, content: `not me trying to watch both ${a} and ${b} the same night, my Sunday is booked`, likes: randomBetween(300, 1600), reposts: randomBetween(90, 500) }),
  (a, b) => ({ ...P.recapper, content: `${a} vs ${b} this week and honestly? both delivered. good problem to have as a viewer`, likes: randomBetween(200, 1100), reposts: randomBetween(60, 350) }),
  (a, b, studio) => ({ ...P.insider, content: `Networks are noticing the overlap between ${a} and ${studio}'s ${b}. Scheduling conflicts like this aren't usually an accident.`, likes: randomBetween(180, 900), reposts: randomBetween(50, 290) }),
  (a, b) => ({ ...P.numbers, content: `${a} and ${b} going head to head this week. Curious to see how the numbers split.`, likes: randomBetween(150, 800), reposts: randomBetween(40, 260) }),
  (a, b) => ({ ...P.meme, content: `me: I'll just watch one show tonight. also me, watching both ${a} and ${b} back to back at 1am`, likes: randomBetween(350, 1800), reposts: randomBetween(100, 550) }),
  (a, b) => ({ ...P.stan, content: `${a} team rise up. ${b} is fine but it's not even close`, likes: randomBetween(250, 1400), reposts: randomBetween(70, 420) }),
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. GENERAL INDUSTRY CHATTER — converted to the fragment-assembly engine
//    (see fragmentAssembler.ts + industryChatter.ts). This was the prototype
//    category: highest volume, lowest specificity, exactly where combinatorial
//    assembly beats writing more whole sentences by hand. Everything else in
//    this file (anticipation, comparison) stays bespoke per the triage —
//    those need to hit specific and contextual, which hand-written lines do
//    better than assembled ones.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// STABLE IDS + COOLDOWN — same pattern as social.ts, kept as a separate pool
// since these are a different rotation than episode-reaction templates.
// ─────────────────────────────────────────────────────────────────────────────

interface Identified<T> { id: string; fn: T }
function withIds<T>(tier: string, arr: T[]): Identified<T>[] {
  return arr.map((fn, i) => ({ id: `${tier}-${i}`, fn }));
}

const NEW_SHOW_NO_DATE_POOL = withIds('new-show-no-date', NEW_SHOW_NO_DATE);
const RETURNING_STRONG_POOL = withIds('returning-strong', RETURNING_SEASON_STRONG);
const RETURNING_MIXED_POOL = withIds('returning-mixed', RETURNING_SEASON_MIXED);
const RETURNING_ROUGH_POOL = withIds('returning-rough', RETURNING_SEASON_ROUGH);
const COMPARISON_POOL = withIds('comparison', COMPARISON);

export const AMBIENT_TEMPLATE_COOLDOWN = 8;

function pickFresh<T>(pool: Identified<T>[], recentIds: string[]): Identified<T> | null {
  if (pool.length === 0) return null;
  const cooldownSet = new Set(recentIds);
  const fresh = pool.filter(t => !cooldownSet.has(t.id));
  const usable = fresh.length > 0 ? fresh : pool;
  return randomItem(usable);
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

export interface GenerateAmbientResult {
  posts: AmbientSocialPost[];
  usedTemplateIds: string[]; // feed into next week's recentTemplateIds (ambient pool) —
                              // covers anticipation + comparison, the two categories still
                              // on the hand-written-pool + cooldown system. Industry chatter
                              // and competitor reactions are fragment-assembled now and don't
                              // need cooldown tracking (see industryChatter.ts / competitorReaction.ts).
}

export function generateAmbientSocialPosts(
  ctx: AmbientContext,
  recentAmbientTemplateIds: string[],
): GenerateAmbientResult {
  const posts: AmbientSocialPost[] = [];
  const usedTemplateIds: string[] = [];

  const make = (r: SocialReaction, relatedShowTitle?: string, isCompetitor?: boolean): AmbientSocialPost => ({
    ...r,
    id: nanoid(),
    week: ctx.week,
    year: ctx.year,
    relatedShowTitle,
    isCompetitor,
  });

  // ── Competitor show reactions (fragment-assembled — see competitorReaction.ts.
  //    The show's real currentRating drives both fragment eligibility and
  //    tone-token intensity, so a 9.2-rated show and a 5.5-rated show read
  //    meaningfully differently rather than both landing in one "positive"
  //    bucket at random.) ──
  const airingCompetitorShows = ctx.competitors.flatMap(studio =>
    studio.activeShows.filter(s => s.status === 'airing').map(s => ({ studio, show: s })),
  );
  if (airingCompetitorShows.length > 0 && randomChance(0.55)) {
    const { show } = randomItem(airingCompetitorShows);
    const takeCount = randomBetween(1, 2);
    for (let i = 0; i < takeCount; i++) {
      posts.push(make(generateCompetitorReactionPost(show.title, show.genre, show.currentRating), show.title, true));
    }
  }

  // ── Anticipation posts for player shows still in production ──
  // Season 1 with no date yet: "what is this show" energy.
  // Season 2+: tone off how the previous season actually went, qualitatively.
  // Season 1 WITH a date already set: intentionally silent here — that
  // moment is owned by the milestone post fired from setAirDate() directly
  // (see milestoneSocial.ts), so we don't double up on "counting down" lines.
  const inProductionShows = ctx.playerShows.filter(s =>
    ['writing', 'filming', 'marketing'].includes(s.status),
  );
  if (inProductionShows.length > 0 && randomChance(0.35)) {
    const show = randomItem(inProductionShows);
    const season = show.seasons[show.currentSeasonIndex];
    const isFirstSeason = show.currentSeasonIndex === 0;
    const hasDateSet = season?.airDateWeek !== null;

    let pool: Identified<ShowTemplate>[] | null = null;
    if (isFirstSeason && !hasDateSet) {
      pool = NEW_SHOW_NO_DATE_POOL;
    } else if (!isFirstSeason) {
      const bucket = previousSeasonBucket(show);
      pool = bucket === 'strong' ? RETURNING_STRONG_POOL
        : bucket === 'mixed' ? RETURNING_MIXED_POOL
        : bucket === 'rough' ? RETURNING_ROUGH_POOL
        : null;
    }

    if (pool) {
      const picked = pickFresh(pool, recentAmbientTemplateIds);
      if (picked) {
        posts.push(make(picked.fn(show.title, show.genre), show.title, false));
        usedTemplateIds.push(picked.id);
      }
    }
  }

  // ── Cross-network comparison ──
  const airingPlayerShows = ctx.playerShows.filter(s => s.status === 'airing');
  if (airingPlayerShows.length > 0 && airingCompetitorShows.length > 0 && randomChance(0.25)) {
    const playerShow = randomItem(airingPlayerShows);
    const { studio, show: rivalShow } = randomItem(airingCompetitorShows);
    const picked = pickFresh(COMPARISON_POOL, recentAmbientTemplateIds);
    if (picked) {
      posts.push(make(picked.fn(playerShow.title, rivalShow.title, studio.name), undefined, false));
      usedTemplateIds.push(picked.id);
    }
  }

  // ── General industry chatter (now fragment-assembled — see industryChatter.ts.
  //    No cooldown tracking needed here: with ~8 openers x 10 observations x
  //    10 reactions x 6 fillers x 6 signoffs across 6 blueprint shapes, the
  //    combinatorial space is large enough that verbatim repeats are rare
  //    without needing to track history.) ──
  if (randomChance(0.30)) {
    posts.push(make(generateIndustryChatterPost(), undefined, false));
  }

  return { posts, usedTemplateIds };
}