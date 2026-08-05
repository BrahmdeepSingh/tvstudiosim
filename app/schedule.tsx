import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useGameStore } from '../src/store/gameStore';
import { WEEKS_PER_YEAR } from '../src/constants/game';
import { THEME_WINDOWS, getThemeWindow } from '../src/constants/schedule';
import { Show, Season } from '../src/types';

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  pageBg:    '#0f1220',
  cardBg:    '#191c2a',
  border:    '#252840',
  text:      '#f0ede8',
  muted:     '#9a958e',
  mutedMid:  '#6b6880',
  gold:      '#e6b254',
  goldDim:   '#e6b25420',
  goldBg:    '#1a1108',
  green:     '#4ec46e',
  amber:     '#d4753a',
  red:       '#c43820',
  teal:      '#3db8a8',
  cultural:  '#e6b254',   // gold tint for cultural windows
  seasonal:  '#3db8a8',   // teal tint for seasonal windows
};

const CELL_W = 26;   // px per week column
const SHOW_H = 32;   // px per show row
const BAND_H = 16;   // theme band height
const HDR_H  = 22;   // week number header height

// Show bar colors — rotated per show index
const SHOW_COLORS = ['#5b8dee', '#e04f7c', '#4ec46e', '#d4753a', '#9b72cb', '#3db8a8', '#e6b254', '#c06060'];

interface ScheduledShow {
  show: Show;
  season: Season;
  airWeek: number;
  airYear: number;
  endWeek: number;  // inclusive
  colorIdx: number;
}

function getScheduledShows(shows: Show[], currentYear: number): ScheduledShow[] {
  const result: ScheduledShow[] = [];
  let colorIdx = 0;

  for (const show of shows) {
    const season = show.seasons[show.currentSeasonIndex];
    if (!season) continue;

    const hasAirDate = season.airDateWeek != null && season.airDateYear != null;
    const isScheduled = ['marketing', 'airing', 'renewal-pending', 'completed', 'cancelled'].includes(show.status);
    if (!hasAirDate || !isScheduled) continue;

    const airWeek = season.airDateWeek!;
    const airYear = season.airDateYear!;

    // Only include shows that have episodes in the current year
    const endWeekAbsolute = airYear * WEEKS_PER_YEAR + airWeek + season.episodeCount - 1;
    const currentYearStart = currentYear * WEEKS_PER_YEAR + 1;
    const currentYearEnd = currentYear * WEEKS_PER_YEAR + WEEKS_PER_YEAR;

    if (endWeekAbsolute < currentYearStart) continue;
    if (airYear * WEEKS_PER_YEAR + airWeek > currentYearEnd) continue;

    // Translate to current-year week coordinates
    const startInYear = airYear < currentYear
      ? 1 - ((currentYear - airYear) * WEEKS_PER_YEAR - airWeek + 1)  // negative offset, clamp to 1
      : airWeek;

    // For spans crossing year end, cap endWeek at 52
    const rawEnd = airYear < currentYear
      ? airWeek + season.episodeCount - 1 - (currentYear - airYear) * WEEKS_PER_YEAR
      : airWeek + season.episodeCount - 1;

    result.push({
      show,
      season,
      airWeek: Math.max(1, startInYear),
      airYear,
      endWeek: Math.min(WEEKS_PER_YEAR, rawEnd),
      colorIdx: colorIdx % SHOW_COLORS.length,
    });
    colorIdx++;
  }

  return result;
}

// ── Week cell widths ──────────────────────────────────────────────────────────
function cellX(week: number): number { return (week - 1) * CELL_W; }
function cellW(startWeek: number, endWeek: number): number {
  return (endWeek - startWeek + 1) * CELL_W;
}

// ── Theme Band Row ────────────────────────────────────────────────────────────
function ThemeBandRow() {
  const cells: React.ReactElement[] = [];
  for (let w = 1; w <= WEEKS_PER_YEAR; w++) {
    // Find window for this week
    const win = THEME_WINDOWS.find(tw => w >= tw.startWeek && w <= tw.endWeek);
    const bg = win ? (win.type === 'cultural' ? C.cultural + '33' : C.seasonal + '2a') : 'transparent';
    const border = win ? (win.type === 'cultural' ? C.cultural + '66' : C.seasonal + '55') : 'transparent';

    // Start of a window: show emoji
    const isWindowStart = win && win.startWeek === w;

    cells.push(
      <View
        key={w}
        style={[
          sb.bandCell,
          { backgroundColor: bg, borderBottomColor: border },
        ]}
      >
        {isWindowStart && (
          <Text style={sb.bandEmoji} numberOfLines={1}>{win!.emoji}</Text>
        )}
      </View>
    );
  }
  return <View style={sb.bandRow}>{cells}</View>;
}

// ── Show Bar Row ──────────────────────────────────────────────────────────────
function ShowBarRow({ item, currentWeek }: { item: ScheduledShow; currentWeek: number }) {
  const color = SHOW_COLORS[item.colorIdx];
  const preW  = cellX(item.airWeek);
  const barW  = cellW(item.airWeek, item.endWeek);
  const win   = getThemeWindow(item.show.theme);
  const inWindow = win && currentWeek >= item.airWeek && currentWeek <= item.endWeek
    && currentWeek >= win.startWeek && currentWeek <= win.endWeek;
  const hasWindow = win && (
    (win.startWeek <= item.endWeek && win.endWeek >= item.airWeek)
  );

  return (
    <View style={sb.showRow}>
      {/* Pre-air spacer */}
      {preW > 0 && <View style={{ width: preW }} />}

      {/* Airing bar */}
      <View
        style={[
          sb.showBar,
          {
            width: barW,
            backgroundColor: color + '33',
            borderColor: color + 'cc',
          },
          hasWindow && { borderTopWidth: 2, borderTopColor: C.gold },
        ]}
      >
        <Text style={[sb.showBarTitle, { color }]} numberOfLines={1}>
          {item.show.title}
        </Text>
        <Text style={sb.showBarMeta} numberOfLines={1}>
          {item.show.theme} · {item.season.episodeCount}ep
        </Text>
      </View>
    </View>
  );
}

// ── Current week vertical line ────────────────────────────────────────────────
function CurrentWeekLine({ week, totalRows }: { week: number; totalRows: number }) {
  const height = HDR_H + BAND_H + SHOW_H * totalRows + 4;
  const x = cellX(week) + CELL_W / 2 - 1;
  return (
    <View
      pointerEvents="none"
      style={[sb.nowLine, { left: x, height }]}
    />
  );
}

// ── Legend entry ──────────────────────────────────────────────────────────────
function LegendItem({ emoji, label, type, weeks }: {
  emoji: string; label: string; type: 'cultural' | 'seasonal'; weeks: string;
}) {
  const bg    = type === 'cultural' ? C.cultural + '22' : C.seasonal + '22';
  const color = type === 'cultural' ? C.cultural : C.seasonal;
  return (
    <View style={[lg.item, { backgroundColor: bg, borderColor: color + '55' }]}>
      <Text style={lg.emoji}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[lg.label, { color }]}>{label}</Text>
        <Text style={lg.weeks}>{weeks}</Text>
      </View>
      <View style={[lg.typePill, { backgroundColor: color + '22', borderColor: color + '66' }]}>
        <Text style={[lg.typeText, { color }]}>
          {type === 'cultural' ? '+25%' : '+15%'}
        </Text>
      </View>
    </View>
  );
}

// ── Schedule Screen ───────────────────────────────────────────────────────────
export default function ScheduleScreen() {
  const router = useRouter();
  const { network, shows } = useGameStore();
  const { currentWeek, currentYear } = network;

  const scheduledShows = getScheduledShows(shows, currentYear);

  // Scroll to current week on mount
  const initX = Math.max(0, cellX(currentWeek) - 80);

  return (
    <SafeAreaView style={s.container}>
      <LinearGradient colors={['#131829', '#0f1220', '#0a0d18']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>SCHEDULE</Text>
        <View style={s.yearBadge}>
          <Text style={s.yearBadgeSub}>YEAR</Text>
          <Text style={s.yearBadgeNum}>{currentYear}</Text>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Grid ── */}
        <View style={s.gridWrap}>
          <Text style={s.gridLabel}>AIRING CALENDAR</Text>

          {/* Horizontal scroll for the grid */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: initX, y: 0 }}
            style={s.hScroll}
            contentContainerStyle={{ width: CELL_W * WEEKS_PER_YEAR, position: 'relative' }}
          >
            {/* Current week vertical indicator */}
            <CurrentWeekLine week={currentWeek} totalRows={scheduledShows.length} />

            {/* Week number header */}
            <View style={sb.headerRow}>
              {Array.from({ length: WEEKS_PER_YEAR }, (_, i) => {
                const w = i + 1;
                const isCurrent = w === currentWeek;
                return (
                  <View key={w} style={[sb.headerCell, isCurrent && sb.headerCellCurrent]}>
                    {(w % 4 === 1 || isCurrent) && (
                      <Text style={[sb.headerText, isCurrent && sb.headerTextCurrent]}>
                        {isCurrent ? '▼' : w}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Theme band */}
            <ThemeBandRow />

            {/* Show bars */}
            {scheduledShows.length === 0 ? (
              <View style={sb.emptyRow}>
                <Text style={sb.emptyText}>No shows scheduled this year</Text>
              </View>
            ) : (
              scheduledShows.map(item => (
                <ShowBarRow key={item.show.id} item={item} currentWeek={currentWeek} />
              ))
            )}
          </ScrollView>

          {/* Show name sidebar */}
          <View style={s.showNames}>
            <View style={s.showNameHeader} />
            <View style={s.showNameBand} />
            {scheduledShows.length === 0 ? (
              <View style={s.showNameEmpty} />
            ) : (
              scheduledShows.map(item => {
                const color = SHOW_COLORS[item.colorIdx];
                return (
                  <View key={item.show.id} style={s.showNameRow}>
                    <View style={[s.showNameDot, { backgroundColor: color }]} />
                    <Text style={s.showNameText} numberOfLines={1}>{item.show.title}</Text>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* ── Theme Windows reference ── */}
        <Text style={s.sectionLabel}>THEME WINDOWS</Text>
        <Text style={s.sectionDesc}>
          Episodes airing during these windows receive a viewership boost — ratings are unaffected.
        </Text>

        {/* Cultural windows */}
        <Text style={s.winGroupLabel}>CULTURAL  ·  +25% VIEWERS</Text>
        {THEME_WINDOWS.filter(w => w.type === 'cultural').map(win => (
          <LegendItem
            key={win.theme}
            emoji={win.emoji}
            label={win.label}
            type={win.type}
            weeks={`Weeks ${win.startWeek}–${win.endWeek}`}
          />
        ))}

        {/* Seasonal windows */}
        <Text style={[s.winGroupLabel, { marginTop: 16 }]}>SEASONAL  ·  +15% VIEWERS</Text>
        {THEME_WINDOWS.filter(w => w.type === 'seasonal').map(win => (
          <LegendItem
            key={win.theme}
            emoji={win.emoji}
            label={win.label}
            type={win.type}
            weeks={`Weeks ${win.startWeek}–${win.endWeek}`}
          />
        ))}

        {/* ── Active show theme status ── */}
        {scheduledShows.length > 0 && (
          <>
            <Text style={[s.sectionLabel, { marginTop: 24 }]}>YOUR SHOWS</Text>
            {scheduledShows.map((item, idx) => {
              const color   = SHOW_COLORS[item.colorIdx];
              const win     = getThemeWindow(item.show.theme);
              const overlap = win && win.startWeek <= item.endWeek && win.endWeek >= item.airWeek;
              const overlapStart = win && overlap ? Math.max(win.startWeek, item.airWeek) : null;
              const overlapEnd   = win && overlap ? Math.min(win.endWeek, item.endWeek) : null;

              return (
                <View key={item.show.id} style={[ss.showCard, { borderLeftColor: color }]}>
                  <View style={ss.showCardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={ss.showCardTitle} numberOfLines={1}>{item.show.title}</Text>
                      <Text style={ss.showCardMeta}>
                        {item.show.theme.toUpperCase()} · {item.show.genre} · S{item.season.seasonNumber}
                      </Text>
                    </View>
                    <Text style={[ss.showWeeks, { color }]}>
                      W{item.airWeek}–{item.endWeek}
                    </Text>
                  </View>

                  {overlap && win && overlapStart && overlapEnd ? (
                    <View style={[ss.winBadge, { backgroundColor: (win.type === 'cultural' ? C.cultural : C.seasonal) + '15', borderColor: (win.type === 'cultural' ? C.cultural : C.seasonal) + '55' }]}>
                      <Text style={ss.winBadgeEmoji}>{win.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[ss.winBadgeLabel, { color: win.type === 'cultural' ? C.cultural : C.seasonal }]}>
                          {win.label}
                        </Text>
                        <Text style={ss.winBadgeSub}>
                          Wks {overlapStart}–{overlapEnd} · {win.viewershipMultiplier === 1.25 ? '+25%' : '+15%'} viewers
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <Text style={ss.noWinText}>No theme window overlap this season</Text>
                  )}
                </View>
              );
            })}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Schedule bar styles ───────────────────────────────────────────────────────
const sb = StyleSheet.create({
  headerRow: { flexDirection: 'row', height: HDR_H },
  headerCell: { width: CELL_W, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 2 },
  headerCellCurrent: {},
  headerText: { fontFamily: 'Manrope_700Bold', fontSize: 7, color: '#4a4760', letterSpacing: 0 },
  headerTextCurrent: { color: '#e6b254', fontSize: 8 },

  bandRow: { flexDirection: 'row', height: BAND_H, marginBottom: 2 },
  bandCell: { width: CELL_W, height: BAND_H, borderBottomWidth: 1.5 },
  bandEmoji: { fontSize: 8, textAlign: 'center', lineHeight: BAND_H },

  showRow: { flexDirection: 'row', height: SHOW_H, marginBottom: 2, alignItems: 'center' },
  showBar: { height: SHOW_H - 4, borderWidth: 1, borderRadius: 5, paddingHorizontal: 5, justifyContent: 'center', overflow: 'hidden' },
  showBarTitle: { fontFamily: 'Manrope_700Bold', fontSize: 9, letterSpacing: 0.2 },
  showBarMeta: { fontFamily: 'Manrope_400Regular', fontSize: 7.5, color: '#9a958e', marginTop: 1 },

  emptyRow: { height: SHOW_H, justifyContent: 'center', paddingLeft: 8 },
  emptyText: { fontFamily: 'Manrope_400Regular', color: '#4a4760', fontSize: 11 },

  nowLine: { position: 'absolute', top: 0, width: 2, backgroundColor: '#e6b25488', zIndex: 10 },
});

// ── Legend styles ─────────────────────────────────────────────────────────────
const lg = StyleSheet.create({
  item:     { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 6 },
  emoji:    { fontSize: 18, width: 26, textAlign: 'center' },
  label:    { fontFamily: 'Manrope_700Bold', fontSize: 13 },
  weeks:    { fontFamily: 'Manrope_400Regular', color: '#6b6880', fontSize: 11, marginTop: 1 },
  typePill: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  typeText: { fontFamily: 'Manrope_800ExtraBold', fontSize: 11 },
});

// ── Show card styles (bottom section) ────────────────────────────────────────
const ss = StyleSheet.create({
  showCard:     { backgroundColor: '#191c2a', borderRadius: 12, borderWidth: 1, borderColor: '#252840', borderLeftWidth: 3, padding: 12, marginBottom: 8 },
  showCardTop:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  showCardTitle:{ fontFamily: 'Manrope_700Bold', color: '#f0ede8', fontSize: 14 },
  showCardMeta: { fontFamily: 'Manrope_700Bold', color: '#6b6880', fontSize: 9, letterSpacing: 1.5, marginTop: 3 },
  showWeeks:    { fontFamily: 'BebasNeue_400Regular', fontSize: 18, letterSpacing: 0.5 },
  winBadge:     { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, padding: 8 },
  winBadgeEmoji:{ fontSize: 16 },
  winBadgeLabel:{ fontFamily: 'Manrope_700Bold', fontSize: 12 },
  winBadgeSub:  { fontFamily: 'Manrope_400Regular', color: '#9a958e', fontSize: 11, marginTop: 1 },
  noWinText:    { fontFamily: 'Manrope_400Regular', color: '#4a4760', fontSize: 12 },
});

// ── Main styles ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0f1220' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#252840' },
  backBtn:      { width: 60 },
  backText:     { color: '#e6b254', fontFamily: 'Manrope_600SemiBold', fontSize: 15 },
  headerTitle:  { color: '#f0ede8', fontFamily: 'BebasNeue_400Regular', fontSize: 22, letterSpacing: 0.5, flex: 1, textAlign: 'center' },
  yearBadge:    { alignItems: 'center', width: 60 },
  yearBadgeSub: { fontFamily: 'Manrope_700Bold', color: '#6b6880', fontSize: 8, letterSpacing: 1.5 },
  yearBadgeNum: { fontFamily: 'BebasNeue_400Regular', color: '#f0ede8', fontSize: 20 },

  scroll:       { flex: 1 },
  scrollContent:{ padding: 16 },

  gridWrap:  { marginBottom: 24, position: 'relative' },
  gridLabel: { fontFamily: 'Manrope_700Bold', color: '#6b6880', fontSize: 10, letterSpacing: 2, marginBottom: 8 },

  hScroll:   { marginLeft: 84, borderRadius: 8, backgroundColor: '#131625', borderWidth: 1, borderColor: '#252840' },

  showNames: { position: 'absolute', left: 0, top: 26, width: 82 },   // vertically aligned with grid rows
  showNameHeader: { height: HDR_H },
  showNameBand:   { height: BAND_H + 2 },
  showNameEmpty:  { height: SHOW_H },
  showNameRow:    { height: SHOW_H + 2, flexDirection: 'row', alignItems: 'center', gap: 5 },
  showNameDot:    { width: 7, height: 7, borderRadius: 3.5, flexShrink: 0 },
  showNameText:   { fontFamily: 'Manrope_600SemiBold', color: '#9a958e', fontSize: 9.5, flex: 1 },

  sectionLabel: { fontFamily: 'Manrope_700Bold', color: '#9a958e', fontSize: 10, letterSpacing: 2, marginBottom: 6 },
  sectionDesc:  { fontFamily: 'Manrope_400Regular', color: '#6b6880', fontSize: 12, lineHeight: 18, marginBottom: 12, marginTop: -2 },
  winGroupLabel:{ fontFamily: 'Manrope_800ExtraBold', color: '#9a958e', fontSize: 9, letterSpacing: 2, marginBottom: 8 },
});
