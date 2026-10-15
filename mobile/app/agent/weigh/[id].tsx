import { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Banknote, ChevronLeft, CreditCard, Landmark, Receipt, Trash2 } from 'lucide-react-native';
import { useApp } from '../../../src/context/AppContext';
import { agentApi } from '../../../src/services/api';
import type { PaymentMode, PickupOrder, ScrapCategory } from '../../../src/types';
import Button from '../../../src/components/Button';
import CategoryIcon from '../../../src/components/CategoryIcon';
import WeightSlip from '../../../src/components/WeightSlip';
import { Alert } from '../../../src/utils/alert';
import { GROUP_TONE } from '../../../src/utils/constants';
import { inr, kg, rate, round2, shortName } from '../../../src/utils/format';

interface Line { key: string; categoryId: number; weight: string }

const PAY_MODES: { id: PaymentMode; label: string; Icon: typeof Banknote }[] = [
  { id: 'UPI', label: 'UPI', Icon: CreditCard },
  { id: 'CASH', label: 'Cash', Icon: Banknote },
  { id: 'BANK_TRANSFER', label: 'Bank', Icon: Landmark },
];

const parseKg = (s: string) => Number(s.replace(',', '.')) || 0;
const groupOf = (c: ScrapCategory) => (/mixed/i.test(c.name) ? 'MIXED' : c.categoryGroup);

/** On-site digital weighing & instant billing terminal. */
export default function WeighScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { rates, ensureSession } = useApp();
  const [order, setOrder] = useState<PickupOrder | null>(null);
  const [loadError, setLoadError] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [payMode, setPayMode] = useState<PaymentMode>('UPI');
  const [utr, setUtr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<PickupOrder | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await ensureSession();
        const list = await agentApi.assigned();
        const found = list.find((p) => String(p.id) === String(id));
        if (found) setOrder(found); else setLoadError('This pickup is no longer on your route. It may already be paid.');
      } catch (e) { setLoadError((e as Error).message); }
    })();
  }, [id, ensureSession]);

  const byId = useMemo(() => Object.fromEntries(rates.map((r) => [r.id, r])) as Record<number, ScrapCategory>, [rates]);

  const addGrade = (c: ScrapCategory) => {
    if (lines.some((l) => l.categoryId === c.id)) return;
    setLines((ls) => [...ls, { key: `${c.id}-${Date.now()}`, categoryId: c.id, weight: '' }]);
  };
  const setWeight = (key: string, weight: string) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, weight: weight.replace(/[^0-9.,]/g, '') } : l)));
  const remove = (key: string) => setLines((ls) => ls.filter((l) => l.key !== key));

  const valid = lines.filter((l) => parseKg(l.weight) > 0 && byId[l.categoryId]);
  const totalKg = round2(valid.reduce((s, l) => s + parseKg(l.weight), 0));
  const totalInr = round2(valid.reduce((s, l) => s + parseKg(l.weight) * byId[l.categoryId].buyingRateInr, 0));

  const submit = useCallback(async () => {
    if (!order) return;
    setSubmitting(true);
    try {
      const paid = await agentApi.completeWeighing(order.id, {
        items: valid.map((l) => ({ categoryId: l.categoryId, netWeightKg: round2(parseKg(l.weight)) })),
        paymentMode: payMode,
        upiTransactionRef: payMode === 'UPI' ? utr.trim() : null,
      });
      setReceipt(paid);
    } catch (e) {
      Alert.alert('Could not mark paid', (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [order, valid, payMode, utr]);

  const confirm = () => {
    if (!valid.length) return Alert.alert('Nothing weighed yet', 'Tap a scrap grade and enter its weight from the digital scale.');
    if (lines.length !== valid.length) return Alert.alert('Missing weights', 'Enter a weight for every grade, or remove the empty ones.');
    if (payMode === 'UPI' && !/^\d{12}$/.test(utr.trim())) return Alert.alert('UTR needed', 'Enter the 12-digit UPI reference (UTR) from your payment app.');
    return Alert.alert('Confirm payout', `Pay ${inr(totalInr, 2)} for ${kg(totalKg)} to ${order?.customer.fullName} by ${PAY_MODES.find((m) => m.id === payMode)?.label}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark paid', onPress: submit },
    ]);
  };

  const Header = (
    <View className="flex-row items-center px-4 pb-2 pt-3">
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back to route" className="mr-2 h-9 w-9 items-center justify-center rounded-full bg-white">
        <ChevronLeft size={20} color="#0F172A" />
      </Pressable>
      <View className="flex-1">
        <Text className="text-lg font-extrabold text-trust">{receipt ? 'Paid, receipt generated' : 'Digital weighing'}</Text>
        {order ? <Text className="text-[13px] text-slate-500" numberOfLines={1}>#{order.orderNumber}, {order.customer.fullName}, {order.noidaSector}</Text> : null}
      </View>
    </View>
  );

  if (receipt) {
    return (
      <View className="flex-1 bg-paper">
        {Header}
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
          <View className="mb-3 rounded-2xl bg-gullak-soft p-4">
            <Text className="text-[15px] font-bold text-gullak-dark">{inr(receipt.finalPayoutInr, 2)} credited to {receipt.customer.fullName}’s Gullak passbook.</Text>
            <Text className="mt-1 text-[13px] text-gullak-dark">{kg(receipt.finalTotalWeightKg)} added to yard raw inventory.</Text>
          </View>
          <WeightSlip order={receipt} />
          <Button className="mt-4" title="Back to today’s route" variant="dark" onPress={() => router.replace('/agent')} />
        </ScrollView>
      </View>
    );
  }

  if (!order) {
    return (
      <View className="flex-1 bg-paper">
        {Header}
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-[15px] text-slate-600">{loadError || 'Loading pickup…'}</Text>
          {loadError ? <Button className="mt-4" title="Back to route" variant="outline" onPress={() => router.back()} /> : null}
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-paper" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {Header}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <Text className="mb-2 text-[15px] font-extrabold text-trust">Tap each grade on the scale</Text>
        <View className="flex-row flex-wrap justify-between">
          {rates.map((c) => {
            const added = lines.some((l) => l.categoryId === c.id);
            const g = groupOf(c);
            return (
              <Pressable key={c.id} onPress={() => addGrade(c)} accessibilityRole="button" accessibilityState={{ selected: added }}
                className={`mb-2 w-[32%] rounded-xl border-2 bg-white p-2 ${added ? 'border-gullak' : 'border-slate-200'}`}>
                <View className={`h-8 w-8 items-center justify-center rounded-lg ${added ? 'bg-gullak' : GROUP_TONE[g]}`}>
                  <CategoryIcon iconName={c.iconName} group={g} size={16} color={added ? '#FFFFFF' : '#0F172A'} />
                </View>
                <Text className="mt-1 text-[11px] font-bold leading-[14px] text-trust" numberOfLines={2}>{shortName(c.name)}</Text>
                <Text className="text-[11px] font-semibold text-coin-dark">{rate(c.buyingRateInr, c.unit)}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text className="mb-2 mt-4 text-[15px] font-extrabold text-trust">Weighed items</Text>
        {lines.length ? lines.map((l) => {
          const c = byId[l.categoryId];
          const sub = parseKg(l.weight) * (c?.buyingRateInr ?? 0);
          return (
            <View key={l.key} className="mb-2 flex-row items-center rounded-2xl border border-slate-200 bg-white p-3">
              <View className="flex-1 pr-2">
                <Text className="text-[14px] font-bold text-trust" numberOfLines={1}>{c?.name}</Text>
                <Text className="text-xs text-slate-500">@ {c ? rate(c.buyingRateInr, c.unit) : '—'}{sub ? `  =  ${inr(sub, 2)}` : ''}</Text>
              </View>
              <View className="flex-row items-center rounded-xl border border-slate-300 bg-paper px-2">
                <TextInput
                  value={l.weight}
                  onChangeText={(t) => setWeight(l.key, t)}
                  keyboardType="decimal-pad"
                  placeholder="0.0"
                  placeholderTextColor="#94A3B8"
                  className="w-16 py-2 text-right text-[17px] font-extrabold text-trust"
                  accessibilityLabel={`Net weight in kg for ${c?.name}`}
                />
                <Text className="ml-1 text-xs text-slate-500">kg</Text>
              </View>
              <Pressable onPress={() => remove(l.key)} accessibilityRole="button" accessibilityLabel={`Remove ${c?.name}`} className="ml-2 p-1.5">
                <Trash2 size={18} color="#94A3B8" />
              </Pressable>
            </View>
          );
        }) : (
          <View className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6">
            <Text className="text-center text-[14px] text-slate-500">Segregate the pile, weigh each grade on the digital scale, then tap it above.</Text>
          </View>
        )}

        <Text className="mb-2 mt-4 text-[15px] font-extrabold text-trust">Payment</Text>
        <View className="flex-row gap-2">
          {PAY_MODES.map(({ id: m, label, Icon }) => {
            const on = payMode === m;
            return (
              <Pressable key={m} onPress={() => setPayMode(m)} accessibilityRole="radio" accessibilityState={{ checked: on }}
                className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border-2 py-3 ${on ? 'border-gullak bg-gullak-soft' : 'border-slate-200 bg-white'}`}>
                <Icon size={16} color={on ? '#047857' : '#64748B'} />
                <Text className={`text-[13px] font-bold ${on ? 'text-gullak-dark' : 'text-slate-600'}`}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
        {payMode === 'UPI' ? (
          <View className="mt-2 flex-row items-center gap-2">
            <TextInput
              value={utr}
              onChangeText={(t) => setUtr(t.replace(/\D/g, '').slice(0, 12))}
              keyboardType="number-pad"
              placeholder="12-digit UPI reference (UTR)"
              placeholderTextColor="#94A3B8"
              className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-3 text-[15px] text-trust"
              accessibilityLabel="UPI transaction reference"
            />
            <Button small variant="outline" title="Demo UTR" onPress={() => setUtr(String(Date.now()).slice(-12).padStart(12, '4'))} />
          </View>
        ) : null}
      </ScrollView>

      <View className="border-t border-slate-200 bg-white px-4 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
        <View className="mb-3 flex-row items-end justify-between">
          <View>
            <Text className="text-xs text-slate-500">{valid.length} grade{valid.length === 1 ? '' : 's'}, {kg(totalKg)}</Text>
            <Text className="text-xs text-slate-500">Grand payout</Text>
          </View>
          <Text className="text-3xl font-extrabold text-trust" accessibilityLiveRegion="polite">{inr(totalInr, 2)}</Text>
        </View>
        <Button icon={Receipt} title={`Generate digital receipt & mark paid (${PAY_MODES.find((m) => m.id === payMode)?.label})`} loading={submitting} onPress={confirm} />
      </View>
    </KeyboardAvoidingView>
  );
}
