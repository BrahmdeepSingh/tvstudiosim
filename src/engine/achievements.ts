import { GameState } from '../types';
import { ACHIEVEMENTS } from '../constants/achievements';

export function checkAchievements(state: GameState): string[] {
  const unlocked = new Set(state.unlockedAchievementIDs);
  const newlyUnlocked: string[] = [];

  for (const achievement of ACHIEVEMENTS) {
    if (unlocked.has(achievement.id)) continue;
    if (achievement.check(state)) {
      newlyUnlocked.push(achievement.id);
    }
  }

  return newlyUnlocked;
}
