import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useGameStore } from '../src/store/gameStore';
import { ACHIEVEMENTS, RARITY_COLOR, AchievementRarity } from '../src/constants/achievements';

const C = {
  pageBg:   '#0f1220',
  cardBg:   '#191c2a',
  cardBg2:  '#1d2035',
  border:   '#252840',
  text:     '#f0ede8',
  muted:    '#9a958e',
  mutedMid: '#6b6880',
  gold:     '#e6b254',
};

const F = {
  display: 'BebasNeue_400Regular',
  body:    'Manrope_400Regular',
  bodyMd:  'Manrope_600SemiBold',
  bodyBd:  'Manrope_700Bold',
  bodyXBd: 'Manrope_800ExtraBold',
};

const RARITY_BG: Record<AchievementRarity, string> = {
  common:    '#9a958e12',
  rare:      '#5b8dee12',
  legendary: '#e6b25418',
};

const RARITY_BORDER: Record<AchievementRarity, string> = {
  common:    '#9a958e30',
  rare:      '#5b8dee30',
  legendary: '#e6b25440',
};

const RARITY_LABEL: Record<AchievementRarity, string> = {
  common:    'COMMON',
  rare:      'RARE',
  legendary: 'LEGENDARY',
};

const CATEGORIES = [
  { key: 'beginner',  label: '🎬  GETTING STARTED',  ids: ['first-show', 'first-greenlight', 'season-complete', 'season-two'] },
  { key: 'prestige',  label: '📈  PRESTIGE',          ids: ['prestige-10', 'prestige-21', 'prestige-41', 'prestige-61', 'prestige-81', 'prestige-100'] },
  { key: 'emmys',     label: '🏆  EMMY AWARDS',       ids: ['first-nom', 'first-win', 'emmy-sweep', 'ten-emmys'] },
  { key: 'ratings',   label: '⭐  RATINGS',            ids: ['rating-8', 'rating-9'] },
  { key: 'business',  label: '💰  BUSINESS',          ids: ['earn-10m', 'earn-100m', 'earn-500m'] },
  { key: 'content',   label: '🎭  CONTENT',           ids: ['franchise', 'ten-shows', 'four-genres'] },
  { key: 'streaming', label: '📡  STREAMING',         ids: ['streaming-deal'] },
  { key: 'talent',    label: '⚡  TALENT',             ids: ['elite-talent'] },
];

const ACHIEVEMENTS_BY_ID = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));

export default function AchievementsScreen() {
  const router = useRouter();
  const { unlockedAchievementIDs } = useGameStore();
  const unlocked = new Set(unlockedAchievementIDs);

  const totalCount   = ACHIEVEMENTS.length;
  const unlockedCount = unlocked.size;
  const pct = Math.round((unlockedCount / totalCount) * 100);

  return (
    <LinearGradient colors={['#141726', '#0c0f1a', '#070a12']} locations={[0, 0.55, 1]} style={{ flex: 1 }}>
      <SafeAreaView edges={['top']} style={st.safeArea}>

        {/* Header */}
        <View style={st.header}>
          <TouchableOpacity style={st.backBtn} onPress={() => router.back()}>
            <Text style={st.backText}>‹  BACK</Text>
          </TouchableOpacity>
          <Text style={st.screenTitle}>ACHIEVEMENTS</Text>
          <View style={{ width: 72 }} />
        </View>

        {/* Progress bar */}
        <View style={st.progressCard}>
          <View style={st.progressRow}>
            <Text style={st.progressLabel}>UNLOCKED</Text>
            <Text style={st.progressCount}>
              <Text style={st.progressNum}>{unlockedCount}</Text>
              <Text style={st.progressTotal}> / {totalCount}</Text>
            </Text>
          </View>
          <View style={st.progressTrack}>
            <View style={[st.progressFill, { width: `${pct}%` as any }]} />
          </View>
          <Text style={st.progressPct}>{pct}% COMPLETE</Text>
        </View>

        <ScrollView style={st.scroll} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>
          {CATEGORIES.map(cat => {
            const catAchievements = cat.ids.map(id => ACHIEVEMENTS_BY_ID[id]).filter(Boolean);
            const catUnlocked = catAchievements.filter(a => unlocked.has(a.id)).length;

            return (
              <View key={cat.key} style={st.section}>
                <View style={st.sectionHeader}>
                  <Text style={st.sectionLabel}>{cat.label}</Text>
                  <Text style={st.sectionCount}>{catUnlocked}/{catAchievements.length}</Text>
                </View>

                {catAchievements.map(achievement => {
                  const isUnlocked = unlocked.has(achievement.id);
                  const rarityColor  = RARITY_COLOR[achievement.rarity];
                  const rarityBg     = RARITY_BG[achievement.rarity];
                  const rarityBorder = RARITY_BORDER[achievement.rarity];

                  return (
                    <View
                      key={achievement.id}
                      style={[
                        st.achievementRow,
                        isUnlocked
                          ? { backgroundColor: rarityBg, borderColor: rarityBorder }
                          : st.achievementRowLocked,
                      ]}
                    >
                      {/* Emoji badge */}
                      <View style={[
                        st.badge,
                        isUnlocked
                          ? { borderColor: rarityColor + '50', backgroundColor: '#1e2238' }
                          : st.badgeLocked,
                      ]}>
                        <Text style={[st.badgeEmoji, !isUnlocked && st.emojiLocked]}>
                          {isUnlocked ? achievement.emoji : '🔒'}
                        </Text>
                      </View>

                      {/* Text */}
                      <View style={st.textBlock}>
                        {isUnlocked && (
                          <Text style={[st.rarityTag, { color: rarityColor }]}>
                            {RARITY_LABEL[achievement.rarity]}
                          </Text>
                        )}
                        <Text style={[st.achievementTitle, !isUnlocked && st.lockedText]}>
                          {isUnlocked ? achievement.title : '???'}
                        </Text>
                        <Text style={[st.achievementDesc, !isUnlocked && st.lockedDesc]} numberOfLines={2}>
                          {isUnlocked ? achievement.description : 'Keep playing to unlock.'}
                        </Text>
                      </View>

                      {/* Right accent */}
                      {isUnlocked && (
                        <View style={[st.accentBar, { backgroundColor: rarityColor }]} />
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  safeArea: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#252840',
  },
  backBtn:    { width: 72 },
  backText:   { fontFamily: F.bodyBd, color: C.gold, fontSize: 13, letterSpacing: 0.5 },
  screenTitle:{ fontFamily: F.display, color: C.text, fontSize: 26, letterSpacing: 3 },

  progressCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#191c2a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#252840',
    padding: 16,
    gap: 8,
  },
  progressRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  progressLabel: { fontFamily: F.bodyXBd, color: C.muted, fontSize: 10, letterSpacing: 1.5 },
  progressCount: { fontFamily: F.bodyBd, fontSize: 14 },
  progressNum:   { color: C.gold },
  progressTotal: { color: C.muted },
  progressTrack: {
    height: 6,
    backgroundColor: '#252840',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: C.gold,
    borderRadius: 3,
  },
  progressPct: {
    fontFamily: F.bodyMd,
    color: C.mutedMid,
    fontSize: 10,
    letterSpacing: 1,
    textAlign: 'right',
  },

  scroll:        { flex: 1, marginTop: 16 },
  scrollContent: { paddingHorizontal: 16 },

  section:       { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionLabel: { fontFamily: F.bodyXBd, color: C.muted, fontSize: 11, letterSpacing: 1.4 },
  sectionCount: { fontFamily: F.bodyMd,  color: C.mutedMid, fontSize: 11 },

  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 8,
    padding: 12,
    gap: 12,
  },
  achievementRowLocked: {
    backgroundColor: '#141624',
    borderColor: '#1e2035',
  },

  badge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  badgeLocked: {
    backgroundColor: '#141624',
    borderColor: '#1e2035',
  },
  badgeEmoji: { fontSize: 24 },
  emojiLocked: { opacity: 0.4 },

  textBlock: { flex: 1, gap: 1 },
  rarityTag: { fontFamily: F.bodyXBd, fontSize: 9, letterSpacing: 1.2 },

  achievementTitle: {
    fontFamily: F.bodyBd,
    color: C.text,
    fontSize: 14,
  },
  achievementDesc: {
    fontFamily: F.body,
    color: C.muted,
    fontSize: 12,
  },
  lockedText: { color: '#3a3d52' },
  lockedDesc: { color: '#2e3045' },

  accentBar: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
});