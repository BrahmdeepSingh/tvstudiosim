import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGameStore } from '../src/store/gameStore';
import { COMPETITOR_PRODUCTION_COSTS } from '../src/constants/game';
import { CompetitorStudio, CompetitorShow } from '../src/types';

const C = {
  pageBg:     '#0f1220',
  cardBg:     '#191c2a',
  border:     '#252840',
  text:       '#f0ede8',
  muted:      '#9a958e',
  mutedMid:   '#6b6880',
  gold:       '#e6b254',
  goldDim:    '#e6b25418',
  goldBorder: '#e6b25440',
  goldText:   '#161008',
  green:      '#4ec46e',
  greenBg:    '#0f2a1a',
  greenBd:    '#4ec46e55',
  amber:      '#d4753a',
  amberBg:    '#2a1f12',
  amberBd:    '#d4753a55',
  teal:       '#3db8a8',
  tealBg:     '#0f2525',
  tealBd:     '#3db8a855',
  blue:       '#cccee0',
  blueBg:     '#141e33',
  blueBd:     '#cccee055',
  red:        '#c43820',
  redBg:      '#2a130f',
  redBd:      '#c4382055',
};

const F = {
  display: 'BebasNeue_400Regular',
  body:    'Manrope_400Regular',
  bodyMd:  'Manrope_600SemiBold',
  bodyBd:  'Manrope_700Bold',
  bodyXBd: 'Manrope_800ExtraBold',
};

const STUDIO_COLORS = [
  '#5b8cff',
  '#ff6b6b',
  '#4ec46e',
  '#d4753a',
  '#a855f7',
  '#3db8a8',
  '#f59e0b',
  '#ec4899',
];

const STATUS_META: Record<string, { label: string; color: string; bg: string; bd: string }> = {
  'pre-production': { label: 'DEV',       color: C.blue,  bg: C.blueBg,  bd: C.blueBd  },
  filming:          { label: 'FILMING',   color: C.amber, bg: C.amberBg, bd: C.amberBd },
  marketing:        { label: 'MARKETING', color: C.teal,  bg: C.tealBg,  bd: C.tealBd  },
  airing:           { label: 'AIRING',    color: C.green, bg: C.greenBg, bd: C.greenBd },
  completed:        { label: 'WRAPPED',   color: C.muted, bg: '#1a1a2a',  bd: '#3a3a5a' },
  cancelled:        { label: 'CANCELLED', color: C.red,   bg: C.redBg,   bd: C.redBd   },
};

const TIER_LABEL: Record<string, string> = {
  powerhouse:   'Powerhouse',
  established:  'Established',
  independent:  'Independent',
};

function fmt(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000)     return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)         return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs}`;
}

function fmtViewers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function studioInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

interface CompetitorShowCardProps {
  show: CompetitorShow;
}

function CompetitorShowCard({ show }: CompetitorShowCardProps) {
  const meta = STATUS_META[show.status] ?? STATUS_META.cancelled;
  const showRating = show.status === 'airing' && show.currentRating > 0;
  const showViewers = show.status === 'airing' && show.weeklyViewers > 0;

  return (
    <View style={cs.showCard}>
      <View style={cs.showCardTop}>
        <View style={cs.showCardLeft}>
          <Text style={cs.showTitle}>{show.title}</Text>
          <Text style={cs.showSub}>{capitalize(show.genre)} · Season {show.seasonNumber}</Text>
        </View>
        <View style={[cs.badge, { backgroundColor: meta.bg, borderColor: meta.bd }]}>
          <Text style={[cs.badgeText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>
      {showRating || showViewers ? (
        <View style={cs.showStats}>
          {showRating && (
            <View style={cs.showStat}>
              <Text style={cs.showStatVal}>{show.currentRating.toFixed(1)}</Text>
              <Text style={cs.showStatLabel}>AVG RATING</Text>
            </View>
          )}
          {showRating && showViewers && <View style={cs.showStatDivider} />}
          {showViewers && (
            <View style={cs.showStat}>
              <Text style={cs.showStatVal}>{fmtViewers(show.weeklyViewers)}</Text>
              <Text style={cs.showStatLabel}>VIEWERS/EP</Text>
            </View>
          )}
        </View>
      ) : (
        <Text style={cs.showSubLine}>
          {show.status === 'pre-production' ? 'In development' :
           show.status === 'filming' ? 'Currently filming' :
           show.status === 'marketing' ? 'In post / marketing' :
           show.status === 'completed' ? `Finished at ${show.currentRating.toFixed(1)} avg` :
           `Cancelled after ${show.episodesAired} episodes`}
        </Text>
      )}
    </View>
  );
}

export default function StudioProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { network, shows, competitors, awards, newsItems } = useGameStore();

  const isPlayer = id === 'player';

  // Locate studio
  const competitorIndex = competitors.findIndex(c => c.id === id);
  const studio: CompetitorStudio | null = competitorIndex >= 0 ? competitors[competitorIndex] : null;

  if (!isPlayer && !studio) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.pageBg, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: C.muted, fontFamily: F.body }}>Studio not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: C.gold, fontFamily: F.bodyMd }}>← Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Data
  const studioName = isPlayer ? network.name : studio!.name;
  const color = isPlayer ? C.gold : STUDIO_COLORS[competitorIndex % STUDIO_COLORS.length];
  const inits = isPlayer ? network.initials : studioInitials(studio!.name);
  const tierLabel = isPlayer ? 'Your Network' : TIER_LABEL[studio!.tier];
  const emmysWon = isPlayer ? network.emmysWon : studio!.emmysWon;

  // Rank among all studios
  const allPrestige = [
    { id: 'player', prestige: network.prestige },
    ...competitors.map(c => ({ id: c.id, prestige: c.prestige })),
  ].sort((a, b) => b.prestige - a.prestige);
  const rankIndex = allPrestige.findIndex(r => r.id === (isPlayer ? 'player' : id));
  const rank = rankIndex + 1;

  // Cash on hand
  const cashOnHand = isPlayer ? network.cashOnHand : studio!.capital;

  // Career earnings (player has it tracked; for competitors we derive it)
  const careerEarnings = isPlayer
    ? network.careerEarnings
    : studio!.totalShowsProduced * COMPETITOR_PRODUCTION_COSTS[studio!.tier] * 1.4;

  // Active show count
  const activeShows = isPlayer
    ? shows.filter(s => ['writing', 'filming', 'marketing', 'airing', 'renewal-pending'].includes(s.status)).length
    : studio!.activeShows.filter(s => ['pre-production', 'filming', 'marketing', 'airing'].includes(s.status)).length;

  // Their slate: only shows currently in production or on air (not dead shows)
  const LIVE_STATUSES = ['airing', 'filming', 'marketing', 'pre-production'];
  const slate: CompetitorShow[] = isPlayer ? [] : studio!.activeShows
    .filter(s => LIVE_STATUSES.includes(s.status))
    .sort((a, b) => {
      const order = ['airing', 'filming', 'marketing', 'pre-production'];
      return order.indexOf(a.status) - order.indexOf(b.status);
    });

  // Recent history: news items mentioning this studio
  const studioNewsItems = newsItems
    .filter(n => n.type === 'competitor' && n.headline.includes(studioName))
    .sort((a, b) => b.year !== a.year ? b.year - a.year : b.week - a.week);

  return (
    <SafeAreaView style={s.container}>
      <LinearGradient
        colors={['#131829', '#0f1220', '#0a0d18']}
        style={StyleSheet.absoluteFill}
      />

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>STUDIO PROFILE</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        <Text style={s.dots}>· · · · · · · · · · · · · · · · · · · · · · · ·</Text>

        {/* Identity */}
        <View style={s.identityBlock}>
          <View style={[s.avatarCircle, { backgroundColor: `${color}22`, borderColor: `${color}66` }]}>
            <Text style={[s.avatarText, { color }]}>{inits}</Text>
          </View>
          <Text style={s.studioName}>{studioName}</Text>
          <Text style={s.studioSub}>{tierLabel} · Rank #{rank}</Text>
        </View>

        {/* Stat grid */}
        <View style={s.statGrid}>
          <View style={[s.statCell, s.statCellLeft]}>
            <Text style={s.statCellLabel}>CASH ON HAND</Text>
            <Text style={[s.statCellValue, { color: C.gold }]}>{fmt(cashOnHand)}</Text>
          </View>
          <View style={[s.statCell, s.statCellRight]}>
            <Text style={s.statCellLabel}>CAREER EARNINGS</Text>
            <Text style={s.statCellValue}>{isPlayer ? fmt(careerEarnings) : `~${fmt(careerEarnings)}`}</Text>
          </View>
          <View style={[s.statCell, s.statCellLeft, s.statCellBottom]}>
            <Text style={s.statCellLabel}>ACTIVE SHOWS</Text>
            <Text style={[s.statCellValue, { color: C.gold }]}>{activeShows}</Text>
          </View>
          <View style={[s.statCell, s.statCellRight, s.statCellBottom]}>
            <Text style={s.statCellLabel}>EMMYS WON</Text>
            <Text style={s.statCellValue}>{emmysWon}</Text>
          </View>
        </View>

        {/* Slate */}
        {isPlayer ? (
          <View style={s.sectionHeader}>
            <View style={s.accentBar} />
            <Text style={s.sectionTitle}>YOUR STUDIO</Text>
          </View>
        ) : (
          <>
            <View style={s.sectionHeader}>
              <View style={s.accentBar} />
              <Text style={s.sectionTitle}>THEIR SLATE</Text>
            </View>
            {slate.length === 0 ? (
              <View style={s.emptyCard}>
                <Text style={s.emptyText}>No active shows right now.</Text>
              </View>
            ) : (
              slate.map(show => <CompetitorShowCard key={show.id} show={show} />)
            )}
          </>
        )}

        {/* Recent history */}
        <View style={s.sectionHeader}>
          <View style={s.accentBar} />
          <Text style={s.sectionTitle}>RECENT HISTORY</Text>
        </View>

        {studioNewsItems.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>No news yet.</Text>
          </View>
        ) : (
          <ScrollView style={s.historyCard} nestedScrollEnabled scrollIndicatorInsets={{ right: 1 }}>
            {studioNewsItems.map((item, idx) => (
              <View key={item.id}>
                <View style={s.historyRow}>
                  <Text style={s.historyTimestamp}>Wk {item.week}, Yr {item.year}</Text>
                  <Text style={s.historyHeadline}>{item.headline}</Text>
                </View>
                {idx < studioNewsItems.length - 1 && <View style={s.historyDivider} />}
              </View>
            ))}
          </ScrollView>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: C.pageBg },
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 16 },

  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:       { width: 40, alignItems: 'flex-start', justifyContent: 'center' },
  backText:      { color: C.gold, fontSize: 22, fontFamily: F.body },
  headerTitle:   { flex: 1, color: C.gold, fontFamily: F.display, fontSize: 22, letterSpacing: 1, textAlign: 'center' },

  dots:          { color: C.mutedMid, fontSize: 12, textAlign: 'center', letterSpacing: 2, marginTop: 16, marginBottom: 24 },

  identityBlock: { alignItems: 'center', marginBottom: 24 },
  avatarCircle:  { width: 72, height: 72, borderRadius: 36, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  avatarText:    { fontFamily: F.display, fontSize: 30, letterSpacing: 1 },
  studioName:    { color: C.text, fontFamily: F.display, fontSize: 26, letterSpacing: 1, marginBottom: 4, textAlign: 'center' },
  studioSub:     { color: C.muted, fontFamily: F.bodyMd, fontSize: 13 },

  statGrid:      { flexDirection: 'row', flexWrap: 'wrap', borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 24 },
  statCell:      { width: '50%', padding: 16, backgroundColor: C.cardBg },
  statCellLeft:  { borderRightWidth: 1, borderRightColor: C.border },
  statCellRight: {},
  statCellBottom: { borderTopWidth: 1, borderTopColor: C.border },
  statCellLabel: { color: C.muted, fontFamily: F.bodyBd, fontSize: 10, letterSpacing: 1.4, marginBottom: 6 },
  statCellValue: { color: C.text, fontFamily: F.display, fontSize: 28, letterSpacing: 0.5 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  accentBar:     { width: 3, height: 16, backgroundColor: C.gold, borderRadius: 2 },
  sectionTitle:  { color: C.gold, fontFamily: F.bodyXBd, fontSize: 11, letterSpacing: 2 },

  emptyCard:     { backgroundColor: C.cardBg, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 20, alignItems: 'center', marginBottom: 20 },
  emptyText:     { color: C.muted, fontFamily: F.body, fontSize: 13 },

  historyCard:   { backgroundColor: C.cardBg, borderRadius: 12, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 20, maxHeight: 280 },
  historyRow:    { padding: 14 },
  historyTimestamp: { color: C.muted, fontFamily: F.bodyMd, fontSize: 11, letterSpacing: 0.5, marginBottom: 4 },
  historyHeadline:  { color: C.text, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  historyDivider:   { height: 1, backgroundColor: C.border },
});

const cs = StyleSheet.create({
  showCard:       { backgroundColor: C.cardBg, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 10 },
  showCardTop:    { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  showCardLeft:   { flex: 1, marginRight: 8 },
  showTitle:      { color: C.text, fontFamily: F.bodyBd, fontSize: 15, marginBottom: 3 },
  showSub:        { color: C.muted, fontFamily: F.body, fontSize: 12 },
  badge:          { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:      { fontFamily: F.bodyBd, fontSize: 10, letterSpacing: 1 },
  showStats:      { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 },
  showStat:       { alignItems: 'flex-start' },
  showStatVal:    { color: C.text, fontFamily: F.bodyXBd, fontSize: 20 },
  showStatLabel:  { color: C.muted, fontFamily: F.bodyBd, fontSize: 9, letterSpacing: 1.2, marginTop: 1 },
  showStatDivider: { width: 1, height: 28, backgroundColor: C.border },
  showSubLine:    { color: C.muted, fontFamily: F.body, fontSize: 12, marginTop: 4 },
});
