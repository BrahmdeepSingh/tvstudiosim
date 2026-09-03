import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  Animated, ScrollView, useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useGameStore } from '../../src/store/gameStore';
import type { Episode, Show } from '../../src/types';

// ── Design tokens (newspaper palette) ────────────────────────────────────────
const C = {
  paper:      '#f5f0e8',
  paperDark:  '#e8e2d4',
  ink:        '#1a1612',
  inkMid:     '#3d3830',
  inkLight:   '#6b6358',
  gold:       '#b8860b',
  goldDark:   '#8b6508',
  green:      '#1a5c2e',
  red:        '#8b1a1a',
  ruleLine:   '#c8bfa8',
  ruleLineDk: '#a89880',
  overlay:    'rgba(10,8,5,0.82)',
};

const F = {
  display: 'BebasNeue_400Regular',
  body:    'Manrope_400Regular',
  bodyMd:  'Manrope_600SemiBold',
  bodyBd:  'Manrope_700Bold',
  bodyXBd: 'Manrope_800ExtraBold',
};

// CARD_W is computed inside the component via useWindowDimensions

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtViewers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function fmtMoney(n: number): string {
  if (n >= 1_000_000) return `+$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `+$${(n / 1_000).toFixed(0)}K`;
  return `+$${n}`;
}

function fmtLikes(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

// Animated rating counter
function RatingCounter({ target }: { target: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState('0.0');

  useEffect(() => {
    anim.addListener(({ value }) => setDisplay(value.toFixed(1)));
    Animated.timing(anim, {
      toValue: target,
      duration: 900,
      delay: 400,
      useNativeDriver: false,
    }).start();
    return () => anim.removeAllListeners();
  }, [target]);

  return <Text style={s.ratingNumber}>{display}</Text>;
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  onClose: () => void;
  // snapshot taken BEFORE advanceWeek so we know what week just ended
  week: number;
  year: number;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function WeeklyRecapModal({ visible, onClose, week, year }: Props) {
  const { width: SW } = useWindowDimensions();
  const CARD_W = Math.min(SW - 32, 380);
  const { shows, network, ambientSocialPosts } = useGameStore();

  const slideAnim = useRef(new Animated.Value(60)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(60);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 68, friction: 11, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  function handleClose() {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 50, duration: 180, useNativeDriver: true }),
    ]).start(() => onClose());
  }

  // ── Derive this week's data ─────────────────────────────────────────────────
  // One entry per show: the episode that aired this week (a show can only air one episode per week)
  const airedEpisodes: Array<{ show: Show; episode: Episode; seasonNumber: number }> = [];
  for (const show of shows) {
    for (const season of show.seasons) {
      for (const ep of season.episodes) {
        if (ep.weekAired === week && ep.yearAired === year && ep.rating !== null) {
          // Only add once per show (take first match — there can only be one per show per week)
          if (!airedEpisodes.some(ae => ae.show.id === show.id)) {
            airedEpisodes.push({ show, episode: ep, seasonNumber: season.seasonNumber });
          }
        }
      }
    }
  }
  // Sort by rating descending so highest performer is first
  airedEpisodes.sort((a, b) => (b.episode.rating ?? 0) - (a.episode.rating ?? 0));

  const primary = airedEpisodes[0] ?? null;
  const hasEpisode = primary !== null;
  const multiShow = airedEpisodes.length > 1;

  // Rating trend for single-show layout
  let trendDelta: number | null = null;
  if (primary && !multiShow) {
    const season = primary.show.seasons.find(s => s.id === primary.episode.seasonID);
    if (season) {
      const prevEp = season.episodes
        .filter(e => e.episodeNumber < primary.episode.episodeNumber && e.rating !== null)
        .sort((a, b) => b.episodeNumber - a.episodeNumber)[0];
      if (prevEp?.rating !== null && prevEp?.rating !== undefined) {
        trendDelta = (primary.episode.rating ?? 0) - prevEp.rating;
      }
    }
  }

  // Top 2 tweets across ALL airing shows this week
  const topTweets = airedEpisodes
    .flatMap(ae => ae.episode.socialReactions)
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 2);

  // ── Non-airing week data ────────────────────────────────────────────────────
  // Shows actively in production (not airing, not done)
  const productionShows = shows.filter(sh =>
    ['writing', 'filming', 'marketing'].includes(sh.status)
  );

  // Find the show closest to its next milestone to headline
  function weeksRemainingInStage(show: Show): number {
    const season = show.seasons[show.currentSeasonIndex];
    if (!season) return 99;
    if (show.status === 'writing')   return season.writingWeeksTotal   - season.writingWeeksCompleted;
    if (show.status === 'filming')   return season.filmingWeeksTotal   - season.filmingWeeksCompleted;
    if (show.status === 'marketing') return season.marketingWeeksTotal - season.marketingWeeksCompleted;
    return 99;
  }

  function stageLabel(status: string): string {
    if (status === 'writing')   return 'IN THE WRITERS ROOM';
    if (status === 'filming')   return 'IN PRODUCTION';
    if (status === 'marketing') return 'IN MARKETING';
    return 'IN DEVELOPMENT';
  }

  const featuredProductionShow = productionShows
    .slice()
    .sort((a, b) => weeksRemainingInStage(a) - weeksRemainingInStage(b))[0] ?? null;

  // Top 2 ambient social posts for this week (player shows only, sorted by likes)
  const thisWeekAmbient = ambientSocialPosts
    .filter(p => p.week === week && p.year === year && !p.isCompetitor)
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 2);

  const isGenuinelyQuiet = productionShows.length === 0 && thisWeekAmbient.length === 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[s.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[s.sheet, { width: CARD_W, transform: [{ translateY: slideAnim }] }]}>

          {/* Paper background */}
          <LinearGradient
            colors={['#faf6ee', '#f2ecdf']}
            style={StyleSheet.absoluteFill}
          />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.scroll}
            bounces={false}
          >
            {/* ── Masthead ── */}
            <View style={s.masthead}>
              <Text style={s.mastheadEyebrow}>
                WEEK {week} · YEAR {year} · INDUSTRY EDITION
              </Text>
              <Text style={s.mastheadTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                {network.name.toUpperCase()} WEEKLY
              </Text>
              <View style={s.mastheadRule} />
              <Text style={s.mastheadTagline}>"All The Ratings Fit To Print"</Text>
            </View>

            {hasEpisode ? (
              <>
                {multiShow ? (
                  /* ══ MULTI-SHOW LAYOUT ══════════════════════════════════════ */
                  <>
                    <View style={s.dividerHeavy} />
                    {airedEpisodes.map((ae, i) => (
                      <View key={ae.episode.id}>
                        {/* Show label */}
                        <View style={s.multiShowHeader}>
                          <Text style={s.multiShowTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                            "{ae.show.title.toUpperCase()}"
                          </Text>
                          <Text style={s.multiShowEp}>
                            S{ae.seasonNumber} · EP {ae.episode.episodeNumber}
                          </Text>
                        </View>
                        {/* Stat strip: Rating · Viewers · Ad Revenue */}
                        <View style={[s.statStrip, s.multiStatStrip]}>
                          <View style={s.statCell}>
                            <Text style={s.statLabel}>RATING</Text>
                            <Text style={[s.statValue, { color: C.ink }]}>
                              {ae.episode.rating?.toFixed(1)}
                            </Text>
                          </View>
                          <View style={s.statDivider} />
                          <View style={s.statCell}>
                            <Text style={s.statLabel}>VIEWERS</Text>
                            <Text style={s.statValue}>
                              {fmtViewers(ae.episode.viewers ?? 0)}
                            </Text>
                          </View>
                          <View style={s.statDivider} />
                          <View style={s.statCell}>
                            <Text style={s.statLabel}>AD REVENUE</Text>
                            <Text style={[s.statValue, { color: C.green }]}>
                              {fmtMoney(ae.episode.adRevenue ?? 0)}
                            </Text>
                          </View>
                        </View>
                        {i < airedEpisodes.length - 1 && <View style={s.divider} />}
                      </View>
                    ))}

                    {/* Pipeline note under all show cards */}
                    {featuredProductionShow && (
                      <View style={s.pipelineNote}>
                        <Text style={s.pipelineNoteText}>
                          ALSO IN PIPELINE: "{featuredProductionShow.title.toUpperCase()}" · {stageLabel(featuredProductionShow.status)} · {weeksRemainingInStage(featuredProductionShow)} WK{weeksRemainingInStage(featuredProductionShow) === 1 ? '' : 'S'} REMAINING
                        </Text>
                      </View>
                    )}
                  </>
                ) : (
                  /* ══ SINGLE SHOW LAYOUT ═════════════════════════════════════ */
                  <>
                    {/* Headline */}
                    <View style={s.headline}>
                      <Text style={s.headlineShow} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                        "{primary!.show.title.toUpperCase()}"
                      </Text>
                      <Text style={s.headlineEp}>
                        SEASON {primary!.seasonNumber} · EPISODE {primary!.episode.episodeNumber}
                      </Text>
                      {/* Pipeline note inline under headline */}
                      {featuredProductionShow && (
                        <Text style={s.headlinePipelineNote}>
                          {featuredProductionShow.title.toUpperCase()} · {stageLabel(featuredProductionShow.status)}
                        </Text>
                      )}
                    </View>

                    <View style={s.dividerHeavy} />

                    {/* Rating hero */}
                    <View style={s.ratingHero}>
                      <View style={s.ratingCenter}>
                        <Text style={s.ratingLabel}>AVG RATING</Text>
                        <RatingCounter target={primary!.episode.rating ?? 0} />
                        <Text style={s.ratingOutOf}>/ 10</Text>
                      </View>
                    </View>

                    <View style={s.divider} />

                    {/* Stat strip */}
                    <View style={s.statStrip}>
                      <View style={s.statCell}>
                        <Text style={s.statLabel}>VIEWERS</Text>
                        <Text style={s.statValue}>
                          {fmtViewers(primary!.episode.viewers ?? 0)}
                        </Text>
                      </View>
                      <View style={s.statDivider} />
                      <View style={s.statCell}>
                        <Text style={s.statLabel}>AD REVENUE</Text>
                        <Text style={[s.statValue, { color: C.green }]}>
                          {fmtMoney(primary!.episode.adRevenue ?? 0)}
                        </Text>
                      </View>
                      <View style={s.statDivider} />
                      <View style={s.statCell}>
                        <Text style={s.statLabel}>PRESTIGE</Text>
                        <Text style={[s.statValue, { color: C.gold }]}>
                          {network.prestige}
                        </Text>
                      </View>
                    </View>

                    {/* On the Rise / Cooling Off */}
                    {trendDelta !== null && (
                      <>
                        <View style={s.divider} />
                        <View style={s.trendRow}>
                          <View style={[s.trendCard, trendDelta >= 0 ? s.trendCardUp : s.trendCardDown]}>
                            <Text style={[s.trendBadge, trendDelta >= 0 ? s.trendBadgeUp : s.trendBadgeDown]}>
                              {trendDelta >= 0 ? '▲ ON THE RISE' : '▼ COOLING OFF'}
                            </Text>
                            <Text style={s.trendShowTitle} numberOfLines={1}>{primary!.show.title}</Text>
                            <Text style={s.trendDelta}>
                              {(primary!.episode.rating! - trendDelta).toFixed(1)}{' → '}{primary!.episode.rating!.toFixed(1)} this ep
                            </Text>
                          </View>
                        </View>
                      </>
                    )}
                  </>
                )}

                {/* ── Social Buzz (both layouts) ── */}
                {topTweets.length > 0 && (
                  <>
                    <View style={s.divider} />
                    <Text style={s.sectionHead}>THIS WEEK'S SOCIAL BUZZ</Text>
                    <View style={s.dividerThin} />
                    {topTweets.map((t, i) => (
                      <View key={i} style={s.tweetRow}>
                        <View style={s.tweetBullet} />
                        <View style={s.tweetBody}>
                          <View style={s.tweetMeta}>
                            <Text style={s.tweetHandle}>@{t.handle}</Text>
                            <View style={s.tweetLikesChip}>
                              <Text style={s.tweetLikesText}>♥ {fmtLikes(t.likes)}</Text>
                            </View>
                          </View>
                          <Text style={s.tweetContent}>"{t.content}"</Text>
                        </View>
                      </View>
                    ))}
                  </>
                )}
              </>
            ) : isGenuinelyQuiet ? (
              /* ── True quiet week — nothing happening anywhere ── */
              <>
                <View style={s.headline}>
                  <Text style={s.headlineShow}>A QUIET WEEK</Text>
                  <Text style={s.headlineEp}>AT THE STUDIO</Text>
                </View>
                <View style={s.dividerHeavy} />
                <Text style={s.quietBody}>
                  Nothing on air and no shows in production. The lot is quiet — for now.
                </Text>
              </>
            ) : (
              /* ── Production week ── */
              <>
                {featuredProductionShow && (
                  <>
                    <View style={s.headline}>
                      <Text style={s.headlineShow} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>
                        "{featuredProductionShow.title.toUpperCase()}"
                      </Text>
                      <Text style={s.headlineEp}>
                        {stageLabel(featuredProductionShow.status)} · {weeksRemainingInStage(featuredProductionShow)} WK
                        {weeksRemainingInStage(featuredProductionShow) === 1 ? '' : 'S'} REMAINING
                      </Text>
                    </View>
                    <View style={s.dividerHeavy} />

                    {/* Stat strip: prestige + cash, no ratings */}
                    <View style={s.statStrip}>
                      <View style={s.statCell}>
                        <Text style={s.statLabel}>PRESTIGE</Text>
                        <Text style={[s.statValue, { color: C.gold }]}>{network.prestige}</Text>
                      </View>
                      <View style={s.statDivider} />
                      <View style={s.statCell}>
                        <Text style={s.statLabel}>CASH ON HAND</Text>
                        <Text style={s.statValue}>{fmtMoney(network.cashOnHand).replace('+', '')}</Text>
                      </View>
                      {productionShows.length > 1 && (
                        <>
                          <View style={s.statDivider} />
                          <View style={s.statCell}>
                            <Text style={s.statLabel}>IN PIPELINE</Text>
                            <Text style={s.statValue}>{productionShows.length} SHOWS</Text>
                          </View>
                        </>
                      )}
                    </View>
                  </>
                )}

                {/* Social buzz from ambient posts this week */}
                {thisWeekAmbient.length > 0 && (
                  <>
                    <View style={s.divider} />
                    <Text style={s.sectionHead}>THIS WEEK'S SOCIAL BUZZ</Text>
                    <View style={s.dividerThin} />
                    {thisWeekAmbient.map((t, i) => (
                      <View key={i} style={s.tweetRow}>
                        <View style={s.tweetBullet} />
                        <View style={s.tweetBody}>
                          <View style={s.tweetMeta}>
                            <Text style={s.tweetHandle}>@{t.handle}</Text>
                            <View style={s.tweetLikesChip}>
                              <Text style={s.tweetLikesText}>♥ {fmtLikes(t.likes)}</Text>
                            </View>
                          </View>
                          <Text style={s.tweetContent}>"{t.content}"</Text>
                        </View>
                      </View>
                    ))}
                  </>
                )}
              </>
            )}

            {/* ── Continue button ── */}
            <View style={s.dividerHeavy} />
            <TouchableOpacity
              style={s.continueBtn}
              onPress={handleClose}
              activeOpacity={0.82}
            >
              <LinearGradient
                colors={['#1a1612', '#2a2218']}
                style={s.continueBtnGradient}
              >
                <Text style={s.continueBtnText}>CONTINUE →</Text>
              </LinearGradient>
            </TouchableOpacity>

          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: C.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  sheet: {
    maxHeight: '88%',
    borderRadius: 20,
    overflow: 'hidden',
    // Subtle drop shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 18,
  },

  scroll: {
    paddingBottom: 24,
  },

  // ── Masthead ──────────────────────────────────────────────────────────────
  masthead: {
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  mastheadEyebrow: {
    fontFamily: F.bodyMd,
    fontSize: 9,
    letterSpacing: 2.5,
    color: C.gold,
    marginBottom: 4,
  },
  mastheadRule: {
    width: '100%',
    height: 1.5,
    backgroundColor: C.ink,
    marginVertical: 5,
  },
  mastheadTitle: {
    fontFamily: F.display,
    fontSize: 36,
    letterSpacing: 4,
    color: C.ink,
    marginTop: 0,
    marginBottom: 4,
  },
  mastheadTagline: {
    fontFamily: F.body,
    fontStyle: 'italic',
    fontSize: 10,
    color: C.inkLight,
    marginTop: 4,
  },

  // ── Headline ─────────────────────────────────────────────────────────────
  headline: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
  },
  headlineShow: {
    fontFamily: F.display,
    fontSize: 28,
    letterSpacing: 1.5,
    color: C.ink,
    lineHeight: 32,
  },
  headlineEp: {
    fontFamily: F.bodyMd,
    fontSize: 10,
    letterSpacing: 2,
    color: C.inkLight,
    marginTop: 4,
  },

  // ── Dividers ─────────────────────────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: C.ruleLine,
    marginHorizontal: 20,
    marginVertical: 12,
  },
  dividerThin: {
    height: 0.5,
    backgroundColor: C.ruleLineDk,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  dividerHeavy: {
    height: 2,
    backgroundColor: C.ink,
    marginHorizontal: 20,
    marginVertical: 14,
  },

  // ── Rating hero ──────────────────────────────────────────────────────────
  ratingHero: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  ratingCenter: {
    alignItems: 'center',
  },
  ratingLabel: {
    fontFamily: F.bodyMd,
    fontSize: 9,
    letterSpacing: 3,
    color: C.inkLight,
    marginBottom: 2,
  },
  ratingNumber: {
    fontFamily: F.display,
    fontSize: 72,
    color: C.ink,
    lineHeight: 78,
  },
  ratingOutOf: {
    fontFamily: F.body,
    fontSize: 14,
    color: C.inkMid,
    marginTop: -4,
  },

  // ── Multi-show layout ────────────────────────────────────────────────────
  multiShowHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  multiShowTitle: {
    fontFamily: F.display,
    fontSize: 22,
    letterSpacing: 1,
    color: C.ink,
    lineHeight: 26,
  },
  multiShowEp: {
    fontFamily: F.bodyMd,
    fontSize: 9,
    letterSpacing: 2,
    color: C.inkLight,
    marginTop: 2,
  },
  multiStatStrip: {
    marginTop: 6,
  },
  pipelineNote: {
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: C.ruleLine,
    borderRadius: 2,
    backgroundColor: C.paperDark,
  },
  pipelineNoteText: {
    fontFamily: F.bodyMd,
    fontSize: 9,
    letterSpacing: 1.5,
    color: C.inkLight,
  },

  // ── Single-show pipeline note under headline ──────────────────────────────
  headlinePipelineNote: {
    fontFamily: F.bodyMd,
    fontSize: 9,
    letterSpacing: 1.5,
    color: C.inkLight,
    marginTop: 6,
  },

  // ── Stat strip ───────────────────────────────────────────────────────────
  statStrip: {
    flexDirection: 'row',
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: C.ruleLine,
    borderRadius: 2,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  statDivider: {
    width: 1,
    backgroundColor: C.ruleLine,
  },
  statLabel: {
    fontFamily: F.bodyMd,
    fontSize: 8,
    letterSpacing: 2,
    color: C.inkLight,
    marginBottom: 3,
  },
  statValue: {
    fontFamily: F.bodyXBd,
    fontSize: 14,
    color: C.ink,
  },

  // ── Trend cards ──────────────────────────────────────────────────────────
  trendRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    gap: 8,
  },
  trendCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 2,
    padding: 10,
  },
  trendCardUp:      { backgroundColor: '#f0f7f2', borderColor: '#a8d4b4' },
  trendCardDown:    { backgroundColor: '#faf0f0', borderColor: '#d4a8a8' },
  trendCardNeutral: { backgroundColor: '#f5f3ee', borderColor: C.ruleLine },
  trendBadge: {
    fontFamily: F.bodyBd,
    fontSize: 8,
    letterSpacing: 1.5,
    marginBottom: 5,
  },
  trendBadgeUp:      { color: C.green },
  trendBadgeDown:    { color: C.red },
  trendBadgeNeutral: { color: C.inkLight },
  trendShowTitle: {
    fontFamily: F.bodyXBd,
    fontSize: 12,
    color: C.ink,
    marginBottom: 3,
  },
  trendDelta: {
    fontFamily: F.body,
    fontSize: 10,
    color: C.inkMid,
  },

  // ── Social buzz / tweets ─────────────────────────────────────────────────
  sectionHead: {
    fontFamily: F.bodyBd,
    fontSize: 9,
    letterSpacing: 2.5,
    color: C.inkMid,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  tweetRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 10,
    alignItems: 'flex-start',
    gap: 10,
  },
  tweetBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.ink,
    marginTop: 6,
  },
  tweetBody: {
    flex: 1,
  },
  tweetMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  tweetHandle: {
    fontFamily: F.bodyBd,
    fontSize: 11,
    color: C.gold,
  },
  tweetLikesChip: {
    backgroundColor: C.paperDark,
    borderRadius: 2,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: C.ruleLine,
  },
  tweetLikesText: {
    fontFamily: F.bodyMd,
    fontSize: 9,
    color: C.inkMid,
  },
  tweetContent: {
    fontFamily: F.body,
    fontStyle: 'italic',
    fontSize: 12,
    color: C.inkMid,
    lineHeight: 17,
  },

  // ── Quiet week ───────────────────────────────────────────────────────────
  quietBody: {
    fontFamily: F.body,
    fontSize: 13,
    color: C.inkMid,
    marginHorizontal: 20,
    lineHeight: 20,
    paddingBottom: 4,
  },

  // ── Continue button ──────────────────────────────────────────────────────
  continueBtn: {
    marginHorizontal: 20,
    borderRadius: 14,
    overflow: 'hidden',
  },
  continueBtnGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
  },
  continueBtnText: {
    fontFamily: F.display,
    fontSize: 16,
    letterSpacing: 3,
    color: '#f5f0e8',
  },
});