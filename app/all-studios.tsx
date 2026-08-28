import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useGameStore } from '../src/store/gameStore';
import { LogoBadge } from './components/LogoBadge';
import { LogoConfig } from '../src/types';

const C = {
  pageBg:      '#0f1220',
  cardBg:      '#191c2a',
  border:      '#252840',
  text:        '#f0ede8',
  muted:       '#9a958e',
  mutedMid:    '#6b6880',
  gold:        '#e6b254',
  goldDim:     '#e6b25418',
  goldBorder:  '#e6b25440',
  goldBtnText: '#161008',
};

const F = {
  display: 'BebasNeue_400Regular',
  body:    'Manrope_400Regular',
  bodyMd:  'Manrope_600SemiBold',
  bodyBd:  'Manrope_700Bold',
};

export default function AllStudiosScreen() {
  const router = useRouter();
  const { network, shows, competitors } = useGameStore();

  const playerActiveCount = shows.filter(s =>
    ['writing', 'filming', 'marketing', 'airing', 'renewal-pending'].includes(s.status),
  ).length;

  // Build one sorted list: player + all competitors
  type StudioRow = {
    id: string;
    isPlayer: boolean;
    prestige: number;
    name: string;
    activeCount: number;
    logoConfig: LogoConfig;
  };

  const allRows: StudioRow[] = [
    {
      id: 'player',
      isPlayer: true,
      prestige: network.prestige,
      name: network.name,
      activeCount: playerActiveCount,
      logoConfig: network.logoConfig,
    },
    ...competitors.map(c => ({
      id: c.id,
      isPlayer: false,
      prestige: c.prestige,
      name: c.name,
      activeCount: c.activeShows.filter(s =>
        ['pre-production', 'filming', 'marketing', 'airing'].includes(s.status),
      ).length,
      logoConfig: c.logoConfig,
    })),
  ].sort((a, b) => b.prestige - a.prestige);

  return (
    <SafeAreaView edges={['top']} style={s.container}>
      <LinearGradient
        colors={['#131829', '#0f1220', '#0a0d18']}
        style={StyleSheet.absoluteFill}
      />

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>STUDIOS</Text>
          <View style={s.yearBadge}>
            <Text style={s.yearText}>YEAR {network.currentYear}</Text>
          </View>
        </View>
        <View style={s.backBtn} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={s.subtitle}>Every network competing for the same audience</Text>
        <Text style={s.dots}>· · · · · · · · · · · · · · · · · · · · · · · ·</Text>

        <View style={s.colHeaders}>
          <Text style={[s.colLabel, { width: 30 }]}>RK</Text>
          <Text style={[s.colLabel, { flex: 1, marginLeft: 56 }]}>NETWORK</Text>
          <Text style={[s.colLabel, { width: 64, textAlign: 'right' }]}>PRESTIGE</Text>
        </View>

        {allRows.map((row, rank) => {
          if (row.isPlayer) {
            return (
              <TouchableOpacity
                key="player"
                activeOpacity={0.8}
                style={s.playerRowWrap}
                onPress={() => router.push({ pathname: '/studio-profile', params: { id: 'player' } })}
              >
                <LinearGradient
                  colors={[C.goldDim, '#e6b25408', C.goldDim]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[StyleSheet.absoluteFill, { borderRadius: 12 }]}
                />
                <View style={[StyleSheet.absoluteFill, s.playerBorder]} />
                <Text style={[s.rankNum, { color: C.gold }]}>{rank + 1}</Text>
                <LogoBadge size={40} initials={network.initials} config={row.logoConfig} />
                <View style={s.rowInfo}>
                  <Text style={[s.rowName, { color: C.gold }]}>{row.name}</Text>
                  <Text style={s.rowSub}>You · {row.activeCount} show{row.activeCount !== 1 ? 's' : ''} on air</Text>
                </View>
                <Text style={[s.prestigeNum, { color: C.gold }]}>{row.prestige}</Text>
              </TouchableOpacity>
            );
          }

          // Derive competitor initials for the badge
          const words = row.name.trim().split(/\s+/);
          const inits = words.length === 1
            ? words[0].slice(0, 2).toUpperCase()
            : words.slice(0, 2).map(w => w[0]).join('').toUpperCase();

          return (
            <TouchableOpacity
              key={row.id}
              style={s.row}
              activeOpacity={0.75}
              onPress={() => router.push({ pathname: '/studio-profile', params: { id: row.id } })}
            >
              <Text style={s.rankNum}>{rank + 1}</Text>
              <LogoBadge size={40} initials={inits} config={row.logoConfig} />
              <View style={s.rowInfo}>
                <Text style={s.rowName}>{row.name}</Text>
                <Text style={s.rowSub}>{row.activeCount} show{row.activeCount !== 1 ? 's' : ''} on air</Text>
              </View>
              <Text style={s.prestigeNum}>{row.prestige}</Text>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.pageBg },
  scroll:       { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 16 },

  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:      { width: 40, alignItems: 'flex-start', justifyContent: 'center' },
  backText:     { color: C.gold, fontSize: 22, fontFamily: F.body },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  headerTitle:  { color: C.gold, fontFamily: F.display, fontSize: 26, letterSpacing: 1 },
  yearBadge:    { backgroundColor: C.goldDim, borderWidth: 1, borderColor: C.goldBorder, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  yearText:     { color: C.gold, fontFamily: F.bodyBd, fontSize: 10, letterSpacing: 1 },

  subtitle:     { color: C.muted, fontFamily: F.body, fontSize: 13, marginTop: 16, marginBottom: 10, textAlign: 'center' },
  dots:         { color: C.mutedMid, fontSize: 12, textAlign: 'center', letterSpacing: 2, marginBottom: 16 },

  colHeaders:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, marginBottom: 8 },
  colLabel:     { color: C.muted, fontFamily: F.bodyBd, fontSize: 10, letterSpacing: 1.5 },

  // Player row
  playerRowWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1, borderColor: C.goldBorder, paddingVertical: 12, paddingHorizontal: 10, marginBottom: 6, overflow: 'hidden' },
  playerBorder:  { borderRadius: 12, borderWidth: 1, borderColor: C.goldBorder },

  // Competitor row
  row:          { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.cardBg, paddingVertical: 12, paddingHorizontal: 10, marginBottom: 6 },

  rankNum:      { color: C.muted, fontFamily: F.bodyBd, fontSize: 13, width: 26, textAlign: 'center' },

  rowInfo:      { flex: 1 },
  rowName:      { color: C.text, fontFamily: F.bodyBd, fontSize: 14, marginBottom: 2 },
  rowSub:       { color: C.muted, fontFamily: F.body, fontSize: 12 },

  prestigeNum:  { color: C.text, fontFamily: F.display, fontSize: 24, letterSpacing: 0.5, minWidth: 40, textAlign: 'right' },
});
