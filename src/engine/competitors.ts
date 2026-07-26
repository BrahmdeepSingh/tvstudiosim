import { CompetitorStudio, CompetitorShow, NewsItem, Genre, Talent } from '../types';
import {
  COMPETITOR_NAMES,
  COMPETITOR_CANCEL_THRESHOLD,
  MAX_COMPETITOR_ACTIVE_SHOWS,
  COMPETITOR_GREENLIGHT_CHANCE,
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

const GENRES: Genre[] = ['drama', 'comedy', 'sci-fi', 'procedural', 'reality', 'limited-series'];

const COMPETITOR_TITLES: Record<Genre, string[]> = {
  drama:            ['Cold Harbor', 'Ash & Iron', 'The Quiet War', 'Crown Heights', 'The Weight'],
  comedy:           ['Perfectly Fine', 'Wild Pitch', 'Good Enough', 'The Arrangement', 'Damage Control'],
  'sci-fi':         ['The Fold', 'Static', 'Null Space', 'Threshold', 'Event Protocol'],
  procedural:       ['Case Pending', 'The Unit', 'District 7', 'Hard Evidence', 'Field Work'],
  reality:          ['The Compound', 'Last Standing', 'Open Floor', 'Final Draft', 'The Trade'],
  'limited-series': ['Seventeen Days', 'The Last Summer', 'A Quiet Exit', 'Fractured', 'Point of Origin'],
};

// ─── Initial generation ───────────────────────────────────────────────────────

export function generateInitialCompetitors(): CompetitorStudio[] {
  return COMPETITOR_NAMES.map((name, i) => ({
    id: nanoid(),
    name,
    prestige: randomBetween(15, 45),
    // First 3 studios start with a show already mid-air (pre-game history)
    activeShows: i < 3 ? [generateCompetitorShow(nanoid())] : [],
    emmysWon: randomBetween(0, 3),
    totalShowsProduced: randomBetween(2, 8),
  }));
}

// Creates a show already mid-airing (used only for initial game state)
export function generateCompetitorShow(studioID: string): CompetitorShow {
  const genre = randomItem(GENRES);
  const config = GENRE_CONFIG[genre];
  const baseRating = randomFloat(5.0, 7.5);
  const totalEpisodes = randomBetween(8, 12);

  return {
    id: nanoid(),
    studioID,
    title: randomItem(COMPETITOR_TITLES[genre]),
    genre,
    status: 'airing',
    currentRating: Math.round(baseRating * 10) / 10,
    weeklyViewers: Math.round(config.baseViewers * (baseRating / 5)),
    seasonNumber: 1,
    episodesAired: randomBetween(0, 4),
    totalEpisodes,
    preProductionWeeksRemaining: 0,
    filmingWeeksRemaining: 0,
    bookedShowrunnerID: null,
    bookedDirectorID: null,
    bookedActorIDs: [],
  };
}

// Creates a new show entering the full pipeline at pre-production
function createShowInPipeline(studioID: string): CompetitorShow {
  const genre = randomItem(GENRES);
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
    bookedShowrunnerID: null,
    bookedDirectorID: null,
    bookedActorIDs: [],
  };
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

    for (const show of studio.activeShows) {
      // Completed / cancelled shows are historical — keep but skip
      if (show.status === 'completed' || show.status === 'cancelled') {
        updatedShows.push(show);
        continue;
      }

      // ── Pre-production (3 weeks, showrunner booked) ─────────────────────
      if (show.status === 'pre-production') {
        const remaining = show.preProductionWeeksRemaining - 1;
        if (remaining <= 0) {
          // Pre-prod done → book director + actors, move to filming
          const { updatedTalent: t1, directorID, actorIDs } = bookFilmingTalent(mutableTalent, show.id);
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
          // Filming done → release director + actors (showrunner stays), premiere
          mutableTalent = releaseFilmingTalent(mutableTalent, show);
          newsItems.push(makeCompetitorPremiereNews(studio, show, ctx));
          updatedShows.push({
            ...show,
            status: 'airing',
            filmingWeeksRemaining: 0,
            bookedDirectorID: null,
            bookedActorIDs: [],
          });
        } else {
          updatedShows.push({ ...show, filmingWeeksRemaining: remaining });
        }
        continue;
      }

      // ── Airing (1 episode per week, showrunner booked) ──────────────────
      if (show.status === 'airing') {
        const newEpisodesAired = show.episodesAired + 1;
        const newRating = clamp(
          Math.round((show.currentRating + randomFloat(-0.3, 0.3)) * 10) / 10,
          1.0,
          10.0,
        );
        const config = GENRE_CONFIG[show.genre];
        const newViewers = Math.round(config.baseViewers * (newRating / 5));

        // Mid-season cancellation
        if (newEpisodesAired >= 3 && newRating < COMPETITOR_CANCEL_THRESHOLD) {
          mutableTalent = releaseAllTalent(mutableTalent, show);
          showsProducedDelta++;
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
            // Renew — reset to pre-production, showrunner stays booked to same show ID
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
              // Director and actors were already released at filming→airing
              bookedDirectorID: null,
              bookedActorIDs: [],
            });
            newsItems.push(makeCompetitorRenewedNews(studio, show, ctx));
          } else {
            // Completed, no renewal — release showrunner
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
      s => s.status === 'pre-production' || s.status === 'filming' || s.status === 'airing',
    ).length;

    if (pipelineCount < MAX_COMPETITOR_ACTIVE_SHOWS && randomChance(COMPETITOR_GREENLIGHT_CHANCE)) {
      const newShow = createShowInPipeline(studio.id);
      const { updatedTalent: t2, showrunnerID } = bookShowrunner(mutableTalent, newShow.id);
      mutableTalent = t2;
      const finalShow: CompetitorShow = { ...newShow, bookedShowrunnerID: showrunnerID };
      updatedShows.push(finalShow);
      newsItems.push(makeCompetitorGreenlitNews(studio, finalShow, ctx));
    }

    return {
      ...studio,
      activeShows: updatedShows,
      totalShowsProduced: studio.totalShowsProduced + showsProducedDelta,
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

function bookShowrunner(
  talent: Talent[],
  showID: string,
): { updatedTalent: Talent[]; showrunnerID: string | null } {
  const available = talent.filter(t => t.available && t.role === 'showrunner');
  if (available.length === 0) return { updatedTalent: talent, showrunnerID: null };
  const chosen = available[Math.floor(Math.random() * available.length)];
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

function bookFilmingTalent(
  talent: Talent[],
  showID: string,
): { updatedTalent: Talent[]; directorID: string | null; actorIDs: string[] } {
  let updatedTalent = [...talent];

  // Book 1 director
  const availableDirectors = updatedTalent.filter(t => t.available && t.role === 'director');
  let directorID: string | null = null;
  if (availableDirectors.length > 0) {
    const chosen = availableDirectors[Math.floor(Math.random() * availableDirectors.length)];
    directorID = chosen.id;
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

  // Book 2 actors
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