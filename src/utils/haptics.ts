import * as Haptics from 'expo-haptics';

export const hap = {
  // Core game action (advance week, confirm decisions)
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  // Major positive moments (emmy win, deal signed, achievement, greenlight)
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  // Tiny ticks (steppers, toggles)
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  // Success (offer accepted, show created)
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  // Failure (offer rejected, cancelled show)
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  // Warning (can't afford, show struggling)
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
};
