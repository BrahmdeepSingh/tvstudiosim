import { Tabs } from 'expo-router';
import { Text } from 'react-native';

const COLORS = {
  bg: '#0f0f17',
  tabBar: '#16161f',
  active: '#7c6af7',
  inactive: '#4a4a5e',
  border: '#1e1e2e',
};

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{ color: focused ? COLORS.active : COLORS.inactive, fontSize: 10, marginTop: 2 }}>
      {label}
    </Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.tabBar,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: COLORS.active,
        tabBarInactiveTintColor: COLORS.inactive,
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index"      options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="shows"      options={{ title: 'Shows' }} />
      <Tabs.Screen name="talent"     options={{ title: 'Talent' }} />
      <Tabs.Screen name="inbox"      options={{ title: 'Inbox' }} />
      <Tabs.Screen name="financials" options={{ title: 'Financials' }} />
    </Tabs>
  );
}
