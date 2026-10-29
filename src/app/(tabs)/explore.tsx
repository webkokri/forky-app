import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useCatalog } from '@/catalog';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Pressy as Pressable } from '@/components/Pressy';
import { ScreenHeader } from '@/components/ScreenHeader';
import { GroupLabel, groupHeading } from '@/components/StoreGroups';
import { StoreCard } from '@/components/ui';
import { usePullRefresh, useSortedStores, type StoreQuery } from '@/hooks';
import { Refresh } from '@/components/Refresh';
import { colors, fonts } from '@/theme';

const SORTS: { id: string; label: string }[] = [
  { id: 'distance', label: 'Nearest' },
  { id: 'rating', label: 'Top rated' },
  { id: 'eta', label: 'Fastest' },
];

export default function Explore() {
  // Chips come from the API's store types (label + live count), so new categories appear automatically.
  const { storeTypes, refresh } = useCatalog();
  const params = useLocalSearchParams<{ type?: string; q?: string; cuisine?: string }>();
  const [picked, setCat] = useState<string>();
  const cat = picked ?? params.type ?? 'All';
  const [typed, setQ] = useState<string>();
  const q = typed ?? params.q ?? '';
  const [term, setTerm] = useState(q);
  const [cuisine, setCuisine] = useState<string | null>(null);
  const [openNow, setOpenNow] = useState(false);
  const [sort, setSort] = useState('distance');
  const activeCuisine = cuisine === '' ? undefined : cuisine ?? params.cuisine;

  // debounce typing so each keystroke doesn't hit the API
  useEffect(() => {
    const id = setTimeout(() => setTerm(q.trim()), 350);
    return () => clearTimeout(id);
  }, [q]);

  const query = useMemo<StoreQuery>(() => ({ storeType: cat === 'All' ? undefined : cat, q: term || undefined, cuisine: activeCuisine, openNow, sort }), [cat, term, activeCuisine, openNow, sort]);
  const { items, total, loading, loadingMore, hasMore, loadMore, error, retry } = useSortedStores(query, 10);
  const { refreshing, onRefresh } = usePullRefresh(async () => { retry(); await refresh(); });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Explore" subtitle={loading ? 'Finding places…' : `${total} place${total === 1 ? '' : 's'} near you`} icon="compass">
        <View style={e.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput value={q} onChangeText={setQ} placeholder="Stores, dishes, groceries…" placeholderTextColor={colors.muted} style={e.input} returnKeyType="search" accessibilityLabel="Search stores" />
          {q ? <Pressable onPress={() => setQ('')} hitSlop={8} accessibilityLabel="Clear"><Ionicons name="close-circle" size={18} color={colors.muted} /></Pressable> : null}
        </View>
      </ScreenHeader>

      <View style={{ paddingTop: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {[{ id: 'All', label: 'All' }, ...storeTypes.map((t) => ({ id: t.type, label: t.pluralLabel }))].map((f) => (
            <Pressable key={f.id} onPress={() => setCat(f.id)} style={[e.pill, cat === f.id && e.pillOn]} accessibilityState={{ selected: cat === f.id }}>
              <Text style={[e.pillText, cat === f.id && { color: '#FFFFFF', fontFamily: fonts.bold }]}>{f.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, gap: 8, alignItems: 'center' }}>
          <Pressable onPress={() => setOpenNow((v) => !v)} style={[e.mini, openNow && e.miniOn]} accessibilityState={{ selected: openNow }}>
            <Ionicons name="time-outline" size={14} color={openNow ? colors.ink : colors.muted} />
            <Text style={[e.miniText, openNow && { color: colors.ink }]}>Open now</Text>
          </Pressable>
          {SORTS.map((o) => (
            <Pressable key={o.id} onPress={() => setSort(o.id)} style={[e.mini, sort === o.id && e.miniOn]} accessibilityState={{ selected: sort === o.id }}>
              <Text style={[e.miniText, sort === o.id && { color: colors.ink }]}>{o.label}</Text>
            </Pressable>
          ))}
          {activeCuisine ? (
            <Pressable onPress={() => setCuisine('')} style={[e.mini, e.miniOn]}>
              <Text style={[e.miniText, { color: colors.ink }]}>{activeCuisine}</Text>
              <Ionicons name="close" size={14} color={colors.ink} />
            </Pressable>
          ) : null}
        </ScrollView>
      </View>

      <FlatList
        style={{ flex: 1 }}
        data={items}
        keyExtractor={(x) => x.id}
        renderItem={({ item, index }) => {
          const head = groupHeading(items, index, sort === 'distance');
          return (
            <View style={{ gap: 12 }}>
              {head ? <GroupLabel {...head} /> : null}
              <StoreCard store={item} full />
            </View>
          );
        }}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<Refresh refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        ListEmptyComponent={loading ? <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} /> : error ? <Pressable onPress={retry}><Text style={e.empty}>Couldn’t load places. Tap to retry.</Text></Pressable> : <Text style={e.empty}>{term ? `Nothing matches “${term}” yet.` : 'No places here yet.'}</Text>}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.brand} style={{ marginVertical: 16 }} /> : !hasMore && items.length > 0 ? <Text style={e.end}>That’s everything nearby</Text> : undefined}
      />
    </View>
  );
}

const e = StyleSheet.create({
  search: { height: 42, borderRadius: 21, backgroundColor: colors.bg, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, marginTop: 12 },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 12.5, color: colors.ink, minWidth: 0 },
  pill: { height: 38, paddingHorizontal: 14, borderRadius: 19, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, justifyContent: 'center' },
  pillOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  pillText: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  mini: { height: 30, paddingHorizontal: 11, borderRadius: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  miniText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
  empty: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 40 },
  end: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 8 },
});
