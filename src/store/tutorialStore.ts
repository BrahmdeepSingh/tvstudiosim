import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TUTORIAL_KEY = 'tvstudiosim_tutorial_v1';

export type TutorialStep =
  | 'dashboard'
  | 'create-show'
  | 'casting'
  | 'show-writing'
  | 'scheduling'
  | 'boost-zone'
  | 'marketing'
  | 'episode-aired'
  | 'social-buzz'
  | 'done';

const STEP_ORDER: TutorialStep[] = [
  'dashboard',
  'create-show',
  'casting',
  'show-writing',
  'scheduling',
  'boost-zone',
  'marketing',
  'episode-aired',
  'social-buzz',
  'done',
];

export interface StepConfig {
  title: string;
  body: string;
  route: string;
  // Approximate anchor position (0-1 fractions of screen) for the pulsing ring
  anchorX: number;
  anchorY: number;
}

export const STEP_CONFIG: Record<Exclude<TutorialStep, 'done'>, StepConfig> = {
  'dashboard': {
    title: 'ADVANCE THE WEEK',
    body: "This is your studio dashboard. The golden button at the bottom advances time. Each week your shows progress through writing, filming, and eventually hit the air. Tap it to move things forward.",
    route: '/(tabs)',
    anchorX: 0.5,
    anchorY: 0.92,
  },
  'create-show': {
    title: 'CREATE YOUR FIRST SHOW',
    body: "Every great network starts with a hit show. Tap \"+ CREATE SHOW\" to greenlight your first production. Pick a genre, theme, and episode count — each combination plays differently.",
    route: '/(tabs)',
    anchorX: 0.5,
    anchorY: 0.45,
  },
  'casting': {
    title: 'HIRE YOUR TEAM',
    body: "A show is only as good as its talent. Hire a showrunner to lead the writers' room, then fill your cast. Higher prestige talent costs more but boosts your ratings ceiling.",
    route: '/hire-talent',
    anchorX: 0.5,
    anchorY: 0.3,
  },
  'show-writing': {
    title: 'WRITING IN PROGRESS',
    body: "Your show is now in the writers' room. Each week you advance, writing progresses. Keep an eye on the progress bar on your show card — filming starts automatically when writing wraps.",
    route: '/(tabs)',
    anchorX: 0.5,
    anchorY: 0.5,
  },
  'scheduling': {
    title: 'PICK AN AIR DATE',
    body: "The schedule screen shows the full broadcast calendar. Drag to scroll through the year and tap a week to set your premiere date. Timing is everything — some weeks draw bigger audiences.",
    route: '/schedule',
    anchorX: 0.5,
    anchorY: 0.5,
  },
  'boost-zone': {
    title: 'BOOST ZONES',
    body: "See those golden highlighted windows? Those are themed boost zones — scheduling your show to premiere inside one gives a ratings bonus if your show's theme matches. Plan around them!",
    route: '/schedule',
    anchorX: 0.5,
    anchorY: 0.4,
  },
  'marketing': {
    title: 'SPEND ON MARKETING',
    body: "Marketing builds awareness before your premiere. Allocate budget across TV spots, social media, and billboards. More spend = more viewers tuning in for episode one.",
    route: '/marketing',
    anchorX: 0.5,
    anchorY: 0.5,
  },
  'episode-aired': {
    title: 'YOUR FIRST RATING',
    body: "Your show just aired! The number on the episode card is its rating — higher is better. Ratings drive ad revenue each week. String together strong episodes to build a loyal audience.",
    route: '/(tabs)',
    anchorX: 0.5,
    anchorY: 0.55,
  },
  'social-buzz': {
    title: 'SOCIAL BUZZ',
    body: "After each week you advance, check the Weekly Recap for social buzz. Viewers tweet reactions to your episodes — strong ratings generate viral moments. Watch what they say to gauge the mood.",
    route: '/(tabs)',
    anchorX: 0.5,
    anchorY: 0.5,
  },
};

interface TutorialState {
  ready: boolean;
  active: boolean;
  step: TutorialStep;
  init: () => Promise<void>;
  advance: () => void;
  jumpTo: (step: TutorialStep) => void;
  skip: () => void;
}

export const useTutorialStore = create<TutorialState>((set, get) => ({
  ready: false,
  active: false,
  step: 'dashboard',

  init: async () => {
    try {
      const val = await AsyncStorage.getItem(TUTORIAL_KEY);
      if (val === 'done') {
        set({ ready: true, active: false, step: 'done' });
      } else if (val && val !== 'done') {
        // Resume from saved step
        const saved = val as TutorialStep;
        set({ ready: true, active: true, step: saved });
      } else {
        // First install — start tutorial
        set({ ready: true, active: true, step: 'dashboard' });
        await AsyncStorage.setItem(TUTORIAL_KEY, 'dashboard');
      }
    } catch {
      set({ ready: true, active: false });
    }
  },

  advance: () => {
    const { step } = get();
    const idx = STEP_ORDER.indexOf(step);
    if (idx === -1 || idx >= STEP_ORDER.length - 1) return;
    const next = STEP_ORDER[idx + 1];
    set({ step: next, active: next !== 'done' });
    AsyncStorage.setItem(TUTORIAL_KEY, next).catch(() => {});
  },

  jumpTo: (step: TutorialStep) => {
    set({ step, active: step !== 'done' });
    AsyncStorage.setItem(TUTORIAL_KEY, step).catch(() => {});
  },

  skip: () => {
    set({ active: false, step: 'done' });
    AsyncStorage.setItem(TUTORIAL_KEY, 'done').catch(() => {});
  },
}));
