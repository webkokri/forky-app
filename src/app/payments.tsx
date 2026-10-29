import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { Empty } from '@/components/Empty';
import { Refresh } from '@/components/Refresh';
import { ScreenHeader } from '@/components/ScreenHeader';
import { usePullRefresh } from '@/hooks';
import { BackButton } from '@/components/ui';
import { colors, fonts } from '@/theme';
import { dateTime, signedMoney, TxRow, type WalletTx } from '@/walletUi';
import type { Order } from '@/orders';

type Pay = Order & { paymentMethod?: string; paymentStatus?: string; walletUsed?: number | string; restaurantName?: string | null };
type Row = { kind: 'order'; at: string; order: Pay } | { kind: 'wallet'; at: string; tx: WalletTx };
const FILTERS = ['All', 'Orders', 'Wallet'] as const;

const PAY_STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  CAPTURED: { label: 'Paid', bg: '#E3F1EA', fg: '#1D5A3A' },
  AUTHORIZED: { label: 'Authorised', bg: '#E2ECF7', fg: '#1E4E8C' },
  PENDING: { label: 'Pending', bg: '#FDF1D8', fg: '#7A4F00' },
  REFUNDED: { label: 'Refunded', bg: '#ECE6F5', fg: '#5B3E8A' },
  PARTIALLY_REFUNDED: { label: 'Part refunded', bg: '#ECE6F5', fg: '#5B3E8A' },
  RELEASED: { label: 'Not charged', bg: '#EEEAE2', fg: '#5E5850' },
  FAILED: { label: 'Failed', bg: '#FDE8E6', fg: '#8C1D18' },
};

/** Everything money-related in one place: what each order cost and how it was paid, plus wallet top-ups and refunds. */
export default function PaymentHistory() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Pay[]>([]);
  const [wallet, setWallet] = useState<WalletTx[]>([]);
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');

  const load = useCallback(async () => {
    const [o, w] = await Promise.all([
      api.listOrders({ page: 1, limit: 50 }).catch(() => ({ data: [] })),
      api.wallet({ page: 1, limit: 50 }).catch(() => ({ transactions: { data: [] } })),
    ]);
    setOrders(((o as any).data ?? []) as Pay[]);
    setWallet((((w as any).transactions?.data ?? []) as WalletTx[]));
    setReady(true);
  }, []);
  const uid = user?.id;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on sign-in; state is set after the await
    if (uid) void load();
  }, [uid, load]);

  const { refreshing, onRefresh } = usePullRefresh(load);

  const rows = useMemo<Row[]>(() => {
    const r: Row[] = [];
    if (filter !== 'Wallet') for (const o of orders) if (o.createdAt) r.push({ kind: 'order', at: o.createdAt, order: o });
    // order payments made from the wallet are already shown on the order, so only top-ups, refunds, credits… are listed
    if (filter !== 'Orders') for (const t of wallet) if (t.type !== 'PURCHASE') r.push({ kind: 'wallet', at: t.createdAt, tx: t });
    return r.sort((a, b) => +new Date(b.at) - +new Date(a.at));
  }, [orders, wallet, filter]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Payment history" subtitle="Orders, top-ups and refunds" icon="receipt">
        <View style={{ marginTop: 10, alignSelf: 'flex-start' }}><BackButton /></View>
      </ScreenHeader>
      {!user ? (
        <Empty icon="receipt-outline" title="Sign in to see your payments" action="Sign in" onPress={() => router.push('/sign-in')} />
      ) : !ready ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
      ) : (
        <>
          <View style={p.pills}>
            {FILTERS.map((f) => (
              <Pressable key={f} onPress={() => setFilter(f)} style={[p.pill, filter === f && p.pillOn]} accessibilityState={{ selected: filter === f }}>
                <Text style={[p.pillText, filter === f && { color: '#FFFFFF' }]}>{f}</Text>
              </Pressable>
            ))}
          </View>
          <FlatList style={{ flex: 1 }}
            data={rows}
            keyExtractor={(r) => (r.kind === 'order' ? `o${r.order.id}` : `w${r.tx.id}`)}
            contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 120 }}
            refreshControl={<Refresh refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={<Empty icon="receipt-outline" title="No payments yet" sub="Your orders and wallet activity will appear here." />}
            renderItem={({ item }) => {
              if (item.kind === 'wallet') return <TxRow tx={item.tx} />;
              const o = item.order;
              const st = PAY_STATUS[String(o.paymentStatus)] ?? PAY_STATUS.PENDING;
              const total = Number(o.total ?? o.grandTotal ?? 0);
              const fromWallet = Number(o.walletUsed ?? 0);
              const card = Math.max(0, Math.round((total - fromWallet) * 100) / 100);
              return (
                <Pressable onPress={() => router.push({ pathname: '/order/[id]', params: { id: o.id } })} style={p.card} accessibilityRole="button">
                  <View style={p.icon}><Ionicons name="bag-handle" size={17} color={colors.brandText} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={p.name} numberOfLines={1}>{o.restaurantName ?? o.restaurant?.name ?? 'Order'}{o.orderNumber ? ` · #${o.orderNumber}` : ''}</Text>
                    <Text style={p.sub}>
                      {dateTime(o.createdAt)} · {[card > 0 ? `Card $${card.toFixed(2)}` : null, fromWallet > 0 ? `Wallet $${fromWallet.toFixed(2)}` : null].filter(Boolean).join(' + ') || 'Paid'}
                    </Text>
                    <View style={[p.badge, { backgroundColor: st.bg }]}><Text style={[p.badgeText, { color: st.fg }]}>{st.label}</Text></View>
                  </View>
                  <Text style={p.amt}>{signedMoney(-total)}</Text>
                </Pressable>
              );
            }}
          />
        </>
      )}
    </View>
  );
}

const p = StyleSheet.create({
  pills: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  pill: { height: 34, paddingHorizontal: 16, borderRadius: 17, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, justifyContent: 'center' },
  pillOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  pillText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 16, padding: 12 },
  icon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.brandTintSoft, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 1 },
  badge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginTop: 6 },
  badgeText: { fontFamily: fonts.bold, fontSize: 11 },
  amt: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
});
