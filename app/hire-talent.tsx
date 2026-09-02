import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useState, useMemo } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useGameStore } from '../src/store/gameStore';
import { Talent, TalentRole } from '../src/types';
import { AVATAR_MAP } from '../src/utils/avatars';
import { TutorialTarget } from './components/TutorialTarget';

const C = {
  pageBg: '#0f1220', cardBg: '#191c2a',
  border: '#252840',
  text: '#f0ede8', muted: '#9a958e', mutedMid: '#6b6880',
  gold: '#e6b254', goldDim: '#e6b25420', goldBtnText: '#161008',
  green: '#4ec46e',
};

const CHEM_COLORS = {
  green: '#4ec46e',
  blue:  '#5b8dee',
  red:   '#c43820',
};

function listTier(p: number): string {
  if (p >= 80) return 'A-List';
  if (p >= 60) return 'B-List';
  if (p >= 40) return 'C-List';
  if (p >= 20) return 'D-List';
  return 'Unknown';
}

function blendedSkill(talent: Talent): number {
  if (talent.stats.role === 'showrunner') return Math.round((talent.stats.writing + talent.stats.creativity + talent.stats.consistency) / 3);
  if (talent.stats.role === 'director')   return Math.round((talent.stats.direction + talent.stats.vision) / 2);
  return Math.round((talent.stats.acting + talent.stats.chemistry) / 2);
}

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


function TalentCard({
  talent,
  onPress,
  locked = false,
}: {
  talent: Talent;
  onPress: () => void;
  locked?: boolean;
}) {
  const skill = blendedSkill(talent);

  return (
    <TouchableOpacity
      style={s.talentCard}
      onPress={locked ? undefined : onPress}
      activeOpacity={locked ? 1 : 0.75}
    >
      <View style={[s.talentCardLeft, locked && s.lockedContent]}>
        <View style={s.avatarWrap}>
          <Image source={AVATAR_MAP[talent.avatarId]} style={s.avatarThumb} />
          <View style={[s.chemPip, { backgroundColor: CHEM_COLORS[talent.chemistryColor] }]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.talentName}>{talent.name}</Text>
          <Text style={s.talentMeta}>
            {listTier(talent.popularity)} · Age {talent.age}
          </Text>
        </View>
        <View style={s.talentCardRight}>
          <Text style={s.talentStat}>{skill}</Text>
          <Text style={s.talentStatLabel}>Skill</Text>
        </View>
      </View>

      {/* Prestige lock overlay — absolutely positioned over the whole card */}
      {locked && (
        <View style={s.lockOverlay} pointerEvents="none">
          <View style={s.lockBadge}>
            <Text style={s.lockIcon}>🔒</Text>
            <Text style={s.lockLabel}>UNLOCKS AT PRESTIGE {talent.prestigeRequired}</Text>
          </View>
        </View>
      )}
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

  const listItems = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const prestige = network.prestige;

    // Unlocked + available: fully tappable, sorted by popularity desc
    const unlocked = talent
      .filter(t =>
        t.role === role &&
        t.available &&
        t.prestigeRequired <= prestige &&
        (query === '' || t.name.toLowerCase().includes(query))
      )
      .sort((a, b) => b.popularity - a.popularity)
      .map(t => ({ talent: t, locked: false }));

    // Prestige-locked: shown with overlay, sorted by threshold asc then popularity desc
    const locked = talent
      .filter(t =>
        t.role === role &&
        t.prestigeRequired > prestige &&
        (query === '' || t.name.toLowerCase().includes(query))
      )
      .sort((a, b) =>
        a.prestigeRequired !== b.prestigeRequired
          ? a.prestigeRequired - b.prestigeRequired
          : b.popularity - a.popularity
      )
      .map(t => ({ talent: t, locked: true }));

    return [...unlocked, ...locked];
  }, [talent, role, searchQuery, network.prestige]);

  const filledShowrunners = season?.showrunnerIDs.length ?? 0;
  const showrunnerSlots = season?.showrunnerSlots ?? 1;
  const filledLeads = season?.leadActorIDs.length ?? 0;
  const filledSupporting = season?.supportingActorIDs.length ?? 0;
  const leadSlots = season?.leadActorSlots ?? 0;
  const supportingSlots = season?.supportingActorSlots ?? 0;
  const filledCount = role === 'showrunner'
    ? filledShowrunners
    : actorType === 'lead' ? filledLeads : filledSupporting;
  const totalSlots = role === 'showrunner'
    ? showrunnerSlots
    : actorType === 'lead' ? leadSlots : supportingSlots;
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
    <SafeAreaView edges={['top']} style={s.container}>
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
          {season && (role === 'actor' || (role === 'showrunner' && showrunnerSlots > 1)) && (
            <Text style={s.slotCount}>
              {role === 'showrunner' ? 'Writers Room' : actorType === 'lead' ? 'Lead' : 'Supporting'}: {filledCount}/{totalSlots} filled
              {slotsRemaining > 0 ? ` · ${slotsRemaining} slot${slotsRemaining > 1 ? 's' : ''} remaining` : ' · All filled'}
            </Text>
          )}
        </View>
      )}

      <View style={s.descRow}>
        <TutorialTarget stepID="casting" style={StyleSheet.absoluteFill} pointerEvents="none" />
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

      {listItems.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={s.emptyText}>No available {role}s match your search.</Text>
        </View>
      ) : (
        <FlatList
          data={listItems}
          keyExtractor={item => item.talent.id}
          renderItem={({ item }) => (
            <TalentCard
              talent={item.talent}
              locked={item.locked}
              onPress={() => router.push(
                `/talent/${item.talent.id}?showID=${showID}&role=${role}&actorType=${actorType}`
              )}
            />
          )}
          contentContainerStyle={{ padding: 16, gap: 8 }}
        />
      )}

      {(role === 'actor' || role === 'showrunner') && season && filledCount > 0 && (
        <View style={s.footer}>
          <Text style={s.castCount}>
            {role === 'showrunner' ? 'Showrunners' : actorType === 'lead' ? 'Lead' : 'Supporting'}: {filledCount}/{totalSlots} hired
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

  talentCard:       { position: 'relative', backgroundColor: C.cardBg, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14 },
  talentCardLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarWrap:       { width: 44, height: 52, borderRadius: 8, overflow: 'hidden' },
  avatarThumb:      { width: 44, height: 52 },
  chemPip:          { position: 'absolute', bottom: 3, right: 3, width: 9, height: 9, borderRadius: 5, borderWidth: 1.5, borderColor: C.cardBg },
  talentName:       { color: C.text, fontFamily: 'Manrope_600SemiBold', fontSize: 15 },
  talentMeta:       { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 12, marginTop: 2 },
  talentCardRight:  { marginLeft: 'auto', alignItems: 'flex-end' },
  talentStat:       { color: C.text, fontFamily: 'BebasNeue_400Regular', fontSize: 28, letterSpacing: 0.5 },
  talentStatLabel:  { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 11 },

  // ── Prestige lock ──────────────────────────────────────────────────────────
  lockOverlay:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,12,22,0.72)', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  lockBadge:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#13162266', borderWidth: 1, borderColor: '#252840', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  lockIcon:       { fontSize: 12 },
  lockLabel:      { color: C.mutedMid, fontFamily: 'Manrope_700Bold', fontSize: 11, letterSpacing: 1 },
  lockedContent:  { opacity: 0.35 },
  lockedText:     { color: C.mutedMid },

  emptyState:     { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText:      { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 15, textAlign: 'center' },

  footer:         { padding: 16, borderTopWidth: 1, borderTopColor: C.border, gap: 8 },
  castCount:      { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 13, textAlign: 'center' },
  doneBtn:        { borderRadius: 14 },
  doneBtnGrad:    { padding: 16, alignItems: 'center', borderRadius: 14 },
  doneBtnText:    { color: C.goldBtnText, fontFamily: 'Manrope_800ExtraBold', fontSize: 16 },
});