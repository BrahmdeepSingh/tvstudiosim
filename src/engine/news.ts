import { NewsItem, CompetitorStudio, CompetitorShow } from '../types';
import { nanoid } from '../utils/nanoid';
import { randomItem } from '../utils/random';

interface Ctx { week: number; year: number }

export function makeCompetitorCancelledNews(
  studio: CompetitorStudio,
  show: CompetitorShow,
  ctx: Ctx,
): NewsItem {
  return {
    id: nanoid(),
    week: ctx.week,
    year: ctx.year,
    type: 'competitor',
    read: false,
    headline: `${studio.name} cancels "${show.title}" after disappointing run`,
    body: `Sources say low ratings and weak advertiser interest forced the decision. "${show.title}" had been positioned as a ${show.genre} tentpole for the network.`,
  };
}

export function makeCompetitorRenewedNews(
  studio: CompetitorStudio,
  show: CompetitorShow,
  ctx: Ctx,
): NewsItem {
  return {
    id: nanoid(),
    week: ctx.week,
    year: ctx.year,
    type: 'competitor',
    read: false,
    headline: `${studio.name} renews "${show.title}" for season ${show.seasonNumber + 1}`,
    body: `Strong ratings and audience loyalty made the renewal an easy call. The show has been one of the network's most consistent performers.`,
  };
}

export function makeCompetitorGreenlitNews(
  studio: CompetitorStudio,
  show: CompetitorShow,
  ctx: Ctx,
): NewsItem {
  return {
    id: nanoid(),
    week: ctx.week,
    year: ctx.year,
    type: 'competitor',
    read: false,
    headline: `${studio.name} greenlights new ${show.genre} series "${show.title}"`,
    body: `The network is moving fast with the project, which is expected to go to series later this year.`,
  };
}

export function makeCompetitorPremiereNews(
  studio: CompetitorStudio,
  show: CompetitorShow,
  ctx: Ctx,
): NewsItem {
  return {
    id: nanoid(),
    week: ctx.week,
    year: ctx.year,
    type: 'competitor',
    read: false,
    headline: `"${show.title}" premieres on ${studio.name}`,
    body: `The ${show.genre} series, ${show.seasonNumber > 1 ? `now in its ${ordinal(show.seasonNumber)} season, ` : ''}kicks off its run this week. Early numbers will set the tone for the rest of the season.`,
  };
}

export function makeCompetitorCompletedNews(
  studio: CompetitorStudio,
  show: CompetitorShow,
  ctx: Ctx,
): NewsItem {
  return {
    id: nanoid(),
    week: ctx.week,
    year: ctx.year,
    type: 'competitor',
    read: false,
    headline: `"${show.title}" wraps ${ordinal(show.seasonNumber)} season on ${studio.name} — no renewal`,
    body: `The ${show.genre} series has aired its season finale. The network has decided not to renew, bringing the show's run to a close after ${show.episodesAired} episodes.`,
  };
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

const INDUSTRY_STORIES = [
  {
    headline: 'Prestige drama continues to dominate awards conversation',
    body: 'Networks doubling down on limited series and event television as audiences demand higher quality.',
  },
  {
    headline: 'Reality programming sees viewership surge heading into fall',
    body: 'Unscripted formats delivering outsized ad revenue as production costs remain low compared to scripted drama.',
  },
  {
    headline: 'Streaming platforms aggressive in pursuing cable content deals',
    body: 'Multiple platforms are increasing acquisition budgets, with premium cable shows at the top of their wishlists.',
  },
  {
    headline: 'Procedural dramas remain reliable performers for mid-tier networks',
    body: 'Consistent viewership and strong syndication value making procedurals attractive for networks seeking stability over prestige.',
  },
  {
    headline: 'Sci-fi audience growing as streaming drives genre experimentation',
    body: 'What was once a niche category is now a mainstream draw, with several recent entries crossing over to broad audiences.',
  },
  {
    headline: 'Network ad revenue climbs on strength of live event viewership',
    body: 'Advertisers paying premiums for live and appointment television as time-shifted viewing erodes value of traditional spots.',
  },
];

export function makeIndustryNews(ctx: Ctx): NewsItem {
  const story = randomItem(INDUSTRY_STORIES);
  return {
    id: nanoid(),
    week: ctx.week,
    year: ctx.year,
    type: 'industry',
    read: false,
    ...story,
  };
}

export function makeEmmyNominationsNews(
  playerNomCount: number,
  topShowTitle: string,
  networkName: string,
  ctx: Ctx,
): NewsItem {
  return {
    id: nanoid(),
    week: ctx.week,
    year: ctx.year,
    type: 'emmy',
    read: false,
    headline: `Emmy nominations announced — "${topShowTitle}" leads the conversation`,
    body:
      playerNomCount > 0
        ? `${networkName} received ${playerNomCount} nomination${playerNomCount > 1 ? 's' : ''} this year. The full nominees list has critics already picking frontrunners.`
        : `This year's nominees are in. Critics are debating which shows have the momentum heading into the ceremony.`,
  };
}

export function makeFilmingWrapNews(showTitle: string, ctx: Ctx): NewsItem {
  const lines = [
    `Principal photography has officially wrapped on "${showTitle}". The production is now entering post-production ahead of its marketing push.`,
    `"${showTitle}" has finished filming. Sources on set say the production went smoothly, with the crew delivering the final shot ahead of schedule.`,
    `Cameras are down on "${showTitle}" after a successful shoot. The network is preparing its marketing campaign as the show heads toward broadcast.`,
  ];
  const body = lines[Math.floor(Math.random() * lines.length)];
  return {
    id: nanoid(),
    week: ctx.week,
    year: ctx.year,
    type: 'industry',
    read: false,
    headline: `"${showTitle}" wraps principal photography`,
    body,
  };
}

export function makePremiereNews(showTitle: string, genre: string, ctx: Ctx): NewsItem {
  const lines = [
    `Audiences tuned in for the series premiere of "${showTitle}" tonight. Early social reaction has been strong.`,
    `"${showTitle}" opened to eager viewers. Critics and fans are already weighing in on the debut episode.`,
    `The first episode of "${showTitle}" has aired. The ${genre} series is now officially part of the conversation.`,
  ];
  return {
    id: nanoid(),
    week: ctx.week,
    year: ctx.year,
    type: 'player',
    read: false,
    headline: `"${showTitle}" premieres tonight`,
    body: lines[Math.floor(Math.random() * lines.length)],
  };
}

export function makeFinaleNews(showTitle: string, seasonNumber: number, ctx: Ctx): NewsItem {
  const lines = [
    `The Season ${seasonNumber} finale of "${showTitle}" has aired. Fan reaction to the ending is pouring in.`,
    `"${showTitle}" wraps Season ${seasonNumber} tonight. The finale leaves viewers with plenty to talk about.`,
    `Season ${seasonNumber} of "${showTitle}" comes to a close. The network will now weigh renewal options.`,
  ];
  return {
    id: nanoid(),
    week: ctx.week,
    year: ctx.year,
    type: 'player',
    read: false,
    headline: `"${showTitle}" airs its Season ${seasonNumber} finale`,
    body: lines[Math.floor(Math.random() * lines.length)],
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

  return { id: nanoid(), week: ctx.week, year: ctx.year, type: 'emmy', read: false, headline, body };
}