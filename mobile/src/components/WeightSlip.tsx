import { Share, Text, View } from 'react-native';
import { Scale, Share2 } from 'lucide-react-native';
import type { PickupOrder } from '../types';
import { fmtDate, fmtTime, inr, kg } from '../utils/format';
import { PAYMENT_LABEL } from '../utils/constants';
import Button from './Button';

export function slipText(o: PickupOrder): string {
  const lines = o.items.map((i) => `${i.scrapCategory.name}: ${kg(i.netWeightKg)} x ${inr(i.appliedBuyingRateInr)} = ${inr(i.subTotalInr, 2)}`);
  return [
    `ScrapGullak digital weight slip #${o.orderNumber}`,
    `${fmtDate(o.paidAt ?? o.createdAt)} ${fmtTime(o.paidAt)}`,
    `${o.customer.fullName}, ${o.noidaSector}`,
    '',
    ...lines,
    '',
    `Total: ${kg(o.finalTotalWeightKg)}  |  Paid: ${inr(o.finalPayoutInr, 2)} via ${o.paymentMode ? PAYMENT_LABEL[o.paymentMode] : '—'}`,
    o.upiTransactionRef ? `UTR: ${o.upiTransactionRef}` : '',
    `Weighed by ${o.assignedAgent?.fullName ?? 'ScrapGullak agent'} on a certified digital scale.`,
  ].filter((l) => l !== null).join('\n');
}

/** Digital weight receipt: itemised grades, rate, subtotal, payout. */
export default function WeightSlip({ order, shareable = true }: { order: PickupOrder; shareable?: boolean }) {
  return (
    <View className="rounded-2xl border border-slate-200 bg-white">
      <View className="flex-row items-start justify-between border-b-2 border-gullak px-4 pb-3 pt-4">
        <View>
          <Text className="text-base font-extrabold text-trust">#{order.orderNumber}</Text>
          <Text className="text-xs text-slate-500">{fmtDate(order.paidAt ?? order.createdAt)} {fmtTime(order.paidAt)}</Text>
        </View>
        <View className="flex-row items-center gap-1 rounded-full bg-gullak-soft px-2 py-1">
          <Scale size={12} color="#047857" />
          <Text className="text-[11px] font-bold text-gullak-dark">Digital scale</Text>
        </View>
      </View>
      <View className="px-4 py-2">
        {order.items.map((i) => (
          <View key={`${i.scrapCategory.id}-${i.id ?? ''}`} className="flex-row items-center border-b border-slate-100 py-2">
            <View className="flex-1 pr-2">
              <Text className="text-[14px] font-semibold text-trust">{i.scrapCategory.name}</Text>
              <Text className="text-xs text-slate-500">{kg(i.netWeightKg)} @ {inr(i.appliedBuyingRateInr)}/kg</Text>
            </View>
            <Text className="text-[14px] font-bold text-trust">{inr(i.subTotalInr, 2)}</Text>
          </View>
        ))}
        <View className="flex-row items-end justify-between py-3">
          <View>
            <Text className="text-xs text-slate-500">Total {kg(order.finalTotalWeightKg)}</Text>
            <Text className="text-xs text-slate-500">
              {order.paymentMode ? PAYMENT_LABEL[order.paymentMode] : ''}{order.upiTransactionRef ? `, UTR ${order.upiTransactionRef}` : ''}
            </Text>
          </View>
          <Text className="text-2xl font-extrabold text-gullak-dark">{inr(order.finalPayoutInr, 2)}</Text>
        </View>
      </View>
      {shareable ? (
        <View className="px-4 pb-4">
          <Button small variant="outline" icon={Share2} title="Share receipt" onPress={() => Share.share({ message: slipText(order) })} />
        </View>
      ) : null}
    </View>
  );
}
