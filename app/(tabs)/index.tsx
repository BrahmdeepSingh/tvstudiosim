import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, Animated, Dimensions,
} from 'react-native';
import { useGameStore } from '../../src/store/gameStore';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Show } from '../../src/types';
import { WEEKS_PER_YEAR } from '../../src/constants/game';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const C = {
  bg:       '#09090e',
  card:     '#0f0f18',
  border:   '#1a1a28',
  text:     '#f0f0f8',
  muted:    '#52526a',
  gold:     '#e8b84b',
  goldDim:  '#e8b84b44',
  green:    '#3dba7e',
  amber:    '#f0a030',
  red:      '#e05252',
  blue:     '#4a7fd4',
  purple:   '#9b59b6',
};

const STATUS_COLORS: Record<string, string> = {
  airing:            C.green,
  filming:           C.red,
  writing:           C.blue,
  marketing:         C.amber,
  'renewal-pending': C.gold,
  completed:         C.muted,
  cancelled:         C.red,
};

const STATUS_LABELS: Record<string, string> = {
  airing:            'AIRING',
  filming:           'FILMING',
  writing:           'WRITING',
  marketing:         'MARKETING',
  'renewal-pending': 'RENEWAL',
  completed:         'COMPLETED',
  cancelled:         'CANCELLED',
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

// ── Decorative dot row ────────────────────────────────────────────────────────

function DotRow() {
  return (
    <View style={styles.dotRow}>
      {Array.from({ length: 48 }).map((_, i) => (
        <View key={i} style={styles.dot} />
      ))}
    </View>
  );
}

// ── Film-reel icon ────────────────────────────────────────────────────────────

function FilmReel() {
  return (
    <View style={styles.reelOuter}>
      <View style={styles.reelCenter} />
      <View style={[styles.reelHole, { top: 5, left: 5 }]} />
      <View style={[styles.reelHole, { top: 5, right: 5 }]} />
      <View style={[styles.reelHole, { bottom: 5, left: 5 }]} />
      <View style={[styles.reelHole, { bottom: 5, right: 5 }]} />
    </View>
  );
}

// ── Animated news ticker ──────────────────────────────────────────────────────

function NewsTicker({ headlines }: { headlines: string[] }) {
  const tickerAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const animRef    = useRef<Animated.CompositeAnimation | null>(null);

  const text = headlines.join('   ·   ');
  // ~7 px per character at fontSize 12 is a reliable estimate; avoids layout-measurement race
  const estimatedWidth = text.length * 7;

  useEffect(() => {
    if (!text) return;
    tickerAnim.setValue(SCREEN_WIDTH);
    animRef.current = Animated.loop(
      Animated.timing(tickerAnim, {
        toValue:  -estimatedWidth,
        duration: (SCREEN_WIDTH + estimatedWidth) * 24,
        useNativeDriver: true,
      })
    );
    animRef.current.start();
    return () => animRef.current?.stop();
  }, [text]);

  return (
    <View style={styles.tickerWrap}>
      <View style={styles.tickerPill}>
        <Text style={styles.tickerPillText}>DEADLINE</Text>
      </View>
      <View style={styles.tickerTrack}>
        <Animated.Text
          style={[styles.tickerText, { transform: [{ translateX: tickerAnim }] }]}
          numberOfLines={1}
        >
          {text}
        </Animated.Text>
      </View>
    </View>
  );
}

// ── Episode heatmap dot ───────────────────────────────────────────────────────

function HeatDot({ rating, empty }: { rating: number | null; empty?: boolean }) {
  let color = C.border;
  if (!empty && rating !== null) {
    color = rating >= 8 ? '#2d8a5e' : rating >= 6.5 ? '#5a9e45' : rating >= 5 ? '#c8a135' : '#c04040';
  }
  return <View style={[styles.heatDot, { backgroundColor: color }]} />;
}

// ── Show card ─────────────────────────────────────────────────────────────────

function ShowCard({ show, onPress }: { show: Show; onPress: () => void }) {
  const season = show.seasons[show.currentSeasonIndex];
  if (!season) return null;

  const statusColor = STATUS_COLORS[show.status] ?? C.muted;
  const statusLabel = STATUS_LABELS[show.status] ?? show.status.toUpperCase();
  const genreLabel  = show.genre.replace('-', ' ').toUpperCase();

  const avgRating = season.episodes
    .filter(e => e.rating !== null)
    .reduce((acc, e, _, arr) => acc + (e.rating ?? 0) / arr.length, 0);

  // Progress for non-airing phases
  const progressPct =
    show.status === 'writing'
      ? (season.writingWeeksCompleted / season.writingWeeksTotal) * 100
      : show.status === 'filming'
      ? (season.filmingWeeksCompleted / season.filmingWeeksTotal) * 100
      : show.status === 'marketing'
      ? (season.marketingWeeksCompleted / Math.max(season.marketingWeeksTotal, 1)) * 100
      : 0;

  const progressWeekLabel =
    show.status === 'writing'
      ? `Week ${season.writingWeeksCompleted + 1} of ${season.writingWeeksTotal}`
      : show.status === 'filming'
      ? `Week ${season.filmingWeeksCompleted + 1} of ${season.filmingWeeksTotal}`
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
      ? `${season.marketingChannelIDs.length} marketing channel${season.marketingChannelIDs.length !== 1 ? 's' : ''} active`
      : '';

  return (
    <TouchableOpacity style={styles.showCard} onPress={onPress} activeOpacity={0.8}>
      {/* Left-side status accent */}
      <View style={[styles.cardAccentBar, { backgroundColor: statusColor }]} />

      <View style={styles.cardInner}>
        {/* Title row */}
        <View style={styles.showCardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.showTitle}>{show.title.toUpperCase()}</Text>
            <Text style={styles.showGenre}>{genreLabel}</Text>
          </View>
          <View style={[styles.statusPill, { borderColor: statusColor + '88', backgroundColor: statusColor + '18' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        {/* Airing / renewal-pending: heatmap + stats */}
        {(show.status === 'airing' || show.status === 'renewal-pending') ? (
          <>
            <View style={styles.heatmap}>
              {Array.from({ length: season.episodeCount }, (_, i) => (
                <HeatDot
                  key={i}
                  rating={season.episodes[i]?.rating ?? null}
                  empty={i >= season.episodesAired}
                />
              ))}
            </View>

            {show.pendingStreamingOffer && (
              <View style={styles.streamBanner}>
                <Text style={styles.streamText}>
                  {show.pendingStreamingOffer.platformName} wants streaming rights · up to {fmt(show.pendingStreamingOffer.exclusiveAmount)}
                </Text>
              </View>
            )}

            <View style={styles.statsRow}>
              <View style={styles.statCell}>
                <Text style={styles.statVal}>{avgRating > 0 ? avgRating.toFixed(1) : '—'}</Text>
                <Text style={styles.statLbl}>AVG RATING</Text>
              </View>
              <View style={[styles.statCell, styles.statCellBorder]}>
                <Text style={styles.statVal}>
                  {season.totalViewers > 0
                    ? fmtViewers(Math.round(season.totalViewers / Math.max(season.episodesAired, 1)))
                    : '—'}
                </Text>
                <Text style={styles.statLbl}>VIEWERS/EP</Text>
              </View>
              <View style={styles.statCell}>
                <Text style={styles.statVal}>{fmt(season.totalAdRevenue)}</Text>
                <Text style={styles.statLbl}>AD REVENUE</Text>
              </View>
            </View>
          </>
        ) : (
          /* Production phase: progress bar */
          <>
            <View style={styles.progressHeader}>
              <Text style={styles.progressWeekLabel}>{progressWeekLabel}</Text>
              <Text style={[styles.progressPct, { color: statusColor }]}>
                {Math.round(progressPct)}%
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: statusColor }]} />
            </View>
            {subDetail ? (
              <Text style={styles.subDetail}>{subDetail}</Text>
            ) : null}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter();
  const {
    network, shows, inboxItems, newsItems, pitches,
    advanceWeek, initialized, initializeGame,
  } = useGameStore();

  const [fadedIds, setFadedIds]   = useState<Set<string>>(new Set());
  const fadeAnims  = useRef<Record<string, Animated.Value>>({});
  const expiringRef = useRef<Set<string>>(new Set());

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

  // ── New-game splash ─────────────────────────────────────────────────────────
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

  // ── Derived data ────────────────────────────────────────────────────────────
  const activeShows = shows.filter(s =>
    ['writing', 'filming', 'marketing', 'airing', 'renewal-pending'].includes(s.status)
  );

  const unreadInbox = inboxItems
    .filter(i => !i.read && !fadedIds.has(i.id) && (itemAgeWeeks(i) < 2 || expiringRef.current.has(i.id)))
    .slice(0, 3);

  // ── Task list ───────────────────────────────────────────────────────────────
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
        tasks.push({ id: `pitch-${pitch.id}`, label: `Pitch expiring in ${weeksLeft} week${weeksLeft !== 1 ? 's' : ''}`, sub: pitch.title, urgency: weeksLeft <= 1 ? 'red' : 'amber', route: { pathname: '/(tabs)/inbox', params: { itemID: inboxItem.id } } });
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

  const urgencyOrder = { red: 0, amber: 1, purple: 2 };
  tasks.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Header block ── */}
        <View style={styles.headerBlock}>
          <DotRow />
          <View style={styles.headerRow}>
            <FilmReel />
            <View style={styles.headerMid}>
              <Text style={styles.networkName}>{network.name.toUpperCase()}</Text>
              <Text style={styles.networkSub}>TELEVISION NETWORK</Text>
            </View>
            <View style={styles.prestigeBadge}>
              <Text style={styles.prestigeStar}>★</Text>
              <Text style={styles.prestigeNum}>{Math.round(network.prestige)}</Text>
            </View>
          </View>
          <DotRow />
        </View>

        {/* ── Stats strip ── */}
        <View style={styles.statsStrip}>
          <View style={styles.stripCell}>
            <Text style={styles.stripLabel}>CASH</Text>
            <Text style={[styles.stripValue, { color: C.green }]}>{fmt(network.cashOnHand)}</Text>
          </View>
          <View style={[styles.stripCell, styles.stripCellBorder]}>
            <Text style={styles.stripLabel}>WEEK</Text>
            <Text style={styles.stripValue}>Y{network.currentYear} · W{network.currentWeek}</Text>
          </View>
          <View style={styles.stripCell}>
            <Text style={styles.stripLabel}>SLATE</Text>
            <Text style={[styles.stripValue, { color: C.gold }]}>{activeShows.length} SHOWS</Text>
          </View>
        </View>

        {/* ── News ticker ── */}
        {newsItems.length > 0 && (
          <NewsTicker headlines={newsItems.slice(-10).map(n => n.headline)} />
        )}

        {/* ── Your Slate ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>YOUR SLATE</Text>
          <View style={styles.sectionRight}>
            {activeShows.length > 0 && (
              <Text style={styles.sectionCount}>{activeShows.length} in production</Text>
            )}
            <TouchableOpacity onPress={() => router.push('/create-show')}>
              <Text style={styles.sectionAction}>+ Create</Text>
            </TouchableOpacity>
          </View>
        </View>

        {activeShows.length === 0 ? (
          <TouchableOpacity style={styles.emptyCard} onPress={() => router.push('/create-show')}>
            <Text style={styles.emptyText}>No active shows.</Text>
            <Text style={[styles.emptyText, { color: C.gold, marginTop: 6 }]}>+ Create your first show</Text>
          </TouchableOpacity>
        ) : (
          activeShows.map(show => (
            <ShowCard key={show.id} show={show} onPress={() => router.push(`/show/${show.id}`)} />
          ))
        )}

        {/* ── Tasks ── */}
        {tasks.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>TASKS</Text>
              <View style={styles.taskBadge}>
                <Text style={styles.taskBadgeText}>{tasks.length}</Text>
              </View>
            </View>
            {tasks.map(task => {
              const accent = task.urgency === 'red' ? C.red : task.urgency === 'amber' ? C.amber : C.purple;
              return (
                <TouchableOpacity
                  key={task.id}
                  style={styles.taskRow}
                  onPress={() => router.push(task.route as any)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.taskAccent, { backgroundColor: accent }]} />
                  <View style={styles.taskBody}>
                    <Text style={styles.taskLabel}>{task.label}</Text>
                    <Text style={styles.taskSub}>{task.sub.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* ── Inbox preview ── */}
        {unreadInbox.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>INBOX</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/inbox')}>
                <Text style={styles.sectionAction}>View all →</Text>
              </TouchableOpacity>
            </View>
            {unreadInbox.map(item => {
              const anim = fadeAnims.current[item.id];
              const inner = (
                <TouchableOpacity
                  style={styles.inboxRow}
                  onPress={() => router.push({ pathname: '/(tabs)/inbox', params: { itemID: item.id } })}
                  activeOpacity={0.8}
                >
                  <View style={styles.inboxDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inboxTitle}>{item.title}</Text>
                    <Text style={styles.inboxPreview}>{item.preview}</Text>
                  </View>
                  <Text style={styles.inboxAction}>Review →</Text>
                </TouchableOpacity>
              );
              return anim
                ? <Animated.View key={item.id} style={{ opacity: anim }}>{inner}</Animated.View>
                : <View key={item.id}>{inner}</View>;
            })}
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ── Advance Week ── */}
      <View style={styles.advanceWrap}>
        <TouchableOpacity style={styles.advanceBtn} onPress={advanceWeek} activeOpacity={0.85}>
          <Text style={styles.advanceBtnText}>
            ADVANCE WEEK ▶
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg },
  scroll:       { flex: 1 },
  scrollContent: { paddingBottom: 8 },

  // Setup splash
  setupScreen:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  setupTitle:   { color: C.gold, fontSize: 32, fontWeight: '800', letterSpacing: 5, marginBottom: 40 },

  // ── Header ──
  headerBlock:  { backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  dotRow:       { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 7, overflow: 'hidden' },
  dot:          { flex: 1, height: 3, borderRadius: 1.5, backgroundColor: C.goldDim, marginHorizontal: 1.5 },

  headerRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 14 },

  // Film reel
  reelOuter:    { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: C.gold, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  reelCenter:   { width: 13, height: 13, borderRadius: 6.5, backgroundColor: C.gold },
  reelHole:     { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.gold },

  headerMid:    { flex: 1 },
  networkName:  { color: C.gold, fontSize: 22, fontWeight: '800', letterSpacing: 3 },
  networkSub:   { color: C.muted, fontSize: 9, fontWeight: '600', letterSpacing: 2.5, marginTop: 3 },

  // Prestige badge
  prestigeBadge: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: C.gold, justifyContent: 'center', alignItems: 'center' },
  prestigeStar:  { color: C.gold, fontSize: 12, lineHeight: 14, textAlign: 'center' },
  prestigeNum:   { color: C.gold, fontSize: 13, fontWeight: '800', lineHeight: 15, textAlign: 'center' },

  // ── Stats strip ──
  statsStrip:      { flexDirection: 'row', backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border, marginBottom: 14 },
  stripCell:       { flex: 1, paddingVertical: 13, paddingHorizontal: 12, alignItems: 'center' },
  stripCellBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.border },
  stripLabel:      { color: C.muted, fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginBottom: 5 },
  stripValue:      { color: C.text, fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },

  // ── News ticker ──
  tickerWrap:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0c0c14', borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border, height: 34, marginBottom: 18, overflow: 'hidden' },
  tickerPill:     { backgroundColor: C.red, paddingHorizontal: 10, height: '100%', justifyContent: 'center', zIndex: 2 },
  tickerPillText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 2 },
  tickerTrack:    { flex: 1, overflow: 'hidden', height: '100%', justifyContent: 'center' },
  tickerText:     { color: C.muted, fontSize: 11, letterSpacing: 0.3, paddingLeft: 10 },

  // ── Section headers ──
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 },
  sectionTitle:  { color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 2.5 },
  sectionRight:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionCount:  { color: C.muted, fontSize: 11 },
  sectionAction: { color: C.gold, fontSize: 12, fontWeight: '600' },

  // ── Show cards ──
  showCard:       { flexDirection: 'row', backgroundColor: C.card, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border, marginBottom: 8, overflow: 'hidden' },
  cardAccentBar:  { width: 3, alignSelf: 'stretch' },
  cardInner:      { flex: 1, padding: 14 },

  showCardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  showTitle:      { color: C.text, fontSize: 14, fontWeight: '800', letterSpacing: 1.2 },
  showGenre:      { color: C.muted, fontSize: 9, fontWeight: '700', letterSpacing: 2, marginTop: 4 },

  statusPill:     { borderWidth: 1, borderRadius: 3, paddingHorizontal: 7, paddingVertical: 3 },
  statusText:     { fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },

  // Heatmap
  heatmap:  { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 12 },
  heatDot:  { width: 20, height: 20, borderRadius: 3 },

  // Streaming banner
  streamBanner: { backgroundColor: '#1a3526', borderRadius: 4, padding: 8, marginBottom: 10 },
  streamText:   { color: C.green, fontSize: 11, fontWeight: '500' },

  // Airing stats row
  statsRow:       { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12, marginTop: 2 },
  statCell:       { flex: 1, alignItems: 'center' },
  statCellBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.border },
  statVal:        { color: C.text, fontSize: 15, fontWeight: '700' },
  statLbl:        { color: C.muted, fontSize: 8, fontWeight: '700', letterSpacing: 1, marginTop: 4 },

  // Progress
  progressHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressWeekLabel:{ color: C.muted, fontSize: 11 },
  progressPct:      { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  progressTrack:    { height: 5, backgroundColor: C.border, borderRadius: 2.5, overflow: 'hidden', marginBottom: 8 },
  progressFill:     { height: '100%', borderRadius: 2.5 },
  subDetail:        { color: C.muted, fontSize: 10, letterSpacing: 0.3 },

  // Empty state
  emptyCard: { backgroundColor: C.card, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border, padding: 24, alignItems: 'center', marginBottom: 16 },
  emptyText: { color: C.muted, fontSize: 13, textAlign: 'center', lineHeight: 20 },

  // ── Tasks ──
  taskBadge:     { backgroundColor: C.red + '30', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  taskBadgeText: { color: C.red, fontSize: 11, fontWeight: '800' },
  taskRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border, marginBottom: 4, overflow: 'hidden' },
  taskAccent:    { width: 3, alignSelf: 'stretch' },
  taskBody:      { flex: 1, paddingVertical: 13, paddingHorizontal: 14 },
  taskLabel:     { color: C.text, fontSize: 13, fontWeight: '600' },
  taskSub:       { color: C.muted, fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginTop: 4 },
  chevron:       { color: C.muted, fontSize: 22, paddingRight: 14 },

  // ── Inbox ──
  inboxRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border, padding: 14, marginBottom: 4, gap: 12 },
  inboxDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: C.gold },
  inboxTitle:   { color: C.text, fontSize: 13, fontWeight: '600' },
  inboxPreview: { color: C.muted, fontSize: 11, marginTop: 2 },
  inboxAction:  { color: C.gold, fontSize: 12, fontWeight: '600' },

  // ── Advance Week ──
  advanceWrap:    { padding: 14, paddingBottom: 6, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border },
  advanceBtn:     { backgroundColor: C.gold, borderRadius: 10, paddingVertical: 16, alignItems: 'center' },
  advanceBtnText: { color: '#09090e', fontSize: 13, fontWeight: '800', letterSpacing: 2.5 },
});
