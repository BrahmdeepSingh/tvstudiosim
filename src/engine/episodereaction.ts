import { SocialReaction, Genre } from '../types';
import { randomBetween, randomItem } from '../utils/random';
import { Blueprint, Fragment, FragmentLibrary, PersonaToneProfile, assemblePost, applyPersonaTone } from './fragmentassembler';

// ─────────────────────────────────────────────────────────────────────────────
// Third category converted to the assembly engine, and the highest-frequency
// one by far — fires for every aired episode of every airing show, every
// week, guaranteed. Gets the biggest opener pool of the three category files
// for exactly that reason: this is the content players will see the most of,
// so it's the most exposed to repetition.
//
// Revised after a real gameplay log showed the same root problem as the
// other two files: too few persona-unrestricted openers ("ok but",
// "genuinely," carrying 3 personas' worth of posts) and several anaphoric
// reaction fragments ("nobody is bringing this up enough", "this needs to be
// talked about more") that hadn't gotten the canLeadPost: false treatment
// even though they read backwards when leading a post, same bug shape as the
// "not complaining though" fix from earlier — that fix only ever got applied
// to the one fragment that was reported, not audited across the whole pool.
// Also wired in fragment-level cooldown and purged noun-phrase tone entries.
// ─────────────────────────────────────────────────────────────────────────────

const PERSONA_HANDLES: Record<string, { username: string; handle: string }> = {
  stan: { username: 'unhinged tv stan', handle: '@watchingrn' },
  critic: { username: 'Critics Desk', handle: '@criticsdesk' },
  insider: { username: 'The Wrap Line', handle: '@thewrapline' },
  numbers: { username: 'PrimeTimeFeed', handle: '@primetimefeed' },
  meme: { username: 'tv memes daily', handle: '@tvmemesdaily' },
  hatewatcher: { username: 'StreamNerve', handle: '@streamnerve' },
  recapper: { username: 'TV Obsessed', handle: '@tvobsessed' },
  parasocial: { username: 'ride or die', handle: '@notokaythough' },
};
const PERSONA_KEYS = Object.keys(PERSONA_HANDLES);

function normalizeRating(rating: number): number {
  return Math.min(1, Math.max(0, (rating - 1) / 9));
}

const GENRE_FLAVOR: Record<Genre, { unit: string; hook: string; complaint: string }> = {
  drama: { unit: 'episode', hook: 'that ending', complaint: 'the pacing in the back half' },
  comedy: { unit: 'episode', hook: 'that cold open', complaint: 'the jokes not landing this week' },
  'sci-fi': { unit: 'episode', hook: 'that lore drop', complaint: 'the worldbuilding getting away from itself' },
  procedural: { unit: 'case', hook: 'that twist in the case', complaint: "this week's case feeling like a rerun" },
  reality: { unit: 'episode', hook: 'that elimination', complaint: 'the edit being so obviously rigged' },
  'limited-series': { unit: 'episode', hook: 'that reveal', complaint: 'how slow this is moving for something with an ending' },
};

// ─────────────────────────────────────────────────────────────────────────────
// FRAGMENT LIBRARY
// ─────────────────────────────────────────────────────────────────────────────

const openers: Fragment[] = [
  { text: 'okay I have to say this,', personas: ['*'] },
  { text: 'just finished watching and', personas: ['*'], followsWith: ['observation'] },
  { text: 'no way I stay quiet about this,', personas: ['*'] },
  { text: 'thinking about this way too much but,', personas: ['*'] },
  { text: 'real quick,', personas: ['*'] },
  { text: 'not gonna lie,', personas: ['hatewatcher', 'critic'] },
  { text: 'quick thought —', personas: ['insider', 'numbers'] },
  { text: 'unpopular opinion,', personas: ['hatewatcher', 'critic'], followsWith: ['observation'] },
  { text: 'hot take incoming,', personas: ['meme', 'hatewatcher'], followsWith: ['observation'] },
  { text: 'hearing things and', personas: ['insider'], followsWith: ['observation'] },
  { text: 'watching the numbers on this one,', personas: ['numbers', 'insider'], followsWith: ['observation'] },
  { text: 'okay this cast though,', personas: ['stan', 'parasocial'], followsWith: ['observation'] },
  { text: 'not me rewatching this already but,', personas: ['stan', 'parasocial'] },
  { text: 'ok so,', personas: ['recapper', 'meme'] },
  { text: 'putting this out into the universe,', personas: ['recapper', 'stan'] },
];

const observations: Fragment[] = [
  { text: '{SHOW_NAME} {UNIT} {EPISODE} is {good}', personas: ['*'] },
  { text: '{HOOK} in {SHOW_NAME} {UNIT} {EPISODE} was {good}', personas: ['recapper', 'stan'] },
  { text: 'the writing on {SHOW_NAME} has been {good} lately', personas: ['critic', 'recapper'] },
  { text: "{SHOW_NAME}'s ratings this stretch have been {good}", personas: ['numbers', 'insider'] },
  { text: 'whoever is running {SHOW_NAME} deserves real credit after this one', personas: ['critic', 'insider'], intensityRange: [0.75, 1] },
  { text: '{COMPLAINT} is becoming a real problem on {SHOW_NAME}', personas: ['critic', 'hatewatcher'], intensityRange: [0, 0.4] },
  { text: '{SHOW_NAME} keeps finding new ways to be {bad}', personas: ['hatewatcher', 'meme'], intensityRange: [0, 0.45] },
  { text: 'the cast on {SHOW_NAME} understood the assignment this {UNIT}', personas: ['stan', 'parasocial'], intensityRange: [0.65, 1] },
  { text: "{SHOW_NAME} still hasn't given these characters anything new to do", personas: ['parasocial', 'critic'], intensityRange: [0, 0.5] },
  { text: "{SHOW_NAME} is coasting on a premise it hasn't fully earned yet", personas: ['critic', 'hatewatcher'], intensityRange: [0.25, 0.6] },
  { text: '{SHOW_NAME} {UNIT} {EPISODE} genuinely surprised me in the best way', personas: ['recapper', 'stan'], intensityRange: [0.6, 1] },
  { text: '{SHOW_NAME} {UNIT} {EPISODE} left me with more questions than answers and not in a good way', personas: ['parasocial', 'hatewatcher'], intensityRange: [0, 0.45] },
];

const reactions: Fragment[] = [
  { text: 'I am fully invested at this point', personas: ['stan', 'recapper'], intensityRange: [0.6, 1], canLeadPost: false },
  { text: "it's exhausting to keep defending this show", personas: ['hatewatcher', 'critic'], intensityRange: [0, 0.45], canLeadPost: false },
  { text: 'not complaining though', personas: ['stan', 'numbers', 'recapper'], intensityRange: [0.35, 1], canLeadPost: false },
  { text: "this show needs to be talked about more", personas: ['insider', 'numbers'], intensityRange: [0.6, 1], canLeadPost: false },
  { text: "it might be time to call it on this one", personas: ['hatewatcher', 'meme'], intensityRange: [0, 0.3] },
  { text: 'nobody is bringing this show up enough', personas: ['insider', 'numbers'], canLeadPost: false },
  { text: 'the show deserves better than this honestly', personas: ['critic', 'hatewatcher'], intensityRange: [0, 0.4] },
  { text: 'I need everyone to see this', personas: ['stan', 'meme'] },
  { text: "I'll be thinking about this one for a while", personas: ['stan', 'parasocial'], intensityRange: [0.6, 1] },
  { text: 'someone needed to say that out loud', personas: ['critic', 'hatewatcher'], canLeadPost: false },
];

const fillers: Fragment[] = [
  { text: 'the fandom for this show never sleeps', personas: ['stan', 'recapper'] },
  { text: 'the discourse around this one has been a lot lately', personas: ['meme', 'hatewatcher'] },
  { text: 'the trades are going to have opinions about this one', personas: ['insider', 'critic'] },
  { text: 'rewatch pod when, I need to talk about this with someone', personas: ['recapper', 'stan'] },
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

// No bare ['opener', 'reaction'] blueprint — every blueprint guarantees an
// 'observation' slot, the only slot type carrying show/episode-specific
// content (SHOW_NAME, EPISODE, HOOK, COMPLAINT tokens).
const BLUEPRINTS: Blueprint[] = [
  ['opener', 'observation', 'reaction', 'signoff'],
  ['reaction', 'observation', 'signoff'],
  ['observation', 'filler'],
  ['observation', 'reaction', 'signoff'],
  ['opener', 'observation', 'signoff'],
];

// Purged of noun-phrase-only entries — every option is a plain adjective or
// adjective phrase, safe in any predicate slot this token appears in.
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
  parasocial: {
    capsProbability: 0.1,
    synonyms: {
      '{good}': ['sweet', 'wonderful', 'so good', 'perfect', 'exactly what I needed'],
      '{bad}': ['a little flat', 'disappointing', 'rough', 'a real letdown', 'heartbreaking for the worst reasons'],
    },
  },
};

// In-memory fragment-level cooldown — see competitorReaction.ts for why this
// is intentionally not part of persisted GameState.
const COOLDOWN_WINDOW = 20; // larger than the other two files since this
                             // category fires far more often per session
let recentFragmentKeys: string[] = [];

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

function generateOne(showTitle: string, episodeNumber: number, genre: Genre, rating: number, excludePersonas: Set<string>): SocialReaction {
  const intensity = normalizeRating(rating);
  const flavor = GENRE_FLAVOR[genre];
  const tokens = {
    SHOW_NAME: showTitle,
    EPISODE: String(episodeNumber),
    GENRE: genre,
    UNIT: flavor.unit,
    HOOK: flavor.hook,
    COMPLAINT: flavor.complaint,
  };

  const availablePersonas = PERSONA_KEYS.filter(p => !excludePersonas.has(p));
  const persona = randomItem(availablePersonas.length > 0 ? availablePersonas : PERSONA_KEYS);

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
    likes: randomBetween(80, rating >= 8 ? 5200 : rating >= 5.5 ? 900 : 1600),
    reposts: randomBetween(20, rating >= 8 ? 1900 : rating >= 5.5 ? 280 : 550),
  };
}

/**
 * Generates one episode's batch of reactions (3-5 posts), guaranteeing no
 * persona posts twice within the same batch.
 */
export function generateEpisodeReactionBatch(
  showTitle: string,
  episodeNumber: number,
  genre: Genre,
  rating: number,
): SocialReaction[] {
  const count = randomBetween(3, Math.min(5, PERSONA_KEYS.length));
  const usedPersonas = new Set<string>();
  const reactions: SocialReaction[] = [];

  for (let i = 0; i < count; i++) {
    const post = generateOne(showTitle, episodeNumber, genre, rating, usedPersonas);
    const usedKey = PERSONA_KEYS.find(k => PERSONA_HANDLES[k].handle === post.handle)!;
    usedPersonas.add(usedKey);
    reactions.push(post);
  }

  return reactions;
}