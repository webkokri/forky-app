import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { Pressy as Pressable } from '@/components/Pressy';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { Empty } from '@/components/Empty';
import { Refresh } from '@/components/Refresh';
import { ScreenHeader } from '@/components/ScreenHeader';
import { money } from '@/data';
import { nearEnd } from '@/hooks';
import { colors, fonts } from '@/theme';
import { isActive, statusInfo, type Order } from '@/orders';
import { useRealtime } from '@/realtime';

const FILTERS = ['All', 'Active', 'Completed', 'Cancelled'] as const;

export default function Orders() {
  const { user } = useAuth();
  const { on } = useRealtime();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const [items, setItems] = useState<Order[] | null>(null);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (p: number) => {
    const res: any = await api.listOrders({ page: p, limit: 10 });
    const data = (res?.data ?? res ?? []) as Order[];
    setMore(p < (res?.meta?.totalPages ?? 1));
    setPage(p);
    setItems((prev) => (p === 1 || !prev ? data : [...prev, ...data.filter((o) => !prev.some((x) => x.id === o.id))]));
  }, []);

  const uid = user?.id;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on sign-in; state is set after the await
    if (uid) load(1).catch(() => setItems([]));
  }, [uid, load]);

  // an order changed (accepted, out for delivery, delivered…): refresh the list live
  useEffect(() => {
    if (!uid) return;
    return on('order.status', () => { void load(1).catch(() => {}); });
  }, [uid, on, load]);

  const shownItems = useMemo(() => {
    const l = items ?? [];
    if (filter === 'Active') return l.filter((o) => isActive(o.status));
    if (filter === 'Completed') return l.filter((o) => ['DELIVERED', 'COLLECTED', 'COMPLETED'].includes(String(o.status).toUpperCase()));
    if (filter === 'Cancelled') return l.filter((o) => ['CANCELLED', 'REJECTED', 'REFUNDED'].includes(String(o.status).toUpperCase()));
    // all: live orders first
    return [...l.filter((o) => isActive(o.status)), ...l.filter((o) => !isActive(o.status))];
  }, [items, filter]);
  const liveCount = (items ?? []).filter((o) => isActive(o.status)).length;

  const next = () => {
    if (!more || loadingMore) return;
    setLoadingMore(true);
    load(page + 1).catch(() => {}).finally(() => setLoadingMore(false));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Orders" subtitle="Track and reorder" icon="receipt" />
      {!user ? (
        <Empty icon="receipt-outline" title="Sign in to see your orders" sub="Track deliveries live and reorder your favourites." action="Sign in" onPress={() => router.push('/sign-in')} />
      ) : items === null ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
      ) : (
        <View style={{ flex: 1 }}>
        <View style={o.pills}>
          {FILTERS.map((f) => (
            <Pressable key={f} onPress={() => setFilter(f)} style={[o.pill, filter === f && o.pillOn]} accessibilityState={{ selected: filter === f }}>
              <Text style={[o.pillText, filter === f && { color: '#FFFFFF' }]}>{f}{f === 'Active' && liveCount > 0 ? ` · ${liveCount}` : ''}</Text>
            </Pressable>
          ))}
        </View>
        <FlatList style={{ flex: 1 }}
          data={shownItems}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 120 }}
          refreshControl={<Refresh refreshing={refreshing} onRefresh={() => { setRefreshing(true); Promise.all([load(1).catch(() => {}), new Promise((r) => setTimeout(r, 700))]).finally(() => setRefreshing(false)); }} />}
          onEndReached={next}
          onEndReachedThreshold={0.6}
          onScroll={(e) => { if (nearEnd(e as never, 400)) next(); }}
          ListEmptyComponent={<Empty icon="receipt-outline" title="No orders yet" sub="When you order, it will show up here." action="Start shopping" onPress={() => router.navigate('/')} />}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.brand} style={{ marginVertical: 12 }} /> : undefined}
          renderItem={({ item }) => {
            const st = statusInfo(item.status);
            const live = isActive(item.status);
            const name = item.restaurant?.name ?? item.store?.name ?? 'Order';
            const total = item.total ?? item.grandTotal;
            return (
              <Pressable onPress={() => router.push({ pathname: '/order/[id]', params: { id: item.id } })} style={o.card} accessibilityRole="button">
                <View style={[o.icon, { backgroundColor: st.bg }]}><Ionicons name={st.icon} size={18} color={st.fg} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={o.name} numberOfLines={1}>{name}</Text>
                  <Text style={o.sub}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}{item.orderNumber ? ` · #${item.orderNumber}` : ''}</Text>
                  <View style={[o.badge, { backgroundColor: st.bg }]}><Text style={[o.badgeText, { color: st.fg }]}>{live ? '● ' : ''}{st.label}</Text></View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  {total != null ? <Text style={o.total}>{money(Number(total))}</Text> : null}
                  {live ? <View style={o.track}><Text style={o.trackText}>Track</Text></View> : null}
                </View>
              </Pressable>
            );
          }}
        />
        </View>
      )}
    </View>
  );
}

const o = StyleSheet.create({
  pills: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  pill: { height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, justifyContent: 'center' },
  pillOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  pillText: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.ink },
  track: { backgroundColor: colors.brand, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5 },
  trackText: { fontFamily: fonts.bold, fontSize: 12, color: colors.ink },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 18, padding: 14 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 1 },
  badge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginTop: 6 },
  badgeText: { fontFamily: fonts.bold, fontSize: 11 },
  total: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
});
