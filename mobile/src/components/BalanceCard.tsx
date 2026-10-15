import { Pressable, Text, View } from 'react-native';
import { ChevronDown, Leaf, MapPin, PiggyBank } from 'lucide-react-native';
import { inr, kg } from '../utils/format';

interface Props {
  balance: number;
  recycledKg: number;
  co2Kg: number;
  sector: string;
  onPressSector: () => void;
}

/** "My ScrapGullak Balance": lifetime ₹ earned from selling scrap. */
export default function BalanceCard({ balance, recycledKg, co2Kg, sector, onPressSector }: Props) {
  return (
    <View className="overflow-hidden rounded-3xl bg-coin p-5">
      <View className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-300" />
      <View className="flex-row items-center justify-between">
        <Pressable onPress={onPressSector} accessibilityRole="button" accessibilityLabel={`Sector ${sector}. Change sector`}
          className="flex-row items-center gap-1 rounded-full bg-trust/10 px-3 py-1.5">
          <MapPin size={14} color="#0F172A" />
          <Text className="text-[13px] font-bold text-trust">{sector}</Text>
          <ChevronDown size={14} color="#0F172A" />
        </Pressable>
        <PiggyBank size={28} color="#0F172A" />
      </View>
      <Text className="mt-5 text-sm font-semibold text-amber-900">My ScrapGullak balance</Text>
      <Text className="text-4xl font-extrabold text-trust" accessibilityLabel={`Balance ${inr(balance)}`}>{inr(balance)}</Text>
      <Text className="text-xs text-amber-900">Total earned from selling scrap. Payment details are on each receipt.</Text>
      <View className="mt-4 flex-row gap-3">
        <View className="flex-1 rounded-2xl bg-white/60 px-3 py-2">
          <Text className="text-xs text-amber-900">Recycled</Text>
          <Text className="text-base font-extrabold text-trust">{kg(recycledKg)}</Text>
        </View>
        <View className="flex-1 rounded-2xl bg-white/60 px-3 py-2">
          <View className="flex-row items-center gap-1"><Leaf size={12} color="#047857" /><Text className="text-xs text-amber-900">CO₂ avoided</Text></View>
          <Text className="text-base font-extrabold text-trust">{kg(co2Kg)}</Text>
        </View>
      </View>
    </View>
  );
}
