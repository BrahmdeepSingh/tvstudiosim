import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useGameStore } from '../src/store/gameStore';
import { WEEKS_PER_YEAR } from '../src/constants/game';
import { THEME_WINDOWS, ThemeWindow, getThemeWindow } from '../src/constants/schedule';
import { Show, Season } from '../src/types';

// ── Grid constants ────────────────────────────────────────────────────────────
const CELL_W  = 26;   // px per week column
const ROW_H   = 30;   // px per theme row
const SHOW_H  = 28;   // px per show row
const HDR_H   = 22;   // week-number header height
const LABEL_W = 98;   // fixed left sidebar width

// All 21 windows sorted chronologically by start week
const SORTED_WINDOWS = [...THEME_WINDOWS].sort(
  (a, b) => a.startWeek - b.startWeek || a.theme.localeCompare(b.theme)
);

const TOTAL_GRID_W = CELL_W * WEEKS_PER_YEAR;

const SHOW_COLORS = ['#5b8dee','#e04f7c','#4ec46e','#d4753a','#9b72cb','#3db8a8','#e6b254','#c06060'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function windowColor(win: ThemeWindow) {
  return win.type === 'cultural' ? '#e6b254' : '#3db8a8';
}

function windowFill(win: ThemeWindow) {
  return win.type === 'cultural' ? '#e6b25430' : '#3db8a830';
}

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
      colorIdx: idx % SHOW_COLORS.length,
    });
    idx++;
  }
  return out;
}

// ── Reusable row pieces (rendered inside the horizontal scroll canvas) ─────────
function WeekHeaderCells({ currentWeek }: { currentWeek: number }) {
  return (
    <View style={{ flexDirection: 'row', height: HDR_H, width: TOTAL_GRID_W }}>
      {Array.from({ length: WEEKS_PER_YEAR }, (_, i) => {
        const w = i + 1;
        const isCur   = w === currentWeek;
        const showNum = w % 4 === 1 || isCur;
        return (
          <View key={w} style={{ width: CELL_W, alignItems: 'center', justifyContent: 'center' }}>
            {showNum && (
              <Text style={[rs.hdrNum, isCur && rs.hdrNumCur]}>{isCur ? '▼' : w}</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

function ThemeGridRow({ win, currentWeek }: { win: ThemeWindow; currentWeek: number }) {
  const preW  = (win.startWeek - 1) * CELL_W;
  const barW  = (win.endWeek - win.startWeek + 1) * CELL_W;
  const postW = (WEEKS_PER_YEAR - win.endWeek) * CELL_W;
  const color = windowColor(win);
  const fill  = windowFill(win);
  const inWindow = currentWeek >= win.startWeek && currentWeek <= win.endWeek;

  return (
    <View style={{ flexDirection: 'row', height: ROW_H, width: TOTAL_GRID_W, alignItems: 'center' }}>
      {/* Pre-window gap */}
      {preW > 0 && <View style={{ width: preW, height: ROW_H - 2, backgroundColor: '#0d1022' }} />}

      {/* Window bar */}
      <View
        style={[
          rs.winBar,
          {
            width: barW,
            backgroundColor: fill,
            borderColor: color + (inWindow ? 'cc' : '66'),
            borderWidth: inWindow ? 1.5 : 1,
          },
        ]}
      >
        <Text style={rs.winEmoji}>{win.emoji}</Text>
        {barW >= 80 && (
          <Text style={[rs.winLabel, { color }]} numberOfLines={1}>
            {win.label}
          </Text>
        )}
      </View>

      {/* Post-window gap */}
      {postW > 0 && <View style={{ width: postW, height: ROW_H - 2, backgroundColor: '#0d1022' }} />}
    </View>
  );
}

function ShowGridRow({ item }: { item: ScheduledShow }) {
  const color = SHOW_COLORS[item.colorIdx];
  const preW  = (item.airWeek - 1) * CELL_W;
  const barW  = (item.endWeek - item.airWeek + 1) * CELL_W;
  const postW = (WEEKS_PER_YEAR - item.endWeek) * CELL_W;

  return (
    <View style={{ flexDirection: 'row', height: SHOW_H, width: TOTAL_GRID_W, alignItems: 'center' }}>
      {preW > 0 && <View style={{ width: preW }} />}
      <View style={[rs.showBar, { width: barW, backgroundColor: color + '28', borderColor: color + 'aa' }]}>
        <Text style={[rs.showBarText, { color }]} numberOfLines={1}>{item.show.title}</Text>
      </View>
      {postW > 0 && <View style={{ width: postW }} />}
    </View>
  );
}

// ── Now line (absolute, spans full height of canvas) ─────────────────────────
function NowLine({ week, height }: { week: number; height: number }) {
  const x = (week - 1) * CELL_W + CELL_W / 2 - 1;
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: x, width: 2, height, backgroundColor: '#e6b25460', zIndex: 20 }}
    />
  );
}

// ── Fixed left sidebar ────────────────────────────────────────────────────────
function LabelSidebar({ scheduled }: { scheduled: ScheduledShow[] }) {
  return (
    <View style={{ width: LABEL_W }}>
      {/* Spacer for week-number header */}
      <View style={{ height: HDR_H }} />

      {/* One label per theme window */}
      {SORTED_WINDOWS.map(win => {
        const color = windowColor(win);
        return (
          <View key={win.theme} style={[lb.row, { height: ROW_H }]}>
            <Text style={lb.emoji}>{win.emoji}</Text>
            <Text style={[lb.name, { color }]} numberOfLines={1}>
              {win.theme}
            </Text>
          </View>
        );
      })}

      {/* Divider spacer */}
      {scheduled.length > 0 && <View style={{ height: 8 }} />}

      {/* Show names */}
      {scheduled.map(item => {
        const color = SHOW_COLORS[item.colorIdx];
        return (
          <View key={item.show.id} style={[lb.row, { height: SHOW_H }]}>
            <View style={[lb.dot, { backgroundColor: color }]} />
            <Text style={[lb.showName, { color }]} numberOfLines={1}>
              {item.show.title}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const lb = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 6 },
  emoji:    { fontSize: 11, width: 16, textAlign: 'center' },
  name:     { fontFamily: 'Manrope_700Bold', fontSize: 9, letterSpacing: 0.3, flex: 1 },
  dot:      { width: 6, height: 6, borderRadius: 3, flexShrink: 0, marginLeft: 4 },
  showName: { fontFamily: 'Manrope_600SemiBold', fontSize: 9, flex: 1 },
});

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ScheduleScreen() {
  const router   = useRouter();
  const { network, shows } = useGameStore();
  const currentWeek = network.currentWeek as number;
  const currentYear = network.currentYear as number;

  const scheduled = getScheduledShows(shows, currentYear);

  // Height of horizontal scroll canvas
  const canvasH =
    HDR_H
    + ROW_H * SORTED_WINDOWS.length
    + (scheduled.length > 0 ? 8 + SHOW_H * scheduled.length : 0);

  // Scroll offset so current week starts roughly centered
  const initX = Math.max(0, (currentWeek - 1) * CELL_W - 80);

  return (
    <SafeAreaView style={s.container}>
      <LinearGradient colors={['#131829', '#0f1220']} style={StyleSheet.absoluteFill} />

      {/* Fixed header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.title}>SCHEDULE</Text>
          <Text style={s.subtitle}>YEAR {currentYear} · WEEK {currentWeek}</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Legend */}
      <View style={s.legend}>
        <View style={[s.legendPill, { backgroundColor: '#e6b25422', borderColor: '#e6b25466' }]}>
          <Text style={[s.legendText, { color: '#e6b254' }]}>Cultural  +25% viewers</Text>
        </View>
        <View style={[s.legendPill, { backgroundColor: '#3db8a822', borderColor: '#3db8a866' }]}>
          <Text style={[s.legendText, { color: '#3db8a8' }]}>Seasonal  +15% viewers</Text>
        </View>
      </View>

      {/* Body: sidebar + horizontal grid */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={s.body}>
          {/* Fixed label sidebar */}
          <LabelSidebar scheduled={scheduled} />

          {/* Horizontal scroll grid */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: initX, y: 0 }}
            style={{ flex: 1 }}
            contentContainerStyle={{ width: TOTAL_GRID_W, height: canvasH, position: 'relative' }}
          >
            {/* NOW line */}
            <NowLine week={currentWeek} height={canvasH} />

            {/* Week numbers */}
            <WeekHeaderCells currentWeek={currentWeek} />

            {/* Theme window bars */}
            {SORTED_WINDOWS.map(win => (
              <ThemeGridRow key={win.theme} win={win} currentWeek={currentWeek} />
            ))}

            {/* Show bars */}
            {scheduled.length > 0 && (
              <>
                <View style={{ height: 8, width: TOTAL_GRID_W, backgroundColor: '#0d1022' }} />
                {scheduled.map(item => (
                  <ShowGridRow key={item.show.id} item={item} />
                ))}
              </>
            )}
          </ScrollView>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Row styles ────────────────────────────────────────────────────────────────
const rs = StyleSheet.create({
  hdrNum:     { fontFamily: 'Manrope_700Bold', fontSize: 7.5, color: '#4a4760' },
  hdrNumCur:  { color: '#e6b254', fontSize: 9 },

  winBar:     { height: ROW_H - 4, borderRadius: 4, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, gap: 3, overflow: 'hidden' },
  winEmoji:   { fontSize: 11, lineHeight: 14 },
  winLabel:   { fontFamily: 'Manrope_700Bold', fontSize: 8, flex: 1 },

  showBar:    { height: SHOW_H - 4, borderWidth: 1, borderRadius: 4, justifyContent: 'center', paddingHorizontal: 5, overflow: 'hidden' },
  showBarText:{ fontFamily: 'Manrope_700Bold', fontSize: 8.5 },
});

// ── Screen styles ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0f1220' },

  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#252840' },
  backBtn:      { width: 60 },
  backText:     { color: '#e6b254', fontFamily: 'Manrope_600SemiBold', fontSize: 15 },
  headerCenter: { flex: 1, alignItems: 'center' },
  title:        { color: '#f0ede8', fontFamily: 'BebasNeue_400Regular', fontSize: 22, letterSpacing: 0.5 },
  subtitle:     { color: '#6b6880', fontFamily: 'Manrope_700Bold', fontSize: 9, letterSpacing: 1.5, marginTop: 1 },

  legend:       { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#252840' },
  legendPill:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3 },
  legendText:   { fontFamily: 'Manrope_700Bold', fontSize: 10 },

  body:         { flexDirection: 'row', paddingLeft: 6, paddingRight: 0, paddingTop: 6 },
});
