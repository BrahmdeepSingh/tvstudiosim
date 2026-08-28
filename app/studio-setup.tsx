import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Dimensions, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState, useMemo } from 'react';
import { useGameStore } from '../src/store/gameStore';
import { LogoConfig } from '../src/types';
import { hap } from '../src/utils/haptics';

const { width: W } = Dimensions.get('window');

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  pageBg:   '#0f1220',
  cardBg:   '#191c2a',
  cardBg2:  '#1d2035',
  border:   '#252840',
  text:     '#f0ede8',
  muted:    '#9a958e',
  mutedMid: '#6b6880',
  gold:     '#e6b254',
  goldDim:  '#e6b25420',
  goldText: '#161008',
  green:    '#4ec46e',
  red:      '#c43820',
};

const F = {
  display: 'BebasNeue_400Regular',
  body:    'Manrope_400Regular',
  bodyMd:  'Manrope_600SemiBold',
  bodyBd:  'Manrope_700Bold',
  bodyXBd: 'Manrope_800ExtraBold',
};

// ── Logo colors ───────────────────────────────────────────────────────────────
const BG_COLORS = [
  { id: 'gold',    color: '#e6b254' },
  { id: 'red',     color: '#c43820' },
  { id: 'blue',    color: '#3b6fd4' },
  { id: 'green',   color: '#2da85e' },
  { id: 'purple',  color: '#8b4fbd' },
  { id: 'teal',    color: '#2aa89a' },
  { id: 'orange',  color: '#d4753a' },
  { id: 'navy',    color: '#1a2a5e' },
  { id: 'maroon',  color: '#7a1f38' },
  { id: 'slate',   color: '#3a4a6a' },
];

const TEXT_COLORS = [
  { id: 'dark',  color: '#0f1220' },
  { id: 'white', color: '#f0ede8' },
  { id: 'gold',  color: '#e6b254' },
  { id: 'cream', color: '#f5e6c8' },
];

// ── Logo icons (drawn with Views) ─────────────────────────────────────────────
export type IconID =
  | 'star' | 'crown' | 'bolt' | 'flame' | 'eye'
  | 'shield' | 'trophy' | 'diamond' | 'play' | 'film';

const ICONS: { id: IconID; label: string }[] = [
  { id: 'star',    label: 'Star'    },
  { id: 'crown',   label: 'Crown'   },
  { id: 'bolt',    label: 'Bolt'    },
  { id: 'flame',   label: 'Flame'   },
  { id: 'eye',     label: 'Eye'     },
  { id: 'shield',  label: 'Shield'  },
  { id: 'trophy',  label: 'Trophy'  },
  { id: 'diamond', label: 'Diamond' },
  { id: 'play',    label: 'Play'    },
  { id: 'film',    label: 'Film'    },
];

// ── Icon renderer (pure Views, no image assets) ───────────────────────────────
export function LogoIcon({ id, size, color }: { id: IconID | null; size: number; color: string }) {
  if (!id) return null;
  const s = size;
  const c = color;

  switch (id) {
    case 'star': {
      // 5-pointed star approximation using two overlaid triangles
      const tip = s * 0.5;
      const half = s * 0.44;
      const h1 = s * 0.82;
      const h2 = s * 0.32;
      return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
          {/* Up triangle */}
          <View style={{ position: 'absolute', width: 0, height: 0,
            borderLeftWidth: half, borderRightWidth: half, borderBottomWidth: h1,
            borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: c,
            top: s * 0.05 }} />
          {/* Down triangle */}
          <View style={{ position: 'absolute', width: 0, height: 0,
            borderLeftWidth: half * 0.95, borderRightWidth: half * 0.95, borderTopWidth: h2,
            borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: c,
            top: s * 0.34 }} />
        </View>
      );
    }
    case 'crown': {
      return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
          {/* Base bar */}
          <View style={{ position: 'absolute', bottom: s * 0.12, left: s * 0.1, right: s * 0.1, height: s * 0.22, backgroundColor: c, borderRadius: 2 }} />
          {/* Left spike */}
          <View style={{ position: 'absolute', bottom: s * 0.32, left: s * 0.1, width: 0, height: 0,
            borderLeftWidth: s * 0.14, borderRightWidth: s * 0.14, borderBottomWidth: s * 0.36,
            borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: c }} />
          {/* Center spike (tallest) */}
          <View style={{ position: 'absolute', bottom: s * 0.32, left: s * 0.5 - s * 0.14, width: 0, height: 0,
            borderLeftWidth: s * 0.14, borderRightWidth: s * 0.14, borderBottomWidth: s * 0.48,
            borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: c }} />
          {/* Right spike */}
          <View style={{ position: 'absolute', bottom: s * 0.32, right: s * 0.1, width: 0, height: 0,
            borderLeftWidth: s * 0.14, borderRightWidth: s * 0.14, borderBottomWidth: s * 0.36,
            borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: c }} />
        </View>
      );
    }
    case 'bolt': {
      return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
          {/* Top half of bolt */}
          <View style={{ position: 'absolute', top: s * 0.04, left: s * 0.34, width: s * 0.36, height: s * 0.46, backgroundColor: c, borderTopLeftRadius: 2,
            transform: [{ skewX: '-14deg' }] }} />
          {/* Bottom half of bolt */}
          <View style={{ position: 'absolute', bottom: s * 0.04, right: s * 0.22, width: s * 0.38, height: s * 0.46, backgroundColor: c, borderBottomRightRadius: 2,
            transform: [{ skewX: '-14deg' }] }} />
          {/* Cutout notch */}
          <View style={{ position: 'absolute', top: s * 0.38, left: s * 0.27, width: s * 0.26, height: s * 0.16, backgroundColor: 'transparent', borderTopWidth: s * 0.16, borderRightWidth: s * 0.26,
            borderTopColor: 'transparent', borderRightColor: 'transparent' }} />
        </View>
      );
    }
    case 'flame': {
      return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
          {/* Outer flame body */}
          <View style={{ position: 'absolute', bottom: s * 0.06, width: s * 0.54, height: s * 0.72,
            backgroundColor: c, borderTopLeftRadius: s * 0.28, borderTopRightRadius: s * 0.28,
            borderBottomLeftRadius: s * 0.16, borderBottomRightRadius: s * 0.16 }} />
          {/* Inner cutout (dark) to create hollow effect */}
          <View style={{ position: 'absolute', bottom: s * 0.22, width: s * 0.26, height: s * 0.36,
            backgroundColor: C.pageBg, borderRadius: s * 0.13 }} />
        </View>
      );
    }
    case 'eye': {
      return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
          {/* Eye outline */}
          <View style={{ width: s * 0.82, height: s * 0.42, borderRadius: s * 0.21,
            backgroundColor: c, alignItems: 'center', justifyContent: 'center' }}>
            {/* Pupil */}
            <View style={{ width: s * 0.28, height: s * 0.28, borderRadius: s * 0.14, backgroundColor: C.pageBg }} />
          </View>
        </View>
      );
    }
    case 'shield': {
      return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
          {/* Shield top (rectangle) */}
          <View style={{ position: 'absolute', top: s * 0.1, left: s * 0.14, right: s * 0.14, height: s * 0.55, backgroundColor: c, borderTopLeftRadius: 6, borderTopRightRadius: 6 }} />
          {/* Shield bottom (point) */}
          <View style={{ position: 'absolute', bottom: s * 0.06, width: 0, height: 0,
            borderLeftWidth: s * 0.36, borderRightWidth: s * 0.36, borderTopWidth: s * 0.34,
            borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: c }} />
        </View>
      );
    }
    case 'trophy': {
      return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
          {/* Cup body */}
          <View style={{ position: 'absolute', top: s * 0.08, left: s * 0.18, right: s * 0.18, height: s * 0.44,
            backgroundColor: c, borderBottomLeftRadius: s * 0.22, borderBottomRightRadius: s * 0.22 }} />
          {/* Stem */}
          <View style={{ position: 'absolute', top: s * 0.5, left: s * 0.41, right: s * 0.41, height: s * 0.2, backgroundColor: c }} />
          {/* Base */}
          <View style={{ position: 'absolute', bottom: s * 0.1, left: s * 0.22, right: s * 0.22, height: s * 0.14, backgroundColor: c, borderRadius: 3 }} />
          {/* Left handle */}
          <View style={{ position: 'absolute', top: s * 0.16, left: s * 0.06, width: s * 0.14, height: s * 0.26,
            borderWidth: s * 0.06, borderColor: c, borderRadius: s * 0.08, borderRightWidth: 0 }} />
          {/* Right handle */}
          <View style={{ position: 'absolute', top: s * 0.16, right: s * 0.06, width: s * 0.14, height: s * 0.26,
            borderWidth: s * 0.06, borderColor: c, borderRadius: s * 0.08, borderLeftWidth: 0 }} />
        </View>
      );
    }
    case 'diamond': {
      return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: s * 0.62, height: s * 0.62, backgroundColor: c, transform: [{ rotate: '45deg' }], borderRadius: 3 }} />
        </View>
      );
    }
    case 'play': {
      return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 0, height: 0,
            borderTopWidth: s * 0.36, borderBottomWidth: s * 0.36, borderLeftWidth: s * 0.60,
            borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: c,
            marginLeft: s * 0.08 }} />
        </View>
      );
    }
    case 'film': {
      return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
          {/* Film strip rectangle */}
          <View style={{ width: s * 0.8, height: s * 0.52, backgroundColor: c, borderRadius: 3, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 3, paddingHorizontal: 5 }}>
            {/* Perforations */}
            {[0,1,2,3].map(i => (
              <View key={i} style={{ width: s * 0.08, height: s * 0.12, backgroundColor: C.pageBg, borderRadius: 1 }} />
            ))}
          </View>
          {/* Top perf strip */}
          <View style={{ position: 'absolute', top: s * 0.14, left: s * 0.1, right: s * 0.1, height: s * 0.1, backgroundColor: c, borderRadius: 2 }} />
          {/* Bottom perf strip */}
          <View style={{ position: 'absolute', bottom: s * 0.14, left: s * 0.1, right: s * 0.1, height: s * 0.1, backgroundColor: c, borderRadius: 2 }} />
        </View>
      );
    }
    default:
      return null;
  }
}

// ── Logo Badge preview ────────────────────────────────────────────────────────
function LogoBadge({ size, initials, config }: { size: number; initials: string; config: LogoConfig }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: config.bgColor,
      borderWidth: size * 0.04,
      borderColor: config.textColor + '55',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {config.iconID ? (
        <LogoIcon id={config.iconID as IconID} size={size * 0.52} color={config.textColor} />
      ) : (
        <Text style={{ fontFamily: F.display, color: config.textColor, fontSize: size * 0.33, letterSpacing: size * 0.015 }}>
          {initials || '??'}
        </Text>
      )}
    </View>
  );
}

// ── Game mode data ────────────────────────────────────────────────────────────
const MODES = [
  { id: 'easy',   label: 'Easy',   cash: 50_000_000, desc: 'Deep pockets. Take risks, build your legacy.' },
  { id: 'normal', label: 'Normal', cash: 15_000_000, desc: 'The real Hollywood hustle. Every dollar counts.' },
  { id: 'hard',   label: 'Hard',   cash: 5_000_000,  desc: 'No safety net. One bad season ends everything.' },
] as const;

function fmtCash(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

function autoInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// ── Step indicator ────────────────────────────────────────────────────────────
function StepDots({ step }: { step: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <View key={i} style={{
          width: i === step ? 22 : 8, height: 8, borderRadius: 4,
          backgroundColor: i === step ? C.gold : C.border,
        }} />
      ))}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function StudioSetup() {
  const router = useRouter();
  const { initializeGame } = useGameStore();

  const [step, setStep] = useState(0);

  // Step 0 state
  const [studioName, setStudioName] = useState('');
  const [initialsOverride, setInitialsOverride] = useState('');

  // Step 1 state
  const [logoBg, setLogoBg]     = useState(BG_COLORS[0].color);
  const [logoIcon, setLogoIcon] = useState<IconID | null>(null);
  const [logoText, setLogoText] = useState(TEXT_COLORS[0].color);

  // Step 2 state
  const [mode, setMode] = useState<'easy' | 'normal' | 'hard'>('normal');

  const displayInitials = useMemo(() => {
    const override = initialsOverride.trim().toUpperCase().slice(0, 2);
    return override || autoInitials(studioName);
  }, [studioName, initialsOverride]);

  const logoConfig: LogoConfig = { bgColor: logoBg, iconID: logoIcon, textColor: logoText };

  function handleNext() {
    hap.light();
    setStep(s => s + 1);
  }

  function handleBack() {
    hap.light();
    setStep(s => s - 1);
  }

  function handleFound() {
    hap.medium();
    const modeData = MODES.find(m => m.id === mode)!;
    initializeGame(studioName.trim(), displayInitials, modeData.cash, logoConfig);
    router.replace('/(tabs)');
  }

  return (
    <LinearGradient colors={['#141726', '#0c0f1a', '#070a12']} style={{ flex: 1 }}>
      <SafeAreaView edges={['top', 'bottom']} style={ss.root}>

        {/* Header */}
        <View style={ss.header}>
          <Text style={ss.wordmark}>TV STUDIO SIM</Text>
          <StepDots step={step} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {step === 0 && (
            <Step0
              studioName={studioName}
              setStudioName={setStudioName}
              initialsOverride={initialsOverride}
              setInitialsOverride={setInitialsOverride}
              displayInitials={displayInitials}
              logoConfig={logoConfig}
              onNext={handleNext}
            />
          )}
          {step === 1 && (
            <Step1
              bgColors={BG_COLORS}
              textColors={TEXT_COLORS}
              logoBg={logoBg}
              setLogoBg={setLogoBg}
              logoIcon={logoIcon}
              setLogoIcon={setLogoIcon}
              logoText={logoText}
              setLogoText={setLogoText}
              displayInitials={displayInitials}
              logoConfig={logoConfig}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          {step === 2 && (
            <Step2
              studioName={studioName.trim() || 'Your Studio'}
              displayInitials={displayInitials}
              logoConfig={logoConfig}
              mode={mode}
              setMode={setMode}
              onFound={handleFound}
              onBack={handleBack}
            />
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ── Step 0: Name ──────────────────────────────────────────────────────────────
function Step0({ studioName, setStudioName, initialsOverride, setInitialsOverride, displayInitials, logoConfig, onNext }: {
  studioName: string; setStudioName: (v: string) => void;
  initialsOverride: string; setInitialsOverride: (v: string) => void;
  displayInitials: string; logoConfig: LogoConfig; onNext: () => void;
}) {
  const canProceed = studioName.trim().length > 0;

  return (
    <ScrollView contentContainerStyle={ss.stepContent} keyboardShouldPersistTaps="handled">
      <Text style={ss.stepTitle}>NAME YOUR STUDIO</Text>
      <Text style={ss.stepSub}>This is how you'll be known in the industry.</Text>

      {/* Live preview badge */}
      <View style={ss.previewRow}>
        <LogoBadge size={90} initials={displayInitials} config={logoConfig} />
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={ss.previewName} numberOfLines={2}>
            {studioName.trim() || 'YOUR STUDIO'}
          </Text>
          <Text style={ss.previewSub}>Independent · Year 1</Text>
        </View>
      </View>

      {/* Studio name input */}
      <View style={ss.fieldBlock}>
        <Text style={ss.fieldLabel}>STUDIO NAME</Text>
        <TextInput
          style={ss.nameInput}
          value={studioName}
          onChangeText={setStudioName}
          placeholder="e.g. Apex Television"
          placeholderTextColor={C.mutedMid}
          maxLength={40}
          autoFocus
          returnKeyType="next"
        />
      </View>

      {/* Initials override */}
      <View style={ss.fieldBlock}>
        <Text style={ss.fieldLabel}>INITIALS (auto-generated · tap to override)</Text>
        <TextInput
          style={[ss.initialsInput]}
          value={initialsOverride}
          onChangeText={t => setInitialsOverride(t.toUpperCase().slice(0, 2))}
          placeholder={displayInitials || 'AT'}
          placeholderTextColor={C.mutedMid}
          maxLength={2}
          autoCapitalize="characters"
        />
      </View>

      <TouchableOpacity
        style={[ss.nextBtn, !canProceed && ss.nextBtnDisabled]}
        onPress={canProceed ? onNext : undefined}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={canProceed ? ['#f0c060', '#c49440'] : [C.border, C.border]}
          style={ss.nextBtnGrad}
        >
          <Text style={[ss.nextBtnText, !canProceed && { color: C.mutedMid }]}>
            DESIGN LOGO →
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Step 1: Logo Builder ──────────────────────────────────────────────────────
function Step1({ bgColors, textColors, logoBg, setLogoBg, logoIcon, setLogoIcon, logoText, setLogoText, displayInitials, logoConfig, onNext, onBack }: {
  bgColors: typeof BG_COLORS; textColors: typeof TEXT_COLORS;
  logoBg: string; setLogoBg: (v: string) => void;
  logoIcon: IconID | null; setLogoIcon: (v: IconID | null) => void;
  logoText: string; setLogoText: (v: string) => void;
  displayInitials: string; logoConfig: LogoConfig;
  onNext: () => void; onBack: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={ss.stepContent}>
      <Text style={ss.stepTitle}>DESIGN YOUR LOGO</Text>
      <Text style={ss.stepSub}>Build the emblem your studio will be known by.</Text>

      {/* Live preview */}
      <View style={ss.logoBigPreview}>
        <LogoBadge size={120} initials={displayInitials} config={logoConfig} />
      </View>

      {/* Background color */}
      <View style={ss.builderSection}>
        <Text style={ss.builderLabel}>BACKGROUND COLOR</Text>
        <View style={ss.swatchRow}>
          {bgColors.map(bc => (
            <TouchableOpacity
              key={bc.id}
              onPress={() => { hap.light(); setLogoBg(bc.color); }}
              style={[ss.swatch, { backgroundColor: bc.color },
                bc.color === logoBg && ss.swatchSelected]}
            />
          ))}
        </View>
      </View>

      {/* Icon selection */}
      <View style={ss.builderSection}>
        <Text style={ss.builderLabel}>EMBLEM</Text>
        <View style={ss.iconGrid}>
          {/* "None" option = initials only */}
          <TouchableOpacity
            onPress={() => { hap.light(); setLogoIcon(null); }}
            style={[ss.iconCell, logoIcon === null && ss.iconCellSelected]}
          >
            <Text style={[ss.iconNoneText, { color: logoIcon === null ? C.gold : C.mutedMid }]}>
              AB
            </Text>
            <Text style={[ss.iconCellLabel, { color: logoIcon === null ? C.gold : C.mutedMid }]}>
              Initials
            </Text>
          </TouchableOpacity>

          {ICONS.map(icon => (
            <TouchableOpacity
              key={icon.id}
              onPress={() => { hap.light(); setLogoIcon(icon.id); }}
              style={[ss.iconCell, logoIcon === icon.id && ss.iconCellSelected]}
            >
              <LogoIcon id={icon.id} size={32} color={logoIcon === icon.id ? C.gold : C.muted} />
              <Text style={[ss.iconCellLabel, { color: logoIcon === icon.id ? C.gold : C.mutedMid }]}>
                {icon.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Text / icon color */}
      <View style={ss.builderSection}>
        <Text style={ss.builderLabel}>TEXT COLOR</Text>
        <View style={ss.swatchRow}>
          {textColors.map(tc => (
            <TouchableOpacity
              key={tc.id}
              onPress={() => { hap.light(); setLogoText(tc.color); }}
              style={[ss.swatch, { backgroundColor: tc.color },
                tc.color === logoText && ss.swatchSelected]}
            />
          ))}
        </View>
      </View>

      {/* Nav buttons */}
      <View style={ss.navRow}>
        <TouchableOpacity style={ss.backBtn} onPress={onBack} activeOpacity={0.8}>
          <Text style={ss.backBtnText}>← BACK</Text>
        </TouchableOpacity>
        <TouchableOpacity style={ss.nextBtnSmall} onPress={onNext} activeOpacity={0.85}>
          <LinearGradient colors={['#f0c060', '#c49440']} style={ss.nextBtnGradSmall}>
            <Text style={ss.nextBtnText}>SELECT MODE →</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ── Step 2: Game Mode ─────────────────────────────────────────────────────────
function Step2({ studioName, displayInitials, logoConfig, mode, setMode, onFound, onBack }: {
  studioName: string; displayInitials: string; logoConfig: LogoConfig;
  mode: 'easy' | 'normal' | 'hard';
  setMode: (m: 'easy' | 'normal' | 'hard') => void;
  onFound: () => void; onBack: () => void;
}) {
  const MODE_COLORS: Record<string, string> = {
    easy:   C.green,
    normal: C.gold,
    hard:   C.red,
  };

  return (
    <ScrollView contentContainerStyle={ss.stepContent}>
      <Text style={ss.stepTitle}>SELECT GAME MODE</Text>
      <Text style={ss.stepSub}>How much pressure do you want from day one?</Text>

      {/* Studio summary */}
      <View style={ss.previewRow}>
        <LogoBadge size={64} initials={displayInitials} config={logoConfig} />
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={ss.previewName} numberOfLines={1}>{studioName.toUpperCase()}</Text>
          <Text style={ss.previewSub}>Ready to launch</Text>
        </View>
      </View>

      {/* Mode cards */}
      {MODES.map(m => {
        const selected = mode === m.id;
        const accentColor = MODE_COLORS[m.id];
        return (
          <TouchableOpacity
            key={m.id}
            style={[ss.modeCard,
              selected && { borderColor: accentColor, backgroundColor: accentColor + '12' }]}
            onPress={() => { hap.light(); setMode(m.id); }}
            activeOpacity={0.8}
          >
            <View style={ss.modeCardTop}>
              <Text style={[ss.modeLabel, { color: selected ? accentColor : C.text }]}>
                {m.label.toUpperCase()}
              </Text>
              <Text style={[ss.modeCash, { color: selected ? accentColor : C.gold }]}>
                {fmtCash(m.cash)}
              </Text>
            </View>
            <Text style={ss.modeDesc}>{m.desc}</Text>
            {selected && (
              <View style={[ss.modeSelectedDot, { backgroundColor: accentColor }]} />
            )}
          </TouchableOpacity>
        );
      })}

      {/* Nav */}
      <View style={ss.navRow}>
        <TouchableOpacity style={ss.backBtn} onPress={onBack} activeOpacity={0.8}>
          <Text style={ss.backBtnText}>← BACK</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={ss.foundBtn} onPress={onFound} activeOpacity={0.85}>
        <LinearGradient colors={['#f0c060', '#c49440']} style={ss.nextBtnGrad}>
          <Text style={ss.foundBtnText}>
            FOUND {studioName.toUpperCase().slice(0, 20)}  ▶
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  root:        { flex: 1 },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                 paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  wordmark:    { fontFamily: F.display, color: C.gold, fontSize: 22, letterSpacing: 4 },

  stepContent: { padding: 20, paddingBottom: 40 },
  stepTitle:   { fontFamily: F.display, color: C.text, fontSize: 34, letterSpacing: 2, marginBottom: 6 },
  stepSub:     { fontFamily: F.body, color: C.muted, fontSize: 13, lineHeight: 19, marginBottom: 28 },

  // Preview row
  previewRow:  { flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardBg,
                 borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 28 },
  previewName: { fontFamily: F.display, color: C.text, fontSize: 22, letterSpacing: 2 },
  previewSub:  { fontFamily: F.bodyMd, color: C.mutedMid, fontSize: 10, letterSpacing: 1.5, marginTop: 4 },

  // Fields
  fieldBlock:  { marginBottom: 20 },
  fieldLabel:  { fontFamily: F.bodyBd, color: C.mutedMid, fontSize: 9, letterSpacing: 2, marginBottom: 8 },
  nameInput:   { backgroundColor: C.cardBg, borderRadius: 12, borderWidth: 1, borderColor: C.border,
                 color: C.text, fontFamily: F.bodyBd, fontSize: 18, paddingHorizontal: 16, paddingVertical: 14 },
  initialsInput:{ backgroundColor: C.cardBg, borderRadius: 12, borderWidth: 1, borderColor: C.border,
                  color: C.text, fontFamily: F.display, fontSize: 24, letterSpacing: 8,
                  paddingHorizontal: 20, paddingVertical: 12, width: 100 },

  // Buttons
  nextBtn:         { marginTop: 8, borderRadius: 999 },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnGrad:     { paddingVertical: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  nextBtnText:     { fontFamily: F.display, color: C.goldText, fontSize: 16, letterSpacing: 3 },
  nextBtnSmall:    { flex: 1, borderRadius: 999 },
  nextBtnGradSmall:{ paddingVertical: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },

  navRow:    { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 12, alignItems: 'center' },
  backBtn:   { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 999, borderWidth: 1, borderColor: C.border },
  backBtnText:{ fontFamily: F.bodyBd, color: C.muted, fontSize: 12, letterSpacing: 2 },

  // Logo builder
  logoBigPreview: { alignItems: 'center', marginBottom: 28 },
  builderSection: { marginBottom: 22 },
  builderLabel:   { fontFamily: F.bodyBd, color: C.mutedMid, fontSize: 9, letterSpacing: 2, marginBottom: 12 },

  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch:    { width: 38, height: 38, borderRadius: 19 },
  swatchSelected: { borderWidth: 3, borderColor: C.text },

  iconGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  iconCell:     { width: (W - 40 - 10 * 4) / 5, aspectRatio: 1, backgroundColor: C.cardBg,
                  borderRadius: 12, borderWidth: 1, borderColor: C.border,
                  alignItems: 'center', justifyContent: 'center', gap: 4 },
  iconCellSelected: { borderColor: C.gold, backgroundColor: C.goldDim },
  iconNoneText: { fontFamily: F.display, fontSize: 14, letterSpacing: 2 },
  iconCellLabel:{ fontFamily: F.bodyBd, fontSize: 8, letterSpacing: 0.5 },

  // Mode cards
  modeCard:    { backgroundColor: C.cardBg, borderRadius: 16, borderWidth: 1.5, borderColor: C.border,
                 padding: 18, marginBottom: 12, position: 'relative' },
  modeCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  modeLabel:   { fontFamily: F.display, fontSize: 26, letterSpacing: 2 },
  modeCash:    { fontFamily: F.display, fontSize: 22, letterSpacing: 1 },
  modeDesc:    { fontFamily: F.body, color: C.muted, fontSize: 13, lineHeight: 19 },
  modeSelectedDot: { position: 'absolute', top: 12, right: 12, width: 10, height: 10, borderRadius: 5 },

  foundBtn:    { borderRadius: 999, marginTop: 8 },
  foundBtnText:{ fontFamily: F.display, color: C.goldText, fontSize: 15, letterSpacing: 2 },
});
