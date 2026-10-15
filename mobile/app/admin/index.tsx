import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { ExternalLink } from 'lucide-react-native';
import { useApp } from '../../src/context/AppContext';
import Button from '../../src/components/Button';

const ADMIN_PORTAL = process.env.EXPO_PUBLIC_ADMIN_PORTAL_URL;

export default function AdminScreen() {
  const { session } = useApp();
  const [error, setError] = useState('');

  const openPortal = async () => {
    if (!ADMIN_PORTAL) return;
    try {
      await Linking.openURL(ADMIN_PORTAL);
    } catch {
      setError('Could not open the admin portal. Check the portal URL configured for this app.');
    }
  };

  return (
    <View className="flex-1 bg-paper px-5 py-8">
      <View className="mx-auto w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6">
        <Text className="text-2xl font-extrabold text-trust">Administrator access</Text>
        <Text className="mt-2 text-sm leading-6 text-slate-600">
          Signed in as {session?.user.fullName}. Admin accounts are provisioned by the service team and cannot be self-registered.
        </Text>
        <Text className="mt-4 rounded-xl bg-amber-50 p-3 text-sm leading-5 text-amber-900">
          The mobile app does not include the admin dashboard. The public web site is currently a demo and does not accept live accounts.
        </Text>
        {ADMIN_PORTAL ? (
          <Button className="mt-5" title="Open admin web console" onPress={openPortal} icon={ExternalLink} />
        ) : (
          <Text className="mt-5 text-sm text-slate-500">
            The production admin portal URL has not been configured for this app yet.
          </Text>
        )}
        {error ? <Text accessibilityRole="alert" className="mt-3 text-sm font-semibold text-red-700">{error}</Text> : null}
      </View>
    </View>
  );
}
