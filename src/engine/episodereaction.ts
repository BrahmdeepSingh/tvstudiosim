import { SocialReaction, Genre } from '../types';
import { randomBetween, randomItem } from '../utils/random';

// ─────────────────────────────────────────────────────────────────────────────
// Per-persona episode reaction system — v2.
//
// v1 split the shared fragment library into per-persona pools, which fixed
// voice distinctiveness. v2 fixes the remaining problems found in testing:
//
// 1. The mid tier (5.0–7.4) was too wide. A 7.3 episode and a 5.2 episode
//    used the same template pool. Split into midHigh (6.5–7.4) and midLow
//    (5.0–6.4) with meaningfully different emotional registers.
//
// 2. Episode 1 premiere reactions referenced prior episodes that don't exist
//    yet ("didn't hit the same", "execution keeps falling short of it").
//    A dedicated 'premiere' tier fires only on episodeNumber === 1, with
//    first-impression language only.
//
// 3. Finale templates fired at 55% probability regardless of rating, so a
//    6.3 finale got "ended the season like THAT" energy alongside a 9.1
//    finale. Finales are now a deterministic tier with three rating bands:
//    finaleHigh (≥ 7.5), finaleMid (5.5–7.4), finaleLow (< 5.5).
// ─────────────────────────────────────────────────────────────────────────────

type T = (show: string, ep: number, genre: Genre, hook: string, complaint: string) => string;

export type Tier =
  | 'premiere'
  | 'high'
  | 'midHigh'
  | 'midLow'
  | 'low'
  | 'finaleHigh'
  | 'finaleMid'
  | 'finaleLow';

function getTier(rating: number, isFinale: boolean, isPremiereEp: boolean): Tier {
  if (isPremiereEp) return 'premiere';
  if (isFinale) {
    return rating >= 7.5 ? 'finaleHigh' : rating >= 5.5 ? 'finaleMid' : 'finaleLow';
  }
  return rating >= 7.5 ? 'high' : rating >= 6.5 ? 'midHigh' : rating >= 5.0 ? 'midLow' : 'low';
}

// Maps a tier to a likes/reposts bucket for range lookups.
type RangeKey = 'high' | 'midHigh' | 'midLow' | 'low';
function rangeKeyFor(tier: Tier): RangeKey {
  if (tier === 'high' || tier === 'finaleHigh') return 'high';
  if (tier === 'premiere' || tier === 'midHigh' || tier === 'finaleMid') return 'midHigh';
  if (tier === 'midLow' || tier === 'finaleLow') return 'midLow';
  return 'low';
}

interface PersonaConfig {
  username: string;
  handle: string;
  premiere: T[];
  high: T[];
  midHigh: T[];
  midLow: T[];
  low: T[];
  finaleHigh: T[];
  finaleMid: T[];
  finaleLow: T[];
  likes: Record<RangeKey, [number, number]>;
  reposts: Record<RangeKey, [number, number]>;
}

const GENRE_FLAVOR: Record<Genre, { hook: string; complaint: string }> = {
  drama:           { hook: 'that ending',                      complaint: 'the pacing in the back half' },
  comedy:          { hook: 'that cold open',                   complaint: 'the jokes not landing lately' },
  'sci-fi':        { hook: 'that lore drop',                   complaint: 'the worldbuilding getting away from itself' },
  procedural:      { hook: 'that twist',                       complaint: "this week's case feeling recycled" },
  reality:         { hook: 'that elimination',                 complaint: 'the edit being so obviously rigged' },
  'limited-series':{ hook: 'that reveal',                     complaint: 'how slow this is moving given the episode count' },
};

const PERSONAS: Record<string, PersonaConfig> = {

  // ── unhinged tv stan ───────────────────────────────────────────────────────
  stan: {
    username: 'unhinged tv stan',
    handle: '@watchingrn',
    premiere: [
      (s) => `okay so ${s} just dropped episode 1 and I have thoughts. mostly excited ones. mostly.`,
      (s) => `first episode of ${s} is here and it did not disappoint. I need more immediately.`,
      (s) => `${s} episode 1 is giving. not everything yet. but giving. I am in.`,
    ],
    high: [
      (s, ep)          => `ok so I JUST finished ${s} episode ${ep} and I need a minute. I need SEVERAL minutes.`,
      (s, ep)          => `${s} episode ${ep} is GOATED and I will die on this hill. not changing my mind.`,
      (s, ep)          => `not me rewatching ${s} ep ${ep} immediately after it ends. I have a problem and I do not care`,
      (s, ep, _, hook) => `${hook} in ${s} episode ${ep} has me in my feelings. I cannot explain this to anyone in my life`,
      (s, ep)          => `${s} episode ${ep} > everything else on TV right now and I said what I said 👀`,
      (s, ep)          => `whoever wrote ${s} episode ${ep} I owe you everything`,
    ],
    midHigh: [
      (s, ep) => `${s} episode ${ep} was fine. doing its job. I'll keep showing up.`,
      (s, ep) => `not the episode I needed from ${s} but ep ${ep} kept me here. that's enough for now.`,
      (s, ep) => `${s} ep ${ep} was solid. not a season highlight but solid.`,
      (s, ep) => `okay ${s} episode ${ep} wasn't amazing but I'm not mad about it. decent hour.`,
    ],
    midLow: [
      (s, ep) => `${s} episode ${ep} was fine. the season started stronger but I'm still here aren't I`,
      (s, ep) => `idk ${s} ep ${ep} didn't hit the same for me this week? hoping it picks back up`,
      (s, ep) => `${s} ep ${ep} felt a bit slow. hoping this is a bridge episode and not a trend.`,
      (s, ep) => `${s} ep ${ep} was okay. just okay. I wanted more and I got okay. moving on.`,
    ],
    low: [
      (s, ep)           => `okay ${s} episode ${ep} was rough and I love this show too much to pretend otherwise`,
      (s, ep)           => `oof ${s} ep ${ep}. that was not it. that was very much not it.`,
      (s, ep, _, __, c) => `${c} on ${s} and episode ${ep} really showed it. ouch.`,
      (s, ep)           => `why is ${s} doing this to me. episode ${ep} hurt in a bad way`,
    ],
    finaleHigh: [
      (s) => `${s} season finale and I am DESTROYED. someone hold me.`,
      (s) => `I cannot believe ${s} ended the season like that. I have so many questions and zero chill`,
    ],
    finaleMid: [
      (s) => `${s} season finale. not the ending I imagined but I respect what they tried to do. still here.`,
      (s) => `mixed feelings on the ${s} finale honestly. good season, middling ending. I'll be back though.`,
    ],
    finaleLow: [
      (s) => `${s} finale and I'm like... okay? that's it? I wanted more from this ending.`,
      (s) => `the ${s} finale was fine but this season deserved a better finish. still love this show though.`,
    ],
    likes:   { high: [200, 2000], midHigh: [100, 1000], midLow: [60, 600], low: [40, 400] },
    reposts: { high: [80, 700],   midHigh: [35, 300],   midLow: [20, 180], low: [15, 120] },
  },

  // ── Critics Desk ───────────────────────────────────────────────────────────
  critic: {
    username: 'Critics Desk',
    handle: '@criticsdesk',
    premiere: [
      (s) => `First episode of ${s}: a promising setup. The real test is whether the execution holds.`,
      (s) => `${s} episode 1 establishes its premise efficiently. Cautiously intrigued.`,
      (s) => `Debut episode of ${s} makes a strong opening argument. Now let's see if it can sustain it.`,
    ],
    high: [
      (s, ep)          => `${s} episode ${ep} is a textbook example of what this genre can do when it's firing. Remarkable work.`,
      (s, ep, _, hook) => `${hook} in ${s} episode ${ep} is the kind of narrative pivot this genre rarely gets right. They got it right.`,
      (s, ep)          => `The writing on ${s} has been building toward episode ${ep} all season. That landing paid off.`,
      (s, ep)          => `${s} episode ${ep} is doing something genuinely difficult and making it look effortless.`,
      (s, ep)          => `Strong episode. ${s} episode ${ep} earns every minute of its runtime. Take notes.`,
    ],
    midHigh: [
      (s, ep) => `${s} episode ${ep} is doing what it needs to do. Competent, controlled, functional.`,
      (s, ep) => `Solid ${s} episode ${ep}. This is a show that knows what it is. Reliable if not revelatory.`,
      (s, ep) => `${s} episode ${ep} is well-crafted. Doesn't swing for anything new, but what it attempts it lands.`,
      (s, ep) => `Episode ${ep} of ${s} is professionally assembled. No complaints. No particular excitement either.`,
    ],
    midLow: [
      (s, ep) => `Mixed on ${s} episode ${ep}. The premise remains strong. The execution keeps falling short of it.`,
      (s, ep) => `${s} episode ${ep} is competent but uninspired. The bones are there; the execution keeps wavering.`,
      (s, ep) => `${s} episode ${ep} passes. Doesn't distinguish itself. That may be enough for some audiences.`,
      (s, ep) => `${s} is spinning its wheels in episode ${ep}. A show unsure of what it wants to be this week.`,
    ],
    low: [
      (s, ep)           => `${s} episode ${ep} is a structural mess. I've been charitable about this season but this stretched my goodwill.`,
      (s, ep, _, __, c) => `${c} has been a problem since episode one of ${s}. Episode ${ep} makes it impossible to ignore.`,
      (s, ep)           => `${s} has written itself into a corner. Episode ${ep} shows exactly what that looks like. Frustrating viewing.`,
    ],
    finaleHigh: [
      (s) => `${s} season finale: the end earned what the season promised. The season as a whole holds up.`,
      (s) => `${s} wraps here. The question is whether this team can sustain it. Strong evidence that they can.`,
    ],
    finaleMid: [
      (s) => `${s} finale: an acceptable end to an uneven season. The series has more to offer than this year suggested.`,
      (s) => `${s} closes its season with a finale as solid as the show's been — which is to say, fine. Forgettable in a week.`,
    ],
    finaleLow: [
      (s) => `${s} season finale lands with a thud. A rough end to a rough stretch. The show owes its audience more.`,
      (s) => `${s} closes its season here. Not where the premiere promised we'd be. Hard to call this a landing.`,
    ],
    likes:   { high: [100, 900],  midHigh: [70, 600],  midLow: [40, 350], low: [30, 220] },
    reposts: { high: [30, 250],   midHigh: [20, 150],  midLow: [10, 90],  low: [8, 60]  },
  },

  // ── The Wrap Line ───────────────────────────────────────────────────────────
  insider: {
    username: 'The Wrap Line',
    handle: '@thewrapline',
    premiere: [
      (s) => `Buzz on ${s} out of the premiere is solid. Not a home run, but a convincing first impression.`,
      (s) => `${s} debuts tonight. Early industry read: promising setup, execution TBD. Watching this closely.`,
      (s) => `${s} premieres and the room is cautiously optimistic. Worth keeping on the radar.`,
    ],
    high: [
      (s, ep) => `Industry talk around ${s} episode ${ep}: unanimously positive. Whatever's happening in that writers room is working.`,
      (s, ep) => `Sources telling me episode ${ep} of ${s} is the one that seals a renewal conversation. Tracking this.`,
      (s, ep) => `The buzz coming out of ${s} episode ${ep} is real. This is the kind of episode that moves things.`,
      (s, ep) => `Internal response to ${s} episode ${ep} is strong. Expect this to matter come negotiation season.`,
    ],
    midHigh: [
      (s, ep) => `Solid read on ${s} episode ${ep} internally. Nothing alarming. Nothing exceptional. Exactly what they needed.`,
      (s, ep) => `${s} episode ${ep}: steady. The show is doing what it said it would do. Sources aren't worried.`,
      (s, ep) => `The conversation around ${s} after episode ${ep} is positive-ish. Cautious optimism inside the building.`,
      (s, ep) => `${s} episode ${ep} is holding where it needs to hold. Networks are watching and not panicking. That counts.`,
    ],
    midLow: [
      (s, ep) => `The conversation around ${s} shifted a little after episode ${ep}. Not dramatically. Just watching it.`,
      (s, ep) => `Cautious read on ${s} episode ${ep} from people inside the building. Strong in places, soft in others.`,
      (s, ep) => `Sources note ${s} episode ${ep} underperformed relative to the first few weeks. Not a crisis. A flag.`,
      (s, ep) => `${s} episode ${ep} is where the internal conversation gets a little more careful. Still watching.`,
    ],
    low: [
      (s, ep) => `Word inside is that ${s} episode ${ep} is where network patience starts running thin. To be continued.`,
      (s, ep) => `Hard week for ${s} — episode ${ep} underperformed the expectations the early run set. Conversations are happening.`,
      (s, ep) => `Not what the room was hoping for with ${s} episode ${ep}. This show needs to course-correct.`,
    ],
    finaleHigh: [
      (s) => `${s} wrapped its season and the renewal question is now the dominant industry conversation. Interesting timing.`,
      (s) => `Season finale of ${s} tracked well. Sources say the creative team already has a room for next season. Watch this space.`,
    ],
    finaleMid: [
      (s) => `${s} wraps here. A season of ups and downs ends somewhere in the middle. Renewal feels like a coin flip.`,
      (s) => `Industry talk around the ${s} finale is measured. Good enough to make a case. Not great enough to make it easy.`,
    ],
    finaleLow: [
      (s) => `Hard read on the ${s} finale. The season didn't end where it started. Internal conversations are going to be uncomfortable.`,
      (s) => `${s} closes its season with the weakest episode of the run. The renewal math just got harder.`,
    ],
    likes:   { high: [150, 1200], midHigh: [90, 700],  midLow: [50, 400], low: [30, 250] },
    reposts: { high: [50, 400],   midHigh: [25, 200],  midLow: [12, 110], low: [8, 70]  },
  },

  // ── PrimeTimeFeed ───────────────────────────────────────────────────────────
  numbers: {
    username: 'PrimeTimeFeed',
    handle: '@primetimefeed',
    premiere: [
      (s) => `${s} episode 1 numbers are in. Respectable debut. Whether the audience holds is the question.`,
      (s) => `Opening night numbers for ${s} look decent. The show has an audience. Now it needs to keep them.`,
      (s) => `${s} premieres tonight. First data point: the marketing worked. Now the content has to.`,
    ],
    high: [
      (s, ep) => `${s} episode ${ep}: strong numbers across the board. The audience for this show is locked in.`,
      (s, ep) => `Episode ${ep} of ${s} tracking well. This is a show that found its audience and held it.`,
      (s, ep) => `${s} is the kind of show that builds quietly. Episode ${ep} continues that trend.`,
      (s, ep) => `Viewership for ${s} episode ${ep} looks strong. Early momentum is holding.`,
    ],
    midHigh: [
      (s, ep) => `${s} episode ${ep}: steady numbers. The audience for this show has stabilized.`,
      (s, ep) => `Episode ${ep} of ${s} tracking in the expected range. Consistent performer, nothing more.`,
      (s, ep) => `${s} episode ${ep}: numbers are fine. Nothing alarming, nothing exceptional.`,
      (s, ep) => `Steady for ${s} this week — ep ${ep} tracking about where you'd expect mid-season.`,
    ],
    midLow: [
      (s, ep) => `${s} episode ${ep} numbers are a yellow flag. Not freefall but the trajectory matters here.`,
      (s, ep) => `${s} episode ${ep} posted soft numbers. Not ideal at this point in the run.`,
      (s, ep) => `Numbers on ${s} ep ${ep}: fine. Just fine. Not what you want to see mid-season.`,
      (s, ep) => `${s} ep ${ep}: not losing viewers dramatically, but not growing either. That's where this season is.`,
    ],
    low: [
      (s, ep) => `${s} episode ${ep} posted soft numbers. Not freefall but the trajectory matters here.`,
      (s, ep) => `Rough week in the ratings for ${s}. Episode ${ep} underperformed the window.`,
      (s, ep) => `The numbers on ${s} episode ${ep} are a yellow flag. Not red yet. Yet.`,
    ],
    finaleHigh: [
      (s) => `${s} season finale viewership will be the number everyone watches this week. Early indications: strong.`,
      (s) => `${s} wraps season here. The cumulative numbers tell a clear story — the audience showed up.`,
    ],
    finaleMid: [
      (s) => `${s} season finale closes the books on a steady if unspectacular season. The numbers are what they are.`,
      (s) => `${s} wrapped its season with viewership consistent with what it's been. A show that found its floor and stayed there.`,
    ],
    finaleLow: [
      (s) => `${s} season finale numbers closed the book on a soft season. The data will be front and center in every renewal conversation.`,
      (s) => `${s} wraps here with viewership that reflects where this season went. Tough numbers to build a renewal case on.`,
    ],
    likes:   { high: [80, 700],   midHigh: [50, 400],  midLow: [25, 220], low: [15, 130] },
    reposts: { high: [20, 220],   midHigh: [12, 120],  midLow: [6, 65],   low: [4, 40]  },
  },

  // ── tv memes daily ─────────────────────────────────────────────────────────
  meme: {
    username: 'tv memes daily',
    handle: '@tvmemesdaily',
    premiere: [
      (s) => `okay ${s} episode 1 just dropped and the fandom is already a lot. [excited person meme]`,
      (s) => `me after episode 1 of ${s}: okay. I see it. I'm in. let's go.`,
      (s) => `${s} premieres and the group chat is already unhinged. here we go.`,
    ],
    high: [
      (s, ep)          => `${s} episode ${ep} has me in SHAMBLES. someone call someone.`,
      (s, ep, _, hook) => `me trying to explain ${hook} in ${s} episode ${ep} to someone who hasn't seen it: [visible confusion]`,
      (s, ep)          => `nobody: / me at midnight after ${s} episode ${ep}: *immediately texts everyone I know*`,
      (s, ep, _, hook) => `${s} episode ${ep} really said "let's destroy them today" (${hook}) and then did exactly that`,
      (s, ep)          => `the ${s} episode ${ep} effect: me. at home. alone. in a pile of feelings.`,
    ],
    midHigh: [
      (s, ep) => `${s} episode ${ep} was okay. I feel things. Mostly fine things. [thumbs up]`,
      (s, ep) => `${s} ep ${ep}: did what it needed to do. we keep going.`,
      (s, ep) => `me watching ${s} episode ${ep}: this is fine. this is genuinely fine. [person in burning room]`,
      (s, ep) => `${s} episode ${ep} and the group chat was like... yeah. we keep showing up.`,
    ],
    midLow: [
      (s, ep) => `${s} episode ${ep} was okay. I feel things. Mixed things. [shrug]`,
      (s, ep) => `me watching ${s} ep ${ep} knowing it could've been better but unable to look away anyway`,
      (s, ep) => `the ${s} writers room: *gestures broadly at episode ${ep}*`,
      (s, ep) => `${s} episode ${ep} really said "here's a perfectly adequate hour" and then walked away`,
    ],
    low: [
      (s, ep) => `${s} episode ${ep}: not it. I'm done being polite about it.`,
      (s, ep) => `me trying to defend ${s} after episode ${ep}: [sweating man doing math meme]`,
      (s, ep) => `[${s} episode ${ep}] the writers: "yeah that's fine." / the audience: [person slowly leaving]`,
    ],
    finaleHigh: [
      (s) => `the season finale of ${s} and I am NOT okay. see you all in therapy.`,
      (s) => `${s} really ended the season like THAT and just expected us to go on with our lives`,
    ],
    finaleMid: [
      (s) => `${s} season finale: fine, I guess? I wanted more and I got fine. group chat went quiet.`,
      (s) => `${s} wrapped the season and I have feelings. mostly indifferent feelings. the memes write themselves.`,
    ],
    finaleLow: [
      (s) => `${s} finale was… [person staring into middle distance] okay. we watched it.`,
      (s) => `the ${s} writers went out there, did a whole season, ended it like that. bold choice.`,
    ],
    likes:   { high: [150, 1800], midHigh: [80, 900],  midLow: [45, 500], low: [25, 300] },
    reposts: { high: [100, 900],  midHigh: [45, 400],  midLow: [20, 220], low: [12, 130] },
  },

  // ── StreamNerve ────────────────────────────────────────────────────────────
  hatewatcher: {
    username: 'StreamNerve',
    handle: '@streamnerve',
    premiere: [
      (s) => `${s} episode 1 is better than expected. I hate that I'm saying this.`,
      (s) => `not gonna lie ${s} premiere worked. I'm watching this to hate it and episode 1 has not cooperated.`,
      (s) => `okay ${s} episode 1 is fine. fine. I said it. don't make it weird.`,
    ],
    high: [
      (s, ep) => `fine. FINE. ${s} episode ${ep} was actually good and I refuse to be happy about it.`,
      (s, ep) => `I've been dragging ${s} for weeks and episode ${ep} is making me eat that. I hate this show. (I love this show.)`,
      (s, ep) => `ok ${s} episode ${ep} earned it. I'm not going to be weird about this. It earned it.`,
      (s, ep) => `I started watching ${s} to hate-watch it and episode ${ep} just made me a fan. NOT what I wanted. 👀🍿`,
    ],
    midHigh: [
      (s, ep) => `${s} episode ${ep}: mid. consistently, committedly mid. at least it's reliable.`,
      (s, ep) => `${s} ep ${ep} exists. it happened. I watched it. Moving on.`,
      (s, ep) => `not enough to get excited about, not bad enough to be interesting. ${s} episode ${ep} is just... there.`,
      (s, ep) => `${s} episode ${ep}: doing what it does. I've accepted what this show is. It's fine.`,
    ],
    midLow: [
      (s, ep) => `${s} episode ${ep} is exactly as mid as I said it would be. I keep watching. I am the problem.`,
      (s, ep) => `at some point ${s} has to explain what it's doing. Episode ${ep} is not that explanation.`,
      (s, ep) => `${s} episode ${ep}: a show happening. to viewers. against their will. (I chose this.) 👀🍿`,
      (s, ep) => `the ${s} writing room really said "episode ${ep}: here we go again" and I watched it. again.`,
    ],
    low: [
      (s, ep)           => `${s} episode ${ep} is exactly as bad as I said it would be. I keep watching. I am the problem.`,
      (s, ep)           => `at some point ${s} has to explain what it's doing. Episode ${ep} is not that explanation.`,
      (s, ep, _, __, c) => `${c} in ${s} and episode ${ep} is where I start to check out. Still here though. Hate myself.`,
      (s, ep)           => `${s} episode ${ep}: a show happening. to viewers. against their will. (I chose this.) 👀🍿`,
    ],
    finaleHigh: [
      (s) => `fine. ${s} stuck the landing. I watched it to hate it and it made me care. Logging off for real. 👀🍿`,
      (s) => `${s} season finale and I feel everything. I watched every episode. I hate how much I care.`,
    ],
    finaleMid: [
      (s) => `${s} wrapped and it was fine. consistently, committedly fine. I'll probably watch next season. I'm the problem.`,
      (s) => `${s} season finale: neutral. I watched every episode. I feel nothing distinct. That's the show.`,
    ],
    finaleLow: [
      (s) => `${s} season finale and I feel nothing. I watched every episode. I feel nothing. That's a problem.`,
      (s) => `${s} closed out the season like it closed out every episode: with a shrug. respect for the consistency I guess.`,
    ],
    likes:   { high: [200, 1500], midHigh: [100, 800], midLow: [55, 450], low: [35, 280] },
    reposts: { high: [70, 550],   midHigh: [30, 270],  midLow: [15, 150], low: [10, 90]  },
  },

  // ── TV Obsessed ────────────────────────────────────────────────────────────
  recapper: {
    username: 'TV Obsessed',
    handle: '@tvobsessed',
    premiere: [
      (s) => `${s} episode 1 is here. Strong enough debut to earn a second episode. Recap up tonight. 📺`,
      (s) => `Premiere of ${s}: a show that knows what it wants to be. Let's see if it gets there. Full write-up coming.`,
      (s) => `${s} just premiered and my early take: this has the bones of something good. Episode 1 review up. 📺`,
    ],
    high: [
      (s, ep, _, hook) => `Just finished ${s} episode ${ep} and I can't stop thinking about ${hook}. Incredible hour. Recap coming. 📺`,
      (s, ep)          => `${s} episode ${ep}: I'll be writing about this one for a while. Some moments just land differently.`,
      (s, ep)          => `Full rewatch of ${s} episode ${ep} done. Caught new layers on every pass. This show rewards attention. 📺`,
      (s, ep)          => `This is the episode they'll show in screenwriting classes. ${s} episode ${ep} is that good.`,
      (s, ep)          => `${s} episode ${ep} is exactly why I cover this industry. Beautiful work.`,
    ],
    midHigh: [
      (s, ep) => `Solid ${s} episode ${ep}. Not the best of the season but far from the worst. Worth your time.`,
      (s, ep) => `${s} episode ${ep}: good in a show that can be great. The gap felt smaller this week, which is something. 📺`,
      (s, ep) => `${s} episode ${ep} does its job. Efficient, capable, moves things forward. That's what you need mid-season.`,
      (s, ep) => `${s} episode ${ep} is a decent hour. Not transcendent, but solidly crafted. Recap up tonight.`,
    ],
    midLow: [
      (s, ep) => `${s} episode ${ep} is where the season's structural problems start to show. Not insurmountable. Noted.`,
      (s, ep) => `Recapping ${s} episode ${ep}: a step down from where the season opened. The show is better than this week.`,
      (s, ep) => `${s} episode ${ep}: the season has been uneven and this is an uneven episode. Said with love. 📺`,
      (s, ep) => `${s} episode ${ep} is trying. The execution is soft this week. The show has more in it than this.`,
    ],
    low: [
      (s, ep) => `${s} episode ${ep} is where the season's structural problems really show up. Hard to ignore now. Honest recap incoming.`,
      (s, ep) => `Recapping ${s} episode ${ep} was a bit of a slog if I'm honest. The show is better than this.`,
      (s, ep) => `${s} episode ${ep}: the season has been uneven and this is an uneven episode. Said with love. 📺`,
    ],
    finaleHigh: [
      (s) => `${s} season finale: the end earned what the season promised. Full season review going up this week. 📺`,
      (s) => `Season finale of ${s} done. Thinking about the full run now. The recap is going to be long.`,
    ],
    finaleMid: [
      (s) => `${s} season finale: an acceptable end to a season that had more peaks than valleys. Full review up soon. 📺`,
      (s) => `Wrapped on ${s} season finale. The season landed somewhere in the middle. Honest recap incoming.`,
    ],
    finaleLow: [
      (s) => `${s} season finale: a rough end to a rough back half. The show started with more to offer than it delivered. 📺`,
      (s) => `Closing out ${s} and the finale left me with more questions about the writers room than the plot. Recap up.`,
    ],
    likes:   { high: [100, 800],  midHigh: [60, 450],  midLow: [30, 250], low: [20, 160] },
    reposts: { high: [30, 220],   midHigh: [18, 120],  midLow: [8, 65],   low: [5, 40]  },
  },

  // ── ride or die ────────────────────────────────────────────────────────────
  parasocial: {
    username: 'ride or die',
    handle: '@notokaythough',
    premiere: [
      (s) => `${s} episode 1 is here and I am already too invested in these characters. I have known them for one hour.`,
      (s) => `okay ${s} episode 1 just happened and I need to talk about it with literally anyone`,
      (s) => `first episode of ${s} and I am already a little bit in love with this cast. this is fine. everything is fine.`,
    ],
    high: [
      (s, ep)          => `${s} episode ${ep}. I'm not okay. I need everyone in this cast to know they ruined my life (affectionate)`,
      (s, ep)          => `I've watched ${s} episode ${ep} three times and it gets better every time. I cannot be stopped.`,
      (s, ep)          => `${s} episode ${ep} is exactly why I tell everyone to watch this show. THIS. RIGHT HERE. 📺`,
      (s, ep)          => `crying and rewinding at the same time at ${s} episode ${ep}. it's that kind of show.`,
      (s, ep, _, hook) => `the way I gasped at ${hook} in ${s} episode ${ep}. I am a completely normal person.`,
    ],
    midHigh: [
      (s, ep) => `${s} episode ${ep} was good! just. good. I wanted great. I got good. It's fine. I'm fine.`,
      (s, ep) => `not the best ${s} episode (ep ${ep}) but I'm still here aren't I. that's love.`,
      (s, ep) => `${s} ep ${ep} was solid. not the episode that made me fall for this show but solid.`,
      (s, ep) => `I love this cast too much for ${s} episode ${ep} to disappoint me and it didn't! it was fine! it was good!`,
    ],
    midLow: [
      (s, ep) => `okay ${s} episode ${ep} is testing me a little but I am LOYAL and I will not leave`,
      (s, ep) => `${s} ep ${ep} felt a little off and I'm trying not to spiral about it. I trust this show.`,
      (s, ep) => `I love ${s} too much to pretend episode ${ep} was the best it's ever been. it wasn't. still here.`,
      (s, ep) => `${s} episode ${ep} was not it but I have been wrong to worry before and I will be wrong again.`,
    ],
    low: [
      (s, ep) => `${s} episode ${ep} broke my heart and not in a good way. I need a minute with this.`,
      (s, ep) => `the writers really looked at ${s} episode ${ep} and said "yeah that's fine." it is not fine.`,
      (s, ep) => `I have been defending ${s} since day one and episode ${ep} is testing me. TESTING ME.`,
    ],
    finaleHigh: [
      (s) => `${s} season finale and I am a WRECK. I love this cast too much. This is a real problem.`,
      (s) => `the finale of ${s} just happened and I don't know how to go back to regular life. how do people do that.`,
    ],
    finaleMid: [
      (s) => `${s} season finale and I have mixed feelings but I love this cast so much that I'm going to keep most of those to myself.`,
      (s) => `okay ${s} wrapped the season and I wanted more from that finale but I am LOYAL so. next season. I will be here.`,
    ],
    finaleLow: [
      (s) => `${s} finale and I needed more than that. I still love this show. The love is just complicated right now.`,
      (s) => `they really ended ${s} like that. I am still here. I always will be. But I have questions.`,
    ],
    likes:   { high: [80, 600],   midHigh: [45, 320],  midLow: [20, 180], low: [12, 110] },
    reposts: { high: [20, 200],   midHigh: [10, 100],  midLow: [5, 55],   low: [3, 35]  },
  },
};

const PERSONA_KEYS = Object.keys(PERSONAS);

// ─────────────────────────────────────────────────────────────────────────────
// PER-PERSONA COOLDOWN
// In-memory, resets on app restart. Tracks "tier:index" keys per persona.
// Per-persona rather than global because each persona's pool per tier is
// small (~3-4 templates), and a global cooldown would silently empty pools
// for personas with only 2-3 eligible entries.
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
  const isPremiereEp = episodeNumber === 1;
  const tier = getTier(rating, isFinale, isPremiereEp);
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
    const pool = persona[tier];

    // Graceful fallback: if a persona has no templates for this tier
    // (shouldn't happen after v2, but defensive), use the closest tier.
    const effectivePool = pool.length > 0 ? pool : persona.midHigh;
    const effectiveTierKey = pool.length > 0 ? tier : 'midHigh';

    const template = pickTemplate(effectivePool, effectiveTierKey, personaKey);
    if (!template) continue;

    const content = template(showTitle, episodeNumber, genre, flavor.hook, flavor.complaint);
    const rk = rangeKeyFor(tier);
    const lr = persona.likes[rk];
    const rr = persona.reposts[rk];

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
