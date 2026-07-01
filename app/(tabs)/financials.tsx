import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Alert,
} from 'react-native';
import { useGameStore } from '../../src/store/gameStore';

const C = {
  bg: '#0f0f17', card: '#16161f', border: '#1e1e2e',
  text: '#e8e8f0', muted: '#6b6b82', accent: '#7c6af7',
  green: '#4caf82', red: '#e85d5d', amber: '#f5a623',
};

function fmt(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs}`;
}

function PrestigeBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct >= 70 ? C.accent : pct >= 40 ? C.amber : C.muted;
  const label =
    pct >= 85 ? 'Elite' :
    pct >= 70 ? 'Established' :
    pct >= 50 ? 'Rising' :
    pct >= 30 ? 'Developing' : 'Unknown';
  return (
    <View>
      <View style={s.prestigeHeader}>
        <Text style={s.prestigeValue}>{value}</Text>
        <Text style={[s.prestigeLabel, { color }]}>{label}</Text>
      </View>
      <View style={s.prestigeTrack}>
        <View style={[s.prestigeFill, { width: `${pct}%`, backgroundColor: color }]} />
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
  const { network, shows, saveGame, initializeGame } = useGameStore();

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
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Studio</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>

        {/* Network identity */}
        <View style={s.identityCard}>
          <View style={s.networkBadge}>
            <Text style={s.networkInitials}>{network.initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.networkName}>{network.name}</Text>
            <Text style={s.networkSub}>Independent · Founded Year {network.foundedYear}</Text>
          </View>
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
          <StatRow label="Cash on hand"      value={fmt(network.cashOnHand)}      color={C.green} />
          <View style={s.divider} />
          <StatRow label="Career earnings"   value={fmt(network.careerEarnings)} />
          <View style={s.divider} />
          <StatRow label="Active shows"      value={String(activeShows)}          color={C.accent} />
          <View style={s.divider} />
          <StatRow label="Total shows"       value={String(shows.length)} />
          <View style={s.divider} />
          <StatRow label="Total seasons"     value={String(totalSeasons)} />
          <View style={s.divider} />
          <StatRow label="Emmy nominations"  value={String(network.emmyNominations)} />
          <View style={s.divider} />
          <StatRow label="Emmys won"         value={String(network.emmysWon)}     color={network.emmysWon > 0 ? C.amber : undefined} />
          <View style={s.divider} />
          <StatRow label="Current week"      value={`Week ${network.currentWeek}, Year ${network.currentYear}`} />
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
            <Text style={[s.actionChevron, { color: C.accent }]}>Save →</Text>
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
  container:       { flex: 1, backgroundColor: C.bg },
  header:          { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle:     { color: C.text, fontSize: 20, fontWeight: '700' },
  scroll:          { flex: 1 },
  scrollContent:   { padding: 16 },

  sectionLabel:    { color: C.muted, fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 10, marginTop: 20 },

  identityCard:    { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 4 },
  networkBadge:    { width: 52, height: 52, borderRadius: 12, backgroundColor: C.accent, justifyContent: 'center', alignItems: 'center' },
  networkInitials: { color: '#fff', fontSize: 20, fontWeight: '700' },
  networkName:     { color: C.text, fontSize: 18, fontWeight: '700', marginBottom: 3 },
  networkSub:      { color: C.muted, fontSize: 13 },

  card:            { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 16 },

  prestigeHeader:  { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 },
  prestigeValue:   { color: C.text, fontSize: 36, fontWeight: '700' },
  prestigeLabel:   { fontSize: 14, fontWeight: '600' },
  prestigeTrack:   { height: 8, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden', marginBottom: 10 },
  prestigeFill:    { height: '100%', borderRadius: 4 },
  prestigeHint:    { color: C.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },

  statRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11 },
  statLabel:       { color: C.muted, fontSize: 14 },
  statValue:       { color: C.text, fontSize: 14, fontWeight: '600' },
  divider:         { height: 1, backgroundColor: C.border },

  actionsCard:     { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  actionRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  actionLabel:     { color: C.text, fontSize: 15, fontWeight: '500', marginBottom: 2 },
  actionSub:       { color: C.muted, fontSize: 12 },
  actionChevron:   { fontSize: 14, fontWeight: '600' },
});