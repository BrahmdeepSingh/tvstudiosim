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
  drama:            ['Cold Harbor', 'Ash & Iron', 'The Quiet War', 'Crown Heights', 'The Weight', 'Broken Meridian', 'Dark Current', 'Hollow Ground'],
  comedy:           ['Perfectly Fine', 'Wild Pitch', 'Good Enough', 'The Arrangement', 'Damage Control', 'Off Script', 'Second Draft', 'Easy Does It'],
  'sci-fi':         ['The Fold', 'Static', 'Null Space', 'Threshold', 'Event Protocol', 'Outer Signal', 'Deep Axis', 'Phase Drift'],
  procedural:       ['Case Pending', 'The Unit', 'District 7', 'Hard Evidence', 'Field Work', 'Chain of Evidence', 'Night Shift', 'Clear Record'],
  reality:          ['The Compound', 'Last Standing', 'Open Floor', 'Final Draft', 'The Trade', 'All In', 'Raw Cut', 'The Circuit'],
  'limited-series': ['Seventeen Days', 'The Last Summer', 'A Quiet Exit', 'Fractured', 'Point of Origin', 'Long Echo', 'The Hours After', 'Endgame'],
};

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

// ─── Revenue calculation ──────────────────────────────────────────────────────

function computeShowRevenue(tier: StudioTier, rating: number, partial = false): number {
  const cost = COMPETITOR_PRODUCTION_COSTS[tier];
  const factor = clamp(rating / 5.0, 0.3, 2.0);
  const revenue = Math.round(cost * factor);
  return partial ? Math.round(revenue * 0.4) : revenue;
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

// Creates a show already mid-airing with a booked showrunner (initial game state only)
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

  const { updatedTalent, showrunnerID } = bookShowrunnerForTier(talent, showID, 'powerhouse');

  const show: CompetitorShow = {
    id: showID,
    studioID,
    title: randomItem(COMPETITOR_TITLES[genre]),
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
  };

  return { show, updatedTalent };
}

// Creates a new show entering the full pipeline at pre-production
function createShowInPipeline(studioID: string, genre: Genre): CompetitorShow {
  const config = GENRE_CONFIG[genre];
  const baseRating = randomFloat(4.0, 7.5);
  const totalEpisodes = randomBetween(8, 12);

  return {
    id: nanoid(),
    studioID,
    title: randomItem(COMPETITOR_TITLES[genre]),
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

  const updatedCompetitors = competitors.map(studio => {
    const updatedShows: CompetitorShow[] = [];
    let showsProducedDelta = 0;
    let capitalDelta = 0;
    const showsGreenlitThisYear = week === 1 ? 0 : studio.showsGreenlitThisYear;

    for (const show of studio.activeShows) {
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
          // Compute quality-based rating from talent before releasing them
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

      // ── Marketing (MARKETING_WEEKS, showrunner stays booked) ────────────
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

      // ── Airing (1 episode per week, showrunner booked) ──────────────────
      if (show.status === 'airing') {
        const newEpisodesAired = show.episodesAired + 1;
        // Mean-revert 20% toward baseRating each week to anchor to talent quality
        const anchor = show.baseRating > 0 ? show.baseRating : show.currentRating;
        const reverted = show.currentRating + (anchor - show.currentRating) * 0.20;
        const newRating = clamp(
          Math.round((reverted + randomFloat(-0.3, 0.3)) * 10) / 10,
          1.0,
          10.0,
        );
        const config = GENRE_CONFIG[show.genre];
        const newViewers = Math.round(config.baseViewers * (newRating / 5) * show.marketingViewerBoost);

        // Mid-season cancellation
        if (newEpisodesAired >= 3 && newRating < COMPETITOR_CANCEL_THRESHOLD) {
          mutableTalent = releaseAllTalent(mutableTalent, show);
          showsProducedDelta++;
          capitalDelta += computeShowRevenue(studio.tier, newRating, true);
          updatedShows.push({
            ...show,
            status: 'cancelled',
            currentRating: newRating,
            episodesAired: newEpisodesAired,
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

          if (newRating >= 5.5 && show.seasonNumber < 5) {
            capitalDelta += computeShowRevenue(studio.tier, newRating);
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
              baseRating: 0, // will recompute when next filming ends
              bookedDirectorID: null,
              bookedActorIDs: [],
            });
            newsItems.push(makeCompetitorRenewedNews(studio, show, ctx));
          } else {
            capitalDelta += computeShowRevenue(studio.tier, newRating);
            mutableTalent = releaseAllTalent(mutableTalent, show);
            updatedShows.push({
              ...show,
              status: 'completed',
              episodesAired: newEpisodesAired,
              currentRating: newRating,
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

    // Maybe greenlight a new show
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
      const newShow = createShowInPipeline(studio.id, genre);
      const { updatedTalent: t2, showrunnerID } = bookShowrunnerForTier(mutableTalent, newShow.id, studio.tier);
      mutableTalent = t2;
      const finalShow: CompetitorShow = { ...newShow, bookedShowrunnerID: showrunnerID };
      updatedShows.push(finalShow);
      newsItems.push(makeCompetitorGreenlitNews(studio, finalShow, ctx));
      finalCapital -= productionCost;
      finalGreenlitCount++;
    }

    return {
      ...studio,
      activeShows: updatedShows,
      totalShowsProduced: studio.totalShowsProduced + showsProducedDelta,
      capital: finalCapital,
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
