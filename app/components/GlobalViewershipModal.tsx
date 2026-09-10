import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  Animated, useWindowDimensions,
} from 'react-native';
import Svg, { Circle, Ellipse } from 'react-native-svg';

// ── Dot positions as fractions of globe radius (origin = globe center) ────────
const US_DOTS: [number, number][] = [
  [-0.38, -0.10], // Los Angeles
  [-0.30, -0.08], // San Francisco
  [-0.15, -0.14], // Chicago
  [-0.08, -0.07], // New York
  [-0.12, -0.02], // Washington DC
  [-0.22,  0.00], // Dallas
  [-0.28,  0.04], // Houston
  [-0.05,  0.05], // Miami
  [-0.18, -0.08], // Atlanta
  [-0.32, -0.16], // Seattle
  [-0.24, -0.12], // Denver
  [-0.14, -0.10], // Detroit
  [-0.10, -0.12], // Boston
  [-0.20, -0.04], // Nashville
  [-0.26, -0.06], // Phoenix
];

const INTL_DOTS: [number, number][] = [
  [ 0.05, -0.22], // London
  [ 0.10, -0.20], // Paris
  [ 0.18, -0.20], // Berlin
  [ 0.15, -0.15], // Rome
  [ 0.00, -0.18], // Madrid
  [ 0.48, -0.18], // Tokyo
  [ 0.42, -0.10], // Shanghai
  [ 0.38, -0.05], // Hong Kong
  [ 0.32, -0.08], // Mumbai
  [ 0.28, -0.14], // Dubai
  [ 0.45, -0.22], // Seoul
  [-0.20,  0.20], // São Paulo
  [-0.25,  0.10], // Bogotá
  [ 0.40,  0.18], // Sydney
  [ 0.10,  0.08], // Lagos
  [-0.25, -0.20], // Toronto
  [-0.35, -0.22], // Vancouver
];

function fmtViewers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

// ── Single dot: fades in then pulses ─────────────────────────────────────────
function GlobeDot({ x, y, delay, color }: { x: number; y: number; delay: number; color: string }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale   = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    const seq = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1,   duration: 280, useNativeDriver: true }),
        Animated.spring (scale,  { toValue: 1,   tension: 140, friction: 6, useNativeDriver: true }),
      ]),
      Animated.loop(Animated.sequence([
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1,   duration: 800, useNativeDriver: true }),
      ])),
    ]);
    seq.start();
    return () => seq.stop();
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: 7, height: 7, borderRadius: 3.5,
        backgroundColor: color,
        left: x - 3.5, top: y - 3.5,
        opacity,
        transform: [{ scale }],
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 5,
        elevation: 6,
      }}
    />
  );
}

// ── Animated viewer count ─────────────────────────────────────────────────────
function ViewerCounter({ target, delay }: { target: number; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    const id = anim.addListener(({ value }) => setDisplay(fmtViewers(Math.round(value))));
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(anim, { toValue: target, duration: 2200, useNativeDriver: false }),
    ]).start();
    return () => anim.removeListener(id);
  }, [target]);

  return <Text style={gs.viewerCount}>{display}</Text>;
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  onClose: () => void;
  showTitle: string;
  seasonNumber: number;
  viewers: number;
  hasInternational: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function GlobalViewershipModal({
  visible, onClose, showTitle, seasonNumber, viewers, hasInternational,
}: Props) {
  const { width: SW } = useWindowDimensions();

  // Globe is a fixed-size square container, centered by flexbox — no screen math needed
  const GLOBE_D = Math.min(SW - 48, 300); // diameter
  const GLOBE_R = GLOBE_D / 2;

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;

  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.88);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring (scaleAnim, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  function handleClose() {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0, duration: 260, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 260, useNativeDriver: true }),
    ]).start(() => onClose());
  }

  const dots = hasInternational ? [...US_DOTS, ...INTL_DOTS] : US_DOTS;

  const LAT_LINES = 6;
  const LON_LINES = 8;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[gs.overlay, { opacity: fadeAnim }]}>

        {/* ── Globe ─────────────────────────────────────────────────────────── */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
          {/* Self-contained square: SVG + dots share the same GLOBE_D × GLOBE_D box */}
          <View style={{ width: GLOBE_D, height: GLOBE_D }}>

            {/* Wireframe SVG — everything drawn relative to cx=GLOBE_R, cy=GLOBE_R */}
            <Svg width={GLOBE_D} height={GLOBE_D} style={StyleSheet.absoluteFill}>
              {/* Glow rings */}
              <Circle cx={GLOBE_R} cy={GLOBE_R} r={GLOBE_R + 18} fill="rgba(80,130,255,0.05)" />
              <Circle cx={GLOBE_R} cy={GLOBE_R} r={GLOBE_R + 8}  fill="rgba(80,130,255,0.08)" />
              {/* Fill */}
              <Circle cx={GLOBE_R} cy={GLOBE_R} r={GLOBE_R} fill="#080c1e" />

              {/* Latitude lines */}
              {Array.from({ length: LAT_LINES }).map((_, i) => {
                const frac = (i + 1) / (LAT_LINES + 1);
                const dy   = (frac * 2 - 1) * GLOBE_R;
                const rx   = Math.sqrt(Math.max(0, GLOBE_R * GLOBE_R - dy * dy));
                return (
                  <Ellipse
                    key={`lat-${i}`}
                    cx={GLOBE_R} cy={GLOBE_R + dy}
                    rx={rx} ry={rx * 0.25}
                    fill="none" stroke="rgba(100,140,255,0.20)" strokeWidth={0.8}
                  />
                );
              })}

              {/* Longitude lines */}
              {Array.from({ length: LON_LINES }).map((_, i) => {
                const angle = (i * Math.PI) / LON_LINES;
                const rx    = Math.abs(Math.cos(angle)) * GLOBE_R;
                return (
                  <Ellipse
                    key={`lon-${i}`}
                    cx={GLOBE_R} cy={GLOBE_R}
                    rx={rx} ry={GLOBE_R}
                    fill="none" stroke="rgba(100,140,255,0.20)" strokeWidth={0.8}
                  />
                );
              })}

              {/* Equator — slightly brighter */}
              <Ellipse
                cx={GLOBE_R} cy={GLOBE_R}
                rx={GLOBE_R} ry={GLOBE_R * 0.25}
                fill="none" stroke="rgba(100,150,255,0.35)" strokeWidth={1}
              />

              {/* Outline */}
              <Circle
                cx={GLOBE_R} cy={GLOBE_R} r={GLOBE_R - 0.5}
                fill="none" stroke="rgba(120,170,255,0.5)" strokeWidth={1.5}
              />
            </Svg>

            {/* Dots — positioned relative to the globe container */}
            {dots.map(([fx, fy], idx) => {
              if (Math.sqrt(fx * fx + fy * fy) > 0.87) return null;
              const isUS = idx < US_DOTS.length;
              return (
                <GlobeDot
                  key={idx}
                  x={GLOBE_R + fx * GLOBE_R}
                  y={GLOBE_R + fy * GLOBE_R}
                  delay={500 + idx * 70}
                  color={isUS ? '#e6b254' : '#5b9fea'}
                />
              );
            })}
          </View>
        </Animated.View>

        {/* ── Text block ────────────────────────────────────────────────────── */}
        <Animated.View style={[gs.textBlock, { opacity: fadeAnim }]}>
          <Text style={gs.eyebrow}>SEASON {seasonNumber} FINALE</Text>
          <Text style={gs.showTitle} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}>
            {showTitle.toUpperCase()}
          </Text>
          <Text style={gs.watchedLabel}>WATCHED AROUND THE WORLD</Text>
          <View style={gs.viewerRow}>
            <ViewerCounter target={viewers} delay={700} />
            <Text style={gs.viewerLabel}> VIEWERS</Text>
          </View>
          {hasInternational && (
            <Text style={gs.intlBadge}>🌐 INTERNATIONAL DISTRIBUTION</Text>
          )}
        </Animated.View>

        {/* ── Dismiss button ────────────────────────────────────────────────── */}
        <Animated.View style={{ opacity: fadeAnim, marginTop: 28 }}>
          <TouchableOpacity style={gs.closeBtn} onPress={handleClose} activeOpacity={0.8}>
            <Text style={gs.closeBtnText}>CONTINUE  →</Text>
          </TouchableOpacity>
        </Animated.View>

      </Animated.View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const gs = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 6, 18, 0.97)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },

  textBlock: {
    alignItems: 'center',
    marginTop: 28,
  },

  eyebrow: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 3,
    color: 'rgba(200,210,255,0.55)',
    marginBottom: 8,
  },

  showTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 36,
    letterSpacing: 2,
    color: '#e6b254',
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 12,
  },

  watchedLabel: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    letterSpacing: 2.5,
    color: 'rgba(200,210,255,0.45)',
    marginBottom: 6,
  },

  viewerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },

  viewerCount: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 56,
    color: '#ffffff',
    letterSpacing: 1,
    lineHeight: 62,
  },

  viewerLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1.5,
    marginBottom: 4,
  },

  intlBadge: {
    marginTop: 12,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.5,
    color: '#5b9fea',
  },

  closeBtn: {
    borderWidth: 1,
    borderColor: 'rgba(230,178,84,0.4)',
    borderRadius: 12,
    paddingHorizontal: 36,
    paddingVertical: 14,
    backgroundColor: 'rgba(230,178,84,0.08)',
  },

  closeBtnText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 17,
    letterSpacing: 3,
    color: '#e6b254',
  },
});
