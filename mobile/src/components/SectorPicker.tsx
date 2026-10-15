import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, X } from 'lucide-react-native';
import { NOIDA_SECTORS } from '../utils/constants';

export default function SectorPicker({ visible, value, onSelect, onClose }: { visible: boolean; value: string; onSelect: (s: string) => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose} accessibilityLabel="Close sector list" />
      <View className="max-h-[70%] rounded-t-3xl bg-white" style={{ paddingBottom: insets.bottom + 8 }}>
        <View className="flex-row items-center justify-between border-b border-slate-100 px-5 py-4">
          <Text className="text-lg font-extrabold text-trust">Choose your sector</Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close"><X size={22} color="#0F172A" /></Pressable>
        </View>
        <FlatList
          data={NOIDA_SECTORS}
          keyExtractor={(s) => s}
          renderItem={({ item }) => (
            <Pressable onPress={() => { onSelect(item); onClose(); }} accessibilityRole="button"
              className="flex-row items-center justify-between border-b border-slate-100 px-5 py-4">
              <Text className={`text-[15px] ${item === value ? 'font-extrabold text-gullak-dark' : 'text-trust'}`}>{item}</Text>
              {item === value ? <Check size={18} color="#10B981" /> : null}
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}
