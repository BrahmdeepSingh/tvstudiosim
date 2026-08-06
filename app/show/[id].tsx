import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGameStore } from '../../src/store/gameStore';
import { Season, Episode } from '../../src/types';
import { AVATAR_MAP } from '../../src/utils/avatars';

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  pageBg:       '#0f1220',
  cardBg:       '#191c2a',
  cardBg2:      '#1d2035',
  border:       '#252840',
  borderGold:   '#e6b25430',
  borderGold55: '#e6b2548c',
  text:         '#f0ede8',
  muted:        '#9a958e',
  mutedMid:     '#6b6880',
  gold:         '#e6b254',
  goldDim:      '#e6b25420',
  goldMid:      '#c49440',
  goldBtnText:  '#161008',
  green:        '#4ec46e',
  greenBg:      '#1a3325',
  amber:        '#d4753a',
  amberBg:      '#2a1f12',
  red:          '#c43820',
  redBg:        '#2a130f',
  blue:         '#cccee0',
  blueBg:       '#141e33',
  teal:         '#3db8a8',
  tealBg:       '#0f2525',
};

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
  marketing:         { label: 'MARKETING', color: C.teal,  bg: C.tealBg,  borderColor: '#3db8a855' },
  'renewal-pending': { label: 'RENEWAL',   color: C.gold,  bg: '#261e0a', borderColor: '#e6b25455' },
  completed:         { label: 'DONE',      color: C.muted, bg: C.cardBg2, borderColor: '#9a958e44' },
  cancelled:         { label: 'CANCELLED', color: C.red,   bg: C.redBg,   borderColor: '#c4382055' },
};

function fmt(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs}`;
}

function fmtViewers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function ratingColor(r: number): string {
  if (r >= 8)   return '#3db87a';
  if (r >= 6.5) return '#7db840';
  if (r >= 5)   return '#c8a135';
  return '#c04040';
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

// ── Heatmap dot ───────────────────────────────────────────────────────────────
function HeatmapDot({ ep, empty }: { ep?: Episode; empty?: boolean }) {
  const color = empty || !ep?.rating ? C.border : ratingColor(ep.rating);
  return (
    <View style={[sd.dot, { backgroundColor: color }]}>
      {ep?.rating != null && !empty && (
        <Text style={sd.dotText}>{ep.rating.toFixed(1)}</Text>
      )}
    </View>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressItem({ label, current, total, gradColors, blocked }: {
  label: string; current: number; total: number;
  gradColors: [string, string]; blocked?: boolean;
}) {
  const pct = total > 0 ? Math.max((current / total) * 100, 2) : 2;
  return (
    <View style={sd.progressItem}>
      <View style={sd.progressHeader}>
        <Text style={sd.progressLabel}>{label}</Text>
        <Text style={sd.progressMeta}>
          {blocked ? 'Waiting for crew' : `Week ${current} of ${total}`}
        </Text>
      </View>
      <View style={sd.progressTrack}>
        <LinearGradient
          colors={gradColors}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[sd.progressFill, { width: `${pct}%` as any }]}
        />
      </View>
    </View>
  );
}

// ── Stat chip ─────────────────────────────────────────────────────────────────
function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={sd.statChip}>
      <Text style={sd.statChipValue}>{value}</Text>
      <Text style={sd.statChipLabel}>{label}</Text>
    </View>
  );
}

// ── Score card ────────────────────────────────────────────────────────────────
function ScoreCard({ label, score, sublabel, highlight }: {
  label: string; score: number; sublabel: string; highlight?: boolean;
}) {
  const color = score >= 75 ? C.green : score >= 50 ? C.amber : C.red;
  return (
    <View style={[sd.scoreCard, highlight && { borderColor: color + '88', backgroundColor: color + '14' }]}>
      <Text style={[sd.scoreValue, { color }]}>{score}</Text>
      <Text style={sd.scoreLabel}>{label}</Text>
      <Text style={sd.scoreSublabel}>{sublabel}</Text>
    </View>
  );
}

// ── Crew row ──────────────────────────────────────────────────────────────────
const CHEM_COLORS = { green: C.green, blue: C.blue, red: C.red };

function CrewRow({ label, talent }: { label: string; talent: any }) {
  const router = useRouter();
  const chemColor = CHEM_COLORS[talent.chemistryColor as keyof typeof CHEM_COLORS] ?? C.muted;
  return (
    <TouchableOpacity style={sd.crewRow} onPress={() => router.push(`/talent/${talent.id}`)}>
      <View style={sd.crewAvatarWrap}>
        <Image source={AVATAR_MAP[talent.avatarId]} style={sd.crewAvatar} />
        <View style={[sd.crewChemPip, { backgroundColor: chemColor }]} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={sd.crewName}>{talent.name}</Text>
        <Text style={sd.crewRole}>{label}</Text>
      </View>
      <Text style={{ color: C.muted, fontSize: 16 }}>›</Text>
    </TouchableOpacity>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sd.section}>
      <Text style={sd.sectionTitle}>{title}</Text>
      <View style={sd.sectionCard}>{children}</View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function ShowDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { shows, talent, talentDeals, network, cancelShow, acceptStreamingOffer, declineStreamingOffer } = useGameStore();

  const show = shows.find(s => s.id === id);
  if (!show) {
    return (
      <LinearGradient colors={['#141726', '#0c0f1a', '#070a12']} style={{ flex: 1 }}>
        <SafeAreaView style={sd.container}>
          <Text style={{ fontFamily: F.body, color: C.muted, padding: 32 }}>Show not found.</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const season = show.seasons[show.currentSeasonIndex];
  const showrunner = talent.find(t => t.id === season.showrunnerID);
  const director   = season.directorID ? talent.find(t => t.id === season.directorID) : null;
  const leadActors       = season.leadActorIDs.map(aid => talent.find(t => t.id === aid)).filter(Boolean) as typeof talent;
  const supportingActors = season.supportingActorIDs.map(aid => talent.find(t => t.id === aid)).filter(Boolean) as typeof talent;

  const meta        = STATUS_META[show.status] ?? STATUS_META.completed;
  const genreLabel  = show.genre.replace('-', ' ').toUpperCase();
  const themeLabel  = show.theme.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join('-');

  const avgRating = season.episodes
    .filter(e => e.rating !== null)
    .reduce((acc, e, _, arr) => acc + (e.rating ?? 0) / arr.length, 0);

  const streamingRevenue = season.streamingRevenue;
  const revShareExpense = talentDeals
    .filter(d => d.seasonID === season.id && d.revenueSharePercent > 0)
    .reduce((sum, d) => sum + Math.round(d.revenueSharePercent / 100 * season.totalAdRevenue), 0);
  const netProfit = season.totalAdRevenue + streamingRevenue - season.productionCost - season.marketingSpend - revShareExpense;

  const needsDirector  = show.status === 'filming' && !season.directorID;
  const leadsNeeded    = season.leadActorSlots - season.leadActorIDs.length;
  const supportingNeeded = season.supportingActorSlots - season.supportingActorIDs.length;
  const needsCast      = show.status === 'filming' && (leadsNeeded > 0 || supportingNeeded > 0);

  const isAiring = show.status === 'airing' || show.status === 'renewal-pending';

  return (
    <LinearGradient colors={['#141726', '#0c0f1a', '#070a12']} locations={[0, 0.55, 1]} style={{ flex: 1 }}>
      <FilmRibbonAmbient />
      <SafeAreaView style={sd.container}>

        {/* ── Header ── */}
        <View style={sd.header}>
          <TouchableOpacity onPress={() => router.back()} style={sd.backBtn}>
            <Text style={sd.backText}>← BACK</Text>
          </TouchableOpacity>
          <Text style={sd.headerTitle} numberOfLines={1}>{show.title.toUpperCase()}</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={sd.scroll} contentContainerStyle={sd.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ── Identity card ── */}
          <View style={sd.identityCard}>
            <View style={{ flex: 1 }}>
              <Text style={sd.showTitle}>{show.title.toUpperCase()}</Text>
              <Text style={sd.showMeta}>{genreLabel} · {themeLabel} · Season {season.seasonNumber}</Text>
            </View>
            <View style={[sd.statusPill, { backgroundColor: meta.bg, borderColor: meta.borderColor }]}>
              <Text style={[sd.statusText, { color: meta.color }]}>{meta.label}</Text>
            </View>
          </View>

          {/* ── Action alerts ── */}
          {(needsDirector || needsCast) && (
            <View style={sd.alertCard}>
              <Text style={sd.alertTitle}>ACTION NEEDED TO BEGIN FILMING</Text>
              {needsDirector && (
                <TouchableOpacity
                  style={sd.alertBtn}
                  onPress={() => router.push(`/hire-talent?showID=${show.id}&role=director`)}
                  activeOpacity={0.8}
                >
                  <Text style={sd.alertBtnText}>+ HIRE DIRECTOR</Text>
                </TouchableOpacity>
              )}
              {leadsNeeded > 0 && (
                <TouchableOpacity
                  style={sd.alertBtn}
                  onPress={() => router.push(`/hire-talent?showID=${show.id}&role=actor&actorType=lead`)}
                  activeOpacity={0.8}
                >
                  <Text style={sd.alertBtnText}>
                    + HIRE LEAD ACTOR ({season.leadActorIDs.length}/{season.leadActorSlots})
                  </Text>
                </TouchableOpacity>
              )}
              {supportingNeeded > 0 && (
                <TouchableOpacity
                  style={sd.alertBtn}
                  onPress={() => router.push(`/hire-talent?showID=${show.id}&role=actor&actorType=supporting`)}
                  activeOpacity={0.8}
                >
                  <Text style={sd.alertBtnText}>
                    + HIRE SUPPORTING ({season.supportingActorIDs.length}/{season.supportingActorSlots})
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── Production progress ── */}
          {['writing', 'filming', 'marketing'].includes(show.status) && (
            <Section title="PRODUCTION">
              {show.status === 'writing' && (
                <ProgressItem label="Writing" current={season.writingWeeksCompleted} total={season.writingWeeksTotal} gradColors={[C.blue + 'aa', C.blue]} />
              )}
              {show.status === 'filming' && (
                <ProgressItem label="Filming" current={season.filmingWeeksCompleted} total={season.filmingWeeksTotal} gradColors={[C.amber, '#f0a060']} blocked={needsDirector || needsCast} />
              )}
              {show.status === 'marketing' && (
                <>
                  <ProgressItem label="Marketing" current={season.marketingWeeksCompleted} total={Math.max(season.marketingWeeksTotal, 1)} gradColors={[C.teal, '#60d8c8']} />
                  {season.airDateWeek ? (
                    <View style={sd.airDateRow}>
                      <Text style={sd.airDateText}>Premieres Week {season.airDateWeek}, Year {season.airDateYear}</Text>
                      <TouchableOpacity onPress={() => router.push(`/marketing?showID=${show.id}`)}>
                        <Text style={sd.linkText}>Edit →</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={sd.linkBtn}
                      onPress={() => router.push(`/marketing?showID=${show.id}`)}
                      activeOpacity={0.8}
                    >
                      <Text style={sd.linkBtnText}>SET PREMIERE DATE & BUY ADS  →</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </Section>
          )}

          {/* ── Creative scores ── */}
          {(season.scriptScore > 0 || season.qualityScore !== 50) && show.status !== 'writing' && (
            <Section title="CREATIVE SCORES">
              <View style={sd.scoresRow}>
                {season.scriptScore > 0 && (
                  <ScoreCard label="Script" score={season.scriptScore} sublabel="Writing" />
                )}
                {show.status !== 'filming' && season.qualityScore !== 50 && (
                  <ScoreCard label="Production" score={season.qualityScore} sublabel="Filming" />
                )}
                {season.scriptScore > 0 && show.status !== 'filming' && season.qualityScore !== 50 && (
                  <ScoreCard
                    label="Combined"
                    score={Math.round(season.scriptScore * 0.45 + season.qualityScore * 0.55)}
                    sublabel="Overall"
                    highlight
                  />
                )}
              </View>
            </Section>
          )}

          {/* ── Episode heatmap ── */}
          {isAiring && (
            <Section title={`EPISODE HEATMAP — SEASON ${season.seasonNumber}`}>
              <View style={sd.heatmap}>
                {Array.from({ length: season.episodeCount }, (_, i) => (
                  <HeatmapDot key={i} ep={season.episodes[i]} empty={i >= season.episodesAired} />
                ))}
              </View>
              <View style={sd.statsRow}>
                <StatChip label="AVG RATING"  value={avgRating > 0 ? avgRating.toFixed(1) : '—'} />
                <StatChip label="VIEWERS/EP"  value={season.totalViewers > 0 ? fmtViewers(Math.round(season.totalViewers / Math.max(season.episodesAired, 1))) : '—'} />
                <StatChip label="AD REVENUE"  value={fmt(season.totalAdRevenue)} />
              </View>
            </Section>
          )}

          {/* ── Streaming offer ── */}
          {show.pendingStreamingOffer && (
            <View style={sd.streamingOfferCard}>
              <View style={sd.streamingOfferHeader}>
                <View style={sd.streamingPill}>
                  <Text style={sd.streamingPillText}>STREAMING OFFER</Text>
                </View>
                <Text style={sd.streamingExpiry}>
                  Exp Wk {show.pendingStreamingOffer.expiresWeek}, Yr {show.pendingStreamingOffer.expiresYear}
                </Text>
              </View>
              <Text style={sd.streamingPlatform}>{show.pendingStreamingOffer.platformName}</Text>
              <Text style={sd.streamingMeta}>
                {show.pendingStreamingOffer.seasonsToInclude.length === 1
                  ? `Season ${show.pendingStreamingOffer.seasonsToInclude[0]}`
                  : `${show.pendingStreamingOffer.seasonsToInclude.length} seasons`}
                {' · '}{show.pendingStreamingOffer.durationYears}-year deal
              </Text>
              <View style={sd.streamingAmounts}>
                <View style={sd.streamingAmountOption}>
                  <Text style={sd.streamingAmountLabel}>NON-EXCLUSIVE</Text>
                  <Text style={sd.streamingAmountValue}>{fmt(show.pendingStreamingOffer.nonExclusiveAmount)}</Text>
                </View>
                <View style={sd.streamingAmountDivider} />
                <View style={sd.streamingAmountOption}>
                  <Text style={sd.streamingAmountLabel}>EXCLUSIVE  +40%</Text>
                  <Text style={[sd.streamingAmountValue, { color: C.green }]}>{fmt(show.pendingStreamingOffer.exclusiveAmount)}</Text>
                </View>
              </View>
              <View style={sd.streamingBtns}>
                <TouchableOpacity style={sd.streamingDeclineBtn} onPress={() => declineStreamingOffer(show.id)} activeOpacity={0.8}>
                  <Text style={sd.streamingDeclineText}>DECLINE</Text>
                </TouchableOpacity>
                <TouchableOpacity style={sd.streamingNonExclBtn} onPress={() => acceptStreamingOffer(show.id, 'non-exclusive')} activeOpacity={0.8}>
                  <Text style={sd.streamingNonExclText}>NON-EXCL</Text>
                </TouchableOpacity>
                <TouchableOpacity style={sd.streamingExclBtn} onPress={() => acceptStreamingOffer(show.id, 'exclusive')} activeOpacity={0.8}>
                  <LinearGradient colors={['#60c888', C.green]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={sd.streamingExclGrad}>
                    <Text style={sd.streamingExclText}>EXCLUSIVE</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── Active streaming deals ── */}
          {show.streamingDeals.length > 0 && (
            <Section title="STREAMING DEALS">
              {show.streamingDeals.map(deal => {
                const expired =
                  deal.expiresYear < network.currentYear ||
                  (deal.expiresYear === network.currentYear && deal.expiresWeek <= network.currentWeek);
                return (
                  <View key={deal.id} style={[sd.dealCard, expired && { borderColor: C.border }]}>
                    <View style={sd.dealHeader}>
                      <Text style={sd.dealPlatform}>{deal.platformName} · {deal.dealType === 'exclusive' ? 'Exclusive' : 'Non-Exclusive'}</Text>
                      <View style={[sd.dealBadge, { backgroundColor: (expired ? C.red : C.green) + '22', borderColor: (expired ? C.red : C.green) + '55' }]}>
                        <Text style={[sd.dealBadgeText, { color: expired ? C.red : C.green }]}>{expired ? 'EXPIRED' : 'ACTIVE'}</Text>
                      </View>
                    </View>
                    <Text style={sd.dealAmount}>{fmt(deal.amount)}</Text>
                    <Text style={[sd.dealExpiry, { color: expired ? C.red : C.muted }]}>
                      {expired ? 'Expired' : 'Expires'} Wk {deal.expiresWeek}, Yr {deal.expiresYear} · S{deal.seasonsIncluded.join(', S')}
                    </Text>
                  </View>
                );
              })}
            </Section>
          )}

          {/* ── Renewal ── */}
          {show.status === 'renewal-pending' && !season.renewalDecisionMade && (
            <View style={sd.renewalCard}>
              <Text style={sd.renewalTitle}>SEASON {season.seasonNumber} COMPLETE</Text>
              <View style={sd.renewalStats}>
                <View style={sd.renewalStat}>
                  <Text style={sd.renewalStatValue}>{avgRating > 0 ? avgRating.toFixed(1) : '—'}</Text>
                  <Text style={sd.renewalStatLabel}>AVG RATING</Text>
                </View>
                <View style={sd.renewalStat}>
                  <Text style={[sd.renewalStatValue, { color: netProfit >= 0 ? C.green : C.red }]}>
                    {netProfit >= 0 ? '+' : ''}{fmt(netProfit)}
                  </Text>
                  <Text style={sd.renewalStatLabel}>NET PROFIT</Text>
                </View>
              </View>
              <TouchableOpacity
                style={sd.renewBtn}
                onPress={() => router.push(`/renew?showID=${show.id}`)}
                activeOpacity={0.88}
              >
                <LinearGradient colors={['#f0c060', C.goldMid]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={sd.renewBtnGrad}>
                  <Text style={sd.renewBtnText}>RENEW SEASON {season.seasonNumber + 1}  ▶</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={sd.cancelBtn}
                onPress={() => { cancelShow(show.id); router.back(); }}
                activeOpacity={0.8}
              >
                <Text style={sd.cancelBtnText}>CANCEL SHOW</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Season financials ── */}
          <Section title="SEASON FINANCIALS">
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
            {revShareExpense > 0 && (
              <View style={sd.finRow}>
                <Text style={sd.finLabel}>
                  {show.status === 'renewal-pending' || show.status === 'cancelled'
                    ? 'Revenue share paid'
                    : 'Revenue share (est.)'}
                </Text>
                <Text style={[sd.finValue, { color: C.red }]}>−{fmt(revShareExpense)}</Text>
              </View>
            )}
            <View style={[sd.finRow, sd.finTotalRow]}>
              <Text style={[sd.finLabel, { fontFamily: F.bodyBd, color: C.text }]}>Net</Text>
              <Text style={[sd.finValue, { fontFamily: F.bodyBd, color: netProfit >= 0 ? C.green : C.red }]}>
                {netProfit >= 0 ? '+' : ''}{fmt(netProfit)}
              </Text>
            </View>
          </Section>

          {/* ── Crew ── */}
          <Section title="CREW">
            {showrunner && <CrewRow label="Showrunner" talent={showrunner} />}
            {director   && <CrewRow label="Director"   talent={director} />}
            {!director && show.status === 'filming' && (
              <TouchableOpacity
                style={sd.hireBtn}
                onPress={() => router.push(`/hire-talent?showID=${show.id}&role=director`)}
                activeOpacity={0.8}
              >
                <Text style={sd.hireBtnText}>+ HIRE DIRECTOR</Text>
              </TouchableOpacity>
            )}
          </Section>

          {/* ── Lead cast ── */}
          <Section title={`LEAD CAST  ${season.leadActorIDs.length}/${season.leadActorSlots}`}>
            {leadActors.map((actor: any) => <CrewRow key={actor.id} label="Lead Actor" talent={actor} />)}
            {show.status === 'filming' && leadsNeeded > 0 && (
              <TouchableOpacity
                style={sd.hireBtn}
                onPress={() => router.push(`/hire-talent?showID=${show.id}&role=actor&actorType=lead`)}
                activeOpacity={0.8}
              >
                <Text style={sd.hireBtnText}>+ HIRE LEAD ACTOR  ({leadsNeeded} slot{leadsNeeded > 1 ? 's' : ''} open)</Text>
              </TouchableOpacity>
            )}
          </Section>

          {/* ── Supporting cast ── */}
          <Section title={`SUPPORTING CAST  ${season.supportingActorIDs.length}/${season.supportingActorSlots}`}>
            {supportingActors.map((actor: any) => <CrewRow key={actor.id} label="Supporting" talent={actor} />)}
            {show.status === 'filming' && supportingNeeded > 0 && (
              <TouchableOpacity
                style={sd.hireBtn}
                onPress={() => router.push(`/hire-talent?showID=${show.id}&role=actor&actorType=supporting`)}
                activeOpacity={0.8}
              >
                <Text style={sd.hireBtnText}>+ HIRE SUPPORTING  ({supportingNeeded} slot{supportingNeeded > 1 ? 's' : ''} open)</Text>
              </TouchableOpacity>
            )}
          </Section>

          {/* ── Episode list ── */}
          {season.episodesAired > 0 && (
            <Section title="EPISODES">
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
            </Section>
          )}

          {/* ── Season history ── */}
          {show.seasons.length > 1 && (
            <Section title="SEASON HISTORY">
              {show.seasons.slice(0, show.currentSeasonIndex).reverse().map((s: Season) => {
                const aired = s.episodes.filter(e => e.rating !== null);
                const avg   = aired.length > 0 ? aired.reduce((sum, e) => sum + (e.rating ?? 0), 0) / aired.length : 0;
                const sRevShare = talentDeals
                  .filter(d => d.seasonID === s.id && d.revenueSharePercent > 0)
                  .reduce((sum, d) => sum + Math.round(d.revenueSharePercent / 100 * s.totalAdRevenue), 0);
                const sNet  = s.totalAdRevenue + s.streamingRevenue - s.productionCost - s.marketingSpend - sRevShare;
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={sd.historyCard}
                    activeOpacity={0.8}
                    onPress={() => router.push(`/season-detail?showID=${show.id}&seasonNumber=${s.seasonNumber}`)}
                  >
                    <View style={sd.historyHeader}>
                      <Text style={sd.historySeasonLabel}>SEASON {s.seasonNumber}</Text>
                      <Text style={sd.historyChevron}>›</Text>
                    </View>
                    <View style={sd.historyStats}>
                      <View style={sd.historyStat}>
                        <Text style={sd.historyStatValue}>{avg > 0 ? avg.toFixed(1) : '—'}</Text>
                        <Text style={sd.historyStatLabel}>AVG RATING</Text>
                      </View>
                      <View style={sd.historyStat}>
                        <Text style={sd.historyStatValue}>{fmtViewers(s.totalViewers)}</Text>
                        <Text style={sd.historyStatLabel}>VIEWERS</Text>
                      </View>
                      <View style={sd.historyStat}>
                        <Text style={[sd.historyStatValue, { color: sNet >= 0 ? C.green : C.red }]}>
                          {sNet >= 0 ? '+' : ''}{fmt(sNet)}
                        </Text>
                        <Text style={sd.historyStatLabel}>NET</Text>
                      </View>
                    </View>
                    {s.streamingRevenue > 0 && (
                      <Text style={sd.historyStreaming}>Streaming: {fmt(s.streamingRevenue)}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </Section>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const C2 = { goldMid: '#c49440' };

const sd = StyleSheet.create({
  container:    { flex: 1 },
  scroll:       { flex: 1 },
  scrollContent:{ paddingHorizontal: 14, paddingBottom: 8 },

  // ── Header ──────────────────────────────────────────────────────────────────
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:     { width: 60 },
  backText:    { fontFamily: 'Manrope_700Bold', color: C.gold, fontSize: 11, letterSpacing: 1 },
  headerTitle: { fontFamily: 'BebasNeue_400Regular', color: C.text, fontSize: 22, letterSpacing: 2, flex: 1, textAlign: 'center' },

  // ── Identity card ────────────────────────────────────────────────────────────
  identityCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.cardBg, borderRadius: 16, borderWidth: 1, borderColor: C.borderGold, padding: 16, marginTop: 16, marginBottom: 14 },
  showTitle:    { fontFamily: 'BebasNeue_400Regular', color: C.text, fontSize: 26, letterSpacing: 1.5, marginBottom: 4 },
  showMeta:     { fontFamily: 'Manrope_700Bold', color: C.mutedMid, fontSize: 9, letterSpacing: 2 },
  statusPill:   { borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5, marginLeft: 10 },
  statusText:   { fontFamily: 'Manrope_800ExtraBold', fontSize: 9, letterSpacing: 1 },

  // ── Alert card ───────────────────────────────────────────────────────────────
  alertCard:    { backgroundColor: '#2a1f12', borderWidth: 1, borderColor: '#d4753a55', borderRadius: 14, padding: 14, marginBottom: 14, gap: 10 },
  alertTitle:   { fontFamily: 'Manrope_800ExtraBold', color: C.amber, fontSize: 10, letterSpacing: 2 },
  alertBtn:     { backgroundColor: C.amber + '22', borderRadius: 10, borderWidth: 1, borderColor: C.amber + '55', padding: 11, alignItems: 'center' },
  alertBtnText: { fontFamily: 'Manrope_700Bold', color: C.amber, fontSize: 12, letterSpacing: 1 },

  // ── Sections ─────────────────────────────────────────────────────────────────
  section:     { marginBottom: 16 },
  sectionTitle:{ fontFamily: 'BebasNeue_400Regular', color: C.text, fontSize: 18, letterSpacing: 1.5, marginBottom: 8 },
  sectionCard: { backgroundColor: C.cardBg, borderRadius: 14, borderWidth: 1, borderColor: C.borderGold, padding: 14 },

  // ── Progress ─────────────────────────────────────────────────────────────────
  progressItem:  { marginBottom: 10 },
  progressHeader:{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  progressLabel: { fontFamily: 'Manrope_600SemiBold', color: C.text, fontSize: 13 },
  progressMeta:  { fontFamily: 'Manrope_400Regular', color: C.muted, fontSize: 12 },
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 999 },
  airDateRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  airDateText:   { fontFamily: 'Manrope_400Regular', color: C.muted, fontSize: 13 },
  linkText:      { fontFamily: 'Manrope_700Bold', color: C.gold, fontSize: 13 },
  linkBtn:       { marginTop: 12, backgroundColor: C.goldDim, borderWidth: 1, borderColor: C.borderGold55, borderRadius: 10, padding: 12, alignItems: 'center' },
  linkBtnText:   { fontFamily: 'Manrope_700Bold', color: C.gold, fontSize: 12, letterSpacing: 1 },

  // ── Score cards ──────────────────────────────────────────────────────────────
  scoresRow:   { flexDirection: 'row', gap: 10 },
  scoreCard:   { flex: 1, backgroundColor: C.cardBg2, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, alignItems: 'center' },
  scoreValue:  { fontFamily: 'BebasNeue_400Regular', fontSize: 36, marginBottom: 2 },
  scoreLabel:  { fontFamily: 'Manrope_700Bold', color: C.text, fontSize: 11, letterSpacing: 0.5 },
  scoreSublabel:{ fontFamily: 'Manrope_400Regular', color: C.muted, fontSize: 10, marginTop: 2 },

  // ── Heatmap ──────────────────────────────────────────────────────────────────
  heatmap:      { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 14 },
  dot:          { width: 36, height: 36, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  dotText:      { fontFamily: 'Manrope_700Bold', color: '#fff', fontSize: 10 },
  statsRow:     { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 },
  statChip:     { alignItems: 'center' },
  statChipValue:{ fontFamily: 'BebasNeue_400Regular', color: C.text, fontSize: 22 },
  statChipLabel:{ fontFamily: 'Manrope_700Bold', color: C.mutedMid, fontSize: 8, letterSpacing: 1.5, marginTop: 2 },

  // ── Streaming offer ──────────────────────────────────────────────────────────
  streamingOfferCard:    { backgroundColor: C.tealBg, borderWidth: 1, borderColor: '#3db8a855', borderRadius: 14, padding: 16, marginBottom: 16 },
  streamingOfferHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  streamingPill:         { backgroundColor: C.teal + '33', borderRadius: 5, borderWidth: 1, borderColor: C.teal + '66', paddingHorizontal: 8, paddingVertical: 3 },
  streamingPillText:     { fontFamily: 'Manrope_800ExtraBold', color: C.teal, fontSize: 9, letterSpacing: 1.5 },
  streamingExpiry:       { fontFamily: 'Manrope_400Regular', color: C.muted, fontSize: 11 },
  streamingPlatform:     { fontFamily: 'BebasNeue_400Regular', color: C.text, fontSize: 22, letterSpacing: 1, marginBottom: 2 },
  streamingMeta:         { fontFamily: 'Manrope_400Regular', color: C.muted, fontSize: 12, marginBottom: 14 },
  streamingAmounts:      { flexDirection: 'row', marginBottom: 12 },
  streamingAmountOption: { flex: 1, alignItems: 'center' },
  streamingAmountLabel:  { fontFamily: 'Manrope_700Bold', color: C.mutedMid, fontSize: 8, letterSpacing: 1.5, marginBottom: 4 },
  streamingAmountValue:  { fontFamily: 'BebasNeue_400Regular', color: C.text, fontSize: 26 },
  streamingAmountDivider:{ width: 1, backgroundColor: C.border, marginHorizontal: 8 },
  streamingBtns:         { flexDirection: 'row', gap: 8 },
  streamingDeclineBtn:   { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 11, alignItems: 'center' },
  streamingDeclineText:  { fontFamily: 'Manrope_700Bold', color: C.muted, fontSize: 11, letterSpacing: 0.5 },
  streamingNonExclBtn:   { flex: 1.4, backgroundColor: C.teal + '33', borderWidth: 1, borderColor: C.teal + '66', borderRadius: 10, padding: 11, alignItems: 'center' },
  streamingNonExclText:  { fontFamily: 'Manrope_700Bold', color: C.teal, fontSize: 11, letterSpacing: 0.5 },
  streamingExclBtn:      { flex: 2, borderRadius: 10, overflow: 'hidden' },
  streamingExclGrad:     { padding: 11, alignItems: 'center' },
  streamingExclText:     { fontFamily: 'Manrope_800ExtraBold', color: '#0a2018', fontSize: 11, letterSpacing: 0.5 },

  // ── Streaming deals ──────────────────────────────────────────────────────────
  dealCard:     { backgroundColor: C.greenBg, borderWidth: 1, borderColor: '#4ec46e55', borderRadius: 12, padding: 14, marginBottom: 8 },
  dealHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  dealPlatform: { fontFamily: 'Manrope_700Bold', color: C.green, fontSize: 13 },
  dealBadge:    { borderRadius: 4, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2 },
  dealBadgeText:{ fontFamily: 'Manrope_800ExtraBold', fontSize: 9, letterSpacing: 1 },
  dealAmount:   { fontFamily: 'BebasNeue_400Regular', color: C.text, fontSize: 22, marginBottom: 2 },
  dealExpiry:   { fontFamily: 'Manrope_400Regular', fontSize: 11 },

  // ── Renewal card ─────────────────────────────────────────────────────────────
  renewalCard:       { backgroundColor: '#1e1808', borderWidth: 1, borderColor: C.borderGold55, borderRadius: 14, padding: 16, marginBottom: 16 },
  renewalTitle:      { fontFamily: 'BebasNeue_400Regular', color: C.gold, fontSize: 20, letterSpacing: 1.5, marginBottom: 14 },
  renewalStats:      { flexDirection: 'row', gap: 20, marginBottom: 16 },
  renewalStat:       { alignItems: 'center' },
  renewalStatValue:  { fontFamily: 'BebasNeue_400Regular', color: C.text, fontSize: 28 },
  renewalStatLabel:  { fontFamily: 'Manrope_700Bold', color: C.mutedMid, fontSize: 8, letterSpacing: 1.5, marginTop: 2 },
  renewBtn:          { borderRadius: 999, overflow: 'hidden', marginBottom: 10 },
  renewBtnGrad:      { paddingVertical: 15, alignItems: 'center' },
  renewBtnText:      { fontFamily: 'BebasNeue_400Regular', color: '#161008', fontSize: 16, letterSpacing: 3 },
  cancelBtn:         { borderWidth: 1, borderColor: C.border, borderRadius: 999, paddingVertical: 13, alignItems: 'center' },
  cancelBtnText:     { fontFamily: 'BebasNeue_400Regular', color: C.muted, fontSize: 14, letterSpacing: 2 },

  // ── Financials ───────────────────────────────────────────────────────────────
  finRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border },
  finTotalRow: { borderBottomWidth: 0, marginTop: 4, paddingBottom: 0 },
  finLabel:    { fontFamily: 'Manrope_400Regular', color: C.muted, fontSize: 13 },
  finValue:    { fontFamily: 'Manrope_600SemiBold', color: C.text, fontSize: 13 },

  // ── Crew ─────────────────────────────────────────────────────────────────────
  crewRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.border },
  crewAvatarWrap: { width: 44, height: 52, borderRadius: 8, overflow: 'hidden' },
  crewAvatar:     { width: 44, height: 52 },
  crewChemPip:    { position: 'absolute', bottom: 3, right: 3, width: 9, height: 9, borderRadius: 5, borderWidth: 1.5, borderColor: C.cardBg },
  crewName:       { fontFamily: 'Manrope_700Bold', color: C.text, fontSize: 14 },
  crewRole:    { fontFamily: 'Manrope_400Regular', color: C.muted, fontSize: 11, marginTop: 2 },
  hireBtn:     { marginTop: 10, borderWidth: 1, borderColor: C.borderGold55, borderRadius: 10, paddingVertical: 11, alignItems: 'center', backgroundColor: C.goldDim },
  hireBtnText: { fontFamily: 'Manrope_700Bold', color: C.gold, fontSize: 11, letterSpacing: 1 },

  // ── Episodes ─────────────────────────────────────────────────────────────────
  epRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border, gap: 10 },
  epNum:        { fontFamily: 'Manrope_700Bold', color: C.mutedMid, fontSize: 11, letterSpacing: 1, width: 38 },
  epRatingBadge:{ borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  epRating:     { fontFamily: 'Manrope_800ExtraBold', fontSize: 12 },
  epViewers:    { flex: 1, fontFamily: 'Manrope_400Regular', color: C.muted, fontSize: 12 },
  epRevenue:    { fontFamily: 'Manrope_600SemiBold', color: C.text, fontSize: 12 },

  // ── Season history ───────────────────────────────────────────────────────────
  historyCard:       { backgroundColor: C.cardBg2, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 8 },
  historyHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  historySeasonLabel:{ fontFamily: 'BebasNeue_400Regular', color: C.text, fontSize: 16, letterSpacing: 1 },
  historyChevron:    { fontFamily: 'Manrope_400Regular', color: C.gold, fontSize: 22 },
  historyStats:      { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 6 },
  historyStat:       { alignItems: 'center' },
  historyStatValue:  { fontFamily: 'BebasNeue_400Regular', color: C.text, fontSize: 20 },
  historyStatLabel:  { fontFamily: 'Manrope_700Bold', color: C.mutedMid, fontSize: 8, letterSpacing: 1.5, marginTop: 2 },
  historyStreaming:   { fontFamily: 'Manrope_400Regular', color: C.green, fontSize: 11, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, marginTop: 4 },
});