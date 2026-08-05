import { Theme } from '../types';

export type WindowType = 'cultural' | 'seasonal';

export interface ThemeWindow {
  theme: Theme;
  label: string;         // display name for the UI
  emoji: string;
  startWeek: number;     // inclusive
  endWeek: number;       // inclusive
  type: WindowType;
  viewershipMultiplier: number; // 1.25 cultural | 1.15 seasonal
  description: string;  // shown in the schedule tooltip
}

// ─────────────────────────────────────────────────────────────────────────────
// Cultural windows: tied to a real-world calendar moment (1.25×)
// Seasonal windows: broad audience appetite windows (1.15×)
// ─────────────────────────────────────────────────────────────────────────────

export const THEME_WINDOWS: ThemeWindow[] = [
  // ── Cultural (1.25×) ──────────────────────────────────────────────────────
  {
    theme: 'romance',
    label: 'Valentine\'s Season',
    emoji: '💝',
    startWeek: 5,
    endWeek: 8,
    type: 'cultural',
    viewershipMultiplier: 1.25,
    description: 'Valentine\'s Day drives romance viewership into overdrive.',
  },
  {
    theme: 'horror',
    label: 'Halloween Season',
    emoji: '🎃',
    startWeek: 41,
    endWeek: 44,
    type: 'cultural',
    viewershipMultiplier: 1.25,
    description: 'Halloween fever makes horror the most-watched genre of fall.',
  },
  {
    theme: 'holiday',
    label: 'Holiday Season',
    emoji: '🎄',
    startWeek: 48,
    endWeek: 52,
    type: 'cultural',
    viewershipMultiplier: 1.25,
    description: 'The holidays bring families to the couch and viewership spikes.',
  },
  {
    theme: 'sports',
    label: 'Championship Season',
    emoji: '🏆',
    startWeek: 1,
    endWeek: 5,
    type: 'cultural',
    viewershipMultiplier: 1.25,
    description: 'Championship season puts sports content front and center.',
  },
  {
    theme: 'superhero',
    label: 'Summer Blockbuster',
    emoji: '🦸',
    startWeek: 17,
    endWeek: 22,
    type: 'cultural',
    viewershipMultiplier: 1.25,
    description: 'Blockbuster season primes audiences for superhero storytelling.',
  },
  {
    theme: 'music',
    label: 'Festival Season',
    emoji: '🎵',
    startWeek: 22,
    endWeek: 30,
    type: 'cultural',
    viewershipMultiplier: 1.25,
    description: 'Summer festival culture and music award shows dominate the conversation.',
  },

  // ── Seasonal (1.15×) ──────────────────────────────────────────────────────
  {
    theme: 'coming-of-age',
    label: 'Back-to-School Window',
    emoji: '🎒',
    startWeek: 30,
    endWeek: 38,
    type: 'seasonal',
    viewershipMultiplier: 1.15,
    description: 'Back-to-school nostalgia boosts coming-of-age stories in late summer.',
  },
  {
    theme: 'supernatural',
    label: 'Spooky Season',
    emoji: '👻',
    startWeek: 40,
    endWeek: 48,
    type: 'seasonal',
    viewershipMultiplier: 1.15,
    description: 'The extended spooky season keeps supernatural content performing strong.',
  },
  {
    theme: 'fantasy',
    label: 'Summer Epic Window',
    emoji: '⚔️',
    startWeek: 19,
    endWeek: 30,
    type: 'seasonal',
    viewershipMultiplier: 1.15,
    description: 'Long summer nights are perfect for sprawling fantasy epics.',
  },
  {
    theme: 'medieval',
    label: 'Summer Epic Window',
    emoji: '🏰',
    startWeek: 22,
    endWeek: 32,
    type: 'seasonal',
    viewershipMultiplier: 1.15,
    description: 'Medieval epics thrive in the prestige summer window.',
  },
  {
    theme: 'space',
    label: 'Summer Sci-Fi Window',
    emoji: '🚀',
    startWeek: 18,
    endWeek: 28,
    type: 'seasonal',
    viewershipMultiplier: 1.15,
    description: 'Summer audiences gravitate toward big-scale sci-fi.',
  },
  {
    theme: 'dystopian',
    label: 'Summer Sci-Fi Window',
    emoji: '🌆',
    startWeek: 18,
    endWeek: 28,
    type: 'seasonal',
    viewershipMultiplier: 1.15,
    description: 'High-concept dystopian stories ride the summer event-TV wave.',
  },
  {
    theme: 'survival',
    label: 'Summer Thriller Window',
    emoji: '🌿',
    startWeek: 23,
    endWeek: 33,
    type: 'seasonal',
    viewershipMultiplier: 1.15,
    description: 'Survival thrillers captivate binge-watching audiences all summer.',
  },
  {
    theme: 'crime',
    label: 'Fall Drama Season',
    emoji: '🔍',
    startWeek: 37,
    endWeek: 46,
    type: 'seasonal',
    viewershipMultiplier: 1.15,
    description: 'Fall is peak crime-drama season as audiences return from summer.',
  },
  {
    theme: 'legal',
    label: 'Fall Drama Season',
    emoji: '⚖️',
    startWeek: 37,
    endWeek: 46,
    type: 'seasonal',
    viewershipMultiplier: 1.15,
    description: 'Legal dramas hit their stride in the competitive fall window.',
  },
  {
    theme: 'medical',
    label: 'Fall Drama Season',
    emoji: '🏥',
    startWeek: 37,
    endWeek: 46,
    type: 'seasonal',
    viewershipMultiplier: 1.15,
    description: 'Medical dramas are fall TV staples with a loyal returning audience.',
  },
  {
    theme: 'political',
    label: 'Fall Premiere Season',
    emoji: '🏛️',
    startWeek: 35,
    endWeek: 43,
    type: 'seasonal',
    viewershipMultiplier: 1.15,
    description: 'Political dramas thrive alongside real-world news cycles in fall.',
  },
  {
    theme: 'workplace',
    label: 'Fall Premiere Season',
    emoji: '💼',
    startWeek: 35,
    endWeek: 43,
    type: 'seasonal',
    viewershipMultiplier: 1.15,
    description: 'Back-to-office energy makes workplace dramas relatable in fall.',
  },
  {
    theme: 'historical',
    label: 'Fall Prestige Window',
    emoji: '📜',
    startWeek: 36,
    endWeek: 46,
    type: 'seasonal',
    viewershipMultiplier: 1.15,
    description: 'Prestige historical dramas compete for Emmy attention in fall.',
  },
  {
    theme: 'war',
    label: 'Fall Prestige Window',
    emoji: '🎖️',
    startWeek: 36,
    endWeek: 44,
    type: 'seasonal',
    viewershipMultiplier: 1.15,
    description: 'War dramas draw prestige-drama audiences in the fall season.',
  },
  {
    theme: 'western',
    label: 'Fall Drama Season',
    emoji: '🤠',
    startWeek: 36,
    endWeek: 44,
    type: 'seasonal',
    viewershipMultiplier: 1.15,
    description: 'Western revivals anchor fall lineups for broadcast and streaming.',
  },
];

// Fast lookup: theme → window (null if none)
const WINDOW_MAP = new Map<Theme, ThemeWindow>(
  THEME_WINDOWS.map(w => [w.theme, w]),
);

export function getThemeWindow(theme: Theme): ThemeWindow | null {
  return WINDOW_MAP.get(theme) ?? null;
}

export function getViewershipMultiplier(theme: Theme, week: number): number {
  const win = getThemeWindow(theme);
  if (!win) return 1.0;
  if (week >= win.startWeek && week <= win.endWeek) return win.viewershipMultiplier;
  return 1.0;
}

export function isInThemeWindow(theme: Theme, week: number): boolean {
  const win = getThemeWindow(theme);
  if (!win) return false;
  return week >= win.startWeek && week <= win.endWeek;
}
