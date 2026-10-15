import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Truck } from 'lucide-react-native';
import { useApp, type AppMode } from '../context/AppContext';
import { IS_PUBLIC_DEMO } from '../services/api';
import GullakMark from './GullakMark';

const MODES: { id: AppMode; label: string; Icon: typeof Home }[] = [
  { id: 'customer', label: 'Customer', Icon: Home },
  { id: 'agent', label: 'Pickup agent', Icon: Truck },
];

/** Top header with the Customer / Pickup Agent (Driver) mode toggle. */
export default function ModeHeader() {
  const insets = useSafeAreaInsets();
  const { mode, switchMode, switching, demoData, connectionMode, session, logout } = useApp();
  if (!session) return null;
  const statusLabel = demoData ? 'Demo data' : connectionMode === 'offline' ? 'Offline' : connectionMode === 'online' ? 'Live API' : 'Connecting';
  const dot = demoData ? 'bg-coin' : connectionMode === 'online' ? 'bg-gullak' : 'bg-slate-400';

  return (
    <View style={{ paddingTop: insets.top }} className="bg-trust px-4 pb-3">
      <View className="flex-row items-center justify-between py-2">
        <View className="flex-row items-center gap-2">
          <GullakMark />
          <Text className="text-lg font-extrabold text-white">
            Scrap<Text className="text-gullak">Gullak</Text>
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1" accessibilityLabel={`Connection: ${statusLabel}`}>
          <View className={`h-2 w-2 rounded-full ${dot}`} />
          <Text className="text-xs font-semibold text-slate-200">{statusLabel}</Text>
        </View>
      </View>

      {IS_PUBLIC_DEMO ? (
        <View className="flex-row rounded-xl bg-white/10 p-1" accessibilityRole="tablist">
          {MODES.map(({ id, label, Icon }) => {
            const active = mode === id;
            return (
              <Pressable
                key={id}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                disabled={switching}
                onPress={() => switchMode(id)}
                className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-lg py-2 ${active ? 'bg-gullak' : ''}`}
              >
                {switching && !active ? <ActivityIndicator size="small" color="#CBD5E1" /> : <Icon size={15} color={active ? '#FFFFFF' : '#CBD5E1'} />}
                <Text className={`text-[13px] font-bold ${active ? 'text-white' : 'text-slate-300'}`}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {session?.user ? (
        <View className="mt-2 flex-row items-center justify-between">
          <Text className="flex-1 text-xs text-slate-400">
            {session.role === 'ADMIN' ? 'Administrator' : session.role === 'AGENT' ? 'Pickup agent' : 'Customer'}: {session.user.fullName}{session.user.vehicle ? `, ${session.user.vehicle}` : ''}
          </Text>
          {!IS_PUBLIC_DEMO ? (
            <Pressable accessibilityRole="button" onPress={() => logout()} className="px-2 py-1">
              <Text className="text-xs font-bold text-white">Sign out</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
