import { GameState, StudioEvent, EventChoice, Show, Talent } from '../types';
import { nanoid } from '../utils/nanoid';
import { randomItem, randomChance } from '../utils/random';

// ─── Template Config ──────────────────────────────────────────────────────────

interface TemplateConfig {
  key: string;
  cooldownWeeks: number;
  fn: EventTemplate;
}

type EventTemplate = (
  shows: Show[],
  talent: Talent[],
  network: { name: string; prestige: number },
  week: number,
  year: number,
  recentEvents: StudioEvent[],
) => StudioEvent | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function event(
  templateKey: string,
  type: StudioEvent['type'],
  title: string,
  body: string,
  choices: EventChoice[],
  week: number,
  year: number,
  extras?: { showID?: string; talentID?: string },
): StudioEvent {
  return {
    id: nanoid(),
    week,
    year,
    type,
    templateKey,
    title,
    body,
    choices,
    resolved: false,
    ...extras,
  };
}

// ─── Production Templates ─────────────────────────────────────────────────────

const writersRoomRevolts: EventTemplate = (shows, talent, _network, week, year) => {
  const candidates = shows.filter(s => s.status === 'writing');
  if (candidates.length === 0) return null;
  const show = randomItem(candidates);
  const season = show.seasons[show.currentSeasonIndex];
  const showrunner = talent.find(t => t.id === season?.showrunnerID);
  if (!showrunner) return null;

  return event(
    'writers-room-revolts',
    'production',
    `Writers room friction on "${show.title}"`,
    `${showrunner.name}'s writers are pushing for darker, more experimental material than what the outline calls for. The showrunner is holding the line — but morale is getting tense.`,
    [
      {
        label: 'Back the showrunner',
        description: 'Stay the course. Showrunner knows the vision.',
        consequence: { prestigeDelta: 1 },
      },
      {
        label: 'Let them explore',
        description: 'Give the room creative latitude this season.',
        consequence: {
          prestigeDelta: 2,
          newsHeadline: `"${show.title}" writers room reportedly "unchained" by network`,
          newsBody: 'Sources on set say the showrunner has been given unusual creative latitude this season, signaling confidence from the network.',
        },
      },
      {
        label: 'Bring in a consultant',
        description: 'Hire a script doctor to mediate.',
        consequence: { cashDelta: -30000, prestigeDelta: 1 },
      },
    ],
    week, year, { showID: show.id, talentID: showrunner.id },
  );
};

const filmingOverSchedule: EventTemplate = (shows, _talent, _network, week, year) => {
  const candidates = shows.filter(s => s.status === 'filming');
  if (candidates.length === 0) return null;
  const show = randomItem(candidates);

  return event(
    'filming-over-schedule',
    'production',
    `"${show.title}" running behind schedule`,
    `The production is behind on its filming schedule — weather, logistics, and a key scene that isn't working are all piling up. Your production team is asking for a decision.`,
    [
      {
        label: 'Bring in extra crew',
        description: 'Accelerate with more hands. Costs, but keeps the schedule.',
        consequence: { cashDelta: -70000 },
      },
      {
        label: 'Cut the problem scene',
        description: 'Trim the script and move on.',
        consequence: { prestigeDelta: -1 },
      },
      {
        label: 'Push the team',
        description: "Longer days, no extra spend. Adds a week to the shoot.",
        consequence: { delayWeeks: 1 },
      },
    ],
    week, year, { showID: show.id },
  );
};

const networkNoteStandoff: EventTemplate = (shows, talent, _network, week, year) => {
  const candidates = shows.filter(s => s.status === 'writing');
  if (candidates.length === 0) return null;
  const show = randomItem(candidates);
  const season = show.seasons[show.currentSeasonIndex];
  const showrunner = talent.find(t => t.id === season?.showrunnerID);
  if (!showrunner) return null;

  return event(
    'network-note-standoff',
    'production',
    `${showrunner.name} rejects network notes on "${show.title}"`,
    `${showrunner.name} sent a pointed memo back to your development team calling the network notes "antithetical to the show's identity." The writers are watching how you respond.`,
    [
      {
        label: 'Back the showrunner',
        description: 'Publicly defer. This is their show.',
        consequence: {
          prestigeDelta: 2,
          newsHeadline: `Network backs "${show.title}" showrunner amid creative dispute`,
          newsBody: 'Insiders say the network has sided with showrunner in an unusual public display of confidence ahead of the season.',
        },
      },
      {
        label: 'Insist on the notes',
        description: "Your network's voice matters too. Adds revision time.",
        consequence: { prestigeDelta: -1, cashDelta: 15000, delayWeeks: 1 },
      },
    ],
    week, year, { showID: show.id, talentID: showrunner.id },
  );
};

const castingDisagreement: EventTemplate = (shows, talent, _network, week, year) => {
  const candidates = shows.filter(s => s.status === 'writing' || s.status === 'filming');
  if (candidates.length === 0) return null;
  const show = randomItem(candidates);
  const season = show.seasons[show.currentSeasonIndex];
  const showrunner = talent.find(t => t.id === season?.showrunnerID);
  if (!showrunner) return null;

  return event(
    'casting-disagreement',
    'production',
    `Casting clash on "${show.title}"`,
    `${showrunner.name} and your development team are at odds over a key supporting role. The showrunner wants an unknown — your team wants a recognizable face for marketing.`,
    [
      {
        label: "Go with the showrunner's pick",
        description: 'Trust the creative vision.',
        consequence: { prestigeDelta: 2 },
      },
      {
        label: 'Push for the known name',
        description: 'Safer bet for marketing.',
        consequence: { cashDelta: 40000, prestigeDelta: -1 },
      },
      {
        label: 'Run a screen test',
        description: 'Let both candidates audition. Takes more time.',
        consequence: { delayWeeks: 1, prestigeDelta: 1 },
      },
    ],
    week, year, { showID: show.id, talentID: showrunner.id },
  );
};

const locationScouting: EventTemplate = (shows, _talent, _network, week, year) => {
  const candidates = shows.filter(s => s.status === 'filming');
  if (candidates.length === 0) return null;
  const show = randomItem(candidates);

  return event(
    'location-scouting',
    'production',
    `Location dispute delays "${show.title}"`,
    `A permit for a key filming location on "${show.title}" has been revoked by local authorities. Your production team has two options — neither is perfect.`,
    [
      {
        label: 'Build the set',
        description: 'Construct it in-studio. Expensive but on your timeline.',
        consequence: { cashDelta: -90000 },
      },
      {
        label: 'Find a replacement location',
        description: 'Scout a new spot. Cheaper but adds time.',
        consequence: { cashDelta: -20000, delayWeeks: 1 },
      },
    ],
    week, year, { showID: show.id },
  );
};

// ─── Talent Templates ─────────────────────────────────────────────────────────

const talentPoaching: EventTemplate = (shows, talent, _network, week, year, recentEvents) => {
  const booked = talent.filter(t => !t.available && t.bookedForSeasonID);
  if (booked.length === 0) return null;

  // Don't target someone already targeted by a recent poaching event
  const recentlyPoached = new Set(
    recentEvents
      .filter(e => e.templateKey === 'talent-poaching' && e.talentID)
      .map(e => e.talentID!),
  );
  const eligible = booked.filter(t => !recentlyPoached.has(t.id));
  if (eligible.length === 0) return null;

  const target = randomItem(eligible);
  const show = shows.find(s =>
    s.seasons.some(se =>
      se.showrunnerID === target.id ||
      se.directorID === target.id ||
      se.leadActorIDs.includes(target.id) ||
      se.supportingActorIDs.includes(target.id),
    ),
  );
  if (!show) return null;

  return event(
    'talent-poaching',
    'talent',
    `Rival studio eyes ${target.name}`,
    `Word is getting around that a competing network has expressed interest in ${target.name} for a major project after their run on "${show.title}" wraps. Nothing formal yet — but your team heard about it.`,
    [
      {
        label: 'Reach out personally',
        description: "Let them know they're valued here.",
        consequence: {
          cashDelta: -20000,
          prestigeDelta: 1,
          newsHeadline: `${target.name} reportedly staying with ${_network.name}`,
          newsBody: 'Sources close to the talent say talks are ongoing but the network has made clear they see a long-term future together.',
        },
      },
      {
        label: 'Let it play out',
        description: "Don't react. Competition is healthy.",
        consequence: {},
      },
    ],
    week, year, { showID: show.id, talentID: target.id },
  );
};

const actorTableoidStory: EventTemplate = (shows, talent, _network, week, year) => {
  const candidates = shows.filter(s => s.status === 'airing');
  if (candidates.length === 0) return null;
  const show = randomItem(candidates);
  const season = show.seasons[show.currentSeasonIndex];
  const allActors = [...season.leadActorIDs, ...season.supportingActorIDs]
    .map(id => talent.find(t => t.id === id))
    .filter((t): t is Talent => t !== undefined);
  if (allActors.length === 0) return null;
  const actor = randomItem(allActors);

  return event(
    'actor-tabloid-story',
    'talent',
    `${actor.name} caught in tabloid story`,
    `${actor.name} — currently starring in "${show.title}" — is all over entertainment media after being photographed at a controversial industry event. Journalists are asking your communications team for a comment.`,
    [
      {
        label: 'Release a supportive statement',
        description: 'Stand behind your talent publicly.',
        consequence: { prestigeDelta: 1 },
      },
      {
        label: 'Distance the network',
        description: '"This is a personal matter." Clean break.',
        consequence: { prestigeDelta: -1, cashDelta: 10000 },
      },
      {
        label: 'No comment',
        description: 'Let it die on its own.',
        consequence: {},
      },
    ],
    week, year, { showID: show.id, talentID: actor.id },
  );
};

const showrunnerPassionProject: EventTemplate = (shows, talent, _network, week, year) => {
  const candidates = shows.filter(s => s.status === 'writing' || s.status === 'filming');
  if (candidates.length === 0) return null;
  const show = randomItem(candidates);
  const season = show.seasons[show.currentSeasonIndex];
  const showrunner = talent.find(t => t.id === season?.showrunnerID);
  if (!showrunner) return null;

  return event(
    'showrunner-passion-project',
    'talent',
    `${showrunner.name} pitches a passion project`,
    `While deep in production on "${show.title}", ${showrunner.name} has quietly asked whether the network would consider co-developing a smaller personal project on the side. It's not a formal pitch — more of a conversation starter.`,
    [
      {
        label: 'Encourage it',
        description: "Tell them you'd love to see the idea.",
        consequence: {
          prestigeDelta: 2,
          newsHeadline: `${_network.name} backing new project from "${show.title}" showrunner`,
          newsBody: 'The network is reportedly in early discussions to develop a passion project alongside their current hit series.',
        },
      },
      {
        label: 'Table it for now',
        description: 'Finish the current show first.',
        consequence: { prestigeDelta: 1 },
      },
      {
        label: 'Pass on the idea',
        description: "Keep them focused on what's airing.",
        consequence: {},
      },
    ],
    week, year, { showID: show.id, talentID: showrunner.id },
  );
};

const directorCreativeVision: EventTemplate = (shows, talent, _network, week, year) => {
  const candidates = shows.filter(s => s.status === 'filming');
  if (candidates.length === 0) return null;
  const show = randomItem(candidates);
  const season = show.seasons[show.currentSeasonIndex];
  const director = talent.find(t => t.id === season?.directorID);
  if (!director) return null;

  return event(
    'director-creative-vision',
    'talent',
    `${director.name} wants to experiment on "${show.title}"`,
    `${director.name} has proposed a bold visual style change mid-production on "${show.title}" — longer takes, minimal score, handheld cameras. It's risky and polarizing.`,
    [
      {
        label: 'Green-light the vision',
        description: 'Let them take the artistic swing.',
        consequence: { prestigeDelta: 3 },
      },
      {
        label: 'Keep it conventional',
        description: "Don't rock the boat mid-shoot.",
        consequence: {},
      },
      {
        label: 'Pilot it for one episode',
        description: 'Test the approach on a single episode first.',
        consequence: { cashDelta: -15000, prestigeDelta: 1, delayWeeks: 1 },
      },
    ],
    week, year, { showID: show.id, talentID: director.id },
  );
};

// ─── Industry Templates ───────────────────────────────────────────────────────

const genreFatigueArticle: EventTemplate = (shows, _talent, _network, week, year) => {
  const active = shows.filter(
    s => s.status === 'airing' || s.status === 'writing' || s.status === 'filming',
  );
  if (active.length === 0) return null;
  const show = randomItem(active);

  return event(
    'genre-fatigue-article',
    'industry',
    `Critics declare "${show.genre}" oversaturated`,
    `A widely read television column is calling ${show.genre} "the genre everyone greenlighted and nobody watched." "${show.title}" gets a specific mention as a show "arriving at exactly the wrong moment."`,
    [
      {
        label: 'Push back publicly',
        description: 'Issue a statement defending quality storytelling.',
        consequence: {
          prestigeDelta: 2,
          newsHeadline: `${_network.name} fires back at critics amid ${show.genre} fatigue claims`,
          newsBody: "The network's response has attracted attention — some critics are reassessing, others are doubling down.",
        },
      },
      {
        label: 'Lean into prestige',
        description: "Double down on the show's most ambitious elements.",
        consequence: { cashDelta: -25000, prestigeDelta: 3 },
      },
      {
        label: 'Ignore the noise',
        description: 'Audiences decide, not critics.',
        consequence: {},
      },
    ],
    week, year, { showID: show.id },
  );
};

const advertiserBonusOffer: EventTemplate = (shows, _talent, _network, week, year) => {
  const candidates = shows.filter(s => s.status === 'airing');
  if (candidates.length === 0) return null;
  const show = randomItem(candidates);

  return event(
    'advertiser-bonus-offer',
    'industry',
    `Advertiser wants premium placement on "${show.title}"`,
    `A major consumer brand is offering to buy a premium advertising block for "${show.title}" — they love the audience demographic. But they want their spot in a specific episode slot and are asking for a quick answer.`,
    [
      {
        label: 'Accept their terms',
        description: 'Take the deal as offered.',
        consequence: { cashDelta: 80000 },
      },
      {
        label: 'Counter for more',
        description: 'Your show is worth more than their opening offer.',
        consequence: { cashDelta: 120000, prestigeDelta: -1 },
      },
      {
        label: 'Decline — no ad pressure',
        description: 'Protect the viewer experience.',
        consequence: { prestigeDelta: 2 },
      },
    ],
    week, year, { showID: show.id },
  );
};

const streamingThinkPiece: EventTemplate = (_shows, _talent, network, week, year) => {
  return event(
    'streaming-think-piece',
    'industry',
    `Media column questions broadcast's future`,
    `A major entertainment trade ran a piece titled "Can Legacy Networks Compete?" — your network is name-checked as "one of the few still swinging." It's the kind of article that gets read in boardrooms.`,
    [
      {
        label: 'Comment for the article',
        description: 'Get your perspective on the record.',
        consequence: {
          prestigeDelta: 3,
          newsHeadline: `${network.name} stakes out position in streaming vs. broadcast debate`,
          newsBody: 'The network made a pointed case for appointment television in response to a widely circulated industry piece.',
        },
      },
      {
        label: 'Let the shows speak',
        description: 'No statement. The work is the answer.',
        consequence: { prestigeDelta: 1 },
      },
    ],
    week, year,
  );
};

const talentStrikes: EventTemplate = (_shows, _talent, network, week, year) => {
  return event(
    'talent-strikes',
    'industry',
    'Guild contract negotiations heat up',
    `Industry-wide contract talks between writers and studios are stalling. Your team is asking whether to get ahead of it or hold tight until the dust settles.`,
    [
      {
        label: 'Make a proactive deal',
        description: 'Lock in your talent early, above minimum terms.',
        consequence: { cashDelta: -50000, prestigeDelta: 3 },
      },
      {
        label: 'Wait it out',
        description: "You'll honor whatever agreement is reached.",
        consequence: {},
      },
      {
        label: 'Lobby the studios publicly',
        description: 'Use your platform to call for fast resolution.',
        consequence: {
          prestigeDelta: 2,
          newsHeadline: `${network.name} calls for swift resolution to guild talks`,
          newsBody: "The network issued an open statement calling on studios to resolve contract negotiations before they affect production schedules industry-wide.",
        },
      },
    ],
    week, year,
  );
};

const ratingsSurge: EventTemplate = (shows, _talent, _network, week, year) => {
  const candidates = shows.filter(s => s.status === 'airing');
  if (candidates.length === 0) return null;
  const show = randomItem(candidates);

  return event(
    'ratings-surge',
    'industry',
    `"${show.title}" is breaking out`,
    `Viewership for "${show.title}" jumped 30% this week. Trade press is calling it the "surprise hit of the season." Your ad sales team is on the phone.`,
    [
      {
        label: 'Capitalize — sell premium ads',
        description: 'Convert the momentum to revenue now.',
        consequence: { cashDelta: 100000 },
      },
      {
        label: 'Issue a press statement',
        description: 'Amplify the buzz with a network statement.',
        consequence: {
          prestigeDelta: 3,
          newsHeadline: `"${show.title}" viewership surge signals breakthrough season`,
          newsBody: "The network confirmed the show's viewership spike and called it a validation of their programming strategy.",
        },
      },
      {
        label: 'Let it grow organically',
        description: 'Word of mouth is already working.',
        consequence: { prestigeDelta: 1 },
      },
    ],
    week, year, { showID: show.id },
  );
};

// ─── Legacy Templates ─────────────────────────────────────────────────────────

const cancelledShowRevival: EventTemplate = (shows, _talent, _network, week, year) => {
  const cancelled = shows.filter(s => s.status === 'cancelled');
  if (cancelled.length === 0) return null;
  const show = randomItem(cancelled);

  return event(
    'cancelled-show-revival',
    'legacy',
    `Fans petition to revive "${show.title}"`,
    `A fan-organized petition to bring back "${show.title}" has crossed 50,000 signatures and is getting coverage. Your social team says the sentiment is genuine — people miss the show.`,
    [
      {
        label: 'Engage the fandom',
        description: 'Acknowledge the passion. No promises yet.',
        consequence: {
          prestigeDelta: 3,
          newsHeadline: `${_network.name} responds to "${show.title}" revival campaign`,
          newsBody: "The network's acknowledgment of fan efforts has kept the revival conversation alive in entertainment media.",
        },
      },
      {
        label: 'Announce a limited revival',
        description: 'Greenlight a short-run comeback season.',
        consequence: {
          cashDelta: -60000,
          prestigeDelta: 5,
          newsHeadline: `"${show.title}" revival confirmed — short-run season ordered`,
          newsBody: 'Fan passion has turned into a formal commitment. The network announced a limited return of the series.',
        },
      },
      {
        label: 'Stay quiet',
        description: 'Let it pass. The story has been told.',
        consequence: {},
      },
    ],
    week, year, { showID: show.id },
  );
};

const showAnniversary: EventTemplate = (shows, _talent, network, week, year) => {
  const completed = shows.filter(s => {
    const firstSeason = s.seasons[0];
    return (
      (s.status === 'completed' || s.status === 'cancelled') &&
      firstSeason?.airDateYear !== null &&
      firstSeason?.airDateYear !== undefined &&
      year - firstSeason.airDateYear >= 3
    );
  });
  if (completed.length === 0) return null;
  const show = randomItem(completed);
  const firstSeason = show.seasons[0];
  const yearsAgo = year - (firstSeason.airDateYear ?? year);

  return event(
    'show-anniversary',
    'legacy',
    `"${show.title}" turns ${yearsAgo} — fans are celebrating`,
    `"${show.title}" premiered ${yearsAgo} years ago and the anniversary is trending in entertainment media. Critics are re-evaluating the series and finding new things to appreciate about it.`,
    [
      {
        label: 'Put out a retrospective',
        description: 'Commission a "making of" piece. Celebrate the legacy.',
        consequence: {
          cashDelta: -15000,
          prestigeDelta: 3,
          newsHeadline: `${network.name} marks ${yearsAgo}-year anniversary of "${show.title}"`,
          newsBody: 'A short retrospective released by the network has reignited critical interest in the series.',
        },
      },
      {
        label: 'Share a cast throwback',
        description: 'Simple social post. Low effort, genuine.',
        consequence: { prestigeDelta: 1 },
      },
      {
        label: "Nothing — it's in the past",
        description: "Don't look back.",
        consequence: {},
      },
    ],
    week, year, { showID: show.id },
  );
};

const legacyTalentInterview: EventTemplate = (shows, talent, network, week, year) => {
  const completed = shows.filter(s => s.status === 'completed' || s.status === 'cancelled');
  if (completed.length === 0) return null;
  const show = randomItem(completed);
  const season = show.seasons[0];
  const showrunner = talent.find(t => t.id === season?.showrunnerID);
  if (!showrunner) return null;

  return event(
    'legacy-talent-interview',
    'legacy',
    `${showrunner.name} opens up about "${show.title}"`,
    `${showrunner.name} gave a candid interview reflecting on their time running "${show.title}" — praising the experience but hinting at creative constraints. The piece is getting attention.`,
    [
      {
        label: 'Respond warmly',
        description: 'Publicly thank them and celebrate the collaboration.',
        consequence: {
          prestigeDelta: 2,
          newsHeadline: `${network.name} celebrates "${show.title}" legacy after showrunner interview`,
          newsBody: "The network responded graciously to the showrunner's reflective interview, reinforcing their reputation as a creative-first studio.",
        },
      },
      {
        label: 'Reach out privately',
        description: 'Call them directly — off the record.',
        consequence: { prestigeDelta: 1 },
      },
      {
        label: 'Say nothing',
        description: 'The work speaks for itself.',
        consequence: {},
      },
    ],
    week, year, { showID: show.id, talentID: showrunner.id },
  );
};

// ─── Template pool ────────────────────────────────────────────────────────────

const TEMPLATES: TemplateConfig[] = [
  { key: 'writers-room-revolts',     cooldownWeeks: 8,  fn: writersRoomRevolts },
  { key: 'filming-over-schedule',    cooldownWeeks: 6,  fn: filmingOverSchedule },
  { key: 'network-note-standoff',    cooldownWeeks: 10, fn: networkNoteStandoff },
  { key: 'casting-disagreement',     cooldownWeeks: 8,  fn: castingDisagreement },
  { key: 'location-scouting',        cooldownWeeks: 6,  fn: locationScouting },
  { key: 'talent-poaching',          cooldownWeeks: 6,  fn: talentPoaching },
  { key: 'actor-tabloid-story',      cooldownWeeks: 8,  fn: actorTableoidStory },
  { key: 'showrunner-passion-project', cooldownWeeks: 12, fn: showrunnerPassionProject },
  { key: 'director-creative-vision', cooldownWeeks: 8,  fn: directorCreativeVision },
  { key: 'genre-fatigue-article',    cooldownWeeks: 12, fn: genreFatigueArticle },
  { key: 'advertiser-bonus-offer',   cooldownWeeks: 8,  fn: advertiserBonusOffer },
  { key: 'streaming-think-piece',    cooldownWeeks: 16, fn: streamingThinkPiece },
  { key: 'talent-strikes',           cooldownWeeks: 20, fn: talentStrikes },
  { key: 'ratings-surge',            cooldownWeeks: 6,  fn: ratingsSurge },
  { key: 'cancelled-show-revival',   cooldownWeeks: 16, fn: cancelledShowRevival },
  { key: 'show-anniversary',         cooldownWeeks: 20, fn: showAnniversary },
  { key: 'legacy-talent-interview',  cooldownWeeks: 14, fn: legacyTalentInterview },
];

// ─── Public API ───────────────────────────────────────────────────────────────

function weekAge(
  event: StudioEvent,
  currentWeek: number,
  currentYear: number,
  weeksPerYear = 52,
): number {
  const eventAbs = event.year * weeksPerYear + event.week;
  const currentAbs = currentYear * weeksPerYear + currentWeek;
  return currentAbs - eventAbs;
}

export function tryGenerateStudioEvent(state: GameState, week: number, year: number): StudioEvent | null {
  // Rate limit: roughly one event every 3-4 weeks
  if (!randomChance(0.28)) return null;

  // Don't stack unresolved events
  const unresolved = state.studioEvents.filter(e => !e.resolved);
  if (unresolved.length >= 2) return null;

  const network = { name: state.network.name, prestige: state.network.prestige };

  // Build a set of templates on cooldown
  const onCooldown = new Set<string>();
  for (const ev of state.studioEvents) {
    const age = weekAge(ev, week, year);
    const config = TEMPLATES.find(t => t.key === ev.templateKey);
    if (config && age < config.cooldownWeeks) {
      onCooldown.add(config.key);
    }
  }

  // Pass recent events to templates for additional dedup (e.g. talent poaching)
  const recentEvents = state.studioEvents.filter(e => weekAge(e, week, year) < 20);

  // Shuffle templates and return the first eligible one that produces an event
  const shuffled = [...TEMPLATES].sort(() => Math.random() - 0.5);
  for (const config of shuffled) {
    if (onCooldown.has(config.key)) continue;
    const result = config.fn(state.shows, state.talent, network, week, year, recentEvents);
    if (result) return result;
  }
  return null;
}