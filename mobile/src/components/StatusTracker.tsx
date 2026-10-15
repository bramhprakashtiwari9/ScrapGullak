import { Linking, Pressable, Text, View } from 'react-native';
import { Check, Phone } from 'lucide-react-native';
import type { PickupOrder } from '../types';
import { dayLabel, inr } from '../utils/format';

const STEPS = [
  { title: 'Booking confirmed', body: 'We have your request and slot.' },
  { title: 'Agent assigned', body: 'A verified agent is on your route.' },
  { title: 'Digital weighing at doorstep', body: 'Each grade weighed on a certified scale.' },
  { title: 'Instant UPI paid', body: 'Money credited and slip in your passbook.' },
];
const STEP_INDEX: Record<string, number> = { BOOKED: 0, AGENT_ASSIGNED: 1, OUT_FOR_PICKUP: 1, WEIGHED: 2, PAID: 3 };

export default function StatusTracker({ order }: { order: PickupOrder }) {
  const current = STEP_INDEX[order.status] ?? 0;
  const complete = order.status === 'PAID';
  return (
    <View className="rounded-2xl border border-slate-200 bg-white p-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-xs font-semibold text-slate-500">#{order.orderNumber}</Text>
          <Text className="text-base font-extrabold text-trust">{dayLabel(order.scheduledDate)}, {order.timeSlot}</Text>
          <Text className="text-[13px] text-slate-500" numberOfLines={1}>{order.fullAddress}, {order.noidaSector}</Text>
        </View>
        {order.assignedAgent && !complete ? (
          <Pressable onPress={() => Linking.openURL(`tel:${order.assignedAgent!.phone}`)} accessibilityRole="button"
            accessibilityLabel={`Call ${order.assignedAgent.fullName}`} className="flex-row items-center gap-1 rounded-full border border-slate-300 px-3 py-1.5">
            <Phone size={13} color="#0F172A" />
            <Text className="text-xs font-bold text-trust">Call</Text>
          </Pressable>
        ) : null}
      </View>

      <View className="mt-4">
        {STEPS.map((s, i) => {
          const done = i < current || complete;
          const active = i === current && !complete;
          const last = i === STEPS.length - 1;
          let body = s.body;
          if (i === 1 && order.assignedAgent) body = order.status === 'OUT_FOR_PICKUP' ? `${order.assignedAgent.fullName} is on the way.` : `${order.assignedAgent.fullName} will come in your slot.`;
          if (i === 3 && complete && order.finalPayoutInr != null) body = `${inr(order.finalPayoutInr)} credited${order.upiTransactionRef ? `, UTR ${order.upiTransactionRef}` : ''}.`;
          return (
            <View key={s.title} className="flex-row" accessibilityLabel={`${s.title}: ${done ? 'done' : active ? 'in progress' : 'pending'}`}>
              <View className="mr-3 items-center">
                <View className={`h-7 w-7 items-center justify-center rounded-full border-2 ${done ? 'border-gullak bg-gullak' : active ? 'border-gullak bg-white' : 'border-slate-200 bg-white'}`}>
                  {done ? <Check size={14} color="#FFFFFF" /> : <View className={`h-2 w-2 rounded-full ${active ? 'bg-gullak' : 'bg-slate-300'}`} />}
                </View>
                {!last ? <View className={`w-0.5 flex-1 ${done ? 'bg-gullak' : 'bg-slate-200'}`} style={{ minHeight: 22 }} /> : null}
              </View>
              <View className={`flex-1 ${last ? '' : 'pb-4'}`}>
                <Text className={`text-[14px] font-bold ${done || active ? 'text-trust' : 'text-slate-400'}`}>{s.title}</Text>
                <Text className={`text-[13px] ${done || active ? 'text-slate-600' : 'text-slate-400'}`}>{body}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
