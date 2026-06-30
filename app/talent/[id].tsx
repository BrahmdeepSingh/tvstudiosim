import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';
import { useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGameStore } from '../../src/store/gameStore';
import { getYearsActive } from '../../src/engine/talent';
import { EMMY_CATEGORY_LABELS } from '../../src/constants/game';

const C = {
  bg: '#0f0f17', card: '#16161f', border: '#1e1e2e',
  text: '#e8e8f0', muted: '#6b6b82', accent: '#7c6af7',
  green: '#4caf82', red: '#e85d5d', amber: '#f5a623', blue: '#5b8dee', gold: '#e8b339',
};

const CHEM_COLORS = { green: '#4caf82', blue: '#5b8dee', red: '#e85d5d' };

function popularityLabel(p: number): string {
  if (p < 30) return 'Unknown';
  if (p < 50) return 'Emerging';
  if (p < 70) return 'Established';
  if (p < 85) return 'Well-Known';
  return 'Star';
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function tierStyle(value: number) {
  if (value >= 90) return { borderColor: C.gold, backgroundColor: C.gold + '18', color: C.gold };
  if (value >= 75) return { borderColor: C.accent, backgroundColor: C.accent + '18', color: C.accent };
  return { borderColor: C.border, backgroundColor: C.card, color: C.text };
}

function RatingTile({ label, value }: { label: string; value: number }) {
  const t = tierStyle(value);
  return (
    <View style={[rs.tile, { borderColor: t.borderColor, backgroundColor: t.backgroundColor }]}>
      <Text style={[rs.tileValue, { color: t.color }]}>{value}</Text>
      <Text style={rs.tileLabel}>{label}</Text>
    </View>
  );
}

export default function TalentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { talent, shows, talentDeals, awards, competitors, network } = useGameStore();

  const person = talent.find(t => t.id === id);

  const eligibleShows = useMemo(() => {
    if (!person || !person.available) return [];
    if (person.role === 'showrunner') {
      return shows.filter(s =>
        s.status === 'writing' &&
        (s.seasons[s.currentSeasonIndex]?.showrunnerID ?? '') === ''
      );
    }
    if (person.role === 'director') {
      return shows.filter(s =>
        s.status === 'filming' &&
        s.seasons[s.currentSeasonIndex]?.directorID === null
      );
    }
    return shows.filter(s => {
      if (s.status !== 'filming') return false;
      const season = s.seasons[s.currentSeasonIndex];
      if (!season) return false;
      return (
        season.leadActorIDs.length < season.leadActorSlots ||
        season.supportingActorIDs.length < season.supportingActorSlots
      );
    });
  }, [person, shows]);

  if (!person) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ color: C.muted, padding: 32 }}>Talent not found.</Text>
      </SafeAreaView>
    );
  }

  const chemColor = CHEM_COLORS[person.chemistryColor];
  const yearsActive = getYearsActive(person, network.currentYear);

  const careerEarnings = talentDeals
    .filter(d => d.talentID === person.id)
    .reduce((sum, d) => sum + d.flatFee, 0);

  const personAwards = awards
    .filter(a => a.talentID === person.id)
    .sort((a, b) => b.year - a.year);

  const careerShows = shows.filter(sh => person.careerShowIDs.includes(sh.id));

  const currentDeal = talentDeals.find(d => d.talentID === person.id && !person.available);
  const currentShow = currentDeal ? shows.find(sh => sh.id === currentDeal.showID) : null;
  const competitorShow = person.bookedByCompetitorShowID
    ? competitors.flatMap(c => c.activeShows).find(sh => sh.id === person.bookedByCompetitorShowID)
    : null;
  const competitorStudio = competitorShow
    ? competitors.find(c => c.id === competitorShow.studioID)
    : null;

  const stats = person.stats.role === 'showrunner'
    ? [
        { label: 'Writing', value: person.stats.writing },
        { label: 'Creativity', value: person.stats.creativity },
        { label: 'Consistency', value: person.stats.consistency },
      ]
    : person.stats.role === 'director'
    ? [
        { label: 'Direction', value: person.stats.direction },
        { label: 'Vision', value: person.stats.vision },
        { label: 'Efficiency', value: person.stats.efficiency },
      ]
    : [
        { label: 'Acting', value: person.stats.acting },
        { label: 'Chemistry', value: person.stats.chemistry },
      ];

  const topStat = stats.reduce((a, b) => (b.value > a.value ? b : a), stats[0]);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={s.nameRow}>
          <Text style={s.name}>{person.name}</Text>
          <View style={[s.chemBadge, { borderColor: chemColor, backgroundColor: chemColor + '22' }]}>
            <View style={[s.chemDot, { backgroundColor: chemColor }]} />
            <Text style={[s.chemText, { color: chemColor }]}>
              {person.chemistryColor.charAt(0).toUpperCase() + person.chemistryColor.slice(1)}
            </Text>
          </View>
        </View>
        <Text style={s.meta}>
          {person.role.charAt(0).toUpperCase() + person.role.slice(1)}
          {' · Age '}{person.age}
          {' · '}{popularityLabel(person.popularity)}
        </Text>
        <Text style={s.subMeta}>
          Born: {person.birthplace}  ·  Active: {yearsActive} yr{yearsActive !== 1 ? 's' : ''}
        </Text>
        <Text style={s.quirk}>"{person.quirk}"</Text>

        {/* Ratings */}
        <Text style={s.sectionLabel}>RATINGS</Text>
        <View style={rs.row}>
          {stats.map(st => <RatingTile key={st.label} label={st.label} value={st.value} />)}
          <RatingTile label="POP" value={person.popularity} />
        </View>
        {topStat.value >= 90 && (
          <View style={s.calloutRow}>
            <Text style={[s.callout, { color: C.gold }]}>★ Elite {topStat.label}</Text>
          </View>
        )}

        {/* Career */}
        <Text style={s.sectionLabel}>CAREER</Text>
        <View style={s.card}>
          <View style={s.cardRow}>
            <Text style={s.cardLabel}>Career Earnings</Text>
            <Text style={s.cardValue}>{fmt(careerEarnings)}</Text>
          </View>
          <View style={[s.cardRow, { borderBottomWidth: 0 }]}>
            <Text style={s.cardLabel}>Debut</Text>
            <Text style={s.cardValue}>Year {person.debutYear}</Text>
          </View>
        </View>

        {/* Trophy case */}
        <Text style={s.sectionLabel}>TROPHY CASE</Text>
        {personAwards.length === 0 ? (
          <Text style={s.emptyText}>No hardware yet. Still early in the career.</Text>
        ) : (
          <View style={s.card}>
            {personAwards.map((a, i) => (
              <View key={a.id} style={[s.awardRow, i === personAwards.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={[s.awardIcon, { color: a.won ? C.gold : C.muted }]}>{a.won ? '🏆' : '🎗'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardLabel}>
                    {EMMY_CATEGORY_LABELS[a.category] ?? a.category}
                  </Text>
                  <Text style={s.awardSub}>
                    {a.won ? 'Won' : 'Nominated'} · Year {a.year}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Career timeline */}
        {careerShows.length > 0 && (
          <>
            <Text style={s.sectionLabel}>CAREER TIMELINE</Text>
            <View style={s.card}>
              {careerShows.map((sh, i) => (
                <View key={sh.id} style={[s.cardRow, i === careerShows.length - 1 && { borderBottomWidth: 0 }]}>
                  <Text style={s.cardLabel}>{sh.title}</Text>
                  <Text style={s.cardValue}>
                    {sh.genre} · {sh.seasons.length} season{sh.seasons.length > 1 ? 's' : ''}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Status */}
        <Text style={s.sectionLabel}>STATUS</Text>
        <View style={[s.statusRow, { borderColor: person.available ? C.green + '55' : C.amber + '55' }]}>
          <View style={[s.statusDot, { backgroundColor: person.available ? C.green : C.amber }]} />
          <Text style={[s.statusText, { color: person.available ? C.green : C.amber }]}>
            {person.available
              ? 'Available for hire'
              : competitorStudio
                ? `Filming for ${competitorStudio.name}`
                : currentShow
                  ? `On: ${currentShow.title}`
                  : 'Currently booked'}
          </Text>
        </View>

        {/* Hire */}
        {person.available && eligibleShows.length > 0 && (
          <>
            <Text style={s.sectionLabel}>HIRE FOR SHOW</Text>
            <View style={s.card}>
              {eligibleShows.map((sh, i) => {
                const season = sh.seasons[sh.currentSeasonIndex];
                if (person.role === 'actor') {
                  const leadOpen = (season?.leadActorIDs.length ?? 0) < (season?.leadActorSlots ?? 0);
                  const suppOpen = (season?.supportingActorIDs.length ?? 0) < (season?.supportingActorSlots ?? 0);
                  return (
                    <View key={sh.id} style={[s.hireRow, i === eligibleShows.length - 1 && { borderBottomWidth: 0 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.cardLabel}>{sh.title}</Text>
                        <Text style={s.awardSub}>{sh.genre}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {leadOpen && (
                          <TouchableOpacity
                            style={s.hireSlotBtn}
                            onPress={() => router.push(`/hire-talent?showID=${sh.id}&role=actor&actorType=lead&talentID=${person.id}`)}
                          >
                            <Text style={s.hireSlotText}>Lead</Text>
                          </TouchableOpacity>
                        )}
                        {suppOpen && (
                          <TouchableOpacity
                            style={s.hireSlotBtn}
                            onPress={() => router.push(`/hire-talent?showID=${sh.id}&role=actor&actorType=supporting&talentID=${person.id}`)}
                          >
                            <Text style={s.hireSlotText}>Supporting</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                }
                return (
                  <TouchableOpacity
                    key={sh.id}
                    style={[s.hireRow, i === eligibleShows.length - 1 && { borderBottomWidth: 0 }]}
                    onPress={() => router.push(`/hire-talent?showID=${sh.id}&role=${person.role}&talentID=${person.id}`)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={s.cardLabel}>{sh.title}</Text>
                      <Text style={s.awardSub}>{sh.genre}</Text>
                    </View>
                    <Text style={s.hireArrow}>Hire →</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: C.bg },
  header:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:        { padding: 4 },
  backText:       { color: C.accent, fontSize: 15, fontWeight: '600' },

  nameRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  name:           { color: C.text, fontSize: 26, fontWeight: '700' },
  chemBadge:      { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  chemDot:        { width: 8, height: 8, borderRadius: 4 },
  chemText:       { fontSize: 12, fontWeight: '600' },

  meta:           { color: C.muted, fontSize: 14, marginTop: 6 },
  subMeta:        { color: C.muted, fontSize: 13, marginTop: 4 },
  quirk:          { color: C.text, fontSize: 14, fontStyle: 'italic', marginTop: 10, lineHeight: 20 },

  sectionLabel:   { color: C.muted, fontSize: 11, fontWeight: '600', letterSpacing: 1, marginTop: 24, marginBottom: 10 },
  calloutRow:     { marginTop: 8 },
  callout:        { fontSize: 13, fontWeight: '700' },

  card:           { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10 },
  cardRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  cardLabel:      { color: C.text, fontSize: 14, fontWeight: '500' },
  cardValue:      { color: C.muted, fontSize: 13 },

  emptyText:      { color: C.muted, fontSize: 13, fontStyle: 'italic' },

  awardRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  awardIcon:      { fontSize: 18 },
  awardSub:       { color: C.muted, fontSize: 12, marginTop: 2 },

  statusRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  statusDot:      { width: 8, height: 8, borderRadius: 4 },
  statusText:     { fontSize: 13, fontWeight: '500' },

  hireRow:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  hireSlotBtn:    { backgroundColor: C.accent + '22', borderWidth: 1, borderColor: C.accent, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  hireSlotText:   { color: C.accent, fontSize: 12, fontWeight: '600' },
  hireArrow:      { color: C.accent, fontSize: 13, fontWeight: '600' },
});

const rs = StyleSheet.create({
  row:        { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  tile:       { width: 78, height: 78, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  tileValue:  { fontSize: 24, fontWeight: '800' },
  tileLabel:  { color: C.muted, fontSize: 11, fontWeight: '600', marginTop: 2, letterSpacing: 0.5 },
});
