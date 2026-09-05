import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated, Image, Modal,
  Easing, useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { LinearGradient } from 'expo-linear-gradient';
import { useGameStore } from '../../src/store/gameStore';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, useMemo } from 'react';
import { LogoBadge } from '../components/LogoBadge';
import { TutorialTarget } from '../components/TutorialTarget';
import { useTutorialStore } from '../../src/store/tutorialStore';
import { Show, NewsItem, StudioEvent } from '../../src/types';
import { WEEKS_PER_YEAR } from '../../src/constants/game';
import { THEME_WINDOWS } from '../../src/constants/schedule';
import { EmmyCeremonyModal } from '../components/EmmyCeremonyModal';
import WeeklyRecapModal from '../components/WeeklyRecapModal';
import { hap } from '../../src/utils/haptics';

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  pageBg:      '#0f1220',
  cardBg:      '#191c2a',
  cardBg2:     '#1d2035',
  border:      '#252840',
  borderGold:  '#e6b25430',  // gold @ 18% opacity
  borderGold55:'#e6b2548c',  // gold @ 55% opacity

  text:        '#f0ede8',
  muted:       '#9a958e',
  mutedMid:    '#6b6880',

  gold:        '#e6b254',
  goldDim:     '#e6b25420',
  goldMid:     '#c49440',
  goldBtnText: '#161008',

  green:       '#4ec46e',
  greenBg:     '#1a3325',
  amber:       '#d4753a',
  amberBg:     '#2a1f12',
  red:         '#c43820',
  redBg:       '#2a130f',
  blue:        '#cccee0',
  blueBg:      '#141e33',
  teal:        '#3db8a8',
  tealBg:      '#0f2525',
};

// Font helpers
const F = {
  display: 'BebasNeue_400Regular',
  body:    'Manrope_400Regular',
  bodyMd:  'Manrope_600SemiBold',
  bodyBd:  'Manrope_700Bold',
  bodyXBd: 'Manrope_800ExtraBold',
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; borderColor: string }> = {
  airing:            { label: 'AIRING',    color: C.green, bg: '#0f2a1a', borderColor: '#4ec46e55' },
  filming:           { label: 'FILMING',   color: C.amber, bg: C.amberBg, borderColor: '#d4753a55' },
  writing:           { label: 'WRITING',   color: C.blue,  bg: C.blueBg,  borderColor: '#cccee055' },
  marketing:         { label: 'MKT',       color: C.teal,  bg: C.tealBg,  borderColor: '#3db8a855' },
  'renewal-pending': { label: 'RENEWAL',   color: C.gold,  bg: '#261e0a', borderColor: '#e6b25455' },
  completed:         { label: 'DONE',      color: C.muted, bg: C.cardBg2, borderColor: '#9a958e44' },
  cancelled:         { label: 'CANCELLED', color: C.red,   bg: C.redBg,   borderColor: '#c4382055' },
};

function fmt(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs}`;
}

function fmtViewers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

// ── Film ribbon ambient texture ───────────────────────────────────────────────
function FilmRibbonAmbient() {
  return (
    <Image
      source={require('../../assets/tvbg.png')}
      style={[StyleSheet.absoluteFill, { tintColor: C.gold, opacity: 0.06 }]}
      resizeMode="repeat"
      pointerEvents="none"
    />
  );
}

// ── Decorative dot row ────────────────────────────────────────────────────────
function DotRow() {
  return (
    <View style={s.dotRow}>
      {Array.from({ length: 50 }).map((_, i) => (
        <View key={i} style={s.dot} />
      ))}
    </View>
  );
}

// ── DEADLINE news card ────────────────────────────────────────────────────────
function NewsCard({ item, week, year }: { item: NewsItem | null; week: number; year: number }) {
  const headline = item?.headline ?? 'Welcome to TV Studio Sim';
  const body     = item?.body     ?? 'Greenlight your first show to get started. The ratings race begins now.';
  const cardWeek = item?.week ?? week;
  const cardYear = item?.year ?? year;

  return (
    <View style={s.newsCard}>
      <View style={s.newsCardTopRow}>
        <View style={s.newsDeadlinePill}>
          <Text style={s.newsDeadlinePillText}>DEADLINE</Text>
        </View>
        <Text style={s.newsWeekLabel}>Week {cardWeek} · Year {cardYear}</Text>
      </View>
      <Text style={s.newsHeadline}>{headline}</Text>
      <Text style={s.newsBody} numberOfLines={3}>{body}</Text>
    </View>
  );
}

// ── Rating dot (episode heatmap) ──────────────────────────────────────────────
function RatingDot({ rating, empty }: { rating: number | null; empty?: boolean }) {
  let color = C.border;
  if (!empty && rating !== null) {
    color = rating >= 8 ? '#3db87a' : rating >= 6.5 ? '#7db840' : rating >= 5 ? '#c8a135' : '#c04040';
  }
  return <View style={[s.ratingDot, { backgroundColor: color }]} />;
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, valueColor }: {
  label: string; value: string; valueColor?: string;
}) {
  return (
    <View style={s.statCard}>
      <Text style={s.statCardLabel}>{label}</Text>
      <Text style={[s.statCardValue, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
    </View>
  );
}

// ── News ticker (chyron) ──────────────────────────────────────────────────────
function NewsTicker({ items }: { items: NewsItem[] }) {
  const { width: SW } = useWindowDimensions();
  const translateX = useRef(new Animated.Value(0)).current;
  const textWidthRef = useRef(0);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const tickerText = items.length === 0
    ? '     NO NEWS THIS WEEK     '
    : items.map(item => `     ${item.headline}     `).join('');

  function runTicker(textWidth: number) {
    if (textWidth === 0) return;
    animRef.current?.stop();
    translateX.setValue(SW);
    animRef.current = Animated.loop(
      Animated.timing(translateX, {
        toValue: -textWidth,
        duration: ((textWidth + SW) / 65) * 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animRef.current.start();
  }

  useEffect(() => {
    if (textWidthRef.current > 0) runTicker(textWidthRef.current);
    return () => animRef.current?.stop();
  }, [tickerText, SW]);

  return (
    <View style={tk.strip}>
      <View style={tk.pill}>
        <Text style={tk.pillText}>NEWS</Text>
      </View>
      <View style={tk.textArea}>
        <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, width: 4000, justifyContent: 'center', transform: [{ translateX }] }}>
          <Text
            style={tk.text}
            onTextLayout={e => {
              const line = e.nativeEvent.lines[0];
              if (line && line.width > 0 && line.width !== textWidthRef.current) {
                textWidthRef.current = line.width;
                runTicker(line.width);
              }
            }}
          >
            {tickerText}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

// ── Schedule mini-strip ───────────────────────────────────────────────────────
function ScheduleStrip({ currentWeek, currentYear, onPress }: {
  currentWeek: number; currentYear: number; onPress: () => void;
}) {
  const VISIBLE = 7;
  const half = Math.floor(VISIBLE / 2);
  const weeks = Array.from({ length: VISIBLE }, (_, i) => {
    const raw = currentWeek - half + i;
    const week = ((raw - 1 + WEEKS_PER_YEAR) % WEEKS_PER_YEAR) + 1;
    return { week, offset: raw - currentWeek };
  });

  return (
    <TouchableOpacity style={sc.strip} onPress={onPress} activeOpacity={0.85}>
      <View style={sc.stripHeader}>
        <Text style={sc.stripLabel}>SCHEDULE</Text>
        <Text style={sc.stripAction}>VIEW FULL →</Text>
      </View>
      <View style={sc.stripCells}>
        {weeks.map(({ week, offset }) => {
          const win = THEME_WINDOWS.find(tw => week >= tw.startWeek && week <= tw.endWeek);
          const isCurrent = offset === 0;
          const cellBg    = isCurrent ? '#1e2a18' : 'transparent';
          const cellBorder= isCurrent ? C.green + '88' : 'transparent';
          const numColor  = isCurrent ? C.green : C.mutedMid;

          return (
            <View
              key={week}
              style={[sc.cell, { backgroundColor: cellBg, borderColor: cellBorder }]}
            >
              {win && (
                <Text style={sc.cellEmoji}>{win.emoji}</Text>
              )}
              <Text style={[sc.cellWeek, { color: numColor }]}>{week}</Text>
              {isCurrent && <Text style={sc.cellNow}>NOW</Text>}
            </View>
          );
        })}
      </View>
    </TouchableOpacity>
  );
}

// ── Show card ─────────────────────────────────────────────────────────────────
function ShowCard({ show, onPress }: { show: Show; onPress: () => void }) {
  const season = show.seasons[show.currentSeasonIndex];
  if (!season) return null;

  const meta       = STATUS_META[show.status] ?? STATUS_META.completed;
  const genreLabel = show.genre.replace('-', ' ').toUpperCase();

  const avgRating = season.episodes
    .filter(e => e.rating !== null)
    .reduce((acc, e, _, arr) => acc + (e.rating ?? 0) / arr.length, 0);

  const progressPct =
    show.status === 'writing'
      ? (season.writingWeeksCompleted / season.writingWeeksTotal) * 100
      : show.status === 'filming'
      ? (season.filmingWeeksCompleted / season.filmingWeeksTotal) * 100
      : show.status === 'marketing'
      ? (season.marketingWeeksCompleted / Math.max(season.marketingWeeksTotal, 1)) * 100
      : 0;

  const progressLabel =
    show.status === 'writing'
      ? `Wk ${season.writingWeeksCompleted + 1} / ${season.writingWeeksTotal}`
      : show.status === 'filming'
      ? `Ep ${season.filmingWeeksCompleted + 1} / ${season.filmingWeeksTotal}`
      : show.status === 'marketing' && season.airDateWeek != null
      ? `Premieres Y${season.airDateYear} W${season.airDateWeek}`
      : show.status === 'marketing'
      ? 'No air date set'
      : '';

  const subDetail =
    show.status === 'filming'
      ? [
          season.directorID ? 'Director locked' : 'No director',
          `${season.leadActorIDs.length}/${season.leadActorSlots} lead cast`,
        ].join(' · ')
      : show.status === 'writing'
      ? `${season.episodeCount} episodes · Script in progress`
      : show.status === 'marketing' && season.airDateWeek != null
      ? `${season.marketingChannelIDs.length} channel${season.marketingChannelIDs.length !== 1 ? 's' : ''} active`
      : '';

  const isAiring = show.status === 'airing' || show.status === 'renewal-pending';

  return (
    <TouchableOpacity style={s.showCard} onPress={onPress} activeOpacity={0.85}>
      <View style={s.showCardInner}>
        {/* Header row */}
        <View style={s.showCardHeader}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={s.showTitle} numberOfLines={1}>{show.title.toUpperCase()}</Text>
            <Text style={s.showGenre}>{genreLabel} · S{show.currentSeasonIndex + 1}</Text>
          </View>
          <View style={[s.statusCapsule, { backgroundColor: meta.bg, borderColor: meta.borderColor }]}>
            <Text style={[s.statusCapsuleText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        {isAiring ? (
          <>
            <View style={s.heatmap}>
              {Array.from({ length: season.episodeCount }, (_, i) => (
                <RatingDot key={i} rating={season.episodes[i]?.rating ?? null} empty={i >= season.episodesAired} />
              ))}
            </View>

            {show.pendingStreamingOffer && (
              <View style={s.streamBanner}>
                <Text style={s.streamText}>
                  🎬 {show.pendingStreamingOffer.platformName} offer · up to {fmt(show.pendingStreamingOffer.exclusiveAmount)}
                </Text>
              </View>
            )}

            <View style={s.showStatsRow}>
              <View style={s.showStatCell}>
                <Text style={s.showStatVal}>{avgRating > 0 ? avgRating.toFixed(1) : '—'}</Text>
                <Text style={s.showStatLbl}>AVG RATING</Text>
              </View>
              <View style={[s.showStatCell, s.showStatCellBorder]}>
                <Text style={s.showStatVal}>
                  {season.totalViewers > 0
                    ? fmtViewers(Math.round(season.totalViewers / Math.max(season.episodesAired, 1)))
                    : '—'}
                </Text>
                <Text style={s.showStatLbl}>VIEWERS / EP</Text>
              </View>
              <View style={s.showStatCell}>
                <Text style={s.showStatVal}>{fmt(season.totalAdRevenue)}</Text>
                <Text style={s.showStatLbl}>AD REVENUE</Text>
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={s.progressRow}>
              <Text style={s.progressLabel}>{progressLabel}</Text>
              <Text style={[s.progressPct, { color: meta.color }]}>{Math.round(progressPct)}%</Text>
            </View>
            <View style={s.progressTrack}>
              <LinearGradient
                colors={['#c49440', '#e6b254']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[s.progressFill, { width: `${Math.max(progressPct, 2)}%` as any }]}
              />
            </View>
            {!!subDetail && <Text style={s.showSubDetail}>{subDetail}</Text>}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Studio Event Modal ────────────────────────────────────────────────────────
const EVENT_COLORS: Record<string, string> = {
  production: '#d4753a',
  talent:     '#5b8dee',
  industry:   '#3db8a8',
  legacy:     '#e6b254',
};

function fmtDelta(n: number): string {
  const sign = n < 0 ? '-' : '+';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs}`;
}

function StudioEventModal({ event: ev, visible }: { event: StudioEvent; visible: boolean }) {
  const { resolveStudioEvent } = useGameStore();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const typeColor = EVENT_COLORS[ev.type] ?? '#9a958e';

  function handleConfirm() {
    if (selectedIndex === null) return;
    hap.medium();
    resolveStudioEvent(ev.id, selectedIndex);
    // Modal disappears automatically when the store marks the event resolved
    // and pendingEvent becomes null in the parent — no manual dismiss needed.
  }

  const chosen = selectedIndex !== null ? ev.choices[selectedIndex] : null;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={m.overlay}>
        <View style={m.card}>
          {/* Event type badge + type label */}
          <View style={m.topRow}>
            <View style={[m.typeBadge, { backgroundColor: typeColor + '22', borderColor: typeColor + '88' }]}>
              <Text style={[m.typeBadgeText, { color: typeColor }]}>{ev.type.toUpperCase()}</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={m.title}>{ev.title.toUpperCase()}</Text>

          {/* Situation body */}
          <Text style={m.body}>{ev.body}</Text>

          {/* Divider */}
          <View style={m.divider} />

          {/* Choices or confirm */}
          {selectedIndex === null ? (
            <View style={m.choicesCol}>
              {ev.choices.map((choice, i) => (
                <TouchableOpacity
                  key={i}
                  style={m.choiceCard}
                  onPress={() => setSelectedIndex(i)}
                  activeOpacity={0.75}
                >
                  <View style={m.choiceRow}>
                    <Text style={m.choiceLabel}>{choice.label}</Text>
                    <Text style={[m.choiceArrow, { color: typeColor }]}>›</Text>
                  </View>
                  <Text style={m.choiceDesc}>{choice.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View>
              <View style={[m.selectedCard, { borderColor: typeColor + '66' }]}>
                <Text style={[m.selectedLabel, { color: typeColor }]}>{chosen!.label}</Text>
                <Text style={m.selectedDesc}>{chosen!.description}</Text>
                {((chosen!.consequence.prestigeDelta ?? 0) !== 0 || (chosen!.consequence.cashDelta ?? 0) !== 0) && (
                  <View style={m.consequenceRow}>
                    {(chosen!.consequence.prestigeDelta ?? 0) !== 0 && (
                      <Text style={[m.consequenceStat, { color: (chosen!.consequence.prestigeDelta ?? 0) > 0 ? '#4ec46e' : '#c43820' }]}>
                        {(chosen!.consequence.prestigeDelta ?? 0) > 0 ? '+' : ''}{chosen!.consequence.prestigeDelta} Prestige
                      </Text>
                    )}
                    {(chosen!.consequence.cashDelta ?? 0) !== 0 && (
                      <Text style={[m.consequenceStat, { color: (chosen!.consequence.cashDelta ?? 0) > 0 ? '#4ec46e' : '#c43820' }]}>
                        {fmtDelta(chosen!.consequence.cashDelta ?? 0)}
                      </Text>
                    )}
                  </View>
                )}
              </View>
              <View style={m.confirmRow}>
                <TouchableOpacity style={m.backBtn} onPress={() => setSelectedIndex(null)}>
                  <Text style={m.backBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={m.confirmBtn} onPress={handleConfirm}>
                  <LinearGradient
                    colors={[typeColor + 'cc', typeColor]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={m.confirmBtnGrad}
                  >
                    <Text style={m.confirmBtnText}>Confirm</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    network, shows, inboxItems, newsItems, pitches, studioEvents,
    emmyCeremonyPendingYear,
    advanceWeek, initialized, initializeGame,
  } = useGameStore();

  const [fadedIds, setFadedIds]   = useState<Set<string>>(new Set());
  const fadeAnims   = useRef<Record<string, Animated.Value>>({});
  const expiringRef = useRef<Set<string>>(new Set());
  const glowAnim    = useRef(new Animated.Value(0)).current;
  const scrollRef   = useRef<ScrollView>(null);
  const tasksYRef   = useRef<number>(0);

  const [recapVisible, setRecapVisible]   = useState(false);
  const [recapWeek,    setRecapWeek]      = useState(1);
  const [recapYear,    setRecapYear]      = useState(1);

  const tutorialStep   = useTutorialStore(s => s.step);
  const tutorialActive = useTutorialStore(s => s.active);
  const tutorialAdvance = useTutorialStore(s => s.advance);
  const tutorialJumpTo  = useTutorialStore(s => s.jumpTo);

  // Derive the current pending event directly — when it's resolved in the store
  // this becomes null and the modal disappears automatically with no stale-closure issues.
  const pendingEvent = (studioEvents ?? []).find(e => !e.resolved) ?? null;

  // Advance button ripple — one-way pulse: expands out and fades, instant reset
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(glowAnim, { toValue: 1, duration: 1400, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, []);

  function itemAgeWeeks(item: { week: number; year: number }) {
    return (network.currentYear - item.year) * WEEKS_PER_YEAR + (network.currentWeek - item.week);
  }

  useEffect(() => {
    if (!initialized) return;
    const newExpiring = inboxItems.filter(
      i => !i.read && itemAgeWeeks(i) >= 2 && !expiringRef.current.has(i.id) && !fadedIds.has(i.id)
    );
    newExpiring.forEach(item => {
      expiringRef.current.add(item.id);
      fadeAnims.current[item.id] = new Animated.Value(1);
      Animated.timing(fadeAnims.current[item.id], {
        toValue: 0, duration: 600, useNativeDriver: true,
      }).start(() => {
        setFadedIds(prev => new Set([...prev, item.id]));
      });
    });
  }, [network.currentWeek, network.currentYear, initialized]);

  // ── New-game redirect ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!initialized) {
      router.replace('/home' as any);
    }
  }, [initialized]);

  // ── Tutorial game-state reactions ────────────────────────────────────────────
  useEffect(() => {
    if (!tutorialActive) return;
    const hasFilming   = shows.some(s => s.status === 'filming');
    const hasMarketing = shows.some(s => ['marketing', 'airing', 'renewal-pending', 'completed', 'cancelled'].includes(s.status));
    const hasAiring    = shows.some(s => s.status === 'airing' || s.status === 'renewal-pending');

    if (tutorialStep === 'show-writing' && hasFilming) {
      tutorialJumpTo('post-writing-tasks');
    } else if (tutorialStep === 'waiting-for-marketing' && hasMarketing) {
      tutorialJumpTo('post-filming');
    } else if (tutorialStep === 'marketing-channels' && hasAiring) {
      tutorialJumpTo('episode-aired');
    }
  }, [shows, tutorialStep, tutorialActive]);

  // ── Tutorial scroll-to-tasks when post-writing-tasks activates ───────────────
  useEffect(() => {
    if (tutorialStep === 'post-writing-tasks' && tasksYRef.current > 0) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: tasksYRef.current - 16, animated: true });
      }, 350);
    }
  }, [tutorialStep]);

  if (!initialized) return null;

  // ── Derived data ────────────────────────────────────────────────────────────
  const activeShows = shows
    .filter(sh => ['writing', 'filming', 'marketing', 'airing', 'renewal-pending'].includes(sh.status))
    .sort((a, b) => {
      const airingScore = (sh: typeof a) => sh.status === 'airing' ? 1 : 0;
      if (airingScore(b) !== airingScore(a)) return airingScore(b) - airingScore(a);
      // Both airing: most recently aired episode first
      const aEps = a.seasons[a.currentSeasonIndex]?.episodesAired ?? 0;
      const bEps = b.seasons[b.currentSeasonIndex]?.episodesAired ?? 0;
      return bEps - aEps;
    });

  const unreadInbox = inboxItems
    .filter(i => !i.read && !fadedIds.has(i.id) && (itemAgeWeeks(i) < 2 || expiringRef.current.has(i.id)))
    .slice(0, 3);

  const TYPE_PRIORITY_TICKER: Record<string, number> = { player: 0, emmy: 1, competitor: 2, industry: 3 };
  const tickerItems = useMemo(() => {
    if (newsItems.length === 0) return [];
    const thisWeek = newsItems
      .filter(n => n.week === network.currentWeek && n.year === network.currentYear)
      .sort((a, b) => (TYPE_PRIORITY_TICKER[a.type] ?? 4) - (TYPE_PRIORITY_TICKER[b.type] ?? 4));
    return thisWeek.length > 0 ? thisWeek : [newsItems[newsItems.length - 1]];
  }, [newsItems, network.currentWeek, network.currentYear]);

  // ── Tasks ───────────────────────────────────────────────────────────────────
  type TaskItem = {
    id: string; label: string; sub: string;
    urgency: 'red' | 'amber' | 'purple';
    route: string | { pathname: string; params: Record<string, string> };
  };
  const tasks: TaskItem[] = [];

  for (const show of activeShows) {
    const season = show.seasons[show.currentSeasonIndex];
    if (!season) continue;

    if (show.status === 'renewal-pending') {
      tasks.push({ id: `renew-${show.id}`, label: 'Renew or cancel', sub: show.title, urgency: 'red', route: `/renew?showID=${show.id}` });
    }
    if (show.status === 'filming') {
      if (!season.directorID) {
        tasks.push({ id: `director-${show.id}`, label: 'Hire director', sub: show.title, urgency: 'amber', route: `/hire-talent?showID=${show.id}&role=director` });
      }
      if (season.leadActorIDs.length < season.leadActorSlots) {
        const filled = season.leadActorIDs.length, total = season.leadActorSlots;
        tasks.push({ id: `lead-${show.id}`, label: `Hire lead actor${total - filled > 1 ? 's' : ''} (${filled}/${total})`, sub: show.title, urgency: 'amber', route: `/hire-talent?showID=${show.id}&role=actor&actorType=lead` });
      }
      if (season.supportingActorIDs.length < season.supportingActorSlots) {
        const filled = season.supportingActorIDs.length, total = season.supportingActorSlots;
        tasks.push({ id: `supporting-${show.id}`, label: `Hire supporting cast (${filled}/${total})`, sub: show.title, urgency: 'purple', route: `/hire-talent?showID=${show.id}&role=actor&actorType=supporting` });
      }
    }
    if (show.status === 'marketing' && season.airDateWeek === null) {
      tasks.push({ id: `airdate-${show.id}`, label: 'Schedule air date', sub: show.title, urgency: 'amber', route: `/show/${show.id}` });
    }
  }

  for (const pitch of pitches) {
    if (pitch.passed || pitch.greenlitByPlayer) continue;
    const weeksLeft = (pitch.expiresYear - network.currentYear) * WEEKS_PER_YEAR + (pitch.expiresWeek - network.currentWeek);
    if (weeksLeft <= 2 && weeksLeft >= 0) {
      const inboxItem = inboxItems.find(i => i.type === 'pitch' && i.refID === pitch.id);
      if (inboxItem) {
        tasks.push({ id: `pitch-${pitch.id}`, label: `Pitch expiring in ${weeksLeft} wk${weeksLeft !== 1 ? 's' : ''}`, sub: pitch.title, urgency: weeksLeft <= 1 ? 'red' : 'amber', route: { pathname: '/(tabs)/inbox', params: { itemID: inboxItem.id } } });
      }
    }
  }

  for (const show of shows) {
    if (!show.pendingStreamingOffer) continue;
    const offer = show.pendingStreamingOffer;
    const inboxItem = inboxItems.find(i => i.type === 'streaming-offer' && i.refID === show.id);
    const weeksLeft = (offer.expiresYear - network.currentYear) * WEEKS_PER_YEAR + (offer.expiresWeek - network.currentWeek);
    if (weeksLeft <= 1 && weeksLeft >= 0 && inboxItem) {
      tasks.push({ id: `stream-${show.id}`, label: 'Streaming offer expires soon', sub: show.title, urgency: 'red', route: { pathname: '/(tabs)/inbox', params: { itemID: inboxItem.id } } });
    }
  }

  tasks.sort((a, b) => ({ red: 0, amber: 1, purple: 2 }[a.urgency] - { red: 0, amber: 1, purple: 2 }[b.urgency]));

  const nextWeek = network.currentWeek + 1 > WEEKS_PER_YEAR ? 1 : network.currentWeek + 1;
  const nextYear = network.currentWeek + 1 > WEEKS_PER_YEAR ? network.currentYear + 1 : network.currentYear;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <LinearGradient
      colors={['#141726', '#0c0f1a', '#070a12']}
      locations={[0, 0.55, 1]}
      style={{ flex: 1 }}
    >
      <FilmRibbonAmbient />
      <SafeAreaView edges={[]} style={s.container}>
        <ScrollView ref={scrollRef} style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ── Header ── */}
          <View style={[s.header, { paddingTop: insets.top }]}>
            <View style={s.headerRow}>
              {/* Network badge */}
              <LogoBadge size={46} initials={network.initials} config={network.logoConfig} />

              {/* Network name + subtitle */}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.networkName}>{network.name.toUpperCase()}</Text>
                <Text style={s.networkSub}>Independent · Year {network.currentYear}</Text>
              </View>

              {/* Week widget — tappable, leads to schedule */}
              <TouchableOpacity style={s.weekCard} onPress={() => router.push('/schedule')} activeOpacity={0.8}>
                <Text style={s.weekCardLabel}>WEEK</Text>
                <Text style={s.weekCardNumber}>{network.currentWeek}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── News ticker chyron ── */}
          <NewsTicker items={tickerItems} />

          {/* ── Stats 2×2 grid ── */}
          <View style={s.statsGrid}>
            <StatCard
              label="CASH ON HAND"
              value={fmt(network.cashOnHand)}
              valueColor={C.gold}
            />
            <StatCard
              label="CAREER EARNINGS"
              value={fmt(network.careerEarnings)}
            />
            <StatCard
              label="ACTIVE SHOWS"
              value={String(activeShows.length)}
              valueColor={C.gold}
            />
            <StatCard
              label="EMMYS WON"
              value={String(network.emmysWon)}
            />
          </View>

          {/* ── Schedule strip (hidden — week card taps to schedule instead) ── */}
          {/*
          <ScheduleStrip
            currentWeek={network.currentWeek}
            currentYear={network.currentYear}
            onPress={() => router.push('/schedule')}
          />
          */}

          {/* ── Tasks ── */}
          {tasks.length > 0 && (
            <>
              <TutorialTarget
                stepID="post-writing-tasks"
                style={s.sectionHeader}
                onLayout={e => { tasksYRef.current = e.nativeEvent.layout.y; }}
              >
                <Text style={s.sectionTitle}>TASKS</Text>
                <View style={s.taskCountPill}>
                  <Text style={s.taskCountText}>{tasks.length}</Text>
                </View>
              </TutorialTarget>
              {tasks.map(task => {
                const dotColor = task.urgency === 'red' ? C.red : C.gold;
                return (
                  <TouchableOpacity
                    key={task.id}
                    style={s.taskRow}
                    onPress={() => router.push(task.route as any)}
                    activeOpacity={0.8}
                  >
                    <View style={[s.taskDot, { backgroundColor: dotColor }]} />
                    <View style={s.taskBody}>
                      <Text style={s.taskLabel}>{task.label}</Text>
                      <Text style={s.taskSub}>{task.sub.toUpperCase()}</Text>
                    </View>
                    <Text style={s.chevron}>›</Text>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {/* ── Inbox preview ── */}
          {unreadInbox.length > 0 && (
            <>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>INBOX</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/inbox')}>
                  <Text style={s.sectionAction}>VIEW ALL →</Text>
                </TouchableOpacity>
              </View>
              {unreadInbox.map(item => {
                const anim = fadeAnims.current[item.id];
                const inner = (
                  <TouchableOpacity
                    style={s.inboxRow}
                    onPress={() => router.push({ pathname: '/(tabs)/inbox', params: { itemID: item.id } })}
                    activeOpacity={0.8}
                  >
                    <View style={s.inboxDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.inboxTitle}>{item.title}</Text>
                      <Text style={s.inboxPreview} numberOfLines={1}>{item.preview}</Text>
                    </View>
                    <Text style={s.inboxChevron}>›</Text>
                  </TouchableOpacity>
                );
                return anim
                  ? <Animated.View key={item.id} style={{ opacity: anim }}>{inner}</Animated.View>
                  : <View key={item.id}>{inner}</View>;
              })}
            </>
          )}

          {/* ── Your Slate ── */}
          <View style={[s.sectionHeader, { marginTop: 10 }]}>
            <Text style={s.sectionTitle}>YOUR SLATE</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              {activeShows.length > 0 && (
                <Text style={s.sectionMeta}>{activeShows.length} in production</Text>
              )}
              <TouchableOpacity onPress={() => {
                if (tutorialStep === 'create-show') tutorialAdvance();
                router.push('/create-show');
              }}>
                <Text style={s.sectionAction}>+ NEW SHOW</Text>
              </TouchableOpacity>
            </View>
          </View>

          {activeShows.length === 0 ? (
            <TouchableOpacity style={s.emptyCard} onPress={() => {
              if (tutorialStep === 'create-show') tutorialAdvance();
              router.push('/create-show');
            }}>
              {tutorialStep === 'create-show' && (
                <TutorialTarget stepID="create-show" style={StyleSheet.absoluteFill} pointerEvents="none" />
              )}
              <Text style={s.emptyTitle}>NO ACTIVE SHOWS</Text>
              <Text style={s.emptyBody}>Greenlight a pitch or create your first show to get started.</Text>
              <View style={s.emptyAction}>
                <Text style={s.emptyActionText}>+ CREATE SHOW</Text>
              </View>
            </TouchableOpacity>
          ) : (
            activeShows.map((show, idx) => {
              const isWriting   = show.status === 'writing' && idx === 0 && tutorialStep === 'show-writing';
              const isFilming   = show.status === 'filming' && idx === 0 && tutorialStep === 'post-writing-tasks';
              const isMarketing = show.status === 'marketing' && idx === 0 && tutorialStep === 'post-filming';
              const isAired     = (show.status === 'airing' || show.status === 'renewal-pending') && idx === 0 && tutorialStep === 'episode-aired';
              const targetStep  = isWriting ? 'show-writing'
                                : isFilming ? 'post-writing-tasks'
                                : isMarketing ? 'post-filming'
                                : isAired ? 'episode-aired'
                                : null;
              return (
                <View key={show.id} style={{ position: 'relative' }}>
                  {targetStep && (
                    <TutorialTarget stepID={targetStep} style={StyleSheet.absoluteFill} pointerEvents="none" />
                  )}
                  <ShowCard show={show} onPress={() => router.push(`/show/${show.id}`)} />
                </View>
              );
            })
          )}

          <View style={{ height: 24 }} />
        </ScrollView>

        {/* ── Advance Week button ── */}
        <TutorialTarget stepID="dashboard" style={s.advanceWrap}>
          <Animated.View
            style={[
              s.advanceGlowRing,
              {
                opacity: glowAnim.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.55, 0] }),
                transform: [{
                  scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }),
                }],
              },
            ]}
          />
          <TouchableOpacity style={s.advanceBtn} onPress={() => {
            hap.medium();
            if (tutorialStep === 'dashboard') tutorialAdvance();
            setTimeout(() => {
              setRecapWeek(nextWeek);
              setRecapYear(nextYear);
              setRecapVisible(true);
              advanceWeek();
            }, 16);
          }} activeOpacity={0.88}>
            <LinearGradient
              colors={['#f0c060', '#c49440']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.advanceBtnGradient}
            >
              <Text style={s.advanceBtnText}>
                ADVANCE TO Y{nextYear} · W{nextWeek}  ▶
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </TutorialTarget>
      </SafeAreaView>

      <WeeklyRecapModal
        visible={recapVisible}
        onClose={() => setRecapVisible(false)}
        week={recapWeek}
        year={recapYear}
      />

      {pendingEvent && (
        <StudioEventModal event={pendingEvent} visible={!recapVisible} />
      )}

      {!recapVisible && emmyCeremonyPendingYear !== null && (
        <EmmyCeremonyModal />
      )}
    </LinearGradient>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:     { flex: 1 },
  scroll:        { flex: 1 },
  scrollContent: { paddingBottom: 8 },

  // Setup splash
  setupContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  setupTitle:     { fontFamily: 'BebasNeue_400Regular', color: C.gold, fontSize: 48, letterSpacing: 8, marginBottom: 40 },

  // ── Header ──────────────────────────────────────────────────────────────────
  header:    { backgroundColor: C.cardBg, borderBottomWidth: 1, borderBottomColor: C.border },
  dotRow:    { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, overflow: 'hidden', gap: 3 },
  dot:       { width: 3, height: 3, borderRadius: 1.5, backgroundColor: C.borderGold },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },

  networkBadge:    { width: 46, height: 46, borderRadius: 23, backgroundColor: C.goldDim, borderWidth: 1.5, borderColor: C.gold, justifyContent: 'center', alignItems: 'center' },
  networkInitials: { fontFamily: 'BebasNeue_400Regular', color: C.gold, fontSize: 17, letterSpacing: 1 },
  networkName:     { fontFamily: 'BebasNeue_400Regular', color: C.text, fontSize: 22, letterSpacing: 3 },
  networkSub:      { fontFamily: 'Manrope_600SemiBold', color: C.mutedMid, fontSize: 9, letterSpacing: 1.5, marginTop: 2 },

  // Week widget — column card
  weekCard:       { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, minWidth: 54, minHeight: 48, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: '#191c2a', borderWidth: 1, borderColor: '#e6b25459' },
  weekCardLabel:  { fontFamily: 'Manrope_600SemiBold', fontSize: 8.5, letterSpacing: 1.5, color: C.muted },
  weekCardNumber: { fontFamily: 'BebasNeue_400Regular', fontSize: 22, color: '#ffffff', lineHeight: 24 },

  // ── Stats 2×2 grid (individual cards) ───────────────────────────────────────
  statsGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 14, paddingTop: 16, paddingBottom: 6, marginBottom: 10 },
  statCard:       { width: '47.5%', backgroundColor: C.cardBg, borderRadius: 12, borderWidth: 1, borderColor: C.borderGold, padding: 12 },
  statCardLabel:  { fontFamily: 'Manrope_700Bold', color: C.mutedMid, fontSize: 8, letterSpacing: 2, marginBottom: 6 },
  statCardValue:  { fontFamily: 'BebasNeue_400Regular', color: C.text, fontSize: 26, letterSpacing: 1 },

  // ── DEADLINE news card ───────────────────────────────────────────────────────
  newsCard:              { backgroundColor: '#1a1108', borderRadius: 14, borderWidth: 1, borderColor: '#e6b2544d', marginHorizontal: 14, marginBottom: 20, padding: 14 },
  newsCardTopRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 },
  newsDeadlinePill:      { backgroundColor: C.gold, borderRadius: 5, paddingHorizontal: 9, paddingVertical: 3 },
  newsDeadlinePillText:  { fontFamily: 'BebasNeue_400Regular', color: '#161008', fontSize: 11, letterSpacing: 2 },
  newsWeekLabel:         { fontFamily: 'Manrope_400Regular', color: C.muted, fontSize: 10 },
  newsHeadline:          { fontFamily: 'BebasNeue_400Regular', color: C.text, fontSize: 16, letterSpacing: 0.5, lineHeight: 20 },
  newsBody:              { fontFamily: 'Manrope_400Regular', color: C.muted, fontSize: 11.5, marginTop: 7, lineHeight: 18 },

  // ── Section headers ──────────────────────────────────────────────────────────
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 },
  sectionTitle:  { fontFamily: 'BebasNeue_400Regular', color: C.text, fontSize: 21, letterSpacing: 1.5 },
  sectionMeta:   { fontFamily: 'Manrope_400Regular', color: C.mutedMid, fontSize: 11 },
  sectionAction: { fontFamily: 'Manrope_700Bold', color: C.gold, fontSize: 10, letterSpacing: 1.5 },

  // ── Show cards ──────────────────────────────────────────────────────────────
  showCard:       { backgroundColor: C.cardBg, borderRadius: 16, borderWidth: 1, borderColor: C.border, marginHorizontal: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  showCardInner:  { padding: 14 },
  showCardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  showTitle:      { fontFamily: 'BebasNeue_400Regular', color: C.text, fontSize: 18, letterSpacing: 1.5 },
  showGenre:      { fontFamily: 'Manrope_700Bold', color: C.mutedMid, fontSize: 9, letterSpacing: 2, marginTop: 4 },

  statusCapsule:     { borderRadius: 999, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 4 },
  statusCapsuleText: { fontFamily: 'Manrope_800ExtraBold', fontSize: 9, letterSpacing: 1 },

  heatmap:   { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 12 },
  ratingDot: { width: 18, height: 18, borderRadius: 4 },

  streamBanner: { backgroundColor: '#192b22', borderRadius: 8, padding: 8, marginBottom: 10 },
  streamText:   { fontFamily: 'Manrope_400Regular', color: C.green, fontSize: 11 },

  showStatsRow:       { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 },
  showStatCell:       { flex: 1, alignItems: 'center' },
  showStatCellBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.border },
  showStatVal:        { fontFamily: 'BebasNeue_400Regular', color: C.text, fontSize: 20 },
  showStatLbl:        { fontFamily: 'Manrope_700Bold', color: C.mutedMid, fontSize: 8, letterSpacing: 1.5, marginTop: 4 },

  progressRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressLabel: { fontFamily: 'Manrope_400Regular', color: C.muted, fontSize: 11 },
  progressPct:   { fontFamily: 'Manrope_800ExtraBold', fontSize: 12, letterSpacing: 0.5 },
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden', marginBottom: 8 },
  progressFill:  { height: '100%', borderRadius: 999 },
  showSubDetail: { fontFamily: 'Manrope_400Regular', color: C.mutedMid, fontSize: 10, letterSpacing: 0.3 },

  // ── Empty slate ──────────────────────────────────────────────────────────────
  emptyCard:       { backgroundColor: C.cardBg, borderRadius: 16, borderWidth: 1, borderColor: C.border, marginHorizontal: 14, marginBottom: 10, padding: 28, alignItems: 'center' },
  emptyTitle:      { fontFamily: 'BebasNeue_400Regular', color: C.mutedMid, fontSize: 18, letterSpacing: 3, marginBottom: 8 },
  emptyBody:       { fontFamily: 'Manrope_400Regular', color: C.muted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  emptyAction:     { marginTop: 18, backgroundColor: C.goldDim, borderRadius: 999, borderWidth: 1, borderColor: C.gold + '55', paddingHorizontal: 18, paddingVertical: 8 },
  emptyActionText: { fontFamily: 'Manrope_800ExtraBold', color: C.gold, fontSize: 11, letterSpacing: 1.5 },

  // ── Tasks ────────────────────────────────────────────────────────────────────
  taskCountPill: { backgroundColor: C.red + '25', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: C.red + '44' },
  taskCountText: { fontFamily: 'Manrope_800ExtraBold', color: C.red, fontSize: 11 },
  taskRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardBg, borderRadius: 12, borderWidth: 1, borderColor: C.borderGold, marginHorizontal: 14, marginBottom: 6, paddingHorizontal: 14, paddingVertical: 13 },
  taskDot:       { width: 9, height: 9, borderRadius: 4.5, marginRight: 12 },
  taskBody:      { flex: 1 },
  taskLabel:     { fontFamily: 'Manrope_600SemiBold', color: C.text, fontSize: 13 },
  taskSub:       { fontFamily: 'Manrope_700Bold', color: C.mutedMid, fontSize: 8, letterSpacing: 1.5, marginTop: 4 },
  chevron:       { fontFamily: 'Manrope_400Regular', color: C.gold, fontSize: 24 },

  // ── Inbox ────────────────────────────────────────────────────────────────────
  inboxRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardBg, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginHorizontal: 14, padding: 14, marginBottom: 6, gap: 12 },
  inboxDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: C.gold, marginTop: 2 },
  inboxTitle:   { fontFamily: 'Manrope_700Bold', color: C.text, fontSize: 13 },
  inboxPreview: { fontFamily: 'Manrope_400Regular', color: C.muted, fontSize: 11, marginTop: 3 },
  inboxChevron: { color: C.gold, fontSize: 22 },

  // ── Advance Week ─────────────────────────────────────────────────────────────
  advanceWrap:        { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 8, borderTopWidth: 1, borderTopColor: C.border },
  advanceGlowRing:    { position: 'absolute', left: 16, right: 16, top: 12, borderRadius: 999, height: 56, backgroundColor: C.gold },
  advanceBtn:         { borderRadius: 999 },
  advanceBtnGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  advanceBtnText:     { fontFamily: 'BebasNeue_400Regular', color: C.goldBtnText, fontSize: 16, letterSpacing: 3 },
});

// ── News ticker styles ────────────────────────────────────────────────────────
const tk = StyleSheet.create({
  strip:    { flexDirection: 'row', alignItems: 'center', height: 36, backgroundColor: '#12142a', borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.borderGold, marginBottom: 14, overflow: 'hidden' },
  pill:     { paddingHorizontal: 12, borderRightWidth: 1, borderRightColor: C.borderGold, alignSelf: 'stretch', justifyContent: 'center', backgroundColor: C.goldDim },
  pillText: { fontFamily: F.bodyXBd, color: C.gold, fontSize: 8, letterSpacing: 2 },
  textArea: { flex: 1, overflow: 'hidden', alignSelf: 'stretch', justifyContent: 'center' },
  text:     { fontFamily: F.bodyMd, color: C.text, fontSize: 12, letterSpacing: 0.2 },
});

// ── Schedule strip styles ─────────────────────────────────────────────────────
const sc = StyleSheet.create({
  strip:        { backgroundColor: C.cardBg, borderRadius: 14, borderWidth: 1, borderColor: C.border, marginHorizontal: 14, marginBottom: 16, padding: 12 },
  stripHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  stripLabel:   { fontFamily: F.bodyBd, color: C.muted, fontSize: 9, letterSpacing: 2 },
  stripAction:  { fontFamily: F.bodyBd, color: C.gold, fontSize: 9, letterSpacing: 1.5 },
  stripCells:   { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  cell:         { flex: 1, alignItems: 'center', borderRadius: 8, borderWidth: 1, paddingVertical: 6, paddingHorizontal: 2, gap: 2 },
  cellEmoji:    { fontSize: 12, lineHeight: 14 },
  cellWeek:     { fontFamily: F.bodyBd, fontSize: 11, letterSpacing: 0 },
  cellNow:      { fontFamily: F.bodyXBd, color: C.green, fontSize: 7, letterSpacing: 1 },
});

// ── Studio Event Modal styles ─────────────────────────────────────────────────
const m = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card:           { backgroundColor: '#191c2a', borderRadius: 20, borderWidth: 1, borderColor: '#252840', padding: 20, width: '100%', maxWidth: 420 },

  topRow:         { flexDirection: 'row', marginBottom: 10 },
  typeBadge:      { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  typeBadgeText:  { fontFamily: 'Manrope_800ExtraBold', fontSize: 10, letterSpacing: 1 },

  title:          { fontFamily: 'BebasNeue_400Regular', color: '#f0ede8', fontSize: 24, letterSpacing: 0.5, lineHeight: 28, marginBottom: 10 },
  body:           { fontFamily: 'Manrope_400Regular', color: '#9a958e', fontSize: 14, lineHeight: 21, marginBottom: 14 },
  divider:        { height: 1, backgroundColor: '#252840', marginBottom: 14 },

  choicesCol:     { gap: 8 },
  choiceCard:     { backgroundColor: '#0f1220', borderRadius: 12, borderWidth: 1, borderColor: '#252840', padding: 12 },
  choiceRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  choiceLabel:    { fontFamily: 'Manrope_700Bold', color: '#f0ede8', fontSize: 14, flex: 1 },
  choiceArrow:    { fontSize: 20, marginLeft: 8 },
  choiceDesc:     { fontFamily: 'Manrope_400Regular', color: '#6b6880', fontSize: 12, lineHeight: 17 },

  selectedCard:   { backgroundColor: '#0f1220', borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 12 },
  selectedLabel:  { fontFamily: 'Manrope_700Bold', fontSize: 14, marginBottom: 4 },
  selectedDesc:   { fontFamily: 'Manrope_400Regular', color: '#6b6880', fontSize: 12, lineHeight: 17 },
  consequenceRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  consequenceStat:{ fontFamily: 'Manrope_700Bold', fontSize: 12 },

  confirmRow:     { flexDirection: 'row', gap: 10 },
  backBtn:        { flex: 1, borderWidth: 1, borderColor: '#252840', borderRadius: 12, padding: 13, alignItems: 'center' },
  backBtnText:    { fontFamily: 'Manrope_600SemiBold', color: '#9a958e', fontSize: 14 },
  confirmBtn:     { flex: 2, borderRadius: 12 },
  confirmBtnGrad: { padding: 13, alignItems: 'center', borderRadius: 12 },
  confirmBtnText: { fontFamily: 'Manrope_800ExtraBold', color: '#0f1220', fontSize: 14 },
});