import { useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGameStore } from '../../src/store/gameStore';
import { Season, Episode } from '../../src/types';
import { AVATAR_MAP } from '../../src/utils/avatars';
import { hap } from '../../src/utils/haptics';
import { useTheme } from '../../src/context/ThemeContext';
import HomeButton from '../components/HomeButton';

const F = {
  display: 'BebasNeue_400Regular',
  body:    'Manrope_400Regular',
  bodyMd:  'Manrope_600SemiBold',
  bodyBd:  'Manrope_700Bold',
  bodyXBd: 'Manrope_800ExtraBold',
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
  const { C } = useTheme();
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
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const color = empty || !ep?.rating ? C.border : ratingColor(ep.rating);
  return (
    <View style={[s.dot, { backgroundColor: color }]}>
      {ep?.rating != null && !empty && (
        <Text style={s.dotText}>{ep.rating.toFixed(1)}</Text>
      )}
    </View>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressItem({ label, current, total, gradColors, blocked }: {
  label: string; current: number; total: number;
  gradColors: [string, string]; blocked?: boolean;
}) {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const pct = total > 0 ? Math.max((current / total) * 100, 2) : 2;
  return (
    <View style={s.progressItem}>
      <View style={s.progressHeader}>
        <Text style={s.progressLabel}>{label}</Text>
        <Text style={s.progressMeta}>
          {blocked ? 'Waiting for crew' : `Week ${current} of ${total}`}
        </Text>
      </View>
      <View style={s.progressTrack}>
        <LinearGradient
          colors={gradColors}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[s.progressFill, { width: `${pct}%` as any }]}
        />
      </View>
    </View>
  );
}

// ── Stat chip ─────────────────────────────────────────────────────────────────
function StatChip({ label, value }: { label: string; value: string }) {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  return (
    <View style={s.statChip}>
      <Text style={s.statChipValue}>{value}</Text>
      <Text style={s.statChipLabel}>{label}</Text>
    </View>
  );
}

// ── Score card ────────────────────────────────────────────────────────────────
function ScoreCard({ label, score, sublabel, highlight }: {
  label: string; score: number; sublabel: string; highlight?: boolean;
}) {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const color = score >= 75 ? C.green : score >= 50 ? C.amber : C.red;
  return (
    <View style={[s.scoreCard, highlight && { borderColor: color + '88', backgroundColor: color + '14' }]}>
      <Text style={[s.scoreValue, { color }]}>{score}</Text>
      <Text style={s.scoreLabel}>{label}</Text>
      <Text style={s.scoreSublabel}>{sublabel}</Text>
    </View>
  );
}

// ── Crew row ──────────────────────────────────────────────────────────────────
function CrewRow({ label, talent }: { label: string; talent: any }) {
  const router = useRouter();
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const CHEM_COLORS = { green: C.green, blue: C.blue, red: C.red };
  const chemColor = CHEM_COLORS[talent.chemistryColor as keyof typeof CHEM_COLORS] ?? C.muted;
  return (
    <TouchableOpacity style={s.crewRow} onPress={() => router.push(`/talent/${talent.id}`)}>
      <View style={s.crewAvatarWrap}>
        <Image source={AVATAR_MAP[talent.avatarId]} style={s.crewAvatar} />
        <View style={[s.crewChemPip, { backgroundColor: chemColor }]} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.crewName}>{talent.name}</Text>
        <Text style={s.crewRole}>{label}</Text>
      </View>
      <Text style={{ color: C.muted, fontSize: 16 }}>›</Text>
    </TouchableOpacity>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionCard}>{children}</View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function ShowDetailScreen() {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { shows, talent, talentDeals, network, cancelShow, acceptStreamingOffer, declineStreamingOffer } = useGameStore();

  const show = shows.find(sh => sh.id === id);
  if (!show) {
    return (
      <LinearGradient colors={[C.gradientTop, C.gradientMid, C.gradientBot]} style={{ flex: 1 }}>
        <SafeAreaView edges={['top']} style={s.container}>
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

  const STATUS_META: Record<string, { label: string; color: string; bg: string; borderColor: string }> = {
    airing:            { label: 'AIRING',    color: C.green, bg: C.greenBg,  borderColor: C.green + '55' },
    filming:           { label: 'FILMING',   color: C.amber, bg: C.amberBg,  borderColor: C.amber + '55' },
    writing:           { label: 'WRITING',   color: C.blue,  bg: C.blueBg,   borderColor: C.blue + '55' },
    marketing:         { label: 'MARKETING', color: C.teal,  bg: C.tealBg,   borderColor: C.teal + '55' },
    'renewal-pending': { label: 'RENEWAL',   color: C.gold,  bg: C.amberBg,  borderColor: C.borderGold55 },
    completed:         { label: 'DONE',      color: C.muted, bg: C.cardBg2,  borderColor: C.muted + '44' },
    cancelled:         { label: 'CANCELLED', color: C.red,   bg: C.redBg,    borderColor: C.red + '55' },
  };

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
    <LinearGradient colors={[C.gradientTop, C.gradientMid, C.gradientBot]} locations={[0, 0.55, 1]} style={{ flex: 1 }}>
      <FilmRibbonAmbient />
      <SafeAreaView edges={['top']} style={s.container}>

        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>← BACK</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle} numberOfLines={1}>{show.title.toUpperCase()}</Text>
          <HomeButton tab="/(tabs)/shows" />
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ── Identity card ── */}
          <View style={s.identityCard}>
            <View style={{ flex: 1 }}>
              <Text style={s.showTitle}>{show.title.toUpperCase()}</Text>
              <Text style={s.showMeta}>{genreLabel} · {themeLabel} · Season {season.seasonNumber}</Text>
            </View>
            <View style={[s.statusPill, { backgroundColor: meta.bg, borderColor: meta.borderColor }]}>
              <Text style={[s.statusText, { color: meta.color }]}>{meta.label}</Text>
            </View>
          </View>

          {/* ── Action alerts ── */}
          {(needsDirector || needsCast) && (
            <View style={s.alertCard}>
              <Text style={s.alertTitle}>ACTION NEEDED TO BEGIN FILMING</Text>
              {needsDirector && (
                <TouchableOpacity
                  style={s.alertBtn}
                  onPress={() => router.push(`/hire-talent?showID=${show.id}&role=director`)}
                  activeOpacity={0.8}
                >
                  <Text style={s.alertBtnText} numberOfLines={1} adjustsFontSizeToFit>+ HIRE DIRECTOR</Text>
                </TouchableOpacity>
              )}
              {leadsNeeded > 0 && (
                <TouchableOpacity
                  style={s.alertBtn}
                  onPress={() => router.push(`/hire-talent?showID=${show.id}&role=actor&actorType=lead`)}
                  activeOpacity={0.8}
                >
                  <Text style={s.alertBtnText} numberOfLines={1} adjustsFontSizeToFit>
                    + HIRE LEAD ACTOR ({season.leadActorIDs.length}/{season.leadActorSlots})
                  </Text>
                </TouchableOpacity>
              )}
              {supportingNeeded > 0 && (
                <TouchableOpacity
                  style={s.alertBtn}
                  onPress={() => router.push(`/hire-talent?showID=${show.id}&role=actor&actorType=supporting`)}
                  activeOpacity={0.8}
                >
                  <Text style={s.alertBtnText} numberOfLines={1} adjustsFontSizeToFit>
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
                    <View style={s.airDateRow}>
                      <Text style={s.airDateText}>Premieres Week {season.airDateWeek}, Year {season.airDateYear}</Text>
                      <TouchableOpacity onPress={() => router.push(`/marketing?showID=${show.id}`)}>
                        <Text style={s.linkText}>Edit →</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={s.linkBtn}
                      onPress={() => router.push(`/marketing?showID=${show.id}`)}
                      activeOpacity={0.8}
                    >
                      <Text style={s.linkBtnText}>SET PREMIERE DATE & BUY ADS  →</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </Section>
          )}

          {/* ── Creative scores ── */}
          {(season.scriptScore > 0 || season.qualityScore !== 50) && show.status !== 'writing' && (
            <Section title="CREATIVE SCORES">
              <View style={s.scoresRow}>
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
              <View style={s.heatmap}>
                {Array.from({ length: season.episodeCount }, (_, i) => (
                  <HeatmapDot key={i} ep={season.episodes[i]} empty={i >= season.episodesAired} />
                ))}
              </View>
              <View style={s.statsRow}>
                <StatChip label="AVG RATING"  value={avgRating > 0 ? avgRating.toFixed(1) : '—'} />
                <StatChip label="VIEWERS/EP"  value={season.totalViewers > 0 ? fmtViewers(Math.round(season.totalViewers / Math.max(season.episodesAired, 1))) : '—'} />
                <StatChip label="AD REVENUE"  value={fmt(season.totalAdRevenue)} />
              </View>
            </Section>
          )}

          {/* ── Streaming offer ── */}
          {show.pendingStreamingOffer && (
            <View style={s.streamingOfferCard}>
              <View style={s.streamingOfferHeader}>
                <View style={s.streamingPill}>
                  <Text style={s.streamingPillText}>STREAMING OFFER</Text>
                </View>
                <Text style={s.streamingExpiry}>
                  Exp Wk {show.pendingStreamingOffer.expiresWeek}, Yr {show.pendingStreamingOffer.expiresYear}
                </Text>
              </View>
              <Text style={s.streamingPlatform}>{show.pendingStreamingOffer.platformName}</Text>
              <Text style={s.streamingMeta}>
                {show.pendingStreamingOffer.seasonsToInclude.length === 1
                  ? `Season ${show.pendingStreamingOffer.seasonsToInclude[0]}`
                  : `${show.pendingStreamingOffer.seasonsToInclude.length} seasons`}
                {' · '}{show.pendingStreamingOffer.durationYears}-year deal
              </Text>
              <View style={s.streamingAmounts}>
                <View style={s.streamingAmountOption}>
                  <Text style={s.streamingAmountLabel}>NON-EXCLUSIVE</Text>
                  <Text style={s.streamingAmountValue}>{fmt(show.pendingStreamingOffer.nonExclusiveAmount)}</Text>
                </View>
                <View style={s.streamingAmountDivider} />
                <View style={s.streamingAmountOption}>
                  <Text style={s.streamingAmountLabel}>EXCLUSIVE  +40%</Text>
                  <Text style={[s.streamingAmountValue, { color: C.green }]}>{fmt(show.pendingStreamingOffer.exclusiveAmount)}</Text>
                </View>
              </View>
              <View style={s.streamingBtns}>
                <TouchableOpacity style={s.streamingDeclineBtn} onPress={() => declineStreamingOffer(show.id)} activeOpacity={0.8}>
                  <Text style={s.streamingDeclineText}>DECLINE</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.streamingNonExclBtn} onPress={() => acceptStreamingOffer(show.id, 'non-exclusive')} activeOpacity={0.8}>
                  <Text style={s.streamingNonExclText}>NON-EXCL</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.streamingExclBtn} onPress={() => acceptStreamingOffer(show.id, 'exclusive')} activeOpacity={0.8}>
                  <LinearGradient colors={['#60c888', C.green]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.streamingExclGrad}>
                    <Text style={s.streamingExclText}>EXCLUSIVE</Text>
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
                  <View key={deal.id} style={[s.dealCard, expired && { borderColor: C.border }]}>
                    <View style={s.dealHeader}>
                      <Text style={s.dealPlatform}>{deal.platformName} · {deal.dealType === 'exclusive' ? 'Exclusive' : 'Non-Exclusive'}</Text>
                      <View style={[s.dealBadge, { backgroundColor: (expired ? C.red : C.green) + '22', borderColor: (expired ? C.red : C.green) + '55' }]}>
                        <Text style={[s.dealBadgeText, { color: expired ? C.red : C.green }]}>{expired ? 'EXPIRED' : 'ACTIVE'}</Text>
                      </View>
                    </View>
                    <Text style={s.dealAmount}>{fmt(deal.amount)}</Text>
                    <Text style={[s.dealExpiry, { color: expired ? C.red : C.muted }]}>
                      {expired ? 'Expired' : 'Expires'} Wk {deal.expiresWeek}, Yr {deal.expiresYear} · S{deal.seasonsIncluded.join(', S')}
                    </Text>
                  </View>
                );
              })}
            </Section>
          )}

          {/* ── Renewal ── */}
          {show.status === 'renewal-pending' && !season.renewalDecisionMade && (
            <View style={s.renewalCard}>
              <Text style={s.renewalTitle}>SEASON {season.seasonNumber} COMPLETE</Text>
              <View style={s.renewalStats}>
                <View style={s.renewalStat}>
                  <Text style={s.renewalStatValue}>{avgRating > 0 ? avgRating.toFixed(1) : '—'}</Text>
                  <Text style={s.renewalStatLabel}>AVG RATING</Text>
                </View>
                <View style={s.renewalStat}>
                  <Text style={[s.renewalStatValue, { color: netProfit >= 0 ? C.green : C.red }]}>
                    {netProfit >= 0 ? '+' : ''}{fmt(netProfit)}
                  </Text>
                  <Text style={s.renewalStatLabel}>NET PROFIT</Text>
                </View>
              </View>
              <TouchableOpacity
                style={s.renewBtn}
                onPress={() => { hap.heavy(); router.push(`/renew?showID=${show.id}`); }}
                activeOpacity={0.88}
              >
                <LinearGradient colors={[C.gold, C.goldMid]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.renewBtnGrad}>
                  <Text style={s.renewBtnText}>RENEW SEASON {season.seasonNumber + 1}  ▶</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => { cancelShow(show.id); router.back(); }}
                activeOpacity={0.8}
              >
                <Text style={s.cancelBtnText}>CANCEL SHOW</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Season financials ── */}
          <Section title="SEASON FINANCIALS">
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
            {streamingRevenue > 0 && (
              <View style={s.finRow}>
                <Text style={s.finLabel}>Streaming deal</Text>
                <Text style={[s.finValue, { color: C.green }]}>{fmt(streamingRevenue)}</Text>
              </View>
            )}
            {revShareExpense > 0 && (
              <View style={s.finRow}>
                <Text style={s.finLabel}>
                  {show.status === 'renewal-pending' || show.status === 'cancelled'
                    ? 'Revenue share paid'
                    : 'Revenue share (est.)'}
                </Text>
                <Text style={[s.finValue, { color: C.red }]}>−{fmt(revShareExpense)}</Text>
              </View>
            )}
            <View style={[s.finRow, s.finTotalRow]}>
              <Text style={[s.finLabel, { fontFamily: F.bodyBd, color: C.text }]}>Net</Text>
              <Text style={[s.finValue, { fontFamily: F.bodyBd, color: netProfit >= 0 ? C.green : C.red }]}>
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
                style={s.hireBtn}
                onPress={() => router.push(`/hire-talent?showID=${show.id}&role=director`)}
                activeOpacity={0.8}
              >
                <Text style={s.hireBtnText}>+ HIRE DIRECTOR</Text>
              </TouchableOpacity>
            )}
          </Section>

          {/* ── Lead cast ── */}
          <Section title={`LEAD CAST  ${season.leadActorIDs.length}/${season.leadActorSlots}`}>
            {leadActors.map((actor: any) => <CrewRow key={actor.id} label="Lead Actor" talent={actor} />)}
            {show.status === 'filming' && leadsNeeded > 0 && (
              <TouchableOpacity
                style={s.hireBtn}
                onPress={() => router.push(`/hire-talent?showID=${show.id}&role=actor&actorType=lead`)}
                activeOpacity={0.8}
              >
                <Text style={s.hireBtnText} numberOfLines={1} adjustsFontSizeToFit>+ HIRE LEAD ACTOR ({leadsNeeded} slot{leadsNeeded > 1 ? 's' : ''} open)</Text>
              </TouchableOpacity>
            )}
          </Section>

          {/* ── Supporting cast ── */}
          <Section title={`SUPPORTING CAST  ${season.supportingActorIDs.length}/${season.supportingActorSlots}`}>
            {supportingActors.map((actor: any) => <CrewRow key={actor.id} label="Supporting" talent={actor} />)}
            {show.status === 'filming' && supportingNeeded > 0 && (
              <TouchableOpacity
                style={s.hireBtn}
                onPress={() => router.push(`/hire-talent?showID=${show.id}&role=actor&actorType=supporting`)}
                activeOpacity={0.8}
              >
                <Text style={s.hireBtnText} numberOfLines={1} adjustsFontSizeToFit>+ HIRE SUPPORTING ({supportingNeeded} slot{supportingNeeded > 1 ? 's' : ''} open)</Text>
              </TouchableOpacity>
            )}
          </Section>

          {/* ── Episode list ── */}
          {season.episodesAired > 0 && (
            <Section title="EPISODES">
              {season.episodes.filter(e => e.rating !== null).map(ep => (
                <View key={ep.id} style={s.epRow}>
                  <Text style={s.epNum}>Ep {ep.episodeNumber}</Text>
                  <View style={[s.epRatingBadge, { backgroundColor: ratingColor(ep.rating!) + '33', borderColor: ratingColor(ep.rating!) }]}>
                    <Text style={[s.epRating, { color: ratingColor(ep.rating!) }]}>{ep.rating!.toFixed(1)}</Text>
                  </View>
                  <Text style={s.epViewers}>{fmtViewers(ep.viewers ?? 0)} viewers</Text>
                  <Text style={s.epRevenue}>{fmt(ep.adRevenue ?? 0)}</Text>
                </View>
              ))}
            </Section>
          )}

          {/* ── Season history ── */}
          {show.seasons.length > 1 && (
            <Section title="SEASON HISTORY">
              {show.seasons.slice(0, show.currentSeasonIndex).reverse().map((it: Season) => {
                const aired = it.episodes.filter(e => e.rating !== null);
                const avg   = aired.length > 0 ? aired.reduce((sum, e) => sum + (e.rating ?? 0), 0) / aired.length : 0;
                const sRevShare = talentDeals
                  .filter(d => d.seasonID === it.id && d.revenueSharePercent > 0)
                  .reduce((sum, d) => sum + Math.round(d.revenueSharePercent / 100 * it.totalAdRevenue), 0);
                const sNet  = it.totalAdRevenue + it.streamingRevenue - it.productionCost - it.marketingSpend - sRevShare;
                return (
                  <TouchableOpacity
                    key={it.id}
                    style={s.historyCard}
                    activeOpacity={0.8}
                    onPress={() => router.push(`/season-detail?showID=${show.id}&seasonNumber=${it.seasonNumber}`)}
                  >
                    <View style={s.historyHeader}>
                      <Text style={s.historySeasonLabel}>SEASON {it.seasonNumber}</Text>
                      <Text style={s.historyChevron}>›</Text>
                    </View>
                    <View style={s.historyStats}>
                      <View style={s.historyStat}>
                        <Text style={s.historyStatValue}>{avg > 0 ? avg.toFixed(1) : '—'}</Text>
                        <Text style={s.historyStatLabel}>AVG RATING</Text>
                      </View>
                      <View style={s.historyStat}>
                        <Text style={s.historyStatValue}>{fmtViewers(it.totalViewers)}</Text>
                        <Text style={s.historyStatLabel}>VIEWERS</Text>
                      </View>
                      <View style={s.historyStat}>
                        <Text style={[s.historyStatValue, { color: sNet >= 0 ? C.green : C.red }]}>
                          {sNet >= 0 ? '+' : ''}{fmt(sNet)}
                        </Text>
                        <Text style={s.historyStatLabel}>NET</Text>
                      </View>
                    </View>
                    {it.streamingRevenue > 0 && (
                      <Text style={s.historyStreaming}>Streaming: {fmt(it.streamingRevenue)}</Text>
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
function makeStyles(C: ReturnType<typeof useTheme>['C']) {
  return StyleSheet.create({
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
    alertCard:    { backgroundColor: C.amberBg, borderWidth: 1, borderColor: C.amber + '55', borderRadius: 14, padding: 14, marginBottom: 14, gap: 10 },
    alertTitle:   { fontFamily: 'Manrope_800ExtraBold', color: C.amber, fontSize: 10, letterSpacing: 2 },
    alertBtn:     { backgroundColor: C.amber + '22', borderRadius: 10, borderWidth: 1, borderColor: C.amber + '55', padding: 11, alignItems: 'center' },
    alertBtnText: { fontFamily: 'Manrope_700Bold', color: C.amber, fontSize: 12, letterSpacing: 0.5, textAlign: 'center' },

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
    streamingOfferCard:    { backgroundColor: C.tealBg, borderWidth: 1, borderColor: C.teal + '55', borderRadius: 14, padding: 16, marginBottom: 16 },
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
    streamingExclBtn:      { flex: 2, borderRadius: 10 },
    streamingExclGrad:     { padding: 11, alignItems: 'center', borderRadius: 10 },
    streamingExclText:     { fontFamily: 'Manrope_800ExtraBold', color: C.greenBg, fontSize: 11, letterSpacing: 0.5 },

    // ── Streaming deals ──────────────────────────────────────────────────────────
    dealCard:     { backgroundColor: C.greenBg, borderWidth: 1, borderColor: C.green + '55', borderRadius: 12, padding: 14, marginBottom: 8 },
    dealHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    dealPlatform: { fontFamily: 'Manrope_700Bold', color: C.green, fontSize: 13 },
    dealBadge:    { borderRadius: 4, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2 },
    dealBadgeText:{ fontFamily: 'Manrope_800ExtraBold', fontSize: 9, letterSpacing: 1 },
    dealAmount:   { fontFamily: 'BebasNeue_400Regular', color: C.text, fontSize: 22, marginBottom: 2 },
    dealExpiry:   { fontFamily: 'Manrope_400Regular', fontSize: 11 },

    // ── Renewal card ─────────────────────────────────────────────────────────────
    renewalCard:       { backgroundColor: C.amberBg, borderWidth: 1, borderColor: C.borderGold55, borderRadius: 14, padding: 16, marginBottom: 16 },
    renewalTitle:      { fontFamily: 'BebasNeue_400Regular', color: C.gold, fontSize: 20, letterSpacing: 1.5, marginBottom: 14 },
    renewalStats:      { flexDirection: 'row', gap: 20, marginBottom: 16 },
    renewalStat:       { alignItems: 'center' },
    renewalStatValue:  { fontFamily: 'BebasNeue_400Regular', color: C.text, fontSize: 28 },
    renewalStatLabel:  { fontFamily: 'Manrope_700Bold', color: C.mutedMid, fontSize: 8, letterSpacing: 1.5, marginTop: 2 },
    renewBtn:          { borderRadius: 999, marginBottom: 10 },
    renewBtnGrad:      { paddingVertical: 15, alignItems: 'center', borderRadius: 999 },
    renewBtnText:      { fontFamily: 'BebasNeue_400Regular', color: C.goldBtnText, fontSize: 16, letterSpacing: 3 },
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
    hireBtn:     { marginTop: 10, borderWidth: 1, borderColor: C.borderGold55, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 10, alignItems: 'center', backgroundColor: C.goldDim },
    hireBtnText: { fontFamily: 'Manrope_700Bold', color: C.gold, fontSize: 11, letterSpacing: 0.5, textAlign: 'center' },

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
}
