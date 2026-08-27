import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useGameStore } from '../../src/store/gameStore';
import { hap } from '../../src/utils/haptics';

// ─── Colors ───────────────────────────────────────────────────────────────────

const C = {
  pageBg:      '#0f1220',
  cardBg:      '#191c2a',
  cardBg2:     '#12172a',
  border:      '#252840',
  text:        '#f0ede8',
  muted:       '#9a958e',
  mutedMid:    '#6b6880',
  gold:        '#e6b254',
  goldDim:     '#e6b25420',
  goldMid:     '#c49440',
  goldBtnText: '#161008',
  green:       '#4ec46e',
  greenDim:    '#4ec46e18',
  red:         '#c43820',
  redDim:      '#c4382018',
  amber:       '#d4753a',
  amberDim:    '#d4753a18',
  blue:        '#5b8dee',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function roundNearest(n: number, step: number): number {
  return Math.round(n / step) * step;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'player-turn' | 'ai-thinking' | 'won' | 'lost' | 'walked-away';

type BidCompetitor = {
  id: string;
  name: string;
  tier: string;
  maxBid: number;
  currentBid: number;
  folded: boolean;
};

const BID_INCREMENTS = [100_000, 250_000, 500_000];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function BiddingScreen() {
  const { pitchId } = useLocalSearchParams<{ pitchId: string }>();
  const router = useRouter();
  const { pitches, competitors, network, inboxItems, acquireShow, passPitch, markInboxRead } = useGameStore();

  const pitch = pitches.find(p => p.id === pitchId);

  const [phase, setPhase] = useState<Phase>('player-turn');
  const [currentBid, setCurrentBid] = useState(0);
  const [playerBid, setPlayerBid] = useState(0);
  const [comps, setComps] = useState<BidCompetitor[]>([]);
  const [leaderId, setLeaderId] = useState<string | null>(null); // null = player leading
  const [round, setRound] = useState(1);
  const [log, setLog] = useState<string[]>([]);
  const logRef = useRef<ScrollView>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!pitch || initialized.current) return;
    initialized.current = true;

    // Pick 1–2 competitors; shuffle so it's different each time
    const shuffled = [...competitors].sort(() => Math.random() - 0.5);
    const count = Math.min(shuffled.length, Math.random() < 0.45 ? 1 : 2);
    const participants = shuffled.slice(0, count);

    const initialComps: BidCompetitor[] = participants.map(c => ({
      id: c.id,
      name: c.name,
      tier: c.tier,
      // maxBid scales with quality: higher quality → studios bid more aggressively
      maxBid: roundNearest(
        (pitch.hiddenQualityScore / 100) * 2_200_000 * (0.55 + Math.random() * 0.7),
        50_000,
      ),
      currentBid: pitch.askingFlatFee,
      folded: false,
    }));

    setComps(initialComps);
    setCurrentBid(pitch.askingFlatFee);
    setPlayerBid(pitch.askingFlatFee);

    const compNames = initialComps.map(c => c.name).join(' and ');
    setLog([
      `Bidding opens at ${fmt(pitch.askingFlatFee)} — the production team's asking price.`,
      `${count === 1 ? compNames + ' has' : compNames + ' have'} entered the auction.`,
    ]);
  }, [pitch]);

  useEffect(() => {
    // Scroll log to bottom when new entries arrive
    setTimeout(() => logRef.current?.scrollToEnd({ animated: true }), 50);
  }, [log]);

  if (!pitch) {
    return (
      <SafeAreaView style={s.container}>
        <Text style={s.errText}>Pitch not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backBtnText}>← Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (pitch.greenlitByPlayer || pitch.passed) {
    return (
      <SafeAreaView style={s.container}>
        <Text style={s.errText}>This pitch has already been acted on.</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backBtnText}>← Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const activeComps = comps.filter(c => !c.folded);

  function appendLog(...entries: string[]) {
    setLog(prev => [...prev, ...entries]);
  }

  function handleRaise(increment: number) {
    if (phase !== 'player-turn') return;

    const newBid = currentBid + increment;
    if (newBid > network.cashOnHand) { hap.error?.(); return; }

    hap.medium();
    setPlayerBid(newBid);
    setCurrentBid(newBid);
    setLeaderId(null); // player is now leading
    appendLog(`You raise to ${fmt(newBid)}.`);
    setPhase('ai-thinking');

    // Snapshot comps to avoid stale closure in setTimeout
    const snap = comps.map(c => ({ ...c }));
    setTimeout(() => resolveAI(newBid, snap), 950);
  }

  function resolveAI(playerAmount: number, prevComps: BidCompetitor[]) {
    const responses: string[] = [];
    let highestAI = 0;
    let newLeader: string | null = null;

    const updated = prevComps.map(comp => {
      if (comp.folded) return comp;

      // How much would they need to counter?
      const counter = roundNearest(
        playerAmount + 50_000 + Math.random() * 150_000,
        50_000,
      );

      if (counter > comp.maxBid) {
        responses.push(`${comp.name} folds.`);
        return { ...comp, folded: true };
      }

      const theirBid = Math.min(comp.maxBid, counter);
      if (theirBid > highestAI) {
        highestAI = theirBid;
        newLeader = comp.id;
      }
      responses.push(`${comp.name} raises to ${fmt(theirBid)}.`);
      return { ...comp, currentBid: theirBid };
    });

    setComps(updated);
    appendLog(...responses);

    const stillActive = updated.filter(c => !c.folded);

    if (stillActive.length === 0) {
      appendLog('All studios have folded. The show is yours.');
      hap.success();
      setPhase('won');
    } else {
      setCurrentBid(highestAI);
      setLeaderId(newLeader);
      setRound(r => r + 1);
      setPhase('player-turn');
    }
  }

  function handleWalkAway() {
    if (phase !== 'player-turn') return;
    hap.light();
    setPhase('walked-away');
    appendLog('You walked away from the auction.');
  }

  function handleConfirmAcquisition() {
    const ok = acquireShow(pitch!.id, playerBid);
    if (ok) {
      hap.heavy();
      const item = inboxItems.find(i => i.refID === pitch!.id);
      if (item) markInboxRead(item.id);
      router.back();
    }
  }

  function handleDeclineAfterLoss() {
    passPitch(pitch!.id);
    const item = inboxItems.find(i => i.refID === pitch!.id);
    if (item) markInboxRead(item.id);
    router.back();
  }

  const leadingComp = leaderId ? comps.find(c => c.id === leaderId) : null;
  const canAfford = (inc: number) => network.cashOnHand >= currentBid + inc;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView edges={['top', 'bottom']} style={s.container}>
      <LinearGradient colors={['#131829', '#0f1220', '#0a0d18']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={s.headerBack}>
          <Text style={s.headerBackText}>✕</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerEyebrow}>BIDDING WAR</Text>
          <Text style={s.headerTitle} numberOfLines={1}>{pitch.title}</Text>
        </View>
      </View>

      {/* Show info strip */}
      <View style={s.strip}>
        <View style={s.stripTag}><Text style={s.stripTagText}>{pitch.genre.toUpperCase()}</Text></View>
        <View style={s.stripTag}><Text style={s.stripTagText}>{pitch.theme.toUpperCase()}</Text></View>
        <View style={s.stripTag}><Text style={s.stripTagText}>{pitch.proposedEpisodeCount} EPS</Text></View>
        <Text style={s.stripDot}>·</Text>
        <Text style={s.stripCash}>Cash: {fmt(network.cashOnHand)}</Text>
      </View>

      {/* Current bid card */}
      <View style={s.bidCard}>
        {phase === 'won' ? (
          <LinearGradient colors={['#1a2e1a', '#0e1e0e']} style={s.bidCardInner}>
            <Text style={s.bidCardLabel}>WINNING BID</Text>
            <Text style={[s.bidCardAmount, { color: C.green }]}>{fmt(playerBid)}</Text>
            <Text style={s.bidCardSub}>You won the rights to "{pitch.title}"</Text>
          </LinearGradient>
        ) : phase === 'walked-away' || phase === 'lost' ? (
          <LinearGradient colors={['#2a1212', '#1a0a0a']} style={s.bidCardInner}>
            <Text style={s.bidCardLabel}>YOU WALKED AWAY</Text>
            <Text style={[s.bidCardAmount, { color: C.red }]}>{fmt(currentBid)}</Text>
            <Text style={s.bidCardSub}>The show went to another studio</Text>
          </LinearGradient>
        ) : (
          <LinearGradient colors={['#1a1608', '#12100a']} style={s.bidCardInner}>
            <Text style={s.bidCardLabel}>
              {leadingComp ? `${leadingComp.name.toUpperCase()} IS LEADING` : 'YOUR BID IS LEADING'}
            </Text>
            <Text style={s.bidCardAmount}>{fmt(currentBid)}</Text>
            <Text style={s.bidCardSub}>Round {round} · Raise or walk away</Text>
          </LinearGradient>
        )}
      </View>

      {/* Competitors */}
      <View style={s.compsRow}>
        {comps.map(comp => (
          <View
            key={comp.id}
            style={[
              s.compChip,
              comp.folded && s.compChipFolded,
              leaderId === comp.id && s.compChipLeading,
            ]}
          >
            <Text style={[
              s.compChipName,
              comp.folded && s.compChipNameFolded,
              leaderId === comp.id && s.compChipNameLeading,
            ]} numberOfLines={1}>
              {comp.name}
            </Text>
            <Text style={[s.compChipStatus, comp.folded && { color: C.red }]}>
              {comp.folded ? 'OUT' : leaderId === comp.id ? `${fmt(comp.currentBid)} ↑` : 'IN'}
            </Text>
          </View>
        ))}
      </View>

      {/* Bid log */}
      <ScrollView
        ref={logRef}
        style={s.log}
        contentContainerStyle={s.logContent}
        showsVerticalScrollIndicator={false}
      >
        {log.map((entry, i) => (
          <Text key={i} style={[s.logEntry, i === log.length - 1 && s.logEntryLatest]}>
            {entry}
          </Text>
        ))}
        {phase === 'ai-thinking' && (
          <View style={s.thinkingRow}>
            <ActivityIndicator size="small" color={C.gold} />
            <Text style={s.thinkingText}>Studios are deciding…</Text>
          </View>
        )}
      </ScrollView>

      {/* Action area */}
      {phase === 'player-turn' && (
        <View style={s.actions}>
          <Text style={s.actionsLabel}>RAISE BY</Text>
          <View style={s.incrementRow}>
            {BID_INCREMENTS.map(inc => {
              const affordable = canAfford(inc);
              return (
                <TouchableOpacity
                  key={inc}
                  style={[s.incBtn, !affordable && s.incBtnDisabled]}
                  onPress={() => handleRaise(inc)}
                  disabled={!affordable}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={affordable ? [C.goldMid, C.gold] : ['#2a2818', '#1e1c0e']}
                    style={s.incBtnInner}
                  >
                    <Text style={[s.incBtnText, !affordable && s.incBtnTextDisabled]}>
                      +{fmt(inc)}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity style={s.walkBtn} onPress={handleWalkAway} activeOpacity={0.8}>
            <Text style={s.walkBtnText}>Walk Away</Text>
          </TouchableOpacity>
        </View>
      )}

      {phase === 'ai-thinking' && (
        <View style={s.actions}>
          <Text style={s.waitText}>Waiting for other studios…</Text>
        </View>
      )}

      {phase === 'won' && (
        <View style={s.actions}>
          <TouchableOpacity style={s.confirmBtn} onPress={handleConfirmAcquisition} activeOpacity={0.85}>
            <LinearGradient colors={['#2a4a2a', C.green]} style={s.confirmBtnInner}>
              <Text style={s.confirmBtnText}>Confirm Acquisition — {fmt(playerBid)}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <Text style={s.confirmNote}>
            The show arrives in your slate ready to market and air. Renew for Season 2 to take full creative control.
          </Text>
        </View>
      )}

      {(phase === 'walked-away' || phase === 'lost') && (
        <View style={s.actions}>
          <TouchableOpacity style={s.walkBtn} onPress={handleDeclineAfterLoss} activeOpacity={0.8}>
            <Text style={s.walkBtnText}>Back to Inbox</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: C.pageBg },
  errText:    { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 14, textAlign: 'center', marginTop: 60 },
  backBtn:    { alignSelf: 'center', marginTop: 20 },
  backBtnText:{ color: C.gold, fontFamily: 'Manrope_600SemiBold', fontSize: 14 },

  header:         { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 },
  headerBack:     { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerBackText: { color: C.muted, fontSize: 16, fontFamily: 'Manrope_600SemiBold' },
  headerEyebrow:  { color: C.gold, fontFamily: 'Manrope_800ExtraBold', fontSize: 10, letterSpacing: 2 },
  headerTitle:    { color: C.text, fontFamily: 'BebasNeue_400Regular', fontSize: 28, letterSpacing: 1, lineHeight: 30 },

  strip:        { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, marginBottom: 14, flexWrap: 'wrap' },
  stripTag:     { backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  stripTagText: { color: C.muted, fontFamily: 'Manrope_700Bold', fontSize: 10, letterSpacing: 1 },
  stripDot:     { color: C.mutedMid, fontSize: 12 },
  stripCash:    { color: C.gold, fontFamily: 'Manrope_600SemiBold', fontSize: 12, marginLeft: 4 },

  bidCard:       { marginHorizontal: 16, marginBottom: 14, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: C.gold + '33' },
  bidCardInner:  { paddingVertical: 22, paddingHorizontal: 20, alignItems: 'center' },
  bidCardLabel:  { color: C.gold, fontFamily: 'Manrope_800ExtraBold', fontSize: 10, letterSpacing: 2, marginBottom: 6 },
  bidCardAmount: { color: C.gold, fontFamily: 'BebasNeue_400Regular', fontSize: 52, letterSpacing: 1, lineHeight: 56 },
  bidCardSub:    { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 13, marginTop: 4 },

  compsRow:          { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 14 },
  compChip:          { flex: 1, backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, alignItems: 'center' },
  compChipFolded:    { backgroundColor: C.redDim, borderColor: C.red + '33', opacity: 0.6 },
  compChipLeading:   { backgroundColor: C.amberDim, borderColor: C.amber + '55' },
  compChipName:      { color: C.text, fontFamily: 'Manrope_700Bold', fontSize: 12, textAlign: 'center', marginBottom: 3 },
  compChipNameFolded:{ color: C.red },
  compChipNameLeading:{ color: C.amber },
  compChipStatus:    { color: C.green, fontFamily: 'Manrope_800ExtraBold', fontSize: 10, letterSpacing: 1 },

  log:        { flex: 1, marginHorizontal: 16, backgroundColor: C.cardBg2, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginBottom: 12 },
  logContent: { padding: 14, gap: 6 },
  logEntry:       { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19 },
  logEntryLatest: { color: C.text },
  thinkingRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  thinkingText:   { color: C.gold, fontFamily: 'Manrope_400Regular', fontSize: 13 },

  actions:      { paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
  actionsLabel: { color: C.mutedMid, fontFamily: 'Manrope_800ExtraBold', fontSize: 10, letterSpacing: 1.5 },
  waitText:     { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 14, textAlign: 'center', paddingVertical: 8 },

  incrementRow:       { flexDirection: 'row', gap: 8 },
  incBtn:             { flex: 1, borderRadius: 10, overflow: 'hidden' },
  incBtnDisabled:     { opacity: 0.35 },
  incBtnInner:        { paddingVertical: 14, alignItems: 'center' },
  incBtnText:         { color: C.goldBtnText, fontFamily: 'Manrope_800ExtraBold', fontSize: 13 },
  incBtnTextDisabled: { color: C.muted },

  walkBtn:     { backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  walkBtnText: { color: C.muted, fontFamily: 'Manrope_600SemiBold', fontSize: 14 },

  confirmBtn:      { borderRadius: 12, overflow: 'hidden' },
  confirmBtnInner: { paddingVertical: 16, alignItems: 'center' },
  confirmBtnText:  { color: '#f0ede8', fontFamily: 'Manrope_800ExtraBold', fontSize: 15, letterSpacing: 0.3 },
  confirmNote:     { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
