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

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  pageBg:   '#0f1220',
  cardBg:   '#191c2a',
  border:   '#252840',
  text:     '#f0ede8',
  muted:    '#9a958e',
  mutedMid: '#6b6880',
  gold:     '#e6b254',
  green:    '#4ec46e',
  teal:     '#3db8a8',
  amber:    '#d4753a',
  gap:      '#131625',  // no-theme weeks
};

// ── Grid dimensions ───────────────────────────────────────────────────────────
const CELL_W   = 28;   // px per week
const THEME_H  = 56;   // theme block height (tall so text fits)
const SHOW_H   = 28;   // show bar row height
const HDR_H    = 20;   // week number header

const SHOW_COLORS = ['#5b8dee', '#e04f7c', '#4ec46e', '#d4753a', '#9b72cb', '#3db8a8', '#e6b254', '#c06060'];

// ── Window color (fill / border) ──────────────────────────────────────────────
function windowFill(win: ThemeWindow): string {
  return win.type === 'cultural' ? '#e6b25428' : '#3db8a828';
}
function windowBorder(win: ThemeWindow): string {
  return win.type === 'cultural' ? '#e6b25488' : '#3db8a888';
}
function windowText(win: ThemeWindow): string {
  return win.type === 'cultural' ? '#e6b254' : '#3db8a8';
}

// ── Scheduled show helper ─────────────────────────────────────────────────────
interface ScheduledShow {
  show: Show;
  season: Season;
  airWeek: number;   // in current-year coords
  endWeek: number;
  colorIdx: number;
}

function getScheduledShows(shows: Show[], currentYear: number): ScheduledShow[] {
  const result: ScheduledShow[] = [];
  let idx = 0;
  for (const show of shows) {
    const season = show.seasons[show.currentSeasonIndex];
    if (!season?.airDateWeek || !season?.airDateYear) continue;
    const isVisible = ['marketing', 'airing', 'renewal-pending', 'completed', 'cancelled'].includes(show.status);
    if (!isVisible) continue;

    const airY = season.airDateYear;
    const airW = season.airDateWeek;

    // Check if this show has any episodes in the current year
    const absStart = airY * WEEKS_PER_YEAR + airW;
    const absEnd   = absStart + season.episodeCount - 1;
    const yrStart  = currentYear * WEEKS_PER_YEAR + 1;
    const yrEnd    = currentYear * WEEKS_PER_YEAR + WEEKS_PER_YEAR;
    if (absEnd < yrStart || absStart > yrEnd) continue;

    const startInYear = airY < currentYear
      ? airW - (currentYear - airY) * WEEKS_PER_YEAR
      : airW;
    const rawEnd = startInYear + season.episodeCount - 1;

    result.push({
      show, season,
      airWeek: Math.max(1, startInYear),
      endWeek: Math.min(WEEKS_PER_YEAR, rawEnd),
      colorIdx: idx % SHOW_COLORS.length,
    });
    idx++;
  }
  return result;
}

// ── Build ordered list of periods (theme windows + gaps) ──────────────────────
interface Period {
  startWeek: number;
  endWeek: number;
  window: ThemeWindow | null;  // null = no theme
}

function buildPeriods(): Period[] {
  // Sort windows by start week
  const sorted = [...THEME_WINDOWS].sort((a, b) => a.startWeek - b.startWeek);
  const periods: Period[] = [];
  let cursor = 1;

  for (const win of sorted) {
    if (win.startWeek > cursor) {
      // Gap before this window
      periods.push({ startWeek: cursor, endWeek: win.startWeek - 1, window: null });
    }
    if (win.startWeek >= cursor) {
      periods.push({ startWeek: win.startWeek, endWeek: win.endWeek, window: win });
      cursor = win.endWeek + 1;
    }
  }

  if (cursor <= WEEKS_PER_YEAR) {
    periods.push({ startWeek: cursor, endWeek: WEEKS_PER_YEAR, window: null });
  }

  return periods;
}

const PERIODS = buildPeriods();

// ── Week number header row ────────────────────────────────────────────────────
function WeekHeaderRow({ currentWeek }: { currentWeek: number }) {
  return (
    <View style={{ flexDirection: 'row', height: HDR_H }}>
      {Array.from({ length: WEEKS_PER_YEAR }, (_, i) => {
        const w = i + 1;
        const show = w % 4 === 1 || w === currentWeek;
        const isCur = w === currentWeek;
        return (
          <View key={w} style={{ width: CELL_W, alignItems: 'center', justifyContent: 'center' }}>
            {show && (
              <Text style={[hdr.num, isCur && hdr.numCurrent]}>
                {isCur ? '▼' : w}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const hdr = StyleSheet.create({
  num:        { fontFamily: 'Manrope_700Bold', fontSize: 7.5, color: '#4a4760' },
  numCurrent: { color: '#e6b254', fontSize: 9 },
});

// ── Theme period block row ────────────────────────────────────────────────────
function ThemePeriodRow({ currentWeek }: { currentWeek: number }) {
  return (
    <View style={{ flexDirection: 'row', height: THEME_H, marginBottom: 2 }}>
      {PERIODS.map((p, i) => {
        const width = (p.endWeek - p.startWeek + 1) * CELL_W;
        const isCurPeriod = currentWeek >= p.startWeek && currentWeek <= p.endWeek;

        if (!p.window) {
          return (
            <View
              key={i}
              style={[tb.gap, { width }, isCurPeriod && tb.gapActive]}
            />
          );
        }

        const win   = p.window;
        const fill  = windowFill(win);
        const bdr   = windowBorder(win);
        const color = windowText(win);

        return (
          <View
            key={i}
            style={[
              tb.block,
              { width, backgroundColor: fill, borderColor: bdr },
              isCurPeriod && { borderWidth: 1.5 },
            ]}
          >
            <Text style={tb.emoji}>{win.emoji}</Text>
            <Text style={[tb.label, { color }]} numberOfLines={2}>
              {win.label}
            </Text>
            <Text style={tb.weeks}>W{win.startWeek}–{win.endWeek}</Text>
          </View>
        );
      })}
    </View>
  );
}

const tb = StyleSheet.create({
  gap:       { backgroundColor: '#131625', borderTopWidth: 0, borderBottomWidth: 0 },
  gapActive: { backgroundColor: '#191c2a' },
  block:     { borderWidth: 1, borderRadius: 0, paddingHorizontal: 5, paddingVertical: 4, justifyContent: 'center', overflow: 'hidden' },
  emoji:     { fontSize: 14, lineHeight: 16 },
  label:     { fontFamily: 'Manrope_700Bold', fontSize: 8.5, lineHeight: 11, marginTop: 2 },
  weeks:     { fontFamily: 'Manrope_400Regular', fontSize: 7, color: '#6b6880', marginTop: 2 },
});

// ── Current-week vertical line ────────────────────────────────────────────────
function NowLine({ week, totalHeight }: { week: number; totalHeight: number }) {
  const x = (week - 1) * CELL_W + CELL_W / 2 - 1;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0, left: x, width: 2,
        height: totalHeight,
        backgroundColor: '#e6b25466',
        zIndex: 10,
      }}
    />
  );
}

// ── Show bar row ──────────────────────────────────────────────────────────────
function ShowBarRow({ item }: { item: ScheduledShow }) {
  const color  = SHOW_COLORS[item.colorIdx];
  const preW   = (item.airWeek - 1) * CELL_W;
  const barW   = (item.endWeek - item.airWeek + 1) * CELL_W;

  return (
    <View style={{ flexDirection: 'row', height: SHOW_H, alignItems: 'center', marginBottom: 2 }}>
      {preW > 0 && <View style={{ width: preW }} />}
      <View
        style={[
          showbar.bar,
          { width: barW, backgroundColor: color + '28', borderColor: color + 'aa' },
        ]}
      >
        <Text style={[showbar.title, { color }]} numberOfLines={1}>
          {item.show.title}
        </Text>
      </View>
    </View>
  );
}

const showbar = StyleSheet.create({
  bar:   { height: SHOW_H - 4, borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, justifyContent: 'center', overflow: 'hidden' },
  title: { fontFamily: 'Manrope_700Bold', fontSize: 9, letterSpacing: 0.2 },
});

// ── Schedule Screen ───────────────────────────────────────────────────────────
export default function ScheduleScreen() {
  const router = useRouter();
  const { network, shows } = useGameStore();
  const { currentWeek, currentYear } = network;

  const scheduled = getScheduledShows(shows, currentYear);
  const noShows   = scheduled.length === 0;

  // Total grid height for the now-line
  const gridH = HDR_H + THEME_H + 2 + (noShows ? 0 : (SHOW_H + 2) * scheduled.length);

  // Scroll so current week is roughly centered on mount
  const initX = Math.max(0, (currentWeek - 1) * CELL_W - 120);

  return (
    <SafeAreaView style={s.container}>
      <LinearGradient colors={['#131829', '#0f1220']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>SCHEDULE</Text>
          <Text style={s.headerSub}>YEAR {currentYear} · WK {currentWeek}</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Legend pills */}
      <View style={s.legendRow}>
        <View style={[s.legendPill, { backgroundColor: '#e6b25422', borderColor: '#e6b25466' }]}>
          <Text style={[s.legendText, { color: '#e6b254' }]}>Cultural  +25%</Text>
        </View>
        <View style={[s.legendPill, { backgroundColor: '#3db8a822', borderColor: '#3db8a866' }]}>
          <Text style={[s.legendText, { color: '#3db8a8' }]}>Seasonal  +15%</Text>
        </View>
        <View style={[s.legendPill, { backgroundColor: '#131625', borderColor: '#252840' }]}>
          <Text style={[s.legendText, { color: '#4a4760' }]}>Off-season</Text>
        </View>
      </View>

      {/* Full-screen calendar timeline */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentOffset={{ x: initX, y: 0 }}
        style={s.hScroll}
        contentContainerStyle={{ width: CELL_W * WEEKS_PER_YEAR, position: 'relative' }}
      >
        {/* Now line */}
        <NowLine week={currentWeek} totalHeight={gridH} />

        {/* Week number header */}
        <WeekHeaderRow currentWeek={currentWeek} />

        {/* Theme period blocks */}
        <ThemePeriodRow currentWeek={currentWeek} />

        {/* Show bars */}
        {!noShows && scheduled.map(item => (
          <ShowBarRow key={item.show.id} item={item} />
        ))}
      </ScrollView>

      {/* Show name sidebar (outside horizontal scroll, aligned vertically) */}
      {!noShows && (
        <View style={[s.sidebarWrap, { top: 90 + HDR_H + THEME_H + 4 }]}>
          {scheduled.map((item, i) => {
            const color = SHOW_COLORS[item.colorIdx];
            const win   = getThemeWindow(item.show.theme);
            const inWindow = win &&
              item.airWeek <= win.endWeek && item.endWeek >= win.startWeek;
            return (
              <View key={item.show.id} style={[s.sidebarRow, { height: SHOW_H + 2 }]}>
                <View style={[s.sidebarDot, { backgroundColor: color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.sidebarTitle} numberOfLines={1}>{item.show.title}</Text>
                  {inWindow && win && (
                    <Text style={[s.sidebarWin, { color: win.type === 'cultural' ? '#e6b254' : '#3db8a8' }]} numberOfLines={1}>
                      {win.emoji} {win.type === 'cultural' ? '+25%' : '+15%'}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Bottom: tapable theme window info cards */}
      <ScrollView style={s.bottomScroll} showsVerticalScrollIndicator={false}>
        <View style={s.bottomPadding} />
        <Text style={s.sectionLabel}>THEME WINDOWS THIS YEAR</Text>

        {PERIODS.filter(p => p.window).map((p, i) => {
          const win   = p.window!;
          const color = windowText(win);
          const bg    = windowFill(win);
          const bdr   = windowBorder(win);
          const isActive = currentWeek >= win.startWeek && currentWeek <= win.endWeek;
          const isUpcoming = win.startWeek > currentWeek;

          // Which of the player's shows overlap?
          const overlapping = scheduled.filter(
            sh => sh.airWeek <= win.endWeek && sh.endWeek >= win.startWeek
          );

          return (
            <View key={i} style={[s.winCard, { backgroundColor: bg, borderColor: bdr }, isActive && s.winCardActive]}>
              <View style={s.winCardTop}>
                <Text style={s.winEmoji}>{win.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.winLabel, { color }]}>{win.label}</Text>
                  <Text style={s.winWeeks}>Weeks {win.startWeek}–{win.endWeek}</Text>
                </View>
                <View style={s.winRight}>
                  <View style={[s.boostPill, { backgroundColor: color + '22', borderColor: color + '55' }]}>
                    <Text style={[s.boostText, { color }]}>
                      {win.viewershipMultiplier === 1.25 ? '+25%' : '+15%'}
                    </Text>
                  </View>
                  {isActive && (
                    <View style={s.nowPill}>
                      <Text style={s.nowPillText}>NOW</Text>
                    </View>
                  )}
                  {isUpcoming && (
                    <Text style={s.upcomingText}>in {win.startWeek - currentWeek}w</Text>
                  )}
                </View>
              </View>

              <Text style={s.winDesc}>{win.description}</Text>

              {overlapping.length > 0 && (
                <View style={s.overlapRow}>
                  {overlapping.map(sh => {
                    const shColor = SHOW_COLORS[sh.colorIdx];
                    return (
                      <View key={sh.show.id} style={[s.overlapPill, { borderColor: shColor + '88', backgroundColor: shColor + '18' }]}>
                        <View style={[s.overlapDot, { backgroundColor: shColor }]} />
                        <Text style={[s.overlapTitle, { color: shColor }]} numberOfLines={1}>{sh.show.title}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0f1220' },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#252840' },
  backBtn:     { width: 60 },
  backText:    { color: '#e6b254', fontFamily: 'Manrope_600SemiBold', fontSize: 15 },
  headerCenter:{ flex: 1, alignItems: 'center' },
  headerTitle: { color: '#f0ede8', fontFamily: 'BebasNeue_400Regular', fontSize: 22, letterSpacing: 0.5 },
  headerSub:   { color: '#6b6880', fontFamily: 'Manrope_700Bold', fontSize: 9, letterSpacing: 1.5, marginTop: 1 },

  legendRow:   { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#252840' },
  legendPill:  { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  legendText:  { fontFamily: 'Manrope_700Bold', fontSize: 10, letterSpacing: 0.5 },

  hScroll:     { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: '#252840' },

  // Show name sidebar (absolutely positioned alongside the horizontal scroll)
  sidebarWrap: { position: 'absolute', left: 0, width: 110, zIndex: 5, backgroundColor: '#0f1220ee' },
  sidebarRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10 },
  sidebarDot:  { width: 7, height: 7, borderRadius: 3.5, flexShrink: 0 },
  sidebarTitle:{ fontFamily: 'Manrope_600SemiBold', color: '#9a958e', fontSize: 9 },
  sidebarWin:  { fontFamily: 'Manrope_700Bold', fontSize: 8 },

  bottomScroll:  { flex: 1 },
  bottomPadding: { height: 12 },
  sectionLabel:  { fontFamily: 'Manrope_700Bold', color: '#6b6880', fontSize: 9, letterSpacing: 2, paddingHorizontal: 16, marginBottom: 10 },

  winCard:       { marginHorizontal: 14, marginBottom: 8, borderWidth: 1, borderRadius: 12, padding: 12 },
  winCardActive: { borderWidth: 1.5 },
  winCardTop:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  winEmoji:      { fontSize: 22, width: 30, textAlign: 'center' },
  winLabel:      { fontFamily: 'Manrope_700Bold', fontSize: 13 },
  winWeeks:      { fontFamily: 'Manrope_400Regular', color: '#6b6880', fontSize: 11, marginTop: 2 },
  winRight:      { alignItems: 'flex-end', gap: 4 },
  boostPill:     { borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  boostText:     { fontFamily: 'Manrope_800ExtraBold', fontSize: 11 },
  nowPill:       { backgroundColor: '#4ec46e22', borderWidth: 1, borderColor: '#4ec46e88', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  nowPillText:   { fontFamily: 'Manrope_800ExtraBold', color: '#4ec46e', fontSize: 9, letterSpacing: 1 },
  upcomingText:  { fontFamily: 'Manrope_400Regular', color: '#6b6880', fontSize: 10 },
  winDesc:       { fontFamily: 'Manrope_400Regular', color: '#9a958e', fontSize: 12, lineHeight: 17 },

  overlapRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  overlapPill:   { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  overlapDot:    { width: 5, height: 5, borderRadius: 2.5 },
  overlapTitle:  { fontFamily: 'Manrope_700Bold', fontSize: 10 },
});
