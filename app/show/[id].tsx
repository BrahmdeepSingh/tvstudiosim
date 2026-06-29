import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGameStore } from '../../src/store/gameStore';
import { Season, Episode } from '../../src/types';

const C = {
  bg: '#0f0f17', card: '#16161f', border: '#1e1e2e',
  text: '#e8e8f0', muted: '#6b6b82', accent: '#7c6af7',
  green: '#4caf82', red: '#e85d5d', amber: '#f5a623', purple: '#9b59b6',
};

const CHEM_COLORS = { green: '#4caf82', blue: '#5b8dee', red: '#e85d5d' };

const STATUS_COLORS: Record<string, string> = {
  airing:             C.green,
  filming:            C.purple,
  writing:            C.amber,
  marketing:          '#5b8dee',
  'renewal-pending':  C.accent,
  completed:          C.muted,
  cancelled:          C.red,
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

function ratingColor(r: number): string {
  if (r >= 8)   return '#2d8a5e';
  if (r >= 6.5) return '#5a9e45';
  if (r >= 5)   return '#c8a135';
  return '#c04040';
}

function HeatmapDot({ ep, empty }: { ep?: Episode; empty?: boolean }) {
  const color = empty || !ep?.rating ? C.border : ratingColor(ep.rating);
  return (
    <View style={[sd.dot, { backgroundColor: color }]}>
      {ep?.rating && <Text style={sd.dotText}>{ep.rating.toFixed(1)}</Text>}
    </View>
  );
}

export default function ShowDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { shows, talent, network, cancelShow, acceptStreamingOffer } = useGameStore();

  const show = shows.find(s => s.id === id);
  if (!show) {
    return (
      <SafeAreaView style={sd.container}>
        <Text style={{ color: C.muted, padding: 32 }}>Show not found.</Text>
      </SafeAreaView>
    );
  }

  const season = show.seasons[show.currentSeasonIndex];
  const showrunner = talent.find(t => t.id === season.showrunnerID);
  const director = season.directorID ? talent.find(t => t.id === season.directorID) : null;
  const leadActors = season.leadActorIDs.map(id => talent.find(t => t.id === id)).filter(Boolean) as typeof talent;
  const supportingActors = season.supportingActorIDs.map(id => talent.find(t => t.id === id)).filter(Boolean) as typeof talent;

  const statusColor = STATUS_COLORS[show.status] ?? C.muted;
  const statusLabel = show.status.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase());

  const avgRating = season.episodes
    .filter(e => e.rating !== null)
    .reduce((acc, e, _, arr) => acc + (e.rating ?? 0) / arr.length, 0);

  const streamingRevenue = season.streamingOfferAccepted ? season.streamingOfferAmount : 0;
  const netProfit = season.totalAdRevenue + streamingRevenue - season.productionCost - season.marketingSpend;

  const needsDirector = show.status === 'filming' && !season.directorID;
  const leadsNeeded = season.leadActorSlots - season.leadActorIDs.length;
  const supportingNeeded = season.supportingActorSlots - season.supportingActorIDs.length;
  const needsCast = show.status === 'filming' && (leadsNeeded > 0 || supportingNeeded > 0);

  return (
    <SafeAreaView style={sd.container}>
      <View style={sd.header}>
        <TouchableOpacity onPress={() => router.back()} style={sd.backBtn}>
          <Text style={sd.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={sd.headerTitle} numberOfLines={1}>{show.title}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={sd.scroll} contentContainerStyle={sd.scrollContent}>

        {/* Show identity */}
        <View style={sd.identityRow}>
          <View style={{ flex: 1 }}>
            <Text style={sd.showTitle}>{show.title}</Text>
            <Text style={sd.showMeta}>
              {show.genre.charAt(0).toUpperCase() + show.genre.slice(1)} · {show.theme.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-')} · Season {season.seasonNumber}
            </Text>
          </View>
          <View style={[sd.statusPill, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
            <Text style={[sd.statusText, { color: statusColor }]}>● {statusLabel}</Text>
          </View>
        </View>

        {/* Action alerts */}
        {(needsDirector || needsCast) && (
          <View style={sd.alertCard}>
            <Text style={sd.alertTitle}>Action needed to begin filming</Text>
            {needsDirector && (
              <TouchableOpacity
                style={sd.alertBtn}
                onPress={() => router.push(`/hire-talent?showID=${show.id}&role=director`)}
              >
                <Text style={sd.alertBtnText}>+ Hire Director</Text>
              </TouchableOpacity>
            )}
            {leadsNeeded > 0 && (
              <TouchableOpacity
                style={sd.alertBtn}
                onPress={() => router.push(`/hire-talent?showID=${show.id}&role=actor&actorType=lead`)}
              >
                <Text style={sd.alertBtnText}>
                  + Hire Lead Actor ({season.leadActorIDs.length}/{season.leadActorSlots})
                </Text>
              </TouchableOpacity>
            )}
            {supportingNeeded > 0 && (
              <TouchableOpacity
                style={sd.alertBtn}
                onPress={() => router.push(`/hire-talent?showID=${show.id}&role=actor&actorType=supporting`)}
              >
                <Text style={sd.alertBtnText}>
                  + Hire Supporting Actor ({season.supportingActorIDs.length}/{season.supportingActorSlots})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Production progress */}
        {['writing', 'filming', 'marketing'].includes(show.status) && (
          <View style={sd.section}>
            <Text style={sd.sectionLabel}>PRODUCTION</Text>
            {show.status === 'writing' && (
              <ProgressItem
                label="Writing"
                current={season.writingWeeksCompleted}
                total={season.writingWeeksTotal}
                color={C.amber}
              />
            )}
            {show.status === 'filming' && (
              <ProgressItem
                label="Filming"
                current={season.filmingWeeksCompleted}
                total={season.filmingWeeksTotal}
                color={C.purple}
                blocked={needsDirector || needsCast}
              />
            )}
            {show.status === 'marketing' && (
              <>
                <ProgressItem
                  label="Marketing"
                  current={season.marketingWeeksCompleted}
                  total={Math.max(season.marketingWeeksTotal, 1)}
                  color="#5b8dee"
                />
                {season.airDateWeek ? (
                  <View style={sd.airDateRow}>
                    <Text style={sd.airDateText}>
                      Premieres Week {season.airDateWeek}, Year {season.airDateYear}
                    </Text>
                    <TouchableOpacity
                      onPress={() => router.push(`/marketing?showID=${show.id}`)}
                    >
                      <Text style={sd.marketingLink}>Edit →</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={sd.marketingBtn}
                    onPress={() => router.push(`/marketing?showID=${show.id}`)}
                  >
                    <Text style={sd.marketingBtnText}>Set Premiere Date & Buy Ads →</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}

        {/* Creative Scores */}
        {(season.scriptScore > 0 || season.qualityScore !== 50) && !['writing'].includes(show.status) && (
          <View style={sd.section}>
            <Text style={sd.sectionLabel}>CREATIVE SCORES</Text>
            <View style={sd.scoresRow}>
              {season.scriptScore > 0 && (
                <ScoreCard
                  label="Script"
                  score={season.scriptScore}
                  sublabel="Writing"
                />
              )}
              {!['filming'].includes(show.status) && season.qualityScore !== 50 && (
                <ScoreCard
                  label="Production"
                  score={season.qualityScore}
                  sublabel="Filming"
                />
              )}
              {season.scriptScore > 0 && !['filming'].includes(show.status) && season.qualityScore !== 50 && (
                <ScoreCard
                  label="Combined"
                  score={Math.round(season.scriptScore * 0.45 + season.qualityScore * 0.55)}
                  sublabel="Overall"
                  highlight
                />
              )}
            </View>
          </View>
        )}

        {/* Heatmap */}
        {(show.status === 'airing' || show.status === 'renewal-pending') && (
          <View style={sd.section}>
            <Text style={sd.sectionLabel}>EPISODE HEATMAP — Season {season.seasonNumber}</Text>
            <View style={sd.heatmap}>
              {Array.from({ length: season.episodeCount }, (_, i) => (
                <HeatmapDot
                  key={i}
                  ep={season.episodes[i]}
                  empty={i >= season.episodesAired}
                />
              ))}
            </View>
            <View style={sd.statsRow}>
              <StatChip label="Avg Rating" value={avgRating > 0 ? avgRating.toFixed(1) : '—'} />
              <StatChip label="Viewers/ep" value={season.totalViewers > 0 ? fmtViewers(Math.round(season.totalViewers / Math.max(season.episodesAired, 1))) : '—'} />
              <StatChip label="Ad Revenue" value={fmt(season.totalAdRevenue)} />
            </View>
          </View>
        )}

        {/* Streaming offer — pending */}
        {season.streamingOfferReceived && !season.streamingOfferAccepted && (
          <View style={sd.streamingCard}>
            <Text style={sd.streamingTitle}>
              {season.streamingOfferSource} wants S{season.seasonNumber} streaming rights
            </Text>
            <Text style={sd.streamingAmount}>{fmt(season.streamingOfferAmount)}</Text>
            <Text style={sd.streamingExpiry}>
              {season.streamingDealDurationYears > 0 ? `${season.streamingDealDurationYears}-year exclusive · ` : ''}
              Expires Week {season.streamingOfferExpiresWeek}, Year {season.streamingOfferExpiresYear}
            </Text>
            <TouchableOpacity style={sd.streamingAcceptBtn} onPress={() => acceptStreamingOffer(show.id)}>
              <Text style={sd.streamingAcceptText}>Accept Deal</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Streaming deal — accepted */}
        {season.streamingOfferAccepted && (
          <View style={sd.streamingAcceptedCard}>
            <Text style={sd.streamingAcceptedTitle}>
              {season.streamingOfferSource} streaming deal active
            </Text>
            <Text style={sd.streamingAcceptedMeta}>
              {fmt(season.streamingOfferAmount)}
              {season.streamingDealDurationYears > 0 ? ` · ${season.streamingDealDurationYears}-year exclusive` : ''}
            </Text>
          </View>
        )}

        {/* Renewal */}
        {show.status === 'renewal-pending' && !season.renewalDecisionMade && (
          <View style={sd.renewalCard}>
            <Text style={sd.renewalTitle}>Season {season.seasonNumber} Complete</Text>
            <View style={sd.renewalStats}>
              <Text style={sd.renewalStat}>Avg rating: {avgRating > 0 ? avgRating.toFixed(1) : '—'}</Text>
              <Text style={sd.renewalStat}>Net: {netProfit >= 0 ? '+' : ''}{fmt(netProfit)}</Text>
            </View>
            <View style={sd.renewalBtns}>
              <TouchableOpacity
                style={sd.renewBtn}
                onPress={() => router.push(`/renew?showID=${show.id}`)}
              >
                <Text style={sd.renewBtnText}>Renew Season {season.seasonNumber + 1} →</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={sd.cancelBtn}
                onPress={() => { cancelShow(show.id); router.back(); }}
              >
                <Text style={sd.cancelBtnText}>Cancel Show</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Financials */}
        <View style={sd.section}>
          <Text style={sd.sectionLabel}>SEASON FINANCIALS</Text>
          <View style={sd.finRow}>
            <Text style={sd.finLabel}>Production cost</Text>
            <Text style={sd.finValue}>{fmt(season.productionCost)}</Text>
          </View>
          <View style={sd.finRow}>
            <Text style={sd.finLabel}>Marketing spend</Text>
            <Text style={sd.finValue}>{fmt(season.marketingSpend)}</Text>
          </View>
          <View style={sd.finRow}>
            <Text style={sd.finLabel}>Ad revenue</Text>
            <Text style={[sd.finValue, { color: C.green }]}>{fmt(season.totalAdRevenue)}</Text>
          </View>
          {streamingRevenue > 0 && (
            <View style={sd.finRow}>
              <Text style={sd.finLabel}>Streaming deal</Text>
              <Text style={[sd.finValue, { color: C.green }]}>{fmt(streamingRevenue)}</Text>
            </View>
          )}
          <View style={[sd.finRow, sd.finTotal]}>
            <Text style={[sd.finLabel, { color: C.text }]}>Net</Text>
            <Text style={[sd.finValue, { color: netProfit >= 0 ? C.green : C.red }]}>
              {netProfit >= 0 ? '+' : ''}{fmt(netProfit)}
            </Text>
          </View>
        </View>

        {/* Crew */}
        <View style={sd.section}>
          <Text style={sd.sectionLabel}>CREW</Text>
          {showrunner && <CrewRow label="Showrunner" talent={showrunner} />}
          {director   && <CrewRow label="Director"   talent={director} />}
          {!director && show.status === 'filming' && (
            <TouchableOpacity
              style={sd.hireCrewBtn}
              onPress={() => router.push(`/hire-talent?showID=${show.id}&role=director`)}
            >
              <Text style={sd.hireCrewText}>+ Hire Director</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Cast */}
        <View style={sd.section}>
          <Text style={sd.sectionLabel}>
            LEAD CAST ({season.leadActorIDs.length}/{season.leadActorSlots})
          </Text>
          {leadActors.map(actor => <CrewRow key={actor.id} label="Lead Actor" talent={actor} />)}
          {show.status === 'filming' && leadsNeeded > 0 && (
            <TouchableOpacity
              style={sd.hireCrewBtn}
              onPress={() => router.push(`/hire-talent?showID=${show.id}&role=actor&actorType=lead`)}
            >
              <Text style={sd.hireCrewText}>+ Hire Lead Actor ({leadsNeeded} slot{leadsNeeded > 1 ? 's' : ''} open)</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={sd.section}>
          <Text style={sd.sectionLabel}>
            SUPPORTING CAST ({season.supportingActorIDs.length}/{season.supportingActorSlots})
          </Text>
          {supportingActors.map(actor => <CrewRow key={actor.id} label="Supporting" talent={actor} />)}
          {show.status === 'filming' && supportingNeeded > 0 && (
            <TouchableOpacity
              style={sd.hireCrewBtn}
              onPress={() => router.push(`/hire-talent?showID=${show.id}&role=actor&actorType=supporting`)}
            >
              <Text style={sd.hireCrewText}>+ Hire Supporting ({supportingNeeded} slot{supportingNeeded > 1 ? 's' : ''} open)</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Episode list */}
        {season.episodesAired > 0 && (
          <View style={sd.section}>
            <Text style={sd.sectionLabel}>EPISODES</Text>
            {season.episodes.filter(e => e.rating !== null).map(ep => (
              <View key={ep.id} style={sd.epRow}>
                <Text style={sd.epNum}>Ep {ep.episodeNumber}</Text>
                <View style={[sd.epRatingBadge, { backgroundColor: ratingColor(ep.rating!) + '33', borderColor: ratingColor(ep.rating!) }]}>
                  <Text style={[sd.epRating, { color: ratingColor(ep.rating!) }]}>{ep.rating!.toFixed(1)}</Text>
                </View>
                <Text style={sd.epViewers}>{fmtViewers(ep.viewers ?? 0)} viewers</Text>
                <Text style={sd.epRevenue}>{fmt(ep.adRevenue ?? 0)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Season history */}
        {show.seasons.length > 1 && (
          <View style={sd.section}>
            <Text style={sd.sectionLabel}>SEASON HISTORY</Text>
            {show.seasons.slice(0, show.currentSeasonIndex).reverse().map(s => {
              const aired = s.episodes.filter(e => e.rating !== null);
              const avg = aired.length > 0
                ? aired.reduce((sum, e) => sum + (e.rating ?? 0), 0) / aired.length
                : 0;
              const sNet = s.totalAdRevenue + (s.streamingOfferAccepted ? s.streamingOfferAmount : 0)
                - s.productionCost - s.marketingSpend;
              return (
                <View key={s.id} style={sd.historyCard}>
                  <View style={sd.historyHeader}>
                    <Text style={sd.historySeasonLabel}>Season {s.seasonNumber}</Text>
                    <Text style={sd.historyEpisodes}>{s.episodeCount} eps</Text>
                  </View>
                  <View style={sd.historyStats}>
                    <View style={sd.historyStat}>
                      <Text style={sd.historyStatValue}>{avg > 0 ? avg.toFixed(1) : '—'}</Text>
                      <Text style={sd.historyStatLabel}>Avg rating</Text>
                    </View>
                    <View style={sd.historyStat}>
                      <Text style={sd.historyStatValue}>{fmtViewers(s.totalViewers)}</Text>
                      <Text style={sd.historyStatLabel}>Viewers</Text>
                    </View>
                    <View style={sd.historyStat}>
                      <Text style={[sd.historyStatValue, { color: sNet >= 0 ? C.green : C.red }]}>
                        {sNet >= 0 ? '+' : ''}{fmt(sNet)}
                      </Text>
                      <Text style={sd.historyStatLabel}>Net</Text>
                    </View>
                  </View>
                  {s.streamingOfferAccepted && (
                    <Text style={sd.historyStreaming}>
                      {s.streamingOfferSource} · {fmt(s.streamingOfferAmount)}
                      {s.streamingDealDurationYears > 0 ? ` · ${s.streamingDealDurationYears}-yr` : ''}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ProgressItem({ label, current, total, color, blocked }: {
  label: string; current: number; total: number; color: string; blocked?: boolean;
}) {
  const pct = total > 0 ? (current / total) * 100 : 0;
  return (
    <View style={sd.progressItem}>
      <View style={sd.progressHeader}>
        <Text style={sd.progressLabel}>{label}</Text>
        <Text style={sd.progressWeeks}>
          {blocked ? 'Waiting for crew' : `Week ${current} of ${total}`}
        </Text>
      </View>
      <View style={sd.progressTrack}>
        <View style={[sd.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={sd.statChip}>
      <Text style={sd.statChipValue}>{value}</Text>
      <Text style={sd.statChipLabel}>{label}</Text>
    </View>
  );
}

function ScoreCard({ label, score, sublabel, highlight }: {
  label: string; score: number; sublabel: string; highlight?: boolean;
}) {
  const color = score >= 75 ? C.green : score >= 50 ? C.amber : C.red;
  return (
    <View style={[sd.scoreCard, highlight && { borderColor: color, backgroundColor: color + '18' }]}>
      <Text style={[sd.scoreValue, { color }]}>{score}</Text>
      <Text style={sd.scoreLabel}>{label}</Text>
      <Text style={sd.scoreSublabel}>{sublabel}</Text>
    </View>
  );
}

function CrewRow({ label, talent }: { label: string; talent: NonNullable<ReturnType<typeof Array.prototype.find>> }) {
  const t = talent as any;
  const chemColor = CHEM_COLORS[t.chemistryColor as keyof typeof CHEM_COLORS];
  return (
    <View style={sd.crewRow}>
      <View style={[sd.crewChemDot, { backgroundColor: chemColor }]} />
      <View style={{ flex: 1 }}>
        <Text style={sd.crewName}>{t.name}</Text>
        <Text style={sd.crewRole}>{label}</Text>
      </View>
    </View>
  );
}

const sd = StyleSheet.create({
  container:       { flex: 1, backgroundColor: C.bg },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:         { width: 60 },
  backText:        { color: C.accent, fontSize: 15 },
  headerTitle:     { color: C.text, fontSize: 17, fontWeight: '600', flex: 1, textAlign: 'center' },
  scroll:          { flex: 1 },
  scrollContent:   { padding: 16 },

  identityRow:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  showTitle:       { color: C.text, fontSize: 22, fontWeight: '700', marginBottom: 4 },
  showMeta:        { color: C.muted, fontSize: 14 },
  statusPill:      { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginLeft: 8 },
  statusText:      { fontSize: 12, fontWeight: '500' },

  alertCard:       { backgroundColor: '#1e1a14', borderWidth: 1, borderColor: C.amber, borderRadius: 10, padding: 14, marginBottom: 16, gap: 10 },
  alertTitle:      { color: C.amber, fontSize: 14, fontWeight: '600' },
  alertBtn:        { backgroundColor: C.amber + '22', borderRadius: 8, padding: 10, alignItems: 'center' },
  alertBtnText:    { color: C.amber, fontSize: 14, fontWeight: '500' },

  section:         { marginBottom: 20 },
  sectionLabel:    { color: C.muted, fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 10 },

  progressItem:    { marginBottom: 10 },
  progressHeader:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel:   { color: C.text, fontSize: 14 },
  progressWeeks:   { color: C.muted, fontSize: 13 },
  progressTrack:   { height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
  progressFill:    { height: '100%', borderRadius: 3 },
  airDateRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  airDateText:     { color: C.muted, fontSize: 13 },
  marketingLink:   { color: C.accent, fontSize: 13 },
  marketingBtn:    { marginTop: 10, backgroundColor: C.accent + '22', borderWidth: 1, borderColor: C.accent, borderRadius: 8, padding: 12, alignItems: 'center' },
  marketingBtnText:{ color: C.accent, fontSize: 14, fontWeight: '500' },

  heatmap:         { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  dot:             { width: 38, height: 38, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  dotText:         { color: '#fff', fontSize: 10, fontWeight: '600' },

  statsRow:        { flexDirection: 'row', justifyContent: 'space-around' },
  statChip:        { alignItems: 'center' },
  statChipValue:   { color: C.text, fontSize: 17, fontWeight: '600' },
  statChipLabel:   { color: C.muted, fontSize: 11, marginTop: 2 },

  streamingCard:   { backgroundColor: '#1e3a2f', borderWidth: 1, borderColor: C.green, borderRadius: 10, padding: 16, marginBottom: 16, alignItems: 'center' },
  streamingTitle:  { color: C.green, fontSize: 14, marginBottom: 4 },
  streamingAmount: { color: C.text, fontSize: 28, fontWeight: '700', marginBottom: 4 },
  streamingExpiry: { color: C.muted, fontSize: 12, marginBottom: 14 },
  streamingAcceptBtn: { backgroundColor: C.green, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  streamingAcceptText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  renewalCard:     { backgroundColor: C.card, borderWidth: 1, borderColor: C.accent, borderRadius: 10, padding: 16, marginBottom: 16 },
  renewalTitle:    { color: C.text, fontSize: 17, fontWeight: '600', marginBottom: 10 },
  renewalStats:    { flexDirection: 'row', gap: 16, marginBottom: 14 },
  renewalStat:     { color: C.muted, fontSize: 14 },
  renewalBtns:     { gap: 8 },
  renewBtn:        { backgroundColor: C.accent, borderRadius: 10, padding: 14, alignItems: 'center' },
  renewBtnText:    { color: '#fff', fontSize: 15, fontWeight: '600' },
  cancelBtn:       { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, alignItems: 'center' },
  cancelBtnText:   { color: C.muted, fontSize: 15 },

  finRow:          { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  finTotal:        { borderBottomWidth: 0, marginTop: 4 },
  finLabel:        { color: C.muted, fontSize: 14 },
  finValue:        { color: C.text, fontSize: 14, fontWeight: '500' },

  crewRow:         { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  crewChemDot:     { width: 10, height: 10, borderRadius: 5 },
  crewName:        { color: C.text, fontSize: 14, fontWeight: '500' },
  crewRole:        { color: C.muted, fontSize: 12, marginTop: 2 },
  hireCrewBtn:     { paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: C.border, borderRadius: 8, marginTop: 8 },
  hireCrewText:    { color: C.accent, fontSize: 14 },

  epRow:           { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border, gap: 10 },
  epNum:           { color: C.muted, fontSize: 13, width: 36 },
  epRatingBadge:   { borderWidth: 1, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  epRating:        { fontSize: 13, fontWeight: '600' },
  epViewers:       { flex: 1, color: C.muted, fontSize: 13 },
  epRevenue:       { color: C.text, fontSize: 13 },

  streamingAcceptedCard: { backgroundColor: '#1e3a2f', borderWidth: 1, borderColor: C.green + '66', borderRadius: 10, padding: 14, marginBottom: 16 },
  streamingAcceptedTitle: { color: C.green, fontSize: 13, fontWeight: '600', marginBottom: 3 },
  streamingAcceptedMeta:  { color: C.text, fontSize: 15, fontWeight: '600' },

  historyCard:       { backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 10 },
  historyHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  historySeasonLabel:{ color: C.text, fontSize: 14, fontWeight: '600' },
  historyEpisodes:   { color: C.muted, fontSize: 13 },
  historyStats:      { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  historyStat:       { alignItems: 'center' },
  historyStatValue:  { color: C.text, fontSize: 15, fontWeight: '600' },
  historyStatLabel:  { color: C.muted, fontSize: 11, marginTop: 2 },
  historyStreaming:   { color: C.green, fontSize: 12, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, marginTop: 4 },

  scoresRow:         { flexDirection: 'row', gap: 10 },
  scoreCard:         { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, alignItems: 'center' },
  scoreValue:        { fontSize: 28, fontWeight: '700', marginBottom: 2 },
  scoreLabel:        { color: C.text, fontSize: 13, fontWeight: '600' },
  scoreSublabel:     { color: C.muted, fontSize: 11, marginTop: 2 },
});
