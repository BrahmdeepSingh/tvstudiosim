import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useGameStore } from '../src/store/gameStore';
import { Genre, Theme } from '../src/types';
import { MIN_EPISODES, MAX_EPISODES, getShowCapacity, ACTIVE_SHOW_STATUSES } from '../src/constants/game';
import { hap } from '../src/utils/haptics';

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  pageBg:      '#0f1220',
  cardBg:      '#191c2a',
  cardBg2:     '#1d2035',
  border:      '#252840',
  borderGold:  '#e6b25430',
  text:        '#f0ede8',
  muted:       '#9a958e',
  mutedMid:    '#6b6880',
  gold:        '#e6b254',
  goldDim:     '#e6b25420',
  goldMid:     '#c49440',
  goldBtnText: '#161008',
  green:       '#4ec46e',
};

const F = {
  display: 'BebasNeue_400Regular',
  body:    'Manrope_400Regular',
  bodyMd:  'Manrope_600SemiBold',
  bodyBd:  'Manrope_700Bold',
  bodyXBd: 'Manrope_800ExtraBold',
};

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

const GENRES: { value: Genre; label: string }[] = [
  { value: 'drama',          label: 'Drama' },
  { value: 'comedy',         label: 'Comedy' },
  { value: 'sci-fi',         label: 'Sci-Fi' },
  { value: 'procedural',     label: 'Procedural' },
  { value: 'reality',        label: 'Reality' },
  { value: 'limited-series', label: 'Limited Series' },
];

const THEMES: { value: Theme; label: string }[] = [
  { value: 'romance',       label: 'Romance' },
  { value: 'superhero',     label: 'Superhero' },
  { value: 'medieval',      label: 'Medieval' },
  { value: 'space',         label: 'Space' },
  { value: 'western',       label: 'Western' },
  { value: 'crime',         label: 'Crime' },
  { value: 'political',     label: 'Political' },
  { value: 'holiday',       label: 'Holiday' },
  { value: 'dystopian',     label: 'Dystopian' },
  { value: 'historical',    label: 'Historical' },
  { value: 'sports',        label: 'Sports' },
  { value: 'music',         label: 'Music' },
  { value: 'survival',      label: 'Survival' },
  { value: 'war',           label: 'War' },
  { value: 'legal',         label: 'Legal' },
  { value: 'medical',       label: 'Medical' },
  { value: 'horror',        label: 'Horror' },
  { value: 'workplace',     label: 'Workplace' },
  { value: 'coming-of-age', label: 'Coming-of-Age' },
  { value: 'supernatural',  label: 'Supernatural' },
  { value: 'fantasy',       label: 'Fantasy' },
];

// ── Film ribbon ambient texture ───────────────────────────────────────────────
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

// ── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: string }) {
  return <Text style={s.label}>{children}</Text>;
}

// ── Stepper ───────────────────────────────────────────────────────────────────
function Stepper({
  value, onDec, onInc, disableDec, disableInc, large,
}: {
  value: number; onDec: () => void; onInc: () => void;
  disableDec: boolean; disableInc: boolean; large?: boolean;
}) {
  return (
    <View style={s.stepperRow}>
      <TouchableOpacity
        style={[s.stepBtn, disableDec && s.stepBtnDisabled]}
        onPress={onDec} disabled={disableDec}
      >
        <Text style={s.stepBtnText}>−</Text>
      </TouchableOpacity>
      <Text style={large ? s.stepValueLarge : s.stepValueSm}>{value}</Text>
      <TouchableOpacity
        style={[s.stepBtn, disableInc && s.stepBtnDisabled]}
        onPress={onInc} disabled={disableInc}
      >
        <Text style={s.stepBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function CreateShowScreen() {
  const router = useRouter();
  const { createShow, network, shows } = useGameStore();

  const [title, setTitle]               = useState('');
  const [genre, setGenre]               = useState<Genre | null>(null);
  const [theme, setTheme]               = useState<Theme | null>(null);
  const [episodes, setEpisodes]         = useState(10);
  const [leadSlots, setLeadSlots]       = useState(2);
  const [supportingSlots, setSupportingSlots] = useState(3);
  const [titleFocused, setTitleFocused] = useState(false);

  const capacity = getShowCapacity(network.prestige);
  const activeCount = shows.filter(s => ACTIVE_SHOW_STATUSES.has(s.status)).length;
  const atCapacity = activeCount >= capacity;

  const canProceed = !atCapacity && title.trim().length > 0 && genre !== null && theme !== null;

  function handleCreate() {
    if (!canProceed || !genre || !theme) return;
    hap.heavy();
    const showID = createShow(title.trim(), genre, theme, episodes, leadSlots, supportingSlots);
    router.replace(`/hire-talent?showID=${showID}&role=showrunner`);
  }

  return (
    <LinearGradient
      colors={['#141726', '#0c0f1a', '#070a12']}
      locations={[0, 0.55, 1]}
      style={{ flex: 1 }}
    >
      <FilmRibbonAmbient />
      <SafeAreaView edges={['top']} style={s.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >

          {/* ── Header ── */}
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Text style={s.backText}>← BACK</Text>
            </TouchableOpacity>
            <Text style={s.headerTitle}>NEW SHOW</Text>
            <View style={{ width: 70 }} />
          </View>

          <ScrollView
            style={s.scroll}
            contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={false}
          >

            {/* ── Show title ── */}
            <SectionLabel>SHOW TITLE</SectionLabel>
            <TextInput
              style={[s.input, titleFocused && s.inputFocused]}
              value={title}
              onChangeText={setTitle}
              onFocus={() => setTitleFocused(true)}
              onBlur={() => setTitleFocused(false)}
              placeholder="Enter a title..."
              placeholderTextColor={C.mutedMid}
              maxLength={60}
            />

            {/* ── Genre ── */}
            <SectionLabel>GENRE</SectionLabel>
            <View style={s.pillGrid}>
              {GENRES.map(g => (
                <TouchableOpacity
                  key={g.value}
                  style={[s.pill, genre === g.value && s.pillActive]}
                  onPress={() => setGenre(g.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.pillText, genre === g.value && s.pillTextActive]}>
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Theme ── */}
            <SectionLabel>THEME</SectionLabel>
            <View style={s.pillGrid}>
              {THEMES.map(t => (
                <TouchableOpacity
                  key={t.value}
                  style={[s.pill, theme === t.value && s.pillActive]}
                  onPress={() => setTheme(t.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.pillText, theme === t.value && s.pillTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Episode count ── */}
            <SectionLabel>EPISODE COUNT</SectionLabel>
            <View style={s.episodeCard}>
              <Stepper
                value={episodes}
                onDec={() => setEpisodes(e => Math.max(MIN_EPISODES, e - 1))}
                onInc={() => setEpisodes(e => Math.min(MAX_EPISODES, e + 1))}
                disableDec={episodes <= MIN_EPISODES}
                disableInc={episodes >= MAX_EPISODES}
                large
              />
              <Text style={s.episodeUnit}>episodes</Text>
            </View>
            <View style={s.hint}>
              <Text style={s.hintText}>
                More episodes = more potential ad revenue, but higher upfront cost and longer production time.
              </Text>
            </View>

            {/* ── Cast slots ── */}
            <SectionLabel>CAST SLOTS</SectionLabel>
            <View style={s.castCard}>
              <View style={s.castRow}>
                <View>
                  <Text style={s.castRowLabel}>Lead Actors</Text>
                  <Text style={s.castRowSub}>Higher salary, bigger impact on ratings</Text>
                </View>
                <Stepper
                  value={leadSlots}
                  onDec={() => setLeadSlots(n => Math.max(1, n - 1))}
                  onInc={() => setLeadSlots(n => Math.min(6, n + 1))}
                  disableDec={leadSlots <= 1}
                  disableInc={leadSlots >= 6}
                />
              </View>
              <View style={[s.castRow, s.castRowBorder]}>
                <View>
                  <Text style={s.castRowLabel}>Supporting Cast</Text>
                  <Text style={s.castRowSub}>Adds depth, lower cost per actor</Text>
                </View>
                <Stepper
                  value={supportingSlots}
                  onDec={() => setSupportingSlots(n => Math.max(1, n - 1))}
                  onInc={() => setSupportingSlots(n => Math.min(8, n + 1))}
                  disableDec={supportingSlots <= 1}
                  disableInc={supportingSlots >= 8}
                />
              </View>
            </View>
            <View style={s.hint}>
              <Text style={s.hintText}>
                Filming begins once all cast slots are filled and a director is hired.
              </Text>
            </View>

            <View style={{ height: 32 }} />
          </ScrollView>

          {/* ── Footer ── */}
          <View style={s.footer}>
            {atCapacity ? (
              <View style={s.capacityBanner}>
                <Text style={s.capacityBannerTitle}>
                  Production Capacity Reached  ({activeCount}/{capacity === Infinity ? '∞' : capacity})
                </Text>
                <Text style={s.capacityBannerSub}>
                  {network.prestige < 21
                    ? 'Reach Prestige 21 to produce up to 3 shows at once.'
                    : 'Reach Prestige 41 to produce unlimited shows.'}
                </Text>
              </View>
            ) : (
              <Text style={s.cashNote}>
                Cash on hand:{' '}
                <Text style={{ fontFamily: F.bodyBd, color: C.green }}>{fmt(network.cashOnHand)}</Text>
              </Text>
            )}
            <TouchableOpacity
              style={s.nextBtn}
              onPress={handleCreate}
              disabled={!canProceed}
              activeOpacity={0.88}
            >
              {canProceed ? (
                <LinearGradient
                  colors={['#f0c060', '#c49440']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.nextBtnGradient}
                >
                  <Text style={s.nextBtnTextActive}>NEXT: HIRE SHOWRUNNER  ▶</Text>
                </LinearGradient>
              ) : (
                <View style={s.nextBtnInactive}>
                  <Text style={s.nextBtnTextInactive}>NEXT: HIRE SHOWRUNNER  ▶</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:    { flex: 1 },
  scroll:       { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 8 },

  // ── Header ──────────────────────────────────────────────────────────────────
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:     { width: 70 },
  backText:    { fontFamily: 'Manrope_700Bold', color: C.gold, fontSize: 11, letterSpacing: 1 },
  headerTitle: { fontFamily: 'BebasNeue_400Regular', color: C.text, fontSize: 26, letterSpacing: 2 },

  // ── Section label ────────────────────────────────────────────────────────────
  label: { fontFamily: 'Manrope_700Bold', color: C.mutedMid, fontSize: 9, letterSpacing: 2, marginTop: 22, marginBottom: 10 },

  // ── Text input ───────────────────────────────────────────────────────────────
  input:        { backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontFamily: 'Manrope_400Regular', color: C.text, fontSize: 15 },
  inputFocused: { borderColor: C.gold + '80' },

  // ── Pill grids ───────────────────────────────────────────────────────────────
  pillGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill:            { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.cardBg },
  pillActive:      { borderColor: C.gold, backgroundColor: C.goldDim },
  pillText:        { fontFamily: 'Manrope_600SemiBold', color: C.muted, fontSize: 13 },
  pillTextActive:  { fontFamily: 'Manrope_700Bold', color: C.gold },

  // ── Episode card ─────────────────────────────────────────────────────────────
  episodeCard: { backgroundColor: C.cardBg, borderRadius: 14, borderWidth: 1, borderColor: C.borderGold, paddingVertical: 20, alignItems: 'center', gap: 4 },
  episodeUnit: { fontFamily: 'Manrope_600SemiBold', color: C.muted, fontSize: 12, letterSpacing: 0.5 },

  // ── Stepper ──────────────────────────────────────────────────────────────────
  stepperRow:     { flexDirection: 'row', alignItems: 'center', gap: 20 },
  stepBtn:        { width: 40, height: 40, borderRadius: 10, backgroundColor: C.cardBg2, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  stepBtnDisabled:{ opacity: 0.25 },
  stepBtnText:    { fontFamily: 'Manrope_400Regular', color: C.text, fontSize: 22, lineHeight: 26 },
  stepValueLarge: { fontFamily: 'BebasNeue_400Regular', color: C.gold, fontSize: 52, lineHeight: 56, minWidth: 56, textAlign: 'center' },
  stepValueSm:    { fontFamily: 'BebasNeue_400Regular', color: C.text, fontSize: 28, lineHeight: 32, minWidth: 36, textAlign: 'center' },

  // ── Hint ─────────────────────────────────────────────────────────────────────
  hint:     { backgroundColor: C.cardBg, borderRadius: 10, padding: 12, marginTop: 12, borderWidth: 1, borderColor: C.border },
  hintText: { fontFamily: 'Manrope_400Regular', color: C.muted, fontSize: 12, lineHeight: 19 },

  // ── Cast card ────────────────────────────────────────────────────────────────
  castCard:      { backgroundColor: C.cardBg, borderRadius: 14, borderWidth: 1, borderColor: C.borderGold, overflow: 'hidden' },
  castRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 },
  castRowBorder: { borderTopWidth: 1, borderTopColor: C.border },
  castRowLabel:  { fontFamily: 'Manrope_700Bold', color: C.text, fontSize: 14 },
  castRowSub:    { fontFamily: 'Manrope_400Regular', color: C.mutedMid, fontSize: 11, marginTop: 3 },

  // ── Footer ───────────────────────────────────────────────────────────────────
  footer:              { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 8, borderTopWidth: 1, borderTopColor: C.border, gap: 8 },
  cashNote:            { fontFamily: 'Manrope_400Regular', color: C.muted, fontSize: 12, textAlign: 'center' },
  capacityBanner:      { backgroundColor: '#1a0e0e', borderRadius: 10, borderWidth: 1, borderColor: '#c4382044', padding: 12, alignItems: 'center', gap: 4 },
  capacityBannerTitle: { color: '#c43820', fontFamily: 'Manrope_700Bold', fontSize: 13 },
  capacityBannerSub:   { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 12, textAlign: 'center', lineHeight: 17 },
  nextBtn:             { borderRadius: 999 },
  nextBtnGradient:     { paddingVertical: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  nextBtnInactive:     { paddingVertical: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.border, borderRadius: 999 },
  nextBtnTextActive:   { fontFamily: 'BebasNeue_400Regular', color: C.goldBtnText, fontSize: 16, letterSpacing: 3 },
  nextBtnTextInactive: { fontFamily: 'BebasNeue_400Regular', color: C.mutedMid, fontSize: 16, letterSpacing: 3 },
});