import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
  Dimensions,
} from 'react-native';
import { useGameStore } from '../../src/store/gameStore';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Show } from '../../src/types';
import { WEEKS_PER_YEAR } from '../../src/constants/game';

const SCREEN_W = Dimensions.get('window').width;

const C = {
  bg:       '#080810',
  card:     '#0d0d1a',
  border:   '#1a1a30',
  text:     '#e8e8f0',
  muted:    '#5c5c7a',
  accent:   '#7c6af7',
  green:    '#4caf82',
  amber:    '#f5a623',
  red:      '#e05555',
  purple:   '#9b59b6',
  cash:     '#4caf82',
  deadline: '#c0291e',
  gold:     '#c9961a',
  divider:  '#1e1e38',
};

const STATUS_COLORS: Record<string, string> = {
  airing:            C.green,
  filming:           C.purple,
  writing:           C.amber,
  marketing:         '#5b8dee',
  'renewal-pending': C.accent,
  completed:         C.muted,
  cancelled:         C.red,
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

// ── News Ticker ───────────────────────────────────────────────────────────────
function NewsTicker({ headlines }: { headlines: string[] }) {
  const base = headlines.length > 0
    ? headlines.map(h => `${h}   ◆   `).join('')
    : 'No recent industry news.   ◆   ';
  // Duplicate so the reset is seamless
  const doubled = base + base;

  const translateX = useRef(new Animated.Value(0)).current;
  const [halfW, setHalfW] = useState(0);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (halfW === 0) return;
    animRef.current?.stop();
    translateX.setValue(0);
    animRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: -halfW,
          duration: (halfW / 65) * 1000, // 65 px/s
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    animRef.current.start();
    return () => animRef.current?.stop();
  }, [halfW]);

  return (
    <View style={styles.tickerRow}>
      <View style={styles.tickerPill}>
        <Text style={styles.tickerPillText}>DEADLINE</Text>
      </View>
      <View style={styles.tickerTrack}>
        <Animated.Text
          style={[styles.tickerText, { transform: [{ translateX }] }]}
          numberOfLines={1}
          onLayout={e => {
            const w = e.nativeEvent.layout.width;
            if (w > 0) setHalfW(w / 2);
          }}
        >
          {doubled}
        </Animated.Text>
      </View>
    </View>
  );
}

// ── Heatmap Dot ───────────────────────────────────────────────────────────────
function HeatmapDot({ rating, empty }: { rating: number | null; empty?: boolean }) {
  let color = C.border;
  if (!empty && rating !== null) {
    color = rating >= 8 ? '#2d8a5e' : rating >= 6.5 ? '#5a9e45' : rating >= 5 ? '#c8a135' : '#c04040';
  }
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

// ── Show Card ─────────────────────────────────────────────────────────────────
function ShowCard({ show, onPress }: { show: Show; onPress: () => void }) {
  const season = show.seasons[show.currentSeasonIndex];
  if (!season) return null;

  const statusColor = STATUS_COLORS[show.status] ?? C.muted;
  const statusLabel = show.status.replace('-', ' ').toUpperCase();

  const avgRating = season.episodes
    .filter(e => e.rating !== null)
    .reduce((acc, e, _, arr) => acc + (e.rating ?? 0) / arr.length, 0);

  const pct =
    show.status === 'writing'
      ? (season.writingWeeksCompleted / season.writingWeeksTotal) * 100
      : show.status === 'filming'
      ? (season.filmingWeeksCompleted / season.filmingWeeksTotal) * 100
      : show.status === 'marketing'
      ? (season.marketingWeeksCompleted / Math.max(season.marketingWeeksTotal, 1)) * 100
      : 0;

  const progressLabel =
    show.status === 'writing'
      ? `${season.writingWeeksTotal - season.writingWeeksCompleted} WK REMAINING`
      : show.status === 'filming'
      ? `${season.filmingWeeksTotal - season.filmingWeeksCompleted} WK REMAINING`
      : show.status === 'marketing' && season.airDateWeek != null
      ? `PREMIERES WK ${season.airDateWeek} · YR ${season.airDateYear}`
      : show.status === 'marketing'
      ? 'NO AIR DATE SET'
      : '';

  return (
    <TouchableOpacity
      style={[styles.showCard, { borderTopColor: statusColor }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Slate strip header */}
      <View style={styles.slateHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.slateTitle} numberOfLines={1}>
            {show.title.toUpperCase()}
          </Text>
          <Text style={styles.slateMeta}>
            {show.genre.toUpperCase()}
            {' · '}
            {'SEASON '}
            {season.seasonNumber}
            {show.status === 'airing' ? `  ·  EP ${season.episodesAired}/${season.episodeCount}` : ''}
          </Text>
        </View>
        <View style={[styles.statusPill, { borderColor: statusColor + '60' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      {show.status === 'airing' || show.status === 'renewal-pending' ? (
        <>
          <View style={styles.heatmap}>
            {Array.from({ length: season.episodeCount }, (_, i) => (
              <HeatmapDot
                key={i}
                rating={season.episodes[i]?.rating ?? null}
                empty={i >= season.episodesAired}
              />
            ))}
          </View>

          {show.pendingStreamingOffer && (
            <View style={styles.streamingBanner}>
              <Text style={styles.streamingText}>
                ▶  {show.pendingStreamingOffer.platformName} wants streaming rights
                {'  ·  '}up to {fmt(show.pendingStreamingOffer.exclusiveAmount)}
              </Text>
            </View>
          )}

          <View style={styles.showStats}>
            <View style={styles.statBlock}>
              <Text style={styles.statBlockValue}>{avgRating > 0 ? avgRating.toFixed(1) : '—'}</Text>
              <Text style={styles.statBlockLabel}>AVG RTG</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={styles.statBlockValue}>
                {season.totalViewers > 0
                  ? fmtViewers(Math.round(season.totalViewers / Math.max(season.episodesAired, 1)))
                  : '—'}
              </Text>
              <Text style={styles.statBlockLabel}>VIEWERS/EP</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={styles.statBlockValue}>{fmt(season.totalAdRevenue)}</Text>
              <Text style={styles.statBlockLabel}>AD REV</Text>
            </View>
          </View>
        </>
      ) : (
        <>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${pct}%` as any, backgroundColor: statusColor },
              ]}
            />
          </View>
          {progressLabel ? (
            <Text style={[styles.progressLabel, { color: statusColor }]}>
              {progressLabel}
            </Text>
          ) : null}
        </>
      )}
    </TouchableOpacity>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter();
  const {
    network,
    shows,
    inboxItems,
    newsItems,
    pitches,
    advanceWeek,
    initialized,
    initializeGame,
  } = useGameStore();

  // All hooks declared before any early return
  const [fadedIds, setFadedIds] = useState<Set<string>>(new Set());
  const fadeAnims = useRef<Record<string, Animated.Value>>({});
  const expiringRef = useRef<Set<string>>(new Set());

  function itemAgeWeeks(item: { week: number; year: number }) {
    return (
      (network.currentYear - item.year) * WEEKS_PER_YEAR +
      (network.currentWeek - item.week)
    );
  }

  useEffect(() => {
    if (!initialized) return;
    const newExpiring = inboxItems.filter(
      i =>
        !i.read &&
        itemAgeWeeks(i) >= 2 &&
        !expiringRef.current.has(i.id) &&
        !fadedIds.has(i.id),
    );
    newExpiring.forEach(item => {
      expiringRef.current.add(item.id);
      fadeAnims.current[item.id] = new Animated.Value(1);
      Animated.timing(fadeAnims.current[item.id], {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start(() => {
        setFadedIds(prev => new Set([...prev, item.id]));
      });
    });
  }, [network.currentWeek, network.currentYear, initialized]);

  if (!initialized) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.setupScreen}>
          <Text style={styles.setupTitle}>TV STUDIO SIM</Text>
          <TouchableOpacity
            style={styles.advanceBtn}
            onPress={() => initializeGame('Apex Television', 'AT')}
          >
            <Text style={styles.advanceBtnText}>START NEW GAME</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const activeShows = shows.filter(s =>
    ['writing', 'filming', 'marketing', 'airing', 'renewal-pending'].includes(s.status),
  );

  const unreadInbox = inboxItems
    .filter(
      i =>
        !i.read &&
        !fadedIds.has(i.id) &&
        (itemAgeWeeks(i) < 2 || expiringRef.current.has(i.id)),
    )
    .slice(0, 3);

  // ── Task list ──────────────────────────────────────────────────────────────
  type TaskItem = {
    id: string;
    label: string;
    sub: string;
    urgency: 'red' | 'amber' | 'purple';
    route: string | { pathname: string; params: Record<string, string> };
  };
  const tasks: TaskItem[] = [];

  for (const show of activeShows) {
    const season = show.seasons[show.currentSeasonIndex];
    if (!season) continue;

    if (show.status === 'renewal-pending') {
      tasks.push({
        id: `renew-${show.id}`,
        label: 'Renew or cancel',
        sub: show.title,
        urgency: 'red',
        route: `/renew?showID=${show.id}`,
      });
    }

    if (show.status === 'filming') {
      if (!season.directorID) {
        tasks.push({
          id: `director-${show.id}`,
          label: 'Hire director',
          sub: show.title,
          urgency: 'amber',
          route: `/hire-talent?showID=${show.id}&role=director`,
        });
      }
      if (season.leadActorIDs.length < season.leadActorSlots) {
        const filled = season.leadActorIDs.length;
        const total = season.leadActorSlots;
        tasks.push({
          id: `lead-${show.id}`,
          label: `Hire lead actor${total - filled > 1 ? 's' : ''} (${filled}/${total})`,
          sub: show.title,
          urgency: 'amber',
          route: `/hire-talent?showID=${show.id}&role=actor&actorType=lead`,
        });
      }
      if (season.supportingActorIDs.length < season.supportingActorSlots) {
        const filled = season.supportingActorIDs.length;
        const total = season.supportingActorSlots;
        tasks.push({
          id: `supporting-${show.id}`,
          label: `Hire supporting cast (${filled}/${total})`,
          sub: show.title,
          urgency: 'purple',
          route: `/hire-talent?showID=${show.id}&role=actor&actorType=supporting`,
        });
      }
    }

    if (show.status === 'marketing' && season.airDateWeek === null) {
      tasks.push({
        id: `airdate-${show.id}`,
        label: 'Schedule air date',
        sub: show.title,
        urgency: 'amber',
        route: `/show/${show.id}`,
      });
    }
  }

  for (const pitch of pitches) {
    if (pitch.passed || pitch.greenlitByPlayer) continue;
    const weeksLeft =
      (pitch.expiresYear - network.currentYear) * WEEKS_PER_YEAR +
      (pitch.expiresWeek - network.currentWeek);
    if (weeksLeft <= 2 && weeksLeft >= 0) {
      const inboxItem = inboxItems.find(i => i.type === 'pitch' && i.refID === pitch.id);
      if (inboxItem) {
        tasks.push({
          id: `pitch-${pitch.id}`,
          label: `Pitch expiring in ${weeksLeft} week${weeksLeft !== 1 ? 's' : ''}`,
          sub: pitch.title,
          urgency: weeksLeft <= 1 ? 'red' : 'amber',
          route: { pathname: '/(tabs)/inbox', params: { itemID: inboxItem.id } },
        });
      }
    }
  }

  for (const show of shows) {
    if (!show.pendingStreamingOffer) continue;
    const offer = show.pendingStreamingOffer;
    const inboxItem = inboxItems.find(i => i.type === 'streaming-offer' && i.refID === show.id);
    const weeksLeft =
      (offer.expiresYear - network.currentYear) * WEEKS_PER_YEAR +
      (offer.expiresWeek - network.currentWeek);
    if (weeksLeft <= 1 && weeksLeft >= 0 && inboxItem) {
      tasks.push({
        id: `stream-${show.id}`,
        label: 'Streaming offer expires soon',
        sub: show.title,
        urgency: 'red',
        route: { pathname: '/(tabs)/inbox', params: { itemID: inboxItem.id } },
      });
    }
  }

  const urgencyOrder = { red: 0, amber: 1, purple: 2 };
  tasks.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

  const nextWeek = network.currentWeek === 52 ? 1 : network.currentWeek + 1;
  const nextYear = network.currentWeek === 52 ? network.currentYear + 1 : network.currentYear;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* ── Broadcast Header ───────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.initialsBlock}>
            <Text style={styles.initialsText}>{network.initials}</Text>
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.networkName} numberOfLines={1}>
              {network.name.toUpperCase()}
            </Text>
            <Text style={styles.networkSub}>TELEVISION NETWORK</Text>
          </View>
          <View style={styles.prestigeChip}>
            <Text style={styles.prestigeStar}>★</Text>
            <Text style={styles.prestigeNum}>{network.prestige}</Text>
          </View>
        </View>
        <View style={styles.headerRule} />

        {/* ── Stat Chip Row ──────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsContent}
        >
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>CASH</Text>
            <Text style={[styles.chipValue, { color: C.cash }]}>{fmt(network.cashOnHand)}</Text>
          </View>
          <View style={[styles.chip, styles.chipHighlight]}>
            <Text style={styles.chipLabel}>TIMELINE</Text>
            <Text style={[styles.chipValue, { color: C.text }]}>
              S{network.currentYear} · W{network.currentWeek}
            </Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>SLATE</Text>
            <Text style={[styles.chipValue, { color: C.accent }]}>
              {activeShows.length} ACTIVE
            </Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>EMMYS</Text>
            <Text style={[styles.chipValue, { color: C.gold }]}>
              {network.emmysWon} WON
            </Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>CAREER</Text>
            <Text style={[styles.chipValue, { color: C.text }]}>
              {fmt(network.careerEarnings)}
            </Text>
          </View>
        </ScrollView>

        {/* ── DEADLINE Ticker ────────────────────────────────────────────── */}
        {newsItems.length > 0 && (
          <NewsTicker headlines={newsItems.slice(-10).map(n => n.headline)} />
        )}

        {/* ── YOUR SLATE ─────────────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionTitle}>YOUR SLATE</Text>
          <TouchableOpacity onPress={() => router.push('/create-show')}>
            <Text style={styles.seeAll}>+ CREATE SHOW</Text>
          </TouchableOpacity>
        </View>

        {activeShows.length === 0 ? (
          <TouchableOpacity
            style={styles.emptyState}
            onPress={() => router.push('/create-show')}
          >
            <Text style={styles.emptyText}>No active productions.</Text>
            <Text style={[styles.emptyText, { color: C.accent, marginTop: 6 }]}>
              + Greenlight your first show
            </Text>
          </TouchableOpacity>
        ) : (
          activeShows.map(show => (
            <ShowCard
              key={show.id}
              show={show}
              onPress={() => router.push(`/show/${show.id}`)}
            />
          ))
        )}

        {/* ── TASKS ──────────────────────────────────────────────────────── */}
        {tasks.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionAccent, { backgroundColor: C.red }]} />
              <Text style={styles.sectionTitle}>TASKS</Text>
              <View style={styles.taskCountBadge}>
                <Text style={styles.taskCountText}>{tasks.length}</Text>
              </View>
            </View>
            {tasks.map(task => {
              const accentColor =
                task.urgency === 'red'
                  ? C.red
                  : task.urgency === 'amber'
                  ? C.amber
                  : C.accent;
              return (
                <TouchableOpacity
                  key={task.id}
                  style={styles.taskRow}
                  onPress={() => router.push(task.route as any)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.taskAccent, { backgroundColor: accentColor }]} />
                  <View style={styles.taskBody}>
                    <Text style={styles.taskLabel}>{task.label}</Text>
                    <Text style={styles.taskSub}>{task.sub}</Text>
                  </View>
                  <Text style={[styles.taskChevron, { color: accentColor }]}>›</Text>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* ── INBOX PREVIEW ──────────────────────────────────────────────── */}
        {unreadInbox.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionAccent, { backgroundColor: C.accent }]} />
              <Text style={styles.sectionTitle}>INBOX</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/inbox')}>
                <Text style={styles.seeAll}>VIEW ALL →</Text>
              </TouchableOpacity>
            </View>
            {unreadInbox.map(item => {
              const anim = fadeAnims.current[item.id];
              const inner = (
                <TouchableOpacity
                  style={styles.inboxItem}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/inbox',
                      params: { itemID: item.id },
                    })
                  }
                  activeOpacity={0.8}
                >
                  <View style={styles.inboxDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inboxTitle}>{item.title}</Text>
                    <Text style={styles.inboxPreview}>{item.preview}</Text>
                  </View>
                  <Text style={styles.inboxAction}>OPEN →</Text>
                </TouchableOpacity>
              );
              return anim ? (
                <Animated.View key={item.id} style={{ opacity: anim }}>
                  {inner}
                </Animated.View>
              ) : (
                <View key={item.id}>{inner}</View>
              );
            })}
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── ADVANCE WEEK ───────────────────────────────────────────────────── */}
      <View style={styles.advanceContainer}>
        <TouchableOpacity style={styles.advanceBtn} onPress={advanceWeek} activeOpacity={0.88}>
          <Text style={styles.advanceBtnEyebrow}>NEXT</Text>
          <Text style={styles.advanceBtnText}>
            ▶  WEEK {nextWeek}
            {network.currentWeek === 52 ? `  ·  YEAR ${nextYear}` : ''}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: C.bg },
  scroll:         { flex: 1 },
  scrollContent:  { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8 },

  setupScreen:    { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  setupTitle:     { color: C.text, fontSize: 28, fontWeight: '800', letterSpacing: 3, marginBottom: 32 },

  // Header
  header:         { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  initialsBlock:  {
    width: 46, height: 46, borderRadius: 6,
    backgroundColor: C.accent,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
    borderWidth: 1, borderColor: '#9d8fff',
  },
  initialsText:   { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 1 },
  headerCenter:   { flex: 1 },
  networkName:    { color: C.text, fontSize: 17, fontWeight: '800', letterSpacing: 1.5 },
  networkSub:     { color: C.muted, fontSize: 11, letterSpacing: 1.8, marginTop: 2 },
  prestigeChip:   {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.gold + '18',
    borderRadius: 6, borderWidth: 1, borderColor: C.gold + '50',
    paddingHorizontal: 10, paddingVertical: 6,
  },
  prestigeStar:   { color: C.gold, fontSize: 13 },
  prestigeNum:    { color: C.gold, fontSize: 14, fontWeight: '700' },
  headerRule:     { height: 1, backgroundColor: C.accent + '40', marginBottom: 14 },

  // Chip row
  chipsScroll:    { marginBottom: 14 },
  chipsContent:   { gap: 8, paddingRight: 4 },
  chip:           {
    backgroundColor: C.card, borderRadius: 8,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 10,
    alignItems: 'center', minWidth: 80,
  },
  chipHighlight:  { borderColor: C.accent + '55', backgroundColor: C.accent + '0e' },
  chipLabel:      { color: C.muted, fontSize: 9, fontWeight: '700', letterSpacing: 1.2, marginBottom: 4 },
  chipValue:      { color: C.text, fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },

  // Ticker
  tickerRow:      {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 8, borderWidth: 1, borderColor: C.border,
    overflow: 'hidden',
    marginBottom: 18, height: 36,
  },
  tickerPill:     {
    backgroundColor: C.deadline,
    paddingHorizontal: 10, height: '100%',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 0,
  },
  tickerPillText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  tickerTrack:    { flex: 1, overflow: 'hidden', height: '100%', justifyContent: 'center' },
  tickerText:     {
    color: '#b0b0c8', fontSize: 12, letterSpacing: 0.2,
    paddingLeft: 10,
    flexShrink: 0,
  },

  // Section headers
  sectionHeader:  {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 10, marginTop: 4, gap: 8,
  },
  sectionAccent:  { width: 3, height: 14, borderRadius: 2, backgroundColor: C.amber },
  sectionTitle:   { flex: 1, color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  seeAll:         { color: C.accent, fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },

  // Show card (production slate)
  showCard:       {
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
    borderTopWidth: 2,
    padding: 14, marginBottom: 10,
  },
  slateHeader:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  slateTitle:     {
    color: C.text, fontSize: 15, fontWeight: '800',
    letterSpacing: 0.8, marginBottom: 4,
  },
  slateMeta:      { color: C.muted, fontSize: 11, letterSpacing: 0.8 },
  statusPill:     {
    borderWidth: 1, borderRadius: 5,
    paddingHorizontal: 7, paddingVertical: 3, marginLeft: 8,
  },
  statusText:     { fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },

  heatmap:        { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 12 },
  dot:            { width: 20, height: 20, borderRadius: 4 },

  streamingBanner: {
    backgroundColor: '#0e2a1f', borderRadius: 6,
    borderWidth: 1, borderColor: '#1e4a33',
    padding: 8, marginBottom: 10,
  },
  streamingText:  { color: C.green, fontSize: 12, letterSpacing: 0.2 },

  showStats:      { flexDirection: 'row', alignItems: 'center' },
  statBlock:      { flex: 1, alignItems: 'center', paddingVertical: 2 },
  statBlockValue: { color: C.text, fontSize: 15, fontWeight: '700' },
  statBlockLabel: { color: C.muted, fontSize: 9, letterSpacing: 0.8, marginTop: 2 },
  statDivider:    { width: 1, height: 28, backgroundColor: C.border },

  progressTrack:  { height: 5, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progressFill:   { height: '100%', borderRadius: 3 },
  progressLabel:  { fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },

  emptyState:     {
    backgroundColor: C.card, borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
    borderStyle: 'dashed',
    padding: 24, alignItems: 'center', marginBottom: 16,
  },
  emptyText:      { color: C.muted, fontSize: 13, textAlign: 'center', letterSpacing: 0.3 },

  // Tasks
  taskCountBadge: {
    backgroundColor: C.red + '25', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  taskCountText:  { color: C.red, fontSize: 12, fontWeight: '700' },
  taskRow:        {
    backgroundColor: C.card, borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
    marginBottom: 8, flexDirection: 'row', alignItems: 'center', overflow: 'hidden',
  },
  taskAccent:     { width: 3, alignSelf: 'stretch' },
  taskBody:       { flex: 1, paddingVertical: 12, paddingHorizontal: 12 },
  taskLabel:      { color: C.text, fontSize: 13, fontWeight: '600', letterSpacing: 0.2 },
  taskSub:        { color: C.muted, fontSize: 11, marginTop: 2 },
  taskChevron:    { fontSize: 22, paddingRight: 12 },

  // Inbox
  inboxItem:      {
    backgroundColor: C.card, borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
    padding: 13, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  inboxDot:       { width: 7, height: 7, borderRadius: 4, backgroundColor: C.accent },
  inboxTitle:     { color: C.text, fontSize: 13, fontWeight: '600' },
  inboxPreview:   { color: C.muted, fontSize: 11, marginTop: 2 },
  inboxAction:    { color: C.accent, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  // Advance Week
  advanceContainer: {
    paddingHorizontal: 14, paddingBottom: 6, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: C.border,
    backgroundColor: C.bg,
  },
  advanceBtn:     {
    backgroundColor: C.amber,
    borderRadius: 12, paddingVertical: 14,
    alignItems: 'center',
    shadowColor: C.amber, shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 12,
    elevation: 8,
  },
  advanceBtnEyebrow: {
    color: '#3a2200', fontSize: 9, fontWeight: '800',
    letterSpacing: 2.5, marginBottom: 2, opacity: 0.7,
  },
  advanceBtnText: {
    color: '#1a0e00', fontSize: 17, fontWeight: '800', letterSpacing: 1.2,
  },
});
