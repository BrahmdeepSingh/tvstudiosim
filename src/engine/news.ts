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

export function makeLoanDefaultNews(networkName: string, amountOwed: number, ctx: Ctx): NewsItem {
  const fmt = (n: number) => `$${(n / 1_000_000).toFixed(1)}M`;
  const lines = [
    `${networkName} has reportedly missed a repayment deadline on a private financing arrangement. The outstanding balance, believed to be around ${fmt(amountOwed)}, is now accruing additional penalties.`,
    `Industry sources say ${networkName} is behind on a private loan obligation. The network has not responded to requests for comment, fueling speculation about its near-term financial position.`,
    `Whispers in the industry suggest ${networkName} is in hot water with a private lender. A missed payment window has left the network's finances under scrutiny at an uncomfortable time.`,
  ];
  return {
    id: nanoid(), week: ctx.week, year: ctx.year, type: 'player', read: false, byline: byline(),
    headline: `${networkName} reportedly misses private loan repayment`,
    body: randomItem(lines),
  };
}

export function makeNewShowRumorNews(
  showTitle: string,
  genre: string,
  networkName: string,
  inHouse: boolean,
  ctx: Ctx,
): NewsItem {
  const lines = inHouse ? [
    `Sources at ${networkName} say the network is developing a new ${genre} project internally, working title "${showTitle}." No official confirmation yet.`,
    `${networkName} is believed to be quietly developing "${showTitle}," a ${genre} series originating from the network's own creative team. Details remain scarce.`,
    `Rumors are circulating that ${networkName} has a ${genre} project called "${showTitle}" in early development. Insiders say it's further along than the network is letting on.`,
    `"${showTitle}" has been whispered about in industry circles as ${networkName}'s next in-house ${genre} venture. The network declined to comment.`,
    `${networkName} is reportedly incubating a ${genre} project called "${showTitle}" without outside involvement. An announcement is expected once the writing phase concludes.`,
  ] : [
    `${networkName} has acquired the rights to "${showTitle}," a ${genre} pitch that's been making the rounds. Writing is expected to begin shortly.`,
    `"${showTitle}" has found a home at ${networkName}. The ${genre} project was pitched by an independent showrunner and quickly caught the network's attention.`,
    `Sources confirm that ${networkName} has greenlighted "${showTitle}," a ${genre} project that beat out competing offers. The network moved decisively once the pitch landed.`,
    `${networkName} snapped up "${showTitle}" in what sources describe as a competitive situation. The ${genre} series will go straight into development.`,
    `A new ${genre} series called "${showTitle}" is heading to ${networkName} after the network closed a deal with its creative team. The trade calls it a project to watch.`,
  ];
  return {
    id: nanoid(), week: ctx.week, year: ctx.year, type: 'player', read: false, byline: byline(),
    headline: inHouse
      ? `${networkName} rumored to be developing new ${genre} series "${showTitle}"`
      : `${networkName} acquires "${showTitle}" — new ${genre} series in development`,
    body: randomItem(lines),
  };
}

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

export function makeFinalSeasonAnnouncedNews(showTitle: string, seasonNumber: number, ctx: Ctx): NewsItem {
  const lines = [
    `The network confirmed today that the upcoming season of "${showTitle}" will serve as its final chapter. The creative team will have the rare opportunity to conclude the series on their own terms.`,
    `After ${seasonNumber - 1} season${seasonNumber - 1 === 1 ? '' : 's'}, "${showTitle}" will come to a planned end. Sources say the decision was driven by a desire to close the story while it's still at its peak.`,
    `"${showTitle}" is ending — by choice. The announcement puts the series in rare company: a show that gets to say goodbye before the audience says it first.`,
    `The network has greenlit a final season of "${showTitle}." Industry observers note that a deliberate ending is increasingly seen as a mark of creative integrity.`,
    `A final season of "${showTitle}" has been confirmed. The creative team is expected to use the full order to deliver a conclusion they've been building toward.`,
  ];
  return {
    id: nanoid(), week: ctx.week, year: ctx.year, type: 'player', read: false, byline: byline(),
    headline: `"${showTitle}" to end with Season ${seasonNumber}`,
    body: randomItem(lines),
  };
}

export function makeCulturalPhenomenonNews(
  showTitle: string,
  seasonNumber: number,
  networkName: string,
  ctx: Ctx,
): NewsItem[] {
  return [
    {
      id: nanoid(), week: ctx.week, year: ctx.year, type: 'player', read: false,
      byline: 'Trade Wire Staff',
      headline: `"${showTitle}" series finale draws 50 million viewers — a record for the modern era`,
      body: `In a result that stunned even the most optimistic projections, the ${seasonNumber}-season finale of "${showTitle}" was watched by an estimated 50 million viewers. ${networkName} has not had a number like this in network history. Industry analysts say the figure may represent the single largest scripted audience in decades.`,
    },
    {
      id: nanoid(), week: ctx.week, year: ctx.year, type: 'player', read: false,
      byline: 'Marcus Oyelaran, Culture Desk',
      headline: `The night "${showTitle}" stopped everything`,
      body: `Restaurants reported empty dining rooms. Social media traffic spiked to Super Bowl levels. Coworkers who have never agreed on anything were texting each other at midnight. Whatever "${showTitle}" did across its run, the finale turned it into something rare — a moment everyone experienced at the same time.`,
    },
    {
      id: nanoid(), week: ctx.week, year: ctx.year, type: 'player', read: false,
      byline: 'Dana Kessler, The Trades',
      headline: `What 50 million viewers means for ${networkName} — and for the industry`,
      body: `The advertising and syndication value of a 50-million-viewer event is difficult to overstate. ${networkName} is expected to see a significant prestige uplift, talent negotiation leverage, and streaming rights demand in the wake of tonight's finale. Whether lightning can strike twice is beside the point — this kind of number writes its own legacy.`,
    },
  ];
}

export function makeSeriesFinaleNews(showTitle: string, seasonNumber: number, ctx: Ctx): NewsItem {
  const lines = [
    `The series finale of "${showTitle}" has aired, bringing a ${seasonNumber}-season run to a close. Reaction online is immediate and passionate.`,
    `It's over. "${showTitle}" signed off tonight with its series finale, completing a run that will be debated and celebrated for years.`,
    `"${showTitle}" aired its final episode tonight after ${seasonNumber} seasons. Whether the ending delivers is already being argued everywhere — which means it mattered.`,
    `The finale of "${showTitle}" is in the books. The show ends where all great series should: with the audience wanting to talk about it.`,
    `${seasonNumber} seasons. It's done. "${showTitle}" aired its series finale tonight, and the television landscape is a little quieter for it.`,
  ];
  return {
    id: nanoid(), week: ctx.week, year: ctx.year, type: 'player', read: false, byline: byline(),
    headline: `"${showTitle}" airs its series finale`,
    body: randomItem(lines),
  };
}