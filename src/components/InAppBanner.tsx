import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '@/theme';

export type BannerData = { id: string; title: string; body?: string; orderId?: string };

/** Slide-down banner for order updates when the phone-notification module isn't available (e.g. some Expo Go builds). */
export function InAppBanner({ banner, onDone }: { banner: BannerData | null; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [y] = useState(() => new Animated.Value(-160));

  useEffect(() => {
    if (!banner) return;
    Animated.timing(y, { toValue: 0, duration: 280, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }).start();
    const t = setTimeout(() => Animated.timing(y, { toValue: -160, duration: 220, useNativeDriver: true }).start(() => onDone()), 6000);
    return () => clearTimeout(t);
  }, [banner, y, onDone]);

  if (!banner) return null;
  return (
    <Animated.View style={[s.wrap, { top: insets.top + 6, transform: [{ translateY: y }] }]} pointerEvents="box-none">
      <Pressable
        style={s.card}
        onPress={() => { onDone(); if (banner.orderId) router.push({ pathname: '/order/[id]', params: { id: banner.orderId } }); }}
        accessibilityRole="button"
        accessibilityLabel={`${banner.title}. ${banner.body ?? ''}`}
      >
        <View style={s.icon}><Ionicons name="notifications" size={18} color={colors.ink} /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.title} numberOfLines={1}>{banner.title}</Text>
          {banner.body ? <Text style={s.body} numberOfLines={2}>{banner.body}</Text> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, zIndex: 999, elevation: 999 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.ink, borderRadius: 18, padding: 12, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.bold, fontSize: 14, color: '#FFFFFF' },
  body: { fontFamily: fonts.regular, fontSize: 12.5, color: '#D9D3C8' },
});
