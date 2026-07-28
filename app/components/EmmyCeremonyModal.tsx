import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity,
  StyleSheet, Animated, Dimensions, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useGameStore } from '../../src/store/gameStore';
import { EMMY_CATEGORY_LABELS } from '../../src/constants/game';
import type { Award, EmmyCategory } from '../../src/types';

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

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:              '#0d0e14',
  card:            '#131520',
  cardActive:      '#191b2a',
  border:          '#1e2136',
  borderGold:      '#e6b25430',
  borderGoldStrong:'#e6b254b0',
  text:            '#f0ede8',
  muted:           '#7a7590',
  mutedMid:        '#55526a',
  gold:            '#e6b254',
  goldDim:         '#e6b25418',
  goldMid:         '#c49440',
  goldText:        '#161008',
  green:           '#4ec46e',
  greenDim:        '#4ec46e22',
  amber:           '#d4753a',
  blue:            '#5b8dee',
};
const F = {
  display: 'BebasNeue_400Regular',
  body:    'Manrope_400Regular',
  bodyMd:  'Manrope_600SemiBold',
  bodyBd:  'Manrope_700Bold',
  bodyXBd: 'Manrope_800ExtraBold',
};

const { width: SW, height: SH } = Dimensions.get('window');

// Confetti piece configs (absolute pixel positions)
const CONFETTI = [
  { x: SW * 0.13, y: SH * 0.08, color: C.gold,  rotate: '20deg',  w: 6, h: 14 },
  { x: SW * 0.81, y: SH * 0.14, color: C.green, rotate: '-25deg', w: 6, h: 14 },
  { x: SW * 0.21, y: SH * 0.22, color: C.amber, rotate: '-10deg', w: 5, h: 12 },
  { x: SW * 0.69, y: SH * 0.10, color: C.gold,  rotate: '35deg',  w: 5, h: 12 },
  { x: SW * 0.09, y: SH * 0.30, color: C.blue,  rotate: '-30deg', w: 6, h: 13 },
  { x: SW * 0.49, y: SH * 0.06, color: C.green, rotate: '12deg',  w: 5, h: 12 },
  { x: SW * 0.87, y: SH * 0.25, color: C.gold,  rotate: '-18deg', w: 6, h: 14 },
];

// ── Component ─────────────────────────────────────────────────────────────────
export function EmmyCeremonyModal() {
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
  const [openedUpTo, setOpenedUpTo] = useState(0);  // next envelope index to open
  const [revealIdx, setRevealIdx]   = useState(0);  // index currently on reveal screen

  // ── Animation refs ────────────────────────────────────────────────────────────
  const screenFade   = useRef(new Animated.Value(1)).current;
  const winnerY      = useRef(new Animated.Value(28)).current;
  const winnerOp     = useRef(new Animated.Value(0)).current;
  const andWinnerOp  = useRef(new Animated.Value(0)).current;
  const pill1Op      = useRef(new Animated.Value(0)).current;
  const pill2Op      = useRef(new Animated.Value(0)).current;
  const starGlow     = useRef(new Animated.Value(0)).current;
  const starGlowRef  = useRef<Animated.CompositeAnimation | null>(null);
  const confetti    = useRef(CONFETTI.map(() => ({
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
      const show = shows.find(s => s.id === award.showID);
      if (TALENT_CATS.has(award.category) && award.talentID) {
        const t = talent.find(ta => ta.id === award.talentID);
        return { primary: t?.name ?? '—', sub: show?.title ?? '—' };
      }
      return { primary: show?.title ?? '—', sub: network.name };
    }
    // Competitor — find show title + studio name
    let compShowTitle = '—';
    let compStudioName = 'Competitor';
    for (const comp of competitors) {
      const cs = comp.activeShows.find(s => s.id === award.showID);
      if (cs) { compShowTitle = cs.title; compStudioName = comp.name; break; }
    }
    // For talent categories, resolve the real talent name when available
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
      Animated.timing(screenFade, { toValue: 1, duration: 290, useNativeDriver: true }).start();
    });
  }, [screenFade]);

  function resetRevealAnims() {
    winnerY.setValue(28);
    winnerOp.setValue(0);
    andWinnerOp.setValue(0);
    pill1Op.setValue(0);
    pill2Op.setValue(0);
    starGlow.setValue(0);
    confetti.forEach(c => { c.op.setValue(0); c.ty.setValue(-14); });
  }

  function startRevealAnims(isPlayerWin: boolean) {
    // Phase 1: Star glow starts immediately
    starGlowRef.current?.stop();
    starGlowRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(starGlow, { toValue: 1,    duration: 1150, useNativeDriver: true }),
        Animated.timing(starGlow, { toValue: 0.15, duration: 1150, useNativeDriver: true }),
      ]),
    );
    starGlowRef.current.start();

    // Phase 2: "AND THE WINNER IS" fades in after a short beat
    setTimeout(() => {
      Animated.timing(andWinnerOp, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, 350);

    // Phase 3: Winner slides up after tension pause
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(winnerY,  { toValue: 0, duration: 420, useNativeDriver: true }),
        Animated.timing(winnerOp, { toValue: 1, duration: 420, useNativeDriver: true }),
      ]).start();

      if (isPlayerWin) {
        // Confetti bursts the moment the winner name starts appearing
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

    // Phase 4: Stat pills stagger in after winner has fully arrived (player win only)
    if (isPlayerWin) {
      setTimeout(() => {
        Animated.timing(pill1Op, { toValue: 1, duration: 340, useNativeDriver: true }).start();
      }, 2100);
      setTimeout(() => {
        Animated.timing(pill2Op, { toValue: 1, duration: 340, useNativeDriver: true }).start();
      }, 2280);
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
      // If we're past the last category, go directly to done;
      // otherwise back to tracker (auto-skip effect handles remaining empty cats)
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
        {/* Header */}
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

        {/* Category list */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
        >
          {CEREMONY_ORDER.map((cat, i) => {
            const noms    = yearAwards.filter(a => a.category === cat);
            const label   = (EMMY_CATEGORY_LABELS[cat] ?? cat).toUpperCase();

            // ── Called ─────────────────────────────────────────────────────────
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

            // ── Now announcing ─────────────────────────────────────────────────
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
                      colors={['#e8c260', '#c49030']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={s.envelopeBtn}
                    >
                      <Text style={s.envelopeBtnText}>OPEN THE ENVELOPE</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              );
            }

            // ── Queued ─────────────────────────────────────────────────────────
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

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Background */}
        <LinearGradient
          colors={isPlayerWin
            ? ['#1a1508', '#0e0f18', '#07090f']
            : ['#0e1018', '#090b14', '#06080f']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Warm glow at top-center for player win */}
        {isPlayerWin && (
          <View style={s.warmGlow} pointerEvents="none" />
        )}

        {/* Confetti (player win only) */}
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

        {/* Center content */}
        <SafeAreaView style={{ flex: 1 }}>
          <View style={s.revealCenter}>
            {/* Category label */}
            <Text style={s.revealCatLabel}>{catLabel}</Text>

            {/* Emmy star circle */}
            <Animated.View style={[s.starCircle, { transform: [{ scale: starScale }], opacity: starOpacity }]}>
              <Text style={s.starChar}>★</Text>
            </Animated.View>

            {/* "AND THE WINNER IS" — fades in first for tension */}
            <Animated.View style={{ opacity: andWinnerOp }}>
              <Text style={s.andWinner}>AND THE WINNER IS</Text>
            </Animated.View>

            {/* Winner — animated entrance */}
            <Animated.View style={[s.winnerBlock, { transform: [{ translateY: winnerY }], opacity: winnerOp }]}>
              <Text style={s.winnerTitle}>{winnerPrimary.toUpperCase()}</Text>
              <Text style={s.winnerStudio}>{winnerSub.toUpperCase()}</Text>
            </Animated.View>

            {/* Stat pills — player win only */}
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

            {/* Continue */}
            <TouchableOpacity onPress={continueFromReveal} activeOpacity={0.84} style={s.continueWrap}>
              <LinearGradient
                colors={['#e8c260', '#c49030']}
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
          {/* Header */}
          <View style={s.doneHeader}>
            <Text style={s.doneSubtitle}>YEAR {year} — CEREMONY COMPLETE</Text>
            <Text style={s.doneTitle}>EMMY NIGHT</Text>
            <View style={s.dotRow}>
              {Array.from({ length: 44 }).map((_, i) => <View key={i} style={s.dot} />)}
            </View>
          </View>

          {/* Summary card */}
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

          {/* Exit */}
          <TouchableOpacity onPress={closeCeremony} activeOpacity={0.84}>
            <LinearGradient
              colors={['#e8c260', '#c49030']}
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
        colors={['#0d0f1a', '#08090f', '#050710']}
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

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // ── Tracker header ─────────────────────────────────────────────────────────
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
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: C.borderGoldStrong },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  statBlock:   { alignItems: 'center' },
  statNum:     { fontFamily: F.display, fontSize: 22, color: '#fff', lineHeight: 24 },
  statLabel:   { fontFamily: F.bodyMd, fontSize: 9, letterSpacing: 1.5, color: C.muted, marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: C.borderGoldStrong },

  // ── Tracker list ───────────────────────────────────────────────────────────
  listContent: { padding: 16, gap: 10 },

  calledCard: {
    backgroundColor: C.card,
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
    backgroundColor: C.cardActive,
    borderWidth: 1.5,
    borderColor: C.borderGoldStrong,
    borderRadius: 16,
    padding: 16,
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  nowAnnouncingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 },
  nowAnnouncingText: { fontFamily: F.display, fontSize: 13, letterSpacing: 2.5, color: C.gold },
  starIcon: { fontSize: 12, color: C.gold },
  activeCatLabel: { fontFamily: F.display, fontSize: 22, letterSpacing: 0.5, color: '#fff', textAlign: 'center', marginBottom: 14 },

  nomineeList: { gap: 8, marginBottom: 14 },
  nomineeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0e1020',
    borderWidth: 1,
    borderColor: '#252840',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  nomineeRowPlayer: {
    backgroundColor: '#1e1a08',
    borderColor: C.borderGoldStrong,
  },
  nomDot: { width: 7, height: 7, borderRadius: 3.5, flexShrink: 0 },
  nomTextBlock: { flex: 1, minWidth: 0 },
  nomPrimary: { fontFamily: F.bodyBd, fontSize: 13, color: '#bbb8b0' },
  nomPrimaryPlayer: { color: '#fff', fontFamily: F.bodyXBd },
  nomSub: { fontFamily: F.body, fontSize: 9.5, color: C.muted, marginTop: 1 },
  youBadge: { fontFamily: F.bodyXBd, fontSize: 9, letterSpacing: 0.5, color: C.gold },

  envelopeBtn: {
    height: 46,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  envelopeBtnText: { fontFamily: F.display, fontSize: 14, letterSpacing: 2, color: C.goldText },

  queueCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: '#1e2030',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  queueCardUpNext: { borderColor: '#2e3048' },
  queueLabel: { fontFamily: F.bodyMd, fontSize: 9.5, letterSpacing: 1.5, color: C.mutedMid, marginBottom: 4 },
  queueNote:  { fontFamily: F.body, fontSize: 11, color: C.mutedMid },

  // ── Reveal ─────────────────────────────────────────────────────────────────
  warmGlow: {
    position: 'absolute',
    top: -80,
    alignSelf: 'center',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#e6b25410',
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
    backgroundColor: '#141620',
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
    color: '#fff',
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
  pillsRow: { flexDirection: 'row', gap: 8, marginBottom: 28 },
  pill: { paddingVertical: 6, paddingHorizontal: 13, borderRadius: 999, borderWidth: 1 },
  pillGold:      { backgroundColor: '#e6b25418', borderColor: '#e6b25455' },
  pillGreen:     { backgroundColor: '#4ec46e18', borderColor: '#4ec46e55' },
  pillGoldText:  { fontFamily: F.bodyBd, fontSize: 10.5, color: C.gold },
  pillGreenText: { fontFamily: F.bodyBd, fontSize: 10.5, color: C.green },
  continueWrap: {},
  continueBtn: {
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderRadius: 999,
    alignItems: 'center',
  },
  continueBtnText: { fontFamily: F.display, fontSize: 13, letterSpacing: 2, color: C.goldText },

  // ── Done ───────────────────────────────────────────────────────────────────
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
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.borderGoldStrong,
    borderRadius: 16,
    padding: 18,
  },
  doneSummaryLine: {
    fontFamily: F.display,
    fontSize: 18,
    letterSpacing: 1,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 14,
  },
  doneWinsList: { gap: 10 },
  doneWinRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  doneWinStar:  { fontSize: 14, color: C.gold },
  doneWinPrimary: { fontFamily: F.bodyBd, fontSize: 14, color: '#fff' },
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
  closeBtnText: { fontFamily: F.display, fontSize: 14, letterSpacing: 2, color: C.goldText },
});