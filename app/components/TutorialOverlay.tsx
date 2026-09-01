import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Dimensions, Platform,
} from 'react-native';
import { usePathname } from 'expo-router';
import { useTutorialStore, STEP_CONFIG, TutorialStep } from '../../src/store/tutorialStore';

const { width: W, height: H } = Dimensions.get('window');

const C = {
  overlay:  '#0a0c18dd',
  card:     '#12162a',
  border:   '#252840',
  gold:     '#e6b254',
  goldDim:  '#e6b25430',
  text:     '#f0ede8',
  muted:    '#9a958e',
  skipRed:  '#c43820',
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

function PulsingRing({ x, y }: { x: number; y: number }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] });
  const opacity = pulse.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.9, 0.6, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ring,
        {
          left: W * x - 24,
          top: H * y - 24,
          transform: [{ scale }],
          opacity,
        },
      ]}
    />
  );
}

export function TutorialOverlay() {
  const { active, step, advance, skip } = useTutorialStore();
  const pathname = usePathname();

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  const config = step !== 'done' ? STEP_CONFIG[step as Exclude<TutorialStep, 'done'>] : null;

  // Only show if tutorial is active and we're on the right route
  const routeMatch = config ? matchesRoute(pathname, config.route) : false;
  const visible = active && routeMatch;

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(40);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible, step]);

  if (!visible || !config) return null;

  const stepIdx = STEP_ORDER.indexOf(step as Exclude<TutorialStep, 'done'>);
  const stepNum = stepIdx + 1;
  const total   = STEP_ORDER.length;

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim }]} pointerEvents="box-none">
      {/* Dim overlay */}
      <View style={styles.dim} pointerEvents="none" />

      {/* Pulsing ring indicator */}
      <PulsingRing x={config.anchorX} y={config.anchorY} />

      {/* Tooltip card — pinned near bottom */}
      <Animated.View
        style={[styles.card, { transform: [{ translateY: slideAnim }] }]}
        pointerEvents="box-none"
      >
        <View style={styles.stepCounter}>
          <Text style={styles.stepCounterText}>{stepNum} / {total}</Text>
          {/* Dot progress */}
          <View style={styles.dots}>
            {STEP_ORDER.map((_, i) => (
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
          <TouchableOpacity onPress={skip} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.skipBtn}>Skip tutorial</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.nextBtn} onPress={advance} activeOpacity={0.8}>
            <Text style={styles.nextBtnText}>
              {stepNum < total ? 'NEXT  →' : 'GOT IT  ✓'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function matchesRoute(pathname: string, configRoute: string): boolean {
  // Normalize: strip trailing slash
  const norm = (p: string) => p.replace(/\/$/, '') || '/';
  const p = norm(pathname);
  const r = norm(configRoute);

  // Exact match
  if (p === r) return true;

  // Dashboard special case: expo-router uses '/' or '/index' for (tabs)/index
  if (r === '/(tabs)') {
    return p === '/' || p === '/index' || p === '/(tabs)' || p === '/(tabs)/index' || p.startsWith('/(tabs)');
  }

  return false;
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.overlay,
  },
  ring: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: C.gold,
    backgroundColor: 'transparent',
  },
  card: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 40 : 80,
    left: 16,
    right: 16,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e6b25440',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  stepCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  stepCounterText: {
    color: C.muted,
    fontFamily: F.bodyBd,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  dots: {
    flexDirection: 'row',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: C.gold,
  },
  dotInactive: {
    backgroundColor: C.border,
  },
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
    lineHeight: 22,
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
    letterSpacing: 1,
  },
});
