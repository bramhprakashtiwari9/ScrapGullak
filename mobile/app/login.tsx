import { useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useRouter } from 'expo-router';
import { Home, ShieldCheck, Truck } from 'lucide-react-native';
import { useApp, type AppMode } from '../src/context/AppContext';
import { IS_PUBLIC_DEMO } from '../src/services/api';
import type { RegisterPayload } from '../src/types';
import Button from '../src/components/Button';
import GullakMark from '../src/components/GullakMark';

type SignInMode = AppMode | 'admin';
const ACCESS: { id: SignInMode; label: string; Icon: typeof Home }[] = [
  { id: 'customer', label: 'Customer', Icon: Home },
  { id: 'agent', label: 'Pickup agent', Icon: Truck },
  { id: 'admin', label: 'Admin', Icon: ShieldCheck },
];

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, register } = useApp();
  const [mode, setMode] = useState<SignInMode>('customer');
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [sector, setSector] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      if (creatingAccount) {
        const payload: RegisterPayload = {
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          password,
          accountType: 'B2C_HOUSEHOLD',
          noidaSector: sector.trim() || undefined,
        };
        await register(payload);
        router.replace('/customer');
      } else {
        const auth = await signIn(phone.trim(), password, mode);
        router.replace(auth.role === 'AGENT' ? '/agent' : auth.role === 'ADMIN' ? '/admin' : '/customer');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign in. Check your details and try again.');
    } finally {
      setBusy(false);
    }
  };

  const openDemo = async () => {
    setBusy(true);
    setError('');
    try {
      const auth = await signIn('', '', mode);
      router.replace(auth.role === 'AGENT' ? '/agent' : '/customer');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open the demo.');
    } finally {
      setBusy(false);
    }
  };

  const field = (label: string, value: string, update: (s: string) => void, props: TextInputProps = {}) => (
    <View className="mt-4">
      <Text className="mb-1 text-sm font-bold text-trust">{label}</Text>
      <TextInput
        value={value}
        onChangeText={update}
        placeholderTextColor="#94A3B8"
        className="rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-[15px] text-trust"
        {...props}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView className="flex-1 bg-paper" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="flex-grow justify-center px-5 py-8">
        <View className="mx-auto w-full max-w-xl">
          <View className="mb-6 flex-row items-center gap-2">
            <GullakMark />
            <Text className="text-xl font-extrabold text-trust">Scrap<Text className="text-gullak">Gullak</Text></Text>
          </View>
          <View className="rounded-3xl border border-slate-200 bg-white p-5">
            <Text className="text-2xl font-extrabold text-trust">{creatingAccount ? 'Create customer account' : 'Sign in to your account'}</Text>
            <Text className="mt-1 text-[14px] leading-5 text-slate-500">
              {creatingAccount ? 'Book pickups and keep your receipts and earnings together.' : 'Use your own account to open your customer or pickup-agent workspace.'}
            </Text>

            {!creatingAccount && (
              <View className="mt-5 flex-row rounded-xl bg-slate-100 p-1">
                {(IS_PUBLIC_DEMO ? ACCESS.filter((access) => access.id !== 'admin') : ACCESS).map(({ id, label, Icon }) => (
                  <Pressable key={id} onPress={() => setMode(id)} accessibilityRole="button" accessibilityState={{ selected: mode === id }}
                    className={`flex-1 flex-row items-center justify-center gap-2 rounded-lg py-2.5 ${mode === id ? 'bg-white' : ''}`}>
                    <Icon size={16} color={mode === id ? '#047857' : '#64748B'} />
                    <Text className={`text-[13px] font-bold ${mode === id ? 'text-trust' : 'text-slate-500'}`}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {!IS_PUBLIC_DEMO && creatingAccount && field('Full name', fullName, setFullName, { autoComplete: 'name', maxLength: 100, textContentType: 'name' })}
            {!IS_PUBLIC_DEMO && field('Mobile number', phone, setPhone, { keyboardType: 'phone-pad', autoComplete: 'tel', maxLength: 15 })}
            {!IS_PUBLIC_DEMO && creatingAccount && field('Email (optional)', email, setEmail, { keyboardType: 'email-address', autoCapitalize: 'none', autoComplete: 'email', maxLength: 150 })}
            {!IS_PUBLIC_DEMO && creatingAccount && field('Noida sector (optional)', sector, setSector, { maxLength: 80 })}
            {!IS_PUBLIC_DEMO && field('Password', password, setPassword, { secureTextEntry: true, autoComplete: creatingAccount ? 'new-password' : 'current-password', textContentType: creatingAccount ? 'newPassword' : 'password' })}

            {IS_PUBLIC_DEMO ? (
              <>
                <Text className="mt-4 rounded-xl bg-amber-50 p-3 text-[13px] font-semibold leading-5 text-amber-900">
                  Public demo only. Customer bookings and agent pickups use sample data, not live accounts.
                </Text>
                <Button className="mt-4" title="Continue to demo" onPress={openDemo} loading={busy} />
              </>
            ) : (
              <Button className="mt-5" title={creatingAccount ? 'Create account' : 'Sign in'} onPress={submit} loading={busy} disabled={!phone.trim() || !password || (creatingAccount && (!fullName.trim() || password.length < 8))} />
            )}

            {error ? <Text accessibilityRole="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-[13px] font-semibold text-red-700">{error}</Text> : null}

            {!IS_PUBLIC_DEMO && mode === 'customer' && (
              <Pressable onPress={() => { setCreatingAccount((v) => !v); setError(''); }} className="mt-5 items-center py-2">
                <Text className="text-sm font-bold text-gullak-dark">{creatingAccount ? 'Already registered? Sign in' : 'New customer? Create an account'}</Text>
              </Pressable>
            )}
            {!IS_PUBLIC_DEMO && (mode === 'agent' || mode === 'admin') && !creatingAccount && (
              <Text className="mt-4 text-center text-xs leading-5 text-slate-500">{mode === 'agent' ? 'Agent accounts are created by ScrapGullak administrators. Contact your manager if you need access.' : 'Administrator accounts are provisioned by ScrapGullak. Self-registration is not available.'}</Text>
            )}
            {!IS_PUBLIC_DEMO && process.env.EXPO_PUBLIC_ADMIN_PORTAL_URL ? (
              <Pressable onPress={() => Linking.openURL(process.env.EXPO_PUBLIC_ADMIN_PORTAL_URL || 'https://bramhprakashtiwari9.github.io/ScrapGullak/#/login').catch(() => setError('Could not open the web portal.'))} className="mt-5 items-center py-2">
                <Text className="text-xs font-semibold text-slate-500">Open the admin web portal</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
