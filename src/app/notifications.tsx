import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { Pressy as Pressable } from '@/components/Pressy';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { Empty } from '@/components/Empty';
import { Refresh } from '@/components/Refresh';
import { usePullRefresh } from '@/hooks';
import { BackButton } from '@/components/ui';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, fonts } from '@/theme';

type Note = { id: string; title?: string; body?: string; message?: string; readAt?: string | null; isRead?: boolean; createdAt?: string };
const isRead = (n: Note) => !!n.readAt || n.isRead === true;

const ago = (iso?: string) => {
  if (!iso) return '';
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.round(m / 60)}h`;
  return `${Math.round(m / 1440)}d`;
};

export default function Notifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<Note[] | null>(null);

  const load = useCallback(async () => {
    try {
      const res: any = await api.listNotifications({ limit: 50 });
      setItems((res?.data ?? res ?? []) as Note[]);
    } catch {
      setItems([]);
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount
    if (user) void load();
  }, [user, load]);

  const { refreshing, onRefresh } = usePullRefresh(load);

  const open = (n: Note) => {
    if (!isRead(n)) {
      setItems((l) => l?.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)) ?? l);
      void api.markNotificationRead(n.id).catch(() => {});
    }
  };
  const readAll = () => {
    setItems((l) => l?.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })) ?? l);
    void api.markAllNotificationsRead().catch(() => {});
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Notifications" subtitle="Order updates and offers" right={items?.some((n) => !isRead(n)) ? <Pressable onPress={readAll} hitSlop={8}><Text style={n.link}>Mark all read</Text></Pressable> : undefined}>
        <View style={{ marginTop: 10, alignSelf: 'flex-start' }}><BackButton /></View>
      </ScreenHeader>
      {!user ? (
        <Empty icon="notifications-off-outline" title="Sign in to see notifications" action="Sign in" onPress={() => router.push('/sign-in')} />
      ) : items === null ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
      ) : items.length === 0 ? (
        <Empty icon="notifications-outline" title="You’re all caught up" sub="Order updates and offers will show up here." />
      ) : (
        <FlatList style={{ flex: 1 }}
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          refreshControl={<Refresh refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => open(item)} style={[n.row, !isRead(item) && n.rowNew]}>
              <View style={[n.icon, !isRead(item) && { backgroundColor: colors.brand }]}>
                <Ionicons name="notifications" size={16} color={isRead(item) ? colors.brandText : colors.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={n.title}>{item.title ?? 'Forky'}</Text>
                <Text style={n.body}>{item.body ?? item.message}</Text>
              </View>
              <Text style={n.time}>{ago(item.createdAt)}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const n = StyleSheet.create({
  link: { fontFamily: fonts.bold, fontSize: 12, color: colors.ink, textDecorationLine: 'underline' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.surface, borderRadius: 16, padding: 12 },
  rowNew: { borderWidth: 1.5, borderColor: colors.brand },
  icon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.brandTintSoft, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  time: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted },
});
