import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, Image,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useGameStore } from '../../src/store/gameStore';
import { Show } from '../../src/types';
import { POSTER_BACKGROUNDS } from '../poster-creator';

const C = {
  pageBg: '#0f1220', cardBg: '#191c2a',
  border: '#252840', borderGold: '#e6b25430',
  text: '#f0ede8', muted: '#9a958e', mutedMid: '#6b6880',
  gold: '#e6b254', goldDim: '#e6b25420',
  green: '#4ec46e', amber: '#d4753a', red: '#c43820', teal: '#3db8a8',
};

const POSTER_W = 68;
const POSTER_H = POSTER_W * 1.5; // 102

const FONT_MAP: Record<string, string> = {
  'bebas':         'BebasNeue_400Regular',
  'manrope-bold':  'Manrope_700Bold',
  'manrope-light': 'Manrope_300Light',
};

// Scale factor: mini poster (68px) relative to full poster (SCREEN_WIDTH * 0.65 ≈ 253px)
const SCALE = 68 / 253;

function scaledSize(full: number, min = 5): number {
  return Math.max(min, Math.round(full * SCALE));
}

function MiniPoster({
  show, networkName, talent,
}: {
  show: Show;
  networkName: string;
  talent: { id: string; name: string }[];
}) {
  const season = show.seasons[show.currentSeasonIndex] ?? show.seasons[show.seasons.length - 1];
  const config = season?.posterConfig;

  const bg = POSTER_BACKGROUNDS.find(b => b.id === (config?.backgroundID ?? 'noir-city'))
    ?? POSTER_BACKGROUNDS[0];
  const gradColors = [...bg.colors] as [string, string, ...string[]];

  if (!config) {
    return (
      <LinearGradient colors={gradColors} style={styles.miniPoster}>
        <View style={styles.miniNoPoster}>
          <Text style={styles.miniNoPosterText} numberOfLines={1}>
            {networkName.toUpperCase()} PRESENTS
          </Text>
          <Text style={styles.miniNoPosterTitle} numberOfLines={3}>
            {show.title.toUpperCase()}
          </Text>
        </View>
      </LinearGradient>
    );
  }

  // Resolve cast names
  const leadNames = (season.leadActorIDs ?? [])
    .map(id => talent.find(t => t.id === id)?.name).filter(Boolean) as string[];
  const suppNames = (season.supportingActorIDs ?? [])
    .map(id => talent.find(t => t.id === id)?.name).filter(Boolean) as string[];
  let castNames: string[] = [];
  if (leadNames.length >= 2) castNames = leadNames.slice(0, 2);
  else if (leadNames.length === 1 && suppNames.length >= 1) castNames = [leadNames[0], suppNames[0]];
  else if (leadNames.length === 1) castNames = [leadNames[0]];

  const titleFont = FONT_MAP[config.titleFont] ?? 'BebasNeue_400Regular';
  const isBebas   = config.titleFont === 'bebas' || !config.titleFont;
  const titleAlign = config.titleAlignment ?? 'left';
  const seasonAlign = config.seasonAlignment ?? 'left';

  // Title size: scale from full-poster pixel sizes
  const FULL_SIZES = { large: 50, medium: 36, small: 24 };
  const titlePx = scaledSize(FULL_SIZES[config.titleSize] ?? 50, 8);

  const seasonLabel = config.showSeasonNumber ? (
    <Text style={[styles.miniSeason, { color: bg.accent, textAlign: seasonAlign }]}>
      SEASON {season.seasonNumber}
    </Text>
  ) : null;

  const titleEl = (
    <Text
      style={[
        styles.miniTitle,
        {
          color: config.titleColor,
          fontFamily: titleFont,
          fontSize: titlePx,
          lineHeight: titlePx * (isBebas ? 1.02 : 1.15),
          textAlign: titleAlign,
        },
      ]}
      numberOfLines={3}
    >
      {show.title.toUpperCase()}
    </Text>
  );

  const taglineEl = config.tagline?.trim() ? (
    <Text style={[styles.miniTagline, { textAlign: titleAlign }]} numberOfLines={2}>
      {config.tagline}
    </Text>
  ) : null;

  const castEl = castNames.length > 0 ? (
    <Text style={[styles.miniCast, { color: bg.accent }]} numberOfLines={1}>
      {castNames.join('  ·  ').toUpperCase()}
    </Text>
  ) : null;

  const textBlock = (
    <View style={[
      styles.miniTextBlock,
      config.titlePosition === 'top' ? styles.miniTextTop : styles.miniTextBottom,
    ]}>
      {config.seasonPosition === 'above-title' ? seasonLabel : null}
      {titleEl}
      {config.seasonPosition === 'below-title' ? seasonLabel : null}
      {taglineEl}
    </View>
  );

  const castBlock = castEl ? (
    <View style={[
      styles.miniCastBlock,
      config.castPosition === 'top' ? styles.miniCastTop : styles.miniCastBottom,
    ]}>
      {castEl}
    </View>
  ) : null;

  return (
    <LinearGradient colors={gradColors} style={styles.miniPoster}>
      {/* Studio presents */}
      <View style={styles.miniPresentsRow}>
        <Text style={styles.miniPresents} numberOfLines={1}>
          {networkName.toUpperCase()} PRESENTS
        </Text>
      </View>
      {castBlock}
      {textBlock}
    </LinearGradient>
  );
}

const STATUS_COLORS: Record<string, string> = {
  airing:            C.green,
  filming:           C.teal,
  writing:           '#5b8dee',
  marketing:         C.amber,
  'renewal-pending': C.gold,
  completed:         C.muted,
  cancelled:         C.red,
};

type Filter = 'all' | 'active' | 'ended';
const ACTIVE_STATUSES = new Set(['writing', 'filming', 'marketing', 'airing', 'renewal-pending']);

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

function getShowStats(show: Show) {
  let totalRevenue = 0;
  let totalViewers = 0;
  let bestRating = 0;
  let totalEpisodesAired = 0;

  for (const season of show.seasons) {
    totalRevenue += season.totalAdRevenue + season.streamingRevenue;
    totalViewers += season.totalViewers;
    for (const ep of season.episodes) {
      if (ep.rating !== null) {
        if (ep.rating > bestRating) bestRating = ep.rating;
        totalEpisodesAired++;
      }
    }
  }

  return { totalRevenue, totalViewers, bestRating, totalEpisodesAired };
}

function ShowCard({ show, onPress, networkName, talent }: {
  show: Show; onPress: () => void; networkName: string; talent: { id: string; name: string }[];
}) {
  const season = show.seasons[show.currentSeasonIndex];
  const statusColor = STATUS_COLORS[show.status] ?? C.muted;
  const statusLabel = show.status.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase());
  const stats = getShowStats(show);
  const isActive = ACTIVE_STATUSES.has(show.status);
  const seasonCount = show.seasons.length;

  let progressPct = 0;
  if (season) {
    if (show.status === 'writing') progressPct = (season.writingWeeksCompleted / season.writingWeeksTotal) * 100;
    else if (show.status === 'filming') progressPct = (season.filmingWeeksCompleted / season.filmingWeeksTotal) * 100;
    else if (show.status === 'marketing') progressPct = season.marketingWeeksTotal > 0 ? (season.marketingWeeksCompleted / season.marketingWeeksTotal) * 100 : 0;
    else if (show.status === 'airing') progressPct = season.episodeCount > 0 ? (season.episodesAired / season.episodeCount) * 100 : 0;
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardInner}>

        {/* Mini poster */}
        <View style={styles.posterCol}>
          <MiniPoster show={show} networkName={networkName} talent={talent} />
        </View>

        {/* Show info */}
        <View style={styles.contentCol}>
          <View style={styles.cardTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.showTitle} numberOfLines={1}>{show.title}</Text>
              <Text style={styles.showMeta}>
                {show.genre.charAt(0).toUpperCase() + show.genre.slice(1)}
                {' · '}{show.theme.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-')}
                {seasonCount > 1 ? ` · ${seasonCount}S` : ' · S1'}
                {!show.inHouse ? ' · Pitch' : ''}
              </Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>● {statusLabel}</Text>
            </View>
          </View>

          {isActive && ['writing', 'filming', 'marketing'].includes(show.status) && (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPct}%` as any, backgroundColor: statusColor }]} />
            </View>
          )}

          {(show.status === 'airing' || show.status === 'renewal-pending') && season && (
            <View style={styles.dotRow}>
              {Array.from({ length: season.episodeCount }, (_, i) => {
                const ep = season.episodes[i];
                let color = C.border;
                if (ep?.rating !== null && ep?.rating !== undefined) {
                  color = ep.rating >= 8 ? '#2d8a5e' : ep.rating >= 6.5 ? '#5a9e45' : ep.rating >= 5 ? '#c8a135' : '#c04040';
                }
                return <View key={i} style={[styles.dot, { backgroundColor: color }]} />;
              })}
            </View>
          )}

          <View style={styles.statsRow}>
            <StatItem label="Ad Rev"   value={stats.totalRevenue > 0 ? fmt(stats.totalRevenue) : '—'} />
            <StatItem label="Viewers"  value={stats.totalViewers > 0 ? fmtViewers(stats.totalViewers) : '—'} />
            <StatItem label="Best Ep"  value={stats.bestRating > 0 ? stats.bestRating.toFixed(1) : '—'} />
            <StatItem label="Episodes" value={stats.totalEpisodesAired > 0 ? String(stats.totalEpisodesAired) : '—'} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ShowsScreen() {
  const router = useRouter();
  const { shows, network, talent } = useGameStore();
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = shows.filter(show => {
    if (filter === 'active') return ACTIVE_STATUSES.has(show.status);
    if (filter === 'ended') return show.status === 'completed' || show.status === 'cancelled';
    return true;
  });

  const STATUS_ORDER: Record<string, number> = {
    airing: 0, 'renewal-pending': 1, filming: 2, marketing: 3, writing: 4,
    completed: 5, cancelled: 6,
  };
  const sorted = [...filtered].sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));

  const activeCount = shows.filter(s => ACTIVE_STATUSES.has(s.status)).length;
  const endedCount  = shows.filter(s => s.status === 'completed' || s.status === 'cancelled').length;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#131829', '#0f1220', '#0a0d18']}
        style={StyleSheet.absoluteFill}
      />
      <FilmRibbonAmbient />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shows</Text>
        <TouchableOpacity onPress={() => router.push('/create-show')}>
          <Text style={styles.newShow}>+ New</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {([
          ['all',    `All (${shows.length})`],
          ['active', `Active (${activeCount})`],
          ['ended',  `Ended (${endedCount})`],
        ] as [Filter, string][]).map(([val, label]) => (
          <TouchableOpacity
            key={val}
            style={[styles.filterTab, filter === val && styles.filterTabActive]}
            onPress={() => setFilter(val)}
          >
            <Text style={[styles.filterTabText, filter === val && styles.filterTabTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {sorted.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            {filter === 'all' ? 'No shows yet.' : `No ${filter} shows.`}
          </Text>
          {filter !== 'ended' && (
            <TouchableOpacity onPress={() => router.push('/create-show')}>
              <Text style={[styles.emptyText, { color: C.gold, marginTop: 8 }]}>
                + Create your first show
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={s => s.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ShowCard
              show={item}
              onPress={() => router.push(`/show/${item.id}`)}
              networkName={network.name}
              talent={talent}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: C.pageBg },

  header:              { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle:         { color: C.gold, fontFamily: 'BebasNeue_400Regular', fontSize: 28, letterSpacing: 1 },
  newShow:             { color: C.gold, fontFamily: 'Manrope_600SemiBold', fontSize: 15 },

  filterRow:           { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  filterTab:           { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.cardBg },
  filterTabActive:     { borderColor: C.gold, backgroundColor: C.goldDim },
  filterTabText:       { color: C.muted, fontFamily: 'Manrope_600SemiBold', fontSize: 13 },
  filterTabTextActive: { color: C.gold },

  list:                { padding: 12, gap: 10 },

  card:                { backgroundColor: C.cardBg, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 12 },
  cardInner:           { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  posterCol:           { width: POSTER_W },
  contentCol:          { flex: 1, minWidth: 0 },

  // Mini poster
  miniPoster:          { width: POSTER_W, height: POSTER_H, borderRadius: 8, overflow: 'hidden' },

  miniPresentsRow:     { alignItems: 'center', paddingTop: 5, paddingHorizontal: 4 },
  miniPresents:        { fontFamily: 'Manrope_600SemiBold', color: '#ffffff77', fontSize: 5, letterSpacing: 1.2 },

  miniCastBlock:       { position: 'absolute', left: 4, right: 4 },
  miniCastTop:         { top: 18 },
  miniCastBottom:      { bottom: 6 },
  miniCast:            { fontFamily: 'Manrope_700Bold', fontSize: 5, letterSpacing: 1, textAlign: 'center' },

  miniTextBlock:       { position: 'absolute', left: 5, right: 5 },
  miniTextTop:         { top: 26 },
  miniTextBottom:      { bottom: 10 },
  miniTitle:           { letterSpacing: 0.3 },
  miniSeason:          { fontFamily: 'Manrope_800ExtraBold', fontSize: 6, letterSpacing: 1.5, marginBottom: 2, marginTop: 1 },
  miniTagline:         { fontFamily: 'Manrope_600SemiBold', color: '#ffffffaa', fontSize: 5.5, marginTop: 3, lineHeight: 7 },

  miniNoPoster:        { flex: 1, justifyContent: 'flex-end', padding: 6 },
  miniNoPosterText:    { fontFamily: 'Manrope_600SemiBold', color: '#ffffff66', fontSize: 5, letterSpacing: 1.2, textAlign: 'center', marginBottom: 4 },
  miniNoPosterTitle:   { fontFamily: 'BebasNeue_400Regular', color: '#ffffff55', fontSize: 11, letterSpacing: 0.5, lineHeight: 12 },

  cardTop:             { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  showTitle:           { color: C.text, fontFamily: 'Manrope_700Bold', fontSize: 14, marginBottom: 2 },
  showMeta:            { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 11 },
  statusPill:          { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginLeft: 8 },
  statusText:          { fontFamily: 'Manrope_600SemiBold', fontSize: 11 },

  progressTrack:       { height: 3, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden', marginBottom: 10 },
  progressFill:        { height: '100%', borderRadius: 2 },

  dotRow:              { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 10 },
  dot:                 { width: 18, height: 18, borderRadius: 3 },

  statsRow:            { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border },
  statItem:            { alignItems: 'center' },
  statValue:           { color: C.text, fontFamily: 'Manrope_700Bold', fontSize: 14 },
  statLabel:           { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 11, marginTop: 2 },

  empty:               { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText:           { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 15, textAlign: 'center' },
});