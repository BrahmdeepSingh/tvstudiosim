import {
  View, Text, TextInput, TouchableOpacity, ScrollView, FlatList,
  StyleSheet, SafeAreaView, Image,
} from 'react-native';
import { useState, useMemo } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useGameStore } from '../src/store/gameStore';
import { Talent, TalentRole } from '../src/types';
import { TALENT_FEES } from '../src/constants/game';
import { AVATAR_MAP } from '../src/utils/avatars';

const C = {
  pageBg: '#0f1220', cardBg: '#191c2a', cardBg2: '#1d2035',
  border: '#252840',
  text: '#f0ede8', muted: '#9a958e',
  gold: '#e6b254', goldDim: '#e6b25420', goldBtnText: '#161008',
  green: '#4ec46e', greenBg: '#1a3325', amber: '#d4753a', red: '#c43820', redBg: '#2a130f',
};

const CHEM_COLORS = {
  green: '#4ec46e',
  blue:  '#5b8dee',
  red:   '#c43820',
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

function StatBar({ value, label }: { value: number; label: string }) {
  return (
    <View style={s.statBarRow}>
      <Text style={s.statBarLabel}>{label}</Text>
      <View style={s.statBarTrack}>
        <LinearGradient
          colors={['#c49440', '#e6b254']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[s.statBarFill, { width: `${value}%` as any }]}
        />
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
        <View style={s.avatarWrap}>
          <Image source={AVATAR_MAP[talent.avatarId]} style={s.avatarThumb} />
          <View style={[s.chemPip, { backgroundColor: CHEM_COLORS[talent.chemistryColor] }]} />
        </View>
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

        <View style={s.statsBlock}>
          <StatBar value={getPrimaryStatValue(talent)} label={ROLE_STAT_LABEL[role]} />
          {secondary.map(st => (
            <StatBar key={st.label} value={st.value} label={st.label} />
          ))}
        </View>

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
                {validOffer ? (
                  <LinearGradient
                    colors={['#c49440', '#e6b254']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.offerBtnGrad}
                  >
                    <Text style={s.offerBtnText}>Make Offer</Text>
                  </LinearGradient>
                ) : (
                  <View style={s.offerBtnGrad}>
                    <Text style={s.offerBtnTextDisabled}>Make Offer</Text>
                  </View>
                )}
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

  const filledLeads = season?.leadActorIDs.length ?? 0;
  const filledSupporting = season?.supportingActorIDs.length ?? 0;
  const leadSlots = season?.leadActorSlots ?? 0;
  const supportingSlots = season?.supportingActorSlots ?? 0;
  const filledCount = actorType === 'lead' ? filledLeads : filledSupporting;
  const totalSlots = actorType === 'lead' ? leadSlots : supportingSlots;
  const slotsRemaining = totalSlots - filledCount;

  function handleSuccess() {
    setSelectedTalent(null);
    const newFilled = filledCount + 1;
    if (role === 'showrunner') {
      router.replace('/(tabs)/');
    } else if (role === 'actor' && newFilled >= totalSlots) {
      router.back();
    } else {
      setSelectedTalent(null);
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
      <LinearGradient colors={['#131829', '#0f1220', '#0a0d18']} style={StyleSheet.absoluteFill} />
      <FilmRibbonAmbient />

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

      {role === 'actor' && season && filledCount > 0 && (
        <View style={s.footer}>
          <Text style={s.castCount}>
            {actorType === 'lead' ? 'Lead' : 'Supporting'}: {filledCount}/{totalSlots} hired
          </Text>
          <TouchableOpacity style={s.doneBtn} onPress={() => router.back()}>
            <LinearGradient
              colors={['#c49440', '#e6b254']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.doneBtnGrad}
            >
              <Text style={s.doneBtnText}>Done →</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {selectedTalent && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 50 }]} pointerEvents="box-none">
          <OfferModal
            talent={selectedTalent}
            showID={showID}
            role={role}
            actorType={actorType}
            onSuccess={handleSuccess}
            onClose={() => setSelectedTalent(null)}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: C.pageBg },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:        { width: 60 },
  backText:       { color: C.gold, fontFamily: 'Manrope_600SemiBold', fontSize: 15 },
  headerTitle:    { color: C.text, fontFamily: 'BebasNeue_400Regular', fontSize: 22, letterSpacing: 0.5 },

  showBanner:     { backgroundColor: C.cardBg, borderBottomWidth: 1, borderBottomColor: C.border, paddingHorizontal: 16, paddingVertical: 10 },
  showBannerText: { color: C.text, fontFamily: 'Manrope_700Bold', fontSize: 14 },
  slotCount:      { color: C.gold, fontFamily: 'Manrope_600SemiBold', fontSize: 12, marginTop: 4 },

  descRow:        { paddingHorizontal: 16, paddingVertical: 12 },
  descText:       { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19 },

  searchRow:      { paddingHorizontal: 16, paddingBottom: 8 },
  searchInput:    { backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: C.text, fontFamily: 'Manrope_400Regular', fontSize: 15 },

  talentCard:       { backgroundColor: C.cardBg, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, flexDirection: 'row', alignItems: 'center' },
  talentCardLeft:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarWrap:       { width: 44, height: 52, borderRadius: 8, overflow: 'hidden' },
  avatarThumb:      { width: 44, height: 52 },
  chemPip:          { position: 'absolute', bottom: 3, right: 3, width: 9, height: 9, borderRadius: 5, borderWidth: 1.5, borderColor: C.cardBg },
  talentName:       { color: C.text, fontFamily: 'Manrope_600SemiBold', fontSize: 15 },
  talentMeta:     { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 12, marginTop: 2 },
  talentCardRight:{ alignItems: 'flex-end' },
  talentStat:     { color: C.text, fontFamily: 'BebasNeue_400Regular', fontSize: 28, letterSpacing: 0.5 },
  talentStatLabel:{ color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 11 },

  emptyState:     { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText:      { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 15, textAlign: 'center' },

  footer:         { padding: 16, borderTopWidth: 1, borderTopColor: C.border, gap: 8 },
  castCount:      { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 13, textAlign: 'center' },
  doneBtn:        { borderRadius: 14, overflow: 'hidden' },
  doneBtnGrad:    { padding: 16, alignItems: 'center' },
  doneBtnText:    { color: C.goldBtnText, fontFamily: 'Manrope_800ExtraBold', fontSize: 16 },

  // Modal
  modalOverlay:   { flex: 1, backgroundColor: '#000000cc', justifyContent: 'flex-end' },
  modalCard:      { backgroundColor: '#16192a', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderColor: C.border, padding: 24, maxHeight: '88%' },
  modalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalChemBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  modalChemText:  { fontFamily: 'Manrope_700Bold', fontSize: 12 },
  modalClose:     { padding: 4 },
  modalCloseText: { color: C.muted, fontSize: 18 },
  modalName:      { color: C.text, fontFamily: 'BebasNeue_400Regular', fontSize: 30, letterSpacing: 0.5, marginBottom: 4 },
  modalRole:      { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 14, marginBottom: 20 },

  statsBlock:     { gap: 10, marginBottom: 24 },
  statBarRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statBarLabel:   { color: C.muted, fontFamily: 'Manrope_600SemiBold', fontSize: 12, width: 80 },
  statBarTrack:   { flex: 1, height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
  statBarFill:    { height: '100%', borderRadius: 3 },
  statBarValue:   { color: C.text, fontFamily: 'Manrope_700Bold', fontSize: 13, width: 28, textAlign: 'right' },

  offerLabel:     { color: C.muted, fontFamily: 'Manrope_700Bold', fontSize: 11, letterSpacing: 1.5, marginBottom: 8 },
  rejectedHint:   { color: C.amber, fontFamily: 'Manrope_600SemiBold', fontSize: 12, marginBottom: 10 },
  offerRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, marginBottom: 8 },
  dollarSign:     { color: C.muted, fontSize: 20, marginRight: 4 },
  offerInput:     { flex: 1, color: C.text, fontFamily: 'Manrope_700Bold', fontSize: 24, paddingVertical: 14 },
  millionLabel:   { color: C.muted, fontSize: 18 },
  cashAvail:      { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 12, marginBottom: 16 },

  offerBtn:       { borderRadius: 14, overflow: 'hidden' },
  offerBtnDisabled:{ backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.border, borderRadius: 14 },
  offerBtnGrad:   { padding: 16, alignItems: 'center' },
  offerBtnText:   { color: C.goldBtnText, fontFamily: 'Manrope_800ExtraBold', fontSize: 16 },
  offerBtnTextDisabled: { color: C.muted, fontFamily: 'Manrope_600SemiBold', fontSize: 16 },

  acceptedBanner: { backgroundColor: C.greenBg, borderRadius: 12, padding: 16, alignItems: 'center' },
  acceptedText:   { color: C.green, fontFamily: 'Manrope_700Bold', fontSize: 16 },
  rejectedBanner: { backgroundColor: C.redBg, borderRadius: 12, padding: 16, alignItems: 'center' },
  rejectedText:   { color: C.red, fontFamily: 'Manrope_700Bold', fontSize: 16 },
});
