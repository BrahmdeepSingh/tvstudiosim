import { Theme } from '../types';

export type WindowType = 'cultural' | 'seasonal';

export interface ThemeWindow {
  theme: Theme;
  label: string;
  emoji: string;
  startWeek: number;     // inclusive
  endWeek: number;       // inclusive
  type: WindowType;
  viewershipMultiplier: number; // 1.25 cultural | 1.15 seasonal
  description: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cultural windows: tied to a real-world calendar moment (1.25×)
// Seasonal windows: broad audience appetite windows (1.15×)
// ─────────────────────────────────────────────────────────────────────────────

export const THEME_WINDOWS: ThemeWindow[] = [
  // ── Cultural (1.25×) ──────────────────────────────────────────────────────
  {
    theme: 'romance',
    label: "Valentine's Season",
    emoji: '💝',
    startWeek: 5,
    endWeek: 8,
    type: 'cultural',
    viewershipMultiplier: 1.25,
    description: "Valentine's Day drives romance viewership into overdrive.",
  },
  {
    theme: 'war',
    label: 'Memorial Day Window',
    emoji: '🎖️',
    startWeek: 18,
    endWeek: 21,
    type: 'cultural',
    viewershipMultiplier: 1.25,
    description: 'Memorial Day weekend is the cultural peak for war and military storytelling.',
  },
  {
    theme: 'superhero',
    label: 'Summer Blockbuster',
    emoji: '🦸',
    startWeek: 21,
    endWeek: 30,
    type: 'cultural',
    viewershipMultiplier: 1.25,
    description: 'Memorial Day through end of summer primes audiences for superhero action.',
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
  {
    theme: 'sports',
    label: 'NFL Season',
    emoji: '🏆',
    startWeek: 36,
    endWeek: 42,
    type: 'cultural',
    viewershipMultiplier: 1.25,
    description: 'NFL season puts sports content front and center every week.',
  },
  {
    theme: 'horror',
    label: 'Halloween Season',
    emoji: '🎃',
    startWeek: 39,
    endWeek: 44,
    type: 'cultural',
    viewershipMultiplier: 1.25,
    description: 'Full October plus Halloween buildup makes horror unmissable.',
  },
  {
    theme: 'holiday',
    label: 'Holiday Season',
    emoji: '🎄',
    startWeek: 47,
    endWeek: 52,
    type: 'cultural',
    viewershipMultiplier: 1.25,
    description: 'Thanksgiving through New Year brings families to the couch.',
  },

  // ── Seasonal (1.15×) ──────────────────────────────────────────────────────
  // Medieval has two cold-weather windows; both entries render on the Gantt
  // and boost calculation checks all windows for the theme.
  {
    theme: 'medieval',
    label: 'Winter Epic Window',
    emoji: '🏰',
    startWeek: 1,
    endWeek: 5,
    type: 'seasonal',
    viewershipMultiplier: 1.15,
    description: 'Cold January nights are perfect for long-form medieval epics.',
  },
  {
    theme: 'survival',
    label: 'Summer Adventure Window',
    emoji: '🌿',
    startWeek: 21,
    endWeek: 30,
    type: 'seasonal',
    viewershipMultiplier: 1.15,
    description: 'Summer adventure energy keeps survival thrillers riveting.',
  },
  {
    theme: 'space',
    label: 'Summer Sci-Fi Window',
    emoji: '🚀',
    startWeek: 21,
    endWeek: 30,
    type: 'seasonal',
    viewershipMultiplier: 1.15,
    description: 'Summer blockbuster adjacency boosts big-scale sci-fi.',
  },
  {
    theme: 'fantasy',
    label: 'Summer Epic Window',
    emoji: '⚔️',
    startWeek: 22,
    endWeek: 30,
    type: 'seasonal',
    viewershipMultiplier: 1.15,
    description: 'Long summer nights are perfect for sprawling fantasy epics.',
  },
  {
    theme: 'western',
    label: 'Summer Frontier Window',
    emoji: '🤠',
    startWeek: 22,
    endWeek: 30,
    type: 'seasonal',
    viewershipMultiplier: 1.15,
    description: 'Classic summer frontier feel keeps westerns riding high.',
  },
  {
    theme: 'coming-of-age',
    label: 'Back-to-School Window',
    emoji: '🎒',
    startWeek: 34,
    endWeek: 38,
    type: 'seasonal',
    viewershipMultiplier: 1.15,
    description: 'Back-to-school nostalgia boosts coming-of-age stories in late summer.',
  },
  {
    theme: 'crime',
    label: 'Fall Drama Season',
    emoji: '🔍',
    startWeek: 36,
    endWeek: 43,
    type: 'seasonal',
    viewershipMultiplier: 1.15,
    description: 'Fall is peak crime-drama season as audiences return from summer.',
  },
  {
    theme: 'legal',
    label: 'Fall Drama Season',
    emoji: '⚖️',
    startWeek: 36,
    endWeek: 43,
    type: 'seasonal',
    viewershipMultiplier: 1.15,
    description: 'Legal dramas hit their stride in the competitive fall window.',
  },
  {
    theme: 'medical',
    label: 'Fall Drama Season',
    emoji: '🏥',
    startWeek: 36,
    endWeek: 43,
    type: 'seasonal',
    viewershipMultiplier: 1.15,
    description: 'Medical dramas are fall TV staples with a loyal returning audience.',
  },
  {
    theme: 'political',
    label: 'Fall Premiere Season',
    emoji: '🏛️',
    startWeek: 36,
    endWeek: 43,
    type: 'seasonal',
    viewershipMultiplier: 1.15,
    description: 'Political dramas thrive alongside real-world news cycles in fall.',
  },
  {
    theme: 'historical',
    label: 'Fall Prestige Window',
    emoji: '📜',
    startWeek: 36,
    endWeek: 44,
    type: 'seasonal',
    viewershipMultiplier: 1.15,
    description: 'Prestige historical dramas compete for Emmy attention in fall.',
  },
  {
    theme: 'workplace',
    label: 'Back to Office Window',
    emoji: '💼',
    startWeek: 36,
    endWeek: 40,
    type: 'seasonal',
    viewershipMultiplier: 1.15,
    description: 'Back-to-office energy makes workplace dramas relatable in fall.',
  },
  {
    theme: 'dystopian',
    label: 'Fall Dark Season',
    emoji: '🌆',
    startWeek: 38,
    endWeek: 44,
    type: 'seasonal',
    viewershipMultiplier: 1.15,
    description: 'Autumn darkness primes audiences for high-concept dystopian stories.',
  },
  {
    theme: 'supernatural',
    label: 'Spooky Season',
    emoji: '👻',
    startWeek: 39,
    endWeek: 44,
    type: 'seasonal',
    viewershipMultiplier: 1.15,
    description: 'The Halloween cultural moment lifts supernatural content alongside horror.',
  },
  {
    theme: 'medieval',
    label: 'Holiday Epic Window',
    emoji: '🏰',
    startWeek: 48,
    endWeek: 52,
    type: 'seasonal',
    viewershipMultiplier: 1.15,
    description: 'Holiday binge season draws audiences into sweeping medieval worlds.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — indexed by theme, supporting multiple windows per theme (medieval)
// ─────────────────────────────────────────────────────────────────────────────

const WINDOW_MAP = new Map<Theme, ThemeWindow[]>();
for (const w of THEME_WINDOWS) {
  const existing = WINDOW_MAP.get(w.theme) ?? [];
  existing.push(w);
  WINDOW_MAP.set(w.theme, existing);
}

// Returns the active window for the given week, or the first window if no week provided.
export function getThemeWindow(theme: Theme, week?: number): ThemeWindow | null {
  const wins = WINDOW_MAP.get(theme);
  if (!wins?.length) return null;
  if (week !== undefined) {
    return wins.find(w => week >= w.startWeek && week <= w.endWeek) ?? wins[0];
  }
  return wins[0];
}

export function getViewershipMultiplier(theme: Theme, week: number): number {
  const wins = WINDOW_MAP.get(theme);
  if (!wins) return 1.0;
  for (const win of wins) {
    if (week >= win.startWeek && week <= win.endWeek) return win.viewershipMultiplier;
  }
  return 1.0;
}

export function isInThemeWindow(theme: Theme, week: number): boolean {
  const wins = WINDOW_MAP.get(theme);
  if (!wins) return false;
  return wins.some(w => week >= w.startWeek && week <= w.endWeek);
}
