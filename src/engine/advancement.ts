import { GameState, Show, Season, Episode, ShowStatus, InboxItem } from '../types';
import {
  WRITING_WEEKS,
  FILMING_WEEKS,
  WEEKS_PER_YEAR,
  EMMY_NOMINATION_WEEK,
  EMMY_CEREMONY_WEEK,
  MAX_PITCHES_PER_YEAR,
  PITCH_GENERATE_CHANCE,
} from '../constants/game';
import { calculateQualityScore } from './quality';
import { calculateEpisodeRating } from './ratings';
import { generateSocialReactions } from './social';
import { advanceCompetitors } from './competitors';
import { calculateEmmyNominations, determineEmmyWinners } from './emmys';
import { generateStreamingOffer } from './streaming';
import { generatePitch } from './pitches';
import { makeIndustryNews, makeEmmyNominationsNews, makeEmmyCeremonyNews, makeFilmingWrapNews, makePremiereNews, makeFinaleNews } from './news';
import { nanoid } from '../utils/nanoid';
import { randomChance } from '../utils/random';

export function advanceWeek(state: GameState): GameState {
  const { currentWeek, currentYear } = state.network;
  const nextRaw = currentWeek + 1;
  const newWeek = nextRaw > WEEKS_PER_YEAR ? 1 : nextRaw;
  const newYear = nextRaw > WEEKS_PER_YEAR ? currentYear + 1 : currentYear;

  let network = { ...state.network, currentWeek: newWeek, currentYear: newYear };
  let talent = [...state.talent];
  const newInboxItems: InboxItem[] = [];
  const newNewsItems = [...state.newsItems];
  let awards = [...state.awards];
  let pitches = [...state.pitches];

  // ─── Advance shows ─────────────────────────────────────────────────────────
  const shows = state.shows.map(show => {
    const season = show.seasons[show.currentSeasonIndex];
    if (!season) return show;

    switch (show.status) {
      case 'writing':  return tickWriting(show, season);
      case 'filming':  return tickFilming(show, season, state);
      case 'marketing': return tickMarketing(show, season, newWeek, newYear);
      case 'airing':   return tickAiring(show, season, newWeek, newYear);
      default:         return show;
    }
  });

  // Detect filming→marketing transitions and generate wrap news
  for (let i = 0; i < state.shows.length; i++) {
    if (state.shows[i].status === 'filming' && shows[i].status === 'marketing') {
      newNewsItems.push(makeFilmingWrapNews(shows[i].title, { week: newWeek, year: newYear }));
    }
  }

  // Detect premiere and finale episode airings
  for (let i = 0; i < state.shows.length; i++) {
    const before = state.shows[i].seasons[state.shows[i].currentSeasonIndex];
    const after = shows[i].seasons[shows[i].currentSeasonIndex];
    if (!before || !after) continue;
    if (state.shows[i].status === 'airing' || shows[i].status === 'renewal-pending') {
      if (before.episodesAired === 0 && after.episodesAired === 1) {
        newNewsItems.push(makePremiereNews(shows[i].title, shows[i].genre, { week: newWeek, year: newYear }));
      } else if (before.episodesAired === before.episodeCount - 1 && after.episodesAired === after.episodeCount) {
        newNewsItems.push(makeFinaleNews(shows[i].title, after.seasonNumber, { week: newWeek, year: newYear }));
      }
    }
  }

  // ─── Ad revenue: accumulate cash from episodes that aired this week ────────
  let revenueThisWeek = 0;
  for (const show of shows) {
    const season = show.seasons[show.currentSeasonIndex];
    if (!season || show.status !== 'airing') continue;
    const latestEp = season.episodes[season.episodesAired - 1];
    if (latestEp?.weekAired === newWeek && latestEp?.yearAired === newYear) {
      revenueThisWeek += latestEp.adRevenue ?? 0;
    }
  }
  network = {
    ...network,
    cashOnHand: network.cashOnHand + revenueThisWeek,
    careerEarnings: network.careerEarnings + revenueThisWeek,
  };

  // ─── Check for completed seasons → streaming offers ───────────────────────
  const updatedShows = shows.map(show => {
    if (show.status !== 'renewal-pending') return show;
    const season = show.seasons[show.currentSeasonIndex];
    if (!season || season.streamingOfferReceived) return show;

    const offer = generateStreamingOffer(
      show,
      season,
      network.prestige,
      network.emmysWon,
      newWeek,
      newYear,
    );

    if (!offer) return show;

    const updatedSeason: Season = {
      ...season,
      streamingOfferReceived: true,
      streamingOfferAmount: offer.amount,
      streamingOfferSource: offer.platformName,
      streamingOfferExpiresWeek: offer.expiresWeek,
      streamingOfferExpiresYear: offer.expiresYear,
    };
    const updatedSeasons = [...show.seasons];
    updatedSeasons[show.currentSeasonIndex] = updatedSeason;

    newInboxItems.push({
      id: nanoid(),
      type: 'streaming-offer',
      week: newWeek,
      year: newYear,
      read: false,
      refID: show.id,
      title: `${offer.platformName} offering $${formatM(offer.amount)} for "${show.title}"`,
      preview: `Expires week ${offer.expiresWeek}, Year ${offer.expiresYear}`,
    });

    return { ...show, seasons: updatedSeasons };
  });

  // ─── Expire old pitches ────────────────────────────────────────────────────
  pitches = pitches.filter(p => {
    if (p.greenlitByPlayer || p.passed) return false; // clean up acted-on pitches
    const expired =
      p.expiresYear < newYear ||
      (p.expiresYear === newYear && p.expiresWeek <= newWeek);
    return !expired;
  });

  // ─── Maybe generate a new pitch ────────────────────────────────────────────
  const pitchesThisYear = pitches.filter(p => p.submittedYear === newYear).length;
  if (pitchesThisYear < MAX_PITCHES_PER_YEAR && randomChance(PITCH_GENERATE_CHANCE)) {
    const showrunners = talent.filter(
      t => t.role === 'showrunner' && t.available && t.prestigeRequired <= network.prestige,
    );
    const pitch = generatePitch(showrunners, newWeek, newYear);
    if (pitch) {
      pitches = [...pitches, pitch];
      const showrunner = talent.find(t => t.id === pitch.showrunnerID);
      newInboxItems.push({
        id: nanoid(),
        type: 'pitch',
        week: newWeek,
        year: newYear,
        read: false,
        refID: pitch.id,
        title: `New pitch: "${pitch.title}"`,
        preview: `${pitch.genre} · Showrunner: ${showrunner?.name ?? 'Unknown'}`,
      });
    }
  }

  // ─── Advance competitors ───────────────────────────────────────────────────
  const { updatedCompetitors, newsItems: competitorNews } =
    advanceCompetitors(state.competitors, newWeek, newYear);
  newNewsItems.push(...competitorNews);

  // ─── Industry news (occasional) ───────────────────────────────────────────
  if (randomChance(0.12)) {
    newNewsItems.push(makeIndustryNews({ week: newWeek, year: newYear }));
  }

  // ─── Emmy nomination week ──────────────────────────────────────────────────
  if (newWeek === EMMY_NOMINATION_WEEK) {
    const nominations = calculateEmmyNominations(updatedShows, talent, newYear);
    awards = [...awards, ...nominations];

    const playerNoms = nominations.filter(n =>
      updatedShows.some(s => s.id === n.showID),
    );

    if (playerNoms.length > 0) {
      const topShow = updatedShows.find(s => s.id === playerNoms[0].showID);
      newInboxItems.push({
        id: nanoid(),
        type: 'emmy-nominations',
        week: newWeek,
        year: newYear,
        read: false,
        refID: String(newYear),
        title: 'Emmy nominations announced',
        preview: `${playerNoms.length} nomination${playerNoms.length > 1 ? 's' : ''} for your shows`,
      });
      newNewsItems.push(
        makeEmmyNominationsNews(playerNoms.length, topShow?.title ?? 'your show', {
          week: newWeek,
          year: newYear,
        }),
      );

      network = {
        ...network,
        emmyNominations: network.emmyNominations + playerNoms.length,
      };
    }
  }

  // ─── Emmy ceremony week ────────────────────────────────────────────────────
  if (newWeek === EMMY_CEREMONY_WEEK) {
    const thisYearNoms = awards.filter(a => a.year === newYear);
    const withWinners = determineEmmyWinners(thisYearNoms);
    awards = [...awards.filter(a => a.year !== newYear), ...withWinners];

    const playerWins = withWinners.filter(
      a => a.won && updatedShows.some(s => s.id === a.showID),
    );

    newInboxItems.push({
      id: nanoid(),
      type: 'emmy-ceremony',
      week: newWeek,
      year: newYear,
      read: false,
      refID: String(newYear),
      title: playerWins.length > 0
        ? `You won ${playerWins.length} Emmy${playerWins.length > 1 ? 's' : ''}!`
        : 'Emmy ceremony results',
      preview: playerWins.length > 0
        ? 'Tap to see the full results'
        : 'No wins this year — tap to see results',
    });

    newNewsItems.push(
      makeEmmyCeremonyNews(playerWins.length, { week: newWeek, year: newYear }),
    );

    if (playerWins.length > 0) {
      network = {
        ...network,
        emmysWon: network.emmysWon + playerWins.length,
        prestige: Math.min(100, network.prestige + playerWins.length * 3),
      };
    }
  }

  return {
    ...state,
    network,
    shows: updatedShows,
    talent,
    pitches,
    competitors: updatedCompetitors,
    awards,
    newsItems: newNewsItems.slice(-150),
    inboxItems: [...state.inboxItems, ...newInboxItems],
    lastSaved: state.lastSaved,
  };
}

// ─── Stage tick functions ──────────────────────────────────────────────────────

function tickWriting(show: Show, season: Season): Show {
  const completed = season.writingWeeksCompleted + 1;
  const updatedSeason = { ...season, writingWeeksCompleted: completed };
  const status: ShowStatus = completed >= WRITING_WEEKS ? 'filming' : 'writing';
  return updateShow(show, updatedSeason, status);
}

function tickFilming(show: Show, season: Season, state: GameState): Show {
  const castFull =
    season.leadActorIDs.length >= season.leadActorSlots &&
    season.supportingActorIDs.length >= season.supportingActorSlots;
  if (!season.directorID || !castFull) return show; // waiting on player

  const completed = season.filmingWeeksCompleted + 1;
  let updatedSeason = { ...season, filmingWeeksCompleted: completed };

  if (completed >= FILMING_WEEKS) {
    const showrunner = state.talent.find(t => t.id === season.showrunnerID);
    const director = state.talent.find(t => t.id === season.directorID!);
    const allActorIDs = [...season.leadActorIDs, ...season.supportingActorIDs];
    const cast = allActorIDs
      .map(id => state.talent.find(t => t.id === id))
      .filter((t): t is NonNullable<typeof t> => t !== undefined);

    if (showrunner && director) {
      const qualityScore = calculateQualityScore(showrunner, director, cast);
      updatedSeason = { ...updatedSeason, qualityScore };
    }

    return updateShow(show, updatedSeason, 'marketing');
  }

  return updateShow(show, updatedSeason, 'filming');
}

function tickMarketing(
  show: Show,
  season: Season,
  newWeek: number,
  newYear: number,
): Show {
  if (season.airDateWeek === null || season.airDateYear === null) return show; // player hasn't set air date

  const pastAirDate =
    newYear > season.airDateYear ||
    (newYear === season.airDateYear && newWeek >= season.airDateWeek);

  if (pastAirDate) {
    const updatedSeason = {
      ...season,
      marketingWeeksCompleted: season.marketingWeeksTotal,
    };
    return updateShow(show, updatedSeason, 'airing');
  }

  const updatedSeason = {
    ...season,
    marketingWeeksCompleted: season.marketingWeeksCompleted + 1,
  };
  return updateShow(show, updatedSeason, 'marketing');
}

function tickAiring(
  show: Show,
  season: Season,
  newWeek: number,
  newYear: number,
): Show {
  const nextIndex = season.episodesAired;
  if (nextIndex >= season.episodeCount) {
    return updateShow(show, season, 'renewal-pending');
  }

  const prevEpisodes = season.episodes.filter(ep => ep.rating !== null);
  const { rating, viewers, adRevenue } = calculateEpisodeRating(
    season,
    nextIndex + 1,
    show.genre,
    prevEpisodes,
  );

  const reactions = generateSocialReactions(show.title, nextIndex + 1, rating);

  const updatedEpisodes = [...season.episodes];
  updatedEpisodes[nextIndex] = {
    ...updatedEpisodes[nextIndex],
    rating,
    viewers,
    adRevenue,
    weekAired: newWeek,
    yearAired: newYear,
    socialReactions: reactions,
  };

  const newEpisodesAired = season.episodesAired + 1;
  const updatedSeason: Season = {
    ...season,
    episodes: updatedEpisodes,
    episodesAired: newEpisodesAired,
    totalViewers: season.totalViewers + viewers,
    totalAdRevenue: season.totalAdRevenue + adRevenue,
  };

  const status: ShowStatus =
    newEpisodesAired >= season.episodeCount ? 'renewal-pending' : 'airing';

  return updateShow(show, updatedSeason, status);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function updateShow(show: Show, season: Season, status: ShowStatus): Show {
  const seasons = [...show.seasons];
  seasons[show.currentSeasonIndex] = season;
  return { ...show, status, seasons };
}

function formatM(n: number): string {
  return `${(n / 1_000_000).toFixed(1)}M`;
}
