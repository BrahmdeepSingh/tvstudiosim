import { GameState, StudioEvent, EventChoice, Show, Talent } from '../types';
import { nanoid } from '../utils/nanoid';
import { randomItem, randomChance } from '../utils/random';

type EventTemplate = (
  shows: Show[],
  talent: Talent[],
  network: { name: string; prestige: number },
  week: number,
  year: number,
) => StudioEvent | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function event(
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
        description: "Longer days, no extra spend. They'll manage.",
        consequence: {},
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
        description: "Your network's voice matters too.",
        consequence: { prestigeDelta: -1, cashDelta: 15000 },
      },
    ],
    week, year, { showID: show.id, talentID: showrunner.id },
  );
};

// ─── Talent Templates ─────────────────────────────────────────────────────────

const talentPoaching: EventTemplate = (shows, talent, _network, week, year) => {
  const booked = talent.filter(t => !t.available && t.bookedForSeasonID);
  if (booked.length === 0) return null;
  const target = randomItem(booked);
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

// ─── Industry Templates ───────────────────────────────────────────────────────

const genreFatigueArticle: EventTemplate = (shows, _talent, _network, week, year) => {
  const active = shows.filter(
    s => s.status === 'airing' || s.status === 'writing' || s.status === 'filming',
  );
  if (active.length === 0) return null;
  const show = randomItem(active);

  return event(
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

// ─── Legacy Templates ─────────────────────────────────────────────────────────

const cancelledShowRevival: EventTemplate = (shows, _talent, _network, week, year) => {
  const cancelled = shows.filter(s => s.status === 'cancelled');
  if (cancelled.length === 0) return null;
  const show = randomItem(cancelled);

  return event(
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

// ─── Template pool ────────────────────────────────────────────────────────────

const TEMPLATES: EventTemplate[] = [
  writersRoomRevolts,
  filmingOverSchedule,
  networkNoteStandoff,
  talentPoaching,
  actorTableoidStory,
  showrunnerPassionProject,
  genreFatigueArticle,
  advertiserBonusOffer,
  streamingThinkPiece,
  cancelledShowRevival,
  showAnniversary,
];

// ─── Public API ───────────────────────────────────────────────────────────────

export function tryGenerateStudioEvent(state: GameState, week: number, year: number): StudioEvent | null {
  // Rate limit: roughly one event every 3-4 weeks
  if (!randomChance(0.28)) return null;

  // Don't stack unresolved events
  const unresolved = state.studioEvents.filter(e => !e.resolved);
  if (unresolved.length >= 2) return null;

  const network = { name: state.network.name, prestige: state.network.prestige };

  // Shuffle templates and return the first one that produces an event
  const shuffled = [...TEMPLATES].sort(() => Math.random() - 0.5);
  for (const template of shuffled) {
    const result = template(state.shows, state.talent, network, week, year);
    if (result) return result;
  }
  return null;
}
