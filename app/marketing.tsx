import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Image,
} from 'react-native';
import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useGameStore } from '../src/store/gameStore';
import { MARKETING_CHANNELS, WEEKS_PER_YEAR } from '../src/constants/game';

const C = {
  pageBg: '#0f1220', cardBg: '#191c2a',
  border: '#252840',
  text: '#f0ede8', muted: '#9a958e',
  gold: '#e6b254', goldDim: '#e6b25420', goldBtnText: '#161008',
  green: '#4ec46e', greenBg: '#1a3325', amber: '#d4753a', red: '#c43820',
};

function FilmRibbonAmbient() {
  return (
    <Image
      source={require('../assets/tvbg.png')}
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

function qualityLabel(q: number): { label: string; color: string } {
  if (q >= 80) return { label: 'Outstanding', color: '#2d8a5e' };
  if (q >= 65) return { label: 'Strong',       color: '#5a9e45' };
  if (q >= 50) return { label: 'Solid',         color: C.amber };
  if (q >= 35) return { label: 'Average',       color: '#c07a30' };
  return           { label: 'Weak',             color: C.red };
}

export default function MarketingScreen() {
  const router = useRouter();
  const { showID } = useLocalSearchParams<{ showID: string }>();
  const { shows, network, setAirDate, purchaseMarketingChannels } = useGameStore();

  const show = shows.find(s => s.id === showID);
  const season = show?.seasons[show.currentSeasonIndex];

  const [weeksOut, setWeeksOut] = useState(
    season?.airDateWeek != null ? (() => {
      const { currentWeek, currentYear } = network;
      const aw = season.airDateWeek!;
      const ay = season.airDateYear!;
      return (ay - currentYear) * WEEKS_PER_YEAR + (aw - currentWeek);
    })() : 2
  );
  const [isEditing, setIsEditing] = useState(false);

  if (!show || !season || show.status !== 'marketing') {
    return (
      <SafeAreaView style={s.container}>
        <LinearGradient colors={['#131829', '#0f1220']} style={StyleSheet.absoluteFill} />
        <Text style={{ color: C.muted, padding: 32, fontFamily: 'Manrope_400Regular' }}>No show in marketing phase.</Text>
      </SafeAreaView>
    );
  }

  const { currentWeek, currentYear, cashOnHand } = network;

  const rawWeek = currentWeek + weeksOut;
  const targetYear = currentYear + Math.floor((rawWeek - 1) / WEEKS_PER_YEAR);
  const targetWeek = ((rawWeek - 1) % WEEKS_PER_YEAR) + 1;

  const airDateSet = season.airDateWeek !== null;
  const ql = qualityLabel(season.qualityScore);

  function handleSetAirDate() {
    setAirDate(show!.id, targetWeek, targetYear);
    setIsEditing(false);
  }

  function handleBuyChannel(channelID: string) {
    purchaseMarketingChannels(show!.id, [channelID]);
  }

  const totalSpend = season.marketingSpend;

  return (
    <SafeAreaView style={s.container}>
      <LinearGradient colors={['#131829', '#0f1220', '#0a0d18']} style={StyleSheet.absoluteFill} />
      <FilmRibbonAmbient />

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>Marketing</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>

        {/* Show info */}
        <View style={s.showRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.showTitle}>{show.title}</Text>
            <Text style={s.showMeta}>
              {show.genre.charAt(0).toUpperCase() + show.genre.slice(1)} · Season {season.seasonNumber}
            </Text>
          </View>
          <View style={s.cashBadge}>
            <Text style={s.cashLabel}>CASH</Text>
            <Text style={s.cashValue}>{fmt(cashOnHand)}</Text>
          </View>
        </View>

        {/* Quality score */}
        <View style={s.qualityCard}>
          <View style={s.qualityLeft}>
            <Text style={s.qualityHeading}>PRODUCTION QUALITY</Text>
            <Text style={s.qualityNote}>Determined during filming — sets your base rating</Text>
          </View>
          <View style={[s.qualityBadge, { borderColor: ql.color, backgroundColor: ql.color + '22' }]}>
            <Text style={[s.qualityScore, { color: ql.color }]}>{season.qualityScore}</Text>
            <Text style={[s.qualityLabel, { color: ql.color }]}>{ql.label}</Text>
          </View>
        </View>

        {/* Air Date */}
        <Text style={s.sectionLabel}>AIR DATE</Text>
        {airDateSet && !isEditing ? (
          <View style={s.airDateSet}>
            <View style={{ flex: 1 }}>
              <Text style={s.airDateValue}>
                Week {season.airDateWeek}, Year {season.airDateYear}
              </Text>
              <Text style={s.airDateSub}>Air date locked in</Text>
            </View>
            <TouchableOpacity style={s.changeBtn} onPress={() => setIsEditing(true)}>
              <Text style={s.changeBtnText}>Change</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.airDateCard}>
            <Text style={s.airDateHint}>
              {isEditing
                ? 'Choose a new premiere date.'
                : 'Pick how many weeks from now to air. More time = more marketing runway.'}
            </Text>
            <View style={s.stepperRow}>
              <TouchableOpacity
                style={[s.stepBtn, weeksOut <= 1 && s.stepBtnDisabled]}
                onPress={() => setWeeksOut(n => Math.max(1, n - 1))}
              >
                <Text style={s.stepBtnText}>−</Text>
              </TouchableOpacity>
              <View style={s.stepDisplay}>
                <Text style={s.stepValue}>{weeksOut}</Text>
                <Text style={s.stepUnit}>week{weeksOut !== 1 ? 's' : ''} from now</Text>
              </View>
              <TouchableOpacity
                style={[s.stepBtn, weeksOut >= 16 && s.stepBtnDisabled]}
                onPress={() => setWeeksOut(n => Math.min(16, n + 1))}
              >
                <Text style={s.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.targetDate}>
              Premieres: Week {targetWeek}, Year {targetYear}
            </Text>
            <View style={s.airDateActions}>
              {isEditing && (
                <TouchableOpacity style={s.cancelBtn} onPress={() => setIsEditing(false)}>
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[s.setAirBtn, isEditing && { flex: 1 }]}
                onPress={handleSetAirDate}
              >
                <LinearGradient
                  colors={['#c49440', '#e6b254']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.setAirBtnGrad}
                >
                  <Text style={s.setAirBtnText}>{isEditing ? 'Confirm Date' : 'Set Premiere Date'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Marketing Channels */}
        <Text style={s.sectionLabel}>MARKETING CHANNELS</Text>
        <Text style={s.sectionDesc}>
          Channels boost episode 1 ratings. Effect decays over the run. Genre matches get a 20% bonus.
        </Text>

        {MARKETING_CHANNELS.map(channel => {
          const purchased = season.marketingChannelIDs.includes(channel.id);
          const hasAffinity =
            channel.genreAffinities.length === 0 ||
            (channel.genreAffinities as readonly string[]).includes(show.genre);
          const canAfford = cashOnHand >= channel.cost;

          return (
            <View
              key={channel.id}
              style={[s.channelCard, purchased && s.channelCardPurchased]}
            >
              <View style={s.channelTop}>
                <View style={{ flex: 1 }}>
                  <View style={s.channelNameRow}>
                    <Text style={[s.channelName, purchased && { color: C.green }]}>
                      {channel.name}
                    </Text>
                    {hasAffinity && channel.genreAffinities.length > 0 && (
                      <View style={s.affinityBadge}>
                        <Text style={s.affinityText}>Genre match</Text>
                      </View>
                    )}
                    {channel.genreAffinities.length === 0 && (
                      <View style={[s.affinityBadge, { backgroundColor: C.goldDim, borderColor: C.gold }]}>
                        <Text style={[s.affinityText, { color: C.gold }]}>All genres</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.channelReach}>
                    Reach: {Math.round(channel.reachMultiplier * 100)}%
                    {hasAffinity && channel.genreAffinities.length > 0 ? ' (+20% affinity)' : ''}
                  </Text>
                </View>
                <View style={s.channelRight}>
                  <Text style={[s.channelCost, !canAfford && !purchased && { color: C.red }]}>
                    {fmt(channel.cost)}
                  </Text>
                  {purchased ? (
                    <View style={s.purchasedBadge}>
                      <Text style={s.purchasedText}>✓ Bought</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[s.buyBtn, !canAfford && s.buyBtnDisabled]}
                      onPress={() => handleBuyChannel(channel.id)}
                      disabled={!canAfford}
                    >
                      {canAfford ? (
                        <LinearGradient
                          colors={['#c49440', '#e6b254']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={s.buyBtnGrad}
                        >
                          <Text style={s.buyBtnText}>Buy</Text>
                        </LinearGradient>
                      ) : (
                        <View style={s.buyBtnGrad}>
                          <Text style={s.buyBtnTextDisabled}>Buy</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          );
        })}

        {/* Spend summary */}
        <View style={s.spendCard}>
          <View style={s.spendRow}>
            <Text style={s.spendLabel}>Marketing spend so far</Text>
            <Text style={[s.spendValue, { color: totalSpend > 0 ? C.amber : C.muted }]}>
              {fmt(totalSpend)}
            </Text>
          </View>
          <View style={s.spendRow}>
            <Text style={s.spendLabel}>Cash remaining after</Text>
            <Text style={[s.spendValue, { color: C.green }]}>
              {fmt(cashOnHand)}
            </Text>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: C.pageBg },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn:          { width: 60 },
  backText:         { color: C.gold, fontFamily: 'Manrope_600SemiBold', fontSize: 15 },
  headerTitle:      { color: C.text, fontFamily: 'BebasNeue_400Regular', fontSize: 22, letterSpacing: 0.5, flex: 1, textAlign: 'center' },
  scroll:           { flex: 1 },
  scrollContent:    { padding: 16 },

  showRow:          { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  showTitle:        { color: C.text, fontFamily: 'Manrope_700Bold', fontSize: 18 },
  showMeta:         { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 13, marginTop: 2 },
  cashBadge:        { backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'flex-end' },
  cashLabel:        { color: C.muted, fontFamily: 'Manrope_700Bold', fontSize: 10, letterSpacing: 0.5 },
  cashValue:        { color: C.green, fontFamily: 'Manrope_700Bold', fontSize: 15, marginTop: 2 },

  qualityCard:      { backgroundColor: C.cardBg, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 24, flexDirection: 'row', alignItems: 'center', gap: 12 },
  qualityLeft:      { flex: 1 },
  qualityHeading:   { color: C.muted, fontFamily: 'Manrope_700Bold', fontSize: 11, letterSpacing: 1, marginBottom: 4 },
  qualityNote:      { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 12, lineHeight: 17 },
  qualityBadge:     { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', minWidth: 80 },
  qualityScore:     { fontFamily: 'BebasNeue_400Regular', fontSize: 32, lineHeight: 36, letterSpacing: 0.5 },
  qualityLabel:     { fontFamily: 'Manrope_700Bold', fontSize: 11, marginTop: 2 },

  sectionLabel:     { color: C.muted, fontFamily: 'Manrope_700Bold', fontSize: 11, letterSpacing: 1.5, marginBottom: 10 },
  sectionDesc:      { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19, marginBottom: 12, marginTop: -4 },

  airDateSet:       { backgroundColor: C.cardBg, borderRadius: 12, borderWidth: 1, borderColor: C.green + '66', padding: 14, marginBottom: 24, flexDirection: 'row', alignItems: 'center' },
  airDateValue:     { color: C.green, fontFamily: 'Manrope_700Bold', fontSize: 16 },
  airDateSub:       { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 12, marginTop: 2 },
  changeBtn:        { borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  changeBtnText:    { color: C.muted, fontFamily: 'Manrope_600SemiBold', fontSize: 13 },

  airDateCard:      { backgroundColor: C.cardBg, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 24 },
  airDateHint:      { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19, marginBottom: 16 },
  stepperRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 12 },
  stepBtn:          { width: 44, height: 44, borderRadius: 10, backgroundColor: C.pageBg, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  stepBtnDisabled:  { opacity: 0.3 },
  stepBtnText:      { color: C.text, fontSize: 24, lineHeight: 28 },
  stepDisplay:      { alignItems: 'center', minWidth: 110 },
  stepValue:        { color: C.text, fontFamily: 'BebasNeue_400Regular', fontSize: 40, letterSpacing: 0.5, lineHeight: 46 },
  stepUnit:         { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 12 },
  targetDate:       { color: C.gold, fontFamily: 'Manrope_600SemiBold', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  airDateActions:   { flexDirection: 'row', gap: 10 },
  cancelBtn:        { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  cancelBtnText:    { color: C.muted, fontFamily: 'Manrope_600SemiBold', fontSize: 15 },
  setAirBtn:        { flex: 1, borderRadius: 12, overflow: 'hidden' },
  setAirBtnGrad:    { padding: 14, alignItems: 'center' },
  setAirBtnText:    { color: C.goldBtnText, fontFamily: 'Manrope_800ExtraBold', fontSize: 15 },

  channelCard:          { backgroundColor: C.cardBg, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 10 },
  channelCardPurchased: { borderColor: C.green + '66' },
  channelTop:           { flexDirection: 'row', alignItems: 'center', gap: 12 },
  channelNameRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  channelName:          { color: C.text, fontFamily: 'Manrope_600SemiBold', fontSize: 15 },
  affinityBadge:        { backgroundColor: C.green + '22', borderWidth: 1, borderColor: C.green, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  affinityText:         { color: C.green, fontFamily: 'Manrope_700Bold', fontSize: 10 },
  channelReach:         { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 12 },
  channelRight:         { alignItems: 'flex-end', gap: 6 },
  channelCost:          { color: C.text, fontFamily: 'Manrope_700Bold', fontSize: 15 },
  purchasedBadge:       { backgroundColor: C.green + '22', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  purchasedText:        { color: C.green, fontFamily: 'Manrope_700Bold', fontSize: 12 },
  buyBtn:               { borderRadius: 8, overflow: 'hidden' },
  buyBtnDisabled:       { backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.border },
  buyBtnGrad:           { paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center' },
  buyBtnText:           { color: C.goldBtnText, fontFamily: 'Manrope_800ExtraBold', fontSize: 13 },
  buyBtnTextDisabled:   { color: C.muted, fontFamily: 'Manrope_600SemiBold', fontSize: 13 },

  spendCard:    { backgroundColor: C.cardBg, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, marginTop: 8 },
  spendRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  spendLabel:   { color: C.muted, fontFamily: 'Manrope_400Regular', fontSize: 14 },
  spendValue:   { color: C.text, fontFamily: 'Manrope_700Bold', fontSize: 14 },
});
