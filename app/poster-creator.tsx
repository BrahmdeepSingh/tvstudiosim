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
const POSTER_WIDTH  = SCREEN_WIDTH * 0.65;
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
};

const F = {
  display:  'BebasNeue_400Regular',
  body:     'Manrope_400Regular',
  bodyMd:   'Manrope_600SemiBold',
  bodyBd:   'Manrope_700Bold',
  bodyXBd:  'Manrope_800ExtraBold',
  bodyLt:   'Manrope_300Light',
};

// ── Illustrated background: Haunted Hills ─────────────────────────────────────
// Built entirely from Views — triangles via border trick, bats via borderRadius.
function _hauntedHills(w: number, h: number) {
  const sil = '#040010'; // near-black silhouette

  // Triangle roof pointing upward, peak at (peakX, peakTop)
  function roofTri(halfBase: number, triH: number, peakX: number, peakTop: number) {
    return (
      <View style={{ position: 'absolute', left: peakX - halfBase, top: peakTop,
        width: 0, height: 0,
        borderLeftWidth: halfBase, borderRightWidth: halfBase, borderBottomWidth: triH,
        borderLeftColor: 'transparent', borderRightColor: 'transparent',
        borderBottomColor: sil }} />
    );
  }

  // Single bat at canvas position (cx, cy) with total wingspan sz
  function bat(cx: number, cy: number, sz: number) {
    const bw = sz, bh = sz * 0.46;
    return (
      <View style={{ position: 'absolute', left: cx - bw / 2, top: cy - bh / 2, width: bw, height: bh }}>
        <View style={{ position: 'absolute', left: 0, top: 0, width: bw * 0.44, height: bh,
          backgroundColor: sil, borderTopLeftRadius: bw * 0.44, borderTopRightRadius: bw * 0.06, borderBottomRightRadius: bw * 0.22 }} />
        <View style={{ position: 'absolute', left: bw * 0.40, top: bh * 0.16, width: bw * 0.20, height: bh * 0.70,
          backgroundColor: sil, borderRadius: bw * 0.10 }} />
        <View style={{ position: 'absolute', right: 0, top: 0, width: bw * 0.44, height: bh,
          backgroundColor: sil, borderTopLeftRadius: bw * 0.06, borderTopRightRadius: bw * 0.44, borderBottomLeftRadius: bw * 0.22 }} />
      </View>
    );
  }

  // Dead tree — trunk + two angled branches
  // Branches are rotated Views; left/top computed so the trunk-side end meets the trunk.
  function tree(tx: number, groundY: number, side: 'l' | 'r') {
    const tw  = Math.max(2, w * 0.022);
    const th  = h * 0.23;
    const b1w = w * 0.088, b1h = Math.max(2, h * 0.011);
    const b2w = w * 0.072, b2h = Math.max(2, h * 0.011);
    // Rotation math: right end of a View rotated θ sits at
    //   (centerX + b1w/2·cos θ, centerY + b1w/2·sin θ)
    // We want that end to sit at (tx, groundY + th·0.12).
    // cos32°≈0.848, sin32°≈0.530 → for left tree (θ=-32°):
    //   centerX = tx - b1w/2·0.848  → left = tx - b1w·0.924
    //   centerY = (groundY+th·0.12) + b1w/2·0.530
    //   top     = centerY - b1h/2 ≈ groundY + th·0.12 + b1w·0.265
    // For right tree mirror (θ=+32°, left end meets trunk):
    //   left = tx - b1w·0.076
    const b1Left = side === 'l' ? tx - b1w * 0.924 : tx - b1w * 0.076;
    const b1Top  = groundY + th * 0.12 + b1w * 0.265 - b1h / 2;
    // cos18°≈0.951, sin18°≈0.309
    const b2Left = side === 'l' ? tx - b2w * 0.976 : tx - b2w * 0.025;
    const b2Top  = groundY + th * 0.34 + b2w * 0.155 - b2h / 2;

    return (
      <View>
        <View style={{ position: 'absolute', left: tx - tw / 2, top: groundY, width: tw, height: th, backgroundColor: sil }} />
        <View style={{ position: 'absolute', left: b1Left, top: b1Top, width: b1w, height: b1h,
          backgroundColor: sil, transform: [{ rotate: side === 'l' ? '-32deg' : '32deg' }] }} />
        <View style={{ position: 'absolute', left: b2Left, top: b2Top, width: b2w, height: b2h,
          backgroundColor: sil, transform: [{ rotate: side === 'l' ? '-18deg' : '18deg' }] }} />
      </View>
    );
  }

  // Scene measurements
  const moonR = w * 0.08;
  const moonX = w * 0.71, moonY = h * 0.11;
  // House
  const hL = w * 0.28, hT = h * 0.56, hW = w * 0.44, hH = h * 0.36;
  // Side tower
  const tL = w * 0.18, tT = h * 0.48, tW = w * 0.135, tH = h * 0.28;

  return (
    <View style={{ width: w, height: h }}>
      {/* Sky */}
      <LinearGradient
        colors={['#3d1070', '#1e0548', '#0d0230', '#060018']}
        locations={[0, 0.30, 0.65, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Moon outer glow */}
      <View style={{ position: 'absolute', left: moonX - moonR * 2.1, top: moonY - moonR * 2.1,
        width: moonR * 4.2, height: moonR * 4.2, borderRadius: moonR * 2.1,
        backgroundColor: '#c07028', opacity: 0.10 }} />
      {/* Moon inner glow */}
      <View style={{ position: 'absolute', left: moonX - moonR * 1.4, top: moonY - moonR * 1.4,
        width: moonR * 2.8, height: moonR * 2.8, borderRadius: moonR * 1.4,
        backgroundColor: '#d08838', opacity: 0.14 }} />
      {/* Moon disc */}
      <View style={{ position: 'absolute', left: moonX - moonR, top: moonY - moonR,
        width: moonR * 2, height: moonR * 2, borderRadius: moonR, backgroundColor: '#e2dac0' }} />

      {/* Bats */}
      {bat(w * 0.15, h * 0.19, w * 0.068)}
      {bat(w * 0.38, h * 0.13, w * 0.053)}
      {bat(w * 0.54, h * 0.24, w * 0.062)}
      {bat(w * 0.83, h * 0.17, w * 0.074)}
      {bat(w * 0.47, h * 0.32, w * 0.046)}

      {/* Dead trees (drawn before house so house overlaps roots) */}
      {tree(w * 0.09, h * 0.70, 'l')}
      {tree(w * 0.89, h * 0.70, 'r')}

      {/* Tower roof */}
      {roofTri(tW / 2 + w * 0.016, h * 0.14, tL + tW / 2, tT - h * 0.14)}
      {/* Tower body */}
      <View style={{ position: 'absolute', left: tL, top: tT, width: tW, height: tH, backgroundColor: sil }} />
      {/* Tower window (only meaningful at full/emmy size) */}
      {w > 80 && (
        <View style={{ position: 'absolute', left: tL + tW * 0.22, top: tT + tH * 0.22,
          width: tW * 0.56, height: tH * 0.17, backgroundColor: '#e07010' }} />
      )}

      {/* House roof */}
      {roofTri(hW / 2 + w * 0.04, h * 0.17, hL + hW / 2, hT - h * 0.17)}
      {/* Chimney */}
      <View style={{ position: 'absolute', left: hL + hW * 0.27, top: hT - h * 0.23,
        width: w * 0.055, height: h * 0.095, backgroundColor: sil }} />
      {/* House body */}
      <View style={{ position: 'absolute', left: hL, top: hT, width: hW, height: hH, backgroundColor: sil }} />
      {/* House windows */}
      {w > 80 && (
        <>
          <View style={{ position: 'absolute', left: hL + hW * 0.17, top: hT + hH * 0.16,
            width: hW * 0.20, height: hH * 0.22, backgroundColor: '#e07010' }} />
          <View style={{ position: 'absolute', left: hL + hW * 0.60, top: hT + hH * 0.16,
            width: hW * 0.20, height: hH * 0.22, backgroundColor: '#e07010' }} />
        </>
      )}

      {/* Rolling hills at bottom */}
      <View style={{ position: 'absolute', left: -w * 0.08, top: h * 0.81, width: w * 0.65, height: h * 0.30,
        backgroundColor: sil, borderTopLeftRadius: w * 0.45, borderTopRightRadius: w * 0.30 }} />
      <View style={{ position: 'absolute', right: -w * 0.08, top: h * 0.83, width: w * 0.60, height: h * 0.30,
        backgroundColor: sil, borderTopLeftRadius: w * 0.30, borderTopRightRadius: w * 0.42 }} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: h * 0.91, height: h * 0.12, backgroundColor: sil }} />
    </View>
  );
}

// ── Poster backgrounds ────────────────────────────────────────────────────────
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
  {
    id: 'arctic-dawn',
    name: 'Arctic Dawn',
    colors: ['#0a1628', '#1a3a5c', '#2a6090'] as const,
    accent: '#7fc8f8',
  },
  {
    id: 'ember-ash',
    name: 'Ember & Ash',
    colors: ['#1a0a00', '#3d1a00', '#6b2800'] as const,
    accent: '#ff6b35',
  },
  {
    id: 'haunted-hills',
    name: 'Haunted Hills',
    colors: ['#3d1070', '#0d0230', '#060018'] as const,
    accent: '#b07ead',
    render: _hauntedHills,
  },
];

const TITLE_COLORS = [
  { label: 'White',  value: '#f0ede8' },
  { label: 'Gold',   value: '#e6b254' },
  { label: 'Ice',    value: '#cccee0' },
  { label: 'Coral',  value: '#e06050' },
  { label: 'Mint',   value: '#4ec46e' },
];

const TITLE_SIZES: { label: string; value: PosterConfig['titleSize']; fontSize: number }[] = [
  { label: 'S',  value: 'small',  fontSize: 24 },
  { label: 'M',  value: 'medium', fontSize: 36 },
  { label: 'L',  value: 'large',  fontSize: 50 },
];

const TITLE_FONTS: { label: string; value: PosterConfig['titleFont']; family: string }[] = [
  { label: 'Display', value: 'bebas',        family: 'BebasNeue_400Regular' },
  { label: 'Bold',    value: 'manrope-bold',  family: 'Manrope_700Bold' },
  { label: 'Light',   value: 'manrope-light', family: 'Manrope_300Light' },
];

const ALIGN_OPTIONS: { label: string; value: 'left' | 'center' | 'right' }[] = [
  { label: 'L', value: 'left' },
  { label: 'C', value: 'center' },
  { label: 'R', value: 'right' },
];

const DEFAULT_CONFIG: PosterConfig = {
  backgroundID:    'noir-city',
  titlePosition:   'bottom',
  titleSize:       'large',
  titleFont:       'bebas',
  titleColor:      '#f0ede8',
  titleAlignment:  'left',
  seasonPosition:  'above-title',
  seasonAlignment: 'left',
  castPosition:    'top',
  tagline:         '',
  showSeasonNumber: true,
};

// ── Poster preview ────────────────────────────────────────────────────────────
function PosterPreview({ config, title, seasonNumber, studioName, castNames }: {
  config: PosterConfig;
  title: string;
  seasonNumber: number;
  studioName: string;
  castNames: string[];
}) {
  const bg = POSTER_BACKGROUNDS.find(b => b.id === config.backgroundID) ?? POSTER_BACKGROUNDS[0];
  const sizeEntry = TITLE_SIZES.find(s => s.value === config.titleSize) ?? TITLE_SIZES[2];
  const fontEntry = TITLE_FONTS.find(f => f.value === config.titleFont) ?? TITLE_FONTS[0];

  const titleAlign = config.titleAlignment;
  const seasonAlign = config.seasonAlignment;

  const seasonLabel = (
    config.showSeasonNumber
      ? <Text style={[st.posterSeason, { color: bg.accent, textAlign: seasonAlign }]}>
          SEASON {seasonNumber}
        </Text>
      : null
  );

  const titleText = (
    <Text
      style={[
        st.posterTitle,
        {
          color: config.titleColor,
          fontSize: sizeEntry.fontSize,
          lineHeight: sizeEntry.fontSize * (config.titleFont === 'bebas' ? 1.02 : 1.15),
          fontFamily: fontEntry.family,
          textAlign: titleAlign,
        },
      ]}
      numberOfLines={3}
    >
      {title.toUpperCase()}
    </Text>
  );

  const mainBlock = (
    <View style={[
      st.posterTextBlock,
      config.titlePosition === 'top' ? st.posterTextTop : st.posterTextBottom,
    ]}>
      {config.seasonPosition === 'above-title' && seasonLabel}
      {titleText}
      {config.seasonPosition === 'below-title' && seasonLabel}
      {config.tagline.trim().length > 0 && (
        <Text style={[st.posterTagline, { textAlign: titleAlign }]} numberOfLines={2}>
          {config.tagline}
        </Text>
      )}
    </View>
  );

  const castBlock = castNames.length > 0 ? (
    <View style={[
      st.posterCast,
      config.castPosition === 'top' ? st.posterCastTop : st.posterCastBottom,
    ]}>
      <Text style={[st.posterCastText, { color: bg.accent }]}>
        {castNames.join('  ·  ').toUpperCase()}
      </Text>
    </View>
  ) : null;

  return (
    <View style={st.posterFrame}>
      {/* Background — gradient or illustrated */}
      {'render' in bg && bg.render
        ? bg.render(POSTER_WIDTH, POSTER_HEIGHT)
        : <LinearGradient colors={[...bg.colors] as [string, string, ...string[]]} style={StyleSheet.absoluteFill} />
      }
      {/* Content overlay (all children are already position:absolute) */}
      <View style={StyleSheet.absoluteFill}>
        <View style={st.posterPresents}>
          <Text style={st.posterPresentsText}>{studioName.toUpperCase()} PRESENTS</Text>
        </View>
        {castBlock}
        {mainBlock}
      </View>
    </View>
  );
}

// ── Shared sub-controls ───────────────────────────────────────────────────────
function ToggleRow<T extends string>({
  options,
  value,
  onSelect,
}: {
  options: { label: string; value: T }[];
  value: T;
  onSelect: (v: T) => void;
}) {
  return (
    <View style={st.toggleRow}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt.value}
          style={[st.toggleBtn, value === opt.value && st.toggleBtnActive]}
          onPress={() => onSelect(opt.value)}
        >
          <Text style={[st.toggleBtnText, value === opt.value && st.toggleBtnTextActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function PosterCreatorScreen() {
  const router = useRouter();
  const { showID, targetWeek, targetYear } = useLocalSearchParams<{
    showID: string; targetWeek: string; targetYear: string;
  }>();

  const { shows, network, talent } = useGameStore();
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

  // Derive cast names: prefer 2 leads, fall back to 1 lead + 1 supporting
  const allTalent = talent;
  const leadNames = season.leadActorIDs
    .map(id => allTalent.find(t => t.id === id)?.name)
    .filter(Boolean) as string[];
  const supportingNames = season.supportingActorIDs
    .map(id => allTalent.find(t => t.id === id)?.name)
    .filter(Boolean) as string[];

  let castNames: string[] = [];
  if (leadNames.length >= 2) {
    castNames = leadNames.slice(0, 2);
  } else if (leadNames.length === 1 && supportingNames.length >= 1) {
    castNames = [leadNames[0], supportingNames[0]];
  } else if (leadNames.length === 1) {
    castNames = [leadNames[0]];
  }

  function update(partial: Partial<PosterConfig>) {
    setConfig(prev => ({ ...prev, ...partial }));
  }

  function handleConfirm() {
    // Inline the posterConfig save — write directly to store state
    const showID = show!.id;
    useGameStore.setState(s => ({
      shows: s.shows.map(sh => {
        if (sh.id !== showID) return sh;
        return {
          ...sh,
          seasons: sh.seasons.map((se, i) =>
            i === sh.currentSeasonIndex ? { ...se, posterConfig: config } : se,
          ),
        };
      }),
    }));
    useGameStore.getState().setAirDate(showID, Number(targetWeek), Number(targetYear));
    router.back();
  }

  function handleSkip() {
    useGameStore.getState().setAirDate(show!.id, Number(targetWeek), Number(targetYear));
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

          {/* Centered preview */}
          <View style={st.previewCenter}>
            <PosterPreview
              config={config}
              title={show.title}
              seasonNumber={seasonNumber}
              studioName={network.name}
              castNames={castNames}
            />
          </View>

          {/* Background picker */}
          <Text style={st.sectionLabel}>BACKGROUND</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.bgScroll} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
            {POSTER_BACKGROUNDS.map(bg => {
              const selected = config.backgroundID === bg.id;
              return (
                <TouchableOpacity key={bg.id} onPress={() => update({ backgroundID: bg.id })} activeOpacity={0.8}>
                  <View style={[st.bgSwatch, selected && { borderColor: C.gold, borderWidth: 2 }, { overflow: 'hidden' }]}>
                    {'render' in bg && bg.render
                      ? bg.render(64, 96)
                      : <LinearGradient colors={[...bg.colors] as [string, string, ...string[]]} style={StyleSheet.absoluteFill} />
                    }
                  </View>
                  <Text style={[st.bgLabel, selected && { color: C.gold }]}>{bg.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Title position */}
          <Text style={st.sectionLabel}>TITLE POSITION</Text>
          <ToggleRow
            options={[{ label: 'TOP', value: 'top' }, { label: 'BOTTOM', value: 'bottom' }]}
            value={config.titlePosition}
            onSelect={v => update({ titlePosition: v })}
          />

          {/* Title font */}
          <Text style={st.sectionLabel}>TITLE FONT</Text>
          <ToggleRow
            options={TITLE_FONTS.map(f => ({ label: f.label, value: f.value }))}
            value={config.titleFont}
            onSelect={v => update({ titleFont: v })}
          />

          {/* Title size */}
          <Text style={st.sectionLabel}>TITLE SIZE</Text>
          <ToggleRow
            options={TITLE_SIZES.map(s => ({ label: s.label, value: s.value }))}
            value={config.titleSize}
            onSelect={v => update({ titleSize: v })}
          />

          {/* Title alignment */}
          <Text style={st.sectionLabel}>TITLE ALIGNMENT</Text>
          <ToggleRow
            options={ALIGN_OPTIONS}
            value={config.titleAlignment}
            onSelect={v => update({ titleAlignment: v })}
          />

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

          {/* Season number */}
          <View style={st.switchRow}>
            <Text style={st.switchLabel}>Show Season Number</Text>
            <Switch
              value={config.showSeasonNumber}
              onValueChange={v => update({ showSeasonNumber: v })}
              trackColor={{ false: C.border, true: C.gold + '88' }}
              thumbColor={config.showSeasonNumber ? C.gold : C.mutedMid}
            />
          </View>

          {config.showSeasonNumber && (
            <>
              <Text style={st.sectionLabel}>SEASON NUMBER POSITION</Text>
              <ToggleRow
                options={[{ label: 'ABOVE TITLE', value: 'above-title' }, { label: 'BELOW TITLE', value: 'below-title' }]}
                value={config.seasonPosition}
                onSelect={v => update({ seasonPosition: v })}
              />
              <Text style={st.sectionLabel}>SEASON NUMBER ALIGNMENT</Text>
              <ToggleRow
                options={ALIGN_OPTIONS}
                value={config.seasonAlignment}
                onSelect={v => update({ seasonAlignment: v })}
              />
            </>
          )}

          {/* Cast billing */}
          {castNames.length > 0 && (
            <>
              <Text style={st.sectionLabel}>CAST BILLING POSITION</Text>
              <ToggleRow
                options={[{ label: 'TOP', value: 'top' }, { label: 'BOTTOM', value: 'bottom' }]}
                value={config.castPosition}
                onSelect={v => update({ castPosition: v })}
              />
            </>
          )}

          {/* Tagline */}
          <Text style={st.sectionLabel}>TAGLINE (OPTIONAL)</Text>
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
  safeArea:  { flex: 1 },
  container: { flex: 1, backgroundColor: C.pageBg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  skipText:    { fontFamily: F.bodyMd, color: C.muted, fontSize: 14 },
  headerTitle: { fontFamily: F.display, color: C.text, fontSize: 24, letterSpacing: 3 },

  scroll:        { flex: 1 },
  scrollContent: { paddingBottom: 24 },

  // ── Centered preview ─────────────────────────────────────────────────────────
  previewCenter: {
    alignItems: 'center', paddingVertical: 24,
  },
  posterFrame: {
    width: POSTER_WIDTH, height: POSTER_HEIGHT,
    borderRadius: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6, shadowRadius: 20, elevation: 16,
  },
  posterGradient: { flex: 1 },

  // Studio presents strip
  posterPresents: {
    position: 'absolute', top: 10, left: 0, right: 0, alignItems: 'center',
  },
  posterPresentsText: {
    fontFamily: F.bodyMd, color: '#ffffff88', fontSize: 8, letterSpacing: 2,
  },

  // Cast billing
  posterCast: {
    position: 'absolute', left: 12, right: 12,
  },
  posterCastTop:    { top: 28 },
  posterCastBottom: { bottom: 10 },
  posterCastText: {
    fontFamily: F.bodyBd, fontSize: 8, letterSpacing: 1.5, textAlign: 'center',
  },

  // Title block
  posterTextBlock:  { position: 'absolute', left: 12, right: 12 },
  posterTextTop:    { top: 48 },
  posterTextBottom: { bottom: 20 },
  posterTitle:      { letterSpacing: 1 },
  posterSeason: {
    fontFamily: F.bodyXBd, fontSize: 8, letterSpacing: 2,
    marginBottom: 3, marginTop: 3,
  },
  posterTagline: {
    fontFamily: F.bodyMd, color: '#ffffffaa', fontSize: 9,
    marginTop: 5, lineHeight: 13, letterSpacing: 0.3,
  },

  // ── Controls ─────────────────────────────────────────────────────────────────
  sectionLabel: {
    fontFamily: F.bodyXBd, color: C.muted, fontSize: 10,
    letterSpacing: 1.5, paddingHorizontal: 16, marginTop: 20, marginBottom: 10,
  },

  bgScroll: { marginBottom: 4 },
  bgSwatch: {
    width: 64, height: 96, borderRadius: 8,
    borderWidth: 1, borderColor: C.border,
  },
  bgLabel: { fontFamily: F.bodyMd, color: C.mutedMid, fontSize: 10, textAlign: 'center', marginTop: 5 },

  toggleRow:           { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  toggleBtn:           { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.cardBg, alignItems: 'center' },
  toggleBtnActive:     { borderColor: C.gold, backgroundColor: C.goldDim },
  toggleBtnText:       { fontFamily: F.bodyBd, color: C.mutedMid, fontSize: 12 },
  toggleBtnTextActive: { color: C.gold },

  colorRow:            { flexDirection: 'row', gap: 14, paddingHorizontal: 16 },
  colorSwatch:         { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'transparent' },
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
