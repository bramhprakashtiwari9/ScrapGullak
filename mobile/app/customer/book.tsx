import { useMemo, useState } from 'react';
import { Image, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, ArrowRight, Building2, Camera, CheckCircle2, Home, ImagePlus, MessageCircle, Truck, X } from 'lucide-react-native';
import { useApp } from '../../src/context/AppContext';
import { customerApi } from '../../src/services/api';
import type { OrderType, PickupOrder } from '../../src/types';
import Button from '../../src/components/Button';
import Chip from '../../src/components/Chip';
import CategoryIcon from '../../src/components/CategoryIcon';
import { Card } from '../../src/components/Section';
import { Alert } from '../../src/utils/alert';
import { CART_TILES, NOIDA_SECTORS, SECTOR_COORDS, TIME_SLOTS, WEIGHT_RANGES } from '../../src/utils/constants';
import { addDays, dayLabel, localISO, rate } from '../../src/utils/format';

function Label({ children }: { children: string }) {
  return <Text className="mb-2 mt-5 text-[15px] font-extrabold text-trust">{children}</Text>;
}

/** Visual scrap cart: tiles, weight range, camera photo, sector, day and slot. */
export default function BookScreen() {
  const router = useRouter();
  const { rates, sector: homeSector, session, ensureSession } = useApp();
  const [orderType, setOrderType] = useState<OrderType>('DOORSTEP_B2C');
  const [selected, setSelected] = useState<string[]>([]);
  const [weight, setWeight] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [sector, setSector] = useState(homeSector);
  const [date, setDate] = useState(localISO());
  const [slot, setSlot] = useState('');
  const [address, setAddress] = useState(session?.user.address ?? '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<PickupOrder | null>(null);
  const [step, setStep] = useState(1);

  const rateById = useMemo(() => Object.fromEntries(rates.map((r) => [r.id, r])), [rates]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => localISO(addDays(new Date(), i))), []);

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const continueToDetails = () => {
    setError('');
    if (!selected.length) return setError('Tap at least one type of scrap.');
    if (!weight) return setError('Choose an approximate weight.');
    setStep(2);
  };

  const pickPhoto = async (fromCamera: boolean) => {
    try {
      const perm = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', fromCamera ? 'Allow camera access in Settings to photograph your scrap.' : 'Allow photo access in Settings to attach a picture.');
        return;
      }
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.6, allowsEditing: true, aspect: [4, 3] };
      const res = fromCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (!res.canceled && res.assets?.[0]) setPhoto(res.assets[0].uri);
    } catch {
      Alert.alert('Camera unavailable', 'This device or emulator has no camera. Choose a photo from the gallery instead.');
    }
  };

  const submit = async () => {
    setError('');
    if (!selected.length) return setError('Tap at least one type of scrap.');
    if (!weight) return setError('Choose an approximate weight.');
    if (!sector) return setError('Choose your pickup area.');
    if (!slot) return setError('Choose a time slot.');
    if (address.trim().length < 6) return setError('Add your flat, tower or plot number so the agent can find you.');
    setSubmitting(true);
    try {
      await ensureSession();
      const groups = [...new Set(selected.map((id) => CART_TILES.find((t) => t.id === id)!.group))];
      const [lat, lng] = SECTOR_COORDS[sector] ?? [null, null];
      const created = await customerApi.createPickup({
        orderType, noidaSector: sector, fullAddress: address.trim(), gpsLat: lat, gpsLng: lng,
        scheduledDate: date, timeSlot: slot, estimatedWeightRange: weight, scrapGroups: groups, photoUrl: photo,
      });
      setOrder(created);
    } catch (e) {
      setError((e as Error).message || 'Booking failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => { setOrder(null); setSelected([]); setWeight(''); setPhoto(null); setSlot(''); setStep(1); setError(''); };

  if (order) {
    const msg = `My ScrapGullak pickup is booked.\nOrder #${order.orderNumber}\n${dayLabel(order.scheduledDate)}, ${order.timeSlot}\n${order.noidaSector}\nWeighed on a digital scale, paid on the spot after weighing.`;
    return (
      <ScrollView className="flex-1 bg-paper" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Card className="items-center py-8">
          <CheckCircle2 size={52} color="#10B981" />
          <Text className="mt-3 text-sm text-slate-500">Your order ID</Text>
          <Text className="text-3xl font-extrabold text-trust">#{order.orderNumber}</Text>
          <Text className="mt-3 text-center text-[15px] text-slate-600">{dayLabel(order.scheduledDate)}, {order.timeSlot}{'\n'}{order.fullAddress}, {order.noidaSector}</Text>
          <Text className="mt-3 text-center text-[13px] text-slate-500">We will notify you when an agent is assigned. Keep your scrap near the door.</Text>
        </Card>
        <View className="mt-4 gap-2">
          <Button title="Track pickup" icon={Truck} onPress={() => { reset(); router.push('/customer/track'); }} />
          <Button title="Share on WhatsApp" variant="whatsapp" icon={MessageCircle} onPress={() => Linking.openURL(`https://wa.me/?text=${encodeURIComponent(msg)}`)} />
          <Button title="Book another pickup" variant="outline" onPress={reset} />
        </View>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView className="flex-1 bg-paper" contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-extrabold text-trust">{step === 1 ? 'Sell your scrap' : 'Schedule your pickup'}</Text>
            <Text className="mt-1 text-[13px] text-slate-500">Step {step} of 2</Text>
          </View>
          {step === 2 ? (
            <Pressable onPress={() => { setError(''); setStep(1); }} accessibilityRole="button" className="flex-row items-center gap-1 rounded-xl px-3 py-2">
              <ArrowLeft size={16} color="#047857" />
              <Text className="font-bold text-gullak-dark">Back</Text>
            </Pressable>
          ) : null}
        </View>
        <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <View className={`h-full rounded-full bg-gullak ${step === 1 ? 'w-1/2' : 'w-full'}`} />
        </View>

        {step === 1 ? (
          <>
            <Text className="mt-3 text-[14px] text-slate-500">Tell us what you have. We’ll handle sorting and weighing at your door.</Text>
            <View className="mt-4 flex-row gap-2">
              {([['DOORSTEP_B2C', 'Home or society', Home], ['INDUSTRIAL_B2B', 'Shop or factory', Building2]] as const).map(([id, label, Icon]) => {
                const on = orderType === id;
                return (
                  <Pressable key={id} onPress={() => { setOrderType(id); setWeight(''); }} accessibilityRole="button" accessibilityState={{ selected: on }}
                    className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl border-2 py-3 ${on ? 'border-gullak bg-gullak-soft' : 'border-slate-200 bg-white'}`}>
                    <Icon size={16} color={on ? '#047857' : '#64748B'} />
                    <Text className={`text-[13px] font-bold ${on ? 'text-gullak-dark' : 'text-slate-600'}`}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Label>What are you selling?</Label>
            <View className="flex-row flex-wrap justify-between">
              {CART_TILES.map((t) => {
                const on = selected.includes(t.id);
                const r = rateById[t.categoryId];
                return (
                  <Pressable key={t.id} onPress={() => toggle(t.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                    className={`mb-3 w-[31.5%] items-center rounded-2xl border-2 bg-white px-1 py-3 ${on ? 'border-gullak bg-gullak-soft' : 'border-slate-200'}`}>
                    <View className={`h-12 w-12 items-center justify-center rounded-2xl ${on ? 'bg-gullak' : t.tone}`}>
                      <CategoryIcon iconName={t.icon} size={22} color={on ? '#FFFFFF' : '#0F172A'} />
                    </View>
                    <Text className="mt-2 text-center text-[12px] font-bold leading-4 text-trust">{t.label}</Text>
                    {r ? <Text className="mt-0.5 text-[11px] font-semibold text-coin-dark">{rate(r.buyingRateInr, r.unit)}</Text> : null}
                    {on ? <View className="absolute right-1.5 top-1.5"><CheckCircle2 size={16} color="#10B981" /></View> : null}
                  </Pressable>
                );
              })}
            </View>

            <Label>Approximate weight</Label>
            <View className="flex-row flex-wrap">
              {WEIGHT_RANGES[orderType].map((w) => <Chip key={w} label={w} selected={weight === w} onPress={() => setWeight(w)} />)}
            </View>
          </>
        ) : (
          <>
            <Text className="mt-3 text-[14px] text-slate-500">Choose a day and time. Your pickup is free and there’s no minimum for household scrap.</Text>

            <Label>Pickup area</Label>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 2 }}>
              {NOIDA_SECTORS.map((s) => <Chip key={s} label={s} selected={sector === s} onPress={() => setSector(s)} />)}
            </ScrollView>

            <Label>Day</Label>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 2 }}>
              {days.map((d) => <Chip key={d} label={dayLabel(d)} selected={date === d} onPress={() => setDate(d)} />)}
            </ScrollView>

            <Label>Time slot</Label>
            <View className="flex-row flex-wrap">
              {TIME_SLOTS.map((t) => <Chip key={t} label={t} selected={slot === t} onPress={() => setSlot(t)} />)}
            </View>

            <Label>{orderType === 'INDUSTRIAL_B2B' ? 'Plot or shop address' : 'Flat, tower and society'}</Label>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder={orderType === 'INDUSTRIAL_B2B' ? 'e.g. C-58, Hosiery Complex, Phase-2' : 'e.g. C-1204, Supertech Capetown'}
              placeholderTextColor="#94A3B8"
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-[15px] text-trust"
              accessibilityLabel="Pickup address"
            />

            <Label>Scrap pile photo (optional)</Label>
            {photo ? (
              <View className="relative">
                <Image source={{ uri: photo }} className="h-44 w-full rounded-2xl" resizeMode="cover" accessibilityLabel="Your scrap photo" />
                <Pressable onPress={() => setPhoto(null)} accessibilityRole="button" accessibilityLabel="Remove photo"
                  className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-trust/80">
                  <X size={16} color="#FFFFFF" />
                </Pressable>
              </View>
            ) : (
              <View className="flex-row gap-2">
                <Button className="flex-1" variant="outline" icon={Camera} title="Take photo" onPress={() => pickPhoto(true)} />
                <Button className="flex-1" variant="outline" icon={ImagePlus} title="Gallery" onPress={() => pickPhoto(false)} />
              </View>
            )}

            <Card className="mt-5">
              <Text className="text-[13px] font-bold text-slate-500">YOUR PICKUP</Text>
              <Text className="mt-1 font-bold text-trust">{selected.map((id) => CART_TILES.find((tile) => tile.id === id)?.label).filter(Boolean).join(', ')}</Text>
              <Text className="mt-1 text-[13px] text-slate-500">{weight} · {sector} · {dayLabel(date)}{slot ? ` · ${slot}` : ''}</Text>
            </Card>
          </>
        )}

        {error ? <Text className="mt-4 text-[14px] font-semibold text-rose-600" accessibilityLiveRegion="polite">{error}</Text> : null}
        {step === 1 ? (
          <Button className="mt-5" title="Continue to pickup details" icon={ArrowRight} onPress={continueToDetails} />
        ) : (
          <>
            <Button className="mt-5" title="Confirm free pickup" loading={submitting} onPress={submit} />
            <Text className="mt-2 text-center text-xs text-slate-500">No charges. Payment is made after weighing.</Text>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
