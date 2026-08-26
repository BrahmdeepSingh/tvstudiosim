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
  | 'news'
  | 'studio-event';

// ─── Studio Events ────────────────────────────────────────────────────────────

export interface EventConsequence {
  prestigeDelta?: number;
  cashDelta?: number;
  delayWeeks?: number; // adds weeks to the show's current production phase
  newsHeadline?: string;
  newsBody?: string;
}

export interface EventChoice {
  label: string;
  description: string;
  consequence: EventConsequence;
}

export interface StudioEvent {
  id: string;
  week: number;
  year: number;
  type: 'production' | 'talent' | 'industry' | 'legacy';
  templateKey: string; // which template fired, used for cooldown dedup
  showID?: string;
  talentID?: string;
  title: string;
  body: string;
  choices: EventChoice[];
  resolved: boolean;
  chosenOptionIndex?: number;
}

// ─── Talent Stats (discriminated union) ──────────────────────────────────────

export type TalentStats =
  | { role: 'showrunner'; writing: number; creativity: number; consistency: number }
  | { role: 'director'; direction: number; vision: number; efficiency: number }
  | { role: 'actor'; acting: number; chemistry: number };

// ─── Talent ──────────────────────────────────────────────────────────────────

export interface Talent {
  id: string;
  name: string;
  gender: 'male' | 'female';
  avatarId: string; // e.g. "03_c" → assets/avatars/avatar_03_c.png
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

  // Pre-game backstory, generated once at creation and frozen — represents
  // their career before the player's network existed.
  legacyCredits: LegacyCredit[];
  legacyAwards: LegacyAward[];
  priorCareerEarnings: number;
}

export interface LegacyCredit {
  title: string;
  genre: Genre;
  year: number;
}

export interface LegacyAward {
  category: EmmyCategory;
  year: number;
  won: boolean;
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

// ─── Poster ──────────────────────────────────────────────────────────────────

export interface PosterConfig {
  backgroundID: string;
  titlePosition: 'top' | 'bottom';
  titleSize: 'small' | 'medium' | 'large';
  titleFont: 'bebas' | 'manrope-bold' | 'manrope-light';
  titleColor: string;
  titleAlignment: 'left' | 'center' | 'right';
  seasonPosition: 'above-title' | 'below-title';
  seasonAlignment: 'left' | 'center' | 'right';
  castPosition: 'top' | 'bottom';
  tagline: string;
  showSeasonNumber: boolean;
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

  showrunnerSlots: number;       // 1–3, decided at creation; 2–3 requires prestige ≥ 80
  leadActorSlots: number;       // decided at show creation
  supportingActorSlots: number; // decided at show creation
  showrunnerIDs: string[];       // index 0 = primary; filled during casting
  leadActorIDs: string[];       // filled during casting
  supportingActorIDs: string[]; // filled during casting
  directorID: string | null;
  scriptScore: number;  // 0–100 solo, up to 135 with writers room; calculated when writing wraps
  qualityScore: number; // 0–100, calculated at end of filming

  // Renewal suggestions — carry forward from the previous season
  suggestedShowrunnerIDs: string[];
  suggestedDirectorID: string | null;
  suggestedLeadActorIDs: string[];
  suggestedSupportingActorIDs: string[];

  isFinalSeason?: boolean; // player declared this the last season at renewal time
  posterConfig?: PosterConfig;
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
  heatMultiplier: number; // drifts up on hits, down on flops; floor 0.80, cap 2.0
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
  status: 'pre-production' | 'filming' | 'marketing' | 'airing' | 'completed' | 'cancelled';
  currentRating: number;
  weeklyViewers: number;
  seasonNumber: number;
  episodesAired: number;
  totalEpisodes: number;
  // Pipeline counters
  preProductionWeeksRemaining: number;
  filmingWeeksRemaining: number;
  marketingWeeksRemaining: number;
  // Quality baseline computed from talent stats at end of filming
  baseRating: number;
  // Viewer multiplier from marketing spend
  marketingViewerBoost: number;
  // Booked talent split by role for staged release
  bookedShowrunnerID: string | null;
  bookedDirectorID: string | null;
  bookedActorIDs: string[];
  // Emmy eligibility tracking — set when a season finishes airing
  lastSeasonCompletedYear: number | null;
  lastSeasonFinalRating: number | null;
}

export interface CompetitorStudio {
  id: string;
  name: string;
  prestige: number; // 0–100
  activeShows: CompetitorShow[];
  emmysWon: number;
  totalShowsProduced: number;
  tier: 'powerhouse' | 'established' | 'independent';
  capital: number;
  showsGreenlitThisYear: number;
  preferredGenres: Genre[];
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
  expiresWeek: number;
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
  nominationScore: number; // used to weight winner selection
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
  byline: string;
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

// ─── Loan Shark ──────────────────────────────────────────────────────────────

export interface ActiveLoan {
  id: string;
  principal: number;        // original amount borrowed
  amountOwed: number;       // grows 20% per week once overdue
  interestRate: number;     // e.g. 0.67 — increases with loan number
  takenWeek: number;
  takenYear: number;
  dueWeek: number;          // same week as taken, one year later
  dueYear: number;
  weeksOverdue: number;     // 0 while within grace period
  prestigePenaltyApplied: boolean; // one-time -5 prestige on first overdue tick
}

// ─── Full Game State ──────────────────────────────────────────────────────────
import { AmbientSocialPost } from '../engine/ambientsocial';

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
  studioEvents: StudioEvent[];
  emmyCeremonyPendingYear: number | null;
  activeLoan: ActiveLoan | null;
  loansTaken: number;
  saveSlot: number;
  lastSaved: string;
  initialized: boolean;
  ambientSocialPosts: AmbientSocialPost[];
  recentSocialTemplateIds: string[];
  recentAmbientTemplateIds: string[];
  unlockedAchievementIDs: string[];
  achievementQueue: string[];          // IDs of achievements pending toast display
}