import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { Empty } from '@/components/Empty';
import { Refresh } from '@/components/Refresh';
import { ScreenHeader } from '@/components/ScreenHeader';
import { usePullRefresh } from '@/hooks';
import { BackButton } from '@/components/ui';
import { usePayments } from '@/payments';
import { colors, fonts } from '@/theme';
import { TxRow, type WalletTx } from '@/walletUi';

const PRESETS = [10, 25, 50, 100];

export default function Wallet() {
  const { user } = useAuth();
  const { config, topUp } = usePayments();
  const [balance, setBalance] = useState<number | null>(null);
  const [tx, setTx] = useState<WalletTx[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [amount, setAmount] = useState<number>(25);
  const [custom, setCustom] = useState('');
  const [gift, setGift] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async (p = 1) => {
    const w: any = await api.wallet({ page: p, limit: 20 });
    setBalance(Number(w.balance ?? 0));
    const rows = (w.transactions?.data ?? []) as WalletTx[];
    setTx((prev) => (p === 1 ? rows : [...prev, ...rows.filter((r) => !prev.some((x) => x.id === r.id))]));
    setPage(p);
    setPages(w.transactions?.meta?.totalPages ?? 1);
  }, []);

  const uid = user?.id;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on sign-in; state is set after the await
    if (uid) load(1).catch(() => {}).finally(() => setLoading(false));
  }, [uid, load]);

  const { refreshing, onRefresh } = usePullRefresh(() => load(1));

  const min = config?.topUp?.min ?? 5;
  const max = config?.topUp?.max ?? 500;
  const value = custom ? Number(custom) : amount;
  const valid = Number.isFinite(value) && value >= min && value <= max;

  const doTopUp = async () => {
    if (!valid) return setNote({ ok: false, text: `Choose an amount between $${min} and $${max}.` });
    Keyboard.dismiss();
    setBusy(true);
    setNote(null);
    const r = await topUp(Math.round(value * 100) / 100);
    setBusy(false);
    if (r.ok) { setNote({ ok: true, text: `$${value.toFixed(2)} added to your wallet.` }); setCustom(''); await load(1).catch(() => {}); }
    else if (!r.canceled) setNote({ ok: false, text: r.message });
  };

  const redeem = async () => {
    if (!gift.trim()) return;
    setBusy(true);
    setNote(null);
    try {
      await api.redeemGiftCard(gift.trim().toUpperCase());
      setGift('');
      setNote({ ok: true, text: 'Gift card added to your wallet.' });
      await load(1);
    } catch (e) {
      setNote({ ok: false, text: e instanceof Error ? e.message : 'That code could not be redeemed.' });
    } finally { setBusy(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Wallet" subtitle="Top up, pay and see your history" icon="wallet">
        <View style={{ marginTop: 10, alignSelf: 'flex-start' }}><BackButton /></View>
      </ScreenHeader>
      {!user ? (
        <Empty icon="wallet-outline" title="Sign in to use your wallet" action="Sign in" onPress={() => router.push('/sign-in')} />
      ) : loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
      ) : (
        <FlatList style={{ flex: 1 }}
          data={tx}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<Refresh refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReachedThreshold={0.6}
          onEndReached={() => { if (page < pages && !more) { setMore(true); load(page + 1).catch(() => {}).finally(() => setMore(false)); } }}
          ListHeaderComponent={
            <View style={{ gap: 12, marginBottom: 8 }}>
              <View style={w.balance}>
                <Text style={w.balLabel}>Available balance</Text>
                <Text style={w.balAmt}>${(balance ?? 0).toFixed(2)}</Text>
                <Text style={w.balSub}>Use it at checkout, or keep paying by card — you can switch any time.</Text>
              </View>

              <View style={w.card}>
                <Text style={w.h}>Add money</Text>
                <View style={w.chips}>
                  {PRESETS.map((p) => (
                    <Pressable key={p} onPress={() => { setAmount(p); setCustom(''); }} style={[w.chip, !custom && amount === p && w.chipOn]} accessibilityState={{ selected: !custom && amount === p }}>
                      <Text style={[w.chipText, !custom && amount === p && { color: colors.ink }]}>${p}</Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput value={custom} onChangeText={(v) => setCustom(v.replace(/[^0-9.]/g, ''))} placeholder={`Other amount ($${min}–$${max})`} placeholderTextColor={colors.muted} keyboardType="decimal-pad" style={w.input} accessibilityLabel="Custom amount" />
                <Pressable onPress={doTopUp} disabled={busy} style={[w.cta, busy && { opacity: 0.6 }]} accessibilityRole="button">
                  {busy ? <ActivityIndicator color={colors.ink} /> : <><Ionicons name="card" size={17} color={colors.ink} /><Text style={w.ctaText}>Add {valid ? `$${value.toFixed(2)}` : 'money'} with card</Text></>}
                </Pressable>
              </View>

              <View style={w.card}>
                <Text style={w.h}>Gift card</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput value={gift} onChangeText={setGift} autoCapitalize="characters" placeholder="Enter code" placeholderTextColor={colors.muted} style={[w.input, { flex: 1 }]} accessibilityLabel="Gift card code" />
                  <Pressable onPress={redeem} disabled={busy || !gift.trim()} style={[w.redeem, (!gift.trim() || busy) && { opacity: 0.5 }]}><Text style={w.redeemText}>Redeem</Text></Pressable>
                </View>
              </View>

              {note ? <View style={[w.note, { backgroundColor: note.ok ? '#E3F1EA' : '#FDE8E6' }]}><Ionicons name={note.ok ? 'checkmark-circle' : 'alert-circle'} size={18} color={note.ok ? colors.green : '#B3261E'} /><Text style={[w.noteText, { color: note.ok ? '#1D5A3A' : '#8C1D18' }]}>{note.text}</Text></View> : null}

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                <Text style={w.h}>Wallet activity</Text>
                <Pressable onPress={() => router.push('/payments')} hitSlop={8}><Text style={w.link}>All payments</Text></Pressable>
              </View>
            </View>
          }
          renderItem={({ item }) => <TxRow tx={item} />}
          ListEmptyComponent={<Text style={w.empty}>No wallet activity yet.</Text>}
          ListFooterComponent={more ? <ActivityIndicator color={colors.brand} style={{ marginVertical: 12 }} /> : undefined}
        />
      )}
    </View>
  );
}

const w = StyleSheet.create({
  balance: { backgroundColor: colors.ink, borderRadius: 20, padding: 18, gap: 2 },
  balLabel: { fontFamily: fonts.medium, fontSize: 12, color: '#D9D3C8' },
  balAmt: { fontFamily: fonts.display, fontSize: 34, color: '#FFFFFF' },
  balSub: { fontFamily: fonts.regular, fontSize: 12, color: '#D9D3C8', marginTop: 4 },
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 14, gap: 10 },
  h: { fontFamily: fonts.display, fontSize: 16, color: colors.ink },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1, height: 40, borderRadius: 12, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  chipOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink2 },
  input: { height: 46, borderRadius: 12, backgroundColor: colors.bg, paddingHorizontal: 14, fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  cta: { height: 48, borderRadius: 14, backgroundColor: colors.brand, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ctaText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  redeem: { height: 46, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  redeemText: { fontFamily: fonts.bold, fontSize: 13, color: '#FFFFFF' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 12 },
  noteText: { flex: 1, fontFamily: fonts.medium, fontSize: 13 },
  link: { fontFamily: fonts.bold, fontSize: 13, color: colors.brandText },
  empty: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 20 },
});
