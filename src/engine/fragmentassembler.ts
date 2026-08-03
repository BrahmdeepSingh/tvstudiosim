// ─────────────────────────────────────────────────────────────────────────────
// FRAGMENT ASSEMBLY ENGINE
//
// Generic, reusable across any high-volume/low-specificity post category.
// Keeps two things separate on purpose:
//   1. STRUCTURE  — which slots appear, and in what order (the "blueprint").
//   2. CONTENT    — what fills each slot (the fragment libraries, defined
//                    per-category in their own files, e.g. industryChatter.ts).
//
// The part Gemini's sketch left thin was the join layer — concatenating
// fragments without a formatting pass reads as "three tweets stapled
// together." The fix here: every content fragment (opener/observation/
// reaction/filler) is treated as its own complete micro-sentence. The
// assembler forces a capital letter at the start of each one it opens and a
// terminal punctuation mark at the end before the next one begins. That's
// deliberately blunter than trying to grammatically thread fragments into one
// flowing sentence — but it's robust regardless of how sloppily a given
// fragment is authored, and short declarative bursts read naturally as social
// posts anyway ("It's mid. Ratings are flat. Moving on."). Signoffs (hashtags/
// emoji) attach loosely after, no forced punctuation.
// ─────────────────────────────────────────────────────────────────────────────

export type FragmentSlot = 'opener' | 'observation' | 'reaction' | 'filler' | 'signoff';

export interface Fragment {
  text: string;             // may contain {TOKEN} interpolation vars and {good}/{bad}-style tone tokens
  personas: string[];       // persona keys this fragment is voiced for, or ['*'] for any
  followsWith?: FragmentSlot[]; // for connector fragments (openers): which slot types this
                                  // connector is grammatically allowed to merge into. Omit for
                                  // "works before anything" (short interjections like "ok but").
                                  // Needed because some connectors demand a specific kind of
                                  // continuation — "can we talk about how" requires a factual
                                  // statement (observation) to follow; merged with a short
                                  // reaction blurb instead it reads as "can we talk about how
                                  // not complaining though," which is grammatical nonsense even
                                  // though the punctuation is fine. Caught via testing, not
                                  // something the punctuation layer alone could catch.
  intensityRange?: [number, number]; // [min, max], inclusive, 0-1. Restricts a fragment to only
                                  // be eligible when the category's real intensity score falls in
                                  // this band — e.g. "why is this even still airing" only makes
                                  // sense for a genuinely low-rated show, not a 6.5. Omit for
                                  // fragments that work at any intensity.
  canLeadPost?: boolean;         // Defaults to true. Set false for fragments that are discourse
                                  // markers assuming something was already said — "not complaining
                                  // though" implies a prior statement it's downplaying, so it reads
                                  // backwards as the very first clause of a post. Only relevant for
                                  // non-opener slots (opener, when present, always leads).
}

export type Blueprint = FragmentSlot[];

export type FragmentLibrary = Record<FragmentSlot, Fragment[]>;

// ─────────────────────────────────────────────────────────────────────────────
// JOIN / FORMATTING LAYER
// ─────────────────────────────────────────────────────────────────────────────

function interpolate(text: string, tokens: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(tokens)) {
    result = result.split(`{${key}}`).join(value);
  }
  return result;
}

function capitalizeFirst(text: string): string {
  if (text.length === 0) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function ensureTerminalPunctuation(text: string): string {
  return /[.!?…]$/.test(text.trim()) ? text : `${text}.`;
}

function pickFragment(
  pool: Fragment[],
  persona: string,
  slotName: FragmentSlot,
  mustFollowWith?: FragmentSlot,
  intensity?: number,
  isLeadingSlot?: boolean,
  recentKeys?: Set<string>,
): { fragment: Fragment; key: string } | null {
  const eligible = pool
    .map((f, i) => ({ f, key: `${slotName}:${i}` }))
    .filter(({ f }) =>
      (f.personas.includes('*') || f.personas.includes(persona)) &&
      (!mustFollowWith || !f.followsWith || f.followsWith.includes(mustFollowWith)) &&
      (intensity === undefined || !f.intensityRange || (intensity >= f.intensityRange[0] && intensity <= f.intensityRange[1])) &&
      (!isLeadingSlot || f.canLeadPost !== false),
    );
  if (eligible.length === 0) return null;

  // Prefer fragments not used recently (per the caller's rolling window);
  // fall back to the full eligible set if the cooldown would empty the pool
  // (e.g. a persona genuinely only has 2 eligible openers — better to repeat
  // one than silently drop the slot).
  const fresh = recentKeys ? eligible.filter(({ key }) => !recentKeys.has(key)) : eligible;
  const usable = fresh.length > 0 ? fresh : eligible;
  const picked = usable[Math.floor(Math.random() * usable.length)];
  return { fragment: picked.f, key: picked.key };
}

/**
 * Groups content slots into "clauses" for punctuation purposes. An 'opener'
 * is a connector phrase ("ok but", "can we talk about how") — it never ends
 * its own sentence, it merges into whatever slot comes right after it in the
 * filtered pick list, forming one clause with one terminal punctuation mark
 * at the end of the pair rather than one after each half. Every other slot
 * stands as its own clause. If an opener ends up with nothing to merge into
 * (its partner slot had no persona-compatible fragment), it's dropped rather
 * than emitted as an orphaned connector like "Genuinely." alone.
 */
function groupIntoClauses(slots: FragmentSlot[]): FragmentSlot[][] {
  const clauses: FragmentSlot[][] = [];
  let i = 0;
  while (i < slots.length) {
    if (slots[i] === 'opener' && i + 1 < slots.length) {
      clauses.push([slots[i], slots[i + 1]]);
      i += 2;
    } else if (slots[i] === 'opener') {
      i += 1; // orphaned opener, nothing to merge into — drop it
    } else {
      clauses.push([slots[i]]);
      i += 1;
    }
  }
  return clauses;
}

/**
 * Assembles one post from a randomly chosen structural blueprint + a
 * persona-filtered fragment library. Content slots (opener/observation/
 * reaction/filler) are grouped into clauses (openers merge forward into the
 * next slot, filtered by grammatical compatibility via `followsWith`;
 * everything else stands alone); each clause becomes one capitalized,
 * terminally-punctuated unit. Signoff slots attach loosely at the end with
 * no forced punctuation. Slots with no persona/intensity-compatible fragment
 * available are silently skipped rather than breaking assembly.
 *
 * @param intensity  Optional 0-1 score used to filter fragments with an
 *   `intensityRange` (e.g. only surface "why is this even still airing" for
 *   a genuinely low-rated show). Pass the real normalized rating when one
 *   exists — that's the whole point of this param existing separately from
 *   the tone dictionary's own intensity argument in applyPersonaTone.
 * @param recentKeys  Optional set of "slot:index" keys used recently (across
 *   however many prior calls the caller wants to track — see each category
 *   file's own rolling-window constant). Every eligible fragment pool
 *   prefers picks outside this set, falling back to the full pool if the
 *   cooldown would leave nothing eligible. This is what actually stops "ok
 *   but" / "genuinely," from carrying 3+ personas' worth of openers every
 *   single post — found necessary via real gameplay testing, not something
 *   pool size alone fixes when a persona only has 2-3 eligible fragments.
 */
export function assemblePost(
  blueprints: Blueprint[],
  library: FragmentLibrary,
  persona: string,
  tokens: Record<string, string> = {},
  intensity?: number,
  recentKeys?: Set<string>,
): { text: string; usedKeys: string[] } {
  const blueprint = blueprints[Math.floor(Math.random() * blueprints.length)];

  // Precompute, for each 'opener' slot, which content slot type directly
  // follows it in the blueprint structure — used to filter out connectors
  // that don't grammatically fit that follow-up type.
  const contentBlueprint = blueprint.filter(s => s !== 'signoff');

  const picks: Partial<Record<FragmentSlot, Fragment>> = {};
  const usedKeys: string[] = [];

  for (let i = 0; i < blueprint.length; i++) {
    const slot = blueprint[i];
    if (slot === 'opener') {
      const idxInContent = contentBlueprint.indexOf('opener');
      const nextSlot = contentBlueprint[idxInContent + 1]; // may be undefined
      const result = pickFragment(library.opener ?? [], persona, 'opener', nextSlot, intensity, undefined, recentKeys);
      if (result) {
        picks.opener = result.fragment;
        usedKeys.push(result.key);
      }
    } else {
      // A non-opener slot only "leads" the post if it's the very first entry
      // in the content sequence (i.e. no opener precedes it in this blueprint).
      const isLeadingSlot = contentBlueprint.indexOf(slot) === 0;
      const result = pickFragment(library[slot] ?? [], persona, slot, undefined, intensity, isLeadingSlot, recentKeys);
      if (result) {
        picks[slot] = result.fragment;
        usedKeys.push(result.key);
      }
    }
  }

  const contentSlots = blueprint.filter(s => s !== 'signoff' && picks[s]);
  const signoffSlots = blueprint.filter(s => s === 'signoff' && picks[s]);
  const clauses = groupIntoClauses(contentSlots);

  const clauseTexts = clauses.map(clauseSlots => {
    const rawText = clauseSlots.map(slot => interpolate(picks[slot]!.text, tokens)).join(' ');
    return ensureTerminalPunctuation(capitalizeFirst(rawText));
  });

  let result = clauseTexts.join(' ');

  for (const slot of signoffSlots) {
    result += ` ${interpolate(picks[slot]!.text, tokens)}`;
  }

  return { text: result, usedKeys };
}

// ─────────────────────────────────────────────────────────────────────────────
// PERSONA TONE / SYNONYM DICTIONARY
//
// Runs as a post-process pass over an already-assembled (or even hand-written
// bespoke) sentence containing {good}/{bad}-style tone tokens. Synonym lists
// are ordered mild → extreme; passing an `intensity` (0–1) picks proportionally
// further into the list, so this can scale with an exact score rather than
// just randomly sampling the whole list regardless of how good/bad something
// actually is. If no intensity is given, one is rolled randomly.
// ─────────────────────────────────────────────────────────────────────────────

export interface PersonaToneProfile {
  capsProbability: number;               // chance to shout the whole post in caps
  synonyms: Record<string, string[]>;    // token -> options, ordered mild → extreme
}

export function applyPersonaTone(
  text: string,
  profile: PersonaToneProfile | undefined,
  intensity: number = Math.random(),
): string {
  if (!profile) return text;
  let result = text;

  for (const [token, options] of Object.entries(profile.synonyms)) {
    if (options.length === 0) continue;
    // Replace one occurrence at a time (String.replace with a string arg only
    // touches the first match) so that if a post happens to use the same
    // token twice, each instance rolls its own word instead of both getting
    // forced to whatever the single text-wide intensity picked. Small jitter
    // around the base intensity keeps repeats from clustering on the same
    // word purely by chance while still respecting the overall tone target.
    while (result.includes(token)) {
      const jittered = Math.min(1, Math.max(0, intensity + (Math.random() - 0.5) * 0.3));
      const idx = Math.min(options.length - 1, Math.floor(jittered * options.length));
      result = result.replace(token, options[idx]);
    }
  }

  if (Math.random() < profile.capsProbability) {
    result = result.toUpperCase();
  }

  return result;
}