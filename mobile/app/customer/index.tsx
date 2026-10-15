import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ArrowRight, ChevronRight, Scale, Smartphone, Truck } from 'lucide-react-native';
import { useApp } from '../../src/context/AppContext';
import { customerApi } from '../../src/services/api';
import type { Passbook, PickupOrder } from '../../src/types';
import BalanceCard from '../../src/components/BalanceCard';
import RateTicker from '../../src/components/RateTicker';
import SectorPicker from '../../src/components/SectorPicker';
import { Card, SectionTitle } from '../../src/components/Section';
import { STATUS_LABEL } from '../../src/utils/constants';
import { dayLabel } from '../../src/utils/format';

export default function CustomerHome() {
  const router = useRouter();
  const { session, ensureSession, rates, refreshRates, sector, setSector } = useApp();
  const [passbook, setPassbook] = useState<Passbook | null>(null);
  const [active, setActive] = useState<PickupOrder[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      await ensureSession();
      const [pb, list] = await Promise.all([customerApi.passbook(), customerApi.myPickups()]);
      setPassbook(pb);
      setActive(list.filter((p) => p.status !== 'PAID' && p.status !== 'CANCELLED'));
    } catch { /* screen keeps last data */ }
  }, [ensureSession]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([load(), refreshRates()]);
    setRefreshing(false);
  };

  return (
    <ScrollView className="flex-1 bg-paper" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}>
      <Text className="mb-3 text-[15px] text-slate-600">Namaste, {session?.user.fullName.split(' ')[0] ?? 'there'}</Text>

      <BalanceCard
        balance={passbook?.gullakTotalEarnings ?? 0}
        recycledKg={passbook?.totalRecycledKg ?? 0}
        co2Kg={passbook?.co2SavedKg ?? 0}
        sector={sector}
        onPressSector={() => setPickerOpen(true)}
      />

      <View className="mt-4">
        <RateTicker rates={rates} />
      </View>
      <Pressable onPress={() => router.push('/customer/rates')} accessibilityRole="button"
        className="mt-2 flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
        <Text className="text-[13px] font-bold text-trust">See all published scrap rates</Text>
        <ArrowRight size={16} color="#047857" />
      </Pressable>

      <Pressable onPress={() => router.push('/customer/book')} accessibilityRole="button"
        className="mt-4 overflow-hidden rounded-3xl bg-gullak p-5">
        <Text className="text-2xl font-extrabold leading-7 text-white">Empty your storeroom</Text>
        <Text className="mt-1 text-[14px] text-emerald-50">Free doorstep pickup in {sector}. Weighing in front of you and payment on the spot.</Text>
        <View className="mt-4 flex-row items-center self-start rounded-xl bg-white px-4 py-2.5">
          <Text className="font-extrabold text-gullak-dark">Book pickup</Text>
          <ChevronRight size={16} color="#047857" />
        </View>
      </Pressable>

      {active.length ? (
        <>
          <SectionTitle title="On the way" />
          {active.map((p) => (
            <Pressable key={p.id} onPress={() => router.push('/customer/track')} accessibilityRole="button" className="mb-2">
              <Card className="flex-row items-center">
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-gullak-soft"><Truck size={18} color="#047857" /></View>
                <View className="flex-1">
                  <Text className="font-bold text-trust">#{p.orderNumber}</Text>
                  <Text className="text-[13px] text-slate-500">{STATUS_LABEL[p.status]}, {dayLabel(p.scheduledDate)} {p.timeSlot}</Text>
                </View>
                <ChevronRight size={18} color="#94A3B8" />
              </Card>
            </Pressable>
          ))}
        </>
      ) : null}

      <SectionTitle title="Why ScrapGullak" />
      <View className="gap-2">
        {[
          { Icon: Scale, title: 'Certified digital scale', body: 'Every grade weighed at your door. No guesswork.' },
          { Icon: Smartphone, title: 'Paid on the spot', body: 'Get paid after weighing, with a digital receipt on your phone.' },
        ].map(({ Icon, title, body }) => (
          <Card key={title} className="flex-row items-center">
            <Icon size={22} color="#10B981" />
            <View className="ml-3 flex-1">
              <Text className="font-bold text-trust">{title}</Text>
              <Text className="text-[13px] text-slate-500">{body}</Text>
            </View>
          </Card>
        ))}
      </View>

      <SectorPicker visible={pickerOpen} value={sector} onSelect={setSector} onClose={() => setPickerOpen(false)} />
    </ScrollView>
  );
}
