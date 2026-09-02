import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TUTORIAL_KEY = 'tvstudiosim_tutorial_v1';

export type TutorialStep =
  | 'dashboard'
  | 'create-show'
  | 'casting'
  | 'show-writing'
  | 'post-writing-tasks'
  | 'waiting-for-marketing'
  | 'post-filming'
  | 'marketing-premiere'
  | 'marketing-channels'
  | 'episode-aired'
  | 'social-buzz'
  | 'done';

// Steps where the user must perform an in-game action to advance (no Next button)
export const ACTION_GATED_STEPS: TutorialStep[] = ['dashboard', 'create-show'];

// Steps that hold silently with no overlay shown — used as waiting states
export const HIDDEN_STEPS: TutorialStep[] = ['waiting-for-marketing'];

const STEP_ORDER: TutorialStep[] = [
  'dashboard',
  'create-show',
  'casting',
  'show-writing',
  'post-writing-tasks',
  'waiting-for-marketing',
  'post-filming',
  'marketing-premiere',
  'marketing-channels',
  'episode-aired',
  'social-buzz',
  'done',
];

export interface StepConfig {
  title: string;
  body: string;
  route: string;
}

export const STEP_CONFIG: Record<Exclude<TutorialStep, 'done' | 'waiting-for-marketing'>, StepConfig> = {
  'dashboard': {
    title: 'ADVANCE THE WEEK',
    body: "This golden button is the engine of your studio. Tap it to move time forward — your shows progress through writing, filming, and air. Go ahead and tap it now to get started.",
    route: '/(tabs)',
  },
  'create-show': {
    title: 'CREATE YOUR FIRST SHOW',
    body: "Every great network starts with a hit show. Tap CREATE SHOW below to greenlight your first production. Pick a genre, a theme, and an episode count — each combination plays differently.",
    route: '/(tabs)',
  },
  'casting': {
    title: 'HIRE YOUR SHOWRUNNER',
    body: "First, hire a Showrunner. They run the writers' room and set your creative ceiling. A great showrunner means better scripts, which means better ratings. Tap any showrunner candidate to hire them.",
    route: '/hire-talent',
  },
  'show-writing': {
    title: 'WRITING IN PROGRESS',
    body: "Your show is in the writers' room. Each week you advance, writing ticks forward. Watch the progress bar on your show card — filming starts automatically when the scripts are done.",
    route: '/(tabs)',
  },
  'post-writing-tasks': {
    title: 'HIRE YOUR CREW',
    body: "Writing is done — filming has begun! Check your TASKS section below for three key roles: a Director to lead the shoot, Lead Actors for your starring cast, and Supporting Cast to round out the ensemble. Each one affects your final quality score.",
    route: '/(tabs)',
  },
  'post-filming': {
    title: 'TIME TO MARKET',
    body: "Filming is wrapped! Now tap your show card to open the show detail screen, then go to Marketing to set your premiere date and buy advertising. Timing your premiere and spending on ads can make or break your ratings.",
    route: '/(tabs)',
  },
  'marketing-premiere': {
    title: 'SET YOUR PREMIERE DATE',
    body: "Pick how many weeks from now to air. Scheduling during a themed boost window that matches your show's genre gives you a big ratings bonus — look for the coloured window indicator below the date picker.",
    route: '/marketing',
  },
  'marketing-channels': {
    title: 'BUY MARKETING CHANNELS',
    body: "These channels build awareness before your premiere. Each one costs money but drives more viewers to episode one. Genre-matched channels give an extra 20% bonus on top — check the tag on each card.",
    route: '/marketing',
  },
  'episode-aired': {
    title: 'YOUR FIRST RATING',
    body: "Your show just aired! The number here is its rating — higher is better. Ratings drive ad revenue every week. Build momentum across episodes to grow your audience and attract renewal offers.",
    route: '/(tabs)',
  },
  'social-buzz': {
    title: 'SOCIAL BUZZ',
    body: "After advancing each week, the Weekly Recap shows what viewers are tweeting about your show. Strong ratings generate viral moments — watch the social section to gauge the mood and plan your next move.",
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
  resetTutorial: () => Promise<void>;
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

  resetTutorial: async () => {
    await AsyncStorage.removeItem(TUTORIAL_KEY);
    set({ ready: true, active: true, step: 'dashboard', targetRect: null });
  },

  registerTarget: (rect: TargetRect) => {
    set({ targetRect: rect });
  },

  clearTarget: () => {
    set({ targetRect: null });
  },
}));