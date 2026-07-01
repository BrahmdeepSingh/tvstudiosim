import {
  View, Text, TextInput, TouchableOpacity, ScrollView, FlatList,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { useState, useMemo } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGameStore } from '../src/store/gameStore';
import { Talent, TalentRole } from '../src/types';
import { TALENT_FEES } from '../src/constants/game';

const C = {
  bg: '#0f0f17', card: '#16161f', border: '#1e1e2e',
  text: '#e8e8f0', muted: '#6b6b82', accent: '#7c6af7',
  green: '#4caf82', red: '#e85d5d', amber: '#f5a623',
};

const CHEM_COLORS = {
  green: '#4caf82',
  blue:  '#5b8dee',
  red:   '#e85d5d',
};

const ROLE_LABELS: Record<TalentRole, string> = {
  showrunner: 'Showrunner',
  director:   'Director',
  actor:      'Actor',
};

const ROLE_STAT_LABEL: Record<TalentRole, string> = {
  showrunner: 'Writing',
  director:   'Direction',
  actor:      'Acting',
};

function getPrimaryStatValue(talent: Talent): number {
  if (talent.stats.role === 'showrunner') return talent.stats.writing;
  if (talent.stats.role === 'director') return talent.stats.direction;
  if (talent.stats.role === 'actor') return talent.stats.acting;
  return 0;
}

function getSecondaryStats(talent: Talent): { label: string; value: number }[] {
  if (talent.stats.role === 'showrunner') return [
    { label: 'Creativity',  value: talent.stats.creativity },
    { label: 'Consistency', value: talent.stats.consistency },
  ];
  if (talent.stats.role === 'director') return [
    { label: 'Vision',     value: talent.stats.vision },
    { label: 'Efficiency', value: talent.stats.efficiency },
  ];
  if (talent.stats.role === 'actor') return [
    { label: 'Chemistry', value: talent.stats.chemistry },
    { label: 'Popularity', value: talent.popularity },
  ];
  return [];
}

function popularityLabel(p: number): string {
  if (p < 30)  return 'Unknown';
  if (p < 50)  return 'Emerging';
  if (p < 70)  return 'Established';
  if (p < 85)  return 'Well-Known';
  return 'Star';
}

function feeHint(role: TalentRole, popularity: number): string {
  const tier = popularity < 40 ? 'low' : popularity < 70 ? 'mid' : 'high';
  const range = role === 'actor' ? TALENT_FEES.actor[tier] : TALENT_FEES[role][tier];
  const lo = (range[0] / 1_000_000).toFixed(1);
  const hi = (range[1] / 1_000_000).toFixed(1);
  return `$${lo}M – $${hi}M`;
}

function StatBar({ value, label }: { value: number; label: string }) {
  return (
    <View style={s.statBarRow}>
      <Text style={s.statBarLabel}>{label}</Text>
      <View style={s.statBarTrack}>
        <View style={[s.statBarFill, { width: `${value}%` }]} />
      </View>
      <Text style={s.statBarValue}>{value}</Text>
    </View>
  );
}

function TalentCard({
  talent,
  onSelect,
}: {
  talent: Talent;
  onSelect: (t: Talent) => void;
}) {
  const primary = getPrimaryStatValue(talent);

  return (
    <TouchableOpacity style={s.talentCard} onPress={() => onSelect(talent)}>
      <View style={s.talentCardLeft}>
        <View style={[s.chemDot, { backgroundColor: CHEM_COLORS[talent.chemistryColor] }]} />
        <View style={{ flex: 1 }}>
          <Text style={s.talentName}>{talent.name}</Text>
          <Text style={s.talentMeta}>
            {popularityLabel(talent.popularity)} · Chemistry {talent.chemistryColor.charAt(0).toUpperCase() + talent.chemistryColor.slice(1)}
          </Text>
        </View>
      </View>
      <View style={s.talentCardRight}>
        <Text style={s.talentStat}>{primary}</Text>
        <Text style={s.talentStatLabel}>{ROLE_STAT_LABEL[talent.role]}</Text>
      </View>
    </TouchableOpacity>
  );
}

type OfferStatus = 'idle' | 'accepted' | 'rejected';

function OfferModal({
  talent,
  showID,
  role,
  actorType,
  onSuccess,
  onClose,
}: {
  talent: Talent;
  showID: string;
  role: TalentRole;
  actorType: 'lead' | 'supporting';
  onSuccess: () => void;
  onClose: () => void;
}) {
  const { network, hireShowrunner, hireDirector, hireActor, evaluateOffer } = useGameStore();
  const [offerText, setOfferText] = useState('');
  const [status, setStatus] = useState<OfferStatus>('idle');
  const [lastRejected, setLastRejected] = useState(false);

  const cashOnHand = network.cashOnHand;
  const offered = parseFloat(offerText.replace(/,/g, '')) * 1_000_000;
  const validOffer = !isNaN(offered) && offered > 0 && offered <= cashOnHand;

  function handleOffer() {
    if (!validOffer) return;
    const accepted = evaluateOffer(talent.id, offered, network.prestige, actorType);

    if (accepted) {
      let success = false;
      if (role === 'showrunner') success = hireShowrunner(showID, talent.id, offered, 0);
      else if (role === 'director') success = hireDirector(showID, talent.id, offered, 0);
      else success = hireActor(showID, talent.id, offered, 0, actorType);

      if (success) {
        setStatus('accepted');
        setTimeout(onSuccess, 1200);
      }
    } else {
      setStatus('rejected');
      setLastRejected(true);
      setTimeout(() => setStatus('idle'), 1500);
    }
  }

  const secondary = getSecondaryStats(talent);

  return (
    <View style={s.modalOverlay}>
      <View style={s.modalCard}>
        {/* Talent header */}
        <View style={s.modalHeader}>
          <View style={[s.modalChemBadge, { backgroundColor: CHEM_COLORS[talent.chemistryColor] + '33', borderColor: CHEM_COLORS[talent.chemistryColor] }]}>
            <Text style={[s.modalChemText, { color: CHEM_COLORS[talent.chemistryColor] }]}>
              {talent.chemistryColor.charAt(0).toUpperCase() + talent.chemistryColor.slice(1)}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={s.modalClose}>
            <Text style={s.modalCloseText}>✕</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.modalName}>{talent.name}</Text>
        <Text style={s.modalRole}>{ROLE_LABELS[role]} · {popularityLabel(talent.popularity)}</Text>

        {/* Stats */}
        <View style={s.statsBlock}>
          <StatBar value={getPrimaryStatValue(talent)} label={ROLE_STAT_LABEL[role]} />
          {secondary.map(st => (
            <StatBar key={st.label} value={st.value} label={st.label} />
          ))}
        </View>

        {/* Offer input */}
        {status === 'accepted' ? (
          <View style={s.acceptedBanner}>
            <Text style={s.acceptedText}>✓ Deal signed — ${(offered / 1_000_000).toFixed(2)}M</Text>
          </View>
        ) : (
          <>
            <Text style={s.offerLabel}>MAKE AN OFFER (millions)</Text>
            {lastRejected && (
              <Text style={s.rejectedHint}>Not interested. Try a higher offer.</Text>
            )}
            <View style={s.offerRow}>
              <Text style={s.dollarSign}>$</Text>
              <TextInput
                style={s.offerInput}
                value={offerText}
                onChangeText={setOfferText}
                placeholder="0.00"
                placeholderTextColor={C.muted}
                keyboardType="decimal-pad"
              />
              <Text style={s.millionLabel}>M</Text>
            </View>
            <Text style={s.cashAvail}>
              Available: ${(cashOnHand / 1_000_000).toFixed(1)}M
            </Text>

            {status === 'rejected' ? (
              <View style={s.rejectedBanner}>
                <Text style={s.rejectedText}>✗ Offer rejected</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[s.offerBtn, !validOffer && s.offerBtnDisabled]}
                onPress={handleOffer}
                disabled={!validOffer}
              >
                <Text style={[s.offerBtnText, !validOffer && s.offerBtnTextDisabled]}>
                  Make Offer
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
}

export default function HireTalentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ showID: string; role: TalentRole; actorType?: string; talentID?: string }>();
  const showID = params.showID ?? '';
  const role: TalentRole = (params.role as TalentRole) ?? 'showrunner';
  const actorType: 'lead' | 'supporting' =
    params.actorType === 'supporting' ? 'supporting' : 'lead';

  const { talent, network, shows } = useGameStore();
  const [searchQuery, setSearchQuery] = useState('');

  // Pre-select talent if navigated here from talent modal (initial mount only)
  const preselected = params.talentID ? talent.find(t => t.id === params.talentID) ?? null : null;
  const [selectedTalent, setSelectedTalent] = useState<Talent | null>(preselected);

  const show = shows.find(s => s.id === showID);
  const season = show?.seasons[show.currentSeasonIndex];

  const available = useMemo(() => {
    return talent.filter(t =>
      t.role === role &&
      t.available &&
      (searchQuery === '' || t.name.toLowerCase().includes(searchQuery.toLowerCase()))
    ).sort((a, b) => b.popularity - a.popularity);
  }, [talent, role, searchQuery]);

  // For actors: current count and max for the active slot type
  const filledLeads = season?.leadActorIDs.length ?? 0;
  const filledSupporting = season?.supportingActorIDs.length ?? 0;
  const leadSlots = season?.leadActorSlots ?? 0;
  const supportingSlots = season?.supportingActorSlots ?? 0;
  const filledCount = actorType === 'lead' ? filledLeads : filledSupporting;
  const totalSlots = actorType === 'lead' ? leadSlots : supportingSlots;
  const slotsRemaining = totalSlots - filledCount;

  function handleSuccess() {
    setSelectedTalent(null);
    // After last slot for this type is filled, go back; otherwise stay
    const newFilled = filledCount + 1;
    if (role === 'showrunner') {
      router.replace('/(tabs)/');
    } else if (role === 'actor' && newFilled >= totalSlots) {
      router.back();
    } else {
      setSelectedTalent(null); // stay to hire more
    }
  }

  const roleTitle = {
    showrunner: 'Hire Showrunner',
    director:   'Hire Director',
    actor:      actorType === 'lead' ? 'Hire Lead Actor' : 'Hire Supporting Actor',
  }[role];

  const roleDesc = {
    showrunner: 'The showrunner runs your writers room and sets the creative direction.',
    director:   'The director shapes the look and feel of the production.',
    actor:      actorType === 'lead'
      ? 'Lead actors drive the Emmy race and audience investment. Chemistry color matters most here.'
      : 'Supporting actors round out your cast. Same chemistry color as leads boosts quality.',
  }[role];

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>{roleTitle}</Text>
        <View style={{ width: 60 }} />
      </View>

      {show && (
        <View style={s.showBanner}>
          <Text style={s.showBannerText}>
            {show.title} · <Text style={{ color: C.muted }}>{show.genre}</Text>
          </Text>
          {role === 'actor' && season && (
            <Text style={s.slotCount}>
              {actorType === 'lead' ? 'Lead' : 'Supporting'}: {filledCount}/{totalSlots} filled
              {slotsRemaining > 0 ? ` · ${slotsRemaining} slot${slotsRemaining > 1 ? 's' : ''} remaining` : ' · All filled'}
            </Text>
          )}
        </View>
      )}

      <View style={s.descRow}>
        <Text style={s.descText}>{roleDesc}</Text>
      </View>

      <View style={s.searchRow}>
        <TextInput
          style={s.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by name..."
          placeholderTextColor={C.muted}
        />
      </View>

      {available.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={s.emptyText}>No available {role}s match your search.</Text>
        </View>
      ) : (
        <FlatList
          data={available}
          keyExtractor={t => t.id}
          renderItem={({ item }) => (
            <TalentCard talent={item} onSelect={setSelectedTalent} />
          )}
          contentContainerStyle={{ padding: 16, gap: 8 }}
        />
      )}

      {/* Done button for actors */}
      {role === 'actor' && season && filledCount > 0 && (
        <View style={s.footer}>
          <Text style={s.castCount}>
            {actorType === 'lead' ? 'Lead' : 'Supporting'}: {filledCount}/{totalSlots} hired
          </Text>
          <TouchableOpacity style={s.doneBtn} onPress={() => router.back()}>
            <Text style={s.doneBtnText}>Done →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Offer modal */}
      {selectedTalent && (
        <Modal transparent animationType="fade">
          <OfferModal
            talent={selectedTalent}
            showID={showID}
            role={role}
            actorType={actorType}
            onSuccess={handleSuccess}
            onClose={() => setSelectedTalent(null)}
          />
        </Modal>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: C.bg },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:       { width: 60 },
  backText:      { color: C.accent, fontSize: 15 },
  headerTitle:   { color: C.text, fontSize: 17, fontWeight: '600' },

  showBanner:    { backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border, paddingHorizontal: 16, paddingVertical: 10 },
  showBannerText:{ color: C.text, fontSize: 14, fontWeight: '500' },
  slotCount:     { color: C.accent, fontSize: 12, marginTop: 4 },

  descRow:       { paddingHorizontal: 16, paddingVertical: 12 },
  descText:      { color: C.muted, fontSize: 13, lineHeight: 19 },

  searchRow:     { paddingHorizontal: 16, paddingBottom: 8 },
  searchInput:   { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: C.text, fontSize: 15 },

  talentCard:    { backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 14, flexDirection: 'row', alignItems: 'center' },
  talentCardLeft:{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  chemDot:       { width: 12, height: 12, borderRadius: 6 },
  talentName:    { color: C.text, fontSize: 15, fontWeight: '500' },
  talentMeta:    { color: C.muted, fontSize: 12, marginTop: 2 },
  talentCardRight:{ alignItems: 'flex-end' },
  talentStat:    { color: C.text, fontSize: 22, fontWeight: '700' },
  talentStatLabel:{ color: C.muted, fontSize: 11 },

  emptyState:    { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText:     { color: C.muted, fontSize: 15, textAlign: 'center' },
  emptyHint:     { color: C.muted, fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 19 },

  footer:        { padding: 16, borderTopWidth: 1, borderTopColor: C.border, gap: 8 },
  castCount:     { color: C.muted, fontSize: 13, textAlign: 'center' },
  doneBtn:       { backgroundColor: C.accent, borderRadius: 12, padding: 16, alignItems: 'center' },
  doneBtnText:   { color: '#fff', fontSize: 16, fontWeight: '600' },

  // Modal
  modalOverlay:  { flex: 1, backgroundColor: '#000000bb', justifyContent: 'flex-end' },
  modalCard:     { backgroundColor: '#1a1a26', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderColor: C.border, padding: 24 },
  modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalChemBadge:{ borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  modalChemText: { fontSize: 12, fontWeight: '600' },
  modalClose:    { padding: 4 },
  modalCloseText:{ color: C.muted, fontSize: 18 },
  modalName:     { color: C.text, fontSize: 22, fontWeight: '700', marginBottom: 4 },
  modalRole:     { color: C.muted, fontSize: 14, marginBottom: 20 },

  statsBlock:    { gap: 10, marginBottom: 24 },
  statBarRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statBarLabel:  { color: C.muted, fontSize: 12, width: 80 },
  statBarTrack:  { flex: 1, height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
  statBarFill:   { height: '100%', backgroundColor: C.accent, borderRadius: 3 },
  statBarValue:  { color: C.text, fontSize: 13, width: 28, textAlign: 'right' },

  offerLabel:    { color: C.muted, fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 8 },
  rejectedHint:  { color: C.amber, fontSize: 12, marginBottom: 10 },
  offerRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, marginBottom: 8 },
  dollarSign:    { color: C.muted, fontSize: 20, marginRight: 4 },
  offerInput:    { flex: 1, color: C.text, fontSize: 24, fontWeight: '600', paddingVertical: 14 },
  millionLabel:  { color: C.muted, fontSize: 18 },
  cashAvail:     { color: C.muted, fontSize: 12, marginBottom: 16 },

  offerBtn:      { backgroundColor: C.accent, borderRadius: 12, padding: 16, alignItems: 'center' },
  offerBtnDisabled:{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  offerBtnText:  { color: '#fff', fontSize: 16, fontWeight: '600' },
  offerBtnTextDisabled: { color: C.muted },

  acceptedBanner:{ backgroundColor: '#1e3a2f', borderRadius: 10, padding: 16, alignItems: 'center' },
  acceptedText:  { color: C.green, fontSize: 16, fontWeight: '600' },
  rejectedBanner:{ backgroundColor: '#3a1e1e', borderRadius: 10, padding: 16, alignItems: 'center' },
  rejectedText:  { color: C.red, fontSize: 16, fontWeight: '600' },
});