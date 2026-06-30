import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGameStore } from '../src/store/gameStore';
import { Episode } from '../src/types';

const C = {
  bg: '#0f0f17', card: '#16161f', border: '#1e1e2e',
  text: '#e8e8f0', muted: '#6b6b82', accent: '#7c6af7',
  green: '#4caf82', red: '#e85d5d', amber: '#f5a623', purple: '#9b59b6',
};

const CHEM_COLORS = { green: '#4caf82', blue: '#5b8dee', red: '#e85d5d' };

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

function ratingColor(r: number): string {
  if (r >= 8)   return '#2d8a5e';
  if (r >= 6.5) return '#5a9e45';
  if (r >= 5)   return '#c8a135';
  return '#c04040';
}

function HeatmapDot({ ep, empty }: { ep?: Episode; empty?: boolean }) {
  const color = empty || !ep?.rating ? C.border : ratingColor(ep.rating);
  return (
    <View style={s.dot}>
      <View style={[s.dotInner, { backgroundColor: color }]}>
        {ep?.rating && <Text style={s.dotText}>{ep.rating.toFixed(1)}</Text>}
      </View>
    </View>
  );
}

export default function SeasonDetailScreen() {
  const router = useRouter();
  const { showID, seasonNumber } = useLocalSearchParams<{ showID: string; seasonNumber: string }>();
  const { shows, talent } = useGameStore();

  const show = shows.find(sh => sh.id === showID);
  const season = show?.seasons.find(se => se.seasonNumber === Number(seasonNumber));

  if (!show || !season) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ color: C.muted, padding: 32 }}>Season not found.</Text>
      </SafeAreaView>
    );
  }

  const showrunner = talent.find(t => t.id === season.showrunnerID);
  const director = season.directorID ? talent.find(t => t.id === season.directorID) : null;
  const leadActors = season.leadActorIDs.map(id => talent.find(t => t.id === id)).filter(Boolean) as typeof talent;
  const supportingActors = season.supportingActorIDs.map(id => talent.find(t => t.id === id)).filter(Boolean) as typeof talent;

  const airedEpisodes = season.episodes.filter(e => e.rating !== null);
  const avgRating = airedEpisodes.length > 0
    ? airedEpisodes.reduce((sum, e) => sum + (e.rating ?? 0), 0) / airedEpisodes.length
    : 0;
  const avgViewers = airedEpisodes.length > 0
    ? Math.round(season.totalViewers / airedEpisodes.length)
    : 0;

  const netProfit = season.totalAdRevenue + season.streamingRevenue - season.productionCost - season.marketingSpend;

  const peakEp = airedEpisodes.reduce<Episode | null>(
    (best, e) => (!best || (e.rating ?? 0) > (best.rating ?? 0) ? e : best), null
  );
  const lowestEp = airedEpisodes.reduce<Episode | null>(
    (worst, e) => (!worst || (e.rating ?? 0) < (worst.rating ?? 0) ? e : worst), null
  );

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{show.title}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent}>

        {/* Season identity */}
        <Text style={s.seasonHeading}>Season {season.seasonNumber}</Text>
        <Text style={s.seasonMeta}>
          {show.genre} · {season.episodeCount} episodes
          {season.airDateYear ? ` · Year ${season.airDateYear}` : ''}
        </Text>

        {/* Ratings overview */}
        {airedEpisodes.length > 0 && (
          <>
            <Text style={s.sectionLabel}>RATINGS</Text>
            <View style={s.statsRow}>
              <View style={s.statChip}>
                <Text style={[s.statChipValue, { color: ratingColor(avgRating) }]}>{avgRating.toFixed(1)}</Text>
                <Text style={s.statChipLabel}>Avg Rating</Text>
              </View>
              <View style={s.statChip}>
                <Text style={s.statChipValue}>{fmtViewers(avgViewers)}</Text>
                <Text style={s.statChipLabel}>Avg Viewers</Text>
              </View>
              <View style={s.statChip}>
                <Text style={s.statChipValue}>{fmt(season.totalAdRevenue)}</Text>
                <Text style={s.statChipLabel}>Ad Revenue</Text>
              </View>
            </View>

            {/* Heatmap */}
            <View style={s.heatmap}>
              {Array.from({ length: season.episodeCount }, (_, i) => (
                <HeatmapDot
                  key={i}
                  ep={season.episodes[i]}
                  empty={i >= season.episodesAired}
                />
              ))}
            </View>

            {/* Peak / low */}
            {peakEp && lowestEp && peakEp.id !== lowestEp.id && (
              <View style={s.peakRow}>
                <View style={s.peakChip}>
                  <Text style={[s.peakLabel, { color: C.green }]}>Peak — Ep {peakEp.episodeNumber}</Text>
                  <Text style={[s.peakValue, { color: C.green }]}>{peakEp.rating?.toFixed(1)}</Text>
                </View>
                <View style={s.peakChip}>
                  <Text style={[s.peakLabel, { color: C.red }]}>Low — Ep {lowestEp.episodeNumber}</Text>
                  <Text style={[s.peakValue, { color: C.red }]}>{lowestEp.rating?.toFixed(1)}</Text>
                </View>
              </View>
            )}
          </>
        )}

        {/* Episode list */}
        {airedEpisodes.length > 0 && (
          <>
            <Text style={s.sectionLabel}>EPISODES</Text>
            <View style={s.card}>
              {airedEpisodes.map((ep, i) => (
                <View key={ep.id} style={[s.epRow, i === airedEpisodes.length - 1 && { borderBottomWidth: 0 }]}>
                  <Text style={s.epNum}>Ep {ep.episodeNumber}</Text>
                  <View style={[s.epRatingBadge, { backgroundColor: ratingColor(ep.rating!) + '33', borderColor: ratingColor(ep.rating!) }]}>
                    <Text style={[s.epRating, { color: ratingColor(ep.rating!) }]}>{ep.rating!.toFixed(1)}</Text>
                  </View>
                  <Text style={s.epViewers}>{fmtViewers(ep.viewers ?? 0)}</Text>
                  <Text style={s.epRevenue}>{fmt(ep.adRevenue ?? 0)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Financials */}
        <Text style={s.sectionLabel}>FINANCIALS</Text>
        <View style={s.card}>
          <View style={s.finRow}>
            <Text style={s.finLabel}>Production cost</Text>
            <Text style={s.finValue}>{fmt(season.productionCost)}</Text>
          </View>
          <View style={s.finRow}>
            <Text style={s.finLabel}>Marketing spend</Text>
            <Text style={s.finValue}>{fmt(season.marketingSpend)}</Text>
          </View>
          <View style={s.finRow}>
            <Text style={s.finLabel}>Ad revenue</Text>
            <Text style={[s.finValue, { color: C.green }]}>{fmt(season.totalAdRevenue)}</Text>
          </View>
          {season.streamingRevenue > 0 && (
            <View style={s.finRow}>
              <Text style={s.finLabel}>Streaming deal</Text>
              <Text style={[s.finValue, { color: C.green }]}>{fmt(season.streamingRevenue)}</Text>
            </View>
          )}
          <View style={[s.finRow, s.finTotal]}>
            <Text style={[s.finLabel, { color: C.text, fontWeight: '600' }]}>Net</Text>
            <Text style={[s.finValue, { color: netProfit >= 0 ? C.green : C.red, fontWeight: '700' }]}>
              {netProfit >= 0 ? '+' : ''}{fmt(netProfit)}
            </Text>
          </View>
        </View>

        {/* Crew */}
        <Text style={s.sectionLabel}>CREW</Text>
        <View style={s.card}>
          {showrunner && <CrewRow label="Showrunner" talent={showrunner} router={router} />}
          {director   && <CrewRow label="Director"   talent={director}   router={router} />}
          {!showrunner && !director && (
            <Text style={s.emptyText}>No crew data on record.</Text>
          )}
        </View>

        {/* Cast */}
        {(leadActors.length > 0 || supportingActors.length > 0) && (
          <>
            <Text style={s.sectionLabel}>CAST</Text>
            <View style={s.card}>
              {leadActors.map((actor, i) => (
                <CrewRow
                  key={actor.id}
                  label="Lead Actor"
                  talent={actor}
                  router={router}
                  last={i === leadActors.length - 1 && supportingActors.length === 0}
                />
              ))}
              {supportingActors.map((actor, i) => (
                <CrewRow
                  key={actor.id}
                  label="Supporting"
                  talent={actor}
                  router={router}
                  last={i === supportingActors.length - 1}
                />
              ))}
            </View>
          </>
        )}

        {/* Creative scores */}
        {(season.scriptScore > 0 || season.qualityScore !== 50) && (
          <>
            <Text style={s.sectionLabel}>CREATIVE SCORES</Text>
            <View style={s.scoresRow}>
              {season.scriptScore > 0 && (
                <ScoreCard label="Script" score={season.scriptScore} sublabel="Writing" />
              )}
              {season.qualityScore !== 50 && (
                <ScoreCard label="Production" score={season.qualityScore} sublabel="Filming" />
              )}
              {season.scriptScore > 0 && season.qualityScore !== 50 && (
                <ScoreCard
                  label="Combined"
                  score={Math.round(season.scriptScore * 0.45 + season.qualityScore * 0.55)}
                  sublabel="Overall"
                  highlight
                />
              )}
            </View>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function CrewRow({
  label, talent, router, last,
}: {
  label: string;
  talent: any;
  router: ReturnType<typeof useRouter>;
  last?: boolean;
}) {
  const chemColor = CHEM_COLORS[talent.chemistryColor as keyof typeof CHEM_COLORS] ?? C.muted;
  return (
    <TouchableOpacity
      style={[s.crewRow, last && { borderBottomWidth: 0 }]}
      activeOpacity={0.7}
      onPress={() => router.push(`/talent/${talent.id}`)}
    >
      <View style={[s.crewChemDot, { backgroundColor: chemColor }]} />
      <View style={{ flex: 1 }}>
        <Text style={s.crewName}>{talent.name}</Text>
        <Text style={s.crewRole}>{label}</Text>
      </View>
      <Text style={s.crewChevron}>›</Text>
    </TouchableOpacity>
  );
}

function ScoreCard({ label, score, sublabel, highlight }: {
  label: string; score: number; sublabel: string; highlight?: boolean;
}) {
  const color = score >= 75 ? C.green : score >= 50 ? C.amber : C.red;
  return (
    <View style={[s.scoreCard, highlight && { borderColor: color, backgroundColor: color + '18' }]}>
      <Text style={[s.scoreValue, { color }]}>{score}</Text>
      <Text style={s.scoreLabel}>{label}</Text>
      <Text style={s.scoreSublabel}>{sublabel}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: C.bg },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:         { width: 60 },
  backText:        { color: C.accent, fontSize: 15 },
  headerTitle:     { color: C.text, fontSize: 17, fontWeight: '600', flex: 1, textAlign: 'center' },
  scrollContent:   { padding: 16 },

  seasonHeading:   { color: C.text, fontSize: 26, fontWeight: '700', marginBottom: 4 },
  seasonMeta:      { color: C.muted, fontSize: 14, marginBottom: 4 },

  sectionLabel:    { color: C.muted, fontSize: 11, fontWeight: '600', letterSpacing: 1, marginTop: 20, marginBottom: 10 },

  statsRow:        { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  statChip:        { alignItems: 'center' },
  statChipValue:   { color: C.text, fontSize: 20, fontWeight: '700' },
  statChipLabel:   { color: C.muted, fontSize: 11, marginTop: 2 },

  heatmap:         { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  dot:             { padding: 2 },
  dotInner:        { width: 38, height: 38, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  dotText:         { color: '#fff', fontSize: 10, fontWeight: '600' },

  peakRow:         { flexDirection: 'row', gap: 10, marginBottom: 4 },
  peakChip:        { flex: 1, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 8 },
  peakLabel:       { fontSize: 13 },
  peakValue:       { fontSize: 13, fontWeight: '700' },

  card:            { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, marginBottom: 4 },

  epRow:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border, gap: 10 },
  epNum:           { color: C.muted, fontSize: 13, width: 36 },
  epRatingBadge:   { borderWidth: 1, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  epRating:        { fontSize: 13, fontWeight: '600' },
  epViewers:       { flex: 1, color: C.muted, fontSize: 13 },
  epRevenue:       { color: C.text, fontSize: 13 },

  finRow:          { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  finTotal:        { borderBottomWidth: 0 },
  finLabel:        { color: C.muted, fontSize: 14 },
  finValue:        { color: C.text, fontSize: 14, fontWeight: '500' },

  crewRow:         { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  crewChemDot:     { width: 10, height: 10, borderRadius: 5 },
  crewName:        { color: C.text, fontSize: 14, fontWeight: '500' },
  crewRole:        { color: C.muted, fontSize: 12, marginTop: 2 },
  crewChevron:     { color: C.muted, fontSize: 20 },

  emptyText:       { color: C.muted, fontSize: 13, fontStyle: 'italic', padding: 14 },

  scoresRow:       { flexDirection: 'row', gap: 10 },
  scoreCard:       { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, alignItems: 'center' },
  scoreValue:      { fontSize: 28, fontWeight: '700', marginBottom: 2 },
  scoreLabel:      { color: C.text, fontSize: 13, fontWeight: '600' },
  scoreSublabel:   { color: C.muted, fontSize: 11, marginTop: 2 },
});
