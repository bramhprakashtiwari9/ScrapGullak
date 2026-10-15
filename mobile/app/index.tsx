import { ActivityIndicator, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useApp } from '../src/context/AppContext';

export default function Index() {
  const { ready, session, mode } = useApp();
  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-paper">
        <ActivityIndicator color="#10B981" />
        <Text className="mt-3 text-sm text-slate-500">Opening your ScrapGullak…</Text>
      </View>
    );
  }
  if (!session) return <Redirect href="/login" />;
  if (session.role === 'ADMIN') return <Redirect href="/admin" />;
  return <Redirect href={mode === 'agent' ? '/agent' : '/customer'} />;
}
