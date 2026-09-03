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
  PosterConfig,
  LogoConfig,
} from '../types';
import { advanceWeek as engineAdvanceWeek } from '../engine/advancement';
import { checkAchievements } from '../engine/achievements';
import { generateInitialTalentPool } from '../engine/talent';
import { generateInitialCompetitors } from '../engine/competitors';
import { generatePitch } from '../engine/pitches';
import { saveGameToStorage, loadGameFromStorage, deleteSave } from './storage';
import { makeStreamingDealNews, makeNewShowRumorNews } from '../engine/news';
import {
  generatePremiereDateAnnouncedPosts,
  generateRenewalPosts,
  generateCancellationPosts,
  generateDirectorCastingPosts,
  generateActorCastingPosts,
  generateFinalSeasonAnnouncedPosts,
} from '../engine/milestonesocial';
import { makeFinalSeasonAnnouncedNews } from '../engine/news';
import {
  STARTING_CASH,
  STARTING_PRESTIGE,
  STARTING_WEEK,
  STARTING_YEAR,
  WRITING_WEEKS,
  TALENT_FEES,
  SUPPORTING_ACTOR_FEES,
  MARKETING_CHANNELS,
  WEEKS_PER_YEAR,
  GENRE_CONFIG,
  popularityToFeeTier,
} from '../constants/game';
import { nanoid } from '../utils/nanoid';
import { randomBetween, randomFloat, clamp } from '../utils/random';

// ─── Store Interface ──────────────────────────────────────────────────────────

interface GameStore extends GameState {
  // Setup
  initializeGame: (networkName: string, initials: string, startingCash?: number, logoConfig?: LogoConfig, slot?: number) => void;

  // Core loop
  advanceWeek: () => void;

  // In-house show creation
  createShow: (title: string, genre: Genre, theme: Theme, episodeCount: number, showrunnerSlots: number, leadActorSlots: number, supportingActorSlots: number) => string;

  // Talent hiring (returns true if successful)
  hireShowrunner: (showID: string, talentID: string, flatFee: number, revenueSharePercent: number) => boolean;
  hireDirector: (showID: string, talentID: string, flatFee: number, revenueSharePercent: number) => boolean;
  hireActor: (showID: string, talentID: string, flatFee: number, revenueSharePercent: number, actorType: 'lead' | 'supporting') => boolean;

  // Talent negotiation: returns whether talent accepts the offer
  evaluateOffer: (talentID: string, flatFee: number, revenueSharePercent: number, networkPrestige: number, showID: string, actorType?: 'lead' | 'supporting') => boolean;

  // Marketing
  setAirDate: (showID: string, week: number, year: number) => void;
  purchaseMarketingChannels: (showID: string, channelIDs: string[]) => void;
  savePosterConfig: (showID: string, config: PosterConfig) => void;

  // Pitches
  acquireShow: (pitchID: string, winningBid: number) => boolean;
  passPitch: (pitchID: string) => void;

  // Renewal / cancellation
  renewShow: (showID: string, newEpisodeCount: number, newLeadSlots?: number, newSupportingSlots?: number, newShowrunnerSlots?: number, keepShowrunnerIDs?: string[], isFinalSeason?: boolean) => void;
  cancelShow: (showID: string) => void;

  // Streaming
  acceptStreamingOffer: (showID: string, dealType: 'exclusive' | 'non-exclusive') => void;
  declineStreamingOffer: (showID: string) => void;

  // Inbox
  markInboxRead: (itemID: string) => void;

  // Studio events
  resolveStudioEvent: (eventID: string, choiceIndex: number) => void;

  // Loan shark
  takeLoan: (size: 'small' | 'medium' | 'large') => boolean;
  repayLoan: () => boolean;

  // Emmy ceremony
  dismissEmmyCeremony: () => void;

  // Achievements
  dismissAchievement: () => void;

  // Persistence
  saveGame: () => Promise<void>;
  loadGame: (slot: number) => Promise<boolean>;

  // Reset
  resetGame: () => Promise<void>;
}

// ─── Initial State Shape ──────────────────────────────────────────────────────

const EMPTY_STATE: GameState = {
  network: {
    id: '',
    name: '',
    initials: '',
    logoConfig: { bgColor: '#e6b254', iconID: null, textColor: '#161008' },
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
  studioEvents: [],
  emmyCeremonyPendingYear: null,
  saveSlot: 1,
  lastSaved: '',
  initialized: false,
  ambientSocialPosts: [],
  recentSocialTemplateIds: [],
  recentAmbientTemplateIds: [],
  unlockedAchievementIDs: [],
  achievementQueue: [],
  activeLoan: null,
  loansTaken: 0,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useGameStore = create<GameStore>((set, get) => ({
  ...EMPTY_STATE,

  // ── Setup ────────────────────────────────────────────────────────────────

  initializeGame: (networkName, initials, startingCash, logoConfig, slot) => {
    const initialTalent = generateInitialTalentPool();
    const { competitors, updatedTalent: talent } = generateInitialCompetitors(initialTalent);

    set({
      ...EMPTY_STATE,
      saveSlot: slot ?? 1,
      network: {
        ...EMPTY_STATE.network,
        id: nanoid(),
        name: networkName,
        initials: initials.toUpperCase().slice(0, 2),
        logoConfig: logoConfig ?? EMPTY_STATE.network.logoConfig,
        cashOnHand: startingCash ?? STARTING_CASH,
      },
      talent,
      competitors,
      pitches: [],
      inboxItems: [],
      initialized: true,
    });
  },

  // ── Core Loop ─────────────────────────────────────────────────────────────

  advanceWeek: () => {
    const newState = engineAdvanceWeek(get());
    set(newState);
    // Achievement check after engine tick
    const newIDs = checkAchievements(get());
    if (newIDs.length > 0) {
      set(s => ({
        unlockedAchievementIDs: [...s.unlockedAchievementIDs, ...newIDs],
        achievementQueue: [...s.achievementQueue, ...newIDs],
      }));
    }
    saveGameToStorage(get());
  },

  // ── Show Creation ─────────────────────────────────────────────────────────

  createShow: (title, genre, theme, episodeCount, showrunnerSlots, leadActorSlots, supportingActorSlots) => {
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
      filmingWeeksTotal: episodeCount,
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
      streamingRevenue: 0,
      renewalDecisionMade: false,
      renewed: false,
      showrunnerSlots,
      leadActorSlots,
      supportingActorSlots,
      showrunnerIDs: [],
      leadActorIDs: [],
      supportingActorIDs: [],
      directorID: null,
      scriptScore: 0,
      qualityScore: 50,
      suggestedShowrunnerIDs: [],
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
      streamingDeals: [],
      pendingStreamingOffer: null,
      streamingOfferCheckWeek: null,
      streamingOfferCheckYear: null,
      streamingCheckedAtSeasonCount: 0,
      cancelledClean: true,
      heatMultiplier: 1.0,
    };

    const rumorNews = makeNewShowRumorNews(title, genre, get().network.name, true, { week: get().network.currentWeek, year: get().network.currentYear });
    set(state => ({ shows: [...state.shows, show], newsItems: [...state.newsItems, rumorNews] }));
    const newIDs = checkAchievements(get());
    if (newIDs.length > 0) set(s => ({ unlockedAchievementIDs: [...s.unlockedAchievementIDs, ...newIDs], achievementQueue: [...s.achievementQueue, ...newIDs] }));
    return showID;
  },

  // ── Talent Negotiation ─────────────────────────────────────────────────────

  evaluateOffer: (talentID, flatFee, revenueSharePercent, networkPrestige, showID, actorType = 'lead') => {
    if (flatFee <= 0) return false; // cash is always required

    const state = get();
    const talent = state.talent.find(t => t.id === talentID);
    if (!talent) return false;

    const role = talent.role;
    const popularity = talent.popularity;

    const tierIndex = popularityToFeeTier(popularity);
    const feeRange = (role === 'actor' && actorType === 'supporting')
      ? SUPPORTING_ACTOR_FEES[tierIndex]
      : TALENT_FEES[role][tierIndex];

    const prestigeMod = 1 - clamp((networkPrestige - talent.prestigeRequired) / 200, 0, 0.15);
    const heatMultiplier = state.shows.find(s => s.id === showID)?.heatMultiplier ?? 1.0;
    const effectiveMin = feeRange[0] * prestigeMod * heatMultiplier;

    // Convert revenue share % to cash-equivalent value using expected season ad revenue
    let revShareValue = 0;
    if (revenueSharePercent > 0) {
      const show = state.shows.find(s => s.id === showID);
      if (show) {
        const season = show.seasons[show.currentSeasonIndex];
        const episodeCount = season?.episodeCount ?? 10;
        const cfg = GENRE_CONFIG[show.genre];
        const perEpisode = Math.round((cfg.baseViewers / 1000) * cfg.cpm * (1 + (7 - 5) / 10));
        revShareValue = (revenueSharePercent / 100) * perEpisode * episodeCount;
      }
    }

    const combinedValue = flatFee + revShareValue;
    return combinedValue >= effectiveMin * 0.85;
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

    // Guard: don't exceed showrunnerSlots
    if (season.showrunnerIDs.length >= season.showrunnerSlots) return false;

    const updatedSeason: Season = {
      ...season,
      showrunnerIDs: [...season.showrunnerIDs, talentID],
      productionCost: season.productionCost + flatFee,
    };

    set(s => ({
      network: { ...s.network, cashOnHand: s.network.cashOnHand - flatFee },
      talent: s.talent.map(t =>
        t.id === talentID
          ? { ...t, available: false, bookedForSeasonID: season.id, careerShowIDs: t.careerShowIDs.includes(showID) ? t.careerShowIDs : [...t.careerShowIDs, showID] }
          : t,
      ),
      shows: s.shows.map(sh =>
        sh.id === showID
          ? { ...sh, seasons: sh.seasons.map((se, i) => i === sh.currentSeasonIndex ? updatedSeason : se) }
          : sh,
      ),
      talentDeals: [...s.talentDeals, deal],
    }));
    const newIDs0 = checkAchievements(get());
    if (newIDs0.length > 0) set(s => ({ unlockedAchievementIDs: [...s.unlockedAchievementIDs, ...newIDs0], achievementQueue: [...s.achievementQueue, ...newIDs0] }));

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

    const directorPosts = generateDirectorCastingPosts(
      show.title, talent.name, talent.popularity,
      state.network.currentWeek, state.network.currentYear,
    );

    set(s => ({
      network: { ...s.network, cashOnHand: s.network.cashOnHand - flatFee },
      talent: s.talent.map(t =>
        t.id === talentID
          ? { ...t, available: false, bookedForSeasonID: season.id, careerShowIDs: t.careerShowIDs.includes(showID) ? t.careerShowIDs : [...t.careerShowIDs, showID] }
          : t,
      ),
      shows: s.shows.map(sh =>
        sh.id === showID
          ? { ...sh, seasons: sh.seasons.map((se, i) => i === sh.currentSeasonIndex ? updatedSeason : se) }
          : sh,
      ),
      talentDeals: [...s.talentDeals, deal],
      ambientSocialPosts: [...s.ambientSocialPosts, ...directorPosts].slice(-300),
    }));
    const newIDs1 = checkAchievements(get());
    if (newIDs1.length > 0) set(s => ({ unlockedAchievementIDs: [...s.unlockedAchievementIDs, ...newIDs1], achievementQueue: [...s.achievementQueue, ...newIDs1] }));

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

    if (actorType === 'lead' && season.leadActorIDs.length >= season.leadActorSlots) return false;
    if (actorType === 'supporting' && season.supportingActorIDs.length >= season.supportingActorSlots) return false;

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

    const actorPosts = generateActorCastingPosts(
      show.title, talent.name, actorType, talent.popularity,
      state.network.currentWeek, state.network.currentYear,
    );

    set(s => ({
      network: { ...s.network, cashOnHand: s.network.cashOnHand - flatFee },
      talent: s.talent.map(t =>
        t.id === talentID
          ? { ...t, available: false, bookedForSeasonID: season.id, careerShowIDs: t.careerShowIDs.includes(showID) ? t.careerShowIDs : [...t.careerShowIDs, showID] }
          : t,
      ),
      shows: s.shows.map(sh =>
        sh.id === showID
          ? { ...sh, seasons: sh.seasons.map((se, i) => i === sh.currentSeasonIndex ? updatedSeason : se) }
          : sh,
      ),
      talentDeals: [...s.talentDeals, deal],
      ambientSocialPosts: [...s.ambientSocialPosts, ...actorPosts].slice(-300),
    }));
    const newIDs2 = checkAchievements(get());
    if (newIDs2.length > 0) set(s => ({ unlockedAchievementIDs: [...s.unlockedAchievementIDs, ...newIDs2], achievementQueue: [...s.achievementQueue, ...newIDs2] }));

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
    const weeksFromNow = (year - currentYear) * WEEKS_PER_YEAR + (week - currentWeek);
    const marketingWeeksTotal = Math.max(0, weeksFromNow);

    const updatedSeason: Season = { ...season, airDateWeek: week, airDateYear: year, marketingWeeksTotal };

    const newPosts = generatePremiereDateAnnouncedPosts(
      show.title, weeksFromNow, currentWeek, currentYear,
    );

    set(s => ({
      shows: s.shows.map(sh =>
        sh.id === showID
          ? { ...sh, seasons: sh.seasons.map((se, i) => i === sh.currentSeasonIndex ? updatedSeason : se) }
          : sh,
      ),
      ambientSocialPosts: [...s.ambientSocialPosts, ...newPosts].slice(-300),
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

  savePosterConfig: (showID, config) => {
    const state = get();
    const show = state.shows.find(s => s.id === showID);
    if (!show) return;
    const season = show.seasons[show.currentSeasonIndex];
    if (!season) return;
    const updatedSeason: Season = { ...season, posterConfig: config };
    set(s => ({
      shows: s.shows.map(sh =>
        sh.id === showID
          ? { ...sh, seasons: sh.seasons.map((se, i) => i === sh.currentSeasonIndex ? updatedSeason : se) }
          : sh,
      ),
    }));
  },

  // ── Pitches ───────────────────────────────────────────────────────────────

  acquireShow: (pitchID, winningBid) => {
    const state = get();
    const pitch = state.pitches.find(p => p.id === pitchID);
    if (!pitch || pitch.greenlitByPlayer || pitch.passed) return false;
    if (state.network.cashOnHand < winningBid) return false;

    const showID = nanoid();
    const seasonID = nanoid();

    // Attach crew — the show is fully produced, fees are baked into the bid.
    // Crew popularity is matched to the show's quality so the roster feels
    // appropriate (high-quality shows arrive with more prominent talent).
    const avail = state.talent.filter(t => t.available);

    const q = pitch.hiddenQualityScore;
    const popMin = q >= 67 ? 55 : q >= 34 ? 25 : 0;
    const popMax = q >= 67 ? 100 : q >= 34 ? 70 : 45;

    function pickTiered(pool: Talent[]): Talent | null {
      const tiered = pool.filter(t => t.popularity >= popMin && t.popularity <= popMax);
      const src = tiered.length > 0 ? tiered : pool;
      return src.length > 0 ? src[Math.floor(Math.random() * src.length)] : null;
    }

    const showrunner =
      avail.find(t => t.id === pitch.showrunnerID && t.role === 'showrunner') ??
      pickTiered(avail.filter(t => t.role === 'showrunner')) ??
      null;

    const directorPool = avail.filter(t => t.role === 'director' && t.id !== showrunner?.id);
    const director = pickTiered(directorPool);

    const used = new Set([showrunner?.id, director?.id].filter(Boolean));
    const actorPool = avail
      .filter(t => t.role === 'actor' && !used.has(t.id))
      .sort(() => Math.random() - 0.5);
    // Within each slot type, prefer the quality tier; fallback handled inside pickTiered
    const tieredActors = [
      ...actorPool.filter(t => t.popularity >= popMin && t.popularity <= popMax),
      ...actorPool.filter(t => t.popularity < popMin || t.popularity > popMax),
    ];
    const leadActors       = tieredActors.slice(0, 2);
    const supportingActors = tieredActors.slice(2, 4);

    const crewIDs = [
      ...(showrunner ? [showrunner.id] : []),
      ...(director   ? [director.id]   : []),
      ...leadActors.map(a => a.id),
      ...supportingActors.map(a => a.id),
    ];

    // Zero-fee deals — cost is already captured in the winning bid
    const acquiredDeals: TalentDeal[] = crewIDs.map(talentID => ({
      id: nanoid(),
      talentID,
      showID,
      seasonID,
      flatFee: 0,
      revenueSharePercent: 0,
      agreedWeek: state.network.currentWeek,
      agreedYear: state.network.currentYear,
    }));

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

    // Show is fully produced — writing and filming are already complete.
    const season: Season = {
      id: seasonID,
      showID,
      seasonNumber: 1,
      episodeCount: pitch.proposedEpisodeCount,
      writingWeeksTotal: WRITING_WEEKS,
      writingWeeksCompleted: WRITING_WEEKS,
      filmingWeeksTotal: pitch.proposedEpisodeCount,
      filmingWeeksCompleted: pitch.proposedEpisodeCount,
      marketingWeeksTotal: 0,
      marketingWeeksCompleted: 0,
      airDateWeek: null,
      airDateYear: null,
      episodesAired: 0,
      episodes,
      totalViewers: 0,
      totalAdRevenue: 0,
      productionCost: winningBid,
      marketingSpend: 0,
      marketingChannelIDs: [],
      streamingRevenue: 0,
      renewalDecisionMade: false,
      renewed: false,
      showrunnerSlots: showrunner ? 1 : 0,
      showrunnerIDs: showrunner ? [showrunner.id] : [],
      leadActorSlots: leadActors.length,
      leadActorIDs: leadActors.map(a => a.id),
      supportingActorSlots: supportingActors.length,
      supportingActorIDs: supportingActors.map(a => a.id),
      directorID: director?.id ?? null,
      scriptScore: Math.min(100, Math.round(pitch.hiddenQualityScore * 1.05)),
      qualityScore: pitch.hiddenQualityScore,
      suggestedShowrunnerIDs: [],
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
      status: 'marketing',
      seasons: [season],
      currentSeasonIndex: 0,
      streamingDeals: [],
      pendingStreamingOffer: null,
      streamingOfferCheckWeek: null,
      streamingOfferCheckYear: null,
      streamingCheckedAtSeasonCount: 0,
      cancelledClean: true,
      heatMultiplier: 1.0,
    };

    set(s => ({
      network: {
        ...s.network,
        cashOnHand: s.network.cashOnHand - winningBid,
      },
      shows: [...s.shows, show],
      pitches: s.pitches.map(p =>
        p.id === pitchID ? { ...p, greenlitByPlayer: true } : p,
      ),
      talent: s.talent.map(t =>
        crewIDs.includes(t.id)
          ? {
              ...t,
              available: false,
              bookedForSeasonID: seasonID,
              careerShowIDs: t.careerShowIDs.includes(showID) ? t.careerShowIDs : [...t.careerShowIDs, showID],
            }
          : t,
      ),
      talentDeals: [...s.talentDeals, ...acquiredDeals],
    }));

    const acquisitionNews = makeNewShowRumorNews(
      pitch.title, pitch.genre, get().network.name, false,
      { week: state.network.currentWeek, year: state.network.currentYear },
    );
    set(s => ({ newsItems: [...s.newsItems, acquisitionNews] }));

    const newIDsAcq = checkAchievements(get());
    if (newIDsAcq.length > 0) {
      set(s => ({
        unlockedAchievementIDs: [...s.unlockedAchievementIDs, ...newIDsAcq],
        achievementQueue: [...s.achievementQueue, ...newIDsAcq],
      }));
    }

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

  renewShow: (showID, newEpisodeCount, newLeadSlots, newSupportingSlots, newShowrunnerSlots, keepShowrunnerIDs = [], isFinalSeason = false) => {
    const state = get();
    const show = state.shows.find(s => s.id === showID);
    if (!show || show.status !== 'renewal-pending') return;

    const prevSeason = show.seasons[show.currentSeasonIndex];
    const newSeasonNumber = prevSeason.seasonNumber + 1;
    const { currentWeek, currentYear } = state.network;
    const ratedEps = prevSeason.episodes.filter(e => e.rating !== null);
    const avgRating = ratedEps.length > 0
      ? ratedEps.reduce((sum, e) => sum + (e.rating ?? 0), 0) / ratedEps.length
      : undefined;
    const socialPosts = isFinalSeason
      ? generateFinalSeasonAnnouncedPosts(show.title, newSeasonNumber, currentWeek, currentYear)
      : generateRenewalPosts(show.title, newSeasonNumber, currentWeek, currentYear, avgRating);
    const newSeasonID = nanoid();
    const resolvedLeadSlots = newLeadSlots ?? prevSeason.leadActorSlots;
    const resolvedSupportingSlots = newSupportingSlots ?? prevSeason.supportingActorSlots;
    const resolvedShowrunnerSlots = newShowrunnerSlots ?? prevSeason.showrunnerSlots;

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
      filmingWeeksTotal: newEpisodeCount,
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
      streamingRevenue: 0,
      renewalDecisionMade: false,
      renewed: false,
      showrunnerSlots: resolvedShowrunnerSlots,
      showrunnerIDs: keepShowrunnerIDs,
      leadActorSlots: resolvedLeadSlots,
      supportingActorSlots: resolvedSupportingSlots,
      leadActorIDs: [],
      supportingActorIDs: [],
      directorID: null,
      scriptScore: 0,
      qualityScore: 50,
      suggestedShowrunnerIDs: [...prevSeason.showrunnerIDs],
      suggestedDirectorID: prevSeason.directorID,
      suggestedLeadActorIDs: [...prevSeason.leadActorIDs],
      suggestedSupportingActorIDs: [...prevSeason.supportingActorIDs],
      isFinalSeason,
    };

    // Free up talent from previous season now that filming is long done
    const keepShowrunnerIDSet = new Set(keepShowrunnerIDs);
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

    const renewalNews: NewsItem = isFinalSeason
      ? makeFinalSeasonAnnouncedNews(show.title, newSeasonNumber, { week: state.network.currentWeek, year: state.network.currentYear })
      : {
          id: nanoid(),
          week: state.network.currentWeek,
          year: state.network.currentYear,
          type: 'player',
          read: false,
          headline: viewers > 0
            ? `"${show.title}" renewed for Season ${newSeasonNumber} — ${vStr} viewers watched S${prevSeason.seasonNumber}`
            : `"${show.title}" renewed for Season ${newSeasonNumber}`,
          body: `The network has officially greenlit another season. Pre-production begins immediately.`,
          byline: 'Trade Wire Staff',
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
      // Free previous season's cast/director; handle showrunners based on player choice
      talent: s.talent.map(t => {
        if (prevCast.includes(t.id) && t.bookedForSeasonID === prevSeason.id) {
          return { ...t, available: true, bookedForSeasonID: null };
        }
        if (prevSeason.showrunnerIDs.includes(t.id)) {
          return keepShowrunnerIDSet.has(t.id)
            ? { ...t, bookedForSeasonID: newSeasonID }
            : { ...t, available: true, bookedForSeasonID: null };
        }
        return t;
      }),
      newsItems: [...s.newsItems, renewalNews].slice(-150),
      ambientSocialPosts: [...s.ambientSocialPosts, ...socialPosts].slice(-300),
    }));
    const newIDsRnw = checkAchievements(get());
    if (newIDsRnw.length > 0) set(s => ({ unlockedAchievementIDs: [...s.unlockedAchievementIDs, ...newIDsRnw], achievementQueue: [...s.achievementQueue, ...newIDsRnw] }));
  },

  cancelShow: (showID) => {
    const state = get();
    const show = state.shows.find(s => s.id === showID);
    if (!show) return;

    const season = show.seasons[show.currentSeasonIndex];
    const bookedTalent = [
      ...season.showrunnerIDs,
      season.directorID,
      ...season.leadActorIDs,
      ...season.supportingActorIDs,
    ].filter(Boolean) as string[];

    // Cancelling from renewal-pending = clean; mid-production = unclean
    const cancelledClean = show.status === 'renewal-pending';

    const ratedEps = season.episodes.filter(e => e.rating !== null);
    const avgRating = ratedEps.length > 0
      ? ratedEps.reduce((sum, e) => sum + (e.rating ?? 0), 0) / ratedEps.length
      : undefined;
    const { currentWeek, currentYear } = state.network;
    const cancellationPosts = generateCancellationPosts(show.title, cancelledClean, currentWeek, currentYear, avgRating);

    set(s => ({
      shows: s.shows.map(sh =>
        sh.id === showID ? { ...sh, status: 'cancelled' as ShowStatus, cancelledClean } : sh,
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
      ambientSocialPosts: [...s.ambientSocialPosts, ...cancellationPosts].slice(-300),
    }));
    const newIDsCx = checkAchievements(get());
    if (newIDsCx.length > 0) set(s => ({ unlockedAchievementIDs: [...s.unlockedAchievementIDs, ...newIDsCx], achievementQueue: [...s.achievementQueue, ...newIDsCx] }));
  },

  // ── Streaming ─────────────────────────────────────────────────────────────

  acceptStreamingOffer: (showID, dealType) => {
    const state = get();
    const show = state.shows.find(s => s.id === showID);
    if (!show?.pendingStreamingOffer) return;

    const offer = show.pendingStreamingOffer;
    const amount = dealType === 'exclusive' ? offer.exclusiveAmount : offer.nonExclusiveAmount;

    // Attribute revenue proportionally across included seasons
    const includedSeasons = show.seasons.filter(s => offer.seasonsToInclude.includes(s.seasonNumber));
    const totalEps = includedSeasons.reduce((sum, s) => sum + s.episodeCount, 0);

    const deal = {
      id: nanoid(),
      platformName: offer.platformName,
      amount,
      dealType,
      seasonsIncluded: offer.seasonsToInclude,
      acceptedWeek: state.network.currentWeek,
      acceptedYear: state.network.currentYear,
      durationYears: offer.durationYears,
      expiresWeek: state.network.currentWeek,
      expiresYear: state.network.currentYear + offer.durationYears,
    };

    const dealNews = makeStreamingDealNews(
      show.title,
      offer.seasonsToInclude,
      offer.platformName,
      { week: state.network.currentWeek, year: state.network.currentYear },
    );

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
              pendingStreamingOffer: null,
              streamingDeals: [...sh.streamingDeals, deal],
              // Attribute revenue proportionally; last included season absorbs
              // any rounding remainder so season totals always sum to deal amount.
              seasons: (() => {
                const lastIncluded = Math.max(...offer.seasonsToInclude);
                let distributed = 0;
                return sh.seasons.map(se => {
                  if (!offer.seasonsToInclude.includes(se.seasonNumber)) return se;
                  const isLast = se.seasonNumber === lastIncluded;
                  const share = isLast
                    ? amount - distributed
                    : Math.round((amount * se.episodeCount) / Math.max(totalEps, 1) / 100_000) * 100_000;
                  distributed += share;
                  return { ...se, streamingRevenue: se.streamingRevenue + share };
                });
              })(),
            }
          : sh,
      ),
      newsItems: [...s.newsItems, dealNews].slice(-150),
      inboxItems: s.inboxItems.map(item =>
        item.type === 'streaming-offer' && item.refID === showID ? { ...item, read: true } : item,
      ),
    }));
    const newIDsSt = checkAchievements(get());
    if (newIDsSt.length > 0) set(s => ({ unlockedAchievementIDs: [...s.unlockedAchievementIDs, ...newIDsSt], achievementQueue: [...s.achievementQueue, ...newIDsSt] }));
  },

  declineStreamingOffer: (showID) => {
    const state = get();
    const { currentWeek, currentYear } = state.network;
    const delay = randomBetween(8, 20);
    const raw = currentWeek + delay;
    const checkWeek = raw > 52 ? raw - 52 : raw;
    const checkYear = raw > 52 ? currentYear + 1 : currentYear;

    set(s => ({
      shows: s.shows.map(sh =>
        sh.id === showID
          ? {
              ...sh,
              pendingStreamingOffer: null,
              streamingOfferCheckWeek: checkWeek,
              streamingOfferCheckYear: checkYear,
            }
          : sh,
      ),
      inboxItems: s.inboxItems.map(item =>
        item.type === 'streaming-offer' && item.refID === showID ? { ...item, read: true } : item,
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

  resolveStudioEvent: (eventID, choiceIndex) => {
    const state = get();
    const ev = state.studioEvents.find(e => e.id === eventID);
    if (!ev || ev.resolved) return;
    const choice = ev.choices[choiceIndex];
    if (!choice) return;

    const { prestigeDelta = 0, cashDelta = 0, delayWeeks = 0, newsHeadline, newsBody } = choice.consequence;

    const newNews: NewsItem[] = newsHeadline && newsBody
      ? [{
          id: nanoid(),
          week: state.network.currentWeek,
          year: state.network.currentYear,
          type: 'player',
          read: false,
          headline: newsHeadline,
          body: newsBody,
          byline: 'Trade Wire Staff',
        }]
      : [];

    set(s => {
      // Apply delayWeeks to the show's current season if applicable
      let updatedShows = s.shows;
      if (delayWeeks > 0 && ev.showID) {
        updatedShows = s.shows.map(sh => {
          if (sh.id !== ev.showID) return sh;
          return {
            ...sh,
            seasons: sh.seasons.map((se, idx) => {
              if (idx !== sh.currentSeasonIndex) return se;
              if (sh.status === 'writing') {
                return { ...se, writingWeeksTotal: se.writingWeeksTotal + delayWeeks };
              }
              if (sh.status === 'filming') {
                return { ...se, filmingWeeksTotal: se.filmingWeeksTotal + delayWeeks };
              }
              return se;
            }),
          };
        });
      }

      return {
        shows: updatedShows,
        network: {
          ...s.network,
          prestige: Math.max(0, Math.min(100, s.network.prestige + prestigeDelta)),
          cashOnHand: s.network.cashOnHand + cashDelta,
          careerEarnings: cashDelta > 0 ? s.network.careerEarnings + cashDelta : s.network.careerEarnings,
        },
        studioEvents: s.studioEvents.map(e =>
          e.id === eventID ? { ...e, resolved: true, chosenOptionIndex: choiceIndex } : e,
        ),
        newsItems: newNews.length > 0 ? [...s.newsItems, ...newNews].slice(-150) : s.newsItems,
      };
    });
  },

  // ── Emmy Ceremony ─────────────────────────────────────────────────────────

  // ── Loan Shark ────────────────────────────────────────────────────────────

  takeLoan: (size) => {
    const state = get();
    if (state.activeLoan) return false; // one loan at a time

    const PRINCIPALS = { small: 2_000_000, medium: 5_000_000, large: 10_000_000 };
    const principal = PRINCIPALS[size];

    // Interest rate increases 10% per prior loan (caps at 87% on 3rd+)
    const extraInterest = Math.min(2, state.loansTaken) * 0.10;
    const interestRate = 0.67 + extraInterest;
    const amountOwed = Math.round(principal * (1 + interestRate));

    const { currentWeek, currentYear } = state.network;
    const loan: import('../types').ActiveLoan = {
      id: nanoid(),
      principal,
      amountOwed,
      interestRate,
      takenWeek: currentWeek,
      takenYear: currentYear,
      dueWeek: currentWeek,
      dueYear: currentYear + 1,
      weeksOverdue: 0,
      prestigePenaltyApplied: false,
    };

    set(s => ({
      network: { ...s.network, cashOnHand: s.network.cashOnHand + principal },
      activeLoan: loan,
      loansTaken: s.loansTaken + 1,
    }));
    return true;
  },

  repayLoan: () => {
    const state = get();
    if (!state.activeLoan) return false;
    if (state.network.cashOnHand < state.activeLoan.amountOwed) return false;
    set(s => ({
      network: { ...s.network, cashOnHand: s.network.cashOnHand - s.activeLoan!.amountOwed },
      activeLoan: null,
    }));
    return true;
  },

  dismissEmmyCeremony: () => set({ emmyCeremonyPendingYear: null }),

  dismissAchievement: () => set(s => ({ achievementQueue: s.achievementQueue.slice(1) })),

  // ── Persistence ───────────────────────────────────────────────────────────

  saveGame: async () => {
    await saveGameToStorage(get());
  },

  loadGame: async (slot) => {
    const loaded = await loadGameFromStorage(slot);
    if (!loaded) return false;

    // Migrate old saves: add show-level streaming fields and season streamingRevenue
    const migratedShows = (loaded.shows ?? []).map((sh: any) => ({
      streamingDeals: [],
      pendingStreamingOffer: null,
      streamingOfferCheckWeek: null,
      streamingOfferCheckYear: null,
      streamingCheckedAtSeasonCount: 0,
      cancelledClean: true,
      heatMultiplier: 1.0,
      ...sh,
      seasons: (sh.seasons ?? []).map((se: any) => {
        // Strip old season-level streaming fields; add streamingRevenue
        const {
          streamingOfferReceived: _a,
          streamingOfferAmount: _b,
          streamingOfferSource: _c,
          streamingOfferAccepted: _d,
          streamingOfferExpiresWeek: _e,
          streamingOfferExpiresYear: _f,
          streamingDealDurationYears: _g,
          ...rest
        } = se;
        return {
          streamingRevenue: 0,
          showrunnerSlots: rest.showrunnerSlots ?? 1,
          showrunnerIDs: rest.showrunnerIDs ?? (rest.showrunnerID ? [rest.showrunnerID] : []),
          suggestedShowrunnerIDs: rest.suggestedShowrunnerIDs ?? [],
          ...rest,
        };
      }),
    }));

    // Migrate old saves: add new CompetitorStudio and CompetitorShow fields
    const migratedCompetitors = (loaded.competitors ?? []).map((c: any) => ({
      tier: 'established' as const,
      capital: 25_000_000,
      showsGreenlitThisYear: 0,
      preferredGenres: [],
      logoConfig: EMPTY_STATE.network.logoConfig,
      ...c,
      activeShows: (c.activeShows ?? []).map((s: any) => ({
        marketingWeeksRemaining: 0,
        baseRating: s.currentRating ?? 5.0,
        marketingViewerBoost: 1.0,
        lastSeasonCompletedYear: null,
        lastSeasonFinalRating: null,
        ...s,
      })),
    }));

    // Migrate awards: add nominationScore
    const migrateAward = (a: any) => ({ nominationScore: 5.0, ...a });
    const migratedAwards = (loaded.awards ?? []).map(migrateAward);
    const migratedTalent = (loaded.talent ?? []).map((t: any) => ({
      ...t,
      awards: (t.awards ?? []).map(migrateAward),
    }));

    const migratedNewsItems = (loaded.newsItems ?? []).map((n: NewsItem) => ({
      ...n,
      byline: n.byline ?? 'Trade Wire Staff',
    }));

    set({
      ...loaded,
      network: {
        ...loaded.network,
        logoConfig: loaded.network.logoConfig ?? EMPTY_STATE.network.logoConfig,
      },
      shows: migratedShows,
      competitors: migratedCompetitors,
      awards: migratedAwards,
      talent: migratedTalent,
      newsItems: migratedNewsItems,
      studioEvents: loaded.studioEvents ?? [],
      emmyCeremonyPendingYear: loaded.emmyCeremonyPendingYear ?? null,
      saveSlot: slot,
      ambientSocialPosts: loaded.ambientSocialPosts ?? [],
      recentSocialTemplateIds: loaded.recentSocialTemplateIds ?? [],
      recentAmbientTemplateIds: loaded.recentAmbientTemplateIds ?? [],
      unlockedAchievementIDs: loaded.unlockedAchievementIDs ?? [],
      achievementQueue: [],
      activeLoan: loaded.activeLoan ?? null,
      loansTaken: loaded.loansTaken ?? 0,
    });
    return true;
  },

  resetGame: async () => {
    const { saveSlot } = get();
    await deleteSave(saveSlot);
    set({ ...EMPTY_STATE, initialized: false });
  },
}));