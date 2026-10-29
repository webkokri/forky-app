import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { useCatalog } from '@/catalog';
import { Empty } from '@/components/Empty';
import { Refresh } from '@/components/Refresh';
import { ScreenHeader } from '@/components/ScreenHeader';
import { usePullRefresh } from '@/hooks';
import { BackButton, StoreCard } from '@/components/ui';
import type { Store } from '@/data';
import { useFavorites } from '@/favorites';
import { colors } from '@/theme';

export default function Favorites() {
  const { user } = useAuth();
  const { geo } = useCatalog();
  const { count } = useFavorites();
  const [items, setItems] = useState<Store[] | null>(null);

  const reload = useCallback(() => (user ? api.favoriteStores(geo ?? {}).then(setItems).catch(() => setItems([])) : Promise.resolve()), [user, geo]);
  useEffect(() => {
    void reload();
  }, [reload, count]);
  const { refreshing, onRefresh } = usePullRefresh(reload);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Saved stores" subtitle="Your favourites, one tap away" icon="heart">
        <View style={{ marginTop: 10, alignSelf: 'flex-start' }}><BackButton /></View>
      </ScreenHeader>
      {!user ? (
        <Empty icon="heart-outline" title="Sign in to save stores" action="Sign in" onPress={() => router.push('/sign-in')} />
      ) : items === null ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
      ) : items.length === 0 ? (
        <Empty icon="heart-outline" title="No saved stores yet" sub="Tap the heart on any store to save it here." action="Explore stores" onPress={() => router.navigate('/explore')} />
      ) : (
        <FlatList style={{ flex: 1 }} data={items} keyExtractor={(x) => x.id} renderItem={({ item }) => <StoreCard store={item} full />} contentContainerStyle={{ padding: 16, gap: 12 }} refreshControl={<Refresh refreshing={refreshing} onRefresh={onRefresh} />} />
      )}
    </View>
  );
}
