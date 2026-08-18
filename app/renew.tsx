import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useGameStore } from '../src/store/gameStore';
import { Talent } from '../src/types';
import { TALENT_FEES, MIN_EPISODES, MAX_EPISODES } from '../src/constants/game';
import { AVATAR_MAP } from '../src/utils/avatars';

const C = {
  pageBg: '#0f1220', cardBg: '#191c2a',
  border: '#252840',
  text: '#f0ede8', muted: '#9a958e',
  gold: '#e6b254', goldDim: '#e6b25420', goldBtnText: '#161008',
  green: '#4ec46e', greenBg: '#1a3325', amber: '#d4753a', red: '#c43820',
};

const CHEM_COLORS = { green: C.green, blue: '#5b8dee', red: C.red };

function FilmRibbonAmbient() {
  return (
    <Image
      source={require('../assets/tvbg.png')}
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

function autoResignFee(t: Talent, heatMultiplier: number): number {
  const tier = t.popularity < 40 ? 'low' : t.popularity < 70 ? 'mid' : 'high';
  const range = t.role === 'actor' ? TALENT_FEES.actor[tier] : TALENT_FEES[t.role][tier];
  const base = Math.round((range[0] + range[1]) / 2 / 50_000) * 50_000;
  return Math.round((base * heatMultiplier) / 50_000) * 50_000;
}

function isReturnable(t: Talent): boolean {
  return t.available;
}

function TalentReturnCard({
  talent,
  role,
  selected,
  returnable,
  canSelect,
  onToggle,
  heatMultiplier,
}: {
  talent: Talent;
  role: string;
  selected: boolean;
  returnable: boolean;
  canSelect: boolean;
  onToggle: () => void;
  heatMultiplier: number;
}) {
  const chemColor = CHEM_COLORS[talent.chemistryColor];
  const fee = autoResignFee(talent, heatMultiplier);

  let primaryStat = 0;
  let primaryLabel = '';
  if (talent.stats.role === 'showrunner') { primaryStat = talent.stats.writing; primaryLabel = 'Writing'; }
  else if (talent.stats.role === 'director') { primaryStat = talent.stats.direction; primaryLabel = 'Direction'; }
  else { primaryStat = talent.stats.acting; primaryLabel = 'Acting'; }

  return (
    <View style={[s.talentCard, selected && s.talentCardSelected, !returnable && s.talentCardBusy]}>
      <View style={s.talentLeft}>
        <View style={s.avatarWrap}>
          <Image source={AVATAR_MAP[talent.avatarId]} style={s.avatarThumb} />
          <View style={[s.chemPip, { backgroundColor: chemColor }]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.talentName}>{talent.name}</Text>
          <Text style={s.talentMeta}>
            {role} · {primaryLabel} {primaryStat}
          </Text>
          {returnable && (
            <Text style={[s.talentFee, selected && { color: C.green }]}>
              Re-sign: {fmt(fee)}
            </Text>
          )}
        </View>
      </View>
      <View style={s.talentRight}>
        {!returnable ? (
          <View style={s.busyBadge}>
            <Text style={s.busyText}>Busy</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              s.toggleBtn,
              selected ? s.toggleBtnOn : s.toggleBtnOff,
              !canSelect && !selected && s.toggleBtnDisabled,
            ]}
            onPress={onToggle}
            disabled={!canSelect && !selected}
          >
            <Text style={[s.toggleBtnText, selected ? s.toggleBtnTextOn : s.toggleBtnTextOff]}>
              {selected ? '✓ Returning' : 'Re-sign'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function RenewScreen() {
  const router = useRouter();
  const { showID } = useLocalSearchParams<{ showID: string }>();
  const { shows, talent, network, renewShow, hireDirector, hireActor } = useGameStore();

  const show = shows.find(s => s.id === showID);
  const prevSeason = show?.seasons[show.currentSeasonIndex];

  const [isFinalSeason, setIsFinalSeason] = useState(false);
  const [episodeCount, setEpisodeCount] = useState(prevSeason?.episodeCount ?? 10);
  const [leadSlots, setLeadSlots] = useState(prevSeason?.leadActorSlots ?? 2);
  const [supportingSlots, setSupportingSlots] = useState(prevSeason?.supportingActorSlots ?? 2);
  const [resignShowrunner, setResignShowrunner] = useState(true);
  const [resignDirector, setResignDirector] = useState(false);
  const [resignLeadIDs, setResignLeadIDs] = useState<string[]>([]);
  const [resignSupportingIDs, setResignSupportingIDs] = useState<string[]>([]);

  if (!show || !prevSeason || show.status !== 'renewal-pending') {
    return (
      <SafeAreaView edges={['top']} style={s.container}>
        <LinearGradient colors={['#131829', '#0f1220']} style={StyleSheet.absoluteFill} />
        <Text style={{ color: C.muted, padding: 32, fontFamily: 'Manrope_400Regular' }}>Show not available for renewal.</Text>
      </SafeAreaView>
    );
  }

  const heat = show.heatMultiplier ?? 1.0;

  const prevSeasonNumber = prevSeason.seasonNumber;
  const newSeasonNumber = prevSeasonNumber + 1;

  const returningShowrunner = talent.find(t => t.id === prevSeason.showrunnerID) ?? null;
  const returningDirector   = prevSeason.directorID ? talent.find(t => t.id === prevSeason.directorID) ?? null : null;
  const returningLeads      = prevSeason.leadActorIDs.map(id => talent.find(t => t.id === id)).filter(Boolean) as Talent[];
  const returningSupporting = prevSeason.supportingActorIDs.map(id => talent.find(t => t.id === id)).filter(Boolean) as Talent[];

  // Showrunner is never marked available mid-season (they work writing + filming).
  // They're always returnable for their own show's renewal since they're not busy elsewhere.
  const showrunnerReturnable = returningShowrunner != null;

  function toggleLeadResign(id: string) {
    setResignLeadIDs(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= leadSlots) return prev;
      return [...prev, id];
    });
  }

  function toggleSupportingResign(id: string) {
    setResignSupportingIDs(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= supportingSlots) return prev;
      return [...prev, id];
    });
  }

  function adjustLeadSlots(delta: number) {
    const next = Math.max(1, Math.min(6, leadSlots + delta));
    setLeadSlots(next);
    if (resignLeadIDs.length > next) {
      setResignLeadIDs(prev => prev.slice(0, next));
    }
  }

  function adjustSupportingSlots(delta: number) {
    const next = Math.max(1, Math.min(8, supportingSlots + delta));
    setSupportingSlots(next);
    if (resignSupportingIDs.length > next) {
      setResignSupportingIDs(prev => prev.slice(0, next));
    }
  }

  const showrunnerFee  = resignShowrunner && showrunnerReturnable ? autoResignFee(returningShowrunner!, heat) : 0;
  const directorFee    = resignDirector && returningDirector ? autoResignFee(returningDirector, heat) : 0;
  const leadFees       = resignLeadIDs.reduce((sum, id) => {
    const t = talent.find(x => x.id === id);
    return sum + (t ? autoResignFee(t, heat) : 0);
  }, 0);
  const supportingFees = resignSupportingIDs.reduce((sum, id) => {
    const t = talent.find(x => x.id === id);
    return sum + (t ? autoResignFee(t, heat) : 0);
  }, 0);
  const totalResignCost = showrunnerFee + directorFee + leadFees + supportingFees;
  const canAfford = network.cashOnHand >= totalResignCost;

  function handleStartPreProduction() {
    // Pass keepShowrunner: renewShow handles booking/freeing internally
    renewShow(showID!, episodeCount, leadSlots, supportingSlots, resignShowrunner && showrunnerReturnable, isFinalSeason);

    if (resignDirector && returningDirector) {
      hireDirector(showID!, returningDirector.id, autoResignFee(returningDirector, heat), 0);
    }
    for (const id of resignLeadIDs) {
      const t = talent.find(x => x.id === id);
      if (t) hireActor(showID!, t.id, autoResignFee(t, heat), 0, 'lead');
    }
    for (const id of resignSupportingIDs) {
      const t = talent.find(x => x.id === id);
      if (t) hireActor(showID!, t.id, autoResignFee(t, heat), 0, 'supporting');
    }

    router.replace(`/show/${showID}`);
  }

  const directorReturnable = returningDirector ? isReturnable(returningDirector) : false;

  return (
    <SafeAreaView edges={['top']} style={s.container}>
      <LinearGradient colors={['#131829', '#0f1220', '#0a0d18']} style={StyleSheet.absoluteFill} />
      <FilmRibbonAmbient />

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Season Renewal</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Show banner */}
        <View style={s.showBanner}>
          <Text style={s.showTitle}>{show.title}</Text>
          <Text style={s.showMeta}>
            Season {prevSeasonNumber} → Season {newSeasonNumber}
          </Text>
        </View>

        {/* Final season toggle */}
        <TouchableOpacity
          style={[s.finalSeasonCard, isFinalSeason && s.finalSeasonCardOn]}
          onPress={() => setIsFinalSeason(v => !v)}
          activeOpacity={0.85}
        >
          <View style={s.finalSeasonLeft}>
            <Text style={[s.finalSeasonTitle, isFinalSeason && { color: C.amber }]}>
              {isFinalSeason ? '⚑  Series Finale Season' : 'Mark as Final Season'}
            </Text>
            <Text style={s.finalSeasonSub}>
              {isFinalSeason
                ? `Season ${newSeasonNumber} will be the last — show wraps after the finale airs.`
                : "Tap to declare this the show's final season."}
            </Text>
          </View>
          <Switch
            value={isFinalSeason}
            onValueChange={setIsFinalSeason}
            trackColor={{ false: '#2a2d3e', true: C.amber }}
            thumbColor="#ffffff"
            ios_backgroundColor="#2a2d3e"
          />
        </TouchableOpacity>

        {/* Showrunner */}
        <Text style={s.sectionLabel}>SHOWRUNNER</Text>
        {returningShowrunner ? (
          <>
            <TalentReturnCard
              talent={returningShowrunner}
              role="Showrunner"
              selected={resignShowrunner}
              returnable={showrunnerReturnable}
              canSelect={true}
              onToggle={() => setResignShowrunner(v => !v)}
              heatMultiplier={heat}
            />
            {!resignShowrunner && (
              <TouchableOpacity
                style={s.replaceBtn}
                onPress={() => router.push(`/hire-talent?showID=${showID}&role=showrunner`)}
              >
                <Text style={s.replaceBtnText}>Hire New Showrunner →</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <TouchableOpacity
            style={s.replaceBtn}
            onPress={() => router.push(`/hire-talent?showID=${showID}&role=showrunner`)}
          >
            <Text style={s.replaceBtnText}>Hire Showrunner →</Text>
          </TouchableOpacity>
        )}

        {/* Episode count */}
        <Text style={s.sectionLabel}>EPISODE COUNT</Text>
        <View style={s.stepperCard}>
          <TouchableOpacity
            style={[s.stepBtn, episodeCount <= MIN_EPISODES && s.stepBtnDisabled]}
            onPress={() => setEpisodeCount(n => Math.max(MIN_EPISODES, n - 1))}
          >
            <Text style={s.stepBtnText}>−</Text>
          </TouchableOpacity>
          <View style={s.stepDisplay}>
            <Text style={s.stepValue}>{episodeCount}</Text>
            <Text style={s.stepUnit}>episodes</Text>
          </View>
          <TouchableOpacity
            style={[s.stepBtn, episodeCount >= MAX_EPISODES && s.stepBtnDisabled]}
            onPress={() => setEpisodeCount(n => Math.min(MAX_EPISODES, n + 1))}
          >
            <Text style={s.stepBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Director */}
        {returningDirector && (
          <>
            <Text style={s.sectionLabel}>DIRECTOR</Text>
            <TalentReturnCard
              talent={returningDirector}
              role="Director"
              selected={resignDirector}
              returnable={directorReturnable}
              canSelect={true}
              onToggle={() => setResignDirector(v => !v)}
              heatMultiplier={heat}
            />
          </>
        )}

        {/* Lead cast */}
        <Text style={s.sectionLabel}>LEAD CAST SLOTS</Text>
        <View style={s.slotStepper}>
          <TouchableOpacity
            style={[s.stepBtn, leadSlots <= 1 && s.stepBtnDisabled]}
            onPress={() => adjustLeadSlots(-1)}
          >
            <Text style={s.stepBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={s.slotCount}>{leadSlots} slot{leadSlots !== 1 ? 's' : ''}</Text>
          <TouchableOpacity
            style={[s.stepBtn, leadSlots >= 6 && s.stepBtnDisabled]}
            onPress={() => adjustLeadSlots(1)}
          >
            <Text style={s.stepBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {returningLeads.length > 0 && (
          <View style={s.cardGroup}>
            {returningLeads.map(t => (
              <TalentReturnCard
                key={t.id}
                talent={t}
                role="Lead Actor"
                selected={resignLeadIDs.includes(t.id)}
                returnable={isReturnable(t)}
                canSelect={resignLeadIDs.length < leadSlots}
                onToggle={() => toggleLeadResign(t.id)}
                heatMultiplier={heat}
              />
            ))}
          </View>
        )}

        {/* Supporting cast */}
        <Text style={s.sectionLabel}>SUPPORTING CAST SLOTS</Text>
        <View style={s.slotStepper}>
          <TouchableOpacity
            style={[s.stepBtn, supportingSlots <= 1 && s.stepBtnDisabled]}
            onPress={() => adjustSupportingSlots(-1)}
          >
            <Text style={s.stepBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={s.slotCount}>{supportingSlots} slot{supportingSlots !== 1 ? 's' : ''}</Text>
          <TouchableOpacity
            style={[s.stepBtn, supportingSlots >= 8 && s.stepBtnDisabled]}
            onPress={() => adjustSupportingSlots(1)}
          >
            <Text style={s.stepBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {returningSupporting.length > 0 && (
          <View style={s.cardGroup}>
            {returningSupporting.map(t => (
              <TalentReturnCard
                key={t.id}
                talent={t}
                role="Supporting"
                selected={resignSupportingIDs.includes(t.id)}
                returnable={isReturnable(t)}
                canSelect={resignSupportingIDs.length < supportingSlots}
                onToggle={() => toggleSupportingResign(t.id)}
                heatMultiplier={heat}
              />
            ))}
          </View>
        )}

        {/* Cost preview */}
        {totalResignCost > 0 && (
          <View style={s.costCard}>
            <View style={s.costRow}>
              <Text style={s.costLabel}>Re-sign cost</Text>
              <Text style={[s.costValue, !canAfford && { color: C.red }]}>
                {fmt(totalResignCost)}
              </Text>
            </View>
            <View style={s.costRow}>
              <Text style={s.costLabel}>Cash remaining</Text>
              <Text style={[s.costValue, { color: canAfford ? C.green : C.red }]}>
                {fmt(network.cashOnHand - totalResignCost)}
              </Text>
            </View>
            {!canAfford && (
              <Text style={s.costWarning}>Not enough cash — deselect some talent.</Text>
            )}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Footer */}
      <View style={s.footer}>
        <Text style={s.footerNote}>
          Open slots will need to be filled before filming can progress.
        </Text>
        <TouchableOpacity
          style={[s.proceedBtn, !canAfford && s.proceedBtnDisabled]}
          onPress={handleStartPreProduction}
          disabled={!canAfford}
        >
          {canAfford ? (
            <LinearGradient
              colors={['#c49440', '#e6b254']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.proceedBtnGrad}
            >
              <Text style={s.proceedBtnText}>
                {isFinalSeason ? `Start Final Season ${newSeasonNumber} →` : `Start Season ${newSeasonNumber} Pre-Production →`}
              </Text>
            </LinearGradient>
          ) : (
            <View style={s.proceedBtnGrad}>
              <Text style={s.proceedBtnTextDisabled}>
                Start Season {newSeasonNumber} Pre-Production →
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:           { flex: 1, backgroundColor: C.pageBg },
  header:              { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:             { width: 60 },
  backText:            { color: C.gold, fontFamily: 'Manrope_600SemiBold', fontSize: 15 },
  headerTitle:         { color: C.text, fontFamily: 'BebasNeue_400Regular', fontSize: 22, letterSpacing: 0.5 },
  scroll:              { flex: 1 },
  scrollContent:       { padding: 16 },

  showBanner:          { backgroundColor: C.cardBg, borderRadius: 12, borderWidth: 1, borderColor: C.gold + '44', padding: 14, marginBottom: 20 },
  showTitle:           { color: C.text, fontFamily: 'Manrope_700Bold', fontSize: 18, marginBottom: 3 },
  showMeta:            { color: C.gold, fontFamily: 'Manrope_600SemiBold', fontSize: 13 },

  sectionLabel:        { color: C.muted, fontFamily: 'Manrope_700Bold', fontSize: 11, letterSpacing: 1.5, marginBottom: 10, marginTop: 20 },
  emptyHint:           { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 13, marginBottom: 8 },

  cardGroup:           { gap: 8, marginTop: 8 },

  talentCard:          { backgroundColor: C.cardBg, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, flexDirection: 'row', alignItems: 'center' },
  talentCardSelected:  { borderColor: C.green + '88' },
  talentCardAuto:      { borderColor: C.gold + '44' },
  talentCardBusy:      { opacity: 0.55 },
  talentLeft:          { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarWrap:          { width: 44, height: 52, borderRadius: 8, overflow: 'hidden' },
  avatarThumb:         { width: 44, height: 52 },
  chemPip:             { position: 'absolute', bottom: 3, right: 3, width: 9, height: 9, borderRadius: 5, borderWidth: 1.5, borderColor: C.cardBg },
  talentName:          { color: C.text, fontFamily: 'Manrope_600SemiBold', fontSize: 14, marginBottom: 2 },
  talentMeta:          { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 12 },
  talentFee:           { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 12, marginTop: 2 },
  talentRight:         { marginLeft: 12 },

  busyBadge:           { backgroundColor: C.red + '22', borderWidth: 1, borderColor: C.red + '66', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  busyText:            { color: C.red, fontFamily: 'Manrope_600SemiBold', fontSize: 12 },

  toggleBtn:           { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1 },
  toggleBtnOn:         { backgroundColor: C.green + '22', borderColor: C.green },
  toggleBtnOff:        { backgroundColor: C.cardBg, borderColor: C.border },
  toggleBtnAuto:       { backgroundColor: C.goldDim, borderColor: C.gold + '55' },
  toggleBtnDisabled:   { opacity: 0.35 },
  toggleBtnText:       { fontFamily: 'Manrope_700Bold', fontSize: 12 },
  toggleBtnTextOn:     { color: C.green },
  toggleBtnTextOff:    { color: C.muted },
  toggleBtnTextAuto:   { color: C.gold },

  stepperCard:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, backgroundColor: C.cardBg, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 16 },
  slotStepper:         { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: C.cardBg, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 12, paddingHorizontal: 16 },
  stepBtn:             { width: 40, height: 40, borderRadius: 10, backgroundColor: C.pageBg, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  stepBtnDisabled:     { opacity: 0.3 },
  stepBtnText:         { color: C.text, fontSize: 22, lineHeight: 26 },
  stepDisplay:         { alignItems: 'center', minWidth: 80 },
  stepValue:           { color: C.text, fontFamily: 'BebasNeue_400Regular', fontSize: 40, letterSpacing: 0.5, lineHeight: 46 },
  stepUnit:            { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 12 },
  slotCount:           { flex: 1, color: C.text, fontFamily: 'Manrope_700Bold', fontSize: 18, textAlign: 'center' },

  replaceBtn:          { marginTop: 8, borderRadius: 10, borderWidth: 1, borderColor: C.gold + '55', backgroundColor: C.goldDim, padding: 12, alignItems: 'center' },
  replaceBtnText:      { color: C.gold, fontFamily: 'Manrope_700Bold', fontSize: 13 },

  costCard:            { backgroundColor: C.cardBg, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, marginTop: 20, gap: 4 },
  costRow:             { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  costLabel:           { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 14 },
  costValue:           { color: C.text, fontFamily: 'Manrope_700Bold', fontSize: 14 },
  costWarning:         { color: C.red, fontFamily: 'Manrope_600SemiBold', fontSize: 13, marginTop: 4 },

  footer:              { padding: 16, borderTopWidth: 1, borderTopColor: C.border, gap: 8 },
  footerNote:          { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 12, textAlign: 'center' },
  proceedBtn:          { borderRadius: 14 },
  proceedBtnDisabled:  { backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.border, borderRadius: 14 },
  proceedBtnGrad:      { padding: 16, alignItems: 'center', borderRadius: 14 },
  proceedBtnText:      { color: C.goldBtnText, fontFamily: 'Manrope_800ExtraBold', fontSize: 15 },
  proceedBtnTextDisabled: { color: C.muted, fontFamily: 'Manrope_600SemiBold', fontSize: 15 },

  finalSeasonCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardBg, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 20, gap: 12 },
  finalSeasonCardOn:     { borderColor: C.amber + '88', backgroundColor: C.amber + '12' },
  finalSeasonLeft:       { flex: 1 },
  finalSeasonTitle:      { color: C.text, fontFamily: 'Manrope_700Bold', fontSize: 14, marginBottom: 3 },
  finalSeasonSub:        { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 12, lineHeight: 17 },
});