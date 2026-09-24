import React, { useEffect, useRef, useMemo } from 'react';
import { View, Animated, useWindowDimensions, StyleSheet } from 'react-native';

const COLORS = [
  '#FFD700', // gold
  '#f0c060', // warm gold
  '#4ec46e', // green
  '#f59e0b', // amber
  '#ff6b6b', // red
  '#5b8cff', // blue
  '#a855f7', // purple
  '#ec4899', // pink
  '#3db8a8', // teal
  '#ffffff',  // white
  '#FFD700',  // gold (weighted)
  '#f0c060',  // gold (weighted)
];

const PIECE_COUNT = 65;

function rng(seed: number) {
  // Simple deterministic LCG
  let s = (seed * 1664525 + 1013904223) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xFFFFFFFF;
  };
}

interface Piece {
  x: number;
  startY: number;
  fallDist: number;
  drift: number;
  delay: number;       // ms — first iteration only
  duration: number;    // ms
  w: number;
  h: number;
  borderRadius: number;
  rotDeg: number;      // total rotation in degrees
  color: string;
}

function buildPieces(width: number, height: number): Piece[] {
  return Array.from({ length: PIECE_COUNT }, (_, i) => {
    const r = rng(i * 997 + 31);
    const startY = -(12 + r() * 100);
    const w = 5 + Math.round(r() * 8);
    const isCircle = r() > 0.75;
    const isSquare = !isCircle && r() > 0.55;
    const h = isCircle || isSquare ? w : 10 + Math.round(r() * 14);
    return {
      x:        r() * width,
      startY,
      fallDist: height - startY + 180,
      drift:    (r() - 0.5) * 160,
      delay:    r() * 1400,
      duration: 2600 + r() * 2600,
      w,
      h,
      borderRadius: isCircle ? w / 2 : 2,
      rotDeg:   (360 * (2 + Math.floor(r() * 4))) * (r() > 0.5 ? 1 : -1),
      color:    COLORS[i % COLORS.length],
    };
  });
}

interface ConfettiOverlayProps {
  visible: boolean;
}

interface AnimRef {
  ty:     Animated.Value;
  tx:     Animated.Value;
  rot:    Animated.Value;
  op:     Animated.Value;
  active: boolean;
  anim:   Animated.CompositeAnimation | null;
}

export function ConfettiOverlay({ visible }: ConfettiOverlayProps) {
  const { width: SW, height: SH } = useWindowDimensions();
  const pieces = useMemo(() => buildPieces(SW, SH), [SW, SH]);

  const refs = useRef<AnimRef[]>(
    Array.from({ length: PIECE_COUNT }, () => ({
      ty:     new Animated.Value(0),
      tx:     new Animated.Value(0),
      rot:    new Animated.Value(0),
      op:     new Animated.Value(0),
      active: false,
      anim:   null,
    }))
  ).current;

  useEffect(() => {
    if (visible) {
      refs.forEach((a, i) => {
        a.active = true;
        const p = pieces[i];
        let first = true;

        const run = () => {
          if (!a.active) return;
          a.ty.setValue(0);
          a.tx.setValue(0);
          a.rot.setValue(0);
          a.op.setValue(0);

          const delay = first ? p.delay : 0;
          first = false;

          const seq: Animated.CompositeAnimation[] = [];
          if (delay > 0) seq.push(Animated.delay(delay));
          seq.push(
            Animated.parallel([
              Animated.timing(a.op,  { toValue: 1,           duration: 280,        useNativeDriver: true }),
              Animated.timing(a.ty,  { toValue: p.fallDist,  duration: p.duration, useNativeDriver: true }),
              Animated.timing(a.tx,  { toValue: p.drift,     duration: p.duration, useNativeDriver: true }),
              Animated.timing(a.rot, { toValue: 1,           duration: p.duration, useNativeDriver: true }),
            ])
          );

          a.anim = Animated.sequence(seq);
          a.anim.start(({ finished }) => {
            if (finished && a.active) run();
          });
        };

        run();
      });
    } else {
      refs.forEach(a => {
        a.active = false;
        a.anim?.stop();
        a.op.setValue(0);
      });
    }

    return () => {
      refs.forEach(a => {
        a.active = false;
        a.anim?.stop();
      });
    };
  }, [visible]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((p, i) => {
        const rotDeg = refs[i].rot.interpolate({
          inputRange:  [0, 1],
          outputRange: ['0deg', `${p.rotDeg}deg`],
        });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left:            p.x,
              top:             p.startY,
              width:           p.w,
              height:          p.h,
              backgroundColor: p.color,
              borderRadius:    p.borderRadius,
              opacity:         refs[i].op,
              transform: [
                { translateY: refs[i].ty },
                { translateX: refs[i].tx },
                { rotate: rotDeg },
              ],
            }}
          />
        );
      })}
    </View>
  );
}
