import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, type Quote } from '@/api';
import { useAuth } from '@/auth';
import { useCart } from '@/cart';
import { useCatalog } from '@/catalog';
import { ensureAddressId } from '@/checkoutAddress';
import { ModeToggle } from '@/components/ModeToggle';
import { Pressy as Pressable } from '@/components/Pressy';
import { Refresh } from '@/components/Refresh';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Monogram, PrimaryButton, Stepper } from '@/components/ui';
import { money } from '@/data';
import { usePullRefresh } from '@/hooks';
import { usePayments } from '@/payments';
import { colors, fonts } from '@/theme';
import type { SavedCard } from '../cards';
import { cardCache } from '@/cardCache';

type Method = 'CARD' | 'WALLET';
type ServerQuote = Quote & { ageConfirmationRequired?: boolean; minAge?: number; availableFulfilment?: unknown };
const TIPS = [0, 10, 15, 20];

/** Delivery/pickup slots for a closed store: from its next opening (or 40 min from now), every 30 min. */
function slotsFor(nextOpening?: string) {
  const base = Math.max(nextOpening ? new Date(nextOpening).getTime() : 0, Date.now() + 40 * 60000);
  const start = Math.ceil(base / (15 * 60000)) * 15 * 60000;
  return Array.from({ length: 6 }, (_, i) => new Date(start + i * 30 * 60000));
}
const slotLabel = (d: Date) => d.toLocaleString('en-CA', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
const round2 = (n: number) => Math.round(n * 100) / 100;
const brand = (b?: string) => (b ? b.charAt(0).toUpperCase() + b.slice(1) : 'Card');

export default function Checkout() {
  const cart = useCart();
  const { user } = useAuth();
  const { deliverTo } = useCatalog();
  const { payIntent } = usePayments();
  const pickup = cart.mode === 'pickup';
  const store = cart.groups[0]?.store;
  const multiStore = cart.groups.length > 1;
  const multiStoreEarly = multiStore;
  const slots = useMemo(() => slotsFor(store?.nextOpening), [store?.nextOpening]);

  const [tipPct, setTipPct] = useState(15);
  const [method, setMethod] = useState<Method>('CARD'); // card is the primary way to pay
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [cardId, setCardId] = useState<string>('new'); // a saved card id, or 'new' for the Stripe sheet
  const [saveCard, setSaveCard] = useState(true);
  const [changingCard, setChangingCard] = useState(false); // the list of cards is shown only when the customer taps Change
  const [balance, setBalance] = useState(0);
  const [promo, setPromo] = useState('');
  const [appliedPromo, setAppliedPromo] = useState('');
  const [kitchenNote, setKitchenNote] = useState('');
  const [ageOk, setAgeOk] = useState(false);
  const [slot, setSlot] = useState<string | null>(null);
  const [quoteState, setQuote] = useState<ServerQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [placing, setPlacing] = useState(false);
  const addressIdRef = useRef<string | null>(null);
  const [nonce, setNonce] = useState(0); // bumping it re-prices the cart

  // wallet + saved cards, refreshed every time the screen is shown (e.g. after a top-up). The cards kept on the phone show at once, then the server's list replaces them.
  const uid = user?.id;
  useEffect(() => {
    if (!uid) return;
    void cardCache.load(uid).then((c) => {
      if (!c.cards.length) return;
      setCards((cur) => (cur.length ? cur : c.cards));
      setCardId((cur) => (cur !== 'new' ? cur : c.cards.find((x) => x.id === c.chosen)?.id ?? c.cards.find((x) => x.isDefault)?.id ?? c.cards[0].id));
    });
  }, [uid]);

  // keep the cards (and the chosen one) on the phone for the next checkout
  useEffect(() => {
    if (uid && cards.length) void cardCache.save(uid, { cards, chosen: cardId === 'new' ? null : cardId });
  }, [uid, cards, cardId]);
  const loadMoney = useCallback(() => {
    if (!user) return Promise.resolve();
    api.wallet({ limit: 1 }).then((w: any) => setBalance(Number(w?.balance ?? 0))).catch(() => {});
    return api.listCards().then((r: any) => {
      const list = ((r?.data ?? r ?? []) as SavedCard[]);
      setCards(list);
      setCardId((cur) => (cur !== 'new' && list.some((c) => c.id === cur) ? cur : (list.find((c) => c.isDefault) ?? list[0])?.id ?? 'new'));
      void cardCache.save(user.id, { cards: list, chosen: null });
    }).catch(() => {});
  }, [user]);
  useFocusEffect(useCallback(() => { void loadMoney(); }, [loadMoney]));
  const { refreshing, onRefresh } = usePullRefresh(async () => { setNonce((n) => n + 1); await loadMoney(); });

  const tip = pickup ? 0 : round2((cart.subtotal * tipPct) / 100);
  const lineKey = cart.groups.map((g) => g.lines.map((l) => `${l.item.id}:${l.qty}`).join(',')).join('|');
  const body = useMemo(() => ({
    type: pickup ? 'PICKUP' : 'DELIVERY',
    tip: tip || undefined,
    useWallet: method === 'WALLET',
    promoCode: appliedPromo || undefined,
    dropoffNotes: !pickup ? deliverTo?.notes : undefined,
    ageConfirmed: ageOk || undefined,
    scheduledFor: slot ?? undefined,
  }), [pickup, tip, method, appliedPromo, deliverTo?.notes, ageOk, slot]);

  // Price the cart on the server (the same maths that charges the card), debounced.
  const quoteRun = useRef(0);
  useEffect(() => {
    if (!user || !store?.apiId || cart.groups.length !== 1) return;
    const id = ++quoteRun.current;
    const t = setTimeout(async () => {
      setQuoting(true);
      try {
        let addressId: string | undefined;
        if (!pickup) {
          if (!deliverTo) throw new Error('Choose a delivery address on the Home screen first.');
          const aid = await ensureAddressId(deliverTo);
          if (!aid) throw new Error('This delivery address needs a street address and postal code.');
          addressId = aid;
          addressIdRef.current = aid;
        }
        await api.syncCart({ restaurantId: store.apiId!, items: cart.groups[0].lines.map((l) => ({ menuItemId: l.item.id, quantity: l.qty })), promoCode: appliedPromo || null });
        const q = (await api.quote({ ...body, addressId })) as ServerQuote;
        if (id === quoteRun.current) { setQuote(q); setQuoteError(''); }
      } catch (e) {
        if (id === quoteRun.current) { setQuote(null); setQuoteError(e instanceof Error ? e.message : 'Could not price your order.'); }
      } finally {
        if (id === quoteRun.current) setQuoting(false);
      }
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lineKey stands for the cart lines; body for every priced option
  }, [user, store?.apiId, lineKey, body, deliverTo, pickup, appliedPromo, cart.groups.length, nonce]);

  if (cart.count === 0) {
    return (
      <SafeAreaView style={[c.screen, { alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 }]}>
        <Ionicons name="bag-handle-outline" size={41} color={colors.brandDeep} />
        <Text style={c.h1}>Your cart is empty</Text>
        <Text style={[c.muted, { textAlign: 'center' }]}>Add a meal, then top it up with groceries — one delivery fee.</Text>
        <PrimaryButton label="Start shopping" onPress={() => router.navigate('/')} />
      </SafeAreaView>
    );
  }

  const quote = user && store?.apiId && !multiStoreEarly ? quoteState : null;
  const total = quote ? Number(quote.total) : 0;
  const walletUsed = quote ? Number(quote.walletUsed) : 0;
  const cardAmount = quote ? round2(total - walletUsed) : 0;
  const needsCard = cardAmount > 0.009;
  const savedCard = cards.find((x) => x.id === cardId);
  const ageBlocked = !!quote?.ageConfirmationRequired && !ageOk;
  const closed = store?.isOpen === false;
  const needSlot = closed && !slot;
  const canPlace = !!user && !!quote && !quoting && !placing && !multiStore && !ageBlocked && !needSlot;

  async function place() {
    if (!user) return router.push('/sign-in');
    if (!quote || !store?.apiId) return;
    Keyboard.dismiss();
    setPlacing(true);
    try {
      const addressId = pickup ? undefined : addressIdRef.current ?? undefined;
      const common = { ...body, addressId, customerNotes: kitchenNote.trim() || undefined };
      let paymentIntentId: string | undefined;
      if (needsCard) {
        // 1) the server prices the cart again and creates the Stripe payment for the card part (total − wallet)
        const intent = await api.paymentIntent({ ...common, paymentMethodId: savedCard?.id, saveCard: savedCard ? undefined : saveCard });
        if (intent.required) {
          if (!intent.clientSecret || !intent.intentId) throw new Error('Card payments are not available right now.');
          // 2) the customer pays: a saved card is confirmed directly, a new card uses the Stripe payment sheet
          const paid = await payIntent(intent.clientSecret, { savedPaymentMethodId: savedCard?.id, email: user.email });
          if (!paid.ok) {
            if (!paid.canceled) Alert.alert('Payment not completed', paid.message);
            return;
          }
          paymentIntentId = intent.intentId;
        }
      }
      // 3) place the order with the confirmed payment
      const order = await api.placeOrder({ ...common, paymentMethod: needsCard ? 'CARD' : 'WALLET', paymentIntentId });
      cart.clear();
      router.replace({ pathname: '/order/[id]', params: { id: order.id } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Please try again.';
      Alert.alert('Could not place order', msg);
    } finally {
      setPlacing(false);
    }
  }

  const walletHint = !user ? '' : balance <= 0 ? 'No balance yet — add money in Wallet' : balance >= total && total > 0 ? 'Covers this whole order' : `Pays $${balance.toFixed(2)}, the rest by card`;

  return (
    <View style={c.screen}>
      <ScreenHeader title="Checkout" subtitle={`${cart.count} item${cart.count === 1 ? '' : 's'}${store ? ` · ${store.name}` : ''}`} icon="bag-handle" right={<ModeToggle />} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 130, gap: 12 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" refreshControl={<Refresh refreshing={refreshing} onRefresh={onRefresh} />}>
        {multiStore && (
          <View style={[c.banner, { backgroundColor: '#FFE8DC' }]}>
            <Ionicons name="alert-circle" size={20} color="#5C2306" />
            <Text style={[c.muted, { flex: 1, color: '#5C2306' }]}>One store per order for now — remove items from the other store to continue.</Text>
          </View>
        )}

        <View style={c.card}>
          {cart.groups.map((g, gi) => (
            <View key={g.store.id} style={gi > 0 ? c.groupLine : undefined}>
              <View style={c.groupHead}>
                <Monogram store={g.store} size={28} square />
                <Text style={[c.bold, { flex: 1 }]}>{g.store.name}</Text>
                <Text style={c.small}>{pickup ? g.store.address : g.store.fullAddress ?? ''}</Text>
              </View>
              {g.lines.map(({ item, qty }) => (
                <View key={item.id} style={c.line}>
                  <View style={{ flex: 1 }}>
                    <Text style={c.body}>{item.name}</Text>
                    <Text style={c.small}>{money(item.price * qty)}</Text>
                  </View>
                  <Stepper item={item} />
                </View>
              ))}
            </View>
          ))}
        </View>

        {!pickup && (
          <>
            <Text style={c.label}>Driver tip <Text style={c.small}>· 100% goes to your driver</Text></Text>
            <View style={c.row3}>
              {TIPS.map((p) => (
                <Pressable key={p} onPress={() => setTipPct(p)} style={[c.tip, tipPct === p && c.tipOn]} accessibilityRole="radio" accessibilityState={{ checked: tipPct === p }}>
                  <Text style={[c.bold, tipPct === p && { color: '#FFFFFF' }]}>{p === 0 ? 'None' : `${p}%`}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Text style={c.label}>Promo code</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput value={promo} onChangeText={(v) => setPromo(v.toUpperCase())} placeholder="Enter code" placeholderTextColor={colors.muted} autoCapitalize="characters" style={[c.input, { flex: 1 }]} accessibilityLabel="Promo code" />
          <Pressable onPress={() => setAppliedPromo(appliedPromo ? '' : promo.trim())} style={c.applyBtn} accessibilityRole="button">
            <Text style={c.applyText}>{appliedPromo ? 'Remove' : 'Apply'}</Text>
          </Pressable>
        </View>
        <TextInput value={kitchenNote} onChangeText={setKitchenNote} placeholder="Notes for the restaurant (allergies, no onions…)" placeholderTextColor={colors.muted} style={c.input} accessibilityLabel="Notes for the restaurant" />

        {closed && (
          <View style={c.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Ionicons name="time" size={18} color={colors.brandDeep} />
              <Text style={[c.bold, { flex: 1 }]}>{store?.name} is closed right now</Text>
            </View>
            {store?.canSchedule === false ? (
              <Text style={c.muted}>It isn’t taking scheduled orders. Please come back when it opens{store?.nextOpening ? ` at ${slotLabel(new Date(store.nextOpening))}` : ''}.</Text>
            ) : (
              <>
                <Text style={[c.muted, { marginBottom: 8 }]}>Schedule your order for later:</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {slots.map((d) => {
                    const iso = d.toISOString();
                    return (
                      <Pressable key={iso} onPress={() => setSlot(iso)} style={[c.slot, slot === iso && c.slotOn]} accessibilityRole="radio" accessibilityState={{ checked: slot === iso }}>
                        <Text style={[c.slotText, slot === iso && { color: '#FFFFFF' }]}>{slotLabel(d)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        )}

        {/* ---- payment ---- */}
        <Text style={c.label}>Pay with</Text>
        <View style={c.card}>
          <Pressable onPress={() => setMethod('CARD')} style={c.method} accessibilityRole="radio" accessibilityState={{ checked: method === 'CARD' }}>
            <View style={[c.radio, method === 'CARD' && c.radioOn]}>{method === 'CARD' && <View style={c.radioDot} />}</View>
            <Ionicons name="card" size={20} color={colors.ink} />
            <View style={{ flex: 1 }}>
              <Text style={c.bold}>Credit / debit card</Text>
              <Text style={c.small}>Recommended · secure payment by Stripe</Text>
            </View>
            <View style={c.primaryTag}><Text style={c.primaryTagText}>Primary</Text></View>
          </Pressable>

          {method === 'CARD' && (
            <View style={c.sub}>
              {savedCard && !changingCard ? (
                <View style={[c.cardRow, { justifyContent: 'space-between' }]} testID="checkout-card">
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <Ionicons name="card-outline" size={20} color={colors.ink} />
                    <View style={{ flex: 1 }}>
                      <Text style={c.bold}>{brand(savedCard.brand)} •••• {savedCard.last4}</Text>
                      <Text style={c.small}>{savedCard.expMonth ? `Expires ${String(savedCard.expMonth).padStart(2, '0')}/${String(savedCard.expYear).slice(-2)}` : 'Saved card'}{savedCard.isDefault ? ' · default' : ''}</Text>
                    </View>
                  </View>
                  <Pressable onPress={() => setChangingCard(true)} accessibilityRole="button" accessibilityLabel="Change card" hitSlop={8}>
                    <Text style={c.link}>Change</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  {cards.map((cd) => (
                    <Pressable key={cd.id} onPress={() => { setCardId(cd.id); setChangingCard(false); }} style={c.cardRow} accessibilityRole="radio" accessibilityState={{ checked: cardId === cd.id }}>
                      <View style={[c.radio, cardId === cd.id && c.radioOn]}>{cardId === cd.id && <View style={c.radioDot} />}</View>
                      <Text style={c.body}>{brand(cd.brand)} •••• {cd.last4}</Text>
                      <Text style={c.small}>{cd.expMonth ? `${String(cd.expMonth).padStart(2, '0')}/${String(cd.expYear).slice(-2)}` : ''}</Text>
                    </Pressable>
                  ))}
                  <Pressable onPress={() => setCardId('new')} style={c.cardRow} accessibilityRole="radio" accessibilityState={{ checked: cardId === 'new' }}>
                    <View style={[c.radio, cardId === 'new' && c.radioOn]}>{cardId === 'new' && <View style={c.radioDot} />}</View>
                    <Ionicons name="add-circle-outline" size={18} color={colors.ink} />
                    <Text style={c.body}>{cards.length ? 'Use a new card' : 'Enter card at payment'}</Text>
                  </Pressable>
                  {cardId === 'new' && (
                    <View style={[c.cardRow, { justifyContent: 'space-between' }]}>
                      <Text style={c.small}>Save this card for next time</Text>
                      <Switch value={saveCard} onValueChange={setSaveCard} trackColor={{ true: colors.brand, false: colors.line }} thumbColor="#FFFFFF" />
                    </View>
                  )}
                  {savedCard && changingCard && (
                    <Pressable onPress={() => setChangingCard(false)} accessibilityRole="button" hitSlop={8}>
                      <Text style={c.link}>Done</Text>
                    </Pressable>
                  )}
                </>
              )}
            </View>
          )}

          <View style={c.divider} />

          <Pressable onPress={() => (balance > 0 || method === 'WALLET' ? setMethod('WALLET') : router.push('/wallet'))} style={c.method} accessibilityRole="radio" accessibilityState={{ checked: method === 'WALLET' }}>
            <View style={[c.radio, method === 'WALLET' && c.radioOn]}>{method === 'WALLET' && <View style={c.radioDot} />}</View>
            <Ionicons name="wallet" size={20} color={colors.ink} />
            <View style={{ flex: 1 }}>
              <Text style={c.bold}>Forky wallet · ${balance.toFixed(2)}</Text>
              <Text style={c.small}>{walletHint}</Text>
            </View>
            {balance <= 0 && <Text style={c.link}>Add money</Text>}
          </Pressable>
        </View>

        {quote?.ageConfirmationRequired && (
          <View style={[c.card, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
            <Switch value={ageOk} onValueChange={setAgeOk} trackColor={{ true: colors.brand, false: colors.line }} thumbColor="#FFFFFF" />
            <Text style={[c.body, { flex: 1 }]}>I’m at least {quote.minAge ?? 19} years old. ID is checked on hand-over.</Text>
          </View>
        )}

        {/* ---- summary priced by the server ---- */}
        <View style={[c.card, { gap: 8 }]}>
          {quoting && !quote ? <ActivityIndicator color={colors.brand} /> : null}
          {quoteError ? (
            <View style={c.errRow}>
              <Ionicons name="alert-circle" size={18} color="#B3261E" />
              <Text style={c.errText}>{quoteError}</Text>
            </View>
          ) : null}
          {quote && (
            <>
              <Row k="Subtotal" v={money(Number(quote.subtotal))} />
              {!pickup && <Row k="Delivery fee" v={money(Number(quote.deliveryFee))} />}
              <Row k="Service fee" v={money(Number(quote.serviceFee))} />
              {Number(quote.smallOrderFee) > 0 && <Row k="Small order fee" v={money(Number(quote.smallOrderFee))} />}
              <Row k="Tax" v={money(Number(quote.taxAmount))} />
              {!pickup && Number(quote.tip) > 0 && <Row k="Driver tip" v={money(Number(quote.tip))} />}
              {Number(quote.discountTotal) > 0 && <Row k="Discount" v={`−${money(Number(quote.discountTotal))}`} green />}
              <View style={c.totalLine} />
              <Row k="Total" v={money(total)} bold />
              {walletUsed > 0 && <Row k="Paid from wallet" v={`−${money(walletUsed)}`} green />}
              {needsCard && walletUsed > 0 && <Row k="Charged to card" v={money(cardAmount)} bold />}
              {quote.etaMinutes ? <Text style={c.small}>{pickup ? 'Ready in about' : 'Arrives in about'} {quote.etaMinutes} min{!pickup && quote.distanceKm ? ` · ${Number(quote.distanceKm).toFixed(1)} km` : ''}</Text> : null}
            </>
          )}
        </View>

        <PrimaryButton
          label={placing ? 'Processing…' : !user ? 'Sign in to order' : needSlot ? 'Choose a time above' : needsCard ? (pickup ? 'Pay & place pickup order' : 'Pay & place order') : 'Place order with wallet'}
          right={quote ? money(needsCard ? cardAmount : total) : undefined}
          onPress={placing || (!!user && !canPlace) ? undefined : place}
        />
      </ScrollView>
    </View>
  );
}

function Row({ k, v, bold, green }: { k: string; v: string; bold?: boolean; green?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={bold ? c.bold : c.muted}>{k}</Text>
      <Text style={[bold ? c.bold : c.body, green && { color: colors.green }]}>{v}</Text>
    </View>
  );
}

const c = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  h1: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  label: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink, marginTop: 6 },
  body: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  bold: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  muted: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  small: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  link: { fontFamily: fonts.bold, fontSize: 13, color: colors.brandText },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14 },
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 14 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 4 },
  groupLine: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.lineSoft },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  row3: { flexDirection: 'row', gap: 8 },
  tip: { flex: 1, height: 42, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  tipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  input: { height: 46, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  applyBtn: { height: 46, paddingHorizontal: 18, borderRadius: 12, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  applyText: { fontFamily: fonts.bold, fontSize: 13, color: '#FFFFFF' },
  method: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  slot: { paddingHorizontal: 12, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, justifyContent: 'center' },
  slotOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  slotText: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.ink },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#B9B2A6', alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.brand },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand },
  primaryTag: { backgroundColor: colors.brandTint, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  primaryTagText: { fontFamily: fonts.bold, fontSize: 10.5, color: colors.brandText },
  sub: { marginLeft: 30, marginTop: 4, gap: 2 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  divider: { height: 1, backgroundColor: colors.lineSoft, marginVertical: 8 },
  totalLine: { height: 1, backgroundColor: colors.lineSoft, marginVertical: 4 },
  errRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FDE8E6', borderRadius: 12, padding: 10 },
  errText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: '#8C1D18' },
});
