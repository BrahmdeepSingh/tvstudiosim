import { Tabs } from 'expo-router';

const C = {
  tabBar:   '#0d1025',
  gold:     '#e6b254',
  inactive: '#4a4760',
  border:   '#1e2240',
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.tabBar,
          borderTopColor: C.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: C.gold,
        tabBarInactiveTintColor: C.inactive,
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index"      options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="shows"      options={{ title: 'Shows' }} />
      <Tabs.Screen name="talent"     options={{ title: 'Talent' }} />
      <Tabs.Screen name="media"      options={{ title: 'The Wire' }} />
      <Tabs.Screen name="financials" options={{ title: 'Studio' }} />
      <Tabs.Screen name="inbox"      options={{ href: null }} />
    </Tabs>
  );
}