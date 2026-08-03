import { SocialReaction } from '../types';
import { randomBetween, randomItem } from '../utils/random';
import { Blueprint, Fragment, FragmentLibrary, PersonaToneProfile, assemblePost, applyPersonaTone } from './fragmentassembler';

// ─────────────────────────────────────────────────────────────────────────────
// First category converted to the assembly engine — highest-volume,
// lowest-specificity, exactly where combinatorial assembly beats writing
// more whole sentences one at a time.
//
// Revised after a real gameplay log showed "genuinely," / "ok but" carrying
// an outsized share of posts. Root cause: only 2 of 8 openers were
// persona-unrestricted, and this file's opener set was nearly identical to
// competitorReaction.ts's and episodeReaction.ts's — so the same couple of
// words were doing triple duty across the whole game's output, not just
// within this one category. Expanded openers and gave this file its own
// distinct voice (industry-chatter register — more "this business" framing)
// rather than sharing lines verbatim with the show-specific categories.
// Also purged noun-phrase-only tone synonyms (broke "feels {good}" the same
// way they broke a slot in competitorReaction.ts) and wired in fragment-level
// cooldown.
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

// ─────────────────────────────────────────────────────────────────────────────
// FRAGMENT LIBRARY
// ─────────────────────────────────────────────────────────────────────────────

const openers: Fragment[] = [
  { text: 'the state of this industry right now,', personas: ['*'] },
  { text: 'someone had to say it,', personas: ['*'] },
  { text: 'watching this play out,', personas: ['*'] },
  { text: 'small thing but worth noting,', personas: ['*'] },
  { text: "not gonna lie,", personas: ['hatewatcher', 'critic'] },
  { text: 'quick thought —', personas: ['insider', 'numbers'] },
  { text: 'rumor check:', personas: ['insider'], followsWith: ['observation'] },
  { text: "can we talk about how", personas: ['stan', 'recapper'], followsWith: ['observation'] },
  { text: 'hot take incoming,', personas: ['meme', 'hatewatcher'], followsWith: ['observation'] },
  { text: 'ok this is getting out of hand,', personas: ['meme', 'hatewatcher'] },
  { text: 'sitting with this for a minute,', personas: ['stan', 'recapper'] },
  { text: 'not to be dramatic but,', personas: ['stan', 'meme'] },
  { text: 'trades are already on this,', personas: ['insider', 'numbers'], followsWith: ['observation'] },
];

const observations: Fragment[] = [
  { text: 'network TV feels {good} right now across the board', personas: ['*'] },
  { text: 'ratings this season have been all over the place', personas: ['numbers', 'insider'] },
  { text: 'every network is chasing the same three ideas lately', personas: ['critic', 'hatewatcher'] },
  { text: 'ad rates keep climbing for anything with a live element', personas: ['numbers', 'insider'] },
  { text: 'the amount of {good} shows on right now is honestly a lot to keep up with', personas: ['recapper', 'stan'] },
  { text: 'streaming platforms are getting way more aggressive about cable deals', personas: ['insider', 'numbers'] },
  { text: 'this season of TV has been {good} more than usual', personas: ['stan', 'recapper'] },
  { text: 'production costs are creeping up industry-wide', personas: ['numbers', 'insider'] },
  { text: 'the discourse online lately has been {bad}', personas: ['meme', 'hatewatcher'] },
  { text: 'showrunners are demanding way more creative control in their deals now', personas: ['insider', 'critic'] },
  { text: 'casting directors say ensemble dramas are back in a big way', personas: ['insider', 'critic'] },
  { text: 'everyone in my feed has an opinion about the fall slate this year', personas: ['meme', 'recapper'] },
];

const reactions: Fragment[] = [
  { text: 'I am fully here for it', personas: ['stan', 'recapper'] },
  { text: "it's exhausting keeping up with all of it", personas: ['hatewatcher', 'critic'] },
  { text: 'not complaining though', personas: ['stan', 'numbers', 'recapper'], canLeadPost: false },
  { text: 'we are so back', personas: ['stan', 'meme'] },
  { text: 'nobody is talking about this enough', personas: ['insider', 'numbers'], canLeadPost: false },
  { text: 'this is exactly what I called months ago', personas: ['insider', 'numbers'], canLeadPost: false },
  { text: "it's giving {bad} honestly", personas: ['hatewatcher', 'meme'] },
  { text: 'someone needed to say that out loud', personas: ['critic', 'hatewatcher'], canLeadPost: false },
  { text: 'I have thoughts and they are all {good}', personas: ['stan', 'recapper'] },
  { text: 'anyway back to my regularly scheduled obsessing', personas: ['stan', 'recapper'], canLeadPost: false },
  { text: 'this industry never stops moving', personas: ['insider', 'numbers'] },
  { text: 'I need everyone to see this', personas: ['stan', 'meme'] },
];

const fillers: Fragment[] = [
  { text: 'this industry never sits still for long', personas: ['*'] },
  { text: 'the algorithm has been feeding me nothing but TV discourse today', personas: ['meme'] },
  { text: 'quiet week overall, that never lasts', personas: ['insider', 'numbers'] },
  { text: 'so much television, so little time honestly', personas: ['recapper', 'stan'] },
  { text: "just here watching everyone's takes roll in", personas: ['meme', 'hatewatcher'] },
  { text: 'the trades are going to have a field day with this one', personas: ['insider', 'critic'] },
];

const signoffs: Fragment[] = [
  { text: '#TVTalk', personas: ['*'] },
  { text: '👀🍿', personas: ['stan', 'hatewatcher', 'meme'] },
  { text: '#IndustryWatch', personas: ['insider', 'numbers'] },
  { text: 'thoughts?', personas: ['critic', 'insider'] },
  { text: '📺', personas: ['recapper', 'stan'] },
  { text: '#NoNotes', personas: ['stan'] },
];

const LIBRARY: FragmentLibrary = {
  opener: openers,
  observation: observations,
  reaction: reactions,
  filler: fillers,
  signoff: signoffs,
};

const BLUEPRINTS: Blueprint[] = [
  ['opener', 'observation', 'reaction', 'signoff'],
  ['reaction', 'observation', 'signoff'],
  ['observation', 'filler'],
  ['filler', 'signoff'],
  ['observation', 'reaction', 'signoff'],
  ['opener', 'observation', 'signoff'],
];

// Purged of noun-phrase-only entries — every option below is a plain
// adjective/adjective phrase so it's safe in "feels {good}" and every other
// predicate slot this token appears in, not just "is {good}".
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

// In-memory fragment-level cooldown — see competitorReaction.ts for why this
// is intentionally not part of persisted GameState.
const COOLDOWN_WINDOW = 15;
let recentFragmentKeys: string[] = [];

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

export function generateIndustryChatterPost(): SocialReaction {
  const persona = randomItem(PERSONA_KEYS);

  const { text, usedKeys } = assemblePost(
    BLUEPRINTS, LIBRARY, persona, {}, undefined, new Set(recentFragmentKeys),
  );
  recentFragmentKeys = [...recentFragmentKeys, ...usedKeys].slice(-COOLDOWN_WINDOW);

  const content = applyPersonaTone(text, TONE[persona]);
  const { username, handle } = PERSONA_HANDLES[persona];

  return {
    username,
    handle,
    content,
    likes: randomBetween(80, 1300),
    reposts: randomBetween(20, 400),
  };
}