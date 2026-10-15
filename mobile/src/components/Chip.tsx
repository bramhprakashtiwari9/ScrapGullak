import { Pressable, Text } from 'react-native';

export default function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      className={`mr-2 mb-2 rounded-full border px-3.5 py-2 ${selected ? 'border-gullak bg-gullak-soft' : 'border-slate-300 bg-white'}`}
    >
      <Text className={`text-[13px] font-semibold ${selected ? 'text-gullak-dark' : 'text-slate-700'}`}>{label}</Text>
    </Pressable>
  );
}
