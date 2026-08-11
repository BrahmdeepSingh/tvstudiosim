import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Switch, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useGameStore } from '../src/store/gameStore';
import { PosterConfig } from '../src/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const POSTER_WIDTH  = SCREEN_WIDTH * 0.55;
const POSTER_HEIGHT = POSTER_WIDTH * 1.5;

const C = {
  pageBg:   '#0f1220',
  cardBg:   '#191c2a',
  border:   '#252840',
  text:     '#f0ede8',
  muted:    '#9a958e',
  mutedMid: '#6b6880',
  gold:     '#e6b254',
  goldDim:  '#e6b25420',
  goldText: '#161008',
  green:    '#4ec46e',
};

const F = {
  display: 'BebasNeue_400Regular',
  body:    'Manrope_400Regular',
  bodyMd:  'Manrope_600SemiBold',
  bodyBd:  'Manrope_700Bold',
  bodyXBd: 'Manrope_800ExtraBold',
};

// ── Placeholder backgrounds (swap for real images later) ──────────────────────
export const POSTER_BACKGROUNDS = [
  {
    id: 'noir-city',
    name: 'Noir City',
    colors: ['#0a0a0f', '#1a1a2e', '#16213e'] as const,
    accent: '#4a90d9',
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    colors: ['#1a0800', '#3d1500', '#7a3000'] as const,
    accent: '#e6b254',
  },
  {
    id: 'neon-pulse',
    name: 'Neon Pulse',
    colors: ['#0d0015', '#1a0030', '#350060'] as const,
    accent: '#b06aff',
  },
];

const TITLE_COLORS = [
  { label: 'White',  value: '#f0ede8' },
  { label: 'Gold',   value: '#e6b254' },
  { label: 'Ice',    value: '#cccee0' },
  { label: 'Coral',  value: '#e06050' },
];

const TITLE_SIZES: { label: string; value: PosterConfig['titleSize']; fontSize: number }[] = [
  { label: 'S',  value: 'small',  fontSize: 26 },
  { label: 'M',  value: 'medium', fontSize: 38 },
  { label: 'L',  value: 'large',  fontSize: 52 },
];

const DEFAULT_CONFIG: PosterConfig = {
  backgroundID:    'noir-city',
  titlePosition:   'bottom',
  titleSize:       'large',
  titleColor:      '#f0ede8',
  tagline:         '',
  showSeasonNumber: true,
};

// ── Poster preview component ──────────────────────────────────────────────────
function PosterPreview({ config, title, seasonNumber, networkInitials }: {
  config: PosterConfig;
  title: string;
  seasonNumber: number;
  networkInitials: string;
}) {
  const bg = POSTER_BACKGROUNDS.find(b => b.id === config.backgroundID) ?? POSTER_BACKGROUNDS[0];
  const sizeEntry = TITLE_SIZES.find(s => s.value === config.titleSize) ?? TITLE_SIZES[2];

  const textBlock = (
    <View style={[
      st.posterTextBlock,
      config.titlePosition === 'top' ? st.posterTextTop : st.posterTextBottom,
    ]}>
      {config.showSeasonNumber && config.titlePosition === 'top' && (
        <Text style={[st.posterSeason, { color: bg.accent }]}>
          SEASON {seasonNumber}
        </Text>
      )}
      <Text style={[st.posterTitle, { color: config.titleColor, fontSize: sizeEntry.fontSize, lineHeight: sizeEntry.fontSize * 1.05 }]} numberOfLines={3}>
        {title.toUpperCase()}
      </Text>
      {config.showSeasonNumber && config.titlePosition === 'bottom' && (
        <Text style={[st.posterSeason, { color: bg.accent }]}>
          SEASON {seasonNumber}
        </Text>
      )}
      {config.tagline.trim().length > 0 && (
        <Text style={st.posterTagline} numberOfLines={2}>{config.tagline}</Text>
      )}
    </View>
  );

  return (
    <View style={st.posterFrame}>
      <LinearGradient
        colors={[...bg.colors] as [string, string, ...string[]]}
        style={st.posterGradient}
      >
        {/* Network badge */}
        <View style={st.posterBadge}>
          <Text style={st.posterBadgeText}>{networkInitials}</Text>
        </View>

        {textBlock}
      </LinearGradient>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function PosterCreatorScreen() {
  const router = useRouter();
  const { showID, targetWeek, targetYear } = useLocalSearchParams<{
    showID: string; targetWeek: string; targetYear: string;
  }>();

  const { shows, network, setAirDate, savePosterConfig } = useGameStore();
  const show = shows.find(s => s.id === showID);
  const season = show?.seasons[show.currentSeasonIndex];

  const [config, setConfig] = useState<PosterConfig>(() => ({
    ...DEFAULT_CONFIG,
    ...(season?.posterConfig ?? {}),
  }));

  if (!show || !season) {
    return (
      <SafeAreaView style={st.container}>
        <LinearGradient colors={['#131829', '#0f1220']} style={StyleSheet.absoluteFill} />
        <Text style={{ color: C.muted, padding: 32, fontFamily: F.body }}>Show not found.</Text>
      </SafeAreaView>
    );
  }

  function update(partial: Partial<PosterConfig>) {
    setConfig(prev => ({ ...prev, ...partial }));
  }

  function handleConfirm() {
    savePosterConfig(show!.id, config);
    setAirDate(show!.id, Number(targetWeek), Number(targetYear));
    router.back();
  }

  function handleSkip() {
    setAirDate(show!.id, Number(targetWeek), Number(targetYear));
    router.back();
  }

  const seasonNumber = season.seasonNumber;

  return (
    <LinearGradient colors={['#141726', '#0c0f1a', '#070a12']} locations={[0, 0.55, 1]} style={{ flex: 1 }}>
      <SafeAreaView style={st.safeArea}>

        {/* Header */}
        <View style={st.header}>
          <TouchableOpacity onPress={handleSkip} style={{ width: 60 }}>
            <Text style={st.skipText}>Skip</Text>
          </TouchableOpacity>
          <Text style={st.headerTitle}>DESIGN POSTER</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={st.scroll} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Preview */}
          <View style={st.previewRow}>
            <PosterPreview
              config={config}
              title={show.title}
              seasonNumber={seasonNumber}
              networkInitials={network.initials}
            />
            <View style={st.previewMeta}>
              <Text style={st.previewShowTitle} numberOfLines={2}>{show.title}</Text>
              <Text style={st.previewSeason}>Season {seasonNumber}</Text>
              <Text style={st.previewDate}>Premieres{'\n'}Week {targetWeek} · Year {targetYear}</Text>
            </View>
          </View>

          {/* Background picker */}
          <Text style={st.sectionLabel}>BACKGROUND</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.bgScroll} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
            {POSTER_BACKGROUNDS.map(bg => {
              const selected = config.backgroundID === bg.id;
              return (
                <TouchableOpacity key={bg.id} onPress={() => update({ backgroundID: bg.id })} activeOpacity={0.8}>
                  <LinearGradient
                    colors={[...bg.colors] as [string, string, ...string[]]}
                    style={[st.bgSwatch, selected && { borderColor: C.gold, borderWidth: 2 }]}
                  />
                  <Text style={[st.bgLabel, selected && { color: C.gold }]}>{bg.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Title position */}
          <Text style={st.sectionLabel}>TITLE POSITION</Text>
          <View style={st.toggleRow}>
            {(['top', 'bottom'] as const).map(pos => (
              <TouchableOpacity
                key={pos}
                style={[st.toggleBtn, config.titlePosition === pos && st.toggleBtnActive]}
                onPress={() => update({ titlePosition: pos })}
              >
                <Text style={[st.toggleBtnText, config.titlePosition === pos && st.toggleBtnTextActive]}>
                  {pos.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Title size */}
          <Text style={st.sectionLabel}>TITLE SIZE</Text>
          <View style={st.toggleRow}>
            {TITLE_SIZES.map(sz => (
              <TouchableOpacity
                key={sz.value}
                style={[st.toggleBtn, config.titleSize === sz.value && st.toggleBtnActive]}
                onPress={() => update({ titleSize: sz.value })}
              >
                <Text style={[st.toggleBtnText, config.titleSize === sz.value && st.toggleBtnTextActive]}>
                  {sz.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Title color */}
          <Text style={st.sectionLabel}>TITLE COLOR</Text>
          <View style={st.colorRow}>
            {TITLE_COLORS.map(col => (
              <TouchableOpacity
                key={col.value}
                onPress={() => update({ titleColor: col.value })}
                style={[st.colorSwatch, { backgroundColor: col.value }, config.titleColor === col.value && st.colorSwatchSelected]}
              />
            ))}
          </View>

          {/* Season number toggle */}
          <View style={st.switchRow}>
            <Text style={st.switchLabel}>Show Season Number</Text>
            <Switch
              value={config.showSeasonNumber}
              onValueChange={v => update({ showSeasonNumber: v })}
              trackColor={{ false: C.border, true: C.gold + '88' }}
              thumbColor={config.showSeasonNumber ? C.gold : C.mutedMid}
            />
          </View>

          {/* Tagline */}
          <Text style={st.sectionLabel}>TAGLINE</Text>
          <TextInput
            style={st.taglineInput}
            value={config.tagline}
            onChangeText={v => update({ tagline: v })}
            placeholder="Add a tagline…"
            placeholderTextColor={C.mutedMid}
            maxLength={60}
          />
          <Text style={st.charCount}>{config.tagline.length}/60</Text>

          {/* Confirm button */}
          <TouchableOpacity style={st.confirmBtn} onPress={handleConfirm} activeOpacity={0.88}>
            <LinearGradient
              colors={['#f0c060', '#c49440']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={st.confirmBtnGrad}
            >
              <Text style={st.confirmBtnText}>CONFIRM & SET PREMIERE DATE</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  safeArea:   { flex: 1 },
  container:  { flex: 1, backgroundColor: C.pageBg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  skipText:    { fontFamily: F.bodyMd, color: C.muted, fontSize: 14 },
  headerTitle: { fontFamily: F.display, color: C.text, fontSize: 24, letterSpacing: 3 },

  scroll:        { flex: 1 },
  scrollContent: { paddingBottom: 24 },

  // ── Preview ──────────────────────────────────────────────────────────────────
  previewRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 16,
    paddingHorizontal: 16, paddingVertical: 20,
  },
  posterFrame: {
    width: POSTER_WIDTH, height: POSTER_HEIGHT,
    borderRadius: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6, shadowRadius: 20, elevation: 16,
  },
  posterGradient:   { flex: 1 },
  posterBadge: {
    position: 'absolute', top: 10, left: 10,
    width: 28, height: 28, borderRadius: 6,
    backgroundColor: '#ffffff18', borderWidth: 1, borderColor: '#ffffff30',
    justifyContent: 'center', alignItems: 'center',
  },
  posterBadgeText:  { fontFamily: F.display, color: '#fff', fontSize: 11, letterSpacing: 1 },
  posterTextBlock:  { position: 'absolute', left: 12, right: 12 },
  posterTextTop:    { top: 44 },
  posterTextBottom: { bottom: 16 },
  posterTitle:      { fontFamily: F.display, letterSpacing: 1 },
  posterSeason: {
    fontFamily: F.bodyXBd, fontSize: 9, letterSpacing: 2,
    marginBottom: 4, marginTop: 4,
  },
  posterTagline: {
    fontFamily: F.bodyMd, color: '#ffffffaa', fontSize: 10,
    marginTop: 6, lineHeight: 14, letterSpacing: 0.3,
  },

  previewMeta:      { flex: 1, justifyContent: 'center', gap: 8 },
  previewShowTitle: { fontFamily: F.bodyBd, color: C.text, fontSize: 17, lineHeight: 22 },
  previewSeason:    { fontFamily: F.bodyMd, color: C.muted, fontSize: 13 },
  previewDate:      { fontFamily: F.body, color: C.gold, fontSize: 12, lineHeight: 18, marginTop: 4 },

  // ── Controls ─────────────────────────────────────────────────────────────────
  sectionLabel: {
    fontFamily: F.bodyXBd, color: C.muted, fontSize: 10,
    letterSpacing: 1.5, paddingHorizontal: 16, marginTop: 20, marginBottom: 10,
  },

  bgScroll: { marginBottom: 4 },
  bgSwatch: {
    width: 72, height: 108, borderRadius: 8,
    borderWidth: 1, borderColor: C.border,
  },
  bgLabel: { fontFamily: F.bodyMd, color: C.mutedMid, fontSize: 10, textAlign: 'center', marginTop: 5 },

  toggleRow:         { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  toggleBtn:         { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.cardBg, alignItems: 'center' },
  toggleBtnActive:   { borderColor: C.gold, backgroundColor: C.goldDim },
  toggleBtnText:     { fontFamily: F.bodyBd, color: C.mutedMid, fontSize: 13 },
  toggleBtnTextActive: { color: C.gold },

  colorRow:          { flexDirection: 'row', gap: 14, paddingHorizontal: 16 },
  colorSwatch:       { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'transparent' },
  colorSwatchSelected: { borderColor: C.gold },

  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginTop: 20,
    backgroundColor: C.cardBg, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border,
    paddingVertical: 14,
  },
  switchLabel: { fontFamily: F.bodyMd, color: C.text, fontSize: 15 },

  taglineInput: {
    marginHorizontal: 16, backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 14, color: C.text, fontFamily: F.body, fontSize: 15,
  },
  charCount: { fontFamily: F.body, color: C.mutedMid, fontSize: 11, textAlign: 'right', paddingRight: 16, marginTop: 4 },

  confirmBtn:     { marginHorizontal: 16, marginTop: 28, borderRadius: 14, overflow: 'hidden' },
  confirmBtnGrad: { padding: 16, alignItems: 'center' },
  confirmBtnText: { fontFamily: F.bodyXBd, color: C.goldText, fontSize: 15, letterSpacing: 0.5 },
});
