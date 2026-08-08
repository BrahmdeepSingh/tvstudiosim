import { GameState } from '../types';

export type AchievementRarity = 'common' | 'rare' | 'legendary';

export interface Achievement {
  id: string;
  emoji: string;
  title: string;
  description: string;
  rarity: AchievementRarity;
  check: (state: GameState) => boolean;
}

export const RARITY_COLOR: Record<AchievementRarity, string> = {
  common:    '#9a958e',
  rare:      '#5b8dee',
  legendary: '#e6b254',
};

export const ACHIEVEMENTS: Achievement[] = [
  // ── Beginner ──────────────────────────────────────────────────────────────
  {
    id: 'first-show',
    emoji: '🎬',
    title: 'Lights, Camera, Action!',
    description: 'Create or greenlight your first show.',
    rarity: 'common',
    check: s => s.shows.length > 0,
  },
  {
    id: 'first-greenlight',
    emoji: '✅',
    title: 'Executive Producer',
    description: 'Greenlight your first outside pitch.',
    rarity: 'common',
    check: s => s.pitches.some(p => p.greenlitByPlayer),
  },
  {
    id: 'season-complete',
    emoji: '🎉',
    title: 'Wrap Party',
    description: 'Complete your first full season.',
    rarity: 'common',
    check: s => s.shows.some(sh =>
      sh.seasons.some(se => se.renewalDecisionMade) ||
      sh.status === 'completed' ||
      sh.status === 'cancelled'
    ),
  },
  {
    id: 'season-two',
    emoji: '📺',
    title: 'Renewed!',
    description: 'Renew a show for Season 2.',
    rarity: 'common',
    check: s => s.shows.some(sh => sh.seasons.length >= 2),
  },
  // ── Prestige ──────────────────────────────────────────────────────────────
  {
    id: 'prestige-10',
    emoji: '📈',
    title: 'Up & Coming',
    description: 'Reach Prestige 10.',
    rarity: 'common',
    check: s => s.network.prestige >= 10,
  },
  {
    id: 'prestige-21',
    emoji: '🏢',
    title: 'Mid-Tier Network',
    description: 'Reach Prestige 21 — 3rd production slot unlocked.',
    rarity: 'common',
    check: s => s.network.prestige >= 21,
  },
  {
    id: 'prestige-41',
    emoji: '🌟',
    title: 'Established Player',
    description: 'Reach Prestige 41 — unlimited production unlocked.',
    rarity: 'rare',
    check: s => s.network.prestige >= 41,
  },
  {
    id: 'prestige-61',
    emoji: '💫',
    title: 'Major Network',
    description: 'Reach Prestige 61 — elite talent unlocked.',
    rarity: 'rare',
    check: s => s.network.prestige >= 61,
  },
  {
    id: 'prestige-81',
    emoji: '👑',
    title: 'TV Dynasty',
    description: 'Reach Prestige 81.',
    rarity: 'legendary',
    check: s => s.network.prestige >= 81,
  },
  {
    id: 'prestige-100',
    emoji: '🏆',
    title: 'Legendary',
    description: 'Reach maximum prestige.',
    rarity: 'legendary',
    check: s => s.network.prestige >= 100,
  },
  // ── Emmy Awards ───────────────────────────────────────────────────────────
  {
    id: 'first-nom',
    emoji: '📜',
    title: 'Awards Buzz',
    description: 'Receive your first Emmy nomination.',
    rarity: 'rare',
    check: s => s.awards.some(a => a.isPlayerAward),
  },
  {
    id: 'first-win',
    emoji: '🥇',
    title: 'And the Emmy Goes To...',
    description: 'Win your first Emmy Award.',
    rarity: 'rare',
    check: s => s.awards.some(a => a.isPlayerAward && a.won),
  },
  {
    id: 'emmy-sweep',
    emoji: '🌊',
    title: 'Sweep the Night',
    description: 'Win 3 or more Emmys in a single year.',
    rarity: 'legendary',
    check: s => {
      const byYear: Record<number, number> = {};
      for (const a of s.awards) {
        if (a.isPlayerAward && a.won) byYear[a.year] = (byYear[a.year] ?? 0) + 1;
      }
      return Object.values(byYear).some(n => n >= 3);
    },
  },
  {
    id: 'ten-emmys',
    emoji: '🎖️',
    title: 'Emmy Magnet',
    description: 'Win 10 total Emmy Awards.',
    rarity: 'legendary',
    check: s => s.network.emmysWon >= 10,
  },
  // ── Ratings ───────────────────────────────────────────────────────────────
  {
    id: 'rating-8',
    emoji: '⭐',
    title: "Critics' Pick",
    description: 'A season averages an 8.0+ rating.',
    rarity: 'rare',
    check: s => s.shows.some(sh =>
      sh.seasons.some(se => {
        const rated = se.episodes.filter(e => e.rating !== null);
        return rated.length > 0 && rated.reduce((sum, e) => sum + (e.rating ?? 0), 0) / rated.length >= 8.0;
      })
    ),
  },
  {
    id: 'rating-9',
    emoji: '🔥',
    title: 'Must-See TV',
    description: 'A season averages a 9.0+ rating.',
    rarity: 'legendary',
    check: s => s.shows.some(sh =>
      sh.seasons.some(se => {
        const rated = se.episodes.filter(e => e.rating !== null);
        return rated.length > 0 && rated.reduce((sum, e) => sum + (e.rating ?? 0), 0) / rated.length >= 9.0;
      })
    ),
  },
  // ── Business ──────────────────────────────────────────────────────────────
  {
    id: 'earn-10m',
    emoji: '💰',
    title: 'Making Money',
    description: 'Earn $10M in total career revenue.',
    rarity: 'common',
    check: s => s.network.careerEarnings >= 10_000_000,
  },
  {
    id: 'earn-100m',
    emoji: '💵',
    title: 'Big Business',
    description: 'Earn $100M in total career revenue.',
    rarity: 'rare',
    check: s => s.network.careerEarnings >= 100_000_000,
  },
  {
    id: 'earn-500m',
    emoji: '🏦',
    title: 'Media Mogul',
    description: 'Earn $500M in total career revenue.',
    rarity: 'legendary',
    check: s => s.network.careerEarnings >= 500_000_000,
  },
  // ── Content ───────────────────────────────────────────────────────────────
  {
    id: 'franchise',
    emoji: '🎭',
    title: 'Franchise',
    description: 'Renew a show to a 5th season.',
    rarity: 'legendary',
    check: s => s.shows.some(sh => sh.seasons.length >= 5),
  },
  {
    id: 'ten-shows',
    emoji: '📚',
    title: 'Prolific',
    description: 'Produce 10 total shows.',
    rarity: 'rare',
    check: s => s.network.totalShowsProduced >= 10,
  },
  {
    id: 'four-genres',
    emoji: '🎨',
    title: 'Genre Master',
    description: 'Complete shows across 4 different genres.',
    rarity: 'legendary',
    check: s => new Set(
      s.shows.filter(sh => sh.status === 'completed').map(sh => sh.genre)
    ).size >= 4,
  },
  // ── Streaming ─────────────────────────────────────────────────────────────
  {
    id: 'streaming-deal',
    emoji: '📡',
    title: 'Stream On',
    description: 'Sign your first streaming deal.',
    rarity: 'rare',
    check: s => s.shows.some(sh => sh.streamingDeals.length > 0),
  },
  // ── Talent ───────────────────────────────────────────────────────────────
  {
    id: 'elite-talent',
    emoji: '⚡',
    title: 'Star Power',
    description: 'Hire an elite-tier talent.',
    rarity: 'rare',
    check: s => s.talentDeals.some(d => {
      const t = s.talent.find(tk => tk.id === d.talentID);
      return t && t.prestigeRequired >= 61;
    }),
  },
];

export const ACHIEVEMENTS_MAP: Record<string, Achievement> = Object.fromEntries(
  ACHIEVEMENTS.map(a => [a.id, a])
);
