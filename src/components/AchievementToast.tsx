import { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGameStore } from '../store/gameStore';
import { ACHIEVEMENTS_MAP, RARITY_COLOR, AchievementRarity } from '../constants/achievements';

const TOAST_HEIGHT = 90;
const DISPLAY_MS = 3200;

const RARITY_GLOW: Record<AchievementRarity, string> = {
  common:    '#9a958e22',
  rare:      '#5b8dee22',
  legendary: '#e6b25428',
};

const RARITY_LABEL: Record<AchievementRarity, string> = {
  common:    'ACHIEVEMENT',
  rare:      'RARE ACHIEVEMENT',
  legendary: 'LEGENDARY ACHIEVEMENT',
};

async function playChime() {
  try {
    // expo-av must be installed and linked via EAS/prebuild to use audio.
    // Dynamically require so a missing native module never crashes the app.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Audio } = require('expo-av') as typeof import('expo-av');
    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/sounds/achievement.wav'),
      { shouldPlay: true, volume: 0.75 },
    );
    sound.setOnPlaybackStatusUpdate(status => {
      if (status.isLoaded && status.didJustFinish) sound.unloadAsync();
    });
  } catch {
    // Audio not available — silently skip
  }
}

export function AchievementToast() {
  const { achievementQueue, dismissAchievement } = useGameStore();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-(TOAST_HEIGHT + 60))).current;
  const currentID = achievementQueue[0] ?? null;

  useEffect(() => {
    if (!currentID) return;

    const achievement = ACHIEVEMENTS_MAP[currentID];
    if (!achievement) {
      dismissAchievement();
      return;
    }

    // Reset before slide-in so rapid successive toasts restart cleanly
    translateY.setValue(-(TOAST_HEIGHT + 60));

    playChime();

    // Slide in
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 85,
      friction: 11,
    }).start();

    // Auto-dismiss
    const timer = setTimeout(() => {
      Animated.timing(translateY, {
        toValue: -(TOAST_HEIGHT + 60),
        duration: 280,
        useNativeDriver: true,
      }).start(() => dismissAchievement());
    }, DISPLAY_MS);

    return () => clearTimeout(timer);
  }, [currentID]);

  if (!currentID) return null;

  const achievement = ACHIEVEMENTS_MAP[currentID];
  if (!achievement) return null;

  const rarityColor = RARITY_COLOR[achievement.rarity];
  const bgGlow = RARITY_GLOW[achievement.rarity];
  const label = RARITY_LABEL[achievement.rarity];

  return (
    <Animated.View
      style={[
        styles.container,
        { top: insets.top + 8, transform: [{ translateY }] },
      ]}
      pointerEvents="none"
    >
      <View style={[styles.toast, { backgroundColor: '#141728', borderColor: rarityColor }]}>
        {/* Subtle rarity glow behind the content */}
        <View style={[styles.glow, { backgroundColor: bgGlow }]} pointerEvents="none" />

        {/* Emoji badge */}
        <View style={[styles.badge, { borderColor: rarityColor + '60' }]}>
          <Text style={styles.emoji}>{achievement.emoji}</Text>
        </View>

        {/* Text block */}
        <View style={styles.textBlock}>
          <Text style={[styles.rarityLabel, { color: rarityColor }]}>{label}</Text>
          <Text style={styles.title} numberOfLines={1}>{achievement.title}</Text>
          <Text style={styles.desc} numberOfLines={1}>{achievement.description}</Text>
        </View>

        {/* Right accent bar */}
        <View style={[styles.accentBar, { backgroundColor: rarityColor }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    height: TOAST_HEIGHT,
    paddingHorizontal: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
  },
  badge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: '#1e2238',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  emoji: {
    fontSize: 26,
  },
  textBlock: {
    flex: 1,
    gap: 1,
  },
  rarityLabel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9,
    letterSpacing: 1.2,
  },
  title: {
    fontFamily: 'Manrope_700Bold',
    color: '#f0ede8',
    fontSize: 15,
  },
  desc: {
    fontFamily: 'Manrope_400Regular',
    color: '#9a958e',
    fontSize: 12,
  },
  accentBar: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
});