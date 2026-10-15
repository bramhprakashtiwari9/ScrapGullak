import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, ScrollView, Text, View } from 'react-native';
import type { ScrapCategory } from '../types';
import { rate, shortName } from '../utils/format';

/** Horizontally scrolling ticker of today's Noida buying rates. Static scroll when Reduce Motion is on. */
export default function RateTicker({ rates }: { rates: ScrapCategory[] }) {
  const x = useRef(new Animated.Value(0)).current;
  const [width, setWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!width || reduceMotion) return undefined;
    x.setValue(0);
    const anim = Animated.loop(Animated.timing(x, { toValue: -width, duration: width * 30, easing: Easing.linear, useNativeDriver: true }));
    anim.start();
    return () => anim.stop();
  }, [width, reduceMotion, x]);

  const items = (suffix: string) => rates.map((r) => (
    <View key={`${r.id}${suffix}`} className="mr-6 flex-row items-center">
      <Text className="text-[13px] text-slate-300">{shortName(r.name)}</Text>
      <Text className="ml-1.5 text-[13px] font-extrabold text-white">{rate(r.buyingRateInr, r.unit)}</Text>
    </View>
  ));

  return (
    <View className="overflow-hidden rounded-2xl bg-trust py-3" accessibilityLabel="Today's Noida scrap rates">
      <View className="mb-2 flex-row items-center gap-1.5 px-4">
        <View className="h-2 w-2 rounded-full bg-gullak" />
        <Text className="text-xs font-bold text-coin">Live Noida rates today</Text>
      </View>
      {reduceMotion ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>{items('')}</ScrollView>
      ) : (
        <Animated.View style={{ flexDirection: 'row', paddingLeft: 16, transform: [{ translateX: x }] }}>
          <View className="flex-row" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>{items('')}</View>
          <View className="flex-row">{items('-dup')}</View>
        </Animated.View>
      )}
    </View>
  );
}
