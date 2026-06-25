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
        ? `Your network received ${playerNomCount} nomination${playerNomCount > 1 ? 's' : ''} this year. The full nominees list has critics already picking frontrunners.`
        : `This year's nominees are in. Critics are debating which shows have the momentum heading into the ceremony.`,
  };
}

export function makeEmmyCeremonyNews(playerWins: number, ctx: Ctx): NewsItem {
  return {
    id: nanoid(),
    week: ctx.week,
    year: ctx.year,
    type: 'emmy',
    read: false,
    headline: playerWins > 0 ? `Emmy night: your network wins ${playerWins}` : 'Emmy ceremony concludes',
    body:
      playerWins > 0
        ? `A strong night at the Emmys. Winners are celebrating and the industry is taking note of your network's growing prestige.`
        : `The ceremony is over. The industry moves on, and so does the competition for next year's slate.`,
  };
}
