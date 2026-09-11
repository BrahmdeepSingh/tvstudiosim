import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, TextInput, Animated, Keyboard, Platform } from 'react-native';
import { hap } from '../../src/utils/haptics';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useMemo, useState, useRef, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useGameStore } from '../../src/store/gameStore';
import { getYearsActive } from '../../src/engine/talent';
import { EMMY_CATEGORY_LABELS, TALENT_FEES, SUPPORTING_ACTOR_FEES, GENRE_CONFIG, popularityToFeeTier } from '../../src/constants/game';
import { AVATAR_MAP } from '../../src/utils/avatars';
import { TalentRole, Talent } from '../../src/types';

const C = {
  pageBg: '#0f1220', cardBg: '#191c2a',
  border: '#252840',
  text: '#f0ede8', muted: '#9a958e',
  gold: '#e6b254', goldDim: '#e6b25420', goldBtnText: '#161008',
  green: '#4ec46e', greenBg: '#1a3325',
  amber: '#d4753a', red: '#c43820', redBg: '#2a130f',
  teal: '#3db8a8',
};

const CHEM_COLORS = { green: '#4ec46e', blue: '#5b8dee', red: '#c43820' };

// ─── Voice lines ──────────────────────────────────────────────────────────────
const VOICE: Record<string, string[]> = {
  opening_showrunner: ["Ready to run the room — for the right number.", "I don't come cheap, but I deliver.", "Name your offer. My writers room awaits."],
  opening_director:   ["I have a vision. The question is your budget.", "Every great show needs a great director.", "Cameras don't roll without the right deal."],
  opening_actor:      ["I bring the audience. You bring the offer.", "Star power doesn't come free.", "I'm listening. Make it worth my while."],
  veryLow:  ["You're joking, right?", "My dry cleaning costs more than this.", "Did you mean to add a zero?", "My agent is going to hang up on you."],
  low:      ["That's not gonna pay the bills.", "We're not in the same ballpark.", "I've seen better from indie studios.", "Keep the change."],
  medium:   ["Getting warmer, but not quite.", "I'm listening now. Keep going.", "Not there yet, but you're trying.", "You're in the conversation."],
  high:     ["Now we're talking.", "I like where this is going.", "Almost there — push it over the line.", "My agent would be happy with this."],
  top:      ["You've got yourself a deal.", "Let's make great TV together.", "Pleasure doing business.", "I'll have my agent draw up the paperwork."],
  rejected: ["That's too low for me.", "I need more than that to sign.", "Come back when you're serious.", "Not gonna happen at that price."],
};

function seededPick<T>(arr: T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  return arr[Math.abs(h) % arr.length];
}

function getVoiceLine(talent: Talent, likelihood: number, offerStatus: 'idle' | 'accepted' | 'rejected', hasTyped: boolean): string {
  if (offerStatus === 'accepted') return seededPick(VOICE.top, talent.id + 'top');
  if (offerStatus === 'rejected') return seededPick(VOICE.rejected, talent.id + 'rej');
  if (!hasTyped) return seededPick(VOICE[`opening_${talent.role}`] ?? VOICE.opening_actor, talent.id + 'open');
  if (likelihood >= 85)  return seededPick(VOICE.top, talent.id + 'top');
  if (likelihood >= 60)  return seededPick(VOICE.high, talent.id + 'high');
  if (likelihood >= 35)  return seededPick(VOICE.medium, talent.id + 'med');
  if (likelihood >= 15)  return seededPick(VOICE.low, talent.id + 'low');
  return seededPick(VOICE.veryLow, talent.id + 'vlo');
}

// ─── Likelihood (mirrors evaluateOffer math exactly) ─────────────────────────
// effectiveMin is the 100% mark on the bar; acceptance fires at >= 85%.
function computeLikelihood(
  talent: Talent,
  flatFee: number,
  revSharePercent: number,
  networkPrestige: number,
  actorType: 'lead' | 'supporting',
  expectedSeasonRevenue: number,
  heatMultiplier: number,
): number {
  if (flatFee <= 0) return 0;
  const pop = talent.popularity;
  const tier = popularityToFeeTier(pop);
  const range = (talent.role === 'actor' && actorType === 'supporting')
    ? SUPPORTING_ACTOR_FEES[tier]
    : TALENT_FEES[talent.role][tier];
  const prestigeMod = 1 - Math.min(Math.max((networkPrestige - talent.prestigeRequired) / 200, 0), 0.15);
  const effectiveMin = range[0] * prestigeMod * heatMultiplier;
  const revShareValue = (revSharePercent / 100) * expectedSeasonRevenue;
  const combinedValue = flatFee + revShareValue;
  return Math.min(100, Math.floor((combinedValue / effectiveMin) * 100));
}


function likelihoodColor(pct: number): string {
  if (pct >= 85) return '#4ec46e'; // will sign
  if (pct >= 65) return '#8ecf5a';
  if (pct >= 40) return '#d4c14a';
  if (pct >= 15) return '#d4753a';
  return '#c43820';
}

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

type OfferStatus = 'idle' | 'accepted' | 'rejected';

export default function TalentDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    showID?: string;
    role?: string;
    actorType?: string;
  }>();
  const id = params.id;
  const hireShowID = params.showID ?? '';
  const hireRole: TalentRole = (params.role as TalentRole) || 'actor';
  const hireActorType: 'lead' | 'supporting' =
    params.actorType === 'supporting' ? 'supporting' : 'lead';
  const inHireContext = !!params.showID;

  const {
    talent, shows, talentDeals, awards, competitors, network,
    hireShowrunner, hireDirector, hireActor, evaluateOffer,
  } = useGameStore();

  const [offerVisible, setOfferVisible] = useState(false);
  const [offerText, setOfferText] = useState('');
  const [revShare, setRevShare] = useState(0);
  const [offerStatus, setOfferStatus] = useState<OfferStatus>('idle');
  const [lastRejected, setLastRejected] = useState(false);
  const sheetAnim = useRef(new Animated.Value(400)).current;
  const sheetKeyboardOffset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvent, e => {
      Animated.timing(sheetKeyboardOffset, {
        toValue: e.endCoordinates.height,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
    const onHide = Keyboard.addListener(hideEvent, () => {
      Animated.timing(sheetKeyboardOffset, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
    return () => { onShow.remove(); onHide.remove(); };
  }, [sheetKeyboardOffset]);

  // Expected season ad revenue for the hire-context show (genre baseline at rating 7)
  const hireShow = shows.find(s => s.id === hireShowID);
  const expectedSeasonRevenue = useMemo(() => {
    if (!hireShow) return 0;
    const season = hireShow.seasons[hireShow.currentSeasonIndex];
    const episodeCount = season?.episodeCount ?? 10;
    const cfg = GENRE_CONFIG[hireShow.genre];
    const perEpisode = Math.round((cfg.baseViewers / 1000) * cfg.cpm * (1 + (7 - 5) / 10));
    return perEpisode * episodeCount;
  }, [hireShow]);

  const person = talent.find(t => t.id === id);

  const eligibleShows = useMemo(() => {
    if (!person || !person.available) return [];
    if (person.role === 'showrunner') {
      return shows.filter(s => {
        const season = s.seasons[s.currentSeasonIndex];
        return s.status === 'writing' &&
          season != null &&
          season.showrunnerIDs.length < season.showrunnerSlots;
      });
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
      <SafeAreaView edges={['top']} style={s.container}>
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

  // ─── Offer sheet logic ────────────────────────────────────────────────────────
  const cashOnHand = network.cashOnHand;
  const flatFee = parseFloat(offerText.replace(/,/g, '')) * 1_000_000;
  const cashValid = !isNaN(flatFee) && flatFee > 0 && flatFee <= cashOnHand;
  const validOffer = cashValid; // cash required; rev share is optional on top
  const hasTyped = offerText.trim().length > 0;
  const hireShowHeat = hireShow?.heatMultiplier ?? 1.0;
  const likelihood = (hasTyped && !isNaN(flatFee) && flatFee > 0)
    ? computeLikelihood(person, flatFee, revShare, network.prestige, hireActorType, expectedSeasonRevenue, hireShowHeat)
    : 0;
  const voiceLine = getVoiceLine(person, likelihood, offerStatus, hasTyped);
  const lColor = likelihoodColor(likelihood);
  const revSharePayout = Math.round(revShare / 100 * expectedSeasonRevenue);

  function openOfferSheet() {
    setOfferText('');
    setRevShare(0);
    setOfferStatus('idle');
    setLastRejected(false);
    sheetAnim.setValue(400);
    setOfferVisible(true);
    Animated.spring(sheetAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
      speed: 14,
    }).start();
  }

  function closeOfferSheet() {
    Keyboard.dismiss();
    sheetKeyboardOffset.setValue(0);
    Animated.timing(sheetAnim, {
      toValue: 400,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setOfferVisible(false));
  }

  function handleOffer() {
    if (!validOffer) return;
    hap.medium();
    const accepted = evaluateOffer(person.id, flatFee, revShare, network.prestige, hireShowID, hireActorType);
    if (accepted) {
      let success = false;
      if (hireRole === 'showrunner') success = hireShowrunner(hireShowID, person.id, flatFee, revShare);
      else if (hireRole === 'director') success = hireDirector(hireShowID, person.id, flatFee, revShare);
      else success = hireActor(hireShowID, person.id, flatFee, revShare, hireActorType);

      if (success) {
        hap.success();
        setOfferStatus('accepted');
        setTimeout(() => {
          closeOfferSheet();
          // After a successful hire, check if all slots for this role are now
          // filled. If so, dismiss both talent/[id] AND hire-talent in one shot
          // so the user lands back on the show/dashboard. If actor slots still
          // have room, stay on hire-talent to pick another.
          const { shows: latestShows } = useGameStore.getState();
          const latestShow = latestShows.find(s => s.id === hireShowID);
          const latestSeason = latestShow?.seasons[latestShow.currentSeasonIndex];
          let slotsFull = false;
          if (hireRole === 'director') {
            slotsFull = !!latestSeason?.directorID;
          } else if (hireRole === 'showrunner') {
            slotsFull = (latestSeason?.showrunnerIDs.length ?? 0) >= (latestSeason?.showrunnerSlots ?? 1);
          } else {
            slotsFull = hireActorType === 'lead'
              ? (latestSeason?.leadActorIDs.length ?? 0) >= (latestSeason?.leadActorSlots ?? 0)
              : (latestSeason?.supportingActorIDs.length ?? 0) >= (latestSeason?.supportingActorSlots ?? 0);
          }
          if (slotsFull) {
            router.dismiss(2);
          } else {
            router.back();
          }
        }, 1200);
      }
    } else {
      hap.error();
      setOfferStatus('rejected');
      setLastRejected(true);
      setTimeout(() => setOfferStatus('idle'), 1500);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={s.container}>
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

        {/* ── RATINGS ─────────────────────────────────────────────────────────── */}
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

        {/* ── HIRE BUTTON (hire-talent context) ───────────────────────────────── */}
        {inHireContext && person.available && (
          <TouchableOpacity style={s.offerBtnWrap} onPress={openOfferSheet} activeOpacity={0.85}>
            <LinearGradient
              colors={['#c49440', '#e6b254', '#f0c96a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.offerBtnGrad}
            >
              <Text style={s.offerBtnIcon}>🤝</Text>
              <Text style={s.offerBtnText}>Make an Offer</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* ── HIRE FOR SHOW (talent-tab context: no showID param) ─────────────── */}
        {!inHireContext && person.available && eligibleShows.length > 0 && (
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
                            onPress={() => router.push(`/hire-talent?showID=${sh.id}&role=actor&actorType=lead`)}
                          >
                            <Text style={s.hireSlotText}>Lead</Text>
                          </TouchableOpacity>
                        )}
                        {suppOpen && (
                          <TouchableOpacity
                            style={s.hireSlotBtn}
                            onPress={() => router.push(`/hire-talent?showID=${sh.id}&role=actor&actorType=supporting`)}
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
                    onPress={() => router.push(`/hire-talent?showID=${sh.id}&role=${person.role}`)}
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

        {/* ── CAREER ──────────────────────────────────────────────────────────── */}
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

        {/* ── TROPHY CASE ─────────────────────────────────────────────────────── */}
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

        {/* ── CAREER TIMELINE ─────────────────────────────────────────────────── */}
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
              {careerShows.map((sh, i) => {
                const appearedSeasons = sh.seasons
                  .filter(se =>
                    se.leadActorIDs.includes(person.id) ||
                    se.supportingActorIDs.includes(person.id) ||
                    se.directorID === person.id ||
                    se.showrunnerIDs.includes(person.id)
                  )
                  .map(se => se.seasonNumber);
                const seasonLabel = appearedSeasons.length === 0
                  ? `${sh.seasons.length} season${sh.seasons.length !== 1 ? 's' : ''}`
                  : appearedSeasons.length === 1
                    ? `Season ${appearedSeasons[0]}`
                    : `Season ${appearedSeasons.join(', ')}`;
                return (
                  <View key={sh.id} style={[s.cardRow, i === careerShows.length - 1 && { borderBottomWidth: 0 }]}>
                    <Text style={s.cardLabel}>{sh.title}</Text>
                    <Text style={s.cardValue}>{sh.genre} · {seasonLabel}</Text>
                  </View>
                );
              })}
            </View>
          </>
        ) : (
          <>
            <Text style={s.sectionLabel}>CAREER TIMELINE</Text>
            <Text style={s.emptyText}>Just breaking into the industry — no credits yet.</Text>
          </>
        )}

        {/* ── STATUS ──────────────────────────────────────────────────────────── */}
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
      </ScrollView>

      {/* ── OFFER SHEET (absolute overlay, no Modal) ────────────────────────── */}
      {offerVisible && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 50 }]} pointerEvents="box-none">
          {/* Dim backdrop */}
          <TouchableOpacity
            style={m.backdrop}
            activeOpacity={1}
            onPress={closeOfferSheet}
            pointerEvents="auto"
          />
          {/* Animated sheet */}
          <Animated.View
            style={[m.sheet, { transform: [{ translateY: Animated.subtract(sheetAnim, sheetKeyboardOffset) }] }]}
            pointerEvents="auto"
          >
            <View style={m.handle} />

            <View style={m.sheetHeader}>
              <View style={[m.chemBadge, { backgroundColor: CHEM_COLORS[person.chemistryColor] + '33', borderColor: CHEM_COLORS[person.chemistryColor] }]}>
                <Text style={[m.chemText, { color: CHEM_COLORS[person.chemistryColor] }]}>
                  {person.chemistryColor.charAt(0).toUpperCase() + person.chemistryColor.slice(1)}
                </Text>
              </View>
              <TouchableOpacity onPress={closeOfferSheet} style={m.closeBtn}>
                <Text style={m.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Name row */}
            <View style={m.nameRow}>
              <Image source={AVATAR_MAP[person.avatarId]} style={m.avatar} />
              <View style={{ flex: 1 }}>
                <Text style={m.name}>{person.name}</Text>
                <Text style={m.role}>{person.role.charAt(0).toUpperCase() + person.role.slice(1)} · {popularityLabel(person.popularity)}</Text>
              </View>
            </View>

            {/* Voice bubble */}
            <View style={m.voiceBubble}>
              <Text style={m.voiceName}>{person.name.split(' ')[0]}:</Text>
              <Text style={[m.voiceText, offerStatus === 'rejected' && { color: '#d4753a' }, offerStatus === 'accepted' && { color: '#4ec46e' }]}>
                {' '}{voiceLine}
              </Text>
            </View>

            {offerStatus === 'accepted' ? (
              <View style={m.acceptedBanner}>
                <Text style={m.acceptedText}>✓ Deal signed — ${(flatFee / 1_000_000).toFixed(2)}M{revShare > 0 ? ` + ${revShare}%` : ''}</Text>
              </View>
            ) : (
              <>
                {/* Cash input */}
                <Text style={m.offerLabel}>UPFRONT CASH (millions) — required</Text>
                <View style={m.offerRow}>
                  <Text style={m.dollarSign}>$</Text>
                  <TextInput
                    style={m.offerInput}
                    value={offerText}
                    onChangeText={setOfferText}
                    placeholder="0.00"
                    placeholderTextColor={C.muted}
                    keyboardType="decimal-pad"
                  />
                  <Text style={m.millionLabel}>M</Text>
                </View>

                {/* Revenue share stepper */}
                <Text style={m.offerLabel}>AD REVENUE SHARE — optional</Text>
                <View style={m.revShareRow}>
                  <TouchableOpacity
                    style={m.stepBtn}
                    onPress={() => { hap.light(); setRevShare(r => Math.max(0, r - 1)); }}
                    disabled={revShare === 0}
                  >
                    <Text style={[m.stepBtnText, revShare === 0 && { color: C.border }]}>−</Text>
                  </TouchableOpacity>
                  <View style={m.revShareValueWrap}>
                    <Text style={m.revShareValue}>{revShare}%</Text>
                    {revShare > 0 && expectedSeasonRevenue > 0 && (
                      <Text style={m.revShareEst}>
                        ~${(revSharePayout / 1_000_000).toFixed(2)}M est. payout/season
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={m.stepBtn}
                    onPress={() => { hap.light(); setRevShare(r => Math.min(10, r + 1)); }}
                    disabled={revShare === 10}
                  >
                    <Text style={[m.stepBtnText, revShare === 10 && { color: C.border }]}>+</Text>
                  </TouchableOpacity>
                </View>

                {/* Likelihood meter */}
                <View style={m.likelihoodRow}>
                  <Text style={m.likelihoodLabel}>LIKELIHOOD</Text>
                  <View style={m.likelihoodBarBg}>
                    <View style={[m.likelihoodBarFill, { width: `${likelihood}%` as any, backgroundColor: lColor }]} />
                  </View>
                  <Text style={[m.likelihoodPct, { color: lColor }]}>
                    {hasTyped && flatFee > 0 ? `${likelihood}%` : '—'}
                  </Text>
                </View>

                <Text style={m.cashAvail}>
                  Cash available: ${(cashOnHand / 1_000_000).toFixed(1)}M
                </Text>

                {offerStatus === 'rejected' ? (
                  <View style={m.rejectedBanner}>
                    <Text style={m.rejectedText}>✗ Offer rejected — try higher</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[m.submitBtn, !validOffer && m.submitBtnDisabled]}
                    onPress={handleOffer}
                    disabled={!validOffer}
                  >
                    {validOffer ? (
                      <LinearGradient
                        colors={['#c49440', '#e6b254']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={m.submitBtnGrad}
                      >
                        <Text style={m.submitBtnText}>Submit Offer</Text>
                      </LinearGradient>
                    ) : (
                      <View style={m.submitBtnGrad}>
                        <Text style={m.submitBtnTextDisabled}>Submit Offer</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              </>
            )}
          </Animated.View>
        </View>
      )}
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

  // Make an Offer button (hire-talent context)
  offerBtnWrap: { marginTop: 20, borderRadius: 16, overflow: 'hidden', elevation: 4, shadowColor: C.gold, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.35, shadowRadius: 8 },
  offerBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
  offerBtnIcon: { fontSize: 20 },
  offerBtnText: { color: C.goldBtnText, fontFamily: 'Manrope_800ExtraBold', fontSize: 18, letterSpacing: 0.3 },

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

const m = StyleSheet.create({
  backdrop:   { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000bb' },
  sheet:      { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#16192a', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: '#252840', padding: 24, paddingBottom: 40 },
  handle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: '#3a3d55', alignSelf: 'center', marginBottom: 20 },

  sheetHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  chemBadge:  { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  chemText:   { fontFamily: 'Manrope_700Bold', fontSize: 12 },
  closeBtn:   { padding: 4 },
  closeBtnText: { color: '#9a958e', fontSize: 18 },

  nameRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  avatar:     { width: 44, height: 52, borderRadius: 8 },
  name:       { color: '#f0ede8', fontFamily: 'BebasNeue_400Regular', fontSize: 28, letterSpacing: 0.5 },
  role:       { color: '#9a958e', fontFamily: 'Manrope_400Regular', fontSize: 13 },

  // Voice bubble
  voiceBubble:  { backgroundColor: '#1e2238', borderWidth: 1, borderColor: '#2e3255', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 18, flexDirection: 'row', flexWrap: 'wrap' },
  voiceName:    { color: '#e6b254', fontFamily: 'Manrope_700Bold', fontSize: 13 },
  voiceText:    { color: '#f0ede8', fontFamily: 'Manrope_400Regular', fontSize: 13, fontStyle: 'italic', lineHeight: 18 },

  // Offer input
  offerLabel:       { color: '#9a958e', fontFamily: 'Manrope_700Bold', fontSize: 11, letterSpacing: 1.5, marginBottom: 8 },
  offerRow:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#191c2a', borderWidth: 1, borderColor: '#252840', borderRadius: 12, paddingHorizontal: 14, marginBottom: 16 },

  // Revenue share stepper
  revShareRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#191c2a', borderWidth: 1, borderColor: '#252840', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 10, marginBottom: 16 },
  stepBtn:          { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepBtnText:      { color: '#e6b254', fontSize: 24, fontFamily: 'Manrope_700Bold' },
  revShareValueWrap:{ flex: 1, alignItems: 'center' },
  revShareValue:    { color: '#f0ede8', fontFamily: 'BebasNeue_400Regular', fontSize: 28, letterSpacing: 0.5 },
  revShareEst:      { color: '#9a958e', fontFamily: 'Manrope_400Regular', fontSize: 11, marginTop: 2 },

  // Likelihood meter
  likelihoodRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  likelihoodLabel:  { color: '#9a958e', fontFamily: 'Manrope_700Bold', fontSize: 10, letterSpacing: 1.2, width: 80 },
  likelihoodBarBg:  { flex: 1, height: 6, backgroundColor: '#252840', borderRadius: 3, overflow: 'hidden' },
  likelihoodBarFill:{ height: 6, borderRadius: 3 },
  likelihoodPct:    { fontFamily: 'Manrope_700Bold', fontSize: 13, width: 36, textAlign: 'right' },
  dollarSign: { color: '#9a958e', fontSize: 20, marginRight: 4 },
  offerInput: { flex: 1, color: '#f0ede8', fontFamily: 'Manrope_700Bold', fontSize: 24, paddingVertical: 14 },
  millionLabel: { color: '#9a958e', fontSize: 18 },
  cashAvail:  { color: '#9a958e', fontFamily: 'Manrope_400Regular', fontSize: 12, marginBottom: 16 },

  submitBtn:         { borderRadius: 14 },
  submitBtnDisabled: { backgroundColor: '#191c2a', borderWidth: 1, borderColor: '#252840', borderRadius: 14 },
  submitBtnGrad:     { padding: 16, alignItems: 'center', borderRadius: 14 },
  submitBtnText:     { color: '#161008', fontFamily: 'Manrope_800ExtraBold', fontSize: 16 },
  submitBtnTextDisabled: { color: '#9a958e', fontFamily: 'Manrope_600SemiBold', fontSize: 16 },

  acceptedBanner: { backgroundColor: '#1a3325', borderRadius: 12, padding: 16, alignItems: 'center' },
  acceptedText:   { color: '#4ec46e', fontFamily: 'Manrope_700Bold', fontSize: 16 },
  rejectedBanner: { backgroundColor: '#2a130f', borderRadius: 12, padding: 16, alignItems: 'center' },
  rejectedText:   { color: '#c43820', fontFamily: 'Manrope_700Bold', fontSize: 16 },
});