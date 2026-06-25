import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, SafeAreaView, Modal, ScrollView,
} from 'react-native';
import { useState, useMemo } from 'react';
import { useGameStore } from '../../src/store/gameStore';
import { Talent, TalentRole } from '../../src/types';
import { EMMY_CATEGORY_LABELS } from '../../src/constants/game';

const C = {
  bg: '#0f0f17', card: '#16161f', border: '#1e1e2e',
  text: '#e8e8f0', muted: '#6b6b82', accent: '#7c6af7',
  green: '#4caf82', red: '#e85d5d', amber: '#f5a623', blue: '#5b8dee',
};

const CHEM_COLORS = { green: '#4caf82', blue: '#5b8dee', red: '#e85d5d' };

type RoleFilter = 'all' | TalentRole;
type AvailFilter = 'all' | 'available' | 'booked';

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

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <View style={m.statRow}>
      <Text style={m.statLabel}>{label}</Text>
      <View style={m.statTrack}>
        <View style={[m.statFill, { width: `${value}%` }]} />
      </View>
      <Text style={m.statValue}>{value}</Text>
    </View>
  );
}

function TalentModal({ talent, onClose }: { talent: Talent; onClose: () => void }) {
  const { shows, talentDeals, awards } = useGameStore();
  const chemColor = CHEM_COLORS[talent.chemistryColor];

  // Find current show assignment
  const currentDeal = talentDeals.find(
    d => d.talentID === talent.id && !talent.available
  );
  const currentShow = currentDeal ? shows.find(s => s.id === currentDeal.showID) : null;

  // Career shows
  const careerShows = shows.filter(s => talent.careerShowIDs.includes(s.id));

  // Awards
  const talentAwards = awards.filter(a => a.talentID === talent.id && a.won);

  const stats = getPrimaryStats(talent);

  return (
    <View style={m.overlay}>
      <View style={m.card}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={m.header}>
            <View style={[m.chemBadge, { backgroundColor: chemColor + '22', borderColor: chemColor }]}>
              <View style={[m.chemDot, { backgroundColor: chemColor }]} />
              <Text style={[m.chemText, { color: chemColor }]}>
                {talent.chemistryColor.charAt(0).toUpperCase() + talent.chemistryColor.slice(1)}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={m.closeBtn}>
              <Text style={m.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={m.name}>{talent.name}</Text>
          <Text style={m.roleMeta}>
            {talent.role.charAt(0).toUpperCase() + talent.role.slice(1)}
            {' · '}{popularityLabel(talent.popularity)}
            {' · Age '}{talent.age}
          </Text>

          {/* Availability */}
          <View style={[m.availRow, { borderColor: talent.available ? C.green + '55' : C.amber + '55' }]}>
            <View style={[m.availDot, { backgroundColor: talent.available ? C.green : C.amber }]} />
            <Text style={[m.availText, { color: talent.available ? C.green : C.amber }]}>
              {talent.available
                ? 'Available for hire'
                : currentShow
                  ? `On: ${currentShow.title}`
                  : 'Currently booked'}
            </Text>
          </View>

          {/* Stats */}
          <Text style={m.sectionLabel}>STATS</Text>
          <View style={m.statsBlock}>
            {stats.map(st => <StatBar key={st.label} label={st.label} value={st.value} />)}
            <View style={[m.statRow, { marginTop: 4 }]}>
              <Text style={m.statLabel}>Popularity</Text>
              <View style={m.statTrack}>
                <View style={[m.statFill, { width: `${talent.popularity}%`, backgroundColor: C.accent }]} />
              </View>
              <Text style={m.statValue}>{talent.popularity}</Text>
            </View>
          </View>

          {/* Emmy wins */}
          {talentAwards.length > 0 && (
            <>
              <Text style={m.sectionLabel}>EMMY WINS</Text>
              {talentAwards.map(a => (
                <View key={a.id} style={m.awardRow}>
                  <Text style={m.awardStar}>★</Text>
                  <View>
                    <Text style={m.awardCategory}>{EMMY_CATEGORY_LABELS[a.category] ?? a.category}</Text>
                    <Text style={m.awardYear}>Year {a.year}</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Career shows */}
          {careerShows.length > 0 && (
            <>
              <Text style={m.sectionLabel}>CAREER SHOWS</Text>
              {careerShows.map(show => (
                <View key={show.id} style={m.showRow}>
                  <Text style={m.showTitle}>{show.title}</Text>
                  <Text style={m.showMeta}>
                    {show.genre} · {show.seasons.length} season{show.seasons.length > 1 ? 's' : ''}
                  </Text>
                </View>
              ))}
            </>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      </View>
    </View>
  );
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
  const { talent, network } = useGameStore();
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [availFilter, setAvailFilter] = useState<AvailFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedTalent, setSelectedTalent] = useState<Talent | null>(null);

  const visible = useMemo(() => {
    return talent.filter(t => {
      if (t.prestigeRequired > network.prestige) return false;
      if (roleFilter !== 'all' && t.role !== roleFilter) return false;
      if (availFilter === 'available' && !t.available) return false;
      if (availFilter === 'booked' && t.available) return false;
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }).sort((a, b) => b.popularity - a.popularity);
  }, [talent, network.prestige, roleFilter, availFilter, search]);

  const counts = useMemo(() => {
    const byRole = talent.filter(t =>
      t.prestigeRequired <= network.prestige &&
      (roleFilter === 'all' || t.role === roleFilter)
    );
    return {
      all:       byRole.length,
      available: byRole.filter(t => t.available).length,
      booked:    byRole.filter(t => !t.available).length,
    };
  }, [talent, network.prestige, roleFilter]);

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

      {visible.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>No talent match your filters.</Text>
          {network.prestige < 21 && (
            <Text style={s.emptyHint}>
              Reach prestige 21 to unlock mid-tier talent.
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={t => t.id}
          contentContainerStyle={s.list}
          renderItem={({ item }) => (
            <TalentCard talent={item} onPress={() => setSelectedTalent(item)} />
          )}
        />
      )}

      {selectedTalent && (
        <Modal transparent animationType="slide">
          <TalentModal talent={selectedTalent} onClose={() => setSelectedTalent(null)} />
        </Modal>
      )}
    </SafeAreaView>
  );
}

// ─── Modal styles ──────────────────────────────────────────────────────────────

const m = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: '#000000bb', justifyContent: 'flex-end' },
  card:          { backgroundColor: '#1a1a26', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderTopColor: C.border, padding: 24, maxHeight: '85%' },

  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  chemBadge:     { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  chemDot:       { width: 8, height: 8, borderRadius: 4 },
  chemText:      { fontSize: 12, fontWeight: '600' },
  closeBtn:      { padding: 4 },
  closeText:     { color: C.muted, fontSize: 18 },

  name:          { color: C.text, fontSize: 24, fontWeight: '700', marginBottom: 4 },
  roleMeta:      { color: C.muted, fontSize: 14, marginBottom: 14 },

  availRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 20 },
  availDot:      { width: 8, height: 8, borderRadius: 4 },
  availText:     { fontSize: 13, fontWeight: '500' },

  sectionLabel:  { color: C.muted, fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 10 },
  statsBlock:    { gap: 8, marginBottom: 20 },
  statRow:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statLabel:     { color: C.muted, fontSize: 13, width: 80 },
  statTrack:     { flex: 1, height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
  statFill:      { height: '100%', backgroundColor: C.accent, borderRadius: 3 },
  statValue:     { color: C.text, fontSize: 13, width: 28, textAlign: 'right' },

  awardRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  awardStar:     { color: C.amber, fontSize: 18 },
  awardCategory: { color: C.text, fontSize: 13, fontWeight: '500' },
  awardYear:     { color: C.muted, fontSize: 12, marginTop: 2 },

  showRow:       { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  showTitle:     { color: C.text, fontSize: 13, fontWeight: '500' },
  showMeta:      { color: C.muted, fontSize: 12, marginTop: 2 },
});

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
