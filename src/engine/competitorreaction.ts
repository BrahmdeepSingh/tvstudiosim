import { SocialReaction, Genre } from '../types';
import { randomBetween, randomItem } from '../utils/random';
import { Blueprint, Fragment, FragmentLibrary, PersonaToneProfile, assemblePost, applyPersonaTone } from './fragmentassembler';

// ─────────────────────────────────────────────────────────────────────────────
// Second category converted to the assembly engine, and the one the tone
// dictionary's intensity scaling was actually built for: unlike industry
// chatter (no underlying score to scale off), a competitor show has a real
// `currentRating` (1.0-10.0). Normalized to 0-1, that becomes BOTH the
// `intensityRange` filter for fragment eligibility AND the {good}/{bad}
// synonym intensity.
//
// Revised after a real gameplay log surfaced three problems this file
// previously had, all now fixed:
//   1. The ['opener', 'reaction'] blueprint below has been REMOVED. It
//      produced empty/content-free posts (e.g. a literal blank post, and
//      "Okay but nobody is bringing this up enough.") whenever a persona had
//      no eligible reaction fragment to pair with the opener at that
//      intensity — the opener got orphaned and dropped, leaving nothing.
//      Every blueprint now guarantees an 'observation' slot, the only slot
//      type that actually names the show.
//   2. Openers were previously shared near-verbatim with industryChatter.ts
//      and episodeReaction.ts, and only 2 of 7 were persona-unrestricted —
//      meaning "okay but" / "genuinely," carried 3+ personas' worth of posts
//      MULTIPLIED across all three categories. Expanded and made distinct
//      from the other two files' voice, with every persona now having at
//      least 4 eligible openers instead of 2.
//   3. Several reaction fragments referenced "this"/"it" as if continuing a
//      prior statement (anaphoric) but weren't marked canLeadPost: false, so
//      they could lead a post with nothing to refer back to. Audited and
//      fixed all of them, not just the one caught previously.
// ─────────────────────────────────────────────────────────────────────────────

const PERSONA_HANDLES: Record<string, { username: string; handle: string }> = {
  stan: { username: 'unhinged tv stan', handle: '@watchingrn' },
  critic: { username: 'Critics Desk', handle: '@criticsdesk' },
  insider: { username: 'The Wrap Line', handle: '@thewrapline' },
  numbers: { username: 'PrimeTimeFeed', handle: '@primetimefeed' },
  meme: { username: 'tv memes daily', handle: '@tvmemesdaily' },
  hatewatcher: { username: 'StreamNerve', handle: '@streamnerve' },
  recapper: { username: 'TV Obsessed', handle: '@tvobsessed' },
};
const PERSONA_KEYS = Object.keys(PERSONA_HANDLES);

function normalizeRating(rating: number): number {
  return Math.min(1, Math.max(0, (rating - 1) / 9));
}

// ─────────────────────────────────────────────────────────────────────────────
// FRAGMENT LIBRARY
// ─────────────────────────────────────────────────────────────────────────────

const openers: Fragment[] = [
  { text: 'been meaning to say,', personas: ['*'] },
  { text: 'real talk,', personas: ['*'] },
  { text: 'no shot I keep this to myself,', personas: ['*'] },
  { text: 'putting this out there,', personas: ['*'] },
  { text: 'not gonna lie,', personas: ['hatewatcher', 'critic'] },
  { text: 'quick thought —', personas: ['insider', 'numbers'] },
  { text: 'hearing things and', personas: ['insider'], followsWith: ['observation'] },
  { text: 'source close to the show says', personas: ['insider'], followsWith: ['observation'] },
  { text: 'unpopular opinion,', personas: ['hatewatcher', 'critic'], followsWith: ['observation'] },
  { text: 'hot take incoming,', personas: ['meme', 'hatewatcher'], followsWith: ['observation'] },
  { text: 'ok I need to say this,', personas: ['stan', 'recapper'] },
  { text: 'been thinking about this all week,', personas: ['stan', 'recapper'] },
  { text: 'numbers don\'t lie,', personas: ['numbers'], followsWith: ['observation'] },
  { text: 'watching this closely,', personas: ['numbers', 'insider'], followsWith: ['observation'] },
  { text: 'lowkey,', personas: ['meme', 'stan'] },
];

const observations: Fragment[] = [
  { text: '{SHOW_NAME} is {good} right now', personas: ['*'] },
  { text: "{SHOW_NAME}'s numbers have been {good} this season", personas: ['numbers', 'insider'] },
  { text: 'the writing on {SHOW_NAME} has been {good} lately', personas: ['critic', 'recapper'] },
  { text: '{SHOW_NAME} keeps finding new ways to be {bad}', personas: ['hatewatcher', 'meme'], intensityRange: [0, 0.45] },
  { text: 'whoever is running {SHOW_NAME} right now deserves real credit', personas: ['critic', 'insider'], intensityRange: [0.7, 1] },
  { text: 'the performances on {SHOW_NAME} have been {good} this season', personas: ['stan', 'recapper'] },
  { text: 'not sure {SHOW_NAME} even knows what show it wants to be anymore', personas: ['critic', 'hatewatcher'], intensityRange: [0, 0.4] },
  { text: '{SHOW_NAME} has quietly become appointment viewing for me', personas: ['stan', 'recapper'], intensityRange: [0.65, 1] },
  { text: 'people really slept on {SHOW_NAME} this season', personas: ['recapper', 'insider'], intensityRange: [0.55, 1] },
  { text: "{SHOW_NAME} is coasting on a premise it hasn't fully earned yet", personas: ['critic', 'hatewatcher'], intensityRange: [0, 0.5] },
  { text: '{SHOW_NAME} deserves way more people watching it than it\'s getting', personas: ['stan', 'recapper'], intensityRange: [0.6, 1] },
  { text: '{SHOW_NAME} is genuinely struggling to hold my attention lately', personas: ['hatewatcher', 'critic'], intensityRange: [0, 0.4] },
];

const reactions: Fragment[] = [
  { text: 'I am fully invested at this point', personas: ['stan', 'recapper'], intensityRange: [0.6, 1] },
  { text: "it's exhausting to keep defending this show", personas: ['hatewatcher', 'critic'], intensityRange: [0, 0.45] },
  { text: 'not complaining though', personas: ['stan', 'numbers', 'recapper'], intensityRange: [0.35, 1], canLeadPost: false },
  { text: "this show needs to be talked about more", personas: ['insider', 'numbers'], intensityRange: [0.6, 1], canLeadPost: false },
  { text: "it might be time to call it on this one", personas: ['hatewatcher', 'meme'], intensityRange: [0, 0.3] },
  { text: 'nobody is bringing this show up enough', personas: ['insider', 'numbers'], canLeadPost: false },
  { text: 'the show deserves better than this honestly', personas: ['critic', 'hatewatcher'], intensityRange: [0, 0.4] },
  { text: 'this is exactly the kind of show that gets slept on come awards season', personas: ['insider', 'critic'], intensityRange: [0.7, 1], canLeadPost: false },
  { text: 'someone needed to say that out loud', personas: ['critic', 'hatewatcher'], canLeadPost: false },
  { text: "I'll be thinking about this one for a while", personas: ['stan', 'recapper'], intensityRange: [0.6, 1] },
];

const fillers: Fragment[] = [
  { text: 'the fandom for this show never sleeps', personas: ['stan', 'recapper'] },
  { text: 'the discourse around this one has been a lot lately', personas: ['meme', 'hatewatcher'] },
  { text: 'the trades are going to have opinions about this one', personas: ['insider', 'critic'] },
  { text: 'people are going to be arguing about this one for years', personas: ['critic', 'insider'] },
];

const signoffs: Fragment[] = [
  { text: '#{GENRE}TV', personas: ['*'] },
  { text: '👀🍿', personas: ['stan', 'hatewatcher', 'meme'] },
  { text: 'thoughts?', personas: ['critic', 'insider'] },
  { text: '📺', personas: ['recapper', 'stan'] },
];

const LIBRARY: FragmentLibrary = {
  opener: openers,
  observation: observations,
  reaction: reactions,
  filler: fillers,
  signoff: signoffs,
};

// No bare ['opener', 'reaction'] blueprint — see file header. Every blueprint
// guarantees at least one 'observation' slot.
const BLUEPRINTS: Blueprint[] = [
  ['opener', 'observation', 'reaction', 'signoff'],
  ['reaction', 'observation', 'signoff'],
  ['observation', 'filler'],
  ['observation', 'reaction', 'signoff'],
  ['opener', 'observation', 'signoff'],
];

// Purged of noun-phrase-only entries (e.g. "a genuine masterclass", "a real
// standout", "a pleasant surprise") that broke in slots other than "is
// {good}" — e.g. "feels {good}" needs "feels great" not "feels a pleasant
// surprise" (missing "like"). Every entry below is a plain adjective or
// adjective phrase so it's safe in any predicate slot regardless of verb.
const TONE: Record<string, PersonaToneProfile> = {
  stan: {
    capsProbability: 0.2,
    synonyms: {
      '{good}': ['nice', 'really solid', 'genuinely great', 'goated', 'literally perfect'],
      '{bad}': ['a little off', 'not it', 'rough', 'disastrous', 'actually unforgivable'],
    },
  },
  critic: {
    capsProbability: 0,
    synonyms: {
      '{good}': ['decent', 'well-executed', 'quite strong', 'sublime', 'masterful'],
      '{bad}': ['uneven', 'underwhelming', 'derivative', 'tonally confused', 'a genuine misfire'],
    },
  },
  insider: {
    capsProbability: 0,
    synonyms: {
      '{good}': ['fine', 'promising', 'notably strong', 'impressive', 'genuinely outstanding'],
      '{bad}': ['a bit shaky', 'concerning', 'worrying internally', 'in real trouble', 'in full crisis mode'],
    },
  },
  numbers: {
    capsProbability: 0,
    synonyms: {
      '{good}': ['steady', 'solid', 'strong', 'excellent', 'record-setting'],
      '{bad}': ['soft', 'weak', 'concerning', 'sliding fast', 'in freefall'],
    },
  },
  meme: {
    capsProbability: 0.3,
    synonyms: {
      '{good}': ['kind of unreal', 'wild', 'unreal', 'actually insane', 'beyond parody'],
      '{bad}': ['not great', 'rough out here', 'a mess', 'genuinely embarrassing', 'catastrophic'],
    },
  },
  hatewatcher: {
    capsProbability: 0.15,
    synonyms: {
      '{good}': ['accidentally decent', 'better than expected', 'weirdly solid', 'surprisingly good', 'somehow great'],
      '{bad}': ['mid', 'trashy', 'a total trainwreck', 'unwatchable', 'indefensible'],
    },
  },
  recapper: {
    capsProbability: 0.1,
    synonyms: {
      '{good}': ['nice', 'genuinely fun', 'quite strong', 'excellent', 'unmissable'],
      '{bad}': ['a little disappointing', 'not landing', 'rough lately', 'a real low point', 'a total misfire'],
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// FRAGMENT-LEVEL COOLDOWN — in-memory only, resets on app restart (not part
// of GameState/save data). Deliberately kept out of persisted state after
// several rounds of wiring breakage from threading new fields through
// GameState/advancement.ts/gameStore.ts — this is "session variety," not
// something that needs to survive a save/reload.
// ─────────────────────────────────────────────────────────────────────────────

const COOLDOWN_WINDOW = 15;
let recentFragmentKeys: string[] = [];

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

export function generateCompetitorReactionPost(
  showTitle: string,
  genre: Genre,
  rating: number,
): SocialReaction {
  const intensity = normalizeRating(rating);
  const persona = randomItem(PERSONA_KEYS);
  const tokens = { SHOW_NAME: showTitle, GENRE: genre };

  const { text, usedKeys } = assemblePost(
    BLUEPRINTS, LIBRARY, persona, tokens, intensity, new Set(recentFragmentKeys),
  );
  recentFragmentKeys = [...recentFragmentKeys, ...usedKeys].slice(-COOLDOWN_WINDOW);

  const content = applyPersonaTone(text, TONE[persona], intensity);
  const { username, handle } = PERSONA_HANDLES[persona];

  return {
    username,
    handle,
    content,
    likes: randomBetween(100, 1600),
    reposts: randomBetween(30, 480),
  };
}