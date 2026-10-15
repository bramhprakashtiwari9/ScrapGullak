import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowRight, CheckCircle2, Scale } from 'lucide-react-native';
import { useApp } from '../../src/context/AppContext';
import CategoryIcon from '../../src/components/CategoryIcon';
import { Card, SectionTitle } from '../../src/components/Section';
import { GROUP_TONE } from '../../src/utils/constants';
import { fmtDate, rate, shortName } from '../../src/utils/format';

const GROUPS: { id: string; label: string }[] = [
  { id: 'PAPER', label: 'Paper & cardboard' },
  { id: 'FERROUS', label: 'Iron & steel' },
  { id: 'NON_FERROUS', label: 'Copper, brass & aluminium' },
  { id: 'PLASTIC', label: 'Plastic' },
  { id: 'E_WASTE', label: 'E-waste' },
  { id: 'MIXED', label: 'Mixed scrap' },
];

export default function RatesScreen() {
  const router = useRouter();
  const { rates, refreshRates } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const activeRates = useMemo(
    () => rates.filter((item) => item.isActive !== false).sort((a, b) => a.name.localeCompare(b.name)),
    [rates],
  );
  const latestUpdatedAt = activeRates.reduce(
    (latest, item) => item.updatedAt && item.updatedAt > latest ? item.updatedAt : latest,
    '',
  );

  return (
    <ScrollView className="flex-1 bg-paper" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => {
        setRefreshing(true);
        try {
          await refreshRates();
        } finally {
          setRefreshing(false);
        }
      }} tintColor="#10B981" />}>
      <Text className="text-2xl font-extrabold text-trust">Today’s scrap rates</Text>
      <Text className="mt-1 text-[14px] text-slate-500">Current ScrapGullak buying rates for Noida and Greater Noida.</Text>
      {latestUpdatedAt ? <Text className="mt-1 text-xs text-slate-400">Updated {fmtDate(latestUpdatedAt)}</Text> : null}

      <Card className="mt-4 flex-row items-start">
        <View className="mr-3 mt-0.5 h-10 w-10 items-center justify-center rounded-xl bg-gullak-soft">
          <Scale size={20} color="#047857" />
        </View>
        <View className="flex-1">
          <Text className="font-bold text-trust">Know the rate before you book</Text>
          <Text className="mt-1 text-[13px] leading-5 text-slate-500">
            Each grade is weighed separately at your door. Your final payout uses the actual weight and the rate shown here.
          </Text>
        </View>
      </Card>

      {!activeRates.length ? (
        <Card className="mt-4 items-center py-8">
          <Text className="text-center font-bold text-trust">Rates are unavailable</Text>
          <Text className="mt-1 text-center text-sm text-slate-500">Pull down to refresh the latest rates.</Text>
        </Card>
      ) : (
        GROUPS.map(({ id, label }) => {
          const items = activeRates.filter((item) => id === 'MIXED'
            ? /mixed/i.test(item.name)
            : item.categoryGroup === id && !(id === 'FERROUS' && /mixed/i.test(item.name)));
          if (!items.length) return null;
          return (
            <View key={id}>
              <SectionTitle title={label} />
              <Card className="p-0">
                {items.map((item, index) => (
                  <View key={item.id} className={`flex-row items-center px-4 py-3 ${index ? 'border-t border-slate-100' : ''}`}>
                    <View className={`mr-3 h-10 w-10 items-center justify-center rounded-xl ${GROUP_TONE[id] ?? 'bg-slate-100'}`}>
                      <CategoryIcon iconName={item.iconName} group={id} size={19} />
                    </View>
                    <Text className="flex-1 pr-2 text-[14px] font-semibold text-trust">{shortName(item.name)}</Text>
                    <Text className="text-[14px] font-extrabold text-gullak-dark">{rate(item.buyingRateInr, item.unit)}</Text>
                  </View>
                ))}
              </Card>
            </View>
          );
        })
      )}

      <View className="mt-5 flex-row items-center gap-2 rounded-xl bg-gullak-soft px-3 py-3">
        <CheckCircle2 size={17} color="#047857" />
        <Text className="flex-1 text-[12px] leading-4 text-gullak-dark">No household minimum. Free doorstep pickup and payment after weighing.</Text>
      </View>
      <Pressable onPress={() => router.push('/customer/book')} accessibilityRole="button"
        className="mt-4 flex-row items-center justify-center gap-2 rounded-xl bg-gullak px-4 py-3.5">
        <Text className="font-extrabold text-white">Book a free pickup</Text>
        <ArrowRight size={17} color="#FFFFFF" />
      </Pressable>
    </ScrollView>
  );
}
