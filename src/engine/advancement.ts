import { GameState, Show, Season, Episode, ShowStatus, InboxItem, TalentDeal, Talent } from '../types';
import {
  WRITING_WEEKS,
  WEEKS_PER_YEAR,
  EMMY_NOMINATION_WEEK,
  EMMY_CEREMONY_WEEK,
  MAX_PITCHES_PER_YEAR,
  PITCH_GENERATE_CHANCE,
  GENRE_CONFIG,
} from '../constants/game';
import { calculateScriptScore, calculateQualityScore } from './quality';
import { calculateEpisodeRating } from './ratings';
import { generateSocialReactions, SOCIAL_TEMPLATE_COOLDOWN } from './social';
import { generateAmbientSocialPosts, AMBIENT_TEMPLATE_COOLDOWN, AmbientSocialPost } from './ambientsocial';
import { generateEmmyNominationPosts, generateEmmyWinPosts, generateSeriesFinaleAiredPosts, generateCulturalPhenomenonPosts } from './milestonesocial';
import { advanceCompetitors } from './competitors';
import { calculateEmmyNominations, determineEmmyWinners } from './emmys';
import { tryGenerateStreamingOffer, scheduleNextOfferCheck } from './streaming';
import { generatePitch } from './pitches';
import { generateReplacementTalent } from './talent';
import { makeIndustryNews, makeEmmyNominationsNews, makeEmmyCeremonyNews, makeFilmingWrapNews, makePremiereNews, makeFinaleNews, makeSeriesFinaleNews, makeCulturalPhenomenonNews, makeLoanDefaultNews } from './news';
import { tryGenerateStudioEvent } from './events';
import { nanoid } from '../utils/nanoid';
import { randomChance, randomBetween } from '../utils/random';
import { getViewershipMultiplier } from '../constants/schedule';

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
  let emmyCeremonyPendingYear: number | null = state.emmyCeremonyPendingYear ?? null;
  const socialTemplateTracker = { ids: [...state.recentSocialTemplateIds] };
  const milestoneAmbientPosts: AmbientSocialPost[] = [];

  // ─── Advance shows ─────────────────────────────────────────────────────────
  const shows = state.shows.map(show => {
    const season = show.seasons[show.currentSeasonIndex];
    if (!season) return show;

    switch (show.status) {
      case 'writing':  return tickWriting(show, season, state);
      case 'filming':  return tickFilming(show, season, state);
      case 'marketing': return tickMarketing(show, season, newWeek, newYear);
      case 'airing':   return tickAiring(show, season, newWeek, newYear, socialTemplateTracker, talent);
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

  // Detect premiere, season finale, and series finale airings
  for (let i = 0; i < state.shows.length; i++) {
    const before = state.shows[i].seasons[state.shows[i].currentSeasonIndex];
    const after = shows[i].seasons[shows[i].currentSeasonIndex];
    if (!before || !after) continue;

    const wasAiring = state.shows[i].status === 'airing';
    const nowEnded = shows[i].status === 'renewal-pending' || shows[i].status === 'cancelled';

    if (wasAiring || nowEnded) {
      if (before.episodesAired === 0 && after.episodesAired === 1) {
        newNewsItems.push(makePremiereNews(shows[i].title, shows[i].genre, { week: newWeek, year: newYear }));
      } else if (before.episodesAired === before.episodeCount - 1 && after.episodesAired === after.episodeCount) {
        if (after.isFinalSeason) {
          // Series finale — distinct news, social posts, and showrunner release
          newNewsItems.push(makeSeriesFinaleNews(shows[i].title, after.seasonNumber, { week: newWeek, year: newYear }));
          milestoneAmbientPosts.push(
            ...generateSeriesFinaleAiredPosts(shows[i].title, after.seasonNumber, newWeek, newYear),
          );
          // Free the showrunner(s) (cast/director were already freed at filming→marketing)
          const srIDs = new Set(after.showrunnerIDs.filter(Boolean));
          if (srIDs.size > 0) {
            talent = talent.map(t => srIDs.has(t.id) ? { ...t, available: true, bookedForSeasonID: null } : t);
          }
        } else {
          newNewsItems.push(makeFinaleNews(shows[i].title, after.seasonNumber, { week: newWeek, year: newYear }));
        }
      }
    }
  }

  // ─── Cultural phenomenon easter egg ──────────────────────────────────────────
  // Fires at most once per playthrough. Conditions: player-declared final season,
  // finale episode rating ≥ 9.0, and ≥ 2 prior seasons each averaging ≥ 8.5.
  // The existing-50M-episode check is the one-shot guard.
  const phenomenonAlreadyFired = state.shows.some(sh =>
    sh.seasons.some(se => se.episodes.some(ep => (ep.viewers ?? 0) >= 50_000_000)),
  );
  if (!phenomenonAlreadyFired) {
    for (let i = 0; i < shows.length; i++) {
      const before = state.shows[i].seasons[state.shows[i].currentSeasonIndex];
      const after = shows[i].seasons[shows[i].currentSeasonIndex];
      if (!before || !after || !after.isFinalSeason) continue;

      const finaleJustAired =
        state.shows[i].status === 'airing' &&
        before.episodesAired === before.episodeCount - 1 &&
        after.episodesAired === after.episodeCount;
      if (!finaleJustAired) continue;

      const finaleEp = after.episodes[after.episodeCount - 1];
      if (!finaleEp || (finaleEp.rating ?? 0) < 9.0) continue;

      // Require ≥ 2 prior seasons (not the current final season) each averaging ≥ 8.5
      const currentShow = shows[i];
      const priorSeasons = currentShow.seasons.slice(0, currentShow.currentSeasonIndex);
      const strongPriorCount = priorSeasons.filter(se => {
        const rated = se.episodes.filter(e => e.rating !== null);
        return rated.length > 0 && rated.reduce((s, e) => s + (e.rating ?? 0), 0) / rated.length >= 8.5;
      }).length;
      if (strongPriorCount < 2) continue;

      // Recompute ad revenue from 50 M viewers using the same formula as ratings.ts
      const genreConfig = GENRE_CONFIG[currentShow.genre];
      const effectiveCPM = genreConfig.cpm * (1 + ((finaleEp.rating ?? 9.0) - 5) / 10);
      const phenomenonAdRevenue = Math.round((50_000_000 / 1000) * effectiveCPM);
      const adRevenueDelta = phenomenonAdRevenue - (finaleEp.adRevenue ?? 0);

      const updatedEps = [...after.episodes];
      updatedEps[after.episodeCount - 1] = {
        ...finaleEp,
        viewers: 50_000_000,
        adRevenue: phenomenonAdRevenue,
      };
      const patchedSeason: Season = {
        ...after,
        episodes: updatedEps,
        totalViewers: after.totalViewers - (finaleEp.viewers ?? 0) + 50_000_000,
        totalAdRevenue: after.totalAdRevenue + adRevenueDelta,
      };
      const patchedSeasons = [...currentShow.seasons];
      patchedSeasons[currentShow.currentSeasonIndex] = patchedSeason;
      shows[i] = { ...currentShow, seasons: patchedSeasons };

      network = { ...network, prestige: Math.min(100, network.prestige + 8) };

      // Flood the news feed and social feed — every outlet covers this
      newNewsItems.push(...makeCulturalPhenomenonNews(currentShow.title, after.seasonNumber, network.name, { week: newWeek, year: newYear }));
      milestoneAmbientPosts.push(...generateCulturalPhenomenonPosts(currentShow.title, after.seasonNumber, newWeek, newYear));

      newInboxItems.push({
        id: nanoid(),
        type: 'studio-event',
        week: newWeek,
        year: newYear,
        read: false,
        refID: currentShow.id,
        title: 'Cultural Phenomenon',
        preview: `"${currentShow.title}" just made history — 50 million viewers watched the series finale live. A moment the industry will never forget.`,
      });

      break; // one-shot: never fires again this playthrough
    }
  }

  // ─── Viewership-based popularity growth (fires when a season finishes) ───────
  // Boosts lead actors, director, and showrunner based on how the season performed
  // relative to the genre's baseline viewership. Diminishing returns for high-pop
  // talent so Unknown→D-List is easier than C-List→B-List.
  for (let i = 0; i < state.shows.length; i++) {
    const wasAiring = state.shows[i].status === 'airing';
    const nowWrapped =
      shows[i].status === 'renewal-pending' ||
      (shows[i].status === 'cancelled' && shows[i].cancelledClean);
    if (!wasAiring || !nowWrapped) continue;

    const season = shows[i].seasons[shows[i].currentSeasonIndex];
    if (!season) continue;

    const config = GENRE_CONFIG[shows[i].genre];
    const airedEps = season.episodes.filter(ep => ep.viewers != null && ep.viewers > 0);
    if (airedEps.length === 0) continue;

    const avgViewers = airedEps.reduce((sum, ep) => sum + (ep.viewers ?? 0), 0) / airedEps.length;
    const viewerRatio = avgViewers / config.baseViewers;

    const baseGain =
      viewerRatio >= 2.0 ? 6 :
      viewerRatio >= 1.5 ? 4 :
      viewerRatio >= 1.0 ? 2 :
      viewerRatio >= 0.7 ? 1 : 0;

    if (baseGain === 0) continue;

    const boostedIDs = new Set([
      ...season.leadActorIDs,
      season.directorID,
      ...season.showrunnerIDs,
    ].filter(Boolean) as string[]);

    talent = talent.map(t => {
      if (!boostedIDs.has(t.id)) return t;
      const gain = Math.round(baseGain * Math.max(0.4, 1 - t.popularity / 130));
      if (gain <= 0) return t;
      return { ...t, popularity: Math.min(95, t.popularity + gain) };
    });
  }

  // ─── Ad revenue: accumulate cash from episodes that aired this week ────────
  // Include 'renewal-pending' shows: the last episode airs in the same tick that
  // status flips, so filtering to 'airing' only causes the finale's revenue to
  // be tracked in totalAdRevenue but never collected into cashOnHand.
  let revenueThisWeek = 0;
  for (const show of shows) {
    const season = show.seasons[show.currentSeasonIndex];
    if (!season || (show.status !== 'airing' && show.status !== 'renewal-pending')) continue;
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

  // ─── Revenue share payout: deduct from cash when a season finishes airing ──
  // Fires once per season when the show transitions airing → renewal-pending/cancelled.
  // totalAdRevenue on the updated season already includes the finale episode.
  let revenueShareTotal = 0;
  const revenueShareInboxItems: InboxItem[] = [];
  for (let i = 0; i < state.shows.length; i++) {
    const wasAiring = state.shows[i].status === 'airing';
    const nowFinished = shows[i].status === 'renewal-pending' ||
      (shows[i].status === 'cancelled' && shows[i].cancelledClean);
    if (!wasAiring || !nowFinished) continue;

    const season = shows[i].seasons[shows[i].currentSeasonIndex];
    if (!season) continue;

    const deals: TalentDeal[] = state.talentDeals.filter(
      d => d.seasonID === season.id && d.revenueSharePercent > 0,
    );
    if (deals.length === 0) continue;

    let seasonPayout = 0;
    const lineItems: string[] = [];
    for (const deal of deals) {
      const payout = Math.round(deal.revenueSharePercent / 100 * season.totalAdRevenue);
      if (payout > 0) {
        seasonPayout += payout;
        const talentName = state.talent.find(t => t.id === deal.talentID)?.name ?? 'Talent';
        lineItems.push(`${talentName} (${deal.revenueSharePercent}%): $${(payout / 1_000_000).toFixed(2)}M`);
      }
    }

    if (seasonPayout > 0) {
      revenueShareTotal += seasonPayout;
      revenueShareInboxItems.push({
        id: nanoid(),
        type: 'revenue-share-payout',
        week: newWeek,
        year: newYear,
        read: false,
        refID: shows[i].id,
        title: `Revenue share paid — ${shows[i].title} S${season.seasonNumber}`,
        preview: `Total paid out: $${(seasonPayout / 1_000_000).toFixed(2)}M · ${lineItems.join(' · ')}`,
      });
    }
  }
  if (revenueShareTotal > 0) {
    network = { ...network, cashOnHand: network.cashOnHand - revenueShareTotal };
    newInboxItems.push(...revenueShareInboxItems);
  }

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
        makeEmmyNominationsNews(playerNoms.length, topShow?.title ?? 'your show', state.network.name, {
          week: newWeek,
          year: newYear,
        }),
      );

      const nominatedShowTitles = playerNoms
        .map(nom => updatedShows.find(sh => sh.id === nom.showID)?.title)
        .filter((t): t is string => !!t);
      milestoneAmbientPosts.push(
        ...generateEmmyNominationPosts(nominatedShowTitles, newWeek, newYear),
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

    // Emmy stat boosts: wins get full boost, nominations get half
    const INDIVIDUAL_CATEGORIES = new Set([
      'best-drama-actor', 'best-drama-actress',
      'best-comedy-actor', 'best-comedy-actress',
      'best-director', 'best-writing',
    ]);
    const playerIndividualNoms = withWinners.filter(
      a => a.isPlayerAward && a.talentID && !a.talentID.startsWith('comp-') &&
           INDIVIDUAL_CATEGORIES.has(a.category),
    );
    if (playerIndividualNoms.length > 0) {
      talent = talent.map(t => {
        const relatedNoms = playerIndividualNoms.filter(a => a.talentID === t.id);
        if (relatedNoms.length === 0) return t;
        let updatedStats = { ...t.stats };
        let popularityGain = 0;
        for (const nom of relatedNoms) {
          const multiplier = nom.won ? 1.0 : 0.5;
          if (['best-drama-actor', 'best-drama-actress', 'best-comedy-actor', 'best-comedy-actress'].includes(nom.category) &&
              updatedStats.role === 'actor') {
            const cur = updatedStats.acting;
            const delta = (cur < 60 ? 4 : cur < 75 ? 3 : cur < 85 ? 2 : 1) * multiplier;
            updatedStats = { ...updatedStats, acting: Math.min(100, cur + delta) };
          } else if (nom.category === 'best-director' && updatedStats.role === 'director') {
            const cur = updatedStats.direction;
            const delta = (cur < 60 ? 4 : cur < 75 ? 3 : cur < 85 ? 2 : 1) * multiplier;
            updatedStats = { ...updatedStats, direction: Math.min(100, cur + delta) };
          } else if (nom.category === 'best-writing' && updatedStats.role === 'showrunner') {
            const cur = updatedStats.writing;
            const delta = (cur < 60 ? 4 : cur < 75 ? 3 : cur < 85 ? 2 : 1) * multiplier;
            updatedStats = { ...updatedStats, writing: Math.min(100, cur + delta) };
          }
          // Popularity boost: win +6, nomination +3, with diminishing returns
          const popBase = nom.won ? 6 : 3;
          popularityGain += Math.round(popBase * Math.max(0.4, 1 - t.popularity / 130));
        }
        const newPopularity = popularityGain > 0
          ? Math.min(95, t.popularity + popularityGain)
          : t.popularity;
        return { ...t, stats: updatedStats, popularity: newPopularity };
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
      makeEmmyCeremonyNews(playerWins.length, topCompetitor, state.network.name, { week: newWeek, year: newYear }),
    );

    const winningShowTitles = playerWins
      .map(win => updatedShows.find(sh => sh.id === win.showID)?.title)
      .filter((t): t is string => !!t);
    milestoneAmbientPosts.push(
      ...generateEmmyWinPosts(winningShowTitles, newWeek, newYear),
    );

    if (playerWins.length > 0) {
      network = {
        ...network,
        emmysWon: network.emmysWon + playerWins.length,
        prestige: Math.min(100, network.prestige + playerWins.length * 3),
      };
    }

    emmyCeremonyPendingYear = newYear;
  }

  // Prune TalentDeal records for talent that is no longer booked.
  // Keep deals with revenueSharePercent > 0 permanently — they serve as
  // historical records for the season financials display.
  const bookedTalentIDs = new Set(talent.filter(t => !t.available).map(t => t.id));
  const prunedDeals = state.talentDeals.filter(
    d => bookedTalentIDs.has(d.talentID) || d.revenueSharePercent > 0,
  );

  // ─── Talent aging & retirement (once per year at week 1) ─────────────────
  if (newWeek === 1) {
    // Increment every talent's age by 1
    talent = talent.map(t => ({ ...t, age: t.age + 1 }));

    // Retire available talent at age 72+ and generate replacements
    const retirees = talent.filter(t => t.age >= 72 && t.available);
    if (retirees.length > 0) {
      const retiredIDs = new Set(retirees.map(t => t.id));
      const talentAfterRetirement = talent.filter(t => !retiredIDs.has(t.id));

      const replacements = retirees.map(retiree => {
        const tier =
          retiree.prestigeRequired >= 61 ? 'high'
          : retiree.prestigeRequired >= 21 ? 'mid'
          : 'low';
        return generateReplacementTalent(
          retiree.role, tier, talentAfterRetirement, newYear,
        );
      });

      talent = [...talentAfterRetirement, ...replacements];

      // One news item listing all retirees this year
      const names = retirees.map(t => t.name).join(', ');
      newNewsItems.push({
        id: nanoid(),
        week: newWeek,
        year: newYear,
        type: 'industry',
        read: false,
        headline: retirees.length === 1
          ? `${retirees[0].name} retires from the industry`
          : `${retirees.length} industry veterans retire`,
        body: `${names} ${retirees.length === 1 ? 'has' : 'have'} stepped away from the industry. Fresh talent is entering the market to fill the void.`,
        byline: 'Trade Wire Staff',
      });
    }
  }

  // ─── Loan shark tick ──────────────────────────────────────────────────────
  // Check once per week whether the active loan has gone past its due date.
  // Grace period is exactly one year (same week, next year). After that the
  // balance compounds 20% each week until repaid or forcibly collected.
  let activeLoan = state.activeLoan ?? null;
  if (activeLoan) {
    const isPastDue =
      newYear > activeLoan.dueYear ||
      (newYear === activeLoan.dueYear && newWeek > activeLoan.dueWeek);

    if (isPastDue) {
      let updatedLoan = { ...activeLoan, weeksOverdue: activeLoan.weeksOverdue + 1 };

      // First overdue week: prestige penalty + news story
      if (!updatedLoan.prestigePenaltyApplied) {
        network = { ...network, prestige: Math.max(0, network.prestige - 5) };
        newNewsItems.push(makeLoanDefaultNews(network.name, updatedLoan.amountOwed, { week: newWeek, year: newYear }));
        updatedLoan = { ...updatedLoan, prestigePenaltyApplied: true };
      }

      // Compound 20% weekly on the outstanding balance
      updatedLoan = { ...updatedLoan, amountOwed: Math.round(updatedLoan.amountOwed * 1.20) };

      // After 6 weeks overdue: force-collect whatever cash is available
      if (updatedLoan.weeksOverdue >= 6) {
        const collected = Math.min(network.cashOnHand, updatedLoan.amountOwed);
        network = { ...network, cashOnHand: network.cashOnHand - collected, prestige: Math.max(0, network.prestige - 10) };
        const remaining = updatedLoan.amountOwed - collected;
        if (remaining <= 0) {
          activeLoan = null; // fully collected — loan closed
        } else {
          activeLoan = { ...updatedLoan, amountOwed: remaining };
        }
      } else {
        activeLoan = updatedLoan;
      }
    }
  }

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

  const ambientResult = generateAmbientSocialPosts(
    { playerShows: updatedShows, competitors: finalCompetitors, week: newWeek, year: newYear },
    state.recentAmbientTemplateIds,
  );
  
  const newAmbientSocialPosts = [...state.ambientSocialPosts, ...ambientResult.posts].slice(-300);
  const recentAmbientTemplateIds = [...state.recentAmbientTemplateIds, ...ambientResult.usedTemplateIds]
    .slice(-AMBIENT_TEMPLATE_COOLDOWN);
  
  // recentSocialTemplateIds is untouched here — it only gets updated up where
  // the per-episode generateSocialReactions() call happens, separately.
  const recentSocialTemplateIds = socialTemplateTracker.ids;   // ← ADD THIS LINE

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
    emmyCeremonyPendingYear,
    activeLoan,
    ambientSocialPosts: newAmbientSocialPosts,
    recentSocialTemplateIds,
    recentAmbientTemplateIds,
  };
}

// ─── Stage tick functions ──────────────────────────────────────────────────────

function tickWriting(show: Show, season: Season, state: GameState): Show {
  if (season.showrunnerIDs.length === 0) return show; // waiting on player

  const completed = season.writingWeeksCompleted + 1;
  let updatedSeason = { ...season, writingWeeksCompleted: completed };

  if (completed >= WRITING_WEEKS) {
    const showrunners = season.showrunnerIDs
      .map(id => state.talent.find(t => t.id === id))
      .filter((t): t is Talent => !!t && t.stats.role === 'showrunner');
    if (showrunners.length > 0) {
      updatedSeason = { ...updatedSeason, scriptScore: calculateScriptScore(showrunners) };
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
  socialTemplateTracker: { ids: string[] },
  talent: Talent[],
): Show {
  const nextIndex = season.episodesAired;
  if (nextIndex >= season.episodeCount) {
    return updateShow(show, season, 'renewal-pending');
  }

  const avgLeadPopularity = season.leadActorIDs.length > 0
    ? season.leadActorIDs.reduce((sum, id) => {
        const actor = talent.find(t => t.id === id);
        return sum + (actor?.popularity ?? 50);
      }, 0) / season.leadActorIDs.length
    : undefined;

  const prevEpisodes = season.episodes.filter(ep => ep.rating !== null);
  const { rating, viewers: baseViewers, adRevenue: baseAdRevenue } = calculateEpisodeRating(
    season,
    nextIndex + 1,
    show.genre,
    prevEpisodes,
    avgLeadPopularity,
  );

  // Apply theme window viewership boost — only viewers/revenue are affected, not the rating
  const scheduleMultiplier = getViewershipMultiplier(show.theme, newWeek);
  const viewers = scheduleMultiplier !== 1.0 ? Math.round(baseViewers * scheduleMultiplier) : baseViewers;
  const adRevenue = scheduleMultiplier !== 1.0 ? Math.round(baseAdRevenue * scheduleMultiplier) : baseAdRevenue;

  const isFinale = (nextIndex + 1) === season.episodeCount;
  const prevRating = nextIndex > 0 ? (season.episodes[nextIndex - 1]?.rating ?? undefined) : undefined;
  const socialResult = generateSocialReactions(
    show.title, nextIndex + 1, rating, show.genre,
    socialTemplateTracker.ids,
    isFinale,
    prevRating,
  );
  const reactions = socialResult.reactions;
  socialTemplateTracker.ids = [...socialTemplateTracker.ids, ...socialResult.usedTemplateIds]
    .slice(-SOCIAL_TEMPLATE_COOLDOWN);

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

  if (newEpisodesAired >= season.episodeCount) {
    const newHeat = applyHeat(show, updatedSeason);
    if (updatedSeason.isFinalSeason) {
      // Final season complete — close the show as cancelled (clean) immediately,
      // skipping the renewal-pending step. Showrunner is freed in advanceWeek.
      const seasons = [...show.seasons];
      seasons[show.currentSeasonIndex] = updatedSeason;
      return { ...show, status: 'cancelled', cancelledClean: true, seasons, heatMultiplier: newHeat };
    }
    return { ...updateShow(show, updatedSeason, 'renewal-pending'), heatMultiplier: newHeat };
  }
  return updateShow(show, updatedSeason, 'airing');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeHeatDelta(avgRating: number): number {
  if (avgRating >= 8.5) return 0.08;
  if (avgRating >= 7.5) return 0.05;
  if (avgRating >= 6.5) return 0.02;
  if (avgRating >= 5.0) return -0.03;
  return -0.10;
}

function applyHeat(show: Show, season: Season): number {
  const ratedEps = season.episodes.filter(ep => ep.rating !== null);
  const avgRating = ratedEps.length > 0
    ? ratedEps.reduce((sum, ep) => sum + (ep.rating ?? 0), 0) / ratedEps.length
    : 5.0;
  const delta = computeHeatDelta(avgRating);
  return Math.min(2.0, Math.max(0.80, (show.heatMultiplier ?? 1.0) + delta));
}

function updateShow(show: Show, season: Season, status: ShowStatus): Show {
  const seasons = [...show.seasons];
  seasons[show.currentSeasonIndex] = season;
  return { ...show, status, seasons };
}

function formatM(n: number): string {
  return `${(n / 1_000_000).toFixed(1)}M`;
}