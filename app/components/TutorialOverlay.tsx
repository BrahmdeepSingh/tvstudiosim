import { useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Dimensions, Platform,
} from 'react-native';
import { usePathname } from 'expo-router';
import { useTutorialStore, STEP_CONFIG, TutorialStep, TargetRect } from '../../src/store/tutorialStore';

const { width: W, height: H } = Dimensions.get('window');
const DIM = '#0a0c18e8';
const TOOLTIP_MARGIN = 16;
const TOOLTIP_GAP    = 14;

const C = {
  card:   '#12162a',
  border: '#e6b25440',
  gold:   '#e6b254',
  text:   '#f0ede8',
  muted:  '#9a958e',
  mutedDim: '#5a566a',
};
const F = {
  display: 'BebasNeue_400Regular',
  body:    'Manrope_400Regular',
  bodyMd:  'Manrope_600SemiBold',
  bodyBd:  'Manrope_700Bold',
};

const STEP_ORDER: Exclude<TutorialStep, 'done'>[] = [
  'dashboard', 'create-show', 'casting', 'show-writing',
  'scheduling', 'boost-zone', 'marketing', 'episode-aired', 'social-buzz',
];

// ── Pulsing gold border on the spotlight target ───────────────────────────────
function SpotlightBorder({ rect }: { rect: TargetRect }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 600, useNativeDriver: false }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [rect.x, rect.y]);

  const borderColor = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: ['#e6b254aa', '#e6b254ff'],
  });

  const RADIUS = 12;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top:    rect.y - 2,
        left:   rect.x - 2,
        width:  rect.w + 4,
        height: rect.h + 4,
        borderRadius: RADIUS,
        borderWidth: 2.5,
        borderColor,
        backgroundColor: 'transparent',
      }}
    />
  );
}

// ── 4-rect spotlight (hole-punch effect) ─────────────────────────────────────
function Spotlight({ rect }: { rect: TargetRect }) {
  return (
    <>
      {/* top */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: rect.y, backgroundColor: DIM }} pointerEvents="none" />
      {/* bottom */}
      <View style={{ position: 'absolute', top: rect.y + rect.h, left: 0, right: 0, bottom: 0, backgroundColor: DIM }} pointerEvents="none" />
      {/* left */}
      <View style={{ position: 'absolute', top: rect.y, left: 0, width: rect.x, height: rect.h, backgroundColor: DIM }} pointerEvents="none" />
      {/* right */}
      <View style={{ position: 'absolute', top: rect.y, left: rect.x + rect.w, right: 0, height: rect.h, backgroundColor: DIM }} pointerEvents="none" />
      <SpotlightBorder rect={rect} />
    </>
  );
}

// ── Full dim (no spotlight target) ────────────────────────────────────────────
function FullDim() {
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: DIM }]} pointerEvents="none" />;
}

// ── Tooltip card ──────────────────────────────────────────────────────────────
function Tooltip({
  step, stepIdx, total, rect, fadeAnim, slideAnim, onNext, onSkip,
}: {
  step: Exclude<TutorialStep, 'done'>;
  stepIdx: number;
  total: number;
  rect: TargetRect | null;
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
  onNext: () => void;
  onSkip: () => void;
}) {
  const config = STEP_CONFIG[step];

  // Smart placement: if target is in bottom half of screen, tooltip goes above; else below.
  const posStyle = useMemo((): object => {
    if (!rect) {
      // No spotlight — pin to bottom
      return { bottom: Platform.OS === 'web' ? 40 : 56 };
    }
    const targetCenter = rect.y + rect.h / 2;
    if (targetCenter > H * 0.52) {
      // Target in lower half → tooltip above it
      const bottom = H - rect.y + TOOLTIP_GAP;
      return { bottom: Math.min(bottom, H - 120) };
    } else {
      // Target in upper half → tooltip below it
      const top = rect.y + rect.h + TOOLTIP_GAP;
      return { top: Math.min(top, H - 220) };
    }
  }, [rect]);

  return (
    <Animated.View
      style={[
        styles.tooltip,
        posStyle,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
      pointerEvents="box-none"
    >
      {/* Step counter + dot progress */}
      <View style={styles.counterRow}>
        <Text style={styles.counterText}>{stepIdx + 1} / {total}</Text>
        <View style={styles.dots}>
          {Array.from({ length: total }).map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === stepIdx ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>
      </View>

      <Text style={styles.title}>{config.title}</Text>
      <Text style={styles.body}>{config.body}</Text>

      <View style={styles.actions}>
        <TouchableOpacity onPress={onSkip} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.skipBtn}>Skip tutorial</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.nextBtn} onPress={onNext} activeOpacity={0.82}>
          <Text style={styles.nextBtnText}>
            {stepIdx + 1 < total ? 'NEXT  →' : 'GOT IT  ✓'}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ── Main overlay ──────────────────────────────────────────────────────────────
export function TutorialOverlay() {
  const { active, step, targetRect, advance, skip } = useTutorialStore();
  const pathname = usePathname();

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const config = step !== 'done'
    ? STEP_CONFIG[step as Exclude<TutorialStep, 'done'>]
    : null;

  const routeMatch = config ? matchesRoute(pathname, config.route) : false;
  const visible = active && routeMatch;

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start();
    }
  }, [visible, step]);

  if (!visible || !config || step === 'done') return null;

  const stepIdx = STEP_ORDER.indexOf(step as Exclude<TutorialStep, 'done'>);
  const total   = STEP_ORDER.length;
  const typedStep = step as Exclude<TutorialStep, 'done'>;

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim }]} pointerEvents="box-none">
      {targetRect
        ? <Spotlight rect={targetRect} />
        : <FullDim />
      }

      <Tooltip
        step={typedStep}
        stepIdx={stepIdx}
        total={total}
        rect={targetRect}
        fadeAnim={fadeAnim}
        slideAnim={slideAnim}
        onNext={advance}
        onSkip={skip}
      />
    </Animated.View>
  );
}

function matchesRoute(pathname: string, configRoute: string): boolean {
  const norm = (p: string) => p.replace(/\/$/, '') || '/';
  const p = norm(pathname);
  const r = norm(configRoute);
  if (p === r) return true;
  if (r === '/(tabs)') {
    return (
      p === '/' || p === '/index' ||
      p === '/(tabs)' || p === '/(tabs)/index' ||
      p === '/(tabs)/financials' || // allow on any tab
      p.startsWith('/(tabs)')
    );
  }
  // Partial prefix match for parameterized routes (e.g. /hire-talent?...)
  if (p.startsWith(r)) return true;
  return false;
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 999,
  },

  tooltip: {
    position: 'absolute',
    left: TOOLTIP_MARGIN,
    right: TOOLTIP_MARGIN,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 30,
  },

  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  counterText: {
    color: C.mutedDim,
    fontFamily: F.bodyBd,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotActive:   { backgroundColor: C.gold },
  dotInactive: { backgroundColor: '#252840' },

  title: {
    color: C.gold,
    fontFamily: F.display,
    fontSize: 26,
    letterSpacing: 2,
    marginBottom: 8,
  },
  body: {
    color: C.text,
    fontFamily: F.body,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipBtn: {
    color: C.muted,
    fontFamily: F.bodyMd,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  nextBtn: {
    backgroundColor: C.gold,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 8,
  },
  nextBtnText: {
    color: '#161008',
    fontFamily: F.bodyBd,
    fontSize: 14,
    letterSpacing: 0.8,
  },
});
