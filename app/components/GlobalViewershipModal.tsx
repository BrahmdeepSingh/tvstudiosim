import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  Animated, useWindowDimensions,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { EMBLEMS } from '../../src/assets/emblems';

// ── City positions in the 574×574 globe SVG coordinate space ─────────────────
// Globe center = (287, 287), radius = 287
// Americas on the left (~x:60-250), Europe/Africa/Asia on right (~x:310-560)
const US_DOTS_SVG: [number, number][] = [
  [ 62, 242], // Los Angeles
  [ 47, 227], // San Francisco
  [ 47, 210], // Seattle
  [ 85, 232], // Denver
  [103, 217], // Chicago
  [123, 203], // New York
  [123, 192], // Boston
  [118, 220], // Washington DC
  [112, 234], // Atlanta
  [109, 226], // Nashville
  [111, 213], // Detroit
  [ 98, 240], // Dallas
  [ 95, 248], // Houston
  [ 73, 238], // Phoenix
  [119, 257], // Miami
];

const INTL_DOTS_SVG: [number, number][] = [
  [316, 231], // London
  [326, 236], // Paris
  [337, 228], // Berlin
  [337, 249], // Rome
  [307, 243], // Madrid
  [452, 238], // Tokyo
  [446, 258], // Shanghai
  [441, 270], // Hong Kong
  [388, 265], // Mumbai
  [387, 254], // Dubai
  [458, 231], // Seoul
  [207, 382], // São Paulo
  [191, 350], // Bogotá
  [457, 373], // Sydney
  [312, 310], // Lagos
  [124, 205], // Toronto
  [ 47, 209], // Vancouver
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
        Animated.timing(opacity, { toValue: 0.35, duration: 900, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1,    duration: 900, useNativeDriver: true }),
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
        shadowRadius: 6,
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

  const GLOBE_D = Math.min(SW - 32, 320);
  const SCALE   = GLOBE_D / 574; // scale factor from SVG coords → display coords

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

  const usDots   = US_DOTS_SVG;
  const intlDots = hasInternational ? INTL_DOTS_SVG : [];
  const allDots  = [...usDots, ...intlDots];

  // Globe center in SVG space is (287, 287); radius 287.
  // Filter dots that fall within the visible circle.
  const CX = 287, CY = 287, R = 287;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[gs.overlay, { opacity: fadeAnim }]}>

        {/* ── Globe ─────────────────────────────────────────────────────────── */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
          <View style={{ width: GLOBE_D, height: GLOBE_D }}>

            {/* Actual globe SVG */}
            <SvgXml xml={EMBLEMS.globe} width={GLOBE_D} height={GLOBE_D} />

            {/* City dots overlaid on top, scaled to displayed size */}
            {allDots.map(([svgX, svgY], idx) => {
              const dx = svgX - CX, dy = svgY - CY;
              if (Math.sqrt(dx * dx + dy * dy) > R * 0.92) return null;
              return (
                <GlobeDot
                  key={idx}
                  x={svgX * SCALE}
                  y={svgY * SCALE}
                  delay={400 + idx * 65}
                  color="#ff4040"
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
    paddingHorizontal: 16,
    paddingVertical: 40,
  },

  textBlock: {
    alignItems: 'center',
    marginTop: 24,
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
    color: '#ff4040',
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
