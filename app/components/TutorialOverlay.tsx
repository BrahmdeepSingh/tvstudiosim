import { useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Dimensions, Platform,
} from 'react-native';
import { usePathname } from 'expo-router';
import { useTutorialStore, STEP_CONFIG, ACTION_GATED_STEPS, HIDDEN_STEPS, TutorialStep, TargetRect } from '../../src/store/tutorialStore';
import { useTheme } from '../../src/context/ThemeContext';

const { width: W, height: H } = Dimensions.get('window');
const TOOLTIP_MARGIN = 16;
const TOOLTIP_GAP    = 14;

const F = {
  display: 'BebasNeue_400Regular',
  body:    'Manrope_400Regular',
  bodyMd:  'Manrope_600SemiBold',
  bodyBd:  'Manrope_700Bold',
};

const STEP_ORDER: Exclude<TutorialStep, 'done' | 'waiting-for-marketing'>[] = [
  'dashboard', 'create-show', 'casting', 'show-writing',
  'post-writing-tasks', 'post-filming', 'marketing-premiere', 'marketing-channels',
  'episode-aired', 'social-buzz',
];

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

function Spotlight({ rect }: { rect: TargetRect }) {
  const { C } = useTheme();
  const dim = C.pageBg + 'e8';
  return (
    <>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: rect.y, backgroundColor: dim }} pointerEvents="none" />
      <View style={{ position: 'absolute', top: rect.y + rect.h, left: 0, right: 0, bottom: 0, backgroundColor: dim }} pointerEvents="none" />
      <View style={{ position: 'absolute', top: rect.y, left: 0, width: rect.x, height: rect.h, backgroundColor: dim }} pointerEvents="none" />
      <View style={{ position: 'absolute', top: rect.y, left: rect.x + rect.w, right: 0, height: rect.h, backgroundColor: dim }} pointerEvents="none" />
      <SpotlightBorder rect={rect} />
    </>
  );
}

function FullDim() {
  const { C } = useTheme();
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: C.pageBg + 'e8' }]} pointerEvents="none" />;
}

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
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const config = STEP_CONFIG[step];

  const posStyle = useMemo((): object => {
    if (!rect) {
      return { bottom: Platform.OS === 'web' ? 40 : 56 };
    }
    const targetCenter = rect.y + rect.h / 2;
    if (targetCenter > H * 0.52) {
      const bottom = H - rect.y + TOOLTIP_GAP;
      return { bottom: Math.min(bottom, H - 120) };
    } else {
      const top = rect.y + rect.h + TOOLTIP_GAP;
      return { top: Math.min(top, H - 220) };
    }
  }, [rect]);

  return (
    <Animated.View
      style={[
        s.tooltip,
        posStyle,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
      pointerEvents="box-none"
    >
      <View style={s.counterRow}>
        <Text style={s.counterText}>{stepIdx + 1} / {total}</Text>
        <View style={s.dots}>
          {Array.from({ length: total }).map((_, i) => (
            <View
              key={i}
              style={[s.dot, i === stepIdx ? s.dotActive : s.dotInactive]}
            />
          ))}
        </View>
      </View>

      <Text style={s.title}>{config.title}</Text>
      <Text style={s.body}>{config.body}</Text>

      <View style={s.actions}>
        <TouchableOpacity onPress={onSkip} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={s.skipBtn}>Skip tutorial</Text>
        </TouchableOpacity>

        {!ACTION_GATED_STEPS.includes(step) && (
          <TouchableOpacity style={s.nextBtn} onPress={onNext} activeOpacity={0.82}>
            <Text style={s.nextBtnText}>
              {stepIdx + 1 < total ? 'NEXT  →' : 'GOT IT  ✓'}
            </Text>
          </TouchableOpacity>
        )}
        {ACTION_GATED_STEPS.includes(step) && (
          <Text style={s.actionHint}>
            {step === 'dashboard' ? 'Tap the button above ↑' : 'Tap CREATE SHOW ↑'}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

export function TutorialOverlay() {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const { active, step, targetRect, advance, skip } = useTutorialStore();
  const pathname = usePathname();

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const config = (step !== 'done' && step !== 'waiting-for-marketing')
    ? STEP_CONFIG[step as Exclude<TutorialStep, 'done' | 'waiting-for-marketing'>]
    : null;

  const routeMatch = config ? matchesRoute(pathname, config.route) : false;
  const visible = active && routeMatch && !HIDDEN_STEPS.includes(step as TutorialStep);

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
    <Animated.View style={[s.root, { opacity: fadeAnim }]} pointerEvents="box-none">
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
      p === '/(tabs)/financials' ||
      p.startsWith('/(tabs)')
    );
  }
  if (p.startsWith(r)) return true;
  return false;
}

function makeStyles(C: ReturnType<typeof useTheme>['C']) {
  return StyleSheet.create({
    root: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 9999,
      elevation: 999,
    },

    tooltip: {
      position: 'absolute',
      left: TOOLTIP_MARGIN,
      right: TOOLTIP_MARGIN,
      backgroundColor: C.cardBg,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.borderGold,
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
      color: C.mutedMid,
      fontFamily: F.bodyBd,
      fontSize: 11,
      letterSpacing: 1.5,
    },
    dots: { flexDirection: 'row', gap: 5 },
    dot: { width: 6, height: 6, borderRadius: 3 },
    dotActive:   { backgroundColor: C.gold },
    dotInactive: { backgroundColor: C.border },

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
      color: C.goldBtnText,
      fontFamily: F.bodyBd,
      fontSize: 14,
      letterSpacing: 0.8,
    },
    actionHint: {
      color: C.gold,
      fontFamily: F.bodyMd,
      fontSize: 13,
      fontStyle: 'italic',
    },
  });
}