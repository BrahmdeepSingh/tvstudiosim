import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import {
  Manrope_300Light,
  Manrope_400Regular,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { AchievementToast } from '../src/components/AchievementToast';
import { TutorialOverlay } from './components/TutorialOverlay';
import { useTutorialStore } from '../src/store/tutorialStore';

function TutorialInit() {
  const init = useTutorialStore(s => s.init);
  useEffect(() => { init(); }, []);
  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    Manrope_300Light,
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#141726', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#e6b254" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <TutorialInit />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0f1220' } }} />
      <AchievementToast />
      <TutorialOverlay />
    </SafeAreaProvider>
  );
}