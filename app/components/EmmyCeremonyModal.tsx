import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity,
  StyleSheet, Animated, useWindowDimensions, SafeAreaView,
} from 'react-native';
import { hap } from '../../src/utils/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useGameStore } from '../../src/store/gameStore';
import { EMMY_CATEGORY_LABELS } from '../../src/constants/game';
import { POSTER_BACKGROUNDS } from '../poster-creator';
import type { Award, EmmyCategory, PosterConfig } from '../../src/types';
import { useTheme } from '../../src/context/ThemeContext';

// ── Ceremony reveal order — individual awards first, series last ──────────────
const CEREMONY_ORDER: EmmyCategory[] = [
  'best-director',
  'best-writing',
  'best-comedy-actor',
  'best-comedy-actress',
  'best-drama-actor',
  'best-drama-actress',
  'best-limited-series',
  'best-comedy-series',
  'best-drama-series',
];

const TALENT_CATS = new Set<EmmyCategory>([
  'best-drama-actor', 'best-drama-actress', 'best-comedy-actor',
  'best-comedy-actress', 'best-director', 'best-writing',
]);

// ── Emmy Poster ───────────────────────────────────────────────────────────────
const EMMY_POSTER_W = 120;
const EMMY_POSTER_H = 180;
const EMMY_RATIO    = EMMY_POSTER_W / 68;

const EMMY_FONT_MAP: Record<string, string> = {
  'bebas':         'BebasNeue_400Regular',
  'manrope-bold':  'Manrope_700Bold',
  'manrope-light': 'Manrope_300Light',
};

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function generateCompetitorPoster(showID: string): PosterConfig {
  const h = hashStr(showID);
  const TCOLORS = ['#ffffff', '#f5e6c8', '#f0d080', '#c8e0f0', '#e8c0c0'];
  return {
    backgroundID:     POSTER_BACKGROUNDS[h % POSTER_BACKGROUNDS.length].id,
    titlePosition:    h % 2 === 0 ? 'bottom' : 'top',
    titleSize:        (['small', 'medium', 'large'] as const)[h % 3],
    titleFont:        (['bebas', 'manrope-bold', 'manrope-light'] as const)[h % 3],
    titleColor:       TCOLORS[(h >> 1) % TCOLORS.length],
    titleAlignment:   (['left', 'center', 'right'] as const)[(h >> 2) % 3],
    seasonPosition:   (h >> 3) % 2 === 0 ? 'above-title' : 'below-title',
    seasonAlignment:  (['left', 'center', 'right'] as const)[(h >> 4) % 3],
    castPosition:     (h >> 5) % 2 === 0 ? 'top' : 'bottom',
    tagline:          '',
    showSeasonNumber: (h >> 6) % 3 !== 0,
  };
}

// Confetti layout (positions/sizes only — colors resolved inside component)
const CONFETTI_LAYOUT = [
  { xf: 0.13, yf: 0.08, rotate: '20deg',  w: 6, h: 14 },
  { xf: 0.81, yf: 0.14, rotate: '-25deg', w: 6, h: 14 },
  { xf: 0.21, yf: 0.22, rotate: '-10deg', w: 5, h: 12 },
  { xf: 0.69, yf: 0.10, rotate: '35deg',  w: 5, h: 12 },
  { xf: 0.09, yf: 0.30, rotate: '-30deg', w: 6, h: 13 },
  { xf: 0.49, yf: 0.06, rotate: '12deg',  w: 5, h: 12 },
  { xf: 0.87, yf: 0.25, rotate: '-18deg', w: 6, h: 14 },
];

const F = {
  display: 'BebasNeue_400Regular',
  body:    'Manrope_400Regular',
  bodyMd:  'Manrope_600SemiBold',
  bodyBd:  'Manrope_700Bold',
  bodyXBd: 'Manrope_800ExtraBold',
};

// ── Component ─────────────────────────────────────────────────────────────────
export function EmmyCeremonyModal() {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const { width: SW, height: SH } = useWindowDimensions();

  // Confetti colors resolved from theme
  const CONFETTI_COLORS = [C.gold, C.green, C.amber, C.gold, C.blue, C.green, C.gold];
  const CONFETTI = CONFETTI_LAYOUT.map((d, i) => ({
    ...d,
    x:     d.xf * SW,
    y:     d.yf * SH,
    color: CONFETTI_COLORS[i],
  }));

  const {
    awards, shows, talent, competitors, network,
    emmyCeremonyPendingYear, dismissEmmyCeremony,
  } = useGameStore();

  const year = emmyCeremonyPendingYear!;

  const yearAwards = useMemo(
    () => awards.filter(a => a.year === year),
    [awards, year],
  );

  // ── View state ───────────────────────────────────────────────────────────────
  const [view, setView]           = useState<'tracker' | 'reveal' | 'done'>('tracker');
  const [openedUpTo, setOpenedUpTo] = useState(0);
  const [revealIdx, setRevealIdx]   = useState(0);

  // ── Animation refs ────────────────────────────────────────────────────────────
  const screenFade   = useRef(new Animated.Value(1)).current;
  const winnerY      = useRef(new Animated.Value(28)).current;
  const winnerOp     = useRef(new Animated.Value(0)).current;
  const andWinnerOp  = useRef(new Animated.Value(0)).current;
  const pill1Op      = useRef(new Animated.Value(0)).current;
  const pill2Op      = useRef(new Animated.Value(0)).current;
  const posterOp     = useRef(new Animated.Value(0)).current;
  const starGlow     = useRef(new Animated.Value(0)).current;
  const starGlowRef  = useRef<Animated.CompositeAnimation | null>(null);
  const confetti    = useRef(CONFETTI_LAYOUT.map(() => ({
    op: new Animated.Value(0),
    ty: new Animated.Value(-14),
  }))).current;
  const scrollRef   = useRef<ScrollView>(null);

  // ── Auto-skip categories with zero nominations ────────────────────────────────
  useEffect(() => {
    if (view !== 'tracker') return;
    if (openedUpTo >= CEREMONY_ORDER.length) {
      setView('done');
      return;
    }
    const cat = CEREMONY_ORDER[openedUpTo];
    if (yearAwards.filter(a => a.category === cat).length === 0) {
      setOpenedUpTo(n => n + 1);
    }
  }, [openedUpTo, view, yearAwards]);

  // ── Scroll to keep active card visible ────────────────────────────────────────
  useEffect(() => {
    if (view !== 'tracker' || openedUpTo === 0) return;
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, openedUpTo * 70 - 24), animated: true });
    }, 340);
    return () => clearTimeout(t);
  }, [openedUpTo, view]);

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const resolveDisplay = useCallback((award: Award): { primary: string; sub: string } => {
    if (award.isPlayerAward) {
      const show = shows.find(sh => sh.id === award.showID);
      if (TALENT_CATS.has(award.category) && award.talentID) {
        const t = talent.find(ta => ta.id === award.talentID);
        return { primary: t?.name ?? '—', sub: show?.title ?? '—' };
      }
      return { primary: show?.title ?? '—', sub: network.name };
    }
    let compShowTitle = '—';
    let compStudioName = 'Competitor';
    for (const comp of competitors) {
      const cs = comp.activeShows.find(sh => sh.id === award.showID);
      if (cs) { compShowTitle = cs.title; compStudioName = comp.name; break; }
    }
    if (TALENT_CATS.has(award.category) && award.talentID && !award.talentID.startsWith('comp-')) {
      const t = talent.find(ta => ta.id === award.talentID);
      if (t) return { primary: t.name, sub: compShowTitle };
    }
    return { primary: compShowTitle, sub: compStudioName };
  }, [shows, talent, competitors, network.name]);

  const calledWinner = useCallback((cat: EmmyCategory) => {
    return yearAwards.find(a => a.category === cat && a.won) ?? null;
  }, [yearAwards]);

  const totalNoms = useMemo(() => yearAwards.filter(a => a.isPlayerAward).length, [yearAwards]);
  const totalWins = useMemo(() => yearAwards.filter(a => a.isPlayerAward && a.won).length, [yearAwards]);

  // ── Transitions ───────────────────────────────────────────────────────────────
  const fadeTransition = useCallback((cb: () => void) => {
    Animated.timing(screenFade, { toValue: 0, duration: 190, useNativeDriver: true }).start(() => {
      cb();
      requestAnimationFrame(() => {
        Animated.timing(screenFade, { toValue: 1, duration: 290, useNativeDriver: true }).start();
      });
    });
  }, [screenFade]);

  function resetRevealAnims() {
    winnerY.setValue(28);
    winnerOp.setValue(0);
    andWinnerOp.setValue(0);
    pill1Op.setValue(0);
    pill2Op.setValue(0);
    posterOp.setValue(0);
    starGlow.setValue(0);
    confetti.forEach(c => { c.op.setValue(0); c.ty.setValue(-14); });
  }

  function startRevealAnims(isPlayerWin: boolean) {
    starGlowRef.current?.stop();
    starGlowRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(starGlow, { toValue: 1,    duration: 1150, useNativeDriver: true }),
        Animated.timing(starGlow, { toValue: 0.15, duration: 1150, useNativeDriver: true }),
      ]),
    );
    starGlowRef.current.start();

    setTimeout(() => {
      Animated.timing(andWinnerOp, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, 350);

    setTimeout(() => {
      if (isPlayerWin) hap.heavy(); else hap.medium();

      Animated.parallel([
        Animated.timing(winnerY,  { toValue: 0, duration: 420, useNativeDriver: true }),
        Animated.timing(winnerOp, { toValue: 1, duration: 420, useNativeDriver: true }),
      ]).start();

      if (isPlayerWin) {
        confetti.forEach((c, i) => {
          setTimeout(() => {
            Animated.parallel([
              Animated.timing(c.op, { toValue: 1, duration: 480, useNativeDriver: true }),
              Animated.timing(c.ty, { toValue: 0,  duration: 480, useNativeDriver: true }),
            ]).start();
          }, i * 65);
        });
      }
    }, 1500);

    setTimeout(() => {
      Animated.timing(posterOp, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, 2050);

    if (isPlayerWin) {
      setTimeout(() => {
        Animated.timing(pill1Op, { toValue: 1, duration: 340, useNativeDriver: true }).start();
      }, 2350);
      setTimeout(() => {
        Animated.timing(pill2Op, { toValue: 1, duration: 340, useNativeDriver: true }).start();
      }, 2530);
    }
  }

  function openEnvelope() {
    const idx = openedUpTo;
    const cat = CEREMONY_ORDER[idx];
    const winner = yearAwards.find(a => a.category === cat && a.won);
    const isPlayerWin = winner?.isPlayerAward ?? false;

    fadeTransition(() => {
      setRevealIdx(idx);
      setView('reveal');
      resetRevealAnims();
      startRevealAnims(isPlayerWin);
    });
  }

  function continueFromReveal() {
    starGlowRef.current?.stop();
    const next = openedUpTo + 1;
    fadeTransition(() => {
      setOpenedUpTo(next);
      setView(next >= CEREMONY_ORDER.length ? 'done' : 'tracker');
    });
  }

  function closeCeremony() {
    Animated.timing(screenFade, { toValue: 0, duration: 240, useNativeDriver: true }).start(() => {
      dismissEmmyCeremony();
    });
  }

  // ── Tracker view ──────────────────────────────────────────────────────────────
  function renderTracker() {
    return (
      <View style={{ flex: 1 }}>
        <SafeAreaView>
          <View style={s.header}>
            <Text style={s.headerSub}>YEAR {year} CEREMONY</Text>
            <Text style={s.headerTitle}>EMMY NIGHT</Text>
            <View style={s.dotRow}>
              {Array.from({ length: 44 }).map((_, i) => <View key={i} style={s.dot} />)}
            </View>
            <View style={s.statsRow}>
              <View style={s.statBlock}>
                <Text style={s.statNum}>{totalNoms}</Text>
                <Text style={s.statLabel}>NOMINATIONS</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statBlock}>
                <Text style={s.statNum}>{openedUpTo} / {CEREMONY_ORDER.length}</Text>
                <Text style={s.statLabel}>CATEGORIES CALLED</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
        >
          {CEREMONY_ORDER.map((cat, i) => {
            const noms    = yearAwards.filter(a => a.category === cat);
            const label   = (EMMY_CATEGORY_LABELS[cat] ?? cat).toUpperCase();

            if (i < openedUpTo) {
              const winner  = calledWinner(cat);
              const isWin   = winner?.isPlayerAward ?? false;
              let summary   = 'Not awarded this year';
              if (winner) {
                const { primary, sub } = resolveDisplay(winner);
                summary = isWin
                  ? `✓ Won by you — ${primary}`
                  : `Won by: ${sub} — "${primary}"`;
              }
              return (
                <View key={cat} style={s.calledCard}>
                  <Text style={s.calledLabel}>{label} — CALLED</Text>
                  <Text style={[s.calledResult, isWin && s.calledResultWin]}>{summary}</Text>
                </View>
              );
            }

            if (i === openedUpTo) {
              return (
                <View key={cat} style={s.activeCard}>
                  <View style={s.nowAnnouncingRow}>
                    <Text style={s.starIcon}>★</Text>
                    <Text style={s.nowAnnouncingText}>NOW ANNOUNCING</Text>
                    <Text style={s.starIcon}>★</Text>
                  </View>
                  <Text style={s.activeCatLabel}>{label}</Text>

                  <View style={s.nomineeList}>
                    {noms.map(nom => {
                      const { primary, sub } = resolveDisplay(nom);
                      return (
                        <View key={nom.id} style={[s.nomineeRow, nom.isPlayerAward && s.nomineeRowPlayer]}>
                          <View style={[s.nomDot, { backgroundColor: nom.isPlayerAward ? C.gold : C.muted }]} />
                          <View style={s.nomTextBlock}>
                            <Text style={[s.nomPrimary, nom.isPlayerAward && s.nomPrimaryPlayer]}>{primary}</Text>
                            <Text style={s.nomSub}>{sub}{nom.isPlayerAward ? ` — ${network.name}` : ''}</Text>
                          </View>
                          {nom.isPlayerAward && <Text style={s.youBadge}>YOU</Text>}
                        </View>
                      );
                    })}
                  </View>

                  <TouchableOpacity onPress={openEnvelope} activeOpacity={0.84}>
                    <LinearGradient
                      colors={[C.gold, C.goldMid]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={s.envelopeBtn}
                    >
                      <Text style={s.envelopeBtnText}>OPEN THE ENVELOPE</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              );
            }

            const playerNoms = noms.filter(n => n.isPlayerAward);
            const upNext     = i === openedUpTo + 1;
            const queueTag   = upNext ? 'UP NEXT' : 'QUEUED';
            let queueNote    = 'Not nominated this year';
            if (playerNoms.length > 0) {
              const { primary, sub } = resolveDisplay(playerNoms[0]);
              queueNote = TALENT_CATS.has(cat)
                ? `${primary} nominated · ${sub}`
                : `${primary} nominated`;
            }
            return (
              <View key={cat} style={[s.queueCard, upNext && s.queueCardUpNext]}>
                <Text style={s.queueLabel}>{label} — {queueTag}</Text>
                <Text style={s.queueNote}>{queueNote}</Text>
              </View>
            );
          })}
          <View style={{ height: 48 }} />
        </ScrollView>
      </View>
    );
  }

  // ── Reveal view ───────────────────────────────────────────────────────────────
  function renderReveal() {
    const cat         = CEREMONY_ORDER[revealIdx];
    const noms        = yearAwards.filter(a => a.category === cat);
    const winner      = noms.find(a => a.won);
    const isPlayerWin = winner?.isPlayerAward ?? false;
    const catLabel    = (EMMY_CATEGORY_LABELS[cat] ?? cat).toUpperCase();

    let winnerPrimary = '—';
    let winnerSub     = '—';
    if (winner) {
      const d = resolveDisplay(winner);
      winnerPrimary = d.primary;
      winnerSub     = d.sub;
    }

    const starScale   = starGlow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
    const starOpacity = starGlow.interpolate({ inputRange: [0.15, 1], outputRange: [0.65, 1] });

    let posterConfig: PosterConfig | null = null;
    let posterShowTitle   = '';
    let posterNetworkName = '';
    let posterCastNames: string[] = [];
    let posterSeasonNum   = 1;

    if (winner) {
      if (winner.isPlayerAward) {
        const show = shows.find(sh => sh.id === winner.showID);
        if (show) {
          const season = show.seasons.find(sh => sh.id === winner.seasonID)
            ?? show.seasons[show.seasons.length - 1];
          posterConfig      = season?.posterConfig ?? null;
          posterShowTitle   = show.title;
          posterNetworkName = network.name;
          posterSeasonNum   = season?.seasonNumber ?? 1;
          if (season) {
            const castIDs = season.leadActorIDs.length >= 2
              ? season.leadActorIDs.slice(0, 2)
              : [...season.leadActorIDs, ...season.supportingActorIDs].slice(0, 2);
            posterCastNames = castIDs
              .map(id => talent.find(t => t.id === id)?.name ?? '')
              .filter(Boolean);
          }
        }
      } else {
        for (const comp of competitors) {
          const cs = comp.activeShows.find(sh => sh.id === winner.showID);
          if (cs) {
            posterConfig      = generateCompetitorPoster(cs.id);
            posterShowTitle   = cs.title;
            posterNetworkName = comp.name;
            posterSeasonNum   = cs.seasonNumber;
            break;
          }
        }
      }
    }

    function renderEmmyPoster() {
      if (!posterConfig) return null;
      const cfg = posterConfig;
      const bg  = POSTER_BACKGROUNDS.find(b => b.id === cfg.backgroundID) ?? POSTER_BACKGROUNDS[0];
      const pSz = (base: number) => Math.max(4, Math.round(base * EMMY_RATIO));
      const titleFamily = EMMY_FONT_MAP[cfg.titleFont] ?? 'BebasNeue_400Regular';
      const titleSize   = cfg.titleSize === 'large' ? pSz(14)
        : cfg.titleSize === 'medium' ? pSz(10) : pSz(8);
      const titleAlign  = cfg.titleAlignment;
      const flexAlign   = titleAlign === 'left' ? 'flex-start'
        : titleAlign === 'right' ? 'flex-end' : 'center';

      const presentsEl = (
        <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: pSz(5), color: '#ffffff88', letterSpacing: 1.5, textAlign: 'center', marginBottom: 1 }}>
          {posterNetworkName.toUpperCase()} PRESENTS
        </Text>
      );
      const castEl = posterCastNames.length > 0 ? (
        <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: pSz(5), color: '#ffffff88', textAlign: 'center', letterSpacing: 0.8, marginVertical: 1 }}>
          {posterCastNames.join('  ·  ')}
        </Text>
      ) : null;
      const titleEl = (
        <View style={{ alignItems: flexAlign }}>
          {cfg.showSeasonNumber && cfg.seasonPosition === 'above-title' && (
            <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: pSz(6), color: '#ffffffaa', letterSpacing: 1.5, marginBottom: 1 }}>
              SEASON {posterSeasonNum}
            </Text>
          )}
          <Text style={{ fontFamily: titleFamily, fontSize: titleSize, color: cfg.titleColor, textAlign: titleAlign, lineHeight: titleSize * 1.1 }}>
            {posterShowTitle.toUpperCase()}
          </Text>
          {cfg.showSeasonNumber && cfg.seasonPosition === 'below-title' && (
            <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: pSz(6), color: '#ffffffaa', letterSpacing: 1.5, marginTop: 1 }}>
              SEASON {posterSeasonNum}
            </Text>
          )}
          {cfg.tagline ? (
            <Text style={{ fontFamily: 'Manrope_400Regular', fontSize: pSz(5.5), color: '#ffffffbb', fontStyle: 'italic', marginTop: 2 }}>
              {cfg.tagline}
            </Text>
          ) : null}
        </View>
      );

      return (
        <View style={[s.emmyPosterWrap, { borderColor: isPlayerWin ? C.gold : '#ffffff40' }]}>
          <View style={{ width: EMMY_POSTER_W, height: EMMY_POSTER_H, borderRadius: 7, overflow: 'hidden' }}>
            {'render' in bg && bg.render
              ? bg.render(EMMY_POSTER_W, EMMY_POSTER_H)
              : <LinearGradient colors={bg.colors as [string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            }
            <View style={StyleSheet.absoluteFill}>
              <View style={{ flex: 1, justifyContent: 'space-between' }}>
                <View style={{ padding: 5 }}>
                  {presentsEl}
                  {cfg.castPosition === 'top' && castEl}
                  {cfg.titlePosition === 'top' && titleEl}
                </View>
                <View style={{ padding: 5 }}>
                  {cfg.titlePosition === 'bottom' && titleEl}
                  {cfg.castPosition === 'bottom' && castEl}
                </View>
              </View>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={isPlayerWin
            ? [C.gradientTop, C.gradientMid, C.gradientBot]
            : [C.gradientTop, C.gradientMid, C.gradientBot]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />

        {isPlayerWin && (
          <View style={s.warmGlow} pointerEvents="none" />
        )}

        {isPlayerWin && confetti.map((c, i) => (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={[
              s.confettiPiece,
              {
                left:            CONFETTI[i].x,
                top:             CONFETTI[i].y,
                width:           CONFETTI[i].w,
                height:          CONFETTI[i].h,
                backgroundColor: CONFETTI[i].color,
                opacity:         c.op,
                transform:       [
                  { rotate: CONFETTI[i].rotate },
                  { translateY: c.ty },
                ],
              },
            ]}
          />
        ))}

        <SafeAreaView style={{ flex: 1 }}>
          <View style={s.revealCenter}>
            <Text style={s.revealCatLabel}>{catLabel}</Text>

            <Animated.View style={[s.starCircle, { transform: [{ scale: starScale }], opacity: starOpacity }]}>
              <Text style={s.starChar}>★</Text>
            </Animated.View>

            <Animated.View style={{ opacity: andWinnerOp }}>
              <Text style={s.andWinner}>AND THE WINNER IS</Text>
            </Animated.View>

            <Animated.View style={[s.winnerBlock, { transform: [{ translateY: winnerY }], opacity: winnerOp }]}>
              <Text style={s.winnerTitle}>{winnerPrimary.toUpperCase()}</Text>
              <Text style={s.winnerStudio}>{winnerSub.toUpperCase()}</Text>
            </Animated.View>

            {posterConfig && (
              <Animated.View style={{ opacity: posterOp, marginBottom: 20 }}>
                {renderEmmyPoster()}
              </Animated.View>
            )}

            {isPlayerWin && (
              <View style={s.pillsRow}>
                <Animated.View style={[s.pill, s.pillGold, { opacity: pill1Op }]}>
                  <Text style={s.pillGoldText}>+3 Prestige</Text>
                </Animated.View>
                <Animated.View style={[s.pill, s.pillGreen, { opacity: pill2Op }]}>
                  <Text style={s.pillGreenText}>Streaming leverage ↑</Text>
                </Animated.View>
              </View>
            )}

            <TouchableOpacity onPress={continueFromReveal} activeOpacity={0.84} style={s.continueWrap}>
              <LinearGradient
                colors={[C.gold, C.goldMid]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={s.continueBtn}
              >
                <Text style={s.continueBtnText}>CONTINUE →</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── Done / summary view ───────────────────────────────────────────────────────
  function renderDone() {
    const playerWins = yearAwards.filter(a => a.isPlayerAward && a.won);

    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View style={s.doneContainer}>
          <View style={s.doneHeader}>
            <Text style={s.doneSubtitle}>YEAR {year} — CEREMONY COMPLETE</Text>
            <Text style={s.doneTitle}>EMMY NIGHT</Text>
            <View style={s.dotRow}>
              {Array.from({ length: 44 }).map((_, i) => <View key={i} style={s.dot} />)}
            </View>
          </View>

          <View style={s.doneSummaryCard}>
            <Text style={s.doneSummaryLine}>
              {totalWins > 0
                ? `${totalWins} WIN${totalWins > 1 ? 'S' : ''} · ${totalNoms} NOMINATION${totalNoms !== 1 ? 'S' : ''}`
                : totalNoms > 0
                  ? `0 WINS · ${totalNoms} NOMINATION${totalNoms !== 1 ? 'S' : ''}`
                  : 'NO NOMINATIONS THIS YEAR'}
            </Text>

            {playerWins.length > 0 && (
              <View style={s.doneWinsList}>
                {playerWins.map(win => {
                  const { primary } = resolveDisplay(win);
                  const catLabel = (EMMY_CATEGORY_LABELS[win.category] ?? win.category).toUpperCase();
                  return (
                    <View key={win.id} style={s.doneWinRow}>
                      <Text style={s.doneWinStar}>★</Text>
                      <View>
                        <Text style={s.doneWinPrimary}>{primary}</Text>
                        <Text style={s.doneWinCat}>{catLabel}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {totalNoms === 0 && (
              <Text style={s.doneNote}>
                Keep building your slate. Nominations come with quality and time.
              </Text>
            )}
          </View>

          <TouchableOpacity onPress={closeCeremony} activeOpacity={0.84}>
            <LinearGradient
              colors={[C.gold, C.goldMid]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.closeBtn}
            >
              <Text style={s.closeBtnText}>EXIT CEREMONY</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Root ──────────────────────────────────────────────────────────────────────
  return (
    <Modal visible statusBarTranslucent animationType="none">
      <LinearGradient
        colors={[C.gradientTop, C.gradientMid, C.gradientBot]}
        locations={[0, 0.55, 1]}
        style={{ flex: 1 }}
      >
        <Animated.View style={{ flex: 1, opacity: screenFade }}>
          {view === 'tracker' && renderTracker()}
          {view === 'reveal'  && renderReveal()}
          {view === 'done'    && renderDone()}
        </Animated.View>
      </LinearGradient>
    </Modal>
  );
}

function makeStyles(C: ReturnType<typeof useTheme>['C']) {
  return StyleSheet.create({
    header: {
      paddingTop: 14,
      paddingBottom: 16,
      paddingHorizontal: 20,
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: C.borderGold,
    },
    headerSub:   { fontFamily: F.bodyMd, fontSize: 10, letterSpacing: 4, color: C.muted, marginBottom: 4 },
    headerTitle: { fontFamily: F.display, fontSize: 34, letterSpacing: 3, color: C.gold },
    dotRow: {
      flexDirection: 'row',
      gap: 4,
      marginTop: 12,
      marginBottom: 14,
      overflow: 'hidden',
    },
    dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: C.borderGold55 },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 20,
    },
    statBlock:   { alignItems: 'center' },
    statNum:     { fontFamily: F.display, fontSize: 22, color: C.text, lineHeight: 24 },
    statLabel:   { fontFamily: F.bodyMd, fontSize: 9, letterSpacing: 1.5, color: C.muted, marginTop: 2 },
    statDivider: { width: 1, height: 28, backgroundColor: C.borderGold55 },

    listContent: { padding: 16, gap: 10 },

    calledCard: {
      backgroundColor: C.cardBg,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 12,
      paddingVertical: 11,
      paddingHorizontal: 14,
      opacity: 0.55,
    },
    calledLabel:     { fontFamily: F.bodyMd, fontSize: 9.5, letterSpacing: 1.5, color: C.muted, marginBottom: 5 },
    calledResult:    { fontFamily: F.display, fontSize: 14, letterSpacing: 0.3, color: C.muted },
    calledResultWin: { color: C.green },

    activeCard: {
      backgroundColor: C.cardBg2,
      borderWidth: 1.5,
      borderColor: C.borderGold55,
      borderRadius: 16,
      padding: 16,
      shadowColor: C.gold,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.18,
      shadowRadius: 18,
      elevation: 8,
    },
    nowAnnouncingRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 },
    nowAnnouncingText: { fontFamily: F.display, fontSize: 13, letterSpacing: 2.5, color: C.gold },
    starIcon:          { fontSize: 12, color: C.gold },
    activeCatLabel:    { fontFamily: F.display, fontSize: 22, letterSpacing: 0.5, color: C.text, textAlign: 'center', marginBottom: 14 },

    nomineeList: { gap: 8, marginBottom: 14 },
    nomineeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: C.pageBg,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 10,
      paddingVertical: 9,
      paddingHorizontal: 12,
    },
    nomineeRowPlayer: {
      backgroundColor: C.goldDim,
      borderColor: C.borderGold55,
    },
    nomDot:           { width: 7, height: 7, borderRadius: 3.5, flexShrink: 0 },
    nomTextBlock:     { flex: 1, minWidth: 0 },
    nomPrimary:       { fontFamily: F.bodyBd, fontSize: 13, color: C.muted },
    nomPrimaryPlayer: { color: C.text, fontFamily: F.bodyXBd },
    nomSub:           { fontFamily: F.body, fontSize: 9.5, color: C.mutedMid, marginTop: 1 },
    youBadge:         { fontFamily: F.bodyXBd, fontSize: 9, letterSpacing: 0.5, color: C.gold },

    envelopeBtn: {
      height: 46,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    envelopeBtnText: { fontFamily: F.display, fontSize: 14, letterSpacing: 2, color: C.goldBtnText },

    queueCard: {
      backgroundColor: C.cardBg,
      borderWidth: 1,
      borderColor: C.border,
      borderStyle: 'dashed',
      borderRadius: 12,
      paddingVertical: 11,
      paddingHorizontal: 14,
    },
    queueCardUpNext: { borderColor: C.borderGold },
    queueLabel:      { fontFamily: F.bodyMd, fontSize: 9.5, letterSpacing: 1.5, color: C.mutedMid, marginBottom: 4 },
    queueNote:       { fontFamily: F.body, fontSize: 11, color: C.mutedMid },

    warmGlow: {
      position: 'absolute',
      top: -80,
      alignSelf: 'center',
      width: 260,
      height: 260,
      borderRadius: 130,
      backgroundColor: C.goldDim,
    },
    confettiPiece: {
      position: 'absolute',
      borderRadius: 2,
    },
    revealCenter: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 36,
    },
    revealCatLabel: { fontFamily: F.bodyMd, fontSize: 10, letterSpacing: 4, color: C.muted, marginBottom: 16 },
    starCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      borderWidth: 2,
      borderColor: C.gold,
      backgroundColor: C.cardBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
      shadowColor: C.gold,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.45,
      shadowRadius: 14,
      elevation: 10,
    },
    starChar:  { fontSize: 30, color: C.gold },
    andWinner: { fontFamily: F.bodyMd, fontSize: 11, letterSpacing: 2, color: C.muted, marginBottom: 10 },
    winnerBlock: { alignItems: 'center', marginBottom: 22 },
    winnerTitle: {
      fontFamily: F.display,
      fontSize: 38,
      letterSpacing: 1,
      color: C.text,
      textAlign: 'center',
      lineHeight: 42,
    },
    winnerStudio: {
      fontFamily: F.bodyBd,
      fontSize: 12,
      letterSpacing: 0.5,
      color: C.gold,
      textAlign: 'center',
      marginTop: 6,
    },
    pillsRow:      { flexDirection: 'row', gap: 8, marginBottom: 28 },
    pill:          { paddingVertical: 6, paddingHorizontal: 13, borderRadius: 999, borderWidth: 1 },
    pillGold:      { backgroundColor: C.goldDim, borderColor: C.borderGold55 },
    pillGreen:     { backgroundColor: C.greenBg, borderColor: C.green + '55' },
    pillGoldText:  { fontFamily: F.bodyBd, fontSize: 10.5, color: C.gold },
    pillGreenText: { fontFamily: F.bodyBd, fontSize: 10.5, color: C.green },
    emmyPosterWrap: {
      borderWidth: 1.5,
      borderRadius: 9,
      shadowColor: C.gold,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.7,
      shadowRadius: 14,
      elevation: 12,
    },
    continueWrap: {},
    continueBtn: {
      paddingVertical: 13,
      paddingHorizontal: 28,
      borderRadius: 999,
      alignItems: 'center',
    },
    continueBtnText: { fontFamily: F.display, fontSize: 13, letterSpacing: 2, color: C.goldBtnText },

    doneContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      gap: 24,
    },
    doneHeader:   { alignItems: 'center' },
    doneSubtitle: { fontFamily: F.bodyMd, fontSize: 10, letterSpacing: 4, color: C.muted, marginBottom: 4 },
    doneTitle:    { fontFamily: F.display, fontSize: 34, letterSpacing: 3, color: C.gold },
    doneSummaryCard: {
      width: '100%',
      backgroundColor: C.cardBg,
      borderWidth: 1,
      borderColor: C.borderGold55,
      borderRadius: 16,
      padding: 18,
    },
    doneSummaryLine: {
      fontFamily: F.display,
      fontSize: 18,
      letterSpacing: 1,
      color: C.text,
      textAlign: 'center',
      marginBottom: 14,
    },
    doneWinsList:   { gap: 10 },
    doneWinRow:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
    doneWinStar:    { fontSize: 14, color: C.gold },
    doneWinPrimary: { fontFamily: F.bodyBd, fontSize: 14, color: C.text },
    doneWinCat:     { fontFamily: F.bodyMd, fontSize: 9, letterSpacing: 1.5, color: C.muted, marginTop: 2 },
    doneNote: {
      fontFamily: F.body,
      fontSize: 13,
      color: C.muted,
      textAlign: 'center',
      lineHeight: 20,
    },
    closeBtn: {
      paddingVertical: 14,
      paddingHorizontal: 36,
      borderRadius: 999,
      alignItems: 'center',
    },
    closeBtnText: { fontFamily: F.display, fontSize: 14, letterSpacing: 2, color: C.goldBtnText },
  });
}
export default EmmyCeremonyModal;
