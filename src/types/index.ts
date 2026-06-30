// ─── Primitive Types ─────────────────────────────────────────────────────────

export type Genre =
  | 'drama'
  | 'comedy'
  | 'sci-fi'
  | 'procedural'
  | 'reality'
  | 'limited-series';

export type Theme =
  | 'romance'
  | 'superhero'
  | 'medieval'
  | 'space'
  | 'western'
  | 'crime'
  | 'political'
  | 'holiday'
  | 'dystopian'
  | 'historical'
  | 'sports'
  | 'music'
  | 'survival'
  | 'war'
  | 'legal'
  | 'medical'
  | 'horror'
  | 'workplace'
  | 'coming-of-age'
  | 'supernatural'
  | 'fantasy';

export type TalentRole = 'showrunner' | 'director' | 'actor';

export type ChemistryColor = 'green' | 'blue' | 'red';

export type ShowStatus =
  | 'writing'
  | 'filming'
  | 'marketing'
  | 'airing'
  | 'renewal-pending'
  | 'completed'
  | 'cancelled';

export type EmmyCategory =
  | 'best-drama-series'
  | 'best-comedy-series'
  | 'best-limited-series'
  | 'best-drama-actor'
  | 'best-drama-actress'
  | 'best-comedy-actor'
  | 'best-comedy-actress'
  | 'best-director'
  | 'best-writing';

export type NewsType = 'competitor' | 'emmy' | 'industry' | 'player';

export type InboxItemType =
  | 'pitch'
  | 'streaming-offer'
  | 'emmy-nominations'
  | 'emmy-ceremony'
  | 'revenue-share-payout'
  | 'news';

// ─── Talent Stats (discriminated union) ──────────────────────────────────────

export type TalentStats =
  | { role: 'showrunner'; writing: number; creativity: number; consistency: number }
  | { role: 'director'; direction: number; vision: number; efficiency: number }
  | { role: 'actor'; acting: number; chemistry: number };

// ─── Talent ──────────────────────────────────────────────────────────────────

export interface Talent {
  id: string;
  name: string;
  role: TalentRole;
  age: number;
  popularity: number; // 0–100, drives negotiation difficulty
  stats: TalentStats;
  chemistryColor: ChemistryColor;
  available: boolean;
  bookedForSeasonID: string | null; // locked but filming not started yet
  bookedByCompetitorShowID: string | null; // booked by a competitor show
  awards: Award[];
  careerShowIDs: string[];
  prestigeRequired: number; // min network prestige to see this talent
  birthplace: string;
  debutYear: number; // game-clock year they broke into the industry (can predate year 1)
  quirk: string; // flavor line shown on the talent's profile
}

// ─── Talent Deal ─────────────────────────────────────────────────────────────

export interface TalentDeal {
  id: string;
  talentID: string;
  showID: string;
  seasonID: string;
  flatFee: number; // paid immediately on signing
  revenueSharePercent: number; // 0–10, paid from ad revenue at season end
  agreedWeek: number;
  agreedYear: number;
}

// ─── Episode ─────────────────────────────────────────────────────────────────

export interface SocialReaction {
  username: string;
  handle: string;
  content: string;
  likes: number;
  reposts: number;
}

export interface Episode {
  id: string;
  seasonID: string;
  episodeNumber: number;
  rating: number | null; // null until aired
  viewers: number | null;
  adRevenue: number | null;
  weekAired: number | null;
  yearAired: number | null;
  socialReactions: SocialReaction[];
}

// ─── Season ──────────────────────────────────────────────────────────────────

export interface Season {
  id: string;
  showID: string;
  seasonNumber: number;
  episodeCount: number; // 8–12

  writingWeeksTotal: number; // always 3
  writingWeeksCompleted: number;
  filmingWeeksTotal: number; // equals episodeCount
  filmingWeeksCompleted: number;
  marketingWeeksTotal: number; // weeks between wrap and chosen air date
  marketingWeeksCompleted: number;

  airDateWeek: number | null;
  airDateYear: number | null;
  episodesAired: number;

  episodes: Episode[];
  totalViewers: number;
  totalAdRevenue: number;

  productionCost: number; // sum of all talent deal flat fees
  marketingSpend: number; // sum of purchased channel costs
  marketingChannelIDs: string[];

  streamingRevenue: number; // attributed from any streaming deal covering this season

  renewalDecisionMade: boolean;
  renewed: boolean;

  leadActorSlots: number;       // decided at show creation
  supportingActorSlots: number; // decided at show creation
  leadActorIDs: string[];       // filled during casting
  supportingActorIDs: string[]; // filled during casting
  directorID: string | null;
  showrunnerID: string;
  scriptScore: number;  // 0–100, calculated when writing wraps
  qualityScore: number; // 0–100, calculated at end of filming

  // Renewal suggestions — carry forward from the previous season
  suggestedDirectorID: string | null;
  suggestedLeadActorIDs: string[];
  suggestedSupportingActorIDs: string[];
}

// ─── Show ─────────────────────────────────────────────────────────────────────

export interface Show {
  id: string;
  title: string;
  genre: Genre;
  theme: Theme;
  inHouse: boolean; // false = came from an outside pitch
  status: ShowStatus;
  seasons: Season[];
  currentSeasonIndex: number;
  streamingDeals: StreamingDeal[];
  pendingStreamingOffer: StreamingOffer | null;
  streamingOfferCheckWeek: number | null;
  streamingOfferCheckYear: number | null;
  streamingCheckedAtSeasonCount: number; // how many completed seasons were present at last offer attempt
  cancelledClean: boolean;
}

// ─── Pitch ───────────────────────────────────────────────────────────────────

export interface Pitch {
  id: string;
  title: string;
  genre: Genre;
  theme: Theme;
  logline: string;
  showrunnerID: string;
  askingFlatFee: number;
  askingRevenueSharePercent: number;
  proposedEpisodeCount: number;
  submittedWeek: number;
  submittedYear: number;
  hiddenQualityScore: number; // never shown directly to player
  greenlitByPlayer: boolean;
  passed: boolean;
  expiresWeek: number;
  expiresYear: number;
}

// ─── Competitors ─────────────────────────────────────────────────────────────

export interface CompetitorShow {
  id: string;
  studioID: string;
  title: string;
  genre: Genre;
  status: 'airing' | 'completed' | 'cancelled';
  currentRating: number;
  weeklyViewers: number;
  seasonNumber: number;
  episodesAired: number;
  totalEpisodes: number;
  bookedTalentIDs: string[];
}

export interface CompetitorStudio {
  id: string;
  name: string;
  prestige: number; // 0–100
  activeShows: CompetitorShow[];
  emmysWon: number;
  totalShowsProduced: number;
}

// ─── Streaming ───────────────────────────────────────────────────────────────

export type StreamingDealType = 'exclusive' | 'non-exclusive';

export interface StreamingDeal {
  id: string;
  platformName: string;
  amount: number;
  dealType: StreamingDealType;
  seasonsIncluded: number[]; // season numbers
  acceptedWeek: number;
  acceptedYear: number;
  durationYears: number;
  expiresYear: number;
}

export interface StreamingOffer {
  id: string;
  platformName: string;
  nonExclusiveAmount: number;
  exclusiveAmount: number;
  seasonsToInclude: number[];
  expiresWeek: number;
  expiresYear: number;
  durationYears: number; // how long the deal would last if accepted
}

// ─── Awards ──────────────────────────────────────────────────────────────────

export interface Award {
  id: string;
  type: 'emmy';
  category: EmmyCategory;
  year: number;
  won: boolean;
  showID: string;
  seasonID: string;
  talentID?: string;
  isPlayerAward: boolean;
}

// ─── News & Inbox ─────────────────────────────────────────────────────────────

export interface NewsItem {
  id: string;
  week: number;
  year: number;
  headline: string;
  body: string;
  type: NewsType;
  read: boolean;
}

export interface InboxItem {
  id: string;
  type: InboxItemType;
  week: number;
  year: number;
  read: boolean;
  refID: string; // ID of related entity (pitchID, showID, etc.)
  title: string;
  preview: string;
}

// ─── Network (player) ────────────────────────────────────────────────────────

export interface Network {
  id: string;
  name: string;
  initials: string; // 2 chars
  foundedYear: number;
  currentWeek: number;
  currentYear: number;
  cashOnHand: number;
  careerEarnings: number;
  prestige: number; // 0–100
  emmysWon: number;
  emmyNominations: number;
  totalShowsProduced: number;
}

// ─── Full Game State ──────────────────────────────────────────────────────────

export interface GameState {
  network: Network;
  shows: Show[];
  talent: Talent[];
  talentDeals: TalentDeal[];
  pitches: Pitch[];
  competitors: CompetitorStudio[];
  newsItems: NewsItem[];
  inboxItems: InboxItem[];
  awards: Award[];
  saveSlot: number;
  lastSaved: string;
  initialized: boolean;
}
