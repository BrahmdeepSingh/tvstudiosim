import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';
import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGameStore } from '../src/store/gameStore';
import { Talent } from '../src/types';
import { TALENT_FEES, MIN_EPISODES, MAX_EPISODES } from '../src/constants/game';

const C = {
  bg: '#0f0f17', card: '#16161f', border: '#1e1e2e',
  text: '#e8e8f0', muted: '#6b6b82', accent: '#7c6af7',
  green: '#4caf82', red: '#e85d5d', amber: '#f5a623', purple: '#9b59b6',
};

const CHEM_COLORS = { green: C.green, blue: '#5b8dee', red: C.red };

function fmt(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs}`;
}

function autoResignFee(t: Talent): number {
  const tier = t.popularity < 40 ? 'low' : t.popularity < 70 ? 'mid' : 'high';
  const range = t.role === 'actor' ? TALENT_FEES.actor[tier] : TALENT_FEES[t.role][tier];
  return Math.round((range[0] + range[1]) / 2 / 50_000) * 50_000;
}

function isReturnable(t: Talent): boolean {
  // Talent is free to re-sign if available (freed when filming wrapped) or still held by this show
  return t.available;
}

function TalentReturnCard({
  talent,
  role,
  selected,
  returnable,
  canSelect,
  onToggle,
}: {
  talent: Talent;
  role: string;
  selected: boolean;
  returnable: boolean;
  canSelect: boolean;
  onToggle: () => void;
}) {
  const chemColor = CHEM_COLORS[talent.chemistryColor];
  const fee = autoResignFee(talent);

  let primaryStat = 0;
  let primaryLabel = '';
  if (talent.stats.role === 'showrunner') { primaryStat = talent.stats.writing; primaryLabel = 'Writing'; }
  else if (talent.stats.role === 'director') { primaryStat = talent.stats.direction; primaryLabel = 'Direction'; }
  else { primaryStat = talent.stats.acting; primaryLabel = 'Acting'; }

  return (
    <View style={[s.talentCard, selected && s.talentCardSelected, !returnable && s.talentCardBusy]}>
      <View style={s.talentLeft}>
        <View style={[s.chemDot, { backgroundColor: chemColor }]} />
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

  // All hooks must come before any conditional return (React rules of hooks)
  const [episodeCount, setEpisodeCount] = useState(prevSeason?.episodeCount ?? 10);
  const [leadSlots, setLeadSlots] = useState(prevSeason?.leadActorSlots ?? 2);
  const [supportingSlots, setSupportingSlots] = useState(prevSeason?.supportingActorSlots ?? 2);
  const [resignDirector, setResignDirector] = useState(false);
  const [resignLeadIDs, setResignLeadIDs] = useState<string[]>([]);
  const [resignSupportingIDs, setResignSupportingIDs] = useState<string[]>([]);

  if (!show || !prevSeason || show.status !== 'renewal-pending') {
    return (
      <SafeAreaView style={s.container}>
        <Text style={{ color: C.muted, padding: 32 }}>Show not available for renewal.</Text>
      </SafeAreaView>
    );
  }

  const prevSeasonNumber = prevSeason.seasonNumber;
  const newSeasonNumber = prevSeasonNumber + 1;

  // Returning talent from prev season
  const returningShowrunner = talent.find(t => t.id === prevSeason.showrunnerID) ?? null;
  const returningDirector   = prevSeason.directorID ? talent.find(t => t.id === prevSeason.directorID) ?? null : null;
  const returningLeads      = prevSeason.leadActorIDs.map(id => talent.find(t => t.id === id)).filter(Boolean) as Talent[];
  const returningSupporting = prevSeason.supportingActorIDs.map(id => talent.find(t => t.id === id)).filter(Boolean) as Talent[];

  function toggleLeadResign(id: string) {
    setResignLeadIDs(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= leadSlots) return prev; // can't exceed slot count
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
    // Drop trailing re-signs if they exceed new slot count
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

  // Cost preview
  const directorFee    = resignDirector && returningDirector ? autoResignFee(returningDirector) : 0;
  const leadFees       = resignLeadIDs.reduce((sum, id) => {
    const t = talent.find(x => x.id === id);
    return sum + (t ? autoResignFee(t) : 0);
  }, 0);
  const supportingFees = resignSupportingIDs.reduce((sum, id) => {
    const t = talent.find(x => x.id === id);
    return sum + (t ? autoResignFee(t) : 0);
  }, 0);
  const totalResignCost = directorFee + leadFees + supportingFees;
  const canAfford = network.cashOnHand >= totalResignCost;

  function handleStartPreProduction() {
    // 1. Create new season (frees prev cast, applies slot counts)
    renewShow(showID!, episodeCount, leadSlots, supportingSlots);

    // 2. Re-sign selected talent (they're now free after renewShow)
    if (resignDirector && returningDirector) {
      hireDirector(showID!, returningDirector.id, autoResignFee(returningDirector), 0);
    }
    for (const id of resignLeadIDs) {
      const t = talent.find(x => x.id === id);
      if (t) hireActor(showID!, t.id, autoResignFee(t), 0, 'lead');
    }
    for (const id of resignSupportingIDs) {
      const t = talent.find(x => x.id === id);
      if (t) hireActor(showID!, t.id, autoResignFee(t), 0, 'supporting');
    }

    // 3. Navigate back to show detail
    router.replace(`/show/${showID}`);
  }

  const directorReturnable = returningDirector ? isReturnable(returningDirector) : false;

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Season Renewal</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>

        {/* Show banner */}
        <View style={s.showBanner}>
          <Text style={s.showTitle}>{show.title}</Text>
          <Text style={s.showMeta}>
            Season {prevSeasonNumber} → Season {newSeasonNumber}
          </Text>
        </View>

        {/* Showrunner — always returns */}
        <Text style={s.sectionLabel}>SHOWRUNNER</Text>
        {returningShowrunner ? (
          <View style={[s.talentCard, s.talentCardAuto]}>
            <View style={s.talentLeft}>
              <View style={[s.chemDot, { backgroundColor: CHEM_COLORS[returningShowrunner.chemistryColor] }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.talentName}>{returningShowrunner.name}</Text>
                <Text style={s.talentMeta}>Showrunner · Returning automatically</Text>
              </View>
            </View>
            <View style={[s.toggleBtn, s.toggleBtnAuto]}>
              <Text style={[s.toggleBtnText, s.toggleBtnTextAuto]}>Locked In</Text>
            </View>
          </View>
        ) : (
          <Text style={s.emptyHint}>No showrunner data.</Text>
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
          <Text style={[s.proceedBtnText, !canAfford && s.proceedBtnTextDisabled]}>
            Start Season {newSeasonNumber} Pre-Production →
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:          { flex: 1, backgroundColor: C.bg },
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:            { width: 60 },
  backText:           { color: C.accent, fontSize: 15 },
  headerTitle:        { color: C.text, fontSize: 17, fontWeight: '600' },
  scroll:             { flex: 1 },
  scrollContent:      { padding: 16 },

  showBanner:         { backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.accent + '55', padding: 14, marginBottom: 20 },
  showTitle:          { color: C.text, fontSize: 18, fontWeight: '700', marginBottom: 3 },
  showMeta:           { color: C.accent, fontSize: 13 },

  sectionLabel:       { color: C.muted, fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 10, marginTop: 20 },
  emptyHint:          { color: C.muted, fontSize: 13, marginBottom: 8 },

  cardGroup:          { gap: 8, marginTop: 8 },

  talentCard:         { backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 14, flexDirection: 'row', alignItems: 'center' },
  talentCardSelected: { borderColor: C.green + '88' },
  talentCardAuto:     { borderColor: C.accent + '44' },
  talentCardBusy:     { opacity: 0.55 },
  talentLeft:         { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  chemDot:            { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  talentName:         { color: C.text, fontSize: 14, fontWeight: '500', marginBottom: 2 },
  talentMeta:         { color: C.muted, fontSize: 12 },
  talentFee:          { color: C.muted, fontSize: 12, marginTop: 2 },
  talentRight:        { marginLeft: 12 },

  busyBadge:          { backgroundColor: C.red + '22', borderWidth: 1, borderColor: C.red + '66', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  busyText:           { color: C.red, fontSize: 12, fontWeight: '500' },

  toggleBtn:          { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1 },
  toggleBtnOn:        { backgroundColor: C.green + '22', borderColor: C.green },
  toggleBtnOff:       { backgroundColor: C.card, borderColor: C.border },
  toggleBtnAuto:      { backgroundColor: C.accent + '18', borderColor: C.accent + '55' },
  toggleBtnDisabled:  { opacity: 0.35 },
  toggleBtnText:      { fontSize: 12, fontWeight: '600' },
  toggleBtnTextOn:    { color: C.green },
  toggleBtnTextOff:   { color: C.muted },
  toggleBtnTextAuto:  { color: C.accent },

  stepperCard:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 16 },
  slotStepper:        { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 12, paddingHorizontal: 16 },
  stepBtn:            { width: 40, height: 40, borderRadius: 10, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  stepBtnDisabled:    { opacity: 0.3 },
  stepBtnText:        { color: C.text, fontSize: 22, lineHeight: 26 },
  stepDisplay:        { alignItems: 'center', minWidth: 80 },
  stepValue:          { color: C.text, fontSize: 36, fontWeight: '700', lineHeight: 42 },
  stepUnit:           { color: C.muted, fontSize: 12 },
  slotCount:          { flex: 1, color: C.text, fontSize: 18, fontWeight: '600', textAlign: 'center' },

  costCard:           { backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 14, marginTop: 20, gap: 4 },
  costRow:            { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  costLabel:          { color: C.muted, fontSize: 14 },
  costValue:          { color: C.text, fontSize: 14, fontWeight: '600' },
  costWarning:        { color: C.red, fontSize: 13, marginTop: 4 },

  footer:             { padding: 16, borderTopWidth: 1, borderTopColor: C.border, gap: 8 },
  footerNote:         { color: C.muted, fontSize: 12, textAlign: 'center' },
  proceedBtn:         { backgroundColor: C.accent, borderRadius: 12, padding: 16, alignItems: 'center' },
  proceedBtnDisabled: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  proceedBtnText:     { color: '#fff', fontSize: 15, fontWeight: '600' },
  proceedBtnTextDisabled: { color: C.muted },
});