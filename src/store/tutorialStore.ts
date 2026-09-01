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
}

export const STEP_CONFIG: Record<Exclude<TutorialStep, 'done'>, StepConfig> = {
  'dashboard': {
    title: 'ADVANCE THE WEEK',
    body: "This golden button is the engine of your studio. Tap it each week to progress your shows through writing, filming, and eventually air. Everything in the game moves forward here.",
    route: '/(tabs)',
  },
  'create-show': {
    title: 'CREATE YOUR FIRST SHOW',
    body: "Every great network starts with a hit show. Tap here to greenlight your first production. Pick a genre, a theme, and an episode count — each combination plays differently.",
    route: '/(tabs)',
  },
  'casting': {
    title: 'HIRE YOUR TEAM',
    body: "A show is only as good as its talent. Start by hiring a showrunner to lead the writers' room — they set your creative ceiling. Then fill out your lead and supporting cast.",
    route: '/hire-talent',
  },
  'show-writing': {
    title: 'WRITING IN PROGRESS',
    body: "Your show is now in the writers' room. Each week you advance, writing ticks forward. Watch the progress bar — filming starts automatically when writing wraps.",
    route: '/(tabs)',
  },
  'scheduling': {
    title: 'PICK AN AIR DATE',
    body: "This is your full broadcast calendar. Scroll horizontally to browse weeks and pick when to premiere. Timing matters — some windows attract bigger audiences than others.",
    route: '/schedule',
  },
  'boost-zone': {
    title: 'BOOST ZONES',
    body: "The coloured highlighted windows are themed boost zones. Schedule your show's premiere inside one matching your show's theme and you'll get a ratings bonus. Plan around them!",
    route: '/schedule',
  },
  'marketing': {
    title: 'SPEND ON MARKETING',
    body: "These channels build awareness before your premiere. Each one costs money but brings more viewers to episode one. Genre-matched channels give an extra 20% bonus.",
    route: '/marketing',
  },
  'episode-aired': {
    title: 'YOUR FIRST RATING',
    body: "Your show just aired! The number here is its rating — higher is better. Ratings drive ad revenue every week. Build momentum across episodes to grow your audience.",
    route: '/(tabs)',
  },
  'social-buzz': {
    title: 'SOCIAL BUZZ',
    body: "After advancing each week, the Weekly Recap shows what viewers are tweeting about your show. Strong ratings generate viral moments — watch the social section to gauge the mood.",
    route: '/(tabs)',
  },
};

export interface TargetRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface TutorialState {
  ready: boolean;
  active: boolean;
  step: TutorialStep;
  targetRect: TargetRect | null;
  init: () => Promise<void>;
  advance: () => void;
  jumpTo: (step: TutorialStep) => void;
  skip: () => void;
  registerTarget: (rect: TargetRect) => void;
  clearTarget: () => void;
}

export const useTutorialStore = create<TutorialState>((set, get) => ({
  ready: false,
  active: false,
  step: 'dashboard',
  targetRect: null,

  init: async () => {
    try {
      const val = await AsyncStorage.getItem(TUTORIAL_KEY);
      if (val === 'done') {
        set({ ready: true, active: false, step: 'done' });
      } else if (val && val !== 'done') {
        set({ ready: true, active: true, step: val as TutorialStep });
      } else {
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
    set({ step: next, active: next !== 'done', targetRect: null });
    AsyncStorage.setItem(TUTORIAL_KEY, next).catch(() => {});
  },

  jumpTo: (step: TutorialStep) => {
    set({ step, active: step !== 'done', targetRect: null });
    AsyncStorage.setItem(TUTORIAL_KEY, step).catch(() => {});
  },

  skip: () => {
    set({ active: false, step: 'done', targetRect: null });
    AsyncStorage.setItem(TUTORIAL_KEY, 'done').catch(() => {});
  },

  registerTarget: (rect: TargetRect) => {
    set({ targetRect: rect });
  },

  clearTarget: () => {
    set({ targetRect: null });
  },
}));
