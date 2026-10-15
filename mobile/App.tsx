import './global.css';
import { View } from 'react-native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './src/context/AppContext';
import ModeHeader from './src/components/ModeHeader';

/**
 * Root component. Expo Router mounts it through app/_layout.tsx, so every screen
 * shares the providers and the Customer / Pickup Agent mode header.
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <View className="flex-1 bg-paper">
          <StatusBar style="light" />
          <ModeHeader />
          <Slot />
        </View>
      </AppProvider>
    </SafeAreaProvider>
  );
}
