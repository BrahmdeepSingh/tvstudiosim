import { CompetitorStudio, CompetitorShow, NewsItem, Genre, Talent } from '../types';
import {
  COMPETITOR_STUDIO_CONFIGS,
  COMPETITOR_CANCEL_THRESHOLD,
  MAX_COMPETITOR_ACTIVE_SHOWS,
  MAX_COMPETITOR_SHOWS_PER_YEAR,
  COMPETITOR_GREENLIGHT_CHANCES,
  COMPETITOR_PRODUCTION_COSTS,
  GENRE_CONFIG,
} from '../constants/game';
import {
  makeCompetitorCancelledNews,
  makeCompetitorRenewedNews,
  makeCompetitorGreenlitNews,
  makeCompetitorPremiereNews,
  makeCompetitorCompletedNews,
} from './news';
import { nanoid } from '../utils/nanoid';
import { randomBetween, randomItem, randomChance, randomFloat, clamp } from '../utils/random';

type StudioTier = 'powerhouse' | 'established' | 'independent';

const ALL_GENRES: Genre[] = ['drama', 'comedy', 'sci-fi', 'procedural', 'reality', 'limited-series'];

const MARKETING_WEEKS = 2;
const MARKETING_VIEWER_BOOST: Record<StudioTier, [number, number]> = {
  powerhouse:  [1.15, 1.35],
  established: [1.05, 1.20],
  independent: [1.00, 1.10],
};

const COMPETITOR_TITLES: Record<Genre, string[]> = {
  drama: [
    'Cold Harbor', 'Ash & Iron', 'The Quiet War', 'Crown Heights', 'The Weight',
    'Broken Meridian', 'Dark Current', 'Hollow Ground', 'The Last Bridge', 'Nightfall',
    'Second Chance', 'Silver Falls', 'Pacific Standard', 'Ember Ridge', 'North Wall',
    'Red Line', 'Stone House', 'Open Water', 'The Collapse', 'Black Sea',
    'Iron Law', 'Pressure Point', 'The Reckoning', 'Deep Roots', 'Still Waters',
    'Fault Lines', 'The Long Road', 'Under Fire', 'Lost Ground', 'Blind Eye',
  ],
  comedy: [
    'Perfectly Fine', 'Wild Pitch', 'Good Enough', 'The Arrangement', 'Damage Control',
    'Off Script', 'Second Draft', 'Easy Does It', 'Better Luck', 'Working Title',
    'The Daily Grind', 'Side Effects', 'Plot Twist', 'Common Ground', 'Nice Try',
    'Overtime', 'Moving Parts', 'The Good Job', 'Fresh Start', 'Weekend Plans',
    'Out of Order', 'Side Hustle', 'No Big Deal', 'Almost There', 'Running Late',
    'Best Intentions', 'Close Enough', 'Fair Warning', 'Mixed Signals', 'Soft Landing',
  ],
  'sci-fi': [
    'The Fold', 'Static', 'Null Space', 'Threshold', 'Event Protocol',
    'Outer Signal', 'Deep Axis', 'Phase Drift', 'Dark Matter', 'Singularity',
    'Terminal Orbit', 'The Last Ship', 'Quantum State', 'Red Horizon', 'Zero Point',
    'Cold Fusion', 'Iron Sky', 'The Shift', 'Cascade Effect', 'Solar Wind',
    'Gravity Well', 'Echo Chamber', 'Dead Reckoning', 'Stellar', 'Void Protocol',
    'Warp Signal', 'Event Horizon', 'Dark Frequency', 'The Anomaly', 'Core Collapse',
  ],
  procedural: [
    'Case Pending', 'The Unit', 'District 7', 'Hard Evidence', 'Field Work',
    'Chain of Evidence', 'Night Shift', 'Clear Record', 'The Beat', 'Final Verdict',
    'Under Oath', 'Cold Case', 'The Lineup', 'Night Patrol', 'Sworn Statement',
    'Reasonable Doubt', 'Open File', 'The Precinct', 'Full Disclosure', 'Witness Stand',
    'Code of Silence', 'Internal Affairs', 'True Crime', 'By the Book', 'The Division',
    'Last Resort', 'Strike Force', 'On the Record', 'The Watch', 'Blue Line',
  ],
  reality: [
    'The Compound', 'Last Standing', 'Open Floor', 'Final Draft', 'The Trade',
    'All In', 'Raw Cut', 'The Circuit', 'The Summit', 'Last One Out',
    'Full Exposure', 'The Island', 'Pressure Test', 'On the Line', 'True Colors',
    'Cut Throat', 'Head to Head', 'Winner Takes All', 'The Grind', 'High Stakes',
    'Real Talk', 'Total Control', 'No Limits', 'The Drop', 'Stripped Back',
    'First Cut', 'The Gauntlet', 'Dead Heat', 'Zero Hour', 'Final Round',
  ],
  'limited-series': [
    'Seventeen Days', 'The Last Summer', 'A Quiet Exit', 'Fractured', 'Point of Origin',
    'Long Echo', 'The Hours After', 'Endgame', 'One Last Thing', 'Final Chapter',
    'The Quiet Season', 'Last Light', 'A Brief History', 'The Unraveling', 'Aftermath',
    'Before It Ends', 'A Single Thread', 'Loose Ends', 'Remnants', 'The Long Goodbye',
    'Closing Time', 'The Settlement', 'Last Rites', 'The Vanishing', 'Burning Season',
    'End of Days', 'The Departure', 'Without a Trace', 'The Final Act', 'Dead of Winter',
  ],
};

function pickTitle(genre: Genre, usedTitles: Set<string>): string {
  const available = COMPETITOR_TITLES[genre].filter(t => !usedTitles.has(t));
  const pool = available.length > 0 ? available : COMPETITOR_TITLES[genre];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Quality from talent stats ────────────────────────────────────────────────

function computeBaseRating(
  showrunnerID: string | null,
  directorID: string | null,
  actorIDs: string[],
  genre: Genre,
  talent: Talent[],
): number {
  const config = GENRE_CONFIG[genre];

  const showrunner = talent.find(t => t.id === showrunnerID);
  const scriptScore =
    showrunner?.stats.role === 'showrunner'
      ? showrunner.stats.writing * 0.50 + showrunner.stats.creativity * 0.30 + showrunner.stats.consistency * 0.20
      : 50;

  const director = talent.find(t => t.id === directorID);
  const directorScore =
    director?.stats.role === 'director'
      ? director.stats.direction * 0.60 + director.stats.vision * 0.40
      : 50;

  const actors = actorIDs.map(id => talent.find(t => t.id === id)).filter(Boolean) as Talent[];
  const avgActing =
    actors.length > 0
      ? actors.reduce((sum, a) => sum + (a.stats.role === 'actor' ? a.stats.acting : 0), 0) / actors.length
      : 50;

  const productionScore = directorScore * 0.55 + avgActing * 0.45;
  const combined = scriptScore * 0.45 + productionScore * 0.55;
  const quality = clamp(combined + randomFloat(-6, 6), 0, 100);

  return Math.round((quality / 100) * config.ratingCeiling * 10) / 10;
}

// ─── Revenue & prestige ───────────────────────────────────────────────────────

// Tier multiplier on ad CPM — powerhouses negotiate better rates
const TIER_AD_MULTIPLIER: Record<StudioTier, number> = {
  powerhouse:  1.30,
  established: 1.00,
  independent: 0.80,
};

// Minimum capital floor — studios have parent-company credit lines
const CAPITAL_FLOOR: Record<StudioTier, number> = {
  powerhouse:   10_000_000,
  established:   4_000_000,
  independent:   2_000_000,
};

function computeWeeklyAdRevenue(tier: StudioTier, viewers: number, genre: Genre, rating: number): number {
  const config = GENRE_CONFIG[genre];
  const effectiveCPM = config.cpm * (1 + (rating - 5) / 10) * TIER_AD_MULTIPLIER[tier];
  return Math.round((viewers / 1000) * effectiveCPM);
}

// One-time streaming/syndication bonus on natural season completion for high-rated shows
function computeCompletionBonus(tier: StudioTier, avgRating: number): number {
  if (avgRating < 7.0) return 0;
  const cost = COMPETITOR_PRODUCTION_COSTS[tier];
  return Math.round(cost * ((avgRating - 7.0) / 10)); // 0 at 7.0, 30% of cost at 10.0
}

// Prestige delta at season end — reflects critical reception
function computePrestigeDelta(avgRating: number, cancelled: boolean): number {
  if (cancelled) return -2;
  return Math.round(avgRating - 5.5); // +2.5 at 8.0, 0 at ~5.5, -1.5 at 4.0
}

// ─── Initial generation ───────────────────────────────────────────────────────

export function generateInitialCompetitors(
  talent: Talent[],
): { competitors: CompetitorStudio[]; updatedTalent: Talent[] } {
  let mutableTalent = [...talent];
  const competitors: CompetitorStudio[] = [];

  for (let i = 0; i < COMPETITOR_STUDIO_CONFIGS.length; i++) {
    const cfg = COMPETITOR_STUDIO_CONFIGS[i];
    const studioID = nanoid();
    let initialShows: CompetitorShow[] = [];

    // Powerhouses start with 1 show already mid-air
    if (cfg.tier === 'powerhouse') {
      const genre = randomItem(cfg.preferredGenres);
      const { show, updatedTalent: t1 } = generateAiringShow(studioID, genre, mutableTalent);
      mutableTalent = t1;
      initialShows = [show];
    }

    competitors.push({
      id: studioID,
      name: cfg.name,
      prestige: cfg.startingPrestige,
      tier: cfg.tier,
      capital: cfg.startingCapital,
      showsGreenlitThisYear: cfg.tier === 'powerhouse' ? 1 : 0,
      preferredGenres: cfg.preferredGenres,
      activeShows: initialShows,
      emmysWon: cfg.tier === 'powerhouse' ? randomBetween(1, 4) : randomBetween(0, 2),
      totalShowsProduced: cfg.tier === 'powerhouse' ? randomBetween(4, 10) : randomBetween(1, 5),
    });
  }

  return { competitors, updatedTalent: mutableTalent };
}

// Creates a show already mid-airing with a booked showrunner (initial game state only).
// Also ghost-links a director and 2 actors via careerShowIDs so Emmy lookups resolve
// to real names rather than comp-${showID} placeholders. Those talent stay available
// since filming is already over.
function generateAiringShow(
  studioID: string,
  genre: Genre,
  talent: Talent[],
): { show: CompetitorShow; updatedTalent: Talent[] } {
  const config = GENRE_CONFIG[genre];
  const baseRating = randomFloat(5.5, 8.0);
  const roundedRating = Math.round(baseRating * 10) / 10;
  const totalEpisodes = randomBetween(8, 12);
  const showID = nanoid();

  const { updatedTalent: t1, showrunnerID } = bookShowrunnerForTier(talent, showID, 'powerhouse');

  // Ghost-link director and 2 actors — sets careerShowIDs without marking them busy
  let updatedTalent = [...t1];
  const availDirectors = updatedTalent.filter(t => t.available && t.role === 'director');
  const director = pickTalentForTier(availDirectors, 'powerhouse');
  if (director) {
    updatedTalent = updatedTalent.map(t =>
      t.id === director.id
        ? { ...t, careerShowIDs: t.careerShowIDs.includes(showID) ? t.careerShowIDs : [...t.careerShowIDs, showID] }
        : t,
    );
  }
  const availActors = updatedTalent.filter(t => t.available && t.role === 'actor');
  const shuffled = [...availActors].sort(() => Math.random() - 0.5).slice(0, 2);
  for (const actor of shuffled) {
    updatedTalent = updatedTalent.map(t =>
      t.id === actor.id
        ? { ...t, careerShowIDs: t.careerShowIDs.includes(showID) ? t.careerShowIDs : [...t.careerShowIDs, showID] }
        : t,
    );
  }

  const show: CompetitorShow = {
    id: showID,
    studioID,
    title: pickTitle(genre, new Set()),
    genre,
    status: 'airing',
    currentRating: roundedRating,
    weeklyViewers: Math.round(config.baseViewers * (baseRating / 5)),
    seasonNumber: 1,
    episodesAired: randomBetween(1, 5),
    totalEpisodes,
    preProductionWeeksRemaining: 0,
    filmingWeeksRemaining: 0,
    marketingWeeksRemaining: 0,
    baseRating: roundedRating,
    marketingViewerBoost: 1.2,
    bookedShowrunnerID: showrunnerID,
    bookedDirectorID: null,
    bookedActorIDs: [],
    lastSeasonCompletedYear: null,
    lastSeasonFinalRating: null,
  };

  return { show, updatedTalent };
}

// Creates a new show entering the full pipeline at pre-production

function createShowInPipeline(studioID: string, genre: Genre, usedTitles: Set<string>): CompetitorShow {
  const config = GENRE_CONFIG[genre];
  const baseRating = randomFloat(4.0, 7.5);
  const totalEpisodes = randomBetween(8, 12);

  return {
    id: nanoid(),
    studioID,
    title: pickTitle(genre, usedTitles),
    genre,
    status: 'pre-production',
    currentRating: Math.round(baseRating * 10) / 10,
    weeklyViewers: Math.round(config.baseViewers * (baseRating / 5)),
    seasonNumber: 1,
    episodesAired: 0,
    totalEpisodes,
    preProductionWeeksRemaining: 3,
    filmingWeeksRemaining: totalEpisodes,
    marketingWeeksRemaining: 0,
    baseRating: 0, // computed when filming ends
    marketingViewerBoost: 1.0,
    bookedShowrunnerID: null,
    bookedDirectorID: null,
    bookedActorIDs: [],
    lastSeasonCompletedYear: null,
    lastSeasonFinalRating: null,
  };
}

// ─── Genre selection ──────────────────────────────────────────────────────────

function pickGenreForStudio(preferredGenres: Genre[]): Genre {
  if (preferredGenres.length > 0 && Math.random() < 0.70) {
    return randomItem(preferredGenres);
  }
  return randomItem(ALL_GENRES);
}

// ─── Weekly tick ──────────────────────────────────────────────────────────────

interface CompetitorAdvanceResult {
  updatedCompetitors: CompetitorStudio[];
  newsItems: NewsItem[];
  updatedTalent: Talent[];
}

export function advanceCompetitors(
  competitors: CompetitorStudio[],
  talent: Talent[],
  week: number,
  year: number,
): CompetitorAdvanceResult {
  const newsItems: NewsItem[] = [];
  const ctx = { week, year };
  let mutableTalent = [...talent];

  // All show titles currently in use across every studio — prevents duplicates on greenlight
  const globalUsedTitles = new Set<string>(
    competitors.flatMap(c => c.activeShows.map(s => s.title)),
  );

  const updatedCompetitors = competitors.map(studio => {
    const updatedShows: CompetitorShow[] = [];
    let showsProducedDelta = 0;
    let capitalDelta = 0;
    let prestigeDelta = 0;
    const showsGreenlitThisYear = week === 1 ? 0 : studio.showsGreenlitThisYear;

    for (const show of studio.activeShows) {
      // Dead shows stay in the array for news/history reference but don't advance
      if (show.status === 'completed' || show.status === 'cancelled') {
        updatedShows.push(show);
        continue;
      }

      // ── Pre-production (3 weeks, showrunner booked) ─────────────────────
      if (show.status === 'pre-production') {
        const remaining = show.preProductionWeeksRemaining - 1;
        if (remaining <= 0) {
          const { updatedTalent: t1, directorID, actorIDs } = bookFilmingTalentForTier(
            mutableTalent, show.id, studio.tier,
          );
          mutableTalent = t1;
          updatedShows.push({
            ...show,
            status: 'filming',
            preProductionWeeksRemaining: 0,
            filmingWeeksRemaining: show.totalEpisodes,
            bookedDirectorID: directorID,
            bookedActorIDs: actorIDs,
          });
        } else {
          updatedShows.push({ ...show, preProductionWeeksRemaining: remaining });
        }
        continue;
      }

      // ── Filming (= totalEpisodes weeks, actors + director booked) ───────
      if (show.status === 'filming') {
        const remaining = show.filmingWeeksRemaining - 1;
        if (remaining <= 0) {
          const base = computeBaseRating(
            show.bookedShowrunnerID, show.bookedDirectorID, show.bookedActorIDs,
            show.genre, mutableTalent,
          );
          const [boostMin, boostMax] = MARKETING_VIEWER_BOOST[studio.tier];
          const boost = randomFloat(boostMin, boostMax);

          mutableTalent = releaseFilmingTalent(mutableTalent, show);
          updatedShows.push({
            ...show,
            status: 'marketing',
            filmingWeeksRemaining: 0,
            marketingWeeksRemaining: MARKETING_WEEKS,
            baseRating: base,
            currentRating: base,
            marketingViewerBoost: Math.round(boost * 100) / 100,
            bookedDirectorID: null,
            bookedActorIDs: [],
          });
        } else {
          updatedShows.push({ ...show, filmingWeeksRemaining: remaining });
        }
        continue;
      }

      // ── Marketing (MARKETING_WEEKS) ─────────────────────────────────────
      if (show.status === 'marketing') {
        const remaining = show.marketingWeeksRemaining - 1;
        if (remaining <= 0) {
          const config = GENRE_CONFIG[show.genre];
          const initialViewers = Math.round(
            config.baseViewers * (show.baseRating / 5) * show.marketingViewerBoost,
          );
          newsItems.push(makeCompetitorPremiereNews(studio, show, ctx));
          updatedShows.push({
            ...show,
            status: 'airing',
            marketingWeeksRemaining: 0,
            weeklyViewers: initialViewers,
          });
        } else {
          updatedShows.push({ ...show, marketingWeeksRemaining: remaining });
        }
        continue;
      }

      // ── Airing (1 episode per week) ─────────────────────────────────────
      if (show.status === 'airing') {
        const newEpisodesAired = show.episodesAired + 1;
        const anchor = show.baseRating > 0 ? show.baseRating : show.currentRating;
        const reverted = show.currentRating + (anchor - show.currentRating) * 0.20;
        const newRating = clamp(
          Math.round((reverted + randomFloat(-0.3, 0.3)) * 10) / 10,
          1.0,
          10.0,
        );
        const config = GENRE_CONFIG[show.genre];
        const newViewers = Math.round(config.baseViewers * (newRating / 5) * show.marketingViewerBoost);

        capitalDelta += computeWeeklyAdRevenue(studio.tier, newViewers, show.genre, newRating);

        // Mid-season cancellation
        if (newEpisodesAired >= 3 && newRating < COMPETITOR_CANCEL_THRESHOLD) {
          mutableTalent = releaseAllTalent(mutableTalent, show);
          showsProducedDelta++;
          prestigeDelta += computePrestigeDelta(newRating, true);
          updatedShows.push({
            ...show,
            status: 'cancelled',
            currentRating: newRating,
            episodesAired: newEpisodesAired,
            lastSeasonCompletedYear: year,
            lastSeasonFinalRating: newRating,
            bookedShowrunnerID: null,
            bookedDirectorID: null,
            bookedActorIDs: [],
          });
          newsItems.push(makeCompetitorCancelledNews(studio, show, ctx));
          continue;
        }

        // Season complete
        if (newEpisodesAired >= show.totalEpisodes) {
          showsProducedDelta++;
          capitalDelta += computeCompletionBonus(studio.tier, newRating);
          prestigeDelta += computePrestigeDelta(newRating, false);

          if (newRating >= 5.5 && show.seasonNumber < 5) {
            const newTotalEpisodes = randomBetween(8, 12);
            updatedShows.push({
              ...show,
              status: 'pre-production',
              episodesAired: 0,
              currentRating: clamp(newRating + randomFloat(-0.3, 0.3), 3.0, 9.5),
              seasonNumber: show.seasonNumber + 1,
              totalEpisodes: newTotalEpisodes,
              preProductionWeeksRemaining: 3,
              filmingWeeksRemaining: newTotalEpisodes,
              marketingWeeksRemaining: 0,
              baseRating: 0,
              bookedDirectorID: null,
              bookedActorIDs: [],
              lastSeasonCompletedYear: year,
              lastSeasonFinalRating: newRating,
            });
            newsItems.push(makeCompetitorRenewedNews(studio, show, ctx));
          } else {
            mutableTalent = releaseAllTalent(mutableTalent, show);
            updatedShows.push({
              ...show,
              status: 'completed',
              episodesAired: newEpisodesAired,
              currentRating: newRating,
              lastSeasonCompletedYear: year,
              lastSeasonFinalRating: newRating,
              bookedShowrunnerID: null,
              bookedDirectorID: null,
              bookedActorIDs: [],
            });
            newsItems.push(makeCompetitorCompletedNews(studio, show, ctx));
          }
          continue;
        }

        updatedShows.push({
          ...show,
          episodesAired: newEpisodesAired,
          currentRating: newRating,
          weeklyViewers: newViewers,
        });
      }
    }

    // Greenlight check — only count shows that are genuinely in production/air
    const pipelineCount = updatedShows.filter(
      s => s.status === 'pre-production' || s.status === 'filming' ||
           s.status === 'marketing' || s.status === 'airing',
    ).length;

    const productionCost = COMPETITOR_PRODUCTION_COSTS[studio.tier];
    const currentCapital = studio.capital + capitalDelta;
    const canAfford = currentCapital >= productionCost;
    const underYearlyCap = showsGreenlitThisYear < MAX_COMPETITOR_SHOWS_PER_YEAR;
    const underActiveCap = pipelineCount < MAX_COMPETITOR_ACTIVE_SHOWS;
    const greenlit = underActiveCap && underYearlyCap && canAfford &&
      randomChance(COMPETITOR_GREENLIGHT_CHANCES[studio.tier]);

    let finalCapital = currentCapital;
    let finalGreenlitCount = showsGreenlitThisYear;

    if (greenlit) {
      const genre = pickGenreForStudio(studio.preferredGenres);
      const newShow = createShowInPipeline(studio.id, genre, globalUsedTitles);
      globalUsedTitles.add(newShow.title);
      const { updatedTalent: t2, showrunnerID } = bookShowrunnerForTier(mutableTalent, newShow.id, studio.tier);
      mutableTalent = t2;
      const finalShow: CompetitorShow = { ...newShow, bookedShowrunnerID: showrunnerID };
      updatedShows.push(finalShow);
      newsItems.push(makeCompetitorGreenlitNews(studio, finalShow, ctx));
      finalCapital -= productionCost;
      finalGreenlitCount++;
    }

    const floor = CAPITAL_FLOOR[studio.tier];
    return {
      ...studio,
      activeShows: updatedShows,
      totalShowsProduced: studio.totalShowsProduced + showsProducedDelta,
      capital: Math.max(floor, finalCapital),
      prestige: clamp(studio.prestige + prestigeDelta, 0, 100),
      showsGreenlitThisYear: finalGreenlitCount,
    };
  });

  return { updatedCompetitors, newsItems, updatedTalent: mutableTalent };
}

// ─── Talent booking helpers ───────────────────────────────────────────────────

function releaseFilmingTalent(talent: Talent[], show: CompetitorShow): Talent[] {
  const ids = new Set(
    [show.bookedDirectorID, ...show.bookedActorIDs].filter(Boolean) as string[],
  );
  if (ids.size === 0) return talent;
  return talent.map(t =>
    ids.has(t.id) ? { ...t, available: true, bookedByCompetitorShowID: null } : t,
  );
}

function releaseAllTalent(talent: Talent[], show: CompetitorShow): Talent[] {
  const ids = new Set(
    [show.bookedShowrunnerID, show.bookedDirectorID, ...show.bookedActorIDs].filter(Boolean) as string[],
  );
  if (ids.size === 0) return talent;
  return talent.map(t =>
    ids.has(t.id) ? { ...t, available: true, bookedByCompetitorShowID: null } : t,
  );
}

// Prestige thresholds matching talent.ts tier ranges
const TIER_PRESTIGE: Record<StudioTier, number> = {
  powerhouse:  61,
  established: 21,
  independent: 0,
};

function pickTalentForTier<T extends Talent>(pool: T[], tier: StudioTier): T | null {
  if (pool.length === 0) return null;
  const preferred = pool.filter(t => t.prestigeRequired >= TIER_PRESTIGE[tier]);
  const candidates = preferred.length > 0 ? preferred : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function bookShowrunnerForTier(
  talent: Talent[],
  showID: string,
  tier: StudioTier,
): { updatedTalent: Talent[]; showrunnerID: string | null } {
  const available = talent.filter(t => t.available && t.role === 'showrunner');
  const chosen = pickTalentForTier(available, tier);
  if (!chosen) return { updatedTalent: talent, showrunnerID: null };
  return {
    updatedTalent: talent.map(t =>
      t.id === chosen.id
        ? {
            ...t,
            available: false,
            bookedByCompetitorShowID: showID,
            careerShowIDs: t.careerShowIDs.includes(showID) ? t.careerShowIDs : [...t.careerShowIDs, showID],
          }
        : t,
    ),
    showrunnerID: chosen.id,
  };
}

function bookFilmingTalentForTier(
  talent: Talent[],
  showID: string,
  tier: StudioTier,
): { updatedTalent: Talent[]; directorID: string | null; actorIDs: string[] } {
  let updatedTalent = [...talent];

  const availableDirectors = updatedTalent.filter(t => t.available && t.role === 'director');
  const chosenDirector = pickTalentForTier(availableDirectors, tier);
  const directorID = chosenDirector?.id ?? null;
  if (directorID) {
    updatedTalent = updatedTalent.map(t =>
      t.id === directorID
        ? {
            ...t,
            available: false,
            bookedByCompetitorShowID: showID,
            careerShowIDs: t.careerShowIDs.includes(showID) ? t.careerShowIDs : [...t.careerShowIDs, showID],
          }
        : t,
    );
  }

  const availableActors = updatedTalent.filter(t => t.available && t.role === 'actor');
  const shuffled = [...availableActors].sort(() => Math.random() - 0.5);
  const toBook = shuffled.slice(0, 2);
  const actorIDs = toBook.map(t => t.id);
  updatedTalent = updatedTalent.map(t =>
    actorIDs.includes(t.id)
      ? {
          ...t,
          available: false,
          bookedByCompetitorShowID: showID,
          careerShowIDs: t.careerShowIDs.includes(showID) ? t.careerShowIDs : [...t.careerShowIDs, showID],
        }
      : t,
  );

  return { updatedTalent, directorID, actorIDs };
}
