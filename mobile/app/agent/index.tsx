import { useCallback, useMemo, useState } from 'react';
import { Image, Linking, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Building2, Clock, MapPin, Navigation, Phone, Scale } from 'lucide-react-native';
import { useApp } from '../../src/context/AppContext';
import { agentApi } from '../../src/services/api';
import type { PickupOrder } from '../../src/types';
import Button from '../../src/components/Button';
import { EmptyState } from '../../src/components/Section';
import { GROUP_LABEL, STATUS_LABEL } from '../../src/utils/constants';
import { dayLabel } from '../../src/utils/format';

function mapsUrl(p: PickupOrder) {
  const dest = p.gpsLat != null && p.gpsLng != null ? `${p.gpsLat},${p.gpsLng}` : `${p.fullAddress}, ${p.noidaSector}, Noida`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=driving`;
}

function PickupCard({ p, onWeigh }: { p: PickupOrder; onWeigh: () => void }) {
  const b2b = p.orderType === 'INDUSTRIAL_B2B';
  return (
    <View className="mb-3 rounded-2xl border border-slate-200 bg-white p-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-xs font-semibold text-slate-400">#{p.orderNumber}</Text>
          <Text className="text-[16px] font-extrabold text-trust">{p.customer.fullName}</Text>
        </View>
        <View className={`flex-row items-center gap-1 rounded-full px-2 py-1 ${b2b ? 'bg-trust' : 'bg-gullak-soft'}`}>
          {b2b ? <Building2 size={11} color="#FFFFFF" /> : null}
          <Text className={`text-[11px] font-bold ${b2b ? 'text-white' : 'text-gullak-dark'}`}>{b2b ? 'B2B lift' : 'Doorstep'}</Text>
        </View>
      </View>

      <View className="mt-2 flex-row items-start gap-1.5">
        <MapPin size={14} color="#94A3B8" />
        <Text className="flex-1 text-[14px] text-slate-600">{p.fullAddress}</Text>
      </View>
      <View className="mt-1 flex-row items-center gap-1.5">
        <Clock size={14} color="#94A3B8" />
        <Text className="text-[14px] text-slate-600">{dayLabel(p.scheduledDate)}, {p.timeSlot} · est. {p.estimatedWeightRange}</Text>
      </View>
      <View className="mt-2 flex-row flex-wrap gap-1">
        <View className={`rounded-full px-2 py-0.5 ${p.status === 'OUT_FOR_PICKUP' ? 'bg-amber-100' : 'bg-sky-100'}`}>
          <Text className="text-[11px] font-bold text-trust">{STATUS_LABEL[p.status]}</Text>
        </View>
        {(p.scrapGroups ?? []).map((g) => (
          <View key={g} className="rounded-full bg-slate-100 px-2 py-0.5"><Text className="text-[11px] text-slate-600">{GROUP_LABEL[g] ?? g}</Text></View>
        ))}
      </View>
      {p.photoUrl ? <Image source={{ uri: p.photoUrl }} className="mt-3 h-28 w-full rounded-xl" resizeMode="cover" accessibilityLabel="Customer's scrap photo" /> : null}

      <View className="mt-3 flex-row gap-2">
        <Button className="flex-1" small variant="outline" icon={Phone} title="Call customer" onPress={() => Linking.openURL(`tel:${p.customer.phone}`)} />
        <Button className="flex-1" small variant="dark" icon={Navigation} title="Navigate" onPress={() => Linking.openURL(mapsUrl(p))} />
      </View>
      <Button className="mt-2" icon={Scale} title="Start digital weighing" onPress={onWeigh} />
    </View>
  );
}

/** Today's sector route: assigned pickups grouped by Noida sector. */
export default function AgentRoute() {
  const router = useRouter();
  const { session, ensureSession } = useApp();
  const [pickups, setPickups] = useState<PickupOrder[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      await ensureSession();
      setPickups(await agentApi.assigned());
    } catch { /* keep last */ } finally { setLoaded(true); }
  }, [ensureSession]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const bySector = useMemo(() => {
    const groups: Record<string, PickupOrder[]> = {};
    pickups.forEach((p) => { (groups[p.noidaSector] ??= []).push(p); });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0], 'en', { numeric: true }));
  }, [pickups]);

  return (
    <ScrollView className="flex-1 bg-paper" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor="#10B981" />}>
      <Text className="text-2xl font-extrabold text-trust">Today’s sector route</Text>
      <Text className="text-[14px] text-slate-500">
        {pickups.length} pickup{pickups.length === 1 ? '' : 's'} across {bySector.length} sector{bySector.length === 1 ? '' : 's'}
        {session?.user.vehicle ? `, ${session.user.vehicle}` : ''}
      </Text>

      {bySector.map(([sector, list]) => (
        <View key={sector} className="mt-5">
          <View className="mb-2 flex-row items-center gap-2">
            <View className="h-6 w-6 items-center justify-center rounded-full bg-trust"><Text className="text-[11px] font-bold text-white">{list.length}</Text></View>
            <Text className="text-[16px] font-extrabold text-trust">{sector}</Text>
          </View>
          {list.map((p) => <PickupCard key={p.id} p={p} onWeigh={() => router.push(`/agent/weigh/${p.id}`)} />)}
        </View>
      ))}

      {loaded && !pickups.length ? (
        <View className="mt-6">
          <EmptyState title="Route clear for today" body="New assignments from the Phase-2 dispatch desk appear here. Pull down to refresh." />
        </View>
      ) : null}
    </ScrollView>
  );
}
