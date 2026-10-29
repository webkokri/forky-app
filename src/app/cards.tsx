import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '@/api';
import { cardCache } from '@/cardCache';
import { useAuth } from '@/auth';
import { Empty } from '@/components/Empty';
import { Refresh } from '@/components/Refresh';
import { ScreenHeader } from '@/components/ScreenHeader';
import { usePullRefresh } from '@/hooks';
import { BackButton } from '@/components/ui';
import { usePayments } from '@/payments';
import { colors, fonts } from '@/theme';

export type SavedCard = { id: string; brand?: string; last4?: string; expMonth?: number; expYear?: number; isDefault?: boolean; stripePaymentMethodId?: string; paymentMethodId?: string };

export const brandLabel = (b?: string) => (b ? b.charAt(0).toUpperCase() + b.slice(1) : 'Card');

export default function Cards() {
  const { user } = useAuth();
  const { addCard } = usePayments();
  const [cards, setCards] = useState<SavedCard[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const uid = user?.id;
  const load = useCallback(async () => {
    const r: any = await api.listCards();
    const list = ((r?.data ?? r ?? []) as SavedCard[]);
    setCards(list);
    if (uid) void cardCache.save(uid, { cards: list, chosen: null });
  }, [uid]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on sign-in; state is set after the await
    if (uid) load().catch(() => setCards([]));
  }, [uid, load]);

  const { refreshing, onRefresh } = usePullRefresh(load);

  const add = async () => {
    setBusy(true); setErr('');
    const r = await addCard();
    if (r.ok) { await new Promise((res) => setTimeout(res, 1200)); await load().catch(() => {}); }
    else if (!r.canceled) setErr(r.message);
    setBusy(false);
  };

  const remove = (c: SavedCard) =>
    Alert.alert('Remove this card?', `${brandLabel(c.brand)} •••• ${c.last4 ?? ''}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void api.deleteCard(c.id).then(load).catch((e) => Alert.alert('Could not remove', e.message)) },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Payment methods" subtitle="Cards saved to your account" icon="card">
        <View style={{ marginTop: 10, alignSelf: 'flex-start' }}><BackButton /></View>
      </ScreenHeader>
      {!user ? (
        <Empty icon="card-outline" title="Sign in to manage cards" action="Sign in" onPress={() => router.push('/sign-in')} />
      ) : cards === null ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
      ) : (
        <FlatList style={{ flex: 1 }}
          data={cards}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshControl={<Refresh refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={err ? <Text style={c.err}>{err}</Text> : undefined}
          ListEmptyComponent={<Empty icon="card-outline" title="No saved cards" sub="Add a card for faster checkout. Card is your main way to pay." />}
          renderItem={({ item }) => (
            <View style={c.card}>
              <View style={c.icon}><Ionicons name="card" size={18} color={colors.brandText} /></View>
              <View style={{ flex: 1 }}>
                <Text style={c.name}>{brandLabel(item.brand)} •••• {item.last4}{item.isDefault ? '  · Default' : ''}</Text>
                {item.expMonth ? <Text style={c.sub}>Expires {String(item.expMonth).padStart(2, '0')}/{String(item.expYear).slice(-2)}</Text> : null}
                {!item.isDefault && <Pressable onPress={() => void api.setDefaultCard(item.id).then(load)} hitSlop={8}><Text style={c.link}>Make default</Text></Pressable>}
              </View>
              <Pressable onPress={() => remove(item)} hitSlop={10} accessibilityLabel="Remove card"><Ionicons name="trash-outline" size={18} color="#B3261E" /></Pressable>
            </View>
          )}
          ListFooterComponent={
            <Pressable onPress={add} disabled={busy} style={[c.add, busy && { opacity: 0.6 }]} accessibilityRole="button">
              {busy ? <ActivityIndicator color={colors.ink} /> : <><Ionicons name="add-circle" size={20} color={colors.ink} /><Text style={c.addText}>Add a card</Text></>}
            </Pressable>
          }
        />
      )}
    </View>
  );
}

const c = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, padding: 14 },
  icon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.brandTintSoft, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  link: { fontFamily: fonts.bold, fontSize: 12, color: colors.brandText, marginTop: 4 },
  err: { fontFamily: fonts.medium, fontSize: 13, color: '#8C1D18', backgroundColor: '#FDE8E6', borderRadius: 12, padding: 12, marginBottom: 8 },
  add: { height: 50, borderRadius: 14, backgroundColor: colors.brand, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6 },
  addText: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
});
