import { NewsItem, CompetitorStudio, CompetitorShow } from '../types';
import { nanoid } from '../utils/nanoid';
import { randomItem } from '../utils/random';

interface Ctx { week: number; year: number }

// ─────────────────────────────────────────────────────────────────────────────
// BYLINES — recurring reporters with distinct voices. Picked per-story so the
// same event type doesn't always read in the same register.
// ─────────────────────────────────────────────────────────────────────────────

const BYLINES = [
  'Trade Wire Staff',        // neutral wire-service voice (default/fallback)
  'Dana Kessler, The Trades', // numbers-driven trade reporter
  'Marcus Oyelaran, Culture Desk', // gossipy culture writer
  'The Prestige Report',    // critic-voiced awards/quality beat
] as const;

function byline(): string {
  return randomItem([...BYLINES]);
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPETITOR NEWS
// ─────────────────────────────────────────────────────────────────────────────

const COMPETITOR_CANCELLED_LINES = (studio: CompetitorStudio, show: CompetitorShow) => [
  `Sources say low ratings and weak advertiser interest forced the decision. "${show.title}" had been positioned as a ${show.genre} tentpole for the network.`,
  `${studio.name} pulled the plug quietly, with little of the fanfare that greeted the show's launch. Insiders point to a soft back half of the season.`,
  `The cancellation caps a rocky run for "${show.title}." A studio spokesperson called it "a difficult but necessary business decision."`,
];

const COMPETITOR_RENEWED_LINES = (studio: CompetitorStudio, show: CompetitorShow) => [
  `Strong ratings and audience loyalty made the renewal an easy call. The show has been one of ${studio.name}'s most consistent performers.`,
  `${studio.name} wasted no time locking in another season, a sign of just how central "${show.title}" has become to the network's slate.`,
  `The renewal was barely a surprise at this point — "${show.title}" has been trending up all season, and the network knows it has a hit.`,
];

const COMPETITOR_GREENLIT_LINES = (studio: CompetitorStudio, show: CompetitorShow) => [
  `The network is moving fast with the project, which is expected to go to series later this year.`,
  `${studio.name} is betting on ${show.genre} again, doubling down on a genre that's worked for them before.`,
  `Little is known about "${show.title}" yet, but ${studio.name} rarely greenlights without a plan already in motion.`,
];

const COMPETITOR_PREMIERE_LINES = (studio: CompetitorStudio, show: CompetitorShow) => [
  `The ${show.genre} series, ${show.seasonNumber > 1 ? `now in its ${ordinal(show.seasonNumber)} season, ` : ''}kicks off its run this week. Early numbers will set the tone for the rest of the season.`,
  `${studio.name} has a lot riding on this one. First-night numbers are already being circulated internally.`,
  `The premiere landed with the usual push from ${studio.name}'s marketing arm. Whether the show can hold its opening audience is the real test.`,
];

const COMPETITOR_COMPLETED_LINES = (studio: CompetitorStudio, show: CompetitorShow) => [
  `The ${show.genre} series has aired its season finale. The network has decided not to renew, bringing the show's run to a close after ${show.episodesAired} episodes.`,
  `${studio.name} confirmed there are no further plans for "${show.title}." A respectable run, if not a franchise-maker.`,
  `"${show.title}" exits with a whimper rather than a bang — a finale that closed the door rather than opening one.`,
];

export function makeCompetitorCancelledNews(studio: CompetitorStudio, show: CompetitorShow, ctx: Ctx): NewsItem {
  return {
    id: nanoid(), week: ctx.week, year: ctx.year, type: 'competitor', read: false, byline: byline(),
    headline: `${studio.name} cancels "${show.title}" after disappointing run`,
    body: randomItem(COMPETITOR_CANCELLED_LINES(studio, show)),
  };
}

export function makeCompetitorRenewedNews(studio: CompetitorStudio, show: CompetitorShow, ctx: Ctx): NewsItem {
  return {
    id: nanoid(), week: ctx.week, year: ctx.year, type: 'competitor', read: false, byline: byline(),
    headline: `${studio.name} renews "${show.title}" for season ${show.seasonNumber + 1}`,
    body: randomItem(COMPETITOR_RENEWED_LINES(studio, show)),
  };
}

export function makeCompetitorGreenlitNews(studio: CompetitorStudio, show: CompetitorShow, ctx: Ctx): NewsItem {
  return {
    id: nanoid(), week: ctx.week, year: ctx.year, type: 'competitor', read: false, byline: byline(),
    headline: `${studio.name} greenlights new ${show.genre} series "${show.title}"`,
    body: randomItem(COMPETITOR_GREENLIT_LINES(studio, show)),
  };
}

export function makeCompetitorPremiereNews(studio: CompetitorStudio, show: CompetitorShow, ctx: Ctx): NewsItem {
  return {
    id: nanoid(), week: ctx.week, year: ctx.year, type: 'competitor', read: false, byline: byline(),
    headline: `"${show.title}" premieres on ${studio.name}`,
    body: randomItem(COMPETITOR_PREMIERE_LINES(studio, show)),
  };
}

export function makeCompetitorCompletedNews(studio: CompetitorStudio, show: CompetitorShow, ctx: Ctx): NewsItem {
  return {
    id: nanoid(), week: ctx.week, year: ctx.year, type: 'competitor', read: false, byline: byline(),
    headline: `"${show.title}" wraps ${ordinal(show.seasonNumber)} season on ${studio.name} — no renewal`,
    body: randomItem(COMPETITOR_COMPLETED_LINES(studio, show)),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// INDUSTRY FILLER — now split into sub-topics instead of one flat list, so the
// "random ambient news" doesn't cycle through the same six blurbs all game.
// ─────────────────────────────────────────────────────────────────────────────

const RATINGS_TRENDS = [
  { headline: 'Prestige drama continues to dominate awards conversation', body: 'Networks doubling down on limited series and event television as audiences demand higher quality.' },
  { headline: 'Reality programming sees viewership surge heading into fall', body: 'Unscripted formats delivering outsized ad revenue as production costs remain low compared to scripted drama.' },
  { headline: 'Procedural dramas remain reliable performers for mid-tier networks', body: 'Consistent viewership and strong syndication value making procedurals attractive for networks seeking stability over prestige.' },
  { headline: 'Sci-fi audience growing as streaming drives genre experimentation', body: 'What was once a niche category is now a mainstream draw, with several recent entries crossing over to broad audiences.' },
  { headline: 'Comedy ratings soften across the board this season', body: 'Analysts point to fragmented attention spans and a crowded field of half-hour competitors eating into audience share.' },
  { headline: 'Limited series orders hit a multi-year high', body: 'Networks are favoring self-contained event television over open-ended series commitments, citing lower long-term risk.' },
];

const STREAMING_AND_BUSINESS = [
  { headline: 'Streaming platforms aggressive in pursuing cable content deals', body: 'Multiple platforms are increasing acquisition budgets, with premium cable shows at the top of their wishlists.' },
  { headline: 'Network ad revenue climbs on strength of live event viewership', body: 'Advertisers paying premiums for live and appointment television as time-shifted viewing erodes value of traditional spots.' },
  { headline: 'Production costs tick upward industry-wide', body: 'Rising below-the-line costs are squeezing margins even for networks with strong ratings, executives say.' },
  { headline: 'Syndication deals remain lucrative for long-running procedurals', body: 'A strong back catalog is proving to be as valuable as a hit new series for networks managing the bottom line.' },
  { headline: 'Advertisers chase younger demographics as ad rates diverge by genre', body: 'CPMs for genre and reality programming are increasingly decoupled from overall viewership as advertisers get more selective.' },
];

const TALENT_AND_CULTURE = [
  { headline: 'Showrunners increasingly demanding creative control in deals', body: 'Agents say top-tier writers are now negotiating final cut and consultation rights as standard, not bonus, terms.' },
  { headline: 'Actor fees for established leads climb again this cycle', body: 'Studios are absorbing higher above-the-line costs to lock down recognizable faces amid a competitive talent market.' },
  { headline: 'Directors report packed schedules as demand for prestige TV holds', body: 'In-demand directors are increasingly choosing television over film, citing creative freedom and steady work.' },
  { headline: 'Casting directors say ensemble dramas are back in vogue', body: 'Rather than single-lead vehicles, networks are commissioning larger ensemble casts to spread risk across more recognizable names.' },
];

const AWARDS_CHATTER = [
  { headline: 'Early awards buzz begins to take shape this season', body: 'Trade prognosticators are floating early frontrunners, though most agree it is far too early to call.' },
  { headline: 'Critics groups signal a wide-open awards race this year', body: 'Unlike recent cycles, no single series has emerged as an overwhelming frontrunner heading into the fall.' },
  { headline: 'For-your-consideration campaigns ramp up across networks', body: 'Studios are spending heavily on trade ads and screening events as the race for nominations intensifies.' },
];

const INDUSTRY_TOPIC_POOLS = [RATINGS_TRENDS, STREAMING_AND_BUSINESS, TALENT_AND_CULTURE, AWARDS_CHATTER];

export function makeIndustryNews(ctx: Ctx): NewsItem {
  const pool = randomItem(INDUSTRY_TOPIC_POOLS);
  const story = randomItem(pool);
  return {
    id: nanoid(), week: ctx.week, year: ctx.year, type: 'industry', read: false, byline: byline(),
    ...story,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EMMY NEWS
// ─────────────────────────────────────────────────────────────────────────────

export function makeEmmyNominationsNews(
  playerNomCount: number,
  topShowTitle: string,
  networkName: string,
  ctx: Ctx,
): NewsItem {
  return {
    id: nanoid(), week: ctx.week, year: ctx.year, type: 'emmy', read: false, byline: byline(),
    headline: `Emmy nominations announced — "${topShowTitle}" leads the conversation`,
    body:
      playerNomCount > 0
        ? `${networkName} received ${playerNomCount} nomination${playerNomCount > 1 ? 's' : ''} this year. The full nominees list has critics already picking frontrunners.`
        : `This year's nominees are in. Critics are debating which shows have the momentum heading into the ceremony.`,
  };
}

export function makeEmmyCeremonyNews(
  playerWins: number,
  topCompetitor: { studioName: string; wins: number } | null,
  networkName: string,
  ctx: Ctx,
): NewsItem {
  let headline: string;
  let body: string;

  if (playerWins > 0 && topCompetitor) {
    headline = `Emmy night: ${networkName} wins ${playerWins} — ${topCompetitor.studioName} also takes home ${topCompetitor.wins}`;
    body = `A competitive Emmy night. ${networkName} earned recognition while ${topCompetitor.studioName} made a statement of their own. The industry is watching both.`;
  } else if (playerWins > 0) {
    headline = `Emmy night: ${networkName} wins ${playerWins}`;
    body = `A strong night at the Emmys. Winners are celebrating and the industry is taking note of ${networkName}'s growing prestige.`;
  } else if (topCompetitor) {
    headline = `${topCompetitor.studioName} dominates Emmy night with ${topCompetitor.wins} win${topCompetitor.wins > 1 ? 's' : ''}`;
    body = `${topCompetitor.studioName} had a dominant night at the Emmys. The competition is heating up across the industry.`;
  } else {
    headline = 'Emmy ceremony concludes';
    body = `The ceremony is over. The industry moves on, and so does the competition for next year's slate.`;
  }

  return { id: nanoid(), week: ctx.week, year: ctx.year, type: 'emmy', read: false, byline: byline(), headline, body };
}

// ─────────────────────────────────────────────────────────────────────────────
// STREAMING DEAL NEWS
// ─────────────────────────────────────────────────────────────────────────────

function seasonsLabel(seasonsIncluded: number[]): string {
  if (seasonsIncluded.length === 1) return `Season ${seasonsIncluded[0]}`;
  const sorted = [...seasonsIncluded].sort((a, b) => a - b);
  // Contiguous run (e.g. 1,2,3) reads as "Seasons 1-3"; otherwise list them out.
  const isContiguous = sorted.every((n, i) => i === 0 || n === sorted[i - 1] + 1);
  return isContiguous
    ? `Seasons ${sorted[0]}-${sorted[sorted.length - 1]}`
    : `Seasons ${sorted.join(', ')}`;
}

export function makeStreamingDealNews(
  showTitle: string,
  seasonsIncluded: number[],
  platformName: string,
  ctx: Ctx,
): NewsItem {
  const label = seasonsLabel(seasonsIncluded);
  const lines = [
    `"${showTitle}" ${label} will be available to stream starting this week, giving the show a new life beyond its original broadcast.`,
    `Fans who missed "${showTitle}" ${label} on air now have another way in, as the show lands on ${platformName}.`,
    `${platformName} confirmed the addition today. It's the kind of deal that can introduce a show to an entirely new audience.`,
  ];
  return {
    id: nanoid(), week: ctx.week, year: ctx.year, type: 'player', read: false, byline: byline(),
    headline: `"${showTitle}" ${label} now streaming on ${platformName}`,
    body: randomItem(lines),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER SHOW MILESTONE NEWS
// ─────────────────────────────────────────────────────────────────────────────

export function makeFilmingWrapNews(showTitle: string, ctx: Ctx): NewsItem {
  const lines = [
    `Principal photography has officially wrapped on "${showTitle}". The production is now entering post-production ahead of its marketing push.`,
    `"${showTitle}" has finished filming. Sources on set say the production went smoothly, with the crew delivering the final shot ahead of schedule.`,
    `Cameras are down on "${showTitle}" after a successful shoot. The network is preparing its marketing campaign as the show heads toward broadcast.`,
    `Filming has concluded on "${showTitle}." Post-production is expected to move quickly as the network eyes a premiere date.`,
    `The set for "${showTitle}" has officially wrapped. Crew members describe a demanding but rewarding shoot.`,
  ];
  return {
    id: nanoid(), week: ctx.week, year: ctx.year, type: 'industry', read: false, byline: byline(),
    headline: `"${showTitle}" wraps principal photography`,
    body: randomItem(lines),
  };
}

export function makePremiereNews(showTitle: string, genre: string, ctx: Ctx): NewsItem {
  const lines = [
    `Audiences tuned in for the series premiere of "${showTitle}" tonight. Early social reaction has been strong.`,
    `"${showTitle}" opened to eager viewers. Critics and fans are already weighing in on the debut episode.`,
    `The first episode of "${showTitle}" has aired. The ${genre} series is now officially part of the conversation.`,
    `"${showTitle}" made its debut tonight after months of anticipation. The network will be watching the numbers closely.`,
    `The wait is over: "${showTitle}" premiered tonight, and the industry is already sizing up its chances.`,
  ];
  return {
    id: nanoid(), week: ctx.week, year: ctx.year, type: 'player', read: false, byline: byline(),
    headline: `"${showTitle}" premieres tonight`,
    body: randomItem(lines),
  };
}

export function makeFinaleNews(showTitle: string, seasonNumber: number, ctx: Ctx): NewsItem {
  const lines = [
    `The Season ${seasonNumber} finale of "${showTitle}" has aired. Fan reaction to the ending is pouring in.`,
    `"${showTitle}" wraps Season ${seasonNumber} tonight. The finale leaves viewers with plenty to talk about.`,
    `Season ${seasonNumber} of "${showTitle}" comes to a close. The network will now weigh renewal options.`,
    `"${showTitle}" closed out its season tonight with a finale that's already generating conversation online.`,
    `The Season ${seasonNumber} chapter of "${showTitle}" is complete. All eyes now turn to what comes next.`,
  ];
  return {
    id: nanoid(), week: ctx.week, year: ctx.year, type: 'player', read: false, byline: byline(),
    headline: `"${showTitle}" airs its Season ${seasonNumber} finale`,
    body: randomItem(lines),
  };
}