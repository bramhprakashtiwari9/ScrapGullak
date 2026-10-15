import { Tabs } from 'expo-router';
import { Home, IndianRupee, PiggyBank, Recycle, Truck } from 'lucide-react-native';

export default function CustomerTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#047857',
        tabBarInactiveTintColor: '#64748B',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarStyle: { borderTopColor: '#E2E8F0' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
      <Tabs.Screen name="book" options={{ title: 'Sell scrap', tabBarIcon: ({ color, size }) => <Recycle color={color} size={size} /> }} />
      <Tabs.Screen name="rates" options={{ title: 'Rates', tabBarIcon: ({ color, size }) => <IndianRupee color={color} size={size} /> }} />
      <Tabs.Screen name="track" options={{ title: 'Track', tabBarIcon: ({ color, size }) => <Truck color={color} size={size} /> }} />
      <Tabs.Screen name="passbook" options={{ title: 'Passbook', tabBarIcon: ({ color, size }) => <PiggyBank color={color} size={size} /> }} />
    </Tabs>
  );
}
