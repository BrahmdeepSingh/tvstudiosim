import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameState } from '../types';

const SLOT_KEY = (slot: number) => `tvstudiosim_save_${slot}`;

export interface SlotMeta {
  slot: number;
  occupied: boolean;
  studioName?: string;
  initials?: string;
  week?: number;
  year?: number;
  lastSaved?: string;
  prestige?: number;
}

export async function getAllSlotsMeta(slotCount = 3): Promise<SlotMeta[]> {
  const results: SlotMeta[] = [];
  for (let i = 1; i <= slotCount; i++) {
    try {
      const json = await AsyncStorage.getItem(SLOT_KEY(i));
      if (!json) {
        results.push({ slot: i, occupied: false });
        continue;
      }
      const parsed = JSON.parse(json) as Partial<GameState>;
      results.push({
        slot: i,
        occupied: true,
        studioName: parsed.network?.name,
        initials: parsed.network?.initials,
        week: parsed.network?.currentWeek,
        year: parsed.network?.currentYear,
        lastSaved: parsed.lastSaved,
        prestige: parsed.network?.prestige,
      });
    } catch {
      results.push({ slot: i, occupied: false });
    }
  }
  return results;
}

export async function saveGameToStorage(state: GameState): Promise<void> {
  try {
    const json = JSON.stringify({ ...state, lastSaved: new Date().toISOString() });
    await AsyncStorage.setItem(SLOT_KEY(state.saveSlot), json);
  } catch (e) {
    console.warn('Save failed:', e);
  }
}

export async function loadGameFromStorage(slot: number): Promise<GameState | null> {
  try {
    const json = await AsyncStorage.getItem(SLOT_KEY(slot));
    if (!json) return null;
    return JSON.parse(json) as GameState;
  } catch (e) {
    console.warn('Load failed:', e);
    return null;
  }
}

export async function hasSave(slot: number): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(SLOT_KEY(slot));
    return val !== null;
  } catch {
    return false;
  }
}

export async function deleteSave(slot: number): Promise<void> {
  try {
    await AsyncStorage.removeItem(SLOT_KEY(slot));
  } catch (e) {
    console.warn('Delete save failed:', e);
  }
}
