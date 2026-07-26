# TV Studio Sim — Codebase Overview

## What the project is

A mobile-first TV network management simulation game built with **Expo / React Native**. The player runs an independent television studio: developing shows, hiring talent, scheduling air dates, negotiating streaming deals, and competing for Emmy awards. Time advances one in-game week at a time via a single "Advance Week" button.

---

## Tech stack

| Layer | Choices |
|---|---|
| Framework | Expo 56, React Native 0.85, React 19 |
| Navigation | `expo-router` (file-system routing, tab layout) |
| State | Zustand 5 — single global `useGameStore` |
| Persistence | `react-native-mmkv` (native key-value, fast) via a thin storage module |
| Fonts | `@expo-google-fonts/bebas-neue` (display) + `@expo-google-fonts/manrope` (body) |
| Animations | React Native `Animated` API (no external library) |
| Gradients | `expo-linear-gradient` |

---

## Directory layout

```
tvstudiosim/
├── app/                    Expo Router screens
│   ├── (tabs)/             Tab bar screens
│   │   ├── _layout.tsx     Tab navigator config
│   │   ├── index.tsx       Dashboard (home tab)
│   │   ├── shows.tsx       Shows list
│   │   ├── talent.tsx      Talent roster
│   │   ├── inbox.tsx       Inbox / notifications
│   │   ├── financials.tsx  Financial summary
│   │   └── media.tsx       Social reactions feed
│   ├── _layout.tsx         Root layout (font loading, stack navigator)
│   ├── show/[id].tsx       Show detail + season management
│   ├── talent/[id].tsx     Talent profile
│   ├── create-show.tsx     New show wizard
│   ├── hire-talent.tsx     Talent hiring / negotiation
│   ├── marketing.tsx       Marketing channel picker
│   ├── renew.tsx           Season renewal / cancellation decision
│   └── season-detail.tsx   Per-season breakdown
│
├── src/
│   ├── types/index.ts      All shared TypeScript types
│   ├── constants/game.ts   All tuning constants
│   ├── store/
│   │   ├── gameStore.ts    Zustand store (state + all actions)
│   │   └── storage.ts      MMKV persistence helpers
│   ├── engine/             Pure simulation functions (no UI, no store)
│   │   ├── advancement.ts  Core week-tick loop
│   │   ├── quality.ts      Script/quality score calculation
│   │   ├── ratings.ts      Episode rating + viewership + ad revenue
│   │   ├── talent.ts       Talent pool generation
│   │   ├── competitors.ts  AI competitor studio simulation
│   │   ├── emmys.ts        Emmy nomination + winner logic
│   │   ├── events.ts       Studio random-event templates + selector
│   │   ├── pitches.ts      Pitch generation
│   │   ├── streaming.ts    Streaming offer generation
│   │   ├── news.ts         News headline generation
│   │   └── social.ts       Social-media reaction generation
│   └── utils/
│       ├── nanoid.ts       Tiny ID generator
│       ├── random.ts       RNG helpers (randomBetween, randomFloat, etc.)
│       └── avatars.ts      Avatar ID pool
│
└── assets/                 Images and fonts
```

---

## Core data model (`src/types/index.ts`)

The complete game state is one `GameState` object:

```
GameState
├── network: Network          Player studio stats (cash, prestige, Emmys, week/year clock)
├── shows: Show[]             All shows ever created
│   └── seasons: Season[]
│       └── episodes: Episode[]
├── talent: Talent[]          All talent (showrunners, directors, actors)
├── talentDeals: TalentDeal[] Active/pending compensation records
├── pitches: Pitch[]          Pending external show pitches
├── competitors: CompetitorStudio[]
│   └── activeShows: CompetitorShow[]
├── newsItems: NewsItem[]     News feed (capped at 150)
├── inboxItems: InboxItem[]   Player notifications
├── awards: Award[]           Emmy nominations + wins (all years)
└── studioEvents: StudioEvent[] Random events awaiting resolution
```

**Show lifecycle** — a show's `status` field moves through these states:
`writing → filming → marketing → airing → renewal-pending → completed | cancelled`

**Talent roles** have different stat sets:
- `showrunner`: writing, creativity, consistency
- `director`: direction, vision, efficiency
- `actor`: acting, chemistry (+ a `chemistryColor` for cast-pairing bonus)

---

## State management (`src/store/gameStore.ts`)

One Zustand store, `useGameStore`, holds the entire `GameState` and exposes all mutation actions:

| Category | Actions |
|---|---|
| Setup | `initializeGame` |
| Time | `advanceWeek` (delegates to engine, then auto-saves) |
| Shows | `createShow`, `greenlightPitch`, `passPitch` |
| Talent | `hireShowrunner`, `hireDirector`, `hireActor`, `evaluateOffer` |
| Marketing | `setAirDate`, `purchaseMarketingChannels` |
| Renewal | `renewShow`, `cancelShow` |
| Streaming | `acceptStreamingOffer`, `declineStreamingOffer` |
| Inbox | `markInboxRead` |
| Events | `resolveStudioEvent` |
| Persistence | `saveGame`, `loadGame` |

`advanceWeek` is the only action that calls the engine — everything else is direct state mutation. `loadGame` includes a migration shim that fills in new fields added since a save was written.

---

## The week-tick engine (`src/engine/advancement.ts`)

`advanceWeek(state): GameState` is a pure function — it takes a snapshot and returns a new snapshot. Order of operations each tick:

1. **Increment clock** — week/year arithmetic wraps at week 52
2. **Advance each active show** — dispatches to `tickWriting`, `tickFilming`, `tickMarketing`, or `tickAiring`
3. **Detect phase transitions** — filming→marketing frees cast/director; premiere/finale episodes generate news
4. **Accumulate ad revenue** — episodes that aired this week add to `cashOnHand`
5. **Streaming housekeeping** — expire pending offers, run scheduled re-checks, generate new offers
6. **Expire + generate pitches** — up to 4 pitches per year at 8% weekly chance
7. **Advance competitors** — AI studios progress their shows, book/release talent
8. **Occasional industry news** — 12% weekly chance
9. **Emmy week 40** — calculate nominations (player + competitor shows)
10. **Emmy week 44** — determine winners, propagate prestige/stat effects
11. **Prune stale talent deals** — remove deals for talent no longer booked
12. **Maybe fire a studio event** — 28% weekly chance, cooldown-gated templates

---

## Quality and rating pipeline

Show quality flows through two sequential scores, both stored on the `Season`:

```
scriptScore (writing phase)
  = showrunner.writing × 0.50
  + showrunner.creativity × 0.30
  + showrunner.consistency × 0.20
  + ±6 variance

qualityScore (filming phase)
  = director.direction × 0.35
  + director.vision × 0.20
  + avgCastActing × 0.25
  + chemistryBonus × 0.20
  + ±8 variance
```

Each episode then computes:
```
combinedQuality = scriptScore × 0.45 + qualityScore × 0.55
baseRating = (combinedQuality / 100) × genre.ratingCeiling
rating = baseRating + momentum + ±0.4 noise

viewers = genre.baseViewers × marketingReach × organicBuzz
  where organicBuzz = (rating / 5.0) ^ 1.3

adRevenue = (viewers / 1000) × effectiveCPM
  where effectiveCPM = genre.cpm × (1 + (rating - 5) / 10)
```

Marketing channels apply a **reach multiplier** to viewership (not rating). Each channel has genre affinities and episode-level decay curves (e.g. social media spikes episode 1, press junkets build through the season).

---

## Talent system

**Pool size at game start:** 58 total — 14 showrunners, 14 directors, 30 actors across three tiers.

**Tiers** gate availability behind prestige thresholds:
- Low (prestige 0+): 26 talent
- Mid (prestige 21+): 20 talent
- High (prestige 61+): 12 talent

**Negotiation** — `evaluateOffer` computes the talent's minimum acceptable fee from their tier/popularity range × 0.85, then discounts slightly for high-prestige networks. The UI lets the player drag an offer slider and see acceptance probability in real time.

**Chemistry** — each actor has a `chemistryColor` (green/blue/red). Pairs with matching colors add to the `chemistryBonus` component of `qualityScore`.

**Legacy backstory** — every talent is generated with pre-game career credits and awards, giving them a realistic biography before the player's network exists.

---

## Competitor AI (`src/engine/competitors.ts`)

Five competitor studios run in parallel. Each week they:
- Greenlight new shows at 8% chance (max 3 active per studio)
- Advance pre-production → filming → airing pipeline
- Book and release shared talent (same pool the player uses)
- Cancel underperforming shows (average rating < 4.5)
- Gain/lose prestige based on ratings

Competitors nominate for Emmys and win them, which affects their prestige and creates news events the player sees.

---

## Studio events (`src/engine/events.ts`)

A 28% weekly chance fires one templated random event. There are 17 templates in four categories:

| Category | Examples |
|---|---|
| Production | Writers room friction, filming over schedule, network notes standoff, casting disagreement, location dispute |
| Talent | Poaching attempt, actor tabloid story, showrunner passion project, director creative vision |
| Industry | Genre fatigue article, advertiser bonus offer, streaming think piece, guild strike, ratings surge |
| Legacy | Cancelled show revival petition, show anniversary, legacy talent interview |

Each event presents 2–3 choices with `EventConsequence` payloads: prestige delta, cash delta, production delay, or a news headline. Templates respect per-key cooldown periods (6–20 weeks) to prevent repetition.

---

## Screens

| Screen | Path | Purpose |
|---|---|---|
| Dashboard | `(tabs)/index.tsx` | Central HUB: network stats, active shows, tasks, inbox preview, advance-week button, studio event modal |
| Shows | `(tabs)/shows.tsx` | Full show list including completed/cancelled |
| Talent | `(tabs)/talent.tsx` | Roster with availability and stats |
| Inbox | `(tabs)/inbox.tsx` | Notifications — pitches, streaming offers, Emmy results, revenue payouts |
| Financials | `(tabs)/financials.tsx` | Season-by-season P&L, per-show revenue breakdown |
| Media | `(tabs)/media.tsx` | Social reaction feed per episode |
| Show detail | `show/[id].tsx` | Season tabs, episode heatmap, production status, streaming deals |
| Talent profile | `talent/[id].tsx` | Stats, chemistry, legacy credits, awards history |
| Create show | `create-show.tsx` | Multi-step wizard: title, genre, theme, episode count, cast slots |
| Hire talent | `hire-talent.tsx` | Role-filtered talent list, offer negotiation with accept/reject feedback |
| Marketing | `marketing.tsx` | Channel selection with cost, reach, and genre affinity display |
| Renewal | `renew.tsx` | Season recap, renew vs. cancel decision, optional slot adjustment |
| Season detail | `season-detail.tsx` | Episode-level stats and social reactions |

---

## Design system

All screens share a consistent dark-gold visual language defined inline in each file:

- **Background**: `#0f1220` (near-black navy)
- **Cards**: `#191c2a` / `#1d2035`
- **Accent**: `#e6b254` (gold) — used for primary actions, prestige, money values
- **Status colors**: green (airing), amber (filming), blue (writing), teal (marketing), red (cancelled/urgent)
- **Display font**: Bebas Neue (all-caps headings, numbers)
- **Body font**: Manrope (weights 400–800)

---

## Key constants (`src/constants/game.ts`)

| Constant | Value | Meaning |
|---|---|---|
| `WEEKS_PER_YEAR` | 52 | Game calendar |
| `WRITING_WEEKS` | 3 | Fixed writing phase duration |
| `STARTING_CASH` | $15M | Player starting budget |
| `STARTING_PRESTIGE` | 10 | Player starting prestige (Indie tier) |
| `EMMY_NOMINATION_WEEK` | 40 | When nominations are calculated |
| `EMMY_CEREMONY_WEEK` | 44 | When winners are determined |
| `PITCH_GENERATE_CHANCE` | 8%/week | How often a new pitch arrives |
| `COMPETITOR_GREENLIGHT_CHANCE` | 8%/week | AI show creation rate |
| `COMPETITOR_CANCEL_THRESHOLD` | 4.5 avg rating | AI cancellation floor |

Genre `ratingCeiling` values: limited-series 10.0, drama 9.5, sci-fi 9.0, comedy 8.0, procedural 7.5, reality 6.5.

---

## Persistence

`src/store/storage.ts` wraps MMKV with async `saveGameToStorage` / `loadGameFromStorage`. The store calls save automatically on every `advanceWeek`. `loadGame` includes a migration shim that patches old save shapes to the current type structure (particularly streaming fields added in a later version).
