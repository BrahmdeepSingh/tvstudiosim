import React, { useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useGameStore } from '../src/store/gameStore';
import { WEEKS_PER_YEAR } from '../src/constants/game';
import { THEME_WINDOWS, ThemeWindow, isInThemeWindow } from '../src/constants/schedule';
import { Show, Season } from '../src/types';

// ── Layout constants ──────────────────────────────────────────────────────────
// Canvas = current year (W1-W52) + first half of next year = 78 weeks
const CANVAS_WEEKS = WEEKS_PER_YEAR + Math.floor(WEEKS_PER_YEAR / 2);
const CELL_W  = 60;
const HDR_H   = 40;
const SHOW_H  = 38;

const SCREEN_H    = Dimensions.get('window').height;
const HEADER_AREA = 130;
const ROW_H       = Math.floor((SCREEN_H - HEADER_AREA - HDR_H) / 10);

const TOTAL_W = CELL_W * CANVAS_WEEKS;

// ── Lane assignment ───────────────────────────────────────────────────────────
// Keyed by array index so duplicate-theme entries (medieval W1-5 and W48-52)
// each get their own independent lane rather than the second overwriting the first.
function computeLanes(windows: ThemeWindow[]): { map: Map<number, number>; count: number } {
  const sorted = windows.map((win, i) => ({ win, i })).sort((a, b) => a.win.startWeek - b.win.startWeek);
  const laneEnds: number[] = [];
  const map = new Map<number, number>();
  for (const { win, i } of sorted) {
    let lane = laneEnds.findIndex(end => end < win.startWeek);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(-1); }
    laneEnds[lane] = win.endWeek;
    map.set(i, lane);
  }
  return { map, count: laneEnds.length };
}

const { map: LANE_MAP, count: NUM_LANES } = computeLanes(THEME_WINDOWS);

const SHOW_COLORS = ['#5b8dee','#e04f7c','#4ec46e','#d4753a','#9b72cb','#3db8a8','#e6b254','#c06060'];

// ── Window styling ────────────────────────────────────────────────────────────
function winFill(win: ThemeWindow): string {
  return win.type === 'cultural' ? '#e6b25432' : '#3db8a832';
}
function winBorder(win: ThemeWindow): string {
  return win.type === 'cultural' ? '#e6b25499' : '#3db8a899';
}
function winAccent(win: ThemeWindow): string {
  return win.type === 'cultural' ? '#e6b254' : '#3db8a8';
}

// ── Canvas column helpers ─────────────────────────────────────────────────────
// Column 0 = Week 1 of currentYear. Col = (airYear - currentYear)*52 + (airWeek - 1)
function toCol(airYear: number, airWeek: number, currentYear: number): number {
  return (airYear - currentYear) * WEEKS_PER_YEAR + (airWeek - 1);
}

// ── Scheduled show helper ─────────────────────────────────────────────────────
interface ScheduledShow {
  show: Show; season: Season;
  colStart: number; colEnd: number; colorIdx: number;
}
function getScheduledShows(shows: Show[], currentYear: number): ScheduledShow[] {
  const out: ScheduledShow[] = [];
  let idx = 0;
  for (const show of shows) {
    const season = show.seasons[show.currentSeasonIndex];
    if (!season?.airDateWeek || !season?.airDateYear) continue;
    if (!['marketing','airing','renewal-pending','completed','cancelled'].includes(show.status)) continue;

    const colStart = toCol(season.airDateYear, season.airDateWeek, currentYear);
    const colEnd   = colStart + season.episodeCount - 1;

    if (colEnd < 0 || colStart >= CANVAS_WEEKS) continue;

    out.push({
      show, season,
      colStart: Math.max(0, colStart),
      colEnd:   Math.min(CANVAS_WEEKS - 1, colEnd),
      colorIdx: idx++ % SHOW_COLORS.length,
    });
  }
  return out;
}

// ── Canvas pieces ─────────────────────────────────────────────────────────────

function Background({ numLanes, rowH, showsH }: { numLanes: number; rowH: number; showsH: number }) {
  const laneArea = numLanes * rowH;
  return (
    <>
      {Array.from({ length: numLanes }, (_, i) => (
        <View key={i} style={{
          position: 'absolute',
          top: HDR_H + i * rowH,
          left: 0, width: TOTAL_W, height: rowH,
          backgroundColor: i % 2 === 0 ? '#0c1020' : '#101428',
        }} />
      ))}
      {showsH > 0 && (
        <View style={{
          position: 'absolute',
          top: HDR_H + laneArea + 6,
          left: 0, width: TOTAL_W, height: showsH,
          backgroundColor: '#0a0e1c',
        }} />
      )}
      {/* Vertical guides every 4 weeks */}
      {Array.from({ length: CANVAS_WEEKS }, (_, i) => {
        if (i % 4 !== 0) return null;
        return (
          <View key={i} style={{
            position: 'absolute',
            top: HDR_H, left: i * CELL_W,
            width: 1, height: laneArea + showsH + 6,
            backgroundColor: '#ffffff09',
          }} />
        );
      })}
      {/* Year boundary line at column WEEKS_PER_YEAR */}
      <View style={{
        position: 'absolute',
        top: HDR_H, left: WEEKS_PER_YEAR * CELL_W,
        width: 1.5, height: laneArea + showsH + 6,
        backgroundColor: '#e6b25433',
      }} />
    </>
  );
}

// Week header — col 0 = W1 currentYear, col 52+ = next year
function WeekHeader({ currentWeek, currentYear }: { currentWeek: number; currentYear: number }) {
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, width: TOTAL_W, height: HDR_H, flexDirection: 'row' }}>
      {Array.from({ length: CANVAS_WEEKS }, (_, col) => {
        const isNextYear = col >= WEEKS_PER_YEAR;
        const woy    = isNextYear ? col - WEEKS_PER_YEAR + 1 : col + 1;
        const isCur  = !isNextYear && woy === currentWeek;
        const isYearBoundary = col === WEEKS_PER_YEAR;
        const show   = woy % 2 === 1 || isCur;
        return (
          <View key={col} style={{ width: CELL_W, alignItems: 'center', justifyContent: 'center', height: HDR_H }}>
            {isYearBoundary ? (
              <Text style={g.yearBadge}>Y{currentYear + 1}</Text>
            ) : (show && (
              <Text style={[g.hdrNum, isCur && g.hdrNumCur]}>
                {isCur ? '▼' : woy}
              </Text>
            ))}
          </View>
        );
      })}
    </View>
  );
}

// Gold now-line — at the current week's column in the full-year canvas
function NowLine({ currentWeek, height }: { currentWeek: number; height: number }) {
  const x = (currentWeek - 1) * CELL_W + CELL_W / 2 - 1;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0, left: x,
        width: 2, height,
        backgroundColor: '#e6b25455', zIndex: 30,
      }}
    />
  );
}

// Theme block
function ThemeBlock({ win, lane, rowH, colOffset, isActive }: {
  win: ThemeWindow; lane: number; rowH: number;
  colOffset: number; isActive: boolean;
}) {
  const accent = winAccent(win);
  const y = HDR_H + lane * rowH;
  const colStart = Math.max(0, win.startWeek - 1 + colOffset);
  const colEnd   = Math.min(CANVAS_WEEKS - 1, win.endWeek - 1 + colOffset);
  const x = colStart * CELL_W;
  const w = (colEnd - colStart + 1) * CELL_W;

  if (colEnd < 0 || colStart >= CANVAS_WEEKS || w <= 0) return null;

  return (
    <View style={{
      position: 'absolute',
      left: x + 1, top: y + 2,
      width: w - 2, height: rowH - 4,
      backgroundColor: winFill(win),
      borderWidth: isActive ? 1.5 : 1,
      borderColor: winBorder(win),
      borderRadius: 6,
      overflow: 'hidden',
      justifyContent: 'center',
      paddingHorizontal: 7,
    }}>
      <View style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        backgroundColor: accent + (isActive ? 'ff' : '88'),
      }} />
      <View style={{ paddingLeft: 6 }}>
        <Text style={g.blockEmoji}>{win.emoji}</Text>
        {w >= 80 && (
          <Text style={[g.blockTheme, { color: accent }]} numberOfLines={1}>
            {win.theme.replace(/-/g, ' ')}
          </Text>
        )}
        {w >= 120 && (
          <Text style={g.blockWeeks}>W{win.startWeek}–{win.endWeek}</Text>
        )}
      </View>
    </View>
  );
}

// Show bar
function ShowBlock({ item, laneAreaBottom }: { item: ScheduledShow; laneAreaBottom: number }) {
  const color = SHOW_COLORS[item.colorIdx];
  const x = item.colStart * CELL_W;
  const w = (item.colEnd - item.colStart + 1) * CELL_W;
  const hasBoost = Array.from(
    { length: item.colEnd - item.colStart + 1 },
    (_, k) => isInThemeWindow(item.show.theme, (item.colStart + k) % WEEKS_PER_YEAR + 1),
  ).some(Boolean);

  return (
    <View style={{
      position: 'absolute',
      left: x + 1, top: laneAreaBottom + 2,
      width: w - 2, height: SHOW_H - 4,
      backgroundColor: color + '28',
      borderWidth: 1, borderColor: color + 'aa',
      borderRadius: 5, overflow: 'hidden',
      justifyContent: 'center', paddingHorizontal: 6,
    }}>
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: color + 'cc' }} />
      <View style={{ paddingLeft: 6 }}>
        <Text style={[g.showTitle, { color }]} numberOfLines={1}>{item.show.title}</Text>
        {w >= 100 && hasBoost && (
          <Text style={[g.showBoost, { color: '#e6b254' }]} numberOfLines={1}>✦ boost window</Text>
        )}
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ScheduleScreen() {
  const router  = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const { network, shows } = useGameStore();
  const currentWeek = network.currentWeek as number;
  const currentYear = network.currentYear as number;

  // Scroll so the now-line appears ~120px from the left edge of the viewport
  useEffect(() => {
    const targetX = Math.max(0, (currentWeek - 1) * CELL_W - 120);
    scrollRef.current?.scrollTo({ x: targetX, y: 0, animated: false });
  }, [currentWeek]);

  const scheduled = getScheduledShows(shows, currentYear);

  const laneAreaH      = NUM_LANES * ROW_H;
  const showsH         = scheduled.length > 0 ? scheduled.length * SHOW_H + 6 : 0;
  const canvasH        = HDR_H + laneAreaH + showsH;
  const laneAreaBottom = HDR_H + laneAreaH + 6;

  return (
    <SafeAreaView edges={['top']} style={s.container}>
      <LinearGradient colors={['#131829', '#0f1220']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.title}>SCHEDULE</Text>
          <Text style={s.subtitle}>YEAR {currentYear} · WEEK {currentWeek}</Text>
        </View>
        <View style={s.legendRight}>
          <View style={[s.chip, { borderColor: '#e6b25466', backgroundColor: '#e6b25415' }]}>
            <Text style={[s.chipText, { color: '#e6b254' }]}>+25%</Text>
          </View>
          <View style={[s.chip, { borderColor: '#3db8a866', backgroundColor: '#3db8a815' }]}>
            <Text style={[s.chipText, { color: '#3db8a8' }]}>+15%</Text>
          </View>
        </View>
      </View>

      {/* Horizontal scroll calendar: W1 of current year → W26 of next year */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ width: TOTAL_W, height: canvasH, position: 'relative' }}
      >
        <Background numLanes={NUM_LANES} rowH={ROW_H} showsH={showsH} />
        <NowLine currentWeek={currentWeek} height={canvasH} />
        <WeekHeader currentWeek={currentWeek} currentYear={currentYear} />

        {/* Current year theme windows (colOffset=0) */}
        {THEME_WINDOWS.map((win, wi) => {
          const lane = LANE_MAP.get(wi);
          if (lane === undefined) return null;
          const isActive = currentWeek >= win.startWeek && currentWeek <= win.endWeek;
          return (
            <ThemeBlock key={`cur-${wi}`} win={win} lane={lane} rowH={ROW_H}
              colOffset={0} isActive={isActive} />
          );
        })}

        {/* Next year theme windows (colOffset=WEEKS_PER_YEAR) */}
        {THEME_WINDOWS.map((win, wi) => {
          const lane = LANE_MAP.get(wi);
          if (lane === undefined) return null;
          return (
            <ThemeBlock key={`nxt-${wi}`} win={win} lane={lane} rowH={ROW_H}
              colOffset={WEEKS_PER_YEAR} isActive={false} />
          );
        })}

        {/* Divider */}
        {showsH > 0 && (
          <View style={{
            position: 'absolute',
            top: HDR_H + laneAreaH + 3,
            left: 0, width: TOTAL_W, height: 1,
            backgroundColor: '#252840',
          }} />
        )}

        {/* Show bars */}
        {scheduled.map((item, i) => (
          <ShowBlock
            key={item.show.id}
            item={{ ...item, colorIdx: i % SHOW_COLORS.length }}
            laneAreaBottom={laneAreaBottom + i * SHOW_H}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const g = StyleSheet.create({
  hdrNum:    { fontFamily: 'Manrope_700Bold', fontSize: 12, color: '#5a5a7a' },
  hdrNumCur: { color: '#e6b254', fontSize: 13 },
  yearBadge: { fontFamily: 'Manrope_800ExtraBold', fontSize: 9, color: '#e6b25499', letterSpacing: 0.5 },

  blockEmoji: { fontSize: 14, lineHeight: 17 },
  blockTheme: { fontFamily: 'Manrope_700Bold', fontSize: 9.5, marginTop: 2, textTransform: 'capitalize' },
  blockWeeks: { fontFamily: 'Manrope_400Regular', fontSize: 8, color: '#6b6880', marginTop: 1 },

  showTitle: { fontFamily: 'Manrope_700Bold', fontSize: 10 },
  showBoost: { fontFamily: 'Manrope_700Bold', fontSize: 8.5, marginTop: 1 },
});

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0f1220' },
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#252840' },
  backBtn:      { width: 50 },
  backText:     { color: '#e6b254', fontFamily: 'Manrope_600SemiBold', fontSize: 14 },
  headerCenter: { flex: 1, alignItems: 'center' },
  title:        { color: '#f0ede8', fontFamily: 'BebasNeue_400Regular', fontSize: 20, letterSpacing: 0.5 },
  subtitle:     { color: '#6b6880', fontFamily: 'Manrope_700Bold', fontSize: 8.5, letterSpacing: 1.5, marginTop: 1 },
  legendRight:  { flexDirection: 'row', gap: 4, width: 70, justifyContent: 'flex-end' },
  chip:         { borderWidth: 1, borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2 },
  chipText:     { fontFamily: 'Manrope_800ExtraBold', fontSize: 9 },
});