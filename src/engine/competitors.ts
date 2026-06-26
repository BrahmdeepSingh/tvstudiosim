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
} from './news';
import { nanoid } from '../utils/nanoid';
import { randomBetween, randomItem, randomChance, randomFloat, clamp } from '../utils/random';

const GENRES: Genre[] = ['drama', 'comedy', 'sci-fi', 'procedural', 'reality', 'limited-series'];

const COMPETITOR_TITLES: Record<Genre, string[]> = {
  drama:          ['Cold Harbor', 'Ash & Iron', 'The Quiet War', 'Crown Heights', 'The Weight'],
  comedy:         ['Perfectly Fine', 'Wild Pitch', 'Good Enough', 'The Arrangement', 'Damage Control'],
  'sci-fi':       ['The Fold', 'Static', 'Null Space', 'Threshold', 'Event Protocol'],
  procedural:     ['Case Pending', 'The Unit', 'District 7', 'Hard Evidence', 'Field Work'],
  reality:        ['The Compound', 'Last Standing', 'Open Floor', 'Final Draft', 'The Trade'],
  'limited-series': ['Seventeen Days', 'The Last Summer', 'A Quiet Exit', 'Fractured', 'Point of Origin'],
};

export function generateInitialCompetitors(): CompetitorStudio[] {
  return COMPETITOR_NAMES.map((name, i) => ({
    id: nanoid(),
    name,
    prestige: randomBetween(15, 45),
    activeShows: i < 3 ? [generateCompetitorShow(nanoid())] : [],
    emmysWon: randomBetween(0, 3),
    totalShowsProduced: randomBetween(2, 8),
  }));
}

export function generateCompetitorShow(studioID: string): CompetitorShow {
  const genre = randomItem(GENRES);
  const config = GENRE_CONFIG[genre];
  const baseRating = randomFloat(3.5, 7.5);

  return {
    id: nanoid(),
    studioID,
    title: randomItem(COMPETITOR_TITLES[genre]),
    genre,
    status: 'airing',
    currentRating: Math.round(baseRating * 10) / 10,
    weeklyViewers: Math.round(config.baseViewers * (baseRating / 5)),
    seasonNumber: 1,
    episodesAired: 0,
    totalEpisodes: randomBetween(8, 12),
    bookedTalentIDs: [],
  };
}

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

    for (const show of studio.activeShows) {
      if (show.status !== 'airing') {
        updatedShows.push(show);
        continue;
      }

      const newEpisodesAired = show.episodesAired + 1;
      const fluctuation = randomFloat(-0.3, 0.3);
      const newRating = clamp(
        Math.round((show.currentRating + fluctuation) * 10) / 10,
        1.0,
        10.0,
      );
      const config = GENRE_CONFIG[show.genre];
      const newViewers = Math.round(config.baseViewers * (newRating / 5));

      // Mid-season cancellation
      if (newEpisodesAired >= 3 && newRating < COMPETITOR_CANCEL_THRESHOLD) {
        mutableTalent = releaseTalent(mutableTalent, show.id);
        updatedShows.push({ ...show, status: 'cancelled', currentRating: newRating, bookedTalentIDs: [] });
        newsItems.push(makeCompetitorCancelledNews(studio, show, ctx));
        continue;
      }

      // Season complete
      if (newEpisodesAired >= show.totalEpisodes) {
        if (newRating >= 5.5 && show.seasonNumber < 5) {
          // Renewal — talent stays booked to the renewed show
          const renewedShow: CompetitorShow = {
            ...show,
            episodesAired: 0,
            seasonNumber: show.seasonNumber + 1,
            currentRating: clamp(newRating + randomFloat(-0.3, 0.3), 3.0, 9.5),
            totalEpisodes: randomBetween(8, 12),
          };
          updatedShows.push(renewedShow);
          newsItems.push(makeCompetitorRenewedNews(studio, show, ctx));
        } else {
          mutableTalent = releaseTalent(mutableTalent, show.id);
          updatedShows.push({ ...show, status: 'completed', episodesAired: newEpisodesAired, bookedTalentIDs: [] });
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

    // Maybe greenlight a new show
    const airingCount = updatedShows.filter(s => s.status === 'airing').length;
    if (airingCount < MAX_COMPETITOR_ACTIVE_SHOWS && randomChance(COMPETITOR_GREENLIGHT_CHANCE)) {
      const newShow = generateCompetitorShow(studio.id);
      const { updatedTalent, bookedIDs } = bookTalentForShow(mutableTalent, newShow.id);
      mutableTalent = updatedTalent;
      updatedShows.push({ ...newShow, bookedTalentIDs: bookedIDs });
      newsItems.push(makeCompetitorGreenlitNews(studio, newShow, ctx));
    }

    return { ...studio, activeShows: updatedShows };
  });

  return { updatedCompetitors, newsItems, updatedTalent: mutableTalent };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function releaseTalent(talent: Talent[], competitorShowID: string): Talent[] {
  return talent.map(t =>
    t.bookedByCompetitorShowID === competitorShowID
      ? { ...t, available: true, bookedByCompetitorShowID: null }
      : t,
  );
}

function bookTalentForShow(
  talent: Talent[],
  competitorShowID: string,
): { updatedTalent: Talent[]; bookedIDs: string[] } {
  // Book 2 available actors (not already booked anywhere)
  const available = talent.filter(t => t.available && t.role === 'actor');
  const count = Math.min(2, available.length);
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  const toBook = shuffled.slice(0, count);
  const bookedIDs = toBook.map(t => t.id);

  const updatedTalent = talent.map(t =>
    bookedIDs.includes(t.id)
      ? { ...t, available: false, bookedByCompetitorShowID: competitorShowID }
      : t,
  );

  return { updatedTalent, bookedIDs };
}
