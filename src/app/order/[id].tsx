import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '@/api';
import { LiveMap } from '@/components/LiveMap';
import { Pressy as Pressable } from '@/components/Pressy';
import { Refresh } from '@/components/Refresh';
import { ScreenHeader } from '@/components/ScreenHeader';
import { BackButton } from '@/components/ui';
import { money } from '@/data';
import { canCancel, isActive, PICKUP_STEPS, statusInfo, STEPS, type Order } from '@/orders';
import { usePullRefresh } from '@/hooks';
import { useRealtime } from '@/realtime';
import { colors, fonts } from '@/theme';

type LL = { lat: number; lng: number };
type Tracking = {
  status: string;
  fulfilment?: string;
  restaurant?: { name?: string; address?: string | null; lat?: number | null; lng?: number | null };
  deliveryAddress?: { lat?: number; lng?: number; line1?: string } | null;
  driver?: { name?: string; vehicleType?: string; vehicleColor?: string; licensePlate?: string; lat?: number | null; lng?: number | null } | null;
  estimatedReadyAt?: string | null;
  estimatedDeliveryAt?: string | null;
  isLate?: boolean;
  deliveryPin?: string | null;
  pickupCode?: string | null;
  canCancel?: boolean;
  cancelUntil?: string | null;
};

const num = (n: unknown) => (n == null ? 0 : Number(n));
const mins = (iso?: string | null) => (iso ? Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60000)) : null);

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { on, watchOrder, connected } = useRealtime();
  const [order, setOrder] = useState<Order | null>(null);
  const [track, setTrack] = useState<Tracking | null>(null);
  const [driverPos, setDriverPos] = useState<LL | null>(null);
  const [arrived, setArrived] = useState<'restaurant' | 'customer' | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [, tick] = useState(0);
  const [pulse] = useState(() => new Animated.Value(0));

  const load = useCallback(async () => {
    try {
      const [o, t] = await Promise.all([api.getOrder(id), api.tracking(id).catch(() => null)]);
      setOrder(o as Order);
      if (t) {
        const tr = t as Tracking;
        setTrack(tr);
        if (tr.driver?.lat != null && tr.driver?.lng != null) setDriverPos((cur) => cur ?? { lat: tr.driver!.lat!, lng: tr.driver!.lng! });
      }
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this order');
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    void load();
  }, [load]);

  // ---- realtime: status, ETA, driver position and arrival arrive over the socket the moment they happen
  useEffect(() => {
    const leave = watchOrder(id);
    const offs = [
      on('order.status', (p) => { if (p?.orderId === id) { setTrack((t) => (t ? { ...t, status: p.status } : t)); setOrder((o) => (o ? { ...o, status: p.status } : o)); void load(); } }),
      on('order.eta', (p) => { if (p?.orderId === id) setTrack((t) => (t ? { ...t, estimatedReadyAt: p.estimatedReadyAt, estimatedDeliveryAt: p.estimatedDeliveryAt } : t)); }),
      on('order.driver_assigned', (p) => { if (p?.orderId === id) void load(); }),
      on('order.driver_unassigned', (p) => { if (p?.orderId === id) { setDriverPos(null); void load(); } }),
      on('order.driver_arrived', (p) => { if (p?.orderId === id) setArrived(p.stage === 'restaurant' ? 'restaurant' : 'customer'); }),
      on('driver.location', (p) => { if (p?.orderId === id && Number.isFinite(p.lat) && Number.isFinite(p.lng)) setDriverPos({ lat: p.lat, lng: p.lng }); }),
    ];
    return () => { leave(); offs.forEach((off) => off()); };
  }, [id, on, watchOrder, load]);

  const { refreshing, onRefresh } = usePullRefresh(load);
  const status = track?.status ?? order?.status;
  const live = isActive(status);
  // safety net while the order is live: refresh every 20 s (and a second timer re-renders the countdown)
  useEffect(() => {
    if (!live) return;
    const poll = setInterval(() => void load(), 20000);
    const clock = setInterval(() => tick((n) => n + 1), 30000);
    return () => { clearInterval(poll); clearInterval(clock); };
  }, [live, load]);

  useEffect(() => {
    if (!live) return;
    const l = Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }), Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true })]));
    l.start();
    return () => l.stop();
  }, [live, pulse]);

  const st = statusInfo(status);
  const pickup = (track?.fulfilment ?? (order as any)?.fulfilment) === 'PICKUP' || order?.type === 'PICKUP';
  const steps = pickup ? PICKUP_STEPS : STEPS;
  const stepNow = Math.min(st.step, steps.length - 1);
  const name = track?.restaurant?.name ?? order?.restaurant?.name ?? 'Order';
  const eta = mins(pickup ? track?.estimatedReadyAt : track?.estimatedDeliveryAt);
  const total = order?.total ?? order?.grandTotal;
  const store: LL | null = track?.restaurant?.lat != null && track.restaurant.lng != null ? { lat: track.restaurant.lat, lng: track.restaurant.lng } : null;
  const home: LL | null = track?.deliveryAddress?.lat != null && track.deliveryAddress.lng != null ? { lat: track.deliveryAddress.lat, lng: track.deliveryAddress.lng } : null;
  const showMap = !pickup && live && (store || home);
  const outForDelivery = st.step === 4 && !pickup;

  const doCancel = async (refundTo: 'ORIGINAL_PAYMENT' | 'WALLET') => {
    setBusy(true);
    try { await api.cancelOrder(id, 'Customer cancelled', refundTo); await load(); } catch (e) { Alert.alert('Could not cancel', e instanceof Error ? e.message : 'Try again'); } finally { setBusy(false); }
  };
  // two ways to get the money back: to the card used for the order, or into the Forky wallet to spend on the next order
  const cancel = () =>
    Alert.alert('Cancel this order?', 'You may not be able to undo this. Where should your refund go?', [
      { text: 'Keep order', style: 'cancel' },
      { text: 'Refund to my card', style: 'destructive', onPress: () => void doCancel('ORIGINAL_PAYMENT') },
      { text: 'Refund to my wallet', onPress: () => void doCancel('WALLET') },
    ]);
  const reorder = async () => {
    setBusy(true);
    try { await api.reorder(id); router.navigate('/cart'); } catch (e) { Alert.alert('Could not reorder', e instanceof Error ? e.message : 'Try again'); } finally { setBusy(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title={name} subtitle={(order?.code ?? order?.orderNumber) ? `Order #${order?.code ?? order?.orderNumber}` : undefined} icon="receipt">
        <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <BackButton />
          {live && (
            <View style={d.live}>
              <View style={[d.liveDot, { backgroundColor: connected ? '#2F7A52' : '#B3261E' }]} />
              <Text style={d.liveText}>{connected ? 'Live' : 'Reconnecting…'}</Text>
            </View>
          )}
        </View>
      </ScreenHeader>

      {!order && !error ? <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} /> : null}
      {error ? <Text style={d.error}>{error}</Text> : null}

      {order && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 60 }} showsVerticalScrollIndicator={false} refreshControl={<Refresh refreshing={refreshing} onRefresh={onRefresh} />}>
          {arrived === 'customer' && live && (
            <View style={d.arrival}>
              <Ionicons name="location" size={22} color={colors.ink} />
              <View style={{ flex: 1 }}>
                <Text style={d.arrivalTitle}>Your driver has arrived</Text>
                <Text style={d.arrivalSub}>{track?.deliveryPin ? `Have your PIN ready: ${track.deliveryPin}` : 'Please meet them at your door.'}</Text>
              </View>
            </View>
          )}

          <View style={d.card}>
            <View style={d.statusRow}>
              <View style={[d.icon, { backgroundColor: st.bg }]}>
                {live && <Animated.View style={[d.ring, { borderColor: st.fg, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] }) }] }]} />}
                <Ionicons name={st.icon} size={22} color={st.fg} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={d.big}>{outForDelivery && arrived === 'customer' ? 'Driver has arrived' : st.label}</Text>
                {live && eta != null ? <Text style={d.sub}>{eta <= 0 ? (track?.isLate ? 'Running a little late' : 'Arriving any moment') : `${pickup ? 'Ready in' : 'Arriving in'} about ${eta} min`}</Text> : null}
                {track?.driver?.name && !pickup ? <Text style={d.sub}>Driver: {track.driver.name}</Text> : null}
              </View>
            </View>

            {st.step >= 0 ? (
              <View style={{ gap: 12, marginTop: 14 }}>
                {steps.map((label, i) => {
                  const state = i < stepNow ? 'done' : i === stepNow ? 'now' : 'next';
                  return (
                    <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      {state === 'done' && <View style={[d.dot, { backgroundColor: colors.ink }]}><Ionicons name="checkmark" size={12} color="#FFFFFF" /></View>}
                      {state === 'now' && <View style={[d.dot, { backgroundColor: colors.brand, borderWidth: 4, borderColor: colors.brandTint }]} />}
                      {state === 'next' && <View style={[d.dot, { borderWidth: 2, borderColor: '#D6CFC3' }]} />}
                      <Text style={state === 'next' ? d.sub : d.bold}>{label}</Text>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </View>

          {showMap && <LiveMap store={store} home={home} driver={outForDelivery || driverPos ? driverPos : null} />}

          {track?.driver && !pickup && live && (
            <View style={[d.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
              <View style={[d.icon, { backgroundColor: colors.ink }]}><Text style={d.avatar}>{(track.driver.name ?? 'D')[0]}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={d.bold}>{track.driver.name}</Text>
                <Text style={d.sub}>{[track.driver.vehicleColor, track.driver.vehicleType, track.driver.licensePlate].filter(Boolean).join(' · ')}</Text>
              </View>
            </View>
          )}

          {live && (track?.deliveryPin || (pickup && track?.pickupCode)) && (
            <View style={[d.card, { alignItems: 'center', gap: 4 }]}>
              <Text style={d.sub}>{pickup ? 'Show this code at the store' : 'Give this PIN to your driver'}</Text>
              <Text style={d.pin}>{pickup ? track?.pickupCode : track?.deliveryPin}</Text>
            </View>
          )}

          {order.items?.length ? (
            <View style={d.card}>
              <Text style={d.big}>Items</Text>
              {order.items.map((it, i) => (
                <View key={it.id ?? i} style={d.line}>
                  <Text style={[d.body, { flex: 1 }]}>{it.quantity ?? it.qty ?? 1} × {it.name}</Text>
                  {it.totalPrice != null || it.price != null ? <Text style={d.body}>{money(num(it.totalPrice ?? it.price))}</Text> : null}
                </View>
              ))}
              <View style={d.divider} />
              {order.subtotal != null ? <Row k="Subtotal" v={money(num(order.subtotal))} /> : null}
              {order.deliveryFee != null && num(order.deliveryFee) > 0 ? <Row k="Delivery" v={money(num(order.deliveryFee))} /> : null}
              {order.serviceFee != null && num(order.serviceFee) > 0 ? <Row k="Service fee" v={money(num(order.serviceFee))} /> : null}
              {order.taxAmount != null && num(order.taxAmount) > 0 ? <Row k="Tax" v={money(num(order.taxAmount))} /> : null}
              {order.tip != null && num(order.tip) > 0 ? <Row k="Tip" v={money(num(order.tip))} /> : null}
              {order.discountTotal != null && num(order.discountTotal) > 0 ? <Row k="Discount" v={`−${money(num(order.discountTotal))}`} green /> : null}
              {total != null ? <Row k="Total" v={money(num(total))} bold /> : null}
              {order.walletUsed != null && num(order.walletUsed) > 0 ? <Row k="Paid from wallet" v={money(num(order.walletUsed))} /> : null}
              {total != null && order.paymentMethod ? <Row k="Paid by" v={order.paymentMethod === 'WALLET' ? 'Wallet' : num(order.walletUsed) > 0 ? 'Card + wallet' : 'Card'} /> : null}
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable onPress={reorder} disabled={busy} style={[d.btn, { backgroundColor: colors.brand }]}>
              <Ionicons name="refresh" size={16} color={colors.ink} />
              <Text style={d.btnText}>Reorder</Text>
            </Pressable>
            {(track?.canCancel ?? canCancel(status)) && live && (
              <Pressable onPress={cancel} disabled={busy} style={[d.btn, { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: '#B3261E' }]}>
                <Text style={[d.btnText, { color: '#B3261E' }]}>Cancel order</Text>
              </Pressable>
            )}
          </View>
          <Pressable onPress={() => void Linking.openURL('mailto:support@forky.ca?subject=Order%20' + encodeURIComponent(String(order.code ?? id)))} style={d.help} accessibilityRole="button">
            <Ionicons name="help-buoy-outline" size={16} color={colors.brandText} />
            <Text style={d.helpText}>Need help with this order?</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

function Row({ k, v, bold, green }: { k: string; v: string; bold?: boolean; green?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
      <Text style={bold ? d.bold : d.sub}>{k}</Text>
      <Text style={[bold ? d.bold : d.body, green && { color: colors.green }]}>{v}</Text>
    </View>
  );
}

const d = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 14 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 44, height: 44, borderRadius: 22, borderWidth: 2 },
  dot: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  big: { fontFamily: fonts.display, fontSize: 17, color: colors.ink },
  bold: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  body: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  line: { flexDirection: 'row', gap: 10, paddingVertical: 6 },
  divider: { height: 1, backgroundColor: colors.lineSoft, marginTop: 6 },
  btn: { flex: 1, height: 46, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  btnText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  error: { fontFamily: fonts.medium, fontSize: 13, color: '#8C1D18', padding: 16 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.bg, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { fontFamily: fonts.bold, fontSize: 11, color: colors.ink },
  arrival: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.brand, borderRadius: 18, padding: 14 },
  arrivalTitle: { fontFamily: fonts.display, fontSize: 16, color: colors.ink },
  arrivalSub: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  avatar: { fontFamily: fonts.display, fontSize: 18, color: '#FFFFFF' },
  pin: { fontFamily: fonts.display, fontSize: 34, letterSpacing: 8, color: colors.ink },
  help: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  helpText: { fontFamily: fonts.bold, fontSize: 13, color: colors.brandText },
});
