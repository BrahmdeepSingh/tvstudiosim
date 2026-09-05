import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect, Circle, Polyline, Line } from 'react-native-svg';

const C = {
  tabBar:   '#0d1025',
  gold:     '#e6b254',
  inactive: '#4a4760',
  border:   '#1e2240',
};

function IconDashboard({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="1.8" />
      <Rect x="14" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="1.8" />
      <Rect x="3" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="1.8" />
      <Rect x="14" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="1.8" />
    </Svg>
  );
}

function IconShows({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="5" width="20" height="15" rx="2" stroke={color} strokeWidth="1.8" />
      <Path d="M8 5V2M16 5V2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M10 12l4-2.5v5L10 12z" fill={color} />
    </Svg>
  );
}

function IconMedia({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke={color} strokeWidth="1.8" />
      <Path d="M12 6v6l4 2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IconTalent({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="1.8" />
      <Path d="M4 20c0-3.31 3.58-6 8-6s8 2.69 8 6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

function IconStudio({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M3 21h18M5 21V9l7-6 7 6v12" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Rect x="9" y="14" width="6" height="7" stroke={color} strokeWidth="1.8" />
    </Svg>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.tabBar,
          borderTopColor: C.border,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
        },
        tabBarActiveTintColor: C.gold,
        tabBarInactiveTintColor: C.inactive,
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index"      options={{ title: 'Dashboard', tabBarIcon: ({ color }) => <IconDashboard color={color} /> }} />
      <Tabs.Screen name="shows"      options={{ title: 'Shows',     tabBarIcon: ({ color }) => <IconShows     color={color} /> }} />
      <Tabs.Screen name="media"      options={{ title: 'The Wire',  tabBarIcon: ({ color }) => <IconMedia     color={color} /> }} />
      <Tabs.Screen name="talent"     options={{ title: 'Talent',    tabBarIcon: ({ color }) => <IconTalent    color={color} /> }} />
      <Tabs.Screen name="financials" options={{ title: 'Studio',    tabBarIcon: ({ color }) => <IconStudio    color={color} /> }} />
      <Tabs.Screen name="inbox"      options={{ href: null }} />
    </Tabs>
  );
}