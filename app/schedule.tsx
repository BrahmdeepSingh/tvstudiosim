import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useGameStore } from '../src/store/gameStore';
import { WEEKS_PER_YEAR } from '../src/constants/game';
import { THEME_WINDOWS, ThemeWindow, getThemeWindow } from '../src/constants/schedule';
import { Show, Season } from '../src/types';

// ── Layout constants ──────────────────────────────────────────────────────────
const CELL_W  = 60;          // px per week — zoomed-in feel
const HDR_H   = 40;          // week-number header (taller for bigger text)
const SHOW_H  = 38;          // show bar height

// Screen-aware row height: fill all available vertical space with the 10 lanes
const SCREEN_H    = Dimensions.get('window').height;
const HEADER_AREA = 130;     // approximate: safe-area + app-header + legend row
const ROW_H       = Math.floor((SCREEN_H - HEADER_AREA - HDR_H) / 10); // 10 = NUM_LANES

// Computed once: greedy lane assignment for all 21 windows
function computeLanes(windows: ThemeWindow[]): { map: Map<string, number>; count: number } {
  const sorted = [...windows].sort((a, b) => a.startWeek - b.startWeek);
  const laneEnds: number[] = [];
  const map = new Map<string, number>();
  for (const win of sorted) {
    let lane = laneEnds.findIndex(end => end < win.startWeek);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(-1); }
    laneEnds[lane] = win.endWeek;
    map.set(win.theme, lane);
  }
  return { map, count: laneEnds.length };
}

const { map: LANE_MAP, count: NUM_LANES } = computeLanes(THEME_WINDOWS);

const TOTAL_W = CELL_W * WEEKS_PER_YEAR;

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

// ── Scheduled show helper ─────────────────────────────────────────────────────
interface ScheduledShow {
  show: Show; season: Season;
  airWeek: number; endWeek: number; colorIdx: number;
}
function getScheduledShows(shows: Show[], currentYear: number): ScheduledShow[] {
  const out: ScheduledShow[] = [];
  let idx = 0;
  for (const show of shows) {
    const season = show.seasons[show.currentSeasonIndex];
    if (!season?.airDateWeek || !season?.airDateYear) continue;
    if (!['marketing','airing','renewal-pending','completed','cancelled'].includes(show.status)) continue;
    const airY = season.airDateYear, airW = season.airDateWeek;
    const absStart = airY * WEEKS_PER_YEAR + airW;
    const absEnd   = absStart + season.episodeCount - 1;
    const yrStart  = currentYear * WEEKS_PER_YEAR + 1;
    const yrEnd    = currentYear * WEEKS_PER_YEAR + WEEKS_PER_YEAR;
    if (absEnd < yrStart || absStart > yrEnd) continue;
    const startInYear = airY < currentYear ? airW - (currentYear - airY) * WEEKS_PER_YEAR : airW;
    const rawEnd      = startInYear + season.episodeCount - 1;
    out.push({
      show, season,
      airWeek: Math.max(1, startInYear),
      endWeek: Math.min(WEEKS_PER_YEAR, rawEnd),
      colorIdx: idx++ % SHOW_COLORS.length,
    });
  }
  return out;
}

// ── Canvas pieces (all absolutely positioned) ─────────────────────────────────

// Alternating lane stripes + vertical week guides
function Background({ numLanes, rowH, showsH }: { numLanes: number; rowH: number; showsH: number }) {
  const laneArea = numLanes * rowH;
  return (
    <>
      {/* Lane stripes */}
      {Array.from({ length: numLanes }, (_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            top: HDR_H + i * rowH,
            left: 0, width: TOTAL_W, height: rowH,
            backgroundColor: i % 2 === 0 ? '#0c1020' : '#101428',
          }}
        />
      ))}
      {/* Shows area stripe */}
      {showsH > 0 && (
        <View style={{
          position: 'absolute',
          top: HDR_H + laneArea + 6,
          left: 0, width: TOTAL_W, height: showsH,
          backgroundColor: '#0a0e1c',
        }} />
      )}
      {/* Vertical guide lines every 4 weeks */}
      {Array.from({ length: WEEKS_PER_YEAR }, (_, i) => {
        const w = i + 1;
        if (w % 4 !== 1) return null;
        return (
          <View
            key={w}
            style={{
              position: 'absolute',
              top: HDR_H, left: i * CELL_W,
              width: 1, height: laneArea + showsH + 6,
              backgroundColor: '#ffffff09',
            }}
          />
        );
      })}
    </>
  );
}

// Week number header row
function WeekHeader({ currentWeek }: { currentWeek: number }) {
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, width: TOTAL_W, height: HDR_H, flexDirection: 'row' }}>
      {Array.from({ length: WEEKS_PER_YEAR }, (_, i) => {
        const w = i + 1;
        const isCur = w === currentWeek;
        // Show every 2 weeks + always show current week
        const show  = w % 2 === 1 || isCur;
        return (
          <View key={w} style={{ width: CELL_W, alignItems: 'center', justifyContent: 'center', height: HDR_H }}>
            {show && (
              <Text style={[g.hdrNum, isCur && g.hdrNumCur]}>
                {isCur ? '▼' : w}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

// Gold now-line
function NowLine({ week, height }: { week: number; height: number }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0, left: (week - 1) * CELL_W + CELL_W / 2 - 1,
        width: 2, height,
        backgroundColor: '#e6b25455', zIndex: 30,
      }}
    />
  );
}

// Individual theme block
function ThemeBlock({ win, lane, rowH, currentWeek }: {
  win: ThemeWindow; lane: number; rowH: number; currentWeek: number;
}) {
  const x = (win.startWeek - 1) * CELL_W;
  const y = HDR_H + lane * rowH;
  const w = (win.endWeek - win.startWeek + 1) * CELL_W;
  const accent = winAccent(win);
  const isActive = currentWeek >= win.startWeek && currentWeek <= win.endWeek;

  return (
    <View
      style={{
        position: 'absolute',
        left: x + 1, top: y + 2,
        width: w - 2, height: rowH - 4,
        backgroundColor: winFill(win),
        borderWidth: isActive ? 1.5 : 1,
        borderColor: winBorder(win) + (isActive ? '' : ''),
        borderRadius: 6,
        overflow: 'hidden',
        justifyContent: 'center',
        paddingHorizontal: 7,
      }}
    >
      {/* Accent left edge */}
      <View style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        backgroundColor: accent + (isActive ? 'ff' : '88'),
      }} />

      <View style={{ paddingLeft: 6 }}>
        <Text style={[g.blockEmoji]}>{win.emoji}</Text>
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
  const x     = (item.airWeek - 1) * CELL_W;
  const w     = (item.endWeek - item.airWeek + 1) * CELL_W;
  const win   = getThemeWindow(item.show.theme);
  const hasBoost = win && item.airWeek <= win.endWeek && item.endWeek >= win.startWeek;

  return (
    <View
      style={{
        position: 'absolute',
        left: x + 1, top: laneAreaBottom + 2,
        width: w - 2, height: SHOW_H - 4,
        backgroundColor: color + '28',
        borderWidth: 1, borderColor: color + 'aa',
        borderRadius: 5, overflow: 'hidden',
        justifyContent: 'center', paddingHorizontal: 6,
      }}
    >
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: color + 'cc' }} />
      <View style={{ paddingLeft: 6 }}>
        <Text style={[g.showTitle, { color }]} numberOfLines={1}>{item.show.title}</Text>
        {w >= 100 && hasBoost && win && (
          <Text style={[g.showBoost, { color: win.type === 'cultural' ? '#e6b254' : '#3db8a8' }]} numberOfLines={1}>
            {win.emoji} {win.type === 'cultural' ? '+25%' : '+15%'} viewers
          </Text>
        )}
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ScheduleScreen() {
  const router = useRouter();
  const { network, shows } = useGameStore();
  const currentWeek = network.currentWeek as number;
  const currentYear = network.currentYear as number;

  const scheduled = getScheduledShows(shows, currentYear);

  const laneAreaH = NUM_LANES * ROW_H;
  const showsH    = scheduled.length > 0 ? scheduled.length * SHOW_H + 6 : 0;
  const canvasH   = HDR_H + laneAreaH + showsH;
  const laneAreaBottom = HDR_H + laneAreaH + 6;

  const initX = Math.max(0, (currentWeek - 1) * CELL_W - 80);

  return (
    <SafeAreaView style={s.container}>
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
        {/* Legend chips */}
        <View style={s.legendRight}>
          <View style={[s.chip, { borderColor: '#e6b25466', backgroundColor: '#e6b25415' }]}>
            <Text style={[s.chipText, { color: '#e6b254' }]}>+25%</Text>
          </View>
          <View style={[s.chip, { borderColor: '#3db8a866', backgroundColor: '#3db8a815' }]}>
            <Text style={[s.chipText, { color: '#3db8a8' }]}>+15%</Text>
          </View>
        </View>
      </View>

      {/* Full-screen horizontal scroll calendar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentOffset={{ x: initX, y: 0 }}
        style={{ flex: 1 }}
        contentContainerStyle={{ width: TOTAL_W, height: canvasH, position: 'relative' }}
      >
        <Background numLanes={NUM_LANES} rowH={ROW_H} showsH={showsH} />
        <NowLine week={currentWeek} height={canvasH} />
        <WeekHeader currentWeek={currentWeek} />

        {/* Theme window blocks */}
        {THEME_WINDOWS.map(win => {
          const lane = LANE_MAP.get(win.theme);
          if (lane === undefined) return null;
          return (
            <ThemeBlock
              key={win.theme}
              win={win}
              lane={lane}
              rowH={ROW_H}
              currentWeek={currentWeek}
            />
          );
        })}

        {/* Divider line between themes and shows */}
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
