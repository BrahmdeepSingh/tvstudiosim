import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Image,
} from 'react-native';
import { useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useGameStore } from '../../src/store/gameStore';
import { getYearsActive } from '../../src/engine/talent';
import { EMMY_CATEGORY_LABELS } from '../../src/constants/game';
import { AVATAR_MAP } from '../../src/utils/avatars';

const C = {
  pageBg: '#0f1220', cardBg: '#191c2a',
  border: '#252840',
  text: '#f0ede8', muted: '#9a958e',
  gold: '#e6b254', goldDim: '#e6b25420',
  green: '#4ec46e', amber: '#d4753a', red: '#c43820', teal: '#3db8a8',
};

const CHEM_COLORS = { green: '#4ec46e', blue: '#5b8dee', red: '#c43820' };

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
  if (value >= 90) return { borderColor: C.gold, backgroundColor: C.goldDim, color: C.gold };
  if (value >= 75) return { borderColor: C.teal, backgroundColor: C.teal + '18', color: C.teal };
  return { borderColor: C.border, backgroundColor: C.cardBg, color: C.text };
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
        <LinearGradient colors={['#131829', '#0f1220']} style={StyleSheet.absoluteFill} />
        <FilmRibbonAmbient />
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ color: C.muted, padding: 32, fontFamily: 'Manrope_400Regular' }}>Talent not found.</Text>
      </SafeAreaView>
    );
  }

  const chemColor = CHEM_COLORS[person.chemistryColor];
  const yearsActive = getYearsActive(person, network.currentYear);

  const careerEarnings = person.priorCareerEarnings + talentDeals
    .filter(d => d.talentID === person.id)
    .reduce((sum, d) => sum + d.flatFee, 0);

  const personAwards = awards
    .filter(a => a.talentID === person.id)
    .sort((a, b) => b.year - a.year);

  const legacyAwards = [...person.legacyAwards].sort((a, b) => b.year - a.year);

  const careerShows = shows.filter(sh => person.careerShowIDs.includes(sh.id));
  const legacyCredits = person.legacyCredits;

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
      <LinearGradient colors={['#131829', '#0f1220', '#0a0d18']} style={StyleSheet.absoluteFill} />
      <FilmRibbonAmbient />

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={s.portraitWrap}>
          <Image source={AVATAR_MAP[person.avatarId]} style={s.portrait} />
        </View>
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
          Born: {person.birthplace}  ·  {yearsActive === 0
            ? 'Rookie — debuting this year'
            : `Active: ${yearsActive} yr${yearsActive !== 1 ? 's' : ''}`}
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
        {personAwards.length === 0 && legacyAwards.length === 0 ? (
          <Text style={s.emptyText}>No hardware yet. Still early in the career.</Text>
        ) : (
          <View style={s.card}>
            {personAwards.map((a, i) => (
              <View key={a.id} style={[s.awardRow, (i === personAwards.length - 1 && legacyAwards.length === 0) && { borderBottomWidth: 0 }]}>
                <Text style={[s.awardIcon, { color: a.won ? C.amber : C.muted }]}>{a.won ? '🏆' : '🎗'}</Text>
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
            {legacyAwards.map((a, i) => (
              <View key={`legacy-${i}`} style={[s.awardRow, i === legacyAwards.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={[s.awardIcon, { color: a.won ? C.amber : C.muted }]}>{a.won ? '🏆' : '🎗'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardLabel}>
                    {EMMY_CATEGORY_LABELS[a.category] ?? a.category}
                  </Text>
                  <Text style={s.awardSub}>
                    {a.won ? 'Won' : 'Nominated'} · Year {a.year} · Before your network
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Career timeline */}
        {(legacyCredits.length > 0 || careerShows.length > 0) ? (
          <>
            <Text style={s.sectionLabel}>CAREER TIMELINE</Text>
            <View style={s.card}>
              {legacyCredits.map((credit, i) => (
                <View
                  key={`legacy-credit-${i}`}
                  style={[s.cardRow, (i === legacyCredits.length - 1 && careerShows.length === 0) && { borderBottomWidth: 0 }]}
                >
                  <View>
                    <Text style={s.cardLabel}>{credit.title}</Text>
                    <Text style={s.awardSub}>Year {credit.year} · Before your network</Text>
                  </View>
                  <Text style={s.cardValue}>{credit.genre}</Text>
                </View>
              ))}
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
        ) : (
          <>
            <Text style={s.sectionLabel}>CAREER TIMELINE</Text>
            <Text style={s.emptyText}>Just breaking into the industry — no credits yet.</Text>
          </>
        )}

        {/* Status */}
        <Text style={s.sectionLabel}>STATUS</Text>
        <View style={[s.statusRow, { borderColor: person.available ? C.green + '55' : C.amber + '55' }]}>
          <View style={[s.statusDot, { backgroundColor: person.available ? C.green : C.amber }]} />
          <Text style={[s.statusText, { color: person.available ? C.green : C.amber }]}>
            {person.available
              ? 'Available for hire'
              : competitorStudio && competitorShow
                ? competitorShow.status === 'pre-production'
                  ? `In pre-production with ${competitorStudio.name}`
                  : competitorShow.status === 'filming'
                  ? `Filming "${competitorShow.title}" for ${competitorStudio.name}`
                  : `Airing on ${competitorStudio.name} — "${competitorShow.title}"`
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
  container:    { flex: 1, backgroundColor: C.pageBg },
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:      { padding: 4 },
  backText:     { color: C.gold, fontFamily: 'Manrope_600SemiBold', fontSize: 15 },

  portraitWrap: { alignItems: 'center', marginBottom: 16 },
  portrait:     { width: 140, height: 165, borderRadius: 70 },
  nameRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  name:         { color: C.text, fontFamily: 'BebasNeue_400Regular', fontSize: 32, letterSpacing: 0.5 },
  chemBadge:    { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  chemDot:      { width: 8, height: 8, borderRadius: 4 },
  chemText:     { fontFamily: 'Manrope_700Bold', fontSize: 12 },

  meta:         { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 14, marginTop: 6 },
  subMeta:      { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 13, marginTop: 4 },
  quirk:        { color: C.text, fontFamily: 'Manrope_400Regular', fontSize: 14, fontStyle: 'italic', marginTop: 10, lineHeight: 20 },

  sectionLabel: { color: C.muted, fontFamily: 'Manrope_700Bold', fontSize: 11, letterSpacing: 1.5, marginTop: 24, marginBottom: 10 },
  calloutRow:   { marginTop: 8 },
  callout:      { fontFamily: 'Manrope_800ExtraBold', fontSize: 13 },

  card:         { backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.border, borderRadius: 12 },
  cardRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  cardLabel:    { color: C.text, fontFamily: 'Manrope_600SemiBold', fontSize: 14 },
  cardValue:    { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 13 },

  emptyText:    { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 13, fontStyle: 'italic' },

  awardRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  awardIcon:    { fontSize: 18 },
  awardSub:     { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 12, marginTop: 2 },

  statusRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  statusDot:    { width: 8, height: 8, borderRadius: 4 },
  statusText:   { fontFamily: 'Manrope_600SemiBold', fontSize: 13 },

  hireRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  hireSlotBtn:  { backgroundColor: C.goldDim, borderWidth: 1, borderColor: C.gold, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  hireSlotText: { color: C.gold, fontFamily: 'Manrope_700Bold', fontSize: 12 },
  hireArrow:    { color: C.gold, fontFamily: 'Manrope_700Bold', fontSize: 13 },
});

const rs = StyleSheet.create({
  row:       { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  tile:      { width: 78, height: 78, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  tileValue: { fontFamily: 'BebasNeue_400Regular', fontSize: 30, letterSpacing: 0.5 },
  tileLabel: { color: C.muted, fontFamily: 'Manrope_700Bold', fontSize: 10, marginTop: 2, letterSpacing: 0.5 },
});