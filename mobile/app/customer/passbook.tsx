import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ChevronDown, ChevronUp, Leaf } from 'lucide-react-native';
import { useApp } from '../../src/context/AppContext';
import { customerApi } from '../../src/services/api';
import type { Passbook, PickupOrder } from '../../src/types';
import WeightSlip from '../../src/components/WeightSlip';
import { EmptyState, SectionTitle } from '../../src/components/Section';
import { PAYMENT_LABEL } from '../../src/utils/constants';
import { fmtDate, inr, kg } from '../../src/utils/format';

export default function PassbookScreen() {
  const { ensureSession } = useApp();
  const [passbook, setPassbook] = useState<Passbook | null>(null);
  const [orders, setOrders] = useState<Record<string, PickupOrder>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      await ensureSession();
      const [pb, list] = await Promise.all([customerApi.passbook(), customerApi.myPickups()]);
      setPassbook(pb);
      setOrders(Object.fromEntries(list.map((o) => [o.orderNumber, o])));
    } catch { /* keep last */ }
  }, [ensureSession]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const upiTotal = passbook?.transactions.filter((t) => t.paymentMode === 'UPI').reduce((s, t) => s + t.amountInr, 0) ?? 0;

  return (
    <ScrollView className="flex-1 bg-paper" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor="#10B981" />}>
      <Text className="text-2xl font-extrabold text-trust">Gullak passbook</Text>

      <View className="mt-4 rounded-3xl bg-trust p-5">
        <Text className="text-sm text-slate-300">Total lifetime earnings</Text>
        <Text className="text-4xl font-extrabold text-coin">{inr(passbook?.gullakTotalEarnings ?? 0)}</Text>
        <Text className="mt-1 text-[13px] text-slate-300">{inr(upiTotal)} credited via UPI</Text>
        <View className="mt-4 flex-row gap-3">
          <View className="flex-1 rounded-2xl bg-white/10 px-3 py-2">
            <Text className="text-xs text-slate-400">Recycled</Text>
            <Text className="text-base font-extrabold text-white">{kg(passbook?.totalRecycledKg ?? 0)}</Text>
          </View>
          <View className="flex-1 rounded-2xl bg-white/10 px-3 py-2">
            <View className="flex-row items-center gap-1"><Leaf size={12} color="#10B981" /><Text className="text-xs text-slate-400">CO₂ avoided</Text></View>
            <Text className="text-base font-extrabold text-white">{kg(passbook?.co2SavedKg ?? 0)}</Text>
          </View>
          <View className="flex-1 rounded-2xl bg-white/10 px-3 py-2">
            <Text className="text-xs text-slate-400">Pickups</Text>
            <Text className="text-base font-extrabold text-white">{passbook?.totalPickups ?? 0}</Text>
          </View>
        </View>
      </View>

      <SectionTitle title="Digital weight slips" />
      {passbook?.transactions.length ? passbook.transactions.map((t) => {
        const expanded = open === t.orderNumber;
        const order = orders[t.orderNumber];
        return (
          <View key={t.orderNumber} className="mb-2">
            <Pressable onPress={() => setOpen(expanded ? null : t.orderNumber)} accessibilityRole="button" accessibilityState={{ expanded }}
              className="flex-row items-center rounded-2xl border border-slate-200 bg-white p-4">
              <View className="flex-1">
                <Text className="font-bold text-trust">#{t.orderNumber}</Text>
                <Text className="text-[13px] text-slate-500">{fmtDate(t.date)}, {kg(t.weightKg)}, {PAYMENT_LABEL[t.paymentMode] ?? t.paymentMode}</Text>
              </View>
              <Text className="mr-2 text-[15px] font-extrabold text-gullak-dark">+{inr(t.amountInr, 2)}</Text>
              {expanded ? <ChevronUp size={18} color="#64748B" /> : <ChevronDown size={18} color="#64748B" />}
            </Pressable>
            {expanded && order ? <View className="mt-2"><WeightSlip order={order} /></View> : null}
          </View>
        );
      }) : <EmptyState title="No slips yet" body="Your first digital weight slip appears here after an agent weighs and pays for your scrap." />}
    </ScrollView>
  );
}
