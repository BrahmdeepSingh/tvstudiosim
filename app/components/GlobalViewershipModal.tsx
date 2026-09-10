import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  Animated, useWindowDimensions,
} from 'react-native';
import Svg, { Circle, Ellipse, Line, G } from 'react-native-svg';

// ── US city dot positions (as fractions of globe radius, centered at 0,0) ────
// Projected onto a simplified orthographic-ish flat map within the circle
const US_DOTS: [number, number][] = [
  [-0.38, -0.10], // Los Angeles
  [-0.30, -0.08], // San Francisco
  [-0.15, -0.14], // Chicago
  [-0.08, -0.07], // New York
  [-0.12, -0.02], // Washington DC
  [-0.22, 0.00],  // Dallas
  [-0.28, 0.04],  // Houston
  [-0.05, 0.05],  // Miami
  [-0.18, -0.08], // Atlanta
  [-0.32, -0.16], // Seattle
  [-0.24, -0.12], // Denver
  [-0.14, -0.10], // Detroit
  [-0.10, -0.12], // Boston
  [-0.20, -0.04], // Nashville
  [-0.26, -0.06], // Phoenix
];

const INTL_DOTS: [number, number][] = [
  // Europe
  [0.05, -0.22],  // London
  [0.10, -0.20],  // Paris
  [0.18, -0.20],  // Berlin
  [0.15, -0.15],  // Rome
  [0.22, -0.22],  // Warsaw
  [0.00, -0.18],  // Madrid
  // Asia
  [0.48, -0.18],  // Tokyo
  [0.42, -0.10],  // Shanghai
  [0.38, -0.05],  // Hong Kong
  [0.32, -0.08],  // Mumbai
  [0.28, -0.14],  // Dubai
  [0.45, -0.22],  // Seoul
  [0.35, -0.14],  // Bangkok
  // Latin America
  [-0.20, 0.20],  // São Paulo
  [-0.25, 0.10],  // Bogotá
  [-0.30, 0.15],  // Lima
  [-0.15, 0.12],  // Buenos Aires
  // Australia/Pacific
  [0.40, 0.18],   // Sydney
  [0.35, 0.22],   // Melbourne
  // Africa
  [0.10, 0.08],   // Lagos
  [0.18, 0.05],   // Nairobi
  [0.08, -0.02],  // Casablanca
  // Canada
  [-0.25, -0.20], // Toronto
  [-0.35, -0.22], // Vancouver
  [-0.10, -0.22], // Montreal
];

function fmtViewers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

// ── Dot component — fades in then pulses ──────────────────────────────────────
function GlobeDot({ x, y, delay, color }: { x: number; y: number; delay: number; color: string }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale   = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(scale,   { toValue: 1, tension: 120, friction: 6, useNativeDriver: true }),
      ]),
      Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1,   duration: 700, useNativeDriver: true }),
        ]),
      ),
    ]);
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: 6, height: 6,
        borderRadius: 3,
        backgroundColor: color,
        left: x - 3, top: y - 3,
        opacity,
        transform: [{ scale }],
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 4,
        elevation: 4,
      }}
    />
  );
}

// ── Counter animation ─────────────────────────────────────────────────────────
function ViewerCounter({ target, delay }: { target: number; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    const listener = anim.addListener(({ value }) => setDisplay(fmtViewers(Math.round(value))));
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(anim, { toValue: target, duration: 2000, useNativeDriver: false }),
    ]).start();
    return () => anim.removeListener(listener);
  }, [target, delay]);

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
  const { width: SW, height: SH } = useWindowDimensions();
  const GLOBE_R = Math.min(SW, SH) * 0.36;

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.85);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }),
      ]).start();

      // Auto-dismiss after 6 seconds
      timerRef.current = setTimeout(() => handleClose(), 6000);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [visible]);

  function handleClose() {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 300, useNativeDriver: true }),
    ]).start(() => onClose());
  }

  const dots = hasInternational ? [...US_DOTS, ...INTL_DOTS] : US_DOTS;
  const CX = SW / 2;
  const CY = SH * 0.42;

  // Number of lat/lon lines on the globe wireframe
  const LAT_LINES = 6;
  const LON_LINES = 8;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <TouchableOpacity activeOpacity={1} style={StyleSheet.absoluteFill} onPress={handleClose}>
        <Animated.View style={[gs.overlay, { opacity: fadeAnim }]}>

          {/* Globe wireframe — SVG */}
          <Animated.View style={[gs.globeWrap, { transform: [{ scale: scaleAnim }] }]}>
            <Svg width={SW} height={SH} style={StyleSheet.absoluteFill}>
              <G>
                {/* Glow backdrop */}
                <Circle cx={CX} cy={CY} r={GLOBE_R + 24} fill="rgba(100,160,255,0.04)" />
                <Circle cx={CX} cy={CY} r={GLOBE_R + 10} fill="rgba(100,160,255,0.06)" />

                {/* Globe fill */}
                <Circle cx={CX} cy={CY} r={GLOBE_R} fill="#0a0e22" />

                {/* Latitude lines */}
                {Array.from({ length: LAT_LINES }).map((_, i) => {
                  const frac = (i + 1) / (LAT_LINES + 1); // 0..1 exclusive
                  const dy = (frac * 2 - 1) * GLOBE_R;
                  const rx = Math.sqrt(Math.max(0, GLOBE_R * GLOBE_R - dy * dy));
                  return (
                    <Ellipse
                      key={`lat-${i}`}
                      cx={CX} cy={CY + dy}
                      rx={rx} ry={rx * 0.22}
                      fill="none"
                      stroke="rgba(100,140,255,0.18)"
                      strokeWidth={0.8}
                    />
                  );
                })}

                {/* Longitude lines (vertical ellipses) */}
                {Array.from({ length: LON_LINES }).map((_, i) => {
                  const angle = (i * Math.PI) / LON_LINES; // 0..π
                  const rx = Math.abs(Math.cos(angle)) * GLOBE_R;
                  return (
                    <Ellipse
                      key={`lon-${i}`}
                      cx={CX} cy={CY}
                      rx={rx} ry={GLOBE_R}
                      fill="none"
                      stroke="rgba(100,140,255,0.18)"
                      strokeWidth={0.8}
                    />
                  );
                })}

                {/* Equator — slightly brighter */}
                <Ellipse
                  cx={CX} cy={CY}
                  rx={GLOBE_R} ry={GLOBE_R * 0.22}
                  fill="none"
                  stroke="rgba(100,140,255,0.30)"
                  strokeWidth={1}
                />

                {/* Globe outline */}
                <Circle
                  cx={CX} cy={CY} r={GLOBE_R}
                  fill="none"
                  stroke="rgba(100,160,255,0.45)"
                  strokeWidth={1.5}
                />
              </G>
            </Svg>

            {/* Dots rendered as React Native views (so they can animate) */}
            <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
              {dots.map(([fx, fy], idx) => {
                // Clip dots to inside the globe circle
                const dist = Math.sqrt(fx * fx + fy * fy);
                if (dist > 0.88) return null;
                const isUS = idx < US_DOTS.length;
                return (
                  <GlobeDot
                    key={idx}
                    x={CX + fx * GLOBE_R}
                    y={CY + fy * GLOBE_R}
                    delay={600 + idx * 80}
                    color={isUS ? '#e6b254' : '#5b9fea'}
                  />
                );
              })}
            </View>
          </Animated.View>

          {/* Text overlay */}
          <Animated.View style={[gs.textBlock, { opacity: fadeAnim }]}>
            <Text style={gs.eyebrow}>SEASON {seasonNumber} FINALE</Text>
            <Text style={gs.showTitle} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}>
              {showTitle.toUpperCase()}
            </Text>
            <Text style={gs.watchedLabel}>WATCHED AROUND THE WORLD</Text>
            <View style={gs.viewerRow}>
              <ViewerCounter target={viewers} delay={800} />
              <Text style={gs.viewerLabel}> VIEWERS</Text>
            </View>
            {hasInternational && (
              <Text style={gs.intlBadge}>🌐 INTERNATIONAL DISTRIBUTION</Text>
            )}
          </Animated.View>

          <Animated.Text style={[gs.tapToDismiss, { opacity: fadeAnim }]}>
            TAP TO CONTINUE
          </Animated.Text>

        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const gs = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 6, 18, 0.96)',
    alignItems: 'center',
  },

  globeWrap: {
    ...StyleSheet.absoluteFillObject,
  },

  textBlock: {
    position: 'absolute',
    bottom: '20%',
    left: 24,
    right: 24,
    alignItems: 'center',
  },

  eyebrow: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 3,
    color: 'rgba(200,210,255,0.6)',
    marginBottom: 8,
  },

  showTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 38,
    letterSpacing: 2,
    color: '#e6b254',
    textAlign: 'center',
    lineHeight: 42,
    marginBottom: 10,
  },

  watchedLabel: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    letterSpacing: 2.5,
    color: 'rgba(200,210,255,0.55)',
    marginBottom: 6,
  },

  viewerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },

  viewerCount: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 52,
    color: '#ffffff',
    letterSpacing: 1,
    lineHeight: 56,
  },

  viewerLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.5,
    marginBottom: 4,
  },

  intlBadge: {
    marginTop: 10,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.5,
    color: '#5b9fea',
  },

  tapToDismiss: {
    position: 'absolute',
    bottom: '10%',
    fontFamily: 'Manrope_400Regular',
    fontSize: 10,
    letterSpacing: 2.5,
    color: 'rgba(200,210,255,0.3)',
  },
});
