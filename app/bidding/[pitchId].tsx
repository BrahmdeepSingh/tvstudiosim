import {
    View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated,
  } from 'react-native';
  import { SafeAreaView } from 'react-native-safe-area-context';
  import { useLocalSearchParams, useRouter } from 'expo-router';
  import { useState, useEffect, useRef, useCallback } from 'react';
  import { LinearGradient } from 'expo-linear-gradient';
  import { useGameStore } from '../../src/store/gameStore';
  import { hap } from '../../src/utils/haptics';
  
  // ─── Constants ────────────────────────────────────────────────────────────────
  
  const AUCTION_TICKS  = 100;  // 10.0 seconds total (each tick = 100 ms)
  const TICK_MS        = 100;
  const LATE_THRESHOLD = 50;   // < 5.0 s remaining triggers extension
  const EXTENSION      = 30;   // +3.0 s added on a late bid
  const BID_INCREMENTS = [100_000, 250_000, 500_000];
  
  // ─── Helpers ──────────────────────────────────────────────────────────────────
  
  function fmt(n: number): string {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n}`;
  }
  
  function randNearest(min: number, max: number, step: number): number {
    return Math.round((min + Math.random() * (max - min)) / step) * step;
  }
  
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
  };
  
  // ─── Types ────────────────────────────────────────────────────────────────────
  
  type AuctionPhase = 'countdown' | 'won' | 'lost';
  
  type AuctionStudio = {
    id: string;
    name: string;
    maxBid: number;
    dropped: boolean;
  };
  
  type BidEntry = {
    uid: string;
    bidderId: string;
    bidderName: string;
    amount: number;
    isPlayer: boolean;
  };
  
  // ─── Screen ───────────────────────────────────────────────────────────────────
  
  export default function BiddingScreen() {
    const { pitchId } = useLocalSearchParams<{ pitchId: string }>();
    const router = useRouter();
    const {
      pitches, competitors, network, inboxItems,
      acquireShow, passPitch, markInboxRead,
    } = useGameStore();
  
    const pitch = pitches.find(p => p.id === pitchId);
  
    // ── Render state ────────────────────────────────────────────────────────────
    const [phase,      setPhase]      = useState<AuctionPhase>('countdown');
    const [ticks,      setTicks]      = useState(AUCTION_TICKS);
    const [currentBid, setCurrentBid] = useState(0);
    const [leaderId,   setLeaderId]   = useState('');
    const [leaderName, setLeaderName] = useState('');
    const [studios,    setStudios]    = useState<AuctionStudio[]>([]);
    const [bidLog,     setBidLog]     = useState<BidEntry[]>([]);
  
    // ── Mutable refs (safe to read inside timer/timeout callbacks) ──────────────
    const live = useRef({
      ticks:      AUCTION_TICKS,
      currentBid: 0,
      leaderId:   '',
      leaderName: '',
      phase:      'countdown' as AuctionPhase,
      studios:    [] as AuctionStudio[],
    });
    const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
    const aiTimeouts    = useRef<ReturnType<typeof setTimeout>[]>([]);
    const initialized   = useRef(false);
    const logRef        = useRef<ScrollView>(null);
  
    // ── Leader flash animation ──────────────────────────────────────────────────
    const flashAnim = useRef(new Animated.Value(1)).current;
  
    function flashLeader() {
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 0.25, duration: 80,  useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 1,    duration: 220, useNativeDriver: true }),
      ]).start();
    }
  
    // ── Core bid recorder ───────────────────────────────────────────────────────
    // useCallback with [] — only reads/writes stable refs and state setters
    const placeBid = useCallback((
      bidderId: string, bidderName: string, amount: number, isPlayer: boolean,
    ) => {
      // Update live ref
      live.current.currentBid  = amount;
      live.current.leaderId    = bidderId;
      live.current.leaderName  = bidderName;
  
      // Extend timer if this is a last-second bid
      if (live.current.ticks < LATE_THRESHOLD) {
        live.current.ticks = Math.min(live.current.ticks + EXTENSION, LATE_THRESHOLD + EXTENSION);
        setTicks(live.current.ticks);
      }
  
      // Mark studios that can no longer outbid as dropped
      live.current.studios = live.current.studios.map(s => ({
        ...s,
        dropped: s.dropped || (!isPlayer && s.id === bidderId ? false : s.dropped || amount >= s.maxBid && s.id !== bidderId),
      }));
      // Simpler: drop any studio whose maxBid is now beaten
      live.current.studios = live.current.studios.map(s => ({
        ...s,
        dropped: s.dropped || (s.id !== bidderId && amount >= s.maxBid),
      }));
  
      setCurrentBid(amount);
      setLeaderId(bidderId);
      setLeaderName(bidderName);
      setStudios([...live.current.studios]);
      setBidLog(prev => [
        ...prev,
        { uid: `${Date.now()}-${Math.random()}`, bidderId, bidderName, amount, isPlayer },
      ]);
  
      flashLeader();
      if (isPlayer) hap.medium();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
    // ── Auction resolution ──────────────────────────────────────────────────────
    const resolveAuction = useCallback(() => {
      if (live.current.phase !== 'countdown') return;
      const won = live.current.leaderId === 'player';
      live.current.phase = won ? 'won' : 'lost';
      setPhase(won ? 'won' : 'lost');
      aiTimeouts.current.forEach(t => clearTimeout(t));
      if (won) hap.heavy();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
    // ── Initialization ──────────────────────────────────────────────────────────
    useEffect(() => {
      if (!pitch || initialized.current) return;
      initialized.current = true;
  
      const startingBid = pitch.askingFlatFee;
  
      // Build studio list — all competitors participate.
      // maxBid is anchored to the asking fee so studios are always willing to
      // bid above opening; quality scales how much above they'll go (1.1x–3.5x).
      const qMult = 1.1 + (pitch.hiddenQualityScore / 100) * 2.4;
      const auctionStudios: AuctionStudio[] = competitors.map(c => ({
        id:      c.id,
        name:    c.name,
        maxBid:  randNearest(
          startingBid * 1.05,
          startingBid * qMult,
          50_000,
        ),
        dropped: false,
      }));
  
      // Studio with highest maxBid opens at asking price (first bid, always)
      const opener = [...auctionStudios].sort((a, b) => b.maxBid - a.maxBid)[0];
  
      live.current = {
        ticks:      AUCTION_TICKS,
        currentBid: startingBid,
        leaderId:   opener.id,
        leaderName: opener.name,
        phase:      'countdown',
        studios:    auctionStudios,
      };
  
      setStudios(auctionStudios);
      setCurrentBid(startingBid);
      setLeaderId(opener.id);
      setLeaderName(opener.name);
      setBidLog([{
        uid:        'open',
        bidderId:   opener.id,
        bidderName: opener.name,
        amount:     startingBid,
        isPlayer:   false,
      }]);
      setTicks(AUCTION_TICKS);
  
      // Schedule AI bids — attempt count and increment size scale with quality
      const timeouts: ReturnType<typeof setTimeout>[] = [];
      const q = pitch.hiddenQualityScore;
      const minAttempts = q >= 67 ? 3 : q >= 34 ? 2 : 1;
      const maxAttempts = q >= 67 ? 5 : q >= 34 ? 3 : 2;
      const incMin = q >= 67 ? 150_000 : q >= 34 ? 100_000 : 50_000;
      const incMax = q >= 67 ? 400_000 : q >= 34 ? 250_000 : 150_000;
  
      for (const studio of auctionStudios) {
        const attempts = minAttempts + Math.floor(Math.random() * (maxAttempts - minAttempts + 1));
        // Spread bids from 1.5 s in; leave last 5 s as tension window
        const window = (AUCTION_TICKS * TICK_MS) - (LATE_THRESHOLD * TICK_MS);
  
        for (let i = 0; i < attempts; i++) {
          const fireAt = 1500 + Math.random() * window;
  
          const t = setTimeout(() => {
            if (live.current.phase !== 'countdown') return;
  
            const me = live.current.studios.find(s => s.id === studio.id);
            if (!me || me.dropped) return;
            if (live.current.leaderId === studio.id) return; // already winning
  
            const needed = live.current.currentBid + randNearest(incMin, incMax, 50_000);
  
            if (needed > me.maxBid) {
              // Can't keep up — drop out
              live.current.studios = live.current.studios.map(s =>
                s.id === studio.id ? { ...s, dropped: true } : s,
              );
              setStudios([...live.current.studios]);
              return;
            }
  
            placeBid(studio.id, studio.name, needed, false);
          }, fireAt);
  
          timeouts.push(t);
        }
      }
  
      aiTimeouts.current = timeouts;
  
      // Start countdown
      timerRef.current = setInterval(() => {
        if (live.current.phase !== 'countdown') {
          clearInterval(timerRef.current!);
          return;
        }
        live.current.ticks -= 1;
        setTicks(live.current.ticks);
        if (live.current.ticks <= 0) {
          clearInterval(timerRef.current!);
          resolveAuction();
        }
      }, TICK_MS);
  
      return () => {
        clearInterval(timerRef.current!);
        aiTimeouts.current.forEach(t => clearTimeout(t));
      };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
    // Auto-scroll log
    useEffect(() => {
      setTimeout(() => logRef.current?.scrollToEnd({ animated: true }), 30);
    }, [bidLog]);
  
    // ── Player actions ──────────────────────────────────────────────────────────
    function handleRaise(increment: number) {
      if (live.current.phase !== 'countdown') return;
      const newBid = live.current.currentBid + increment;
      if (newBid > network.cashOnHand) return;
      placeBid('player', network.name, newBid, true);
    }
  
    function handleAcquire() {
      const ok = acquireShow(pitch!.id, currentBid);
      if (ok) {
        hap.heavy();
        const item = inboxItems.find(i => i.refID === pitch!.id);
        if (item) markInboxRead(item.id);
        router.back();
      }
    }
  
    function handleBack() {
      const item = inboxItems.find(i => i.refID === pitch!.id);
      if (item) markInboxRead(item.id);
      router.back();
    }
  
    // ── Error state ─────────────────────────────────────────────────────────────
    if (!pitch || pitch.greenlitByPlayer || pitch.passed) {
      return (
        <SafeAreaView style={s.container}>
          <Text style={s.errText}>This auction is no longer available.</Text>
          <TouchableOpacity onPress={() => router.back()} style={s.errBack}>
            <Text style={s.errBackText}>← Back</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }
  
    // ── Derived display values ──────────────────────────────────────────────────
    const timerPct    = ticks / AUCTION_TICKS;
    const timerColor  = timerPct > 0.5 ? C.gold : timerPct > 0.25 ? C.amber : C.red;
    const playerLeads = leaderId === 'player';
  
    // ── Render ──────────────────────────────────────────────────────────────────
    return (
      <SafeAreaView edges={['top', 'bottom']} style={s.container}>
        <LinearGradient colors={['#131829', '#0f1220', '#0a0d18']} style={StyleSheet.absoluteFill} />
  
        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={s.eyebrow}>LIVE AUCTION</Text>
          <Text style={s.showTitle} numberOfLines={1}>{pitch.title}</Text>
          <View style={s.tagRow}>
            <View style={s.tag}><Text style={s.tagText}>{pitch.genre.toUpperCase()}</Text></View>
            <View style={s.tag}><Text style={s.tagText}>{pitch.theme.toUpperCase()}</Text></View>
            <View style={s.tag}><Text style={s.tagText}>{pitch.proposedEpisodeCount} EPS</Text></View>
          </View>
        </View>
  
        {/* ── Timer ── */}
        <View style={s.timerWrap}>
          <View style={s.timerTrack}>
            <View style={[s.timerFill, {
              width:           `${Math.max(0, timerPct) * 100}%` as any,
              backgroundColor: timerColor,
            }]} />
          </View>
          <Text style={[s.timerText, { color: timerColor }]}>
            {phase === 'countdown' ? `${(ticks / 10).toFixed(1)}s` : 'SOLD'}
          </Text>
        </View>
  
        {/* ── Current leader ── */}
        <Animated.View style={[
          s.leaderCard,
          playerLeads   && s.leaderCardPlayer,
          phase === 'won'  && s.leaderCardWon,
          phase === 'lost' && s.leaderCardLost,
          { opacity: flashAnim },
        ]}>
          <Text style={s.leaderLabel}>
            {phase === 'countdown'
              ? 'CURRENT LEADER'
              : phase === 'won' ? '🏆 YOU WON THE AUCTION' : 'SOLD TO ANOTHER STUDIO'}
          </Text>
          <Text style={[
            s.leaderName,
            playerLeads      && { color: C.green },
            phase === 'lost' && { color: C.red },
          ]} numberOfLines={1}>
            {playerLeads ? `${network.name}  (You)` : leaderName}
          </Text>
          <Text style={[
            s.leaderBid,
            playerLeads      && { color: C.green },
            phase === 'lost' && { color: C.red },
          ]}>
            {fmt(currentBid)}
          </Text>
        </Animated.View>
  
        {/* ── Studio chips ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={s.chipsRow}
        >
          {studios.map(studio => {
            const leading = studio.id === leaderId;
            return (
              <View key={studio.id} style={[
                s.chip,
                leading        && s.chipLeading,
                studio.dropped && s.chipDropped,
              ]}>
                <Text style={[
                  s.chipName,
                  leading        && { color: C.amber },
                  studio.dropped && { color: C.red },
                ]} numberOfLines={1}>
                  {studio.name}
                </Text>
                <Text style={[
                  s.chipStatus,
                  leading        && { color: C.amber },
                  studio.dropped && { color: C.red },
                ]}>
                  {studio.dropped ? 'OUT' : leading ? '▲ LEADING' : 'IN'}
                </Text>
              </View>
            );
          })}
          {/* Player chip */}
          <View style={[s.chip, playerLeads && s.chipPlayer]}>
            <Text style={[s.chipName, playerLeads && { color: C.green }]} numberOfLines={1}>
              {network.name}
            </Text>
            <Text style={[s.chipStatus, playerLeads && { color: C.green }]}>
              {playerLeads ? '▲ LEADING' : 'WATCHING'}
            </Text>
          </View>
        </ScrollView>
  
        {/* ── Bid log ── */}
        <ScrollView
          ref={logRef}
          style={s.log}
          contentContainerStyle={s.logContent}
          showsVerticalScrollIndicator={false}
        >
          {bidLog.map((entry, i) => (
            <View key={entry.uid} style={[s.logRow, i === bidLog.length - 1 && s.logRowLatest]}>
              <Text style={[s.logWho, entry.isPlayer && { color: C.green }]} numberOfLines={1}>
                {entry.isPlayer ? `${network.name} (You)` : entry.bidderName}
              </Text>
              <Text style={[s.logAmt, entry.isPlayer && { color: C.green }]}>
                {fmt(entry.amount)}
              </Text>
            </View>
          ))}
        </ScrollView>
  
        {/* ── Actions ── */}
        {phase === 'countdown' && (
          <View style={s.actions}>
            <View style={s.cashRow}>
              <Text style={s.cashLabel}>YOUR CASH</Text>
              <Text style={s.cashAmt}>{fmt(network.cashOnHand)}</Text>
            </View>
            <View style={s.incRow}>
              {BID_INCREMENTS.map(inc => {
                const ok = !playerLeads && network.cashOnHand >= currentBid + inc;
                return (
                  <TouchableOpacity
                    key={inc}
                    style={[s.incBtn, !ok && s.incBtnOff]}
                    onPress={() => handleRaise(inc)}
                    disabled={!ok}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={ok ? [C.goldMid, C.gold] : ['#252210', '#1a1a0a']}
                      style={s.incBtnInner}
                    >
                      <Text style={[s.incBtnText, !ok && { color: C.mutedMid }]}>
                        +{fmt(inc)}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
  
        {phase === 'won' && (
          <View style={s.actions}>
            <TouchableOpacity onPress={handleAcquire} activeOpacity={0.85} style={s.acquireBtn}>
              <LinearGradient colors={['#1a3a1a', C.green]} style={s.acquireBtnInner}>
                <Text style={s.acquireBtnText}>
                  Acquire "{pitch.title}" — {fmt(currentBid)}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            <Text style={s.acquireNote}>
              Fully produced and ready to market. Renew for Season 2 to take full creative control.
            </Text>
          </View>
        )}
  
        {phase === 'lost' && (
          <View style={s.actions}>
            <TouchableOpacity onPress={handleBack} activeOpacity={0.8} style={s.lostBtn}>
              <Text style={s.lostBtnText}>Back to Inbox</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    );
  }
  
  // ─── Styles ───────────────────────────────────────────────────────────────────
  
  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.pageBg },
    errText:   { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 14, textAlign: 'center', marginTop: 60 },
    errBack:   { alignSelf: 'center', marginTop: 20 },
    errBackText: { color: C.gold, fontFamily: 'Manrope_600SemiBold', fontSize: 14 },
  
    header:    { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 },
    eyebrow:   { color: C.gold, fontFamily: 'Manrope_800ExtraBold', fontSize: 10, letterSpacing: 2.5, marginBottom: 4 },
    showTitle: { color: C.text, fontFamily: 'BebasNeue_400Regular', fontSize: 30, letterSpacing: 1, lineHeight: 32, marginBottom: 8 },
    tagRow:    { flexDirection: 'row', gap: 6 },
    tag:       { backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    tagText:   { color: C.muted, fontFamily: 'Manrope_700Bold', fontSize: 10, letterSpacing: 0.8 },
  
    timerWrap:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, marginBottom: 14 },
    timerTrack: { flex: 1, height: 8, backgroundColor: C.cardBg, borderRadius: 999, overflow: 'hidden' },
    timerFill:  { height: '100%', borderRadius: 999 },
    timerText:  { fontFamily: 'Manrope_800ExtraBold', fontSize: 14, minWidth: 44, textAlign: 'right' },
  
    leaderCard:       { marginHorizontal: 16, marginBottom: 14, borderRadius: 16, backgroundColor: '#12100a', borderWidth: 1, borderColor: C.gold + '33', paddingVertical: 22, paddingHorizontal: 20, alignItems: 'center' },
    leaderCardPlayer: { backgroundColor: '#0a140a', borderColor: C.green + '55' },
    leaderCardWon:    { backgroundColor: '#0a140a', borderColor: C.green + '77' },
    leaderCardLost:   { backgroundColor: '#140a0a', borderColor: C.red + '55' },
    leaderLabel:      { color: C.gold, fontFamily: 'Manrope_800ExtraBold', fontSize: 10, letterSpacing: 2, marginBottom: 8 },
    leaderName:       { color: C.gold, fontFamily: 'BebasNeue_400Regular', fontSize: 36, letterSpacing: 1, lineHeight: 38, textAlign: 'center' },
    leaderBid:        { color: C.gold, fontFamily: 'Manrope_700Bold', fontSize: 22, marginTop: 4 },
  
    chipsRow:     { paddingHorizontal: 14, paddingBottom: 12, gap: 8, flexDirection: 'row' },
    chip:         { backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, alignItems: 'center', minWidth: 90 },
    chipLeading:  { backgroundColor: C.amberDim, borderColor: C.amber + '55' },
    chipDropped:  { backgroundColor: C.redDim,   borderColor: C.red   + '33', opacity: 0.55 },
    chipPlayer:   { backgroundColor: C.greenDim, borderColor: C.green + '55' },
    chipName:     { color: C.text, fontFamily: 'Manrope_700Bold', fontSize: 11, textAlign: 'center', marginBottom: 3 },
    chipStatus:   { color: C.muted, fontFamily: 'Manrope_800ExtraBold', fontSize: 9, letterSpacing: 1 },
  
    log:        { flex: 1, marginHorizontal: 16, backgroundColor: C.cardBg2, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginBottom: 10 },
    logContent: { padding: 12, gap: 4 },
    logRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: C.border + '60' },
    logRowLatest:{ borderBottomWidth: 0 },
    logWho:     { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 12, flex: 1 },
    logAmt:     { color: C.text,  fontFamily: 'Manrope_700Bold',    fontSize: 12, marginLeft: 8 },
  
    actions:    { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
    cashRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cashLabel:  { color: C.mutedMid, fontFamily: 'Manrope_800ExtraBold', fontSize: 10, letterSpacing: 1.5 },
    cashAmt:    { color: C.gold, fontFamily: 'Manrope_700Bold', fontSize: 14 },
  
    incRow:         { flexDirection: 'row', gap: 8 },
    incBtn:         { flex: 1, borderRadius: 10, overflow: 'hidden' },
    incBtnOff:      { opacity: 0.35 },
    incBtnInner:    { paddingVertical: 15, alignItems: 'center' },
    incBtnText:     { color: C.goldBtnText, fontFamily: 'Manrope_800ExtraBold', fontSize: 13 },
  
    acquireBtn:      { borderRadius: 12, overflow: 'hidden' },
    acquireBtnInner: { paddingVertical: 17, alignItems: 'center' },
    acquireBtnText:  { color: '#f0ede8', fontFamily: 'Manrope_800ExtraBold', fontSize: 14, letterSpacing: 0.3 },
    acquireNote:     { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  
    lostBtn:     { backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
    lostBtnText: { color: C.muted, fontFamily: 'Manrope_600SemiBold', fontSize: 14 },
  });