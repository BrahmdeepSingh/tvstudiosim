import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useGameStore } from '../src/store/gameStore';
import { Genre, Tone } from '../src/types';
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

const TONES: { value: Tone; label: string; desc: string }[] = [
  { value: 'prestige',     label: 'Prestige',     desc: 'Awards-driven, adult themes' },
  { value: 'mainstream',   label: 'Mainstream',   desc: 'Broad appeal, accessible' },
  { value: 'experimental', label: 'Experimental', desc: 'Unconventional, niche audience' },
  { value: 'procedural',   label: 'Procedural',   desc: 'Case-of-the-week format' },
];

export default function CreateShowScreen() {
  const router = useRouter();
  const { createShow, network } = useGameStore();

  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState<Genre | null>(null);
  const [tone, setTone] = useState<Tone | null>(null);
  const [episodes, setEpisodes] = useState(10);

  const canProceed = title.trim().length > 0 && genre !== null && tone !== null;

  function handleCreate() {
    if (!canProceed || !genre || !tone) return;
    const showID = createShow(title.trim(), genre, tone, episodes);
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

          {/* Tone */}
          <Text style={s.label}>TONE</Text>
          <View style={s.toneGrid}>
            {TONES.map(t => (
              <TouchableOpacity
                key={t.value}
                style={[s.toneCard, tone === t.value && s.toneCardActive]}
                onPress={() => setTone(t.value)}
              >
                <Text style={[s.toneLabel, tone === t.value && s.toneLabelActive]}>
                  {t.label}
                </Text>
                <Text style={s.toneDesc}>{t.desc}</Text>
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

  toneGrid:          { gap: 8 },
  toneCard:          { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14 },
  toneCardActive:    { borderColor: C.accent, backgroundColor: C.accent + '18' },
  toneLabel:         { color: C.text, fontSize: 15, fontWeight: '500', marginBottom: 3 },
  toneLabelActive:   { color: C.accent },
  toneDesc:          { color: C.muted, fontSize: 13 },

  episodeRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  episodeBtn:        { width: 48, height: 48, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  episodeBtnDisabled:{ opacity: 0.3 },
  episodeBtnText:    { color: C.text, fontSize: 24, lineHeight: 28 },
  episodeDisplay:    { alignItems: 'center', minWidth: 80 },
  episodeCount:      { color: C.text, fontSize: 42, fontWeight: '700', lineHeight: 48 },
  episodeLabel:      { color: C.muted, fontSize: 13 },

  hint:              { backgroundColor: C.card, borderRadius: 8, padding: 12, marginTop: 16, borderWidth: 1, borderColor: C.border },
  hintText:          { color: C.muted, fontSize: 13, lineHeight: 19 },

  footer:            { padding: 16, borderTopWidth: 1, borderTopColor: C.border, gap: 8 },
  cashNote:          { color: C.muted, fontSize: 13, textAlign: 'center' },
  nextBtn:           { backgroundColor: C.accent, borderRadius: 12, padding: 16, alignItems: 'center' },
  nextBtnDisabled:   { backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  nextBtnText:       { color: '#fff', fontSize: 16, fontWeight: '600' },
  nextBtnTextDisabled: { color: C.muted },
});
