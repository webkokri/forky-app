import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Pressy as Pressable } from '@/components/Pressy';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart } from '@/cart';
import { AddressRow, BackButton, Monogram, Photo, Stepper } from '@/components/ui';
import { ModeToggle } from '@/components/ModeToggle';
import { useCatalog } from '@/catalog';
import { useFavorites } from '@/favorites';
import { nearEnd, usePullRefresh } from '@/hooks';
import { Refresh } from '@/components/Refresh';
import { money, type Store } from '@/data';
import { colors, fonts } from '@/theme';

export default function StoreScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getStore, getItems, loadStore, loading } = useCatalog();
  const store = getStore(id ?? '');
  const hasMenu = getItems(id ?? '').length > 0;
  useEffect(() => { if (id && !hasMenu) void loadStore(id); }, [id, hasMenu, loadStore]);
  if (!store && loading) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.brand} />
      </SafeAreaView>
    );
  }
  if (!store) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Text style={st.name}>Store not found</Text>
        <BackButton />
      </SafeAreaView>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {store.kind === 'restaurant' ? <Restaurant store={store} /> : <Shop store={store} />}
      <CartBar />
    </View>
  );
}

function Restaurant({ store }: { store: Store }) {
  const insets = useSafeAreaInsets();
  const { mode } = useCart();
  const { getItems, loadStore } = useCatalog();
  const { refreshing, onRefresh } = usePullRefresh(() => loadStore(store.id, true));
  const { isFavorite, toggle } = useFavorites();
  const [limit, setLimit] = useState(20);
  const menu = getItems(store.id);
  const sections = useMemo(() => [...new Set(menu.map((m) => m.section))], [menu]);
  const [picked, setTab] = useState<string>();
  const tab = picked ?? sections[0];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 180 }} showsVerticalScrollIndicator={false} scrollEventThrottle={200} onScroll={(e) => { if (nearEnd(e, 500)) setLimit((n) => n + 20); }} refreshControl={<Refresh refreshing={refreshing} onRefresh={onRefresh} />}>
      <Photo tint={store.photo} uri={store.bannerUrl} height={190 + insets.top} rounded={0}>
        <View style={[st.topBar, { top: insets.top + 8 }]}>
          <BackButton />
          <Pressable scaleTo={0.75} style={st.circle} onPress={() => void toggle(store.apiId)} accessibilityLabel={`Save ${store.name}`}>
            <Ionicons name={isFavorite(store.apiId) ? 'heart' : 'heart-outline'} size={17} color={isFavorite(store.apiId) ? '#E5484D' : colors.ink} />
          </Pressable>
        </View>
      </Photo>

      <View style={st.infoCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Monogram store={store} size={44} square />
          <View style={{ flex: 1 }}>
            <Text style={st.name}>{store.name}</Text>
            <Text style={st.sub}>{store.cuisine} · {store.distanceKm} km</Text>
          </View>
        </View>
        <AddressRow store={store} />
        <View style={st.stats}>
          <Stat top={`★ ${store.rating ? store.rating.toFixed(1) : 'New'}`} bottom="rating" />
          <Stat top={mode === 'pickup' ? store.pickupEta : store.deliveryEta} bottom={mode === 'pickup' ? 'until ready' : 'delivery'} />
          <Stat top={mode === 'pickup' ? 'Free' : money(store.deliveryFee)} bottom={mode === 'pickup' ? 'pickup' : 'fee'} />
        </View>
        <View style={{ alignSelf: 'flex-start' }}>
          <ModeToggle />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.tabs}>
        {sections.map((sec) => (
          <Pressable key={sec} onPress={() => setTab(sec)} style={[st.tab, tab === sec && st.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: tab === sec }}>
            <Text style={[st.tabText, tab === sec && st.tabTextOn]}>{sec}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: 16 }}>
        {menu
          .filter((m) => m.section === tab)
          .slice(0, limit)
          .map((m) => (
            <View key={m.id} style={st.menuRow}>
              <View style={{ flex: 1, gap: 4 }}>
                {m.badge ? <Text style={st.badge}>{m.badge}</Text> : null}
                <Text style={st.itemName}>{m.name}</Text>
                {m.description ? <Text style={st.sub}>{m.description}</Text> : null}
                <Text style={st.price}>{money(m.price)}</Text>
              </View>
              <View style={[st.thumb, { backgroundColor: m.tint, overflow: 'visible' }]}>
                {m.imageUrl ? <Image source={{ uri: m.imageUrl }} style={[StyleSheet.absoluteFill, { borderRadius: 15 }]} /> : null}
                <View style={st.thumbBtn}>
                  <Stepper item={m} dark />
                </View>
              </View>
            </View>
          ))}
      </View>
    </ScrollView>
  );
}

function Shop({ store }: { store: Store }) {
  const { getItems, loadStore } = useCatalog();
  const { refreshing, onRefresh } = usePullRefresh(() => loadStore(store.id, true));
  const { isFavorite, toggle } = useFavorites();
  const [limit, setLimit] = useState(24);
  const products = getItems(store.id);
  const aisles = [...new Set(products.map((p) => p.section))];
  const [aisle, setAisle] = useState<string | null>(null);
  const filtered = aisle ? products.filter((p) => p.section === aisle) : products;
  const shown = filtered.slice(0, limit);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 180 }} showsVerticalScrollIndicator={false} scrollEventThrottle={200} onScroll={(e) => { if (nearEnd(e, 500)) setLimit((n) => n + 24); }} refreshControl={<Refresh refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={st.shopHead}>
          <BackButton />
          <Monogram store={store} size={37} square />
          <View style={{ flex: 1 }}>
            <Text style={[st.name, { fontSize: 17 }]}>{store.name}</Text>
            <Text style={st.sub}>{store.cuisine} · {store.hours}</Text>
          </View>
          <Pressable scaleTo={0.75} style={st.circle} onPress={() => void toggle(store.apiId)} accessibilityLabel={`Save ${store.name}`}>
            <Ionicons name={isFavorite(store.apiId) ? 'heart' : 'heart-outline'} size={17} color={isFavorite(store.apiId) ? '#E5484D' : colors.ink} />
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 10 }}><AddressRow store={store} /></View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.tabs}>
          {[null, ...aisles].map((a) => (
            <Pressable key={a ?? 'all'} onPress={() => setAisle(a)} style={[st.tab, aisle === a && st.tabOn]}>
              <Text style={[st.tabText, aisle === a && st.tabTextOn]}>{a ?? 'All'}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {products.length === 0 ? (
          <Text style={[st.sub, { padding: 16 }]}>This store’s catalogue is coming soon.</Text>
        ) : (
          <View style={st.grid}>
            {shown.map((p) => (
              <View key={p.id} style={st.product}>
                <View style={[st.productImg, { backgroundColor: p.tint }]}>
                  {p.imageUrl ? <Image source={{ uri: p.imageUrl }} style={[StyleSheet.absoluteFill, { borderRadius: 10 }]} /> : null}
                  <View style={{ position: 'absolute', right: 6, bottom: 6 }}>
                    <Stepper item={p} dark />
                  </View>
                </View>
                <Text style={st.price}>{money(p.price)}</Text>
                <Text style={st.itemName}>{p.name}</Text>
                <Text style={st.sub}>{p.size}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={st.subNote}>
          <Ionicons name="swap-horizontal" size={15} color={colors.ink2} />
          <Text style={[st.sub, { flex: 1, color: colors.ink2 }]}>
            If an item is out of stock: <Text style={{ fontFamily: fonts.bold }}>Replace with best match</Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ top, bottom }: { top: string; bottom: string }) {
  return (
    <View style={st.stat}>
      <Text style={st.statTop}>{top}</Text>
      <Text style={st.statBottom}>{bottom}</Text>
    </View>
  );
}

/** Floating cart bar + "combine" nudge, shared by restaurant and shop screens. */
function CartBar() {
  const insets = useSafeAreaInsets();
  const { count, subtotal, groups } = useCart();
  if (count === 0) return null;
  const multi = groups.length > 1;
  const hasGrocery = groups.some((g) => g.store.kind === 'grocery');

  return (
    <View style={[st.cartWrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {!hasGrocery && (
        <Pressable style={st.nudge} onPress={() => router.push('/explore')}>
          <Ionicons name="basket-outline" size={15} color="#7A4F00" />
          <Text style={[st.sub, { flex: 1, color: colors.ink }]}>
            <Text style={{ fontFamily: fonts.bold }}>Need groceries?</Text> Add a grocery store — no extra delivery fee.
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.ink} />
        </Pressable>
      )}
      <Pressable style={st.cartBtn} onPress={() => router.navigate('/cart')} accessibilityRole="button">
        {/* left side takes the remaining width and truncates; the price never shrinks, so it can't be pushed off-screen */}
        <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={st.count}><Text style={st.countText}>{count}</Text></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.cartText} numberOfLines={1}>View cart{multi ? ` · ${groups.length} stores` : ''}</Text>
            {multi && <Text style={st.cartSub} numberOfLines={1} ellipsizeMode="tail">{groups.map((g) => g.store.name).join(' + ')}</Text>}
          </View>
        </View>
        <Text style={[st.cartText, { flexShrink: 0, marginLeft: 12 }]} numberOfLines={1}>{money(subtotal)}</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  topBar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  circle: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  infoCard: { marginTop: -32, marginHorizontal: 16, backgroundColor: colors.surface, borderRadius: 19, padding: 16, gap: 14 },
  name: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, lineHeight: 18 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: colors.bg, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 },
  statTop: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  statBottom: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },

  tabs: { paddingHorizontal: 16, paddingVertical: 16, gap: 8 },
  tab: { height: 40, paddingHorizontal: 16, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, justifyContent: 'center' },
  tabOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  tabText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  tabTextOn: { color: '#FFFFFF' },

  menuRow: { flexDirection: 'row', gap: 14, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  badge: { fontFamily: fonts.bold, fontSize: 11, color: '#8A3208', textTransform: 'uppercase', letterSpacing: 0.5 },
  itemName: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  price: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  thumb: { width: 89, height: 89, borderRadius: 15 },
  thumbBtn: { position: 'absolute', right: -6, bottom: -6 },

  shopHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12 },
  product: { width: '47.5%', backgroundColor: colors.surface, borderRadius: 15, padding: 8, gap: 4 },
  productImg: { height: 89, borderRadius: 10, marginBottom: 4 },
  subNote: { margin: 16, padding: 12, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: '#D6CFC3', backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 10 },

  cartWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12, gap: 8 },
  nudge: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: '#FDF1D8', borderWidth: 1, borderColor: '#F3DDAE' },
  cartBtn: { minHeight: 60, borderRadius: 14, backgroundColor: colors.brand, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 8 },
  count: { backgroundColor: colors.ink, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 },
  countText: { fontFamily: fonts.bold, fontSize: 13, color: '#FFFFFF' },
  cartText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  cartSub: { fontFamily: fonts.medium, fontSize: 11, color: colors.ink },
});
