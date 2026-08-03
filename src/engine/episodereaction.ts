import { SocialReaction, Genre } from '../types';
import { randomBetween, randomItem } from '../utils/random';

// ─────────────────────────────────────────────────────────────────────────────
// Per-persona episode reaction system.
//
// Replaced the shared fragment-assembly approach (which produced grammatically
// correct but tonally flat posts — every persona reached for the same
// observation/reaction/signoff fragments, so they all read as variations of
// the same sentence regardless of whose handle was attached).
//
// Each persona here has its own template bank, split into rating tiers. No
// cross-persona sharing. The stan account should never produce a sentence that
// could come from the critic account; the meme account should read like a meme
// account, not a recapper with different adjectives. Finale episodes get a
// dedicated pool (55% chance to fire when isFinale=true) so the last episode
// of a season gets noticeably different energy.
//
// Fragment assembly is still used by competitorreaction.ts and
// industrychatter.ts — those are lower-frequency, lower-stakes posts where
// combinatorial variety matters more than voice distinctiveness.
// ─────────────────────────────────────────────────────────────────────────────

type T = (show: string, ep: number, genre: Genre, hook: string, complaint: string) => string;

interface PersonaConfig {
  username: string;
  handle: string;
  high: T[];
  mid: T[];
  low: T[];
  finale: T[];
  likes: { high: [number, number]; mid: [number, number]; low: [number, number] };
  reposts: { high: [number, number]; mid: [number, number]; low: [number, number] };
}

const GENRE_FLAVOR: Record<Genre, { hook: string; complaint: string }> = {
  drama:           { hook: 'that ending',                          complaint: 'the pacing in the back half' },
  comedy:          { hook: 'that cold open',                       complaint: 'the jokes not landing lately' },
  'sci-fi':        { hook: 'that lore drop',                       complaint: 'the worldbuilding getting away from itself' },
  procedural:      { hook: 'that twist',                           complaint: "this week's case feeling recycled" },
  reality:         { hook: 'that elimination',                     complaint: 'the edit being so obviously rigged' },
  'limited-series':{ hook: 'that reveal',                         complaint: 'how slow this is moving given the episode count' },
};

const PERSONAS: Record<string, PersonaConfig> = {

  // ── unhinged tv stan ───────────────────────────────────────────────────────
  stan: {
    username: 'unhinged tv stan',
    handle: '@watchingrn',
    high: [
      (s, ep)           => `ok so I JUST finished ${s} episode ${ep} and I need a minute. I need SEVERAL minutes.`,
      (s, ep)           => `${s} episode ${ep} is GOATED and I will die on this hill. not changing my mind.`,
      (s, ep)           => `not me rewatching ${s} ep ${ep} immediately after it ends. I have a problem and I do not care`,
      (s, ep, _, hook)  => `${hook} in ${s} episode ${ep} has me in my feelings. I cannot explain this to anyone in my life`,
      (s, ep)           => `${s} episode ${ep} > everything else on TV right now and I said what I said 👀`,
      (s, ep)           => `whoever wrote ${s} episode ${ep} I owe you everything`,
    ],
    mid: [
      (s, ep) => `${s} episode ${ep} was fine. the season started stronger but I'm still here aren't I`,
      (s, ep) => `idk ${s} ep ${ep} didn't hit the same for me this week? hoping it picks back up`,
      (s, ep) => `${s} episode ${ep} is okay. just okay. I wanted more and I got okay. moving on.`,
    ],
    low: [
      (s, ep)                => `okay ${s} episode ${ep} was rough and I love this show too much to pretend otherwise`,
      (s, ep)                => `oof ${s} ep ${ep}. that was not it. that was very much not it.`,
      (s, ep, _, __, c)      => `${c} on ${s} and episode ${ep} really showed it. ouch.`,
      (s, ep)                => `why is ${s} doing this to me. episode ${ep} hurt in a bad way`,
    ],
    finale: [
      (s) => `${s} season finale and I am DESTROYED. someone hold me.`,
      (s) => `I cannot believe ${s} ended the season like that. I have so many questions and zero chill`,
    ],
    likes:   { high: [200, 2000], mid: [80, 900],  low: [50, 600]  },
    reposts: { high: [80, 700],   mid: [30, 300],  low: [20, 200]  },
  },

  // ── Critics Desk ───────────────────────────────────────────────────────────
  critic: {
    username: 'Critics Desk',
    handle: '@criticsdesk',
    high: [
      (s, ep)          => `${s} episode ${ep} is a textbook example of what this genre can do when it's firing. Remarkable work.`,
      (s, ep, _, hook) => `${hook} in ${s} episode ${ep} is the kind of narrative pivot this genre rarely gets right. They got it right.`,
      (s, ep)          => `The writing on ${s} has been building toward episode ${ep} all season. That landing paid off.`,
      (s, ep)          => `${s} episode ${ep} is doing something genuinely difficult and making it look effortless.`,
      (s, ep)          => `Strong episode. ${s} episode ${ep} earns every minute of its runtime. Take notes.`,
    ],
    mid: [
      (s, ep) => `${s} episode ${ep} is competent but uninspired. The bones are there; the execution keeps wavering.`,
      (s, ep) => `Mixed on ${s} episode ${ep}. The premise remains strong. The execution keeps falling short of it.`,
      (s, ep) => `${s} episode ${ep} passes. Doesn't distinguish itself. That may be enough for some audiences.`,
    ],
    low: [
      (s, ep)           => `${s} episode ${ep} is a structural mess. I've been charitable about this season but this stretched my goodwill.`,
      (s, ep, _, __, c) => `${c} has been a problem since episode one of ${s}. Episode ${ep} makes it impossible to ignore.`,
      (s, ep)           => `${s} has written itself into a corner. Episode ${ep} shows exactly what that looks like. Frustrating viewing.`,
    ],
    finale: [
      (s) => `${s} season finale: the end earned what the season promised. The season as a whole holds up.`,
      (s) => `${s} wraps here. The question now is whether the creative team can sustain this. Strong evidence that they can.`,
    ],
    likes:   { high: [100, 900],  mid: [60, 500],  low: [40, 350]  },
    reposts: { high: [30, 250],   mid: [15, 120],  low: [10, 80]   },
  },

  // ── The Wrap Line ───────────────────────────────────────────────────────────
  insider: {
    username: 'The Wrap Line',
    handle: '@thewrapline',
    high: [
      (s, ep) => `Industry talk around ${s} episode ${ep}: unanimously positive. Whatever's happening in that writers room is working.`,
      (s, ep) => `Sources telling me episode ${ep} of ${s} is the one that seals a renewal conversation. Tracking this.`,
      (s, ep) => `The buzz coming out of ${s} episode ${ep} is real. This is the kind of episode that moves things.`,
      (s, ep) => `Internal response to ${s} episode ${ep} is strong. Expect this to matter come negotiation season.`,
    ],
    mid: [
      (s, ep) => `${s} episode ${ep} is holding steady. Not a breakout, not a stumble. Networks are watching.`,
      (s, ep) => `Cautious read on ${s} episode ${ep} from people inside the building. Strong in places, soft in others.`,
      (s, ep) => `The conversation around ${s} shifted a little after episode ${ep}. Not dramatically. Just watching it.`,
    ],
    low: [
      (s, ep) => `Word inside is that ${s} episode ${ep} is where network patience starts running thin. To be continued.`,
      (s, ep) => `Hard week for ${s} — episode ${ep} underperformed the expectations the early run set. Conversations are happening.`,
      (s, ep) => `Not what the room was hoping for with ${s} episode ${ep}. This show needs to course-correct.`,
    ],
    finale: [
      (s) => `${s} wrapped its season and the renewal question is now the dominant industry conversation. Interesting timing.`,
      (s) => `Season finale of ${s} tracked well. Sources say the creative team already has a room for next season. Watch this space.`,
    ],
    likes:   { high: [150, 1200], mid: [70, 600],  low: [40, 400]  },
    reposts: { high: [50, 400],   mid: [20, 180],  low: [10, 120]  },
  },

  // ── PrimeTimeFeed ───────────────────────────────────────────────────────────
  numbers: {
    username: 'PrimeTimeFeed',
    handle: '@primetimefeed',
    high: [
      (s, ep) => `${s} episode ${ep}: strong numbers across the board. The audience for this show is locked in.`,
      (s, ep) => `Episode ${ep} of ${s} tracking well. This is a show that found its audience and held it.`,
      (s, ep) => `${s} is the kind of show that builds quietly. Episode ${ep} continues that trend.`,
      (s, ep) => `Viewership for ${s} episode ${ep} looks strong. Early momentum is holding.`,
    ],
    mid: [
      (s, ep) => `${s} episode ${ep}: numbers are fine. Nothing alarming, nothing exceptional.`,
      (s, ep) => `Steady for ${s} this week — ep ${ep} tracking about where you'd expect mid-season.`,
      (s, ep) => `${s} episode ${ep}: not losing viewers. That's something, especially at this point in the run.`,
    ],
    low: [
      (s, ep) => `${s} episode ${ep} posted soft numbers. Not freefall but the trajectory matters here.`,
      (s, ep) => `Rough week in the ratings for ${s}. Episode ${ep} underperformed the window.`,
      (s, ep) => `The numbers on ${s} episode ${ep} are a yellow flag. Not red yet. Yet.`,
    ],
    finale: [
      (s) => `${s} season finale viewership will be the number everyone watches this week. Early indications: decent.`,
      (s) => `${s} wraps season here. The cumulative numbers tell a clear story — the audience showed up.`,
    ],
    likes:   { high: [80, 700],   mid: [40, 350],  low: [20, 200]  },
    reposts: { high: [20, 220],   mid: [10, 100],  low: [5, 60]    },
  },

  // ── tv memes daily ─────────────────────────────────────────────────────────
  meme: {
    username: 'tv memes daily',
    handle: '@tvmemesdaily',
    high: [
      (s, ep)          => `${s} episode ${ep} has me in SHAMBLES. someone call someone.`,
      (s, ep, _, hook) => `me trying to explain ${hook} in ${s} episode ${ep} to someone who hasn't seen it: [visible confusion]`,
      (s, ep)          => `nobody: / me at midnight after ${s} episode ${ep}: *immediately texts everyone I know*`,
      (s, ep, _, hook) => `${s} episode ${ep} really said "let's destroy them today" (${hook}) and then did exactly that`,
      (s, ep)          => `the ${s} episode ${ep} effect: me. at home. alone. in a pile of feelings.`,
    ],
    mid: [
      (s, ep) => `${s} episode ${ep} was okay. I feel things. Mixed things. [shrug]`,
      (s, ep) => `me watching ${s} ep ${ep} knowing it could've been better but unable to look away anyway`,
      (s, ep) => `the ${s} writers room: *gestures broadly at episode ${ep}*`,
    ],
    low: [
      (s, ep) => `${s} episode ${ep}: not it. I'm done being polite about it.`,
      (s, ep) => `me trying to defend ${s} after episode ${ep}: [sweating man doing math meme]`,
      (s, ep) => `[${s} episode ${ep}] the writers: "yeah that's fine." / the audience: [person slowly leaving]`,
    ],
    finale: [
      (s) => `the season finale of ${s} and I am NOT okay. see you all in therapy.`,
      (s) => `${s} really ended the season like THAT and just expected us to go on with our lives`,
    ],
    likes:   { high: [150, 1800], mid: [70, 800],  low: [40, 500]  },
    reposts: { high: [100, 900],  mid: [40, 400],  low: [20, 250]  },
  },

  // ── StreamNerve ────────────────────────────────────────────────────────────
  hatewatcher: {
    username: 'StreamNerve',
    handle: '@streamnerve',
    high: [
      (s, ep) => `fine. FINE. ${s} episode ${ep} was actually good and I refuse to be happy about it.`,
      (s, ep) => `I've been dragging ${s} for weeks and episode ${ep} is making me eat that. I hate this show. (I love this show.)`,
      (s, ep) => `ok ${s} episode ${ep} earned it. I'm not going to be weird about this. It earned it.`,
      (s, ep) => `I started watching ${s} to hate-watch it and episode ${ep} just made me a fan. NOT what I wanted. 👀🍿`,
    ],
    mid: [
      (s, ep) => `${s} episode ${ep}: mid. consistently, committedly mid. at least it's reliable.`,
      (s, ep) => `${s} ep ${ep} exists. it happened. I watched it. Moving on.`,
      (s, ep) => `not enough to get excited about, not bad enough to be interesting. ${s} episode ${ep} is just... there.`,
    ],
    low: [
      (s, ep)           => `${s} episode ${ep} is exactly as bad as I said it would be. I keep watching. I am the problem.`,
      (s, ep)           => `at some point ${s} has to explain what it's doing. Episode ${ep} is not that explanation.`,
      (s, ep, _, __, c) => `${c} in ${s} and episode ${ep} is where I start to check out. Still here though. Hate myself.`,
      (s, ep)           => `${s} episode ${ep}: a show happening. to viewers. against their will. (I chose this.) 👀🍿`,
    ],
    finale: [
      (s) => `${s} season finale and I feel nothing. I watched every episode. I feel nothing. That's the problem.`,
      (s) => `fine. ${s} stuck the landing. I watched it to hate it and it made me care. Logging off for real. 👀🍿`,
    ],
    likes:   { high: [200, 1500], mid: [80, 700],  low: [50, 450]  },
    reposts: { high: [70, 550],   mid: [25, 250],  low: [15, 160]  },
  },

  // ── TV Obsessed ────────────────────────────────────────────────────────────
  recapper: {
    username: 'TV Obsessed',
    handle: '@tvobsessed',
    high: [
      (s, ep, _, hook) => `Just finished ${s} episode ${ep} and I can't stop thinking about ${hook}. Incredible hour. Recap coming. 📺`,
      (s, ep)          => `${s} episode ${ep}: I'll be writing about this one for a while. Some moments just land differently.`,
      (s, ep)          => `Full rewatch of ${s} episode ${ep} done. Caught new layers on every pass. This show rewards attention. 📺`,
      (s, ep)          => `This is the episode they'll show in screenwriting classes. ${s} episode ${ep} is that good.`,
      (s, ep)          => `${s} episode ${ep} is exactly why I cover this industry. Beautiful work.`,
    ],
    mid: [
      (s, ep) => `${s} episode ${ep} is a decent hour. Not transcendent, but solidly crafted. Recap up tonight.`,
      (s, ep) => `Solid ${s} episode ${ep}. Not the best of the season but far from the worst. Worth your time.`,
      (s, ep) => `${s} episode ${ep}: good in a show that can be great. The gap felt smaller this week, which is something. 📺`,
    ],
    low: [
      (s, ep) => `${s} episode ${ep} is where the season's structural problems really show up. Hard to ignore now. Honest recap incoming.`,
      (s, ep) => `Recapping ${s} episode ${ep} was a bit of a slog if I'm honest. The show is better than this.`,
      (s, ep) => `${s} episode ${ep}: the season has been uneven and this is an uneven episode. Said with love. 📺`,
    ],
    finale: [
      (s) => `${s} season finale: the end earned what the season promised. Full season review going up this week. 📺`,
      (s) => `Season finale of ${s} done. Thinking about the full run now. The recap is going to be long.`,
    ],
    likes:   { high: [100, 800],  mid: [50, 400],  low: [30, 250]  },
    reposts: { high: [30, 220],   mid: [15, 100],  low: [8, 65]    },
  },

  // ── ride or die ────────────────────────────────────────────────────────────
  parasocial: {
    username: 'ride or die',
    handle: '@notokaythough',
    high: [
      (s, ep)          => `${s} episode ${ep}. I'm not okay. I need everyone in this cast to know they ruined my life (affectionate)`,
      (s, ep)          => `I've watched ${s} episode ${ep} three times and it gets better every time. I cannot be stopped.`,
      (s, ep)          => `${s} episode ${ep} is exactly why I tell everyone to watch this show. THIS. RIGHT HERE. 📺`,
      (s, ep)          => `crying and rewinding at the same time at ${s} episode ${ep}. it's that kind of show.`,
      (s, ep, _, hook) => `the way I gasped at ${hook} in ${s} episode ${ep}. I am a completely normal person.`,
    ],
    mid: [
      (s, ep) => `${s} episode ${ep} was good! just. good. I wanted great. I got good. It's fine. I'm fine.`,
      (s, ep) => `not the best ${s} episode (ep ${ep}) but I'm still here aren't I. that's love.`,
      (s, ep) => `I love ${s} too much to pretend episode ${ep} was the best it's ever been. it wasn't. still here.`,
    ],
    low: [
      (s, ep) => `${s} episode ${ep} broke my heart and not in a good way. I need a minute with this.`,
      (s, ep) => `the writers really looked at ${s} episode ${ep} and said "yeah that's fine." it is not fine.`,
      (s, ep) => `I have been defending ${s} since day one and episode ${ep} is testing me. TESTING ME.`,
    ],
    finale: [
      (s) => `${s} season finale and I am a WRECK. I love this cast too much. This is a real problem.`,
      (s) => `the finale of ${s} just happened and I don't know how to go back to regular life. how do people do that.`,
    ],
    likes:   { high: [80, 600],   mid: [30, 280],  low: [15, 180]  },
    reposts: { high: [20, 200],   mid: [8, 90],    low: [4, 55]    },
  },
};

const PERSONA_KEYS = Object.keys(PERSONAS);

// ─────────────────────────────────────────────────────────────────────────────
// PER-PERSONA COOLDOWN
// In-memory only — resets on app restart. Tracks the last N "tier:index" keys
// used per persona so the same line doesn't repeat twice in a short session
// window. Per-persona rather than global because each persona's pool is small
// (~4-6 templates per tier), and a global cooldown would silently empty pools
// that only have 2-3 persona-compatible entries, causing silent skips.
// ─────────────────────────────────────────────────────────────────────────────

const COOLDOWN_SIZE = 5;
const personaCooldowns = new Map<string, string[]>();

function pickTemplate(pool: T[], tierKey: string, personaKey: string): T | null {
  if (pool.length === 0) return null;
  const recent = personaCooldowns.get(personaKey) ?? [];
  const recentSet = new Set(recent);
  const indexed = pool.map((t, i) => ({ t, key: `${tierKey}:${i}` }));
  const fresh = indexed.filter(x => !recentSet.has(x.key));
  const usable = fresh.length > 0 ? fresh : indexed;
  const picked = usable[Math.floor(Math.random() * usable.length)];
  personaCooldowns.set(personaKey, [...recent, picked.key].slice(-COOLDOWN_SIZE));
  return picked.t;
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

export function generateEpisodeReactionBatch(
  showTitle: string,
  episodeNumber: number,
  genre: Genre,
  rating: number,
  isFinale = false,
): SocialReaction[] {
  const tier: 'high' | 'mid' | 'low' = rating >= 7.5 ? 'high' : rating >= 5.0 ? 'mid' : 'low';
  const flavor = GENRE_FLAVOR[genre];
  const count = randomBetween(3, Math.min(5, PERSONA_KEYS.length));
  const usedPersonas = new Set<string>();
  const results: SocialReaction[] = [];

  for (let i = 0; i < count; i++) {
    const available = PERSONA_KEYS.filter(k => !usedPersonas.has(k));
    if (available.length === 0) break;
    const personaKey = randomItem(available);
    usedPersonas.add(personaKey);

    const persona = PERSONAS[personaKey];

    // Finale episodes: 55% chance to pull from the persona's finale pool.
    const useFinale = isFinale && persona.finale.length > 0 && Math.random() < 0.55;
    const pool = useFinale ? persona.finale : persona[tier];
    const tierKey = useFinale ? 'finale' : tier;

    const template = pickTemplate(pool, tierKey, personaKey);
    if (!template) continue;

    const content = template(showTitle, episodeNumber, genre, flavor.hook, flavor.complaint);
    const lr = persona.likes[tier];
    const rr = persona.reposts[tier];

    results.push({
      username: persona.username,
      handle: persona.handle,
      content,
      likes: randomBetween(lr[0], lr[1]),
      reposts: randomBetween(rr[0], rr[1]),
    });
  }

  return results;
}
