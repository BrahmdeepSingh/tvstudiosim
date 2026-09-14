import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { hap } from '../../src/utils/haptics';

type TabRoute = '/(tabs)/index' | '/(tabs)/shows' | '/(tabs)/talent' | '/(tabs)/financials' | '/(tabs)/media';

interface Props {
  tab?: TabRoute;
}

export default function HomeButton({ tab = '/(tabs)/index' }: Props) {
  const router = useRouter();
  const { C } = useTheme();

  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={() => { hap.light(); router.replace(tab); }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={[styles.icon, { color: C.gold }]}>⌂</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn:  { width: 36, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 18 },
});
