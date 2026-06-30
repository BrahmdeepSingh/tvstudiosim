import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, SafeAreaView,
} from 'react-native';
import { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useGameStore } from '../../src/store/gameStore';
import { Talent, TalentRole } from '../../src/types';

const C = {
  bg: '#0f0f17', card: '#16161f', border: '#1e1e2e',
  text: '#e8e8f0', muted: '#6b6b82', accent: '#7c6af7',
  green: '#4caf82', red: '#e85d5d', amber: '#f5a623', blue: '#5b8dee',
};

const CHEM_COLORS = { green: '#4caf82', blue: '#5b8dee', red: '#e85d5d' };

type RoleFilter = 'all' | TalentRole;
type AvailFilter = 'all' | 'available' | 'booked';
type ChemFilter = 'all' | 'green' | 'blue' | 'red';

function popularityLabel(p: number): string {
  if (p < 30) return 'Unknown';
  if (p < 50) return 'Emerging';
  if (p < 70) return 'Established';
  if (p < 85) return 'Well-Known';
  return 'Star';
}

function getPrimaryStats(t: Talent): { label: string; value: number }[] {
  if (t.stats.role === 'showrunner') return [
    { label: 'Writing',     value: t.stats.writing },
    { label: 'Creativity',  value: t.stats.creativity },
    { label: 'Consistency', value: t.stats.consistency },
  ];
  if (t.stats.role === 'director') return [
    { label: 'Direction',  value: t.stats.direction },
    { label: 'Vision',     value: t.stats.vision },
    { label: 'Efficiency', value: t.stats.efficiency },
  ];
  return [
    { label: 'Acting',    value: t.stats.acting },
    { label: 'Chemistry', value: t.stats.chemistry },
  ];
}

function getTopStat(t: Talent): number {
  const stats = getPrimaryStats(t);
  return stats[0].value;
}

function TalentCard({ talent, onPress }: { talent: Talent; onPress: () => void }) {
  const chemColor = CHEM_COLORS[talent.chemistryColor];
  const topStat = getTopStat(talent);
  const statLabel = talent.stats.role === 'showrunner' ? 'Writing'
    : talent.stats.role === 'director' ? 'Direction' : 'Acting';

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.8}>
      <View style={s.cardLeft}>
        <View style={[s.chemDot, { backgroundColor: chemColor }]} />
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{talent.name}</Text>
          <Text style={s.meta}>
            {popularityLabel(talent.popularity)}
            {' · '}{talent.role.charAt(0).toUpperCase() + talent.role.slice(1)}
          </Text>
        </View>
      </View>
      <View style={s.cardRight}>
        <View style={[s.availPip, { backgroundColor: talent.available ? C.green : C.amber }]} />
        <View style={s.statCol}>
          <Text style={s.statNum}>{topStat}</Text>
          <Text style={s.statLbl}>{statLabel}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function TalentScreen() {
  const { talent } = useGameStore();
  const router = useRouter();
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [availFilter, setAvailFilter] = useState<AvailFilter>('all');
  const [chemFilter, setChemFilter] = useState<ChemFilter>('all');
  const [search, setSearch] = useState('');

  const visible = useMemo(() => {
    return talent.filter(t => {
      if (roleFilter !== 'all' && t.role !== roleFilter) return false;
      if (availFilter === 'available' && !t.available) return false;
      if (availFilter === 'booked' && t.available) return false;
      if (chemFilter !== 'all' && t.chemistryColor !== chemFilter) return false;
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }).sort((a, b) => b.popularity - a.popularity);
  }, [talent, roleFilter, availFilter, chemFilter, search]);

  const counts = useMemo(() => {
    const byRole = talent.filter(t => roleFilter === 'all' || t.role === roleFilter);
    return {
      all:       byRole.length,
      available: byRole.filter(t => t.available).length,
      booked:    byRole.filter(t => !t.available).length,
    };
  }, [talent, roleFilter]);

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Talent</Text>
        <Text style={s.headerSub}>{counts.available} available</Text>
      </View>

      {/* Search */}
      <View style={s.searchRow}>
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name..."
          placeholderTextColor={C.muted}
        />
      </View>

      {/* Role filter */}
      <View style={s.filterRow}>
        {(['all', 'showrunner', 'director', 'actor'] as RoleFilter[]).map(r => (
          <TouchableOpacity
            key={r}
            style={[s.filterTab, roleFilter === r && s.filterTabActive]}
            onPress={() => setRoleFilter(r)}
          >
            <Text style={[s.filterText, roleFilter === r && s.filterTextActive]}>
              {r === 'all' ? 'All' : r.charAt(0).toUpperCase() + r.slice(1) + 's'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Availability filter */}
      <View style={s.availRow}>
        {([
          ['all',       `All (${counts.all})`],
          ['available', `Free (${counts.available})`],
          ['booked',    `Booked (${counts.booked})`],
        ] as [AvailFilter, string][]).map(([val, label]) => (
          <TouchableOpacity
            key={val}
            style={[s.availTab, availFilter === val && s.availTabActive]}
            onPress={() => setAvailFilter(val)}
          >
            <Text style={[s.availText, availFilter === val && s.availTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chemistry filter */}
      <View style={s.availRow}>
        {(['all', 'green', 'blue', 'red'] as ChemFilter[]).map(c => (
          <TouchableOpacity
            key={c}
            style={[
              s.chemTab,
              chemFilter === c && c !== 'all' && { borderColor: CHEM_COLORS[c], backgroundColor: CHEM_COLORS[c] + '18' },
              chemFilter === c && c === 'all' && s.availTabActive,
            ]}
            onPress={() => setChemFilter(c)}
          >
            {c !== 'all' && <View style={[s.chemTabDot, { backgroundColor: CHEM_COLORS[c] }]} />}
            <Text style={[
              s.availText,
              chemFilter === c && c !== 'all' && { color: CHEM_COLORS[c], fontWeight: '600' },
              chemFilter === c && c === 'all' && s.availTextActive,
            ]}>
              {c === 'all' ? 'Any Chemistry' : c.charAt(0).toUpperCase() + c.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {visible.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>No talent match your filters.</Text>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={t => t.id}
          contentContainerStyle={s.list}
          renderItem={({ item }) => (
            <TalentCard talent={item} onPress={() => router.push(`/talent/${item.id}`)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ─── List styles ──────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: C.bg },

  header:          { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle:     { color: C.text, fontSize: 20, fontWeight: '700' },
  headerSub:       { color: C.green, fontSize: 13 },

  searchRow:       { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4 },
  searchInput:     { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, color: C.text, fontSize: 15 },

  filterRow:       { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  filterTab:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  filterTabActive: { borderColor: C.accent, backgroundColor: C.accent + '22' },
  filterText:      { color: C.muted, fontSize: 13 },
  filterTextActive:{ color: C.accent, fontWeight: '600' },

  availRow:        { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 8, gap: 6 },
  availTab:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  availTabActive:  { borderColor: C.green, backgroundColor: C.green + '18' },
  availText:       { color: C.muted, fontSize: 12 },
  availTextActive: { color: C.green, fontWeight: '600' },

  chemTab:         { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  chemTabDot:      { width: 8, height: 8, borderRadius: 4 },

  list:            { padding: 12, gap: 8 },

  card:            { backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 14, flexDirection: 'row', alignItems: 'center' },
  cardLeft:        { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  chemDot:         { width: 11, height: 11, borderRadius: 6 },
  name:            { color: C.text, fontSize: 15, fontWeight: '500', marginBottom: 2 },
  meta:            { color: C.muted, fontSize: 12 },
  cardRight:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  availPip:        { width: 7, height: 7, borderRadius: 4 },
  statCol:         { alignItems: 'flex-end' },
  statNum:         { color: C.text, fontSize: 20, fontWeight: '700' },
  statLbl:         { color: C.muted, fontSize: 10 },

  empty:           { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 8 },
  emptyText:       { color: C.muted, fontSize: 15, textAlign: 'center' },
  emptyHint:       { color: C.muted, fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
