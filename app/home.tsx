import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, Animated, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../src/store/gameStore';
import { getAllSlotsMeta, deleteSave, SlotMeta } from '../src/store/storage';

const SLOT_COUNT = 3;

const C = {
  bg:         '#0a0c18',
  cardBg:     '#12162a',
  cardBorder: '#252840',
  gold:       '#e6b254',
  goldDim:    '#e6b25418',
  goldBorder: '#e6b25440',
  text:       '#f0ede8',
  muted:      '#9a958e',
  mutedMid:   '#5a566a',
  red:        '#c43820',
  redBorder:  '#c4382040',
};

const F = {
  display: 'BebasNeue_400Regular',
  body:    'Manrope_400Regular',
  bodyMd:  'Manrope_600SemiBold',
  bodyBd:  'Manrope_700Bold',
};

function SlotCard({
  meta,
  onPress,
  onDelete,
  index,
}: {
  meta: SlotMeta;
  onPress: () => void;
  onDelete: () => void;
  index: number;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 380,
        delay: index * 90, useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0, duration: 380,
        delay: index * 90, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const occupied = meta.occupied;

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={onPress}
        style={[s.slotCard, occupied ? s.slotCardOccupied : s.slotCardEmpty]}
      >
        {occupied && (
          <LinearGradient
            colors={[C.goldDim, 'transparent']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}

        <View style={s.slotLeft}>
          <Text style={[s.slotNumber, occupied ? { color: C.gold } : { color: C.mutedMid }]}>
            {`0${meta.slot}`}
          </Text>
        </View>

        <View style={s.slotMiddle}>
          {occupied ? (
            <>
              <Text style={s.slotStudioName}>{meta.studioName}</Text>
              <Text style={s.slotMeta}>
                {`Year ${meta.year} · Week ${meta.week} · Prestige ${meta.prestige ?? 0}`}
              </Text>
              {meta.lastSaved && (
                <Text style={s.slotDate}>
                  {`Saved ${formatDate(meta.lastSaved)}`}
                </Text>
              )}
            </>
          ) : (
            <>
              <Text style={s.slotEmptyLabel}>NEW GAME</Text>
              <Text style={s.slotEmptyHint}>Tap to create your studio</Text>
            </>
          )}
        </View>

        <View style={s.slotRight}>
          {occupied ? (
            <View style={s.slotActions}>
              <Text style={[s.slotChevron, { color: C.gold }]}>▶</Text>
              <TouchableOpacity
                style={s.deleteBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={onDelete}
              >
                <Text style={s.deleteBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={[s.slotChevron, { color: C.mutedMid }]}>+</Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function HomeScreen() {
  const router = useRouter();
  const { loadGame } = useGameStore();
  const [slots, setSlots] = useState<SlotMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSlot, setLoadingSlot] = useState<number | null>(null);

  const titleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(titleAnim, {
      toValue: 1, duration: 500, useNativeDriver: true,
    }).start();
    fetchSlots();
  }, []);

  async function fetchSlots() {
    setLoading(true);
    const meta = await getAllSlotsMeta(SLOT_COUNT);
    setSlots(meta);
    setLoading(false);
  }

  async function handleSlotPress(meta: SlotMeta) {
    if (meta.occupied) {
      setLoadingSlot(meta.slot);
      const ok = await loadGame(meta.slot);
      setLoadingSlot(null);
      if (ok) {
        router.replace('/(tabs)' as any);
      } else {
        Alert.alert('Load Failed', 'Could not load this save file.');
      }
    } else {
      router.push({ pathname: '/studio-setup', params: { slot: String(meta.slot) } } as any);
    }
  }

  function handleDelete(meta: SlotMeta) {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Delete Slot ${meta.slot} — ${meta.studioName}?\n\nThis cannot be undone.`
      );
      if (confirmed) {
        deleteSave(meta.slot).then(fetchSlots);
      }
    } else {
      Alert.alert(
        'Delete Save',
        `Permanently delete Slot ${meta.slot} — ${meta.studioName}? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await deleteSave(meta.slot);
              fetchSlots();
            },
          },
        ],
      );
    }
  }

  return (
    <View style={s.container}>
      <LinearGradient
        colors={['#0d1028', '#0a0c18', '#06080f']}
        style={StyleSheet.absoluteFill}
      />

      {/* Ambient film-strip line */}
      <View style={s.filmLine} />

      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>

        {/* Title block */}
        <Animated.View style={[s.titleBlock, { opacity: titleAnim }]}>
          <Text style={s.eyebrow}>· · · WELCOME TO · · ·</Text>
          <Text style={s.gameTitle}>TV STUDIO</Text>
          <Text style={s.gameSub}>SIMULATOR</Text>
          <View style={s.titleRule} />
          <Text style={s.tagline}>Build your network. Win the Emmys.</Text>
        </Animated.View>

        {/* Slot section */}
        <View style={s.slotsSection}>
          <Text style={s.slotsLabel}>SAVE FILES</Text>

          {loading ? (
            <ActivityIndicator color={C.gold} style={{ marginTop: 32 }} />
          ) : (
            <View style={s.slotsList}>
              {slots.map((meta: SlotMeta, i: number) => (
                <SlotCard
                  key={meta.slot}
                  meta={meta}
                  index={i}
                  onPress={() => {
                    if (loadingSlot) return;
                    handleSlotPress(meta);
                  }}
                  onDelete={() => handleDelete(meta)}
                />
              ))}
            </View>
          )}
        </View>

        {loadingSlot !== null && (
          <View style={s.loadingOverlay}>
            <ActivityIndicator color={C.gold} size="large" />
            <Text style={s.loadingText}>Loading Slot {loadingSlot}…</Text>
          </View>
        )}

        <Text style={s.footer}>· · ·</Text>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: C.bg },
  safe:       { flex: 1, alignItems: 'center', justifyContent: 'center' },

  filmLine: {
    position: 'absolute', top: 0, bottom: 0, left: 28,
    width: 1, backgroundColor: '#e6b25412',
  },

  // Title
  titleBlock:  { alignItems: 'center', marginBottom: 48 },
  eyebrow:     { color: C.mutedMid, fontFamily: F.bodyBd, fontSize: 10, letterSpacing: 3, marginBottom: 8 },
  gameTitle:   { color: C.gold, fontFamily: F.display, fontSize: 72, letterSpacing: 4, lineHeight: 72 },
  gameSub:     { color: C.text, fontFamily: F.display, fontSize: 28, letterSpacing: 8, marginTop: -4 },
  titleRule:   { width: 60, height: 1, backgroundColor: C.goldBorder, marginTop: 18, marginBottom: 14 },
  tagline:     { color: C.muted, fontFamily: F.body, fontSize: 13, letterSpacing: 0.3 },

  // Slots
  slotsSection: { width: '100%', paddingHorizontal: 24 },
  slotsLabel:   { color: C.mutedMid, fontFamily: F.bodyBd, fontSize: 10, letterSpacing: 2, marginBottom: 12, paddingLeft: 4 },
  slotsList:    { gap: 10 },

  slotCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 10, borderWidth: 1,
    paddingVertical: 16, paddingHorizontal: 16,
    overflow: 'hidden',
  },
  slotCardOccupied: {
    backgroundColor: C.cardBg,
    borderColor: C.goldBorder,
  },
  slotCardEmpty: {
    backgroundColor: 'transparent',
    borderColor: C.cardBorder,
    borderStyle: 'dashed',
  },

  slotLeft: { width: 32, marginRight: 14 },
  slotNumber: { fontFamily: F.display, fontSize: 22, letterSpacing: 1 },

  slotMiddle: { flex: 1 },
  slotStudioName: { color: C.text, fontFamily: F.bodyBd, fontSize: 15, marginBottom: 3 },
  slotMeta:       { color: C.muted, fontFamily: F.body, fontSize: 12, marginBottom: 2 },
  slotDate:       { color: C.mutedMid, fontFamily: F.body, fontSize: 11 },
  slotEmptyLabel: { color: C.mutedMid, fontFamily: F.display, fontSize: 18, letterSpacing: 1.5 },
  slotEmptyHint:  { color: C.mutedMid, fontFamily: F.body, fontSize: 12, marginTop: 2 },

  slotRight: { marginLeft: 12 },
  slotActions: { alignItems: 'center', gap: 10 },
  slotChevron: { fontFamily: F.bodyBd, fontSize: 16 },

  deleteBtn:     { padding: 4 },
  deleteBtnText: { color: C.red, fontFamily: F.bodyBd, fontSize: 12 },

  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#0a0c18cc',
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  loadingText: { color: C.gold, fontFamily: F.bodyMd, fontSize: 14 },

  footer: { color: C.mutedMid, fontSize: 12, marginTop: 32, letterSpacing: 3 },
});
