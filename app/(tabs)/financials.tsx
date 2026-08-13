import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Alert, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useGameStore } from '../../src/store/gameStore';

const C = {
  pageBg: '#0f1220', cardBg: '#191c2a',
  border: '#252840',
  text: '#f0ede8', muted: '#9a958e',
  gold: '#e6b254', goldBtnText: '#161008',
  green: '#4ec46e', amber: '#d4753a', red: '#c43820',
};

function FilmRibbonAmbient() {
  return (
    <Image
      source={require('../../assets/tvbg.png')}
      style={[StyleSheet.absoluteFill, { tintColor: C.gold, opacity: 0.06 }]}
      resizeMode="repeat"
      pointerEvents="none"
    />
  );
}

function fmt(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs}`;
}

function PrestigeBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const label =
    pct >= 85 ? 'Elite' :
    pct >= 70 ? 'Established' :
    pct >= 50 ? 'Rising' :
    pct >= 30 ? 'Developing' : 'Unknown';
  const barColor = pct >= 70 ? C.gold : pct >= 40 ? C.amber : C.muted;
  return (
    <View>
      <View style={s.prestigeHeader}>
        <Text style={s.prestigeValue}>{value}</Text>
        <Text style={[s.prestigeLabel, { color: barColor }]}>{label}</Text>
      </View>
      <View style={s.prestigeTrack}>
        <View style={[s.prestigeFill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={s.statRow}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

export default function StudioScreen() {
  const router = useRouter();
  const { network, shows, saveGame, initializeGame, unlockedAchievementIDs } = useGameStore();

  const totalSeasons = shows.reduce((sum, sh) => sum + sh.seasons.length, 0);
  const activeShows = shows.filter(s =>
    ['writing', 'filming', 'marketing', 'airing', 'renewal-pending'].includes(s.status)
  ).length;

  function handleSave() {
    saveGame().then(() => Alert.alert('Saved', 'Your game has been saved.'));
  }

  function handleReset() {
    Alert.alert(
      'Reset Game',
      'This will permanently delete all progress. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => initializeGame(network.name, network.initials),
        },
      ],
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <LinearGradient
        colors={['#131829', '#0f1220', '#0a0d18']}
        style={StyleSheet.absoluteFill}
      />
      <FilmRibbonAmbient />

      <View style={s.header}>
        <Text style={s.headerTitle}>Studio</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Network identity */}
        <View style={s.identityCard}>
          <View style={s.networkBadge}>
            <Text style={s.networkInitials}>{network.initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.networkName}>{network.name}</Text>
            <Text style={s.networkSub}>Independent · Founded Year {network.foundedYear}</Text>
          </View>
          <TouchableOpacity style={s.allStudiosBtn} onPress={() => router.push('/all-studios')}>
            <Text style={s.allStudiosBtnText}>ALL STUDIOS</Text>
          </TouchableOpacity>
        </View>

        {/* Prestige */}
        <Text style={s.sectionLabel}>PRESTIGE</Text>
        <View style={s.card}>
          <PrestigeBar value={network.prestige} />
          <Text style={s.prestigeHint}>
            Higher prestige unlocks top talent and better streaming deals.
          </Text>
        </View>

        {/* Network stats */}
        <Text style={s.sectionLabel}>NETWORK STATS</Text>
        <View style={s.card}>
          <StatRow label="Cash on hand"     value={fmt(network.cashOnHand)}     color={C.green} />
          <View style={s.divider} />
          <StatRow label="Career earnings"  value={fmt(network.careerEarnings)} />
          <View style={s.divider} />
          <StatRow label="Active shows"     value={String(activeShows)}         color={C.gold} />
          <View style={s.divider} />
          <StatRow label="Total shows"      value={String(shows.length)} />
          <View style={s.divider} />
          <StatRow label="Total seasons"    value={String(totalSeasons)} />
          <View style={s.divider} />
          <StatRow label="Emmy nominations" value={String(network.emmyNominations)} />
          <View style={s.divider} />
          <StatRow label="Emmys won"        value={String(network.emmysWon)} color={network.emmysWon > 0 ? C.amber : undefined} />
          <View style={s.divider} />
          <StatRow label="Current week"     value={`Week ${network.currentWeek}, Year ${network.currentYear}`} />
        </View>

        {/* Achievements */}
        <Text style={s.sectionLabel}>ACHIEVEMENTS</Text>
        <View style={s.actionsCard}>
          <TouchableOpacity style={s.actionRow} onPress={() => router.push('/achievements')} activeOpacity={0.8}>
            <View>
              <Text style={s.actionLabel}>🏆  Achievements</Text>
              <Text style={s.actionSub}>{(unlockedAchievementIDs ?? []).length} / 23 unlocked</Text>
            </View>
            <Text style={[s.actionChevron, { color: C.gold }]}>View →</Text>
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <Text style={s.sectionLabel}>SAVE & SETTINGS</Text>
        <View style={s.actionsCard}>
          <TouchableOpacity style={s.actionRow} onPress={handleSave}>
            <View>
              <Text style={s.actionLabel}>Save Game</Text>
              {network.currentWeek > 0 && (
                <Text style={s.actionSub}>
                  {`Last save: Week ${network.currentWeek}, Year ${network.currentYear}`}
                </Text>
              )}
            </View>
            <Text style={[s.actionChevron, { color: C.gold }]}>Save →</Text>
          </TouchableOpacity>
          <View style={s.divider} />
          <TouchableOpacity style={s.actionRow} onPress={handleReset}>
            <View>
              <Text style={[s.actionLabel, { color: C.red }]}>Reset Game</Text>
              <Text style={s.actionSub}>Permanently deletes all progress</Text>
            </View>
            <Text style={[s.actionChevron, { color: C.red }]}>⚠</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: C.pageBg },
  header:          { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle:     { color: C.gold, fontFamily: 'BebasNeue_400Regular', fontSize: 28, letterSpacing: 1 },
  scroll:          { flex: 1 },
  scrollContent:   { padding: 16 },

  sectionLabel:    { color: C.muted, fontFamily: 'Manrope_700Bold', fontSize: 11, letterSpacing: 1.5, marginBottom: 10, marginTop: 20 },

  identityCard:    { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.cardBg, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 4 },
  networkBadge:        { width: 52, height: 52, borderRadius: 12, backgroundColor: C.gold, justifyContent: 'center', alignItems: 'center' },
  allStudiosBtn:       { backgroundColor: '#e6b25418', borderWidth: 1, borderColor: '#e6b25440', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  allStudiosBtnText:   { color: C.gold, fontFamily: 'Manrope_700Bold', fontSize: 10, letterSpacing: 1.2 },
  networkInitials: { color: C.goldBtnText, fontFamily: 'BebasNeue_400Regular', fontSize: 24, letterSpacing: 1 },
  networkName:     { color: C.text, fontFamily: 'Manrope_700Bold', fontSize: 18, marginBottom: 3 },
  networkSub:      { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 13 },

  card:            { backgroundColor: C.cardBg, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16 },

  prestigeHeader:  { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 },
  prestigeValue:   { color: C.text, fontFamily: 'BebasNeue_400Regular', fontSize: 44, letterSpacing: 1 },
  prestigeLabel:   { fontFamily: 'Manrope_700Bold', fontSize: 14 },
  prestigeTrack:   { height: 8, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden', marginBottom: 10 },
  prestigeFill:    { height: '100%', borderRadius: 4 },
  prestigeHint:    { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 12, lineHeight: 18, marginTop: 4 },

  statRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11 },
  statLabel:       { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 14 },
  statValue:       { color: C.text, fontFamily: 'Manrope_600SemiBold', fontSize: 14 },
  divider:         { height: 1, backgroundColor: C.border },

  actionsCard:     { backgroundColor: C.cardBg, borderRadius: 14, borderWidth: 1, borderColor: C.border },
  actionRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  actionLabel:     { color: C.text, fontFamily: 'Manrope_600SemiBold', fontSize: 15, marginBottom: 2 },
  actionSub:       { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 12 },
  actionChevron:   { fontFamily: 'Manrope_700Bold', fontSize: 14 },
});