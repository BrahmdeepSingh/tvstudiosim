import { GameState, Show, Season, Episode, ShowStatus, InboxItem } from '../types';
import {
  WRITING_WEEKS,
  WEEKS_PER_YEAR,
  EMMY_NOMINATION_WEEK,
  EMMY_CEREMONY_WEEK,
  MAX_PITCHES_PER_YEAR,
  PITCH_GENERATE_CHANCE,
} from '../constants/game';
import { calculateScriptScore, calculateQualityScore } from './quality';
import { calculateEpisodeRating } from './ratings';
import { generateSocialReactions } from './social';
import { advanceCompetitors } from './competitors';
import { calculateEmmyNominations, determineEmmyWinners } from './emmys';
import { tryGenerateStreamingOffer, scheduleNextOfferCheck } from './streaming';
import { generatePitch } from './pitches';
import { makeIndustryNews, makeEmmyNominationsNews, makeEmmyCeremonyNews, makeFilmingWrapNews, makePremiereNews, makeFinaleNews } from './news';
import { tryGenerateStudioEvent } from './events';
import { nanoid } from '../utils/nanoid';
import { randomChance, randomBetween } from '../utils/random';

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
      case 'writing':  return tickWriting(show, season, state);
      case 'filming':  return tickFilming(show, season, state);
      case 'marketing': return tickMarketing(show, season, newWeek, newYear);
      case 'airing':   return tickAiring(show, season, newWeek, newYear);
      default:         return show;
    }
  });

  // Detect filming→marketing transitions: generate wrap news and free cast/director
  for (let i = 0; i < state.shows.length; i++) {
    if (state.shows[i].status === 'filming' && shows[i].status === 'marketing') {
      newNewsItems.push(makeFilmingWrapNews(shows[i].title, { week: newWeek, year: newYear }));

      // Filming is done — cast and director are free to take other work
      const wrappedSeason = shows[i].seasons[shows[i].currentSeasonIndex];
      const freedIDs = new Set([
        ...wrappedSeason.leadActorIDs,
        ...wrappedSeason.supportingActorIDs,
        wrappedSeason.directorID,
      ].filter(Boolean) as string[]);

      talent = talent.map(t =>
        freedIDs.has(t.id) ? { ...t, available: true, bookedForSeasonID: null } : t
      );
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

  // ─── Streaming: expire offers, run scheduled checks, generate offers ─────────
  const updatedShows = shows.map(show => {
    let s = show;

    // Expire pending offer → schedule re-check in 4–16 weeks
    if (s.pendingStreamingOffer) {
      const o = s.pendingStreamingOffer;
      const expired =
        newYear > o.expiresYear ||
        (newYear === o.expiresYear && newWeek > o.expiresWeek);
      if (expired) {
        const { checkWeek, checkYear } = scheduleNextOfferCheck(newWeek, newYear, 4, 16);
        s = { ...s, pendingStreamingOffer: null, streamingOfferCheckWeek: checkWeek, streamingOfferCheckYear: checkYear };
      }
    }

    // Count completed seasons — if more than we last checked, a new season is ready
    const completedCount = s.seasons.filter(se => se.episodesAired >= se.episodeCount).length;
    const newSeasonReady = completedCount > s.streamingCheckedAtSeasonCount;

    // Check if a scheduled check is now due
    const checkDue =
      s.streamingOfferCheckWeek !== null &&
      s.streamingOfferCheckYear !== null &&
      newYear === s.streamingOfferCheckYear &&
      newWeek >= s.streamingOfferCheckWeek;

    if ((newSeasonReady || checkDue) && !s.pendingStreamingOffer) {
      if (checkDue) {
        s = { ...s, streamingOfferCheckWeek: null, streamingOfferCheckYear: null };
      }

      // Mark this season count as evaluated (prevents re-running same check every week)
      s = { ...s, streamingCheckedAtSeasonCount: completedCount };

      const activeExclusive = s.streamingDeals.find(
        d => d.dealType === 'exclusive' && d.expiresYear >= newYear,
      );

      if (activeExclusive) {
        // Blocked — schedule check for the year after the deal expires
        const checkWeek = randomBetween(1, 8);
        s = { ...s, streamingOfferCheckWeek: checkWeek, streamingOfferCheckYear: activeExclusive.expiresYear + 1 };
      } else {
        const offer = tryGenerateStreamingOffer(s, newWeek, newYear);
        if (offer) {
          s = { ...s, pendingStreamingOffer: offer };
          const seasonsLabel =
            offer.seasonsToInclude.length === 1
              ? `S${offer.seasonsToInclude[0]}`
              : `${offer.seasonsToInclude.length} seasons`;
          newInboxItems.push({
            id: nanoid(),
            type: 'streaming-offer',
            week: newWeek,
            year: newYear,
            read: false,
            refID: show.id,
            title: `${offer.platformName} wants streaming rights to "${show.title}"`,
            preview: `${seasonsLabel} · Up to $${formatM(offer.exclusiveAmount)} (excl) · Expires Wk ${offer.expiresWeek}, Yr ${offer.expiresYear}`,
          });
        }
      }
    }

    return s;
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
      t => t.role === 'showrunner' && t.available,
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
  const { updatedCompetitors, newsItems: competitorNews, updatedTalent: talentAfterCompetitors } =
    advanceCompetitors(state.competitors, talent, newWeek, newYear);
  talent = talentAfterCompetitors;
  newNewsItems.push(...competitorNews);
  let finalCompetitors = updatedCompetitors;

  // ─── Industry news (occasional) ───────────────────────────────────────────
  if (randomChance(0.12)) {
    newNewsItems.push(makeIndustryNews({ week: newWeek, year: newYear }));
  }

  // ─── Emmy nomination week ──────────────────────────────────────────────────
  if (newWeek === EMMY_NOMINATION_WEEK) {
    const nominations = calculateEmmyNominations(updatedShows, talent, updatedCompetitors, newYear);
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

    // Propagate competitor Emmy wins → studio stats
    const competitorWinsByStudio = new Map<string, number>();
    for (const win of withWinners.filter(a => a.won && !a.isPlayerAward)) {
      for (const studio of finalCompetitors) {
        if (studio.activeShows.some(sh => sh.id === win.showID)) {
          competitorWinsByStudio.set(studio.id, (competitorWinsByStudio.get(studio.id) ?? 0) + 1);
        }
      }
    }
    if (competitorWinsByStudio.size > 0) {
      finalCompetitors = finalCompetitors.map(studio => {
        const wins = competitorWinsByStudio.get(studio.id) ?? 0;
        if (wins === 0) return studio;
        return {
          ...studio,
          emmysWon: studio.emmysWon + wins,
          prestige: Math.min(100, studio.prestige + wins * 3),
        };
      });
    }

    // Find top competitor winner for news
    let topCompetitor: { studioName: string; wins: number } | null = null;
    if (competitorWinsByStudio.size > 0) {
      const topEntry = [...competitorWinsByStudio.entries()].sort((a, b) => b[1] - a[1])[0];
      const topStudio = finalCompetitors.find(s => s.id === topEntry[0]);
      if (topStudio) topCompetitor = { studioName: topStudio.name, wins: topEntry[1] };
    }

    // Propagate Emmy wins into individual talent award records
    const talentWins = withWinners.filter(
      a => a.won && a.talentID && !a.talentID.startsWith('comp-'),
    );
    if (talentWins.length > 0) {
      talent = talent.map(t => {
        const wins = talentWins.filter(a => a.talentID === t.id);
        if (wins.length === 0) return t;
        return { ...t, awards: [...t.awards, ...wins] };
      });
    }

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
      makeEmmyCeremonyNews(playerWins.length, topCompetitor, { week: newWeek, year: newYear }),
    );

    if (playerWins.length > 0) {
      network = {
        ...network,
        emmysWon: network.emmysWon + playerWins.length,
        prestige: Math.min(100, network.prestige + playerWins.length * 3),
      };
    }
  }

  // Prune TalentDeal records for talent that is no longer booked
  const bookedTalentIDs = new Set(talent.filter(t => !t.available).map(t => t.id));
  const prunedDeals = state.talentDeals.filter(d => bookedTalentIDs.has(d.talentID));

  // ─── Studio events ────────────────────────────────────────────────────────
  const partialState = {
    ...state,
    network,
    shows: updatedShows,
    talent,
    pitches,
    competitors: finalCompetitors,
    awards,
    studioEvents: state.studioEvents ?? [],
  };
  const newStudioEvent = tryGenerateStudioEvent(partialState, newWeek, newYear);
  const studioEvents = newStudioEvent
    ? [...partialState.studioEvents, newStudioEvent]
    : partialState.studioEvents;
  if (newStudioEvent) {
    newInboxItems.push({
      id: nanoid(),
      type: 'studio-event',
      week: newWeek,
      year: newYear,
      read: false,
      refID: newStudioEvent.id,
      title: newStudioEvent.title,
      preview: newStudioEvent.body.slice(0, 90) + (newStudioEvent.body.length > 90 ? '…' : ''),
    });
  }

  return {
    ...state,
    network,
    shows: updatedShows,
    talent,
    pitches,
    talentDeals: prunedDeals,
    competitors: finalCompetitors,
    awards,
    studioEvents,
    newsItems: newNewsItems.slice(-150),
    inboxItems: [...state.inboxItems, ...newInboxItems],
    lastSaved: state.lastSaved,
  };
}

// ─── Stage tick functions ──────────────────────────────────────────────────────

function tickWriting(show: Show, season: Season, state: GameState): Show {
  const completed = season.writingWeeksCompleted + 1;
  let updatedSeason = { ...season, writingWeeksCompleted: completed };

  if (completed >= WRITING_WEEKS) {
    const showrunner = state.talent.find(t => t.id === season.showrunnerID);
    if (showrunner) {
      updatedSeason = { ...updatedSeason, scriptScore: calculateScriptScore(showrunner) };
    }
    return updateShow(show, updatedSeason, 'filming');
  }

  return updateShow(show, updatedSeason, 'writing');
}

function tickFilming(show: Show, season: Season, state: GameState): Show {
  const castFull =
    season.leadActorIDs.length >= season.leadActorSlots &&
    season.supportingActorIDs.length >= season.supportingActorSlots;
  if (!season.directorID || !castFull) return show; // waiting on player

  const completed = season.filmingWeeksCompleted + 1;
  let updatedSeason = { ...season, filmingWeeksCompleted: completed };

  if (completed >= season.filmingWeeksTotal) {
    const director = state.talent.find(t => t.id === season.directorID!);
    const allActorIDs = [...season.leadActorIDs, ...season.supportingActorIDs];
    const cast = allActorIDs
      .map(id => state.talent.find(t => t.id === id))
      .filter((t): t is NonNullable<typeof t> => t !== undefined);

    if (director) {
      const qualityScore = calculateQualityScore(director, cast);
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