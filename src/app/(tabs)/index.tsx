import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Pressy as Pressable } from '@/components/Pressy';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { useCart } from '@/cart';
import { useCatalog } from '@/catalog';
import { AddressSheet } from '@/components/AddressSheet';
import { ModeToggle } from '@/components/ModeToggle';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PromoCarousel } from '@/components/PromoCarousel';
import { ShopByCards } from '@/components/ShopByCards';
import { GroupLabel, groupHeading } from '@/components/StoreGroups';
import { SectionHeader, StoreCard } from '@/components/ui';
import { money } from '@/data';
import { byDistance, nearEnd, usePullRefresh, useSortedStores } from '@/hooks';
import { Refresh } from '@/components/Refresh';
import { isActive, statusInfo, type Order } from '@/orders';
import { useRealtime } from '@/realtime';
import { colors, fonts } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;
type Promo = { id: string; title: string; subtitle?: string; imageUrl?: string | null; code?: string };

const CUISINE_ICON: Record<string, IconName> = { pizza: 'pizza', burgers: 'fast-food', sushi: 'fish', japanese: 'fish', indian: 'flame', chinese: 'restaurant', mexican: 'flame', bakery: 'ice-cream', desserts: 'ice-cream', breakfast: 'cafe', 'coffee-tea': 'cafe', italian: 'pizza', halal: 'restaurant' };

export default function Home() {
  const { mode } = useCart();
  const { user } = useAuth();
  const { stores, storeTypes, place, offline, refresh } = useCatalog();
  const pickup = mode === 'pickup';
  const [addressOpen, setAddressOpen] = useState(false);
  const [q, setQ] = useState('');
  const { unread, on } = useRealtime();
  const [live, setLive] = useState<Order[]>([]);
  const [banners, setBanners] = useState<Promo[]>([]);
  const [dealPromos, setDealPromos] = useState<Promo[]>([]);
  const promos = [...banners, ...dealPromos];
  const [cuisines, setCuisines] = useState<{ slug: string; name: string }[]>([]);
  const all = useSortedStores({}, 10);

  // banners, cuisines and deals — loaded on start and again on pull-to-refresh
  const loadExtras = useCallback(async () => {
    await Promise.all([
      api.banners('HOME').then((list) => setBanners(list.map((b) => ({ id: b.id, title: b.title, subtitle: b.subtitle, imageUrl: b.imageUrl, code: typeof b.link === 'string' && b.link.startsWith('promo:') ? b.link.slice(6) : undefined })))).catch(() => {}),
      api.cuisines().then((l) => setCuisines(l.filter((c) => c.restaurantCount > 0).slice(0, 12))).catch(() => {}),
      api.deals().then((list) => setDealPromos(list.slice(0, 6).map((d) => ({
        id: String(d.id ?? d.code),
        title: d.description || d.name,
        subtitle: d.minSubtotal ? `Min order ${money(Number(d.minSubtotal))}` : 'Any order',
        code: d.code as string | undefined,
      })))).catch(() => {}),
    ]);
  }, []);
  useEffect(() => {
    void loadExtras();
  }, [loadExtras]);

  // orders in progress → a "Track your order" card, kept fresh by realtime status events
  const uid = user?.id;
  const loadLive = useCallback(async () => {
    if (!uid) return;
    await api.listOrders({ page: 1, limit: 10 }).then((r: any) => setLive(((r?.data ?? []) as Order[]).filter((o) => isActive(o.status)))).catch(() => {});
  }, [uid]);
  useEffect(() => {
    void loadLive();
    return on('order.status', () => { void loadLive(); });
  }, [loadLive, on]);

  const { refreshing, onRefresh } = usePullRefresh(async () => {
    all.retry();
    await Promise.all([refresh(), loadExtras(), loadLive()]);
  });

  // "Shop by" is built from the API's store types: the biggest food type is the hero, everything else is a tile.
  const food = storeTypes.filter((t) => !t.retail).sort((a, b) => b.count - a.count);
  const hero = food[0];
  const tiles = [...food.slice(1), ...storeTypes.filter((t) => t.retail)];
  const browse = (type?: string) => router.push({ pathname: '/explore', params: type ? { type } : {} });
  // Highlight rows: simply the nearest stores to the chosen address.
  const fast = [...stores].sort(byDistance).slice(0, 6);
  const topRated = [...stores].filter((x) => x.rating > 0).sort((a, b) => b.rating - a.rating).slice(0, 6);
  const search = () => router.push({ pathname: '/explore', params: { q: q.trim() } });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AddressSheet visible={addressOpen} onClose={() => setAddressOpen(false)} />
      <ScrollView style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={200}
        onScroll={(e) => { if (nearEnd(e)) all.loadMore(); }}
        refreshControl={<Refresh refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ScreenHeader>
          <View style={[s.row, { paddingTop: 8 }]}>
            <Image source={require('../../../assets/images/logo-round.png')} style={s.logo} accessibilityLabel="Forky" />
            <Pressable style={{ flex: 1 }} onPress={() => setAddressOpen(true)} accessibilityRole="button" accessibilityLabel="Change delivery address">
              <Text style={s.where}>{pickup ? 'Pick up near' : 'Delivering to'}</Text>
              <View style={[s.row, { gap: 4 }]}>
                <Text style={s.address} numberOfLines={1}>{place ?? 'Locating you…'}</Text>
                <Ionicons name="chevron-down" size={13} color={colors.ink} />
              </View>
            </Pressable>
            <Pressable scaleTo={0.78} style={s.iconBtn} onPress={() => (user ? router.push('/notifications') : router.push('/sign-in'))} accessibilityLabel="Notifications">
              <Ionicons name="notifications-outline" size={19} color={colors.ink} />
              {unread > 0 && <View style={s.dot}><Text style={s.dotText}>{unread > 9 ? '9+' : unread}</Text></View>}
            </Pressable>
          </View>
          <View style={[s.row, { marginTop: 12, gap: 8 }]}>
            <View style={s.search}>
              <Ionicons name="search" size={18} color={colors.muted} />
              <TextInput value={q} onChangeText={setQ} onSubmitEditing={search} returnKeyType="search" placeholder="Craving something?" placeholderTextColor={colors.muted} style={s.searchInput} accessibilityLabel="Search" />
            </View>
            <ModeToggle />
          </View>
        </ScreenHeader>

        {user && live.length > 0 && (
          <Pressable style={s.liveCard} onPress={() => router.push({ pathname: '/order/[id]', params: { id: live[0].id } })} accessibilityRole="button" accessibilityLabel="Track your order">
            <View style={s.liveIcon}><Ionicons name={statusInfo(live[0].status).icon} size={20} color={colors.ink} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.liveTitle}>{statusInfo(live[0].status).label}{live.length > 1 ? ` · ${live.length} orders` : ''}</Text>
              <Text style={s.liveSub} numberOfLines={1}>{live[0].restaurant?.name ?? (live[0] as any).restaurantName ?? 'Your order'} — tap to track live</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.ink} />
          </Pressable>
        )}

        {offline && stores.length === 0 && (
          <Pressable style={s.offline} onPress={() => void refresh()} accessibilityRole="button">
            <Ionicons name="cloud-offline-outline" size={20} color="#8A3208" />
            <View style={{ flex: 1 }}>
              <Text style={s.offlineTitle}>Can’t reach Forky</Text>
              <Text style={s.offlineSub}>Check your connection, then tap to try again.</Text>
            </View>
            <Ionicons name="refresh" size={18} color="#8A3208" />
          </Pressable>
        )}

        {/* Promotions from the API */}
        {promos.length > 0 && (
          <>
            <SectionHeader title="Offers for you" onSeeAll={() => router.push('/explore')} />
            <PromoCarousel items={promos} onPress={() => router.push('/explore')} />
          </>
        )}

        {/* Cuisines */}
        {cuisines.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.hList, { paddingTop: promos.length ? 16 : 14 }]}>
            {cuisines.map((c) => (
              <Pressable key={c.slug} style={s.chip} onPress={() => router.push({ pathname: '/explore', params: { cuisine: c.slug } })}>
                <View style={[s.chipIcon, { backgroundColor: colors.brandTintSoft }]}>
                  <Ionicons name={CUISINE_ICON[c.slug] ?? 'restaurant'} size={16} color={colors.brandDeep} />
                </View>
                <Text style={s.chipText}>{c.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Shop by — categories come from the API */}
        {hero && (
          <>
            <Text style={[s.h2, { marginHorizontal: 16, marginTop: 24, marginBottom: 12 }]}>Shop by</Text>
            <ShopByCards hero={hero} tiles={tiles} pickup={pickup} onSelect={(type) => browse(type)} />
          </>
        )}

        {/* Combine & save */}
        <Pressable style={s.combine} onPress={() => browse(storeTypes.find((t) => t.retail)?.type)} accessibilityRole="button">
          <View style={{ flexDirection: 'row' }}>
            <View style={[s.stack, { backgroundColor: '#FFE8DC' }]}><Ionicons name="restaurant" size={17} color="#8A3208" /></View>
            <View style={[s.stack, { backgroundColor: colors.green, marginLeft: -14 }]}><Ionicons name="basket" size={17} color="#FFFFFF" /></View>
            <View style={[s.stack, { backgroundColor: colors.brand, marginLeft: -14 }]}><Ionicons name="add" size={18} color={colors.ink} /></View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.combineTitle}>Combine &amp; save</Text>
            <Text style={s.combineSub}>Meal + groceries in one trip, one delivery fee.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.brand} />
        </Pressable>

        {/* Fast */}
        {fast.length > 0 && (
          <>
            <SectionHeader title="Closest to you" onSeeAll={() => router.push('/explore')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.hList, { paddingTop: 0, gap: 12 }]}>
              {fast.map((st) => <StoreCard key={st.id} store={st} />)}
            </ScrollView>
          </>
        )}

        {/* Top rated */}
        {topRated.length > 0 && (
          <>
            <SectionHeader title="Top rated" onSeeAll={() => router.push('/explore')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.hList, { paddingTop: 0, gap: 12 }]}>
              {topRated.map((st) => <StoreCard key={st.id} store={st} />)}
            </ScrollView>
          </>
        )}

        {/* All stores — keeps loading as you scroll */}
        <SectionHeader title="Stores around you" link={all.total ? `${all.total} stores` : undefined} />
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          {all.items.map((g, i) => {
            const head = groupHeading(all.items, i);
            return (
              <View key={g.id} style={{ gap: 12 }}>
                {head ? <GroupLabel {...head} /> : null}
                <StoreCard store={g} full />
              </View>
            );
          })}
          {all.loading && <ActivityIndicator color={colors.brand} style={{ marginVertical: 20 }} />}
          {all.loadingMore && <ActivityIndicator color={colors.brand} style={{ marginVertical: 12 }} />}
          {!all.loading && all.items.length === 0 && <Text style={s.small}>No stores found near this address.</Text>}
          {!all.hasMore && all.items.length > 0 && <Text style={[s.small, { textAlign: 'center', marginTop: 4 }]}>You’ve seen all {all.items.length} stores nearby</Text>}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 40, height: 40, borderRadius: 20 },
  where: { fontFamily: fonts.medium, fontSize: 10.5, color: colors.muted },
  address: { fontFamily: fonts.bold, fontSize: 12.5, color: colors.ink },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.ink, borderWidth: 2, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  dotText: { fontFamily: fonts.heavy, fontSize: 9, color: '#FFFFFF' },
  search: { flex: 1, height: 42, borderRadius: 21, backgroundColor: colors.bg, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8 },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 12.5, color: colors.ink, minWidth: 0 },

  h2: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  hero: { height: 129, borderRadius: 22, padding: 18, overflow: 'hidden' },
  blobA: { position: 'absolute', right: -30, top: -40, width: 146, height: 146, borderRadius: 73, backgroundColor: '#FF8A4C' },
  blobB: { position: 'absolute', right: 60, bottom: -50, width: 95, height: 95, borderRadius: 47, backgroundColor: '#FF7A30' },
  heroIcon: { position: 'absolute', right: 14, bottom: 8 },
  heroTitle: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  heroSub: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink, marginTop: 2 },
  heroArrow: { position: 'absolute', right: 16, top: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  countPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  countText: { fontFamily: fonts.bold, fontSize: 11, color: colors.ink },
  // No fixed height: tiles grow with their text and the row stretches them to equal height.
  tile: { minHeight: 112, borderRadius: 19, padding: 12, overflow: 'hidden', gap: 10 },
  tileDeco: { position: 'absolute', right: -8, top: -6 },
  tileIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  tileCount: { fontFamily: fonts.medium, fontSize: 11, opacity: 0.8 },
  tileBig: { flex: 1, height: 158, borderRadius: 19, padding: 16, overflow: 'hidden' },
  tileBlob: { position: 'absolute', right: -18, bottom: -18, width: 103, height: 103, borderRadius: 51, backgroundColor: '#FF8A4C' },
  tileTitle: { fontFamily: fonts.display, fontSize: 15, color: colors.ink },
  tileSub: { fontFamily: fonts.semibold, fontSize: 12, color: colors.ink, marginTop: 2 },
  tileWide: { height: 76, borderRadius: 19, padding: 14, justifyContent: 'space-between' },
  tileSmall: { flex: 1, borderRadius: 17, padding: 10, justifyContent: 'space-between' },
  tileSmallText: { fontFamily: fonts.bold, fontSize: 11, color: colors.ink },

  hList: { paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  chip: { height: 40, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 6, paddingRight: 14 },
  chipIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },

  combine: { marginHorizontal: 16, marginTop: 22, padding: 16, borderRadius: 19, backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', gap: 14 },
  stack: { width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  stackText: { fontFamily: fonts.heavy, fontSize: 13 },
  combineTitle: { fontFamily: fonts.display, fontSize: 15, color: '#FFFFFF' },
  combineSub: { fontFamily: fonts.regular, fontSize: 12, color: '#D9D3C8', marginTop: 2 },

  again: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, paddingRight: 14, borderRadius: 15, backgroundColor: colors.surface },
  againName: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  liveCard: { flexDirection: 'row', alignItems: 'center', gap: 12, margin: 16, marginBottom: 0, padding: 14, borderRadius: 18, backgroundColor: colors.brand },
  liveIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center' },
  liveTitle: { fontFamily: fonts.display, fontSize: 15, color: colors.ink },
  liveSub: { fontFamily: fonts.medium, fontSize: 12, color: colors.ink },
  offline: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 16, marginBottom: 0, padding: 14, borderRadius: 16, backgroundColor: '#FFE8DC' },
  offlineTitle: { fontFamily: fonts.bold, fontSize: 13, color: '#5C2306' },
  offlineSub: { fontFamily: fonts.regular, fontSize: 12, color: '#5C2306' },
  small: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },

  listCard: { marginHorizontal: 16, backgroundColor: colors.surface, borderRadius: 19, paddingHorizontal: 14, paddingVertical: 4 },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  rowMain: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
});
