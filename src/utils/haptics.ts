import * as Haptics from 'expo-haptics';

const safe = (fn: () => Promise<void>) => () => { try { fn(); } catch {} };

export const hap = {
  medium: safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  heavy: safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  light: safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  success: safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  warning: safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
