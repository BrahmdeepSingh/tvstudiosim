import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, SafeAreaView, Image,
} from 'react-native';
import { useState, useMemo } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useGameStore } from '../src/store/gameStore';
import { Talent, TalentRole } from '../src/types';
import { AVATAR_MAP } from '../src/utils/avatars';

const C = {
  pageBg: '#0f1220', cardBg: '#191c2a',
  border: '#252840',
  text: '#f0ede8', muted: '#9a958e',
  gold: '#e6b254', goldDim: '#e6b25420', goldBtnText: '#161008',
  green: '#4ec46e',
};

const CHEM_COLORS = {
  green: '#4ec46e',
  blue:  '#5b8dee',
  red:   '#c43820',
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

function popularityLabel(p: number): string {
  if (p < 30)  return 'Unknown';
  if (p < 50)  return 'Emerging';
  if (p < 70)  return 'Established';
  if (p < 85)  return 'Well-Known';
  return 'Star';
}

function TalentCard({
  talent,
  onPress,
}: {
  talent: Talent;
  onPress: () => void;
}) {
  const primary = getPrimaryStatValue(talent);

  return (
    <TouchableOpacity style={s.talentCard} onPress={onPress}>
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

export default function HireTalentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ showID: string; role: TalentRole; actorType?: string }>();
  const showID = params.showID ?? '';
  const role: TalentRole = (params.role as TalentRole) ?? 'showrunner';
  const actorType: 'lead' | 'supporting' =
    params.actorType === 'supporting' ? 'supporting' : 'lead';

  const { talent, network, shows } = useGameStore();
  const [searchQuery, setSearchQuery] = useState('');

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
            <TalentCard
              talent={item}
              onPress={() => router.push(
                `/talent/${item.id}?showID=${showID}&role=${role}&actorType=${actorType}`
              )}
            />
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
});
