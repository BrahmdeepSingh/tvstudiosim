import { create } from 'zustand';
import {
  GameState,
  Show,
  Season,
  Episode,
  Talent,
  TalentDeal,
  Genre,
  Theme,
  ShowStatus,
  InboxItem,
  NewsItem,
} from '../types';
import { advanceWeek as engineAdvanceWeek } from '../engine/advancement';
import { generateInitialTalentPool } from '../engine/talent';
import { generateInitialCompetitors } from '../engine/competitors';
import { generatePitch } from '../engine/pitches';
import { saveGameToStorage, loadGameFromStorage } from './storage';
import {
  STARTING_CASH,
  STARTING_PRESTIGE,
  STARTING_WEEK,
  STARTING_YEAR,
  WRITING_WEEKS,
  FILMING_WEEKS,
  TALENT_FEES,
  MARKETING_CHANNELS,
  WEEKS_PER_YEAR,
} from '../constants/game';
import { nanoid } from '../utils/nanoid';
import { randomBetween, randomFloat, clamp } from '../utils/random';

// ─── Store Interface ──────────────────────────────────────────────────────────

interface GameStore extends GameState {
  // Setup
  initializeGame: (networkName: string, initials: string) => void;

  // Core loop
  advanceWeek: () => void;

  // In-house show creation
  createShow: (title: string, genre: Genre, theme: Theme, episodeCount: number, leadActorSlots: number, supportingActorSlots: number) => string;

  // Talent hiring (returns true if successful)
  hireShowrunner: (showID: string, talentID: string, flatFee: number, revenueSharePercent: number) => boolean;
  hireDirector: (showID: string, talentID: string, flatFee: number, revenueSharePercent: number) => boolean;
  hireActor: (showID: string, talentID: string, flatFee: number, revenueSharePercent: number, actorType: 'lead' | 'supporting') => boolean;

  // Talent negotiation: returns whether talent accepts the offer
  evaluateOffer: (talentID: string, offeredFee: number, networkPrestige: number) => boolean;

  // Marketing
  setAirDate: (showID: string, week: number, year: number) => void;
  purchaseMarketingChannels: (showID: string, channelIDs: string[]) => void;

  // Pitches
  greenlightPitch: (pitchID: string) => boolean;
  passPitch: (pitchID: string) => void;

  // Renewal / cancellation
  renewShow: (showID: string, newEpisodeCount: number, newLeadSlots?: number, newSupportingSlots?: number) => void;
  cancelShow: (showID: string) => void;

  // Streaming
  acceptStreamingOffer: (showID: string) => void;
  declineStreamingOffer: (showID: string) => void;

  // Inbox
  markInboxRead: (itemID: string) => void;

  // Persistence
  saveGame: () => Promise<void>;
  loadGame: (slot: number) => Promise<boolean>;
}

// ─── Initial State Shape ──────────────────────────────────────────────────────

const EMPTY_STATE: GameState = {
  network: {
    id: '',
    name: '',
    initials: '',
    foundedYear: STARTING_YEAR,
    currentWeek: STARTING_WEEK,
    currentYear: STARTING_YEAR,
    cashOnHand: STARTING_CASH,
    careerEarnings: 0,
    prestige: STARTING_PRESTIGE,
    emmysWon: 0,
    emmyNominations: 0,
    totalShowsProduced: 0,
  },
  shows: [],
  talent: [],
  talentDeals: [],
  pitches: [],
  competitors: [],
  newsItems: [],
  inboxItems: [],
  awards: [],
  saveSlot: 1,
  lastSaved: '',
  initialized: false,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useGameStore = create<GameStore>((set, get) => ({
  ...EMPTY_STATE,

  // ── Setup ────────────────────────────────────────────────────────────────

  initializeGame: (networkName, initials) => {
    const talent = generateInitialTalentPool();
    const competitors = generateInitialCompetitors();

    // Generate one starter pitch so inbox isn't empty
    const showrunners = talent.filter(t => t.role === 'showrunner' && t.available);
    const starterPitch = generatePitch(showrunners, STARTING_WEEK, STARTING_YEAR);

    const starterInbox: InboxItem[] = starterPitch
      ? [
          {
            id: nanoid(),
            type: 'pitch',
            week: STARTING_WEEK,
            year: STARTING_YEAR,
            read: false,
            refID: starterPitch.id,
            title: `New pitch: "${starterPitch.title}"`,
            preview: `${starterPitch.genre} · Showrunner: ${talent.find(t => t.id === starterPitch.showrunnerID)?.name ?? 'Unknown'}`,
          },
        ]
      : [];

    set({
      ...EMPTY_STATE,
      network: {
        ...EMPTY_STATE.network,
        id: nanoid(),
        name: networkName,
        initials: initials.toUpperCase().slice(0, 2),
      },
      talent,
      competitors,
      pitches: starterPitch ? [starterPitch] : [],
      inboxItems: starterInbox,
      initialized: true,
    });
  },

  // ── Core Loop ─────────────────────────────────────────────────────────────

  advanceWeek: () => {
    const newState = engineAdvanceWeek(get());
    set(newState);
    // Auto-save
    saveGameToStorage(newState);
  },

  // ── Show Creation ─────────────────────────────────────────────────────────

  createShow: (title, genre, theme, episodeCount, leadActorSlots, supportingActorSlots) => {
    const showID = nanoid();
    const seasonID = nanoid();

    const episodes: Episode[] = Array.from({ length: episodeCount }, (_, i) => ({
      id: nanoid(),
      seasonID,
      episodeNumber: i + 1,
      rating: null,
      viewers: null,
      adRevenue: null,
      weekAired: null,
      yearAired: null,
      socialReactions: [],
    }));

    const season: Season = {
      id: seasonID,
      showID,
      seasonNumber: 1,
      episodeCount,
      writingWeeksTotal: WRITING_WEEKS,
      writingWeeksCompleted: 0,
      filmingWeeksTotal: FILMING_WEEKS,
      filmingWeeksCompleted: 0,
      marketingWeeksTotal: 0,
      marketingWeeksCompleted: 0,
      airDateWeek: null,
      airDateYear: null,
      episodesAired: 0,
      episodes,
      totalViewers: 0,
      totalAdRevenue: 0,
      productionCost: 0,
      marketingSpend: 0,
      marketingChannelIDs: [],
      streamingOfferReceived: false,
      streamingOfferAmount: 0,
      streamingOfferSource: '',
      streamingOfferAccepted: false,
      streamingOfferExpiresWeek: null,
      streamingOfferExpiresYear: null,
      renewalDecisionMade: false,
      renewed: false,
      leadActorSlots,
      supportingActorSlots,
      leadActorIDs: [],
      supportingActorIDs: [],
      directorID: null,
      showrunnerID: '',
      qualityScore: 50,
      suggestedDirectorID: null,
      suggestedLeadActorIDs: [],
      suggestedSupportingActorIDs: [],
    };

    const show: Show = {
      id: showID,
      title,
      genre,
      theme,
      inHouse: true,
      status: 'writing',
      seasons: [season],
      currentSeasonIndex: 0,
    };

    set(state => ({ shows: [...state.shows, show] }));
    return showID;
  },

  // ── Talent Negotiation ─────────────────────────────────────────────────────

  evaluateOffer: (talentID, offeredFee, networkPrestige) => {
    const state = get();
    const talent = state.talent.find(t => t.id === talentID);
    if (!talent) return false;

    const role = talent.role;
    const popularity = talent.popularity;

    // Determine talent's expected minimum based on popularity
    const tierIndex = popularity < 40 ? 'low' : popularity < 70 ? 'mid' : 'high';
    const feeRange = TALENT_FEES[role][tierIndex];
    const minAcceptable = feeRange[0] * 0.85; // will accept down to 85% of range floor
    const askingPrice = feeRange[0] + (feeRange[1] - feeRange[0]) * (popularity / 100);

    // Prestige factor: high prestige network makes talent more flexible
    const prestigeMod = 1 - clamp((networkPrestige - talent.prestigeRequired) / 200, 0, 0.15);
    const effectiveMin = minAcceptable * prestigeMod;

    return offeredFee >= effectiveMin;
  },

  // ── Talent Hiring ──────────────────────────────────────────────────────────

  hireShowrunner: (showID, talentID, flatFee, revenueSharePercent) => {
    const state = get();
    if (state.network.cashOnHand < flatFee) return false;

    const talent = state.talent.find(t => t.id === talentID);
    const show = state.shows.find(s => s.id === showID);
    if (!talent || !show || !talent.available) return false;

    const season = show.seasons[show.currentSeasonIndex];
    if (!season) return false;

    const dealID = nanoid();
    const deal: TalentDeal = {
      id: dealID,
      talentID,
      showID,
      seasonID: season.id,
      flatFee,
      revenueSharePercent,
      agreedWeek: state.network.currentWeek,
      agreedYear: state.network.currentYear,
    };

    const updatedSeason: Season = {
      ...season,
      showrunnerID: talentID,
      productionCost: season.productionCost + flatFee,
    };

    set(s => ({
      network: { ...s.network, cashOnHand: s.network.cashOnHand - flatFee },
      talent: s.talent.map(t =>
        t.id === talentID ? { ...t, available: false, bookedForSeasonID: season.id } : t,
      ),
      shows: s.shows.map(sh =>
        sh.id === showID
          ? { ...sh, seasons: sh.seasons.map((se, i) => i === sh.currentSeasonIndex ? updatedSeason : se) }
          : sh,
      ),
      talentDeals: [...s.talentDeals, deal],
    }));

    return true;
  },

  hireDirector: (showID, talentID, flatFee, revenueSharePercent) => {
    const state = get();
    if (state.network.cashOnHand < flatFee) return false;

    const talent = state.talent.find(t => t.id === talentID);
    const show = state.shows.find(s => s.id === showID);
    if (!talent || !show || !talent.available) return false;

    const season = show.seasons[show.currentSeasonIndex];
    if (!season) return false;

    const deal: TalentDeal = {
      id: nanoid(),
      talentID,
      showID,
      seasonID: season.id,
      flatFee,
      revenueSharePercent,
      agreedWeek: state.network.currentWeek,
      agreedYear: state.network.currentYear,
    };

    const updatedSeason: Season = {
      ...season,
      directorID: talentID,
      productionCost: season.productionCost + flatFee,
    };

    set(s => ({
      network: { ...s.network, cashOnHand: s.network.cashOnHand - flatFee },
      talent: s.talent.map(t =>
        t.id === talentID ? { ...t, available: false, bookedForSeasonID: season.id } : t,
      ),
      shows: s.shows.map(sh =>
        sh.id === showID
          ? { ...sh, seasons: sh.seasons.map((se, i) => i === sh.currentSeasonIndex ? updatedSeason : se) }
          : sh,
      ),
      talentDeals: [...s.talentDeals, deal],
    }));

    return true;
  },

  hireActor: (showID, talentID, flatFee, revenueSharePercent, actorType) => {
    const state = get();
    if (state.network.cashOnHand < flatFee) return false;

    const talent = state.talent.find(t => t.id === talentID);
    const show = state.shows.find(s => s.id === showID);
    if (!talent || !show || !talent.available) return false;

    const season = show.seasons[show.currentSeasonIndex];
    if (!season) return false;

    const deal: TalentDeal = {
      id: nanoid(),
      talentID,
      showID,
      seasonID: season.id,
      flatFee,
      revenueSharePercent,
      agreedWeek: state.network.currentWeek,
      agreedYear: state.network.currentYear,
    };

    const updatedSeason: Season = {
      ...season,
      leadActorIDs: actorType === 'lead' ? [...season.leadActorIDs, talentID] : season.leadActorIDs,
      supportingActorIDs: actorType === 'supporting' ? [...season.supportingActorIDs, talentID] : season.supportingActorIDs,
      productionCost: season.productionCost + flatFee,
    };

    set(s => ({
      network: { ...s.network, cashOnHand: s.network.cashOnHand - flatFee },
      talent: s.talent.map(t =>
        t.id === talentID ? { ...t, available: false, bookedForSeasonID: season.id } : t,
      ),
      shows: s.shows.map(sh =>
        sh.id === showID
          ? { ...sh, seasons: sh.seasons.map((se, i) => i === sh.currentSeasonIndex ? updatedSeason : se) }
          : sh,
      ),
      talentDeals: [...s.talentDeals, deal],
    }));

    return true;
  },

  // ── Marketing ─────────────────────────────────────────────────────────────

  setAirDate: (showID, week, year) => {
    const state = get();
    const show = state.shows.find(s => s.id === showID);
    if (!show) return;

    const season = show.seasons[show.currentSeasonIndex];
    if (!season || show.status !== 'marketing') return;

    const { currentWeek, currentYear } = state.network;
    const weeksFromNow =
      (year - currentYear) * WEEKS_PER_YEAR + (week - currentWeek);
    const marketingWeeksTotal = Math.max(0, weeksFromNow);

    const updatedSeason: Season = {
      ...season,
      airDateWeek: week,
      airDateYear: year,
      marketingWeeksTotal,
    };

    set(s => ({
      shows: s.shows.map(sh =>
        sh.id === showID
          ? { ...sh, seasons: sh.seasons.map((se, i) => i === sh.currentSeasonIndex ? updatedSeason : se) }
          : sh,
      ),
    }));
  },

  purchaseMarketingChannels: (showID, channelIDs) => {
    const state = get();
    const show = state.shows.find(s => s.id === showID);
    if (!show) return;

    const season = show.seasons[show.currentSeasonIndex];
    if (!season) return;

    const newChannels = channelIDs.filter(id => !season.marketingChannelIDs.includes(id));
    const totalCost = MARKETING_CHANNELS
      .filter(c => newChannels.includes(c.id))
      .reduce((sum, c) => sum + c.cost, 0);

    if (state.network.cashOnHand < totalCost) return;

    const updatedSeason: Season = {
      ...season,
      marketingChannelIDs: [...season.marketingChannelIDs, ...newChannels],
      marketingSpend: season.marketingSpend + totalCost,
    };

    set(s => ({
      network: { ...s.network, cashOnHand: s.network.cashOnHand - totalCost },
      shows: s.shows.map(sh =>
        sh.id === showID
          ? { ...sh, seasons: sh.seasons.map((se, i) => i === sh.currentSeasonIndex ? updatedSeason : se) }
          : sh,
      ),
    }));
  },

  // ── Pitches ───────────────────────────────────────────────────────────────

  greenlightPitch: (pitchID) => {
    const state = get();
    const pitch = state.pitches.find(p => p.id === pitchID);
    if (!pitch || pitch.greenlitByPlayer || pitch.passed) return false;

    const showrunner = state.talent.find(t => t.id === pitch.showrunnerID);
    if (!showrunner || !showrunner.available) return false;
    if (state.network.cashOnHand < pitch.askingFlatFee) return false;

    const showID = nanoid();
    const seasonID = nanoid();

    const episodes: Episode[] = Array.from({ length: pitch.proposedEpisodeCount }, (_, i) => ({
      id: nanoid(),
      seasonID,
      episodeNumber: i + 1,
      rating: null,
      viewers: null,
      adRevenue: null,
      weekAired: null,
      yearAired: null,
      socialReactions: [],
    }));

    const season: Season = {
      id: seasonID,
      showID,
      seasonNumber: 1,
      episodeCount: pitch.proposedEpisodeCount,
      writingWeeksTotal: WRITING_WEEKS,
      writingWeeksCompleted: 0,
      filmingWeeksTotal: FILMING_WEEKS,
      filmingWeeksCompleted: 0,
      marketingWeeksTotal: 0,
      marketingWeeksCompleted: 0,
      airDateWeek: null,
      airDateYear: null,
      episodesAired: 0,
      episodes,
      totalViewers: 0,
      totalAdRevenue: 0,
      productionCost: pitch.askingFlatFee,
      marketingSpend: 0,
      marketingChannelIDs: [],
      streamingOfferReceived: false,
      streamingOfferAmount: 0,
      streamingOfferSource: '',
      streamingOfferAccepted: false,
      streamingOfferExpiresWeek: null,
      streamingOfferExpiresYear: null,
      renewalDecisionMade: false,
      renewed: false,
      leadActorSlots: 2,
      supportingActorSlots: 2,
      leadActorIDs: [],
      supportingActorIDs: [],
      directorID: null,
      showrunnerID: pitch.showrunnerID,
      qualityScore: pitch.hiddenQualityScore,
      suggestedDirectorID: null,
      suggestedLeadActorIDs: [],
      suggestedSupportingActorIDs: [],
    };

    const show: Show = {
      id: showID,
      title: pitch.title,
      genre: pitch.genre,
      theme: pitch.theme,
      inHouse: false,
      status: 'writing',
      seasons: [season],
      currentSeasonIndex: 0,
    };

    const deal: TalentDeal = {
      id: nanoid(),
      talentID: pitch.showrunnerID,
      showID,
      seasonID,
      flatFee: pitch.askingFlatFee,
      revenueSharePercent: pitch.askingRevenueSharePercent,
      agreedWeek: state.network.currentWeek,
      agreedYear: state.network.currentYear,
    };

    set(s => ({
      network: {
        ...s.network,
        cashOnHand: s.network.cashOnHand - pitch.askingFlatFee,
      },
      shows: [...s.shows, show],
      pitches: s.pitches.map(p =>
        p.id === pitchID ? { ...p, greenlitByPlayer: true } : p,
      ),
      talent: s.talent.map(t =>
        t.id === pitch.showrunnerID
          ? { ...t, available: false, bookedForSeasonID: seasonID }
          : t,
      ),
      talentDeals: [...s.talentDeals, deal],
    }));

    return true;
  },

  passPitch: (pitchID) => {
    set(s => ({
      pitches: s.pitches.map(p =>
        p.id === pitchID ? { ...p, passed: true } : p,
      ),
    }));
  },

  // ── Renewal ───────────────────────────────────────────────────────────────

  renewShow: (showID, newEpisodeCount, newLeadSlots, newSupportingSlots) => {
    const state = get();
    const show = state.shows.find(s => s.id === showID);
    if (!show || show.status !== 'renewal-pending') return;

    const prevSeason = show.seasons[show.currentSeasonIndex];
    const newSeasonNumber = prevSeason.seasonNumber + 1;
    const newSeasonID = nanoid();
    const resolvedLeadSlots = newLeadSlots ?? prevSeason.leadActorSlots;
    const resolvedSupportingSlots = newSupportingSlots ?? prevSeason.supportingActorSlots;

    const episodes: Episode[] = Array.from({ length: newEpisodeCount }, (_, i) => ({
      id: nanoid(),
      seasonID: newSeasonID,
      episodeNumber: i + 1,
      rating: null,
      viewers: null,
      adRevenue: null,
      weekAired: null,
      yearAired: null,
      socialReactions: [],
    }));

    const newSeason: Season = {
      id: newSeasonID,
      showID,
      seasonNumber: newSeasonNumber,
      episodeCount: newEpisodeCount,
      writingWeeksTotal: WRITING_WEEKS,
      writingWeeksCompleted: 0,
      filmingWeeksTotal: FILMING_WEEKS,
      filmingWeeksCompleted: 0,
      marketingWeeksTotal: 0,
      marketingWeeksCompleted: 0,
      airDateWeek: null,
      airDateYear: null,
      episodesAired: 0,
      episodes,
      totalViewers: 0,
      totalAdRevenue: 0,
      productionCost: 0,
      marketingSpend: 0,
      marketingChannelIDs: [],
      streamingOfferReceived: false,
      streamingOfferAmount: 0,
      streamingOfferSource: '',
      streamingOfferAccepted: false,
      streamingOfferExpiresWeek: null,
      streamingOfferExpiresYear: null,
      renewalDecisionMade: false,
      renewed: false,
      leadActorSlots: resolvedLeadSlots,
      supportingActorSlots: resolvedSupportingSlots,
      leadActorIDs: [],
      supportingActorIDs: [],
      directorID: null,
      showrunnerID: prevSeason.showrunnerID,
      qualityScore: 50,
      suggestedDirectorID: prevSeason.directorID,
      suggestedLeadActorIDs: [...prevSeason.leadActorIDs],
      suggestedSupportingActorIDs: [...prevSeason.supportingActorIDs],
    };

    // Free up talent from previous season now that filming is long done
    const prevCast = [
      ...prevSeason.leadActorIDs,
      ...prevSeason.supportingActorIDs,
      prevSeason.directorID,
    ].filter(Boolean) as string[];

    const viewers = prevSeason.totalViewers;
    const vStr = viewers >= 1_000_000
      ? `${(viewers / 1_000_000).toFixed(1)}M`
      : viewers >= 1_000
      ? `${(viewers / 1_000).toFixed(0)}K`
      : String(viewers);

    const renewalNews: NewsItem = {
      id: nanoid(),
      week: state.network.currentWeek,
      year: state.network.currentYear,
      type: 'player',
      read: false,
      headline: viewers > 0
        ? `"${show.title}" renewed for Season ${newSeasonNumber} — ${vStr} viewers watched S${prevSeason.seasonNumber}`
        : `"${show.title}" renewed for Season ${newSeasonNumber}`,
      body: `The network has officially greenlit another season. Pre-production begins immediately.`,
    };

    set(s => ({
      shows: s.shows.map(sh =>
        sh.id === showID
          ? {
              ...sh,
              status: 'writing' as ShowStatus,
              seasons: [...sh.seasons.map((se, i) =>
                i === sh.currentSeasonIndex ? { ...se, renewalDecisionMade: true, renewed: true } : se
              ), newSeason],
              currentSeasonIndex: sh.currentSeasonIndex + 1,
            }
          : sh,
      ),
      // Free previous season's cast/director (showrunner stays booked)
      talent: s.talent.map(t =>
        prevCast.includes(t.id) && t.bookedForSeasonID === prevSeason.id
          ? { ...t, available: true, bookedForSeasonID: null }
          : t,
      ),
      newsItems: [...s.newsItems, renewalNews].slice(-150),
    }));
  },

  cancelShow: (showID) => {
    const state = get();
    const show = state.shows.find(s => s.id === showID);
    if (!show) return;

    const season = show.seasons[show.currentSeasonIndex];
    const bookedTalent = [
      season.showrunnerID,
      season.directorID,
      ...season.leadActorIDs,
      ...season.supportingActorIDs,
    ].filter(Boolean) as string[];

    set(s => ({
      shows: s.shows.map(sh =>
        sh.id === showID ? { ...sh, status: 'cancelled' as ShowStatus } : sh,
      ),
      talent: s.talent.map(t =>
        bookedTalent.includes(t.id)
          ? { ...t, available: true, bookedForSeasonID: null }
          : t,
      ),
      network: {
        ...s.network,
        totalShowsProduced: s.network.totalShowsProduced + 1,
      },
    }));
  },

  // ── Streaming ─────────────────────────────────────────────────────────────

  acceptStreamingOffer: (showID) => {
    const state = get();
    const show = state.shows.find(s => s.id === showID);
    if (!show) return;

    const season = show.seasons[show.currentSeasonIndex];
    if (!season?.streamingOfferReceived || season.streamingOfferAccepted) return;

    const amount = season.streamingOfferAmount;

    set(s => ({
      network: {
        ...s.network,
        cashOnHand: s.network.cashOnHand + amount,
        careerEarnings: s.network.careerEarnings + amount,
      },
      shows: s.shows.map(sh =>
        sh.id === showID
          ? {
              ...sh,
              seasons: sh.seasons.map((se, i) =>
                i === sh.currentSeasonIndex
                  ? { ...se, streamingOfferAccepted: true }
                  : se,
              ),
            }
          : sh,
      ),
    }));
  },

  declineStreamingOffer: (showID) => {
    set(s => ({
      shows: s.shows.map(sh =>
        sh.id === showID
          ? {
              ...sh,
              seasons: sh.seasons.map((se, i) =>
                i === sh.currentSeasonIndex
                  ? { ...se, streamingOfferReceived: false } // reset so engine won't re-offer
                  : se,
              ),
            }
          : sh,
      ),
    }));
  },

  // ── Inbox ─────────────────────────────────────────────────────────────────

  markInboxRead: (itemID) => {
    set(s => ({
      inboxItems: s.inboxItems.map(item =>
        item.id === itemID ? { ...item, read: true } : item,
      ),
    }));
  },

  // ── Persistence ───────────────────────────────────────────────────────────

  saveGame: async () => {
    await saveGameToStorage(get());
  },

  loadGame: async (slot) => {
    const loaded = await loadGameFromStorage(slot);
    if (!loaded) return false;
    set({ ...loaded, saveSlot: slot });
    return true;
  },
}));
