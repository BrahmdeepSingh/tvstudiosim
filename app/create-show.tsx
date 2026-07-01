import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useGameStore } from '../src/store/gameStore';
import { Genre, Theme } from '../src/types';
import { MIN_EPISODES, MAX_EPISODES } from '../src/constants/game';

const C = {
  bg: '#0f0f17', card: '#16161f', border: '#1e1e2e',
  text: '#e8e8f0', muted: '#6b6b82', accent: '#7c6af7',
  green: '#4caf82', red: '#e85d5d',
};

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

export default function CreateShowScreen() {
  const router = useRouter();
  const { createShow, network } = useGameStore();

  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState<Genre | null>(null);
  const [theme, setTheme] = useState<Theme | null>(null);
  const [episodes, setEpisodes] = useState(10);
  const [leadSlots, setLeadSlots] = useState(2);
  const [supportingSlots, setSupportingSlots] = useState(3);

  const canProceed = title.trim().length > 0 && genre !== null && theme !== null;

  function handleCreate() {
    if (!canProceed || !genre || !theme) return;
    const showID = createShow(title.trim(), genre, theme, episodes, leadSlots, supportingSlots);
    router.replace(`/hire-talent?showID=${showID}&role=showrunner`);
  }

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>New Show</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>

          {/* Title */}
          <Text style={s.label}>SHOW TITLE</Text>
          <TextInput
            style={s.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter a title..."
            placeholderTextColor={C.muted}
            maxLength={60}
          />

          {/* Genre */}
          <Text style={s.label}>GENRE</Text>
          <View style={s.pillGrid}>
            {GENRES.map(g => (
              <TouchableOpacity
                key={g.value}
                style={[s.pill, genre === g.value && s.pillActive]}
                onPress={() => setGenre(g.value)}
              >
                <Text style={[s.pillText, genre === g.value && s.pillTextActive]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Theme */}
          <Text style={s.label}>THEME</Text>
          <View style={s.themeGrid}>
            {THEMES.map(t => (
              <TouchableOpacity
                key={t.value}
                style={[s.themePill, theme === t.value && s.themePillActive]}
                onPress={() => setTheme(t.value)}
              >
                <Text style={[s.themePillText, theme === t.value && s.themePillTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Episode count */}
          <Text style={s.label}>EPISODE COUNT</Text>
          <View style={s.episodeRow}>
            <TouchableOpacity
              style={[s.episodeBtn, episodes <= MIN_EPISODES && s.episodeBtnDisabled]}
              onPress={() => setEpisodes(e => Math.max(MIN_EPISODES, e - 1))}
            >
              <Text style={s.episodeBtnText}>−</Text>
            </TouchableOpacity>
            <View style={s.episodeDisplay}>
              <Text style={s.episodeCount}>{episodes}</Text>
              <Text style={s.episodeLabel}>episodes</Text>
            </View>
            <TouchableOpacity
              style={[s.episodeBtn, episodes >= MAX_EPISODES && s.episodeBtnDisabled]}
              onPress={() => setEpisodes(e => Math.min(MAX_EPISODES, e + 1))}
            >
              <Text style={s.episodeBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <View style={s.hint}>
            <Text style={s.hintText}>
              More episodes = more potential ad revenue, but higher upfront cost and longer production time.
            </Text>
          </View>

          {/* Cast slots */}
          <Text style={s.label}>CAST SLOTS</Text>
          <View style={s.castSlotSection}>
            <View style={s.castSlotRow}>
              <Text style={s.castSlotLabel}>Lead Actors</Text>
              <View style={s.stepperCompact}>
                <TouchableOpacity
                  style={[s.stepBtnSm, leadSlots <= 1 && s.episodeBtnDisabled]}
                  onPress={() => setLeadSlots(n => Math.max(1, n - 1))}
                >
                  <Text style={s.stepBtnSmText}>−</Text>
                </TouchableOpacity>
                <Text style={s.stepValueSm}>{leadSlots}</Text>
                <TouchableOpacity
                  style={[s.stepBtnSm, leadSlots >= 6 && s.episodeBtnDisabled]}
                  onPress={() => setLeadSlots(n => Math.min(6, n + 1))}
                >
                  <Text style={s.stepBtnSmText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={[s.castSlotRow, s.castSlotRowBorder]}>
              <Text style={s.castSlotLabel}>Supporting Actors</Text>
              <View style={s.stepperCompact}>
                <TouchableOpacity
                  style={[s.stepBtnSm, supportingSlots <= 1 && s.episodeBtnDisabled]}
                  onPress={() => setSupportingSlots(n => Math.max(1, n - 1))}
                >
                  <Text style={s.stepBtnSmText}>−</Text>
                </TouchableOpacity>
                <Text style={s.stepValueSm}>{supportingSlots}</Text>
                <TouchableOpacity
                  style={[s.stepBtnSm, supportingSlots >= 8 && s.episodeBtnDisabled]}
                  onPress={() => setSupportingSlots(n => Math.min(8, n + 1))}
                >
                  <Text style={s.stepBtnSmText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <View style={s.hint}>
            <Text style={s.hintText}>
              Filming begins automatically once all cast slots are filled and a director is hired. More cast = higher production cost.
            </Text>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.cashNote}>
            Cash on hand: <Text style={{ color: C.green }}>${(network.cashOnHand / 1_000_000).toFixed(1)}M</Text>
          </Text>
          <TouchableOpacity
            style={[s.nextBtn, !canProceed && s.nextBtnDisabled]}
            onPress={handleCreate}
            disabled={!canProceed}
          >
            <Text style={[s.nextBtnText, !canProceed && s.nextBtnTextDisabled]}>
              Next: Hire Showrunner →
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:         { flex: 1, backgroundColor: C.bg },
  header:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:           { width: 60 },
  backText:          { color: C.accent, fontSize: 15 },
  headerTitle:       { color: C.text, fontSize: 17, fontWeight: '600' },
  scroll:            { flex: 1 },
  scrollContent:     { padding: 20 },

  label:             { color: C.muted, fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 10, marginTop: 20 },

  input:             { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, color: C.text, fontSize: 16 },

  pillGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill:              { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  pillActive:        { borderColor: C.accent, backgroundColor: C.accent + '22' },
  pillText:          { color: C.muted, fontSize: 14 },
  pillTextActive:    { color: C.accent, fontWeight: '600' },

  themeGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  themePill:         { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  themePillActive:   { borderColor: C.accent, backgroundColor: C.accent + '22' },
  themePillText:     { color: C.muted, fontSize: 13 },
  themePillTextActive: { color: C.accent, fontWeight: '600' },

  episodeRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  episodeBtn:        { width: 48, height: 48, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  episodeBtnDisabled:{ opacity: 0.3 },
  episodeBtnText:    { color: C.text, fontSize: 24, lineHeight: 28 },
  episodeDisplay:    { alignItems: 'center', minWidth: 80 },
  episodeCount:      { color: C.text, fontSize: 42, fontWeight: '700', lineHeight: 48 },
  episodeLabel:      { color: C.muted, fontSize: 13 },

  hint:              { backgroundColor: C.card, borderRadius: 8, padding: 12, marginTop: 16, borderWidth: 1, borderColor: C.border },
  hintText:          { color: C.muted, fontSize: 13, lineHeight: 19 },

  castSlotSection:   { backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  castSlotRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  castSlotRowBorder: { borderTopWidth: 1, borderTopColor: C.border },
  castSlotLabel:     { color: C.text, fontSize: 15, fontWeight: '500' },
  stepperCompact:    { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepBtnSm:         { width: 36, height: 36, borderRadius: 8, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  stepBtnSmText:     { color: C.text, fontSize: 20, lineHeight: 24 },
  stepValueSm:       { color: C.text, fontSize: 22, fontWeight: '700', minWidth: 32, textAlign: 'center' },

  footer:            { padding: 16, borderTopWidth: 1, borderTopColor: C.border, gap: 8 },
  cashNote:          { color: C.muted, fontSize: 13, textAlign: 'center' },
  nextBtn:           { backgroundColor: C.accent, borderRadius: 12, padding: 16, alignItems: 'center' },
  nextBtnDisabled:   { backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  nextBtnText:       { color: '#fff', fontSize: 16, fontWeight: '600' },
  nextBtnTextDisabled: { color: C.muted },
});