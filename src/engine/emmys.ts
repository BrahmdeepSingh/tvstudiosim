import { Show, Season, Talent, Award, EmmyCategory, CompetitorStudio } from '../types';
import { GENRE_CONFIG, EMMY_CATEGORIES } from '../constants/game';
import { nanoid } from '../utils/nanoid';
import { randomFloat } from '../utils/random';

export function calculateEmmyNominations(
  playerShows: Show[],
  talent: Talent[],
  competitors: CompetitorStudio[],
  year: number,
): Award[] {
  const eligible = getEligibleSeasons(playerShows, year);
  const nominations: Award[] = [];

  for (const category of EMMY_CATEGORIES) {
    const playerCandidates = eligible.length > 0
      ? getCandidatesForCategory(category as EmmyCategory, eligible, talent)
      : [];
    const competitorCandidates = getCompetitorCandidates(category as EmmyCategory, competitors);

    const allCandidates = [...playerCandidates, ...competitorCandidates];
    if (allCandidates.length === 0) continue;

    const nomineeCount = Math.min(5, allCandidates.length);
    const selected = weightedSelect(allCandidates, nomineeCount);

    for (const c of selected) {
      nominations.push({
        id: nanoid(),
        type: 'emmy',
        category: category as EmmyCategory,
        year,
        won: false,
        showID: c.showID,
        seasonID: c.seasonID,
        talentID: c.talentID,
        isPlayerAward: c.isPlayerAward,
      });
    }
  }

  return nominations;
}

export function determineEmmyWinners(nominations: Award[]): Award[] {
  const byCategory = new Map<EmmyCategory, Award[]>();

  for (const nom of nominations) {
    const list = byCategory.get(nom.category) ?? [];
    list.push(nom);
    byCategory.set(nom.category, list);
  }

  return nominations.map(nom => {
    const categoryNoms = byCategory.get(nom.category) ?? [];
    // First entry after sort = winner (score-weighted during nomination)
    const winnerID = categoryNoms[0]?.id;
    return { ...nom, won: nom.id === winnerID };
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEligibleSeasons(
  shows: Show[],
  year: number,
): { show: Show; season: Season }[] {
  const result: { show: Show; season: Season }[] = [];
  for (const show of shows) {
    for (const season of show.seasons) {
      const hasAiredThisYear = season.episodes.some(ep => ep.yearAired === year);
      const enoughEpisodes = season.episodes.filter(ep => ep.rating !== null).length >= 4;
      if (hasAiredThisYear && enoughEpisodes) {
        result.push({ show, season });
      }
    }
  }
  return result;
}

interface Candidate {
  showID: string;
  seasonID: string;
  talentID?: string;
  score: number;
  isPlayerAward: boolean;
}

function getCandidatesForCategory(
  category: EmmyCategory,
  eligible: { show: Show; season: Season }[],
  talent: Talent[],
): Candidate[] {
  const candidates: Candidate[] = [];

  for (const { show, season } of eligible) {
    const avgRating = getAverageRating(season);
    const config = GENRE_CONFIG[show.genre];
    const base = avgRating + randomFloat(0, 1.5); // variance for snubs/surprises

    if (category === 'best-drama-series') {
      if (['drama', 'sci-fi', 'procedural'].includes(show.genre)) {
        candidates.push({ showID: show.id, seasonID: season.id, score: base, isPlayerAward: true });
      }
    } else if (category === 'best-comedy-series') {
      if (show.genre === 'comedy') {
        candidates.push({ showID: show.id, seasonID: season.id, score: base, isPlayerAward: true });
      }
    } else if (category === 'best-limited-series') {
      if (show.genre === 'limited-series') {
        candidates.push({ showID: show.id, seasonID: season.id, score: base, isPlayerAward: true });
      }
    } else if (category === 'best-director') {
      if (season.directorID) {
        candidates.push({ showID: show.id, seasonID: season.id, talentID: season.directorID, score: base, isPlayerAward: true });
      }
    } else if (category === 'best-writing') {
      candidates.push({ showID: show.id, seasonID: season.id, talentID: season.showrunnerID, score: base, isPlayerAward: true });
    } else if (['best-drama-actor', 'best-drama-actress'].includes(category)) {
      if (['drama', 'sci-fi', 'procedural', 'limited-series'].includes(show.genre)) {
        for (const actorID of season.leadActorIDs.slice(0, 2)) {
          const actor = talent.find(t => t.id === actorID);
          if (actor) {
            candidates.push({
              showID: show.id,
              seasonID: season.id,
              talentID: actorID,
              score: base + actor.popularity / 100,
              isPlayerAward: true,
            });
          }
        }
      }
    } else if (['best-comedy-actor', 'best-comedy-actress'].includes(category)) {
      if (show.genre === 'comedy') {
        for (const actorID of season.leadActorIDs.slice(0, 2)) {
          const actor = talent.find(t => t.id === actorID);
          if (actor) {
            candidates.push({
              showID: show.id,
              seasonID: season.id,
              talentID: actorID,
              score: base + actor.popularity / 100,
              isPlayerAward: true,
            });
          }
        }
      }
    }
  }

  return candidates;
}

function getCompetitorCandidates(
  category: EmmyCategory,
  competitors: CompetitorStudio[],
): Candidate[] {
  const candidates: Candidate[] = [];
  const dramaGenres = ['drama', 'sci-fi', 'procedural'];

  for (const studio of competitors) {
    for (const show of studio.activeShows) {
      if (show.status !== 'airing' || show.episodesAired < 4) continue;
      if (show.currentRating < 6.5) continue;

      const base = show.currentRating + randomFloat(0, 1.5);

      if (category === 'best-drama-series' && dramaGenres.includes(show.genre)) {
        candidates.push({ showID: show.id, seasonID: show.id, score: base, isPlayerAward: false });
      } else if (category === 'best-comedy-series' && show.genre === 'comedy') {
        candidates.push({ showID: show.id, seasonID: show.id, score: base, isPlayerAward: false });
      } else if (category === 'best-limited-series' && show.genre === 'limited-series') {
        candidates.push({ showID: show.id, seasonID: show.id, score: base, isPlayerAward: false });
      } else if (['best-drama-actor', 'best-drama-actress'].includes(category) && dramaGenres.includes(show.genre)) {
        candidates.push({ showID: show.id, seasonID: show.id, talentID: `comp-${show.id}`, score: base, isPlayerAward: false });
      } else if (['best-comedy-actor', 'best-comedy-actress'].includes(category) && show.genre === 'comedy') {
        candidates.push({ showID: show.id, seasonID: show.id, talentID: `comp-${show.id}`, score: base, isPlayerAward: false });
      }
    }
  }

  return candidates;
}

function weightedSelect(candidates: Candidate[], count: number): Candidate[] {
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const pool = sorted.slice(0, Math.min(count * 2, sorted.length));
  pool.sort(() => Math.random() - 0.5); // shuffle top half for variance
  return pool.slice(0, count);
}

function getAverageRating(season: Season): number {
  const aired = season.episodes.filter(ep => ep.rating !== null);
  if (aired.length === 0) return 0;
  return aired.reduce((sum, ep) => sum + (ep.rating ?? 0), 0) / aired.length;
}