import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

type Variant = 'primary' | 'dark' | 'coin' | 'outline' | 'whatsapp';

const BOX: Record<Variant, string> = {
  primary: 'bg-gullak',
  dark: 'bg-trust',
  coin: 'bg-coin',
  outline: 'bg-white border border-slate-300',
  whatsapp: 'bg-[#25D366]',
};
const TEXT: Record<Variant, string> = {
  primary: 'text-white', dark: 'text-white', coin: 'text-trust', outline: 'text-trust', whatsapp: 'text-white',
};
const ICON_COLOR: Record<Variant, string> = {
  primary: '#FFFFFF', dark: '#FFFFFF', coin: '#0F172A', outline: '#0F172A', whatsapp: '#FFFFFF',
};

interface Props {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  className?: string;
}

export default function Button({ title, onPress, variant = 'primary', icon: Icon, loading, disabled, small, className = '' }: Props) {
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      onPress={off ? undefined : onPress}
      className={`flex-row items-center justify-center rounded-xl ${small ? 'px-3 py-2' : 'px-4 py-3.5'} ${BOX[variant]} ${off ? 'opacity-50' : ''} ${className}`}
      style={({ pressed }) => ({ opacity: pressed && !off ? 0.85 : undefined })}
    >
      <View className="flex-row items-center gap-2">
        {loading ? <ActivityIndicator size="small" color={ICON_COLOR[variant]} /> : Icon ? <Icon size={small ? 15 : 18} color={ICON_COLOR[variant]} /> : null}
        <Text className={`font-bold ${small ? 'text-[13px]' : 'text-[15px]'} ${TEXT[variant]}`}>{title}</Text>
      </View>
    </Pressable>
  );
}
