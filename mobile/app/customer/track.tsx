import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useApp } from '../../src/context/AppContext';
import { customerApi } from '../../src/services/api';
import type { PickupOrder } from '../../src/types';
import StatusTracker from '../../src/components/StatusTracker';
import Button from '../../src/components/Button';
import { EmptyState, SectionTitle } from '../../src/components/Section';

const POLL_MS = 10000;

/** Live pickup status. Polls while the tab is focused. */
export default function TrackScreen() {
  const router = useRouter();
  const { ensureSession } = useApp();
  const [orders, setOrders] = useState<PickupOrder[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      await ensureSession();
      setOrders(await customerApi.myPickups());
    } catch { /* keep last */ } finally { setLoaded(true); }
  }, [ensureSession]);

  useFocusEffect(useCallback(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]));

  const active = orders.filter((o) => o.status !== 'PAID' && o.status !== 'CANCELLED');
  const recent = orders.filter((o) => o.status === 'PAID').slice(0, 1);

  return (
    <ScrollView className="flex-1 bg-paper" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor="#10B981" />}>
      <Text className="text-2xl font-extrabold text-trust">Live pickup status</Text>
      <Text className="text-[13px] text-slate-500">Updates automatically every few seconds.</Text>

      <View className="mt-4 gap-3">
        {active.map((o) => <StatusTracker key={o.id} order={o} />)}
        {loaded && !active.length ? (
          <EmptyState title="No pickup on the way" body="Book one and follow it here, from agent assignment to payment."
            action={<Button title="Book a pickup" onPress={() => router.push('/customer/book')} />} />
        ) : null}
      </View>

      {recent.length ? (
        <>
          <SectionTitle title="Last completed" />
          {recent.map((o) => <StatusTracker key={o.id} order={o} />)}
        </>
      ) : null}
    </ScrollView>
  );
}
