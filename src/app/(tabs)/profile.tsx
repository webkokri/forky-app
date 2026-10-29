import Ionicons from '@expo/vector-icons/Ionicons';
import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Pressy as Pressable } from '@/components/Pressy';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { Refresh } from '@/components/Refresh';
import { ScreenHeader } from '@/components/ScreenHeader';
import { usePullRefresh } from '@/hooks';
import { useFavorites } from '@/favorites';
import { money } from '@/data';
import { colors, fonts } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

export default function Profile() {
  const { user, logout } = useAuth();
  const { count } = useFavorites();
  const [balance, setBalance] = useState<number | null>(null);
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ');

  const uid = user?.id;
  const loadBalance = useCallback(() => (uid ? api.wallet().then((w: any) => setBalance(Number(w?.balance ?? w?.wallet?.balance ?? 0))).catch(() => {}) : Promise.resolve()), [uid]);
  useEffect(() => {
    void loadBalance();
  }, [loadBalance]);
  const { refreshing, onRefresh } = usePullRefresh(loadBalance);

  const rows: { icon: IconName; label: string; sub?: string; onPress: () => void; auth?: boolean }[] = [
    { icon: 'receipt-outline', label: 'My orders', sub: 'Track and reorder', onPress: () => router.navigate('/orders') },
    { icon: 'wallet-outline', label: 'Wallet', sub: balance == null ? 'Top up and pay' : `Balance $${balance.toFixed(2)}`, onPress: () => router.push('/wallet' as Href), auth: true },
    { icon: 'card-outline', label: 'Payment methods', sub: 'Saved cards', onPress: () => router.push('/cards' as Href), auth: true },
    { icon: 'receipt-outline', label: 'Payment history', sub: 'Orders, top-ups, refunds', onPress: () => router.push('/payments' as Href), auth: true },
    { icon: 'location-outline', label: 'Saved addresses', onPress: () => router.push('/addresses' as Href), auth: true },
    { icon: 'heart-outline', label: 'Saved stores', sub: user ? `${count} saved` : undefined, onPress: () => router.push('/favorites' as Href), auth: true },
    { icon: 'notifications-outline', label: 'Notifications', onPress: () => router.push('/notifications' as Href), auth: true },
    { icon: 'help-buoy-outline', label: 'Help & support', sub: 'support@forky.ca', onPress: () => void Linking.openURL('mailto:support@forky.ca') },
    { icon: 'storefront-outline', label: 'Partner with Forky', sub: 'List your restaurant or store', onPress: () => void Linking.openURL('https://forky.ca') },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader>
        <View style={p.head}>
          <View style={p.avatar}><Text style={p.avatarText}>{user ? (name || user.email || 'F')[0].toUpperCase() : 'F'}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={p.name}>{user ? name || 'Forky customer' : 'Welcome to Forky'}</Text>
            <Text style={p.sub}>{user ? user.email ?? user.phone ?? '' : 'Sign in to order and track deliveries'}</Text>
          </View>
        </View>
        {!user && (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <Pressable style={[p.btn, { backgroundColor: colors.ink }]} onPress={() => router.push('/sign-in')} accessibilityRole="button">
              <Text style={[p.btnText, { color: '#FFFFFF' }]}>Sign in</Text>
            </Pressable>
            <Pressable style={[p.btn, { backgroundColor: colors.brand }]} onPress={() => router.push({ pathname: '/sign-in', params: { mode: 'signup' } })} accessibilityRole="button">
              <Text style={p.btnText}>Create account</Text>
            </Pressable>
          </View>
        )}
      </ScreenHeader>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 120 }} showsVerticalScrollIndicator={false} refreshControl={<Refresh refreshing={refreshing} onRefresh={onRefresh} />}>
        {user && (
          <Pressable style={p.wallet} onPress={() => router.push('/wallet' as Href)} accessibilityRole="button" accessibilityLabel="Open wallet">
            <View style={p.walletIcon}><Ionicons name="wallet" size={20} color={colors.ink} /></View>
            <View style={{ flex: 1 }}>
              <Text style={p.walletLabel}>Forky wallet</Text>
              <Text style={p.walletAmt}>{balance == null ? '—' : money(balance)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#D9D3C8" />
          </Pressable>
        )}

        <View style={p.card}>
          {rows.map((r, i) => (
            <Pressable key={r.label} style={[p.row, i < rows.length - 1 && p.line]} onPress={() => (r.auth && !user ? router.push('/sign-in') : r.onPress())} accessibilityRole="button">
              <View style={p.icon}><Ionicons name={r.icon} size={18} color={colors.brandText} /></View>
              <View style={{ flex: 1 }}>
                <Text style={p.label}>{r.label}</Text>
                {r.sub ? <Text style={p.muted}>{r.sub}</Text> : null}
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </Pressable>
          ))}
        </View>

        {user && (
          <Pressable style={p.out} onPress={() => void logout()} accessibilityRole="button">
            <Ionicons name="log-out-outline" size={18} color="#B3261E" />
            <Text style={p.outText}>Sign out</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const p = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 10 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  name: { fontFamily: fonts.display, fontSize: 20, color: colors.ink },
  sub: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  btn: { flex: 1, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  wallet: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.ink, borderRadius: 18, padding: 16 },
  walletIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  walletLabel: { fontFamily: fonts.medium, fontSize: 12, color: '#D9D3C8' },
  walletAmt: { fontFamily: fonts.display, fontSize: 22, color: '#FFFFFF' },
  muted: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  card: { backgroundColor: colors.surface, borderRadius: 19, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  line: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  icon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.brandTintSoft, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  out: { height: 46, borderRadius: 14, borderWidth: 1.5, borderColor: '#B3261E', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  outText: { fontFamily: fonts.bold, fontSize: 14, color: '#B3261E' },
});
