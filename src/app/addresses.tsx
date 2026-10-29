import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { Pressy as Pressable } from '@/components/Pressy';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { Empty } from '@/components/Empty';
import { Refresh } from '@/components/Refresh';
import { ScreenHeader } from '@/components/ScreenHeader';
import { usePullRefresh } from '@/hooks';
import { BackButton } from '@/components/ui';
import { colors, fonts } from '@/theme';

type Addr = { id: string; label?: string; line1: string; line2?: string; city?: string; province?: string; postalCode?: string; isDefault?: boolean };

export default function Addresses() {
  const { user } = useAuth();
  const [items, setItems] = useState<Addr[] | null>(null);
  const load = useCallback(() => api.listAddresses().then((l) => setItems(l as Addr[])).catch(() => setItems([])), []);
  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  const { refreshing, onRefresh } = usePullRefresh(load);

  const remove = (a: Addr) =>
    Alert.alert('Delete address?', a.line1, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void api.deleteAddress(a.id).then(load).catch((e) => Alert.alert('Could not delete', e.message)) },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Saved addresses" subtitle="Where we deliver" icon="location">
        <View style={{ marginTop: 10, alignSelf: 'flex-start' }}><BackButton /></View>
      </ScreenHeader>
      {!user ? (
        <Empty icon="location-outline" title="Sign in to see your addresses" action="Sign in" onPress={() => router.push('/sign-in')} />
      ) : items === null ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
      ) : items.length === 0 ? (
        <Empty icon="location-outline" title="No saved addresses" sub="Addresses are saved when you place an order." />
      ) : (
        <FlatList style={{ flex: 1 }}
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshControl={<Refresh refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <View style={a.card}>
              <View style={a.icon}><Ionicons name={item.isDefault ? 'home' : 'location'} size={17} color={colors.brandText} /></View>
              <View style={{ flex: 1 }}>
                <Text style={a.name}>{item.label || 'Address'}{item.isDefault ? '  · Default' : ''}</Text>
                <Text style={a.sub}>{[item.line1, item.line2, item.city, item.postalCode].filter(Boolean).join(', ')}</Text>
                {!item.isDefault && (
                  <Pressable onPress={() => void api.setDefaultAddress(item.id).then(load)} hitSlop={8}>
                    <Text style={a.link}>Make default</Text>
                  </Pressable>
                )}
              </View>
              <Pressable onPress={() => remove(item)} hitSlop={10} accessibilityLabel="Delete address">
                <Ionicons name="trash-outline" size={18} color="#B3261E" />
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const a = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: colors.surface, borderRadius: 16, padding: 14 },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brandTintSoft, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  link: { fontFamily: fonts.bold, fontSize: 12, color: colors.brandText, marginTop: 6 },
});
