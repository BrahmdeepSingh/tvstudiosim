import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useGameStore } from '../../src/store/gameStore';
import { useRouter } from 'expo-router';
import { Show, Season } from '../../src/types';

const C = {
  bg:       '#0f0f17',
  card:     '#16161f',
  border:   '#1e1e2e',
  text:     '#e8e8f0',
  muted:    '#6b6b82',
  accent:   '#7c6af7',
  green:    '#4caf82',
  amber:    '#f5a623',
  red:      '#e85d5d',
  purple:   '#9b59b6',
  cash:     '#4caf82',
  deadline: '#e85d5d',
};

const STATUS_COLORS: Record<string, string> = {
  airing:           C.green,
  filming:          C.purple,
  writing:          C.amber,
  marketing:        '#5b8dee',
  'renewal-pending': C.accent,
  completed:        C.muted,
  cancelled:        C.red,
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

function HeatmapDot({ rating, empty }: { rating: number | null; empty?: boolean }) {
  let color = C.border;
  if (!empty && rating !== null) {
    color = rating >= 8 ? '#2d8a5e' : rating >= 6.5 ? '#5a9e45' : rating >= 5 ? '#c8a135' : '#c04040';
  }
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

function ShowCard({ show, onPress }: { show: Show; onPress: () => void }) {
  const season = show.seasons[show.currentSeasonIndex];
  if (!season) return null;

  const statusLabel = show.status.replace('-', ' ');
  const statusColor = STATUS_COLORS[show.status] ?? C.muted;

  const avgRating = season.episodes.filter(e => e.rating !== null).reduce(
    (acc, e, _, arr) => acc + (e.rating ?? 0) / arr.length, 0
  );

  return (
    <TouchableOpacity style={styles.showCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.showCardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.showTitle}>{show.title}</Text>
          <Text style={styles.showMeta}>
            {show.genre.charAt(0).toUpperCase() + show.genre.slice(1)} · S{season.seasonNumber}
            {show.status === 'airing' ? ` · Ep ${season.episodesAired} of ${season.episodeCount}` : ''}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            ● {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
          </Text>
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
                {show.pendingStreamingOffer.platformName} wants streaming rights · up to {fmt(show.pendingStreamingOffer.exclusiveAmount)}
              </Text>
            </View>
          )}

          <View style={styles.showStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{avgRating > 0 ? avgRating.toFixed(1) : '—'}</Text>
              <Text style={styles.statLabel}>Avg rating</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {season.totalViewers > 0 ? fmtViewers(Math.round(season.totalViewers / Math.max(season.episodesAired, 1))) : '—'}
              </Text>
              <Text style={styles.statLabel}>Viewers / ep</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{fmt(season.totalAdRevenue)}</Text>
              <Text style={styles.statLabel}>Ad revenue</Text>
            </View>
          </View>
        </>
      ) : (
        <>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${show.status === 'writing'
                    ? (season.writingWeeksCompleted / season.writingWeeksTotal) * 100
                    : show.status === 'filming'
                    ? (season.filmingWeeksCompleted / season.filmingWeeksTotal) * 100
                    : show.status === 'marketing'
                    ? (season.marketingWeeksCompleted / Math.max(season.marketingWeeksTotal, 1)) * 100
                    : 0}%`,
                  backgroundColor: statusColor,
                },
              ]}
            />
          </View>
          <View style={styles.progressFooter}>
            <Text style={[styles.progressLabel, { color: statusColor }]}>
              {show.status === 'writing'
                ? `${season.writingWeeksTotal - season.writingWeeksCompleted} week${season.writingWeeksTotal - season.writingWeeksCompleted !== 1 ? 's' : ''} remaining`
                : show.status === 'filming'
                ? `${season.filmingWeeksTotal - season.filmingWeeksCompleted} week${season.filmingWeeksTotal - season.filmingWeeksCompleted !== 1 ? 's' : ''} remaining`
                : show.status === 'marketing' && season.airDateWeek != null
                ? `Premieres Week ${season.airDateWeek}, Year ${season.airDateYear}`
                : show.status === 'marketing'
                ? 'No air date set'
                : ''}
            </Text>
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { network, shows, inboxItems, newsItems, advanceWeek, initialized, initializeGame } = useGameStore();

  if (!initialized) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.setupScreen}>
          <Text style={styles.setupTitle}>TV Studio Sim</Text>
          <TouchableOpacity
            style={styles.advanceBtn}
            onPress={() => initializeGame('Apex Television', 'AT')}
          >
            <Text style={styles.advanceBtnText}>Start New Game</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const activeShows = shows.filter(s =>
    ['writing', 'filming', 'marketing', 'airing', 'renewal-pending'].includes(s.status)
  );
  const latestNews = newsItems[newsItems.length - 1];
  const unreadInbox = inboxItems
    .filter(i => {
      if (i.read) return false;
      const ageWeeks = (network.currentYear - i.year) * 52 + (network.currentWeek - i.week);
      return ageWeeks < 2;
    })
    .slice(0, 3);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{network.initials}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.networkName}>{network.name}</Text>
            <Text style={styles.networkSub}>Independent · Year {network.currentYear}</Text>
          </View>
          <View style={styles.weekBadge}>
            <Text style={styles.weekText}>Week{'\n'}{network.currentWeek}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statCardLabel}>CASH ON HAND</Text>
            <Text style={[styles.statCardValue, { color: C.cash }]}>{fmt(network.cashOnHand)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statCardLabel}>CAREER EARNINGS</Text>
            <Text style={styles.statCardValue}>{fmt(network.careerEarnings)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statCardLabel}>ACTIVE SHOWS</Text>
            <Text style={[styles.statCardValue, { color: C.accent }]}>{activeShows.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statCardLabel}>EMMYS WON</Text>
            <Text style={styles.statCardValue}>{network.emmysWon}</Text>
          </View>
        </View>

        {/* News */}
        {latestNews && (
          <View style={styles.newsCard}>
            <View style={styles.newsHeader}>
              <View style={styles.deadlinePill}>
                <Text style={styles.deadlineText}>DEADLINE</Text>
              </View>
              <Text style={styles.newsWeek}>Week {latestNews.week} · Year {latestNews.year}</Text>
            </View>
            <Text style={styles.newsHeadline}>{latestNews.headline}</Text>
            <Text style={styles.newsBody}>{latestNews.body}</Text>
          </View>
        )}

        {/* Slate */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>YOUR SLATE</Text>
          <TouchableOpacity onPress={() => router.push('/create-show')}>
            <Text style={styles.seeAll}>+ Create Show</Text>
          </TouchableOpacity>
        </View>

        {activeShows.length === 0 ? (
          <TouchableOpacity
            style={styles.emptyState}
            onPress={() => router.push('/create-show')}
          >
            <Text style={styles.emptyText}>No active shows.</Text>
            <Text style={[styles.emptyText, { color: C.accent, marginTop: 6 }]}>+ Create your first show</Text>
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

        {/* Inbox preview */}
        {unreadInbox.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>INBOX</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/inbox')}>
                <Text style={styles.seeAll}>View all →</Text>
              </TouchableOpacity>
            </View>
            {unreadInbox.map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.inboxItem}
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
            ))}
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Advance Week */}
      <View style={styles.advanceContainer}>
        <TouchableOpacity style={styles.advanceBtn} onPress={advanceWeek}>
          <Text style={styles.advanceBtnText}>
            Advance to Week {network.currentWeek === 52 ? 1 : network.currentWeek + 1}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: C.bg },
  scroll:          { flex: 1 },
  scrollContent:   { padding: 16, paddingBottom: 8 },

  setupScreen:     { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  setupTitle:      { color: C.text, fontSize: 28, fontWeight: '700', marginBottom: 32 },

  header:          { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  badge:           { width: 44, height: 44, borderRadius: 10, backgroundColor: C.accent, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  badgeText:       { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerInfo:      { flex: 1 },
  networkName:     { color: C.text, fontSize: 18, fontWeight: '700' },
  networkSub:      { color: C.muted, fontSize: 13, marginTop: 2 },
  weekBadge:       { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center' },
  weekText:        { color: C.text, fontSize: 12, textAlign: 'center', lineHeight: 16 },

  statsGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statCard:        { flex: 1, minWidth: '45%', backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 12 },
  statCardLabel:   { color: C.muted, fontSize: 11, letterSpacing: 0.5, marginBottom: 4 },
  statCardValue:   { color: C.text, fontSize: 20, fontWeight: '700' },

  newsCard:        { backgroundColor: '#1a1432', borderRadius: 10, borderWidth: 1, borderColor: '#2d2054', padding: 14, marginBottom: 20 },
  newsHeader:      { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  deadlinePill:    { backgroundColor: C.deadline, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  deadlineText:    { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  newsWeek:        { color: C.accent, fontSize: 12 },
  newsHeadline:    { color: C.accent, fontSize: 15, fontWeight: '600', marginBottom: 6 },
  newsBody:        { color: '#a89fd4', fontSize: 13, lineHeight: 19 },

  sectionHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle:    { color: C.muted, fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  seeAll:          { color: C.accent, fontSize: 13 },

  showCard:        { backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 10 },
  showCardHeader:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  showTitle:       { color: C.text, fontSize: 16, fontWeight: '600' },
  showMeta:        { color: C.muted, fontSize: 13, marginTop: 3 },
  statusPill:      { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  statusText:      { fontSize: 12, fontWeight: '500' },

  heatmap:         { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 10 },
  dot:             { width: 22, height: 22, borderRadius: 4 },

  streamingBanner: { backgroundColor: '#1e3a2f', borderRadius: 6, padding: 8, marginBottom: 10 },
  streamingText:   { color: C.green, fontSize: 13 },

  showStats:       { flexDirection: 'row', justifyContent: 'space-around' },
  statItem:        { alignItems: 'center' },
  statValue:       { color: C.text, fontSize: 16, fontWeight: '600' },
  statLabel:       { color: C.muted, fontSize: 11, marginTop: 2 },

  progressBar:     { height: 4, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' },
  progressFill:    { height: '100%', borderRadius: 2 },
  progressFooter:  { marginTop: 6 },
  progressLabel:   { fontSize: 12, fontWeight: '500' },

  emptyState:      { backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 20, alignItems: 'center', marginBottom: 16 },
  emptyText:       { color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 20 },

  inboxItem:       { backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  inboxDot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: C.accent },
  inboxTitle:      { color: C.text, fontSize: 14, fontWeight: '500' },
  inboxPreview:    { color: C.muted, fontSize: 12, marginTop: 2 },
  inboxAction:     { color: C.accent, fontSize: 13 },

  advanceContainer: { padding: 12, paddingBottom: 4, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bg },
  advanceBtn:      { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 16, alignItems: 'center' },
  advanceBtnText:  { color: C.text, fontSize: 16, fontWeight: '600' },
});
