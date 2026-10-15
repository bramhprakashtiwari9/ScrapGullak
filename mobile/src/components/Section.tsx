import { Text, View, type ViewProps } from 'react-native';
import type { ReactNode } from 'react';

export function SectionTitle({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View className="mb-3 mt-6 flex-row items-center justify-between">
      <Text className="text-lg font-extrabold text-trust">{title}</Text>
      {right}
    </View>
  );
}

export function Card({ className = '', ...rest }: ViewProps & { className?: string }) {
  return <View className={`rounded-2xl border border-slate-200 bg-white p-4 ${className}`} {...rest} />;
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <View className="items-center rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8">
      <Text className="text-center text-base font-bold text-trust">{title}</Text>
      {body ? <Text className="mt-1 text-center text-sm text-slate-500">{body}</Text> : null}
      {action ? <View className="mt-4 w-full">{action}</View> : null}
    </View>
  );
}
