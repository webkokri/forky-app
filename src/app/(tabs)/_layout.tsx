import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart } from '@/cart';
import { colors, fonts, shadow } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const TABS: Record<string, { label: string; icon: IconName; iconActive: IconName }> = {
  index: { label: 'Home', icon: 'home-outline', iconActive: 'home' },
  explore: { label: 'Explore', icon: 'compass-outline', iconActive: 'compass' },
  cart: { label: 'Cart', icon: 'bag-handle-outline', iconActive: 'bag-handle' },
  orders: { label: 'Orders', icon: 'receipt-outline', iconActive: 'receipt' },
  profile: { label: 'Profile', icon: 'person-outline', iconActive: 'person' },
};

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <ForkyTabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="cart" />
      <Tabs.Screen name="orders" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

/** Home · Explore · raised Cart · Orders · Profile */
function ForkyTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { count } = useCart();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route, i) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const focused = state.index === i;
        const onPress = () => {
          const e = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !e.defaultPrevented) navigateToTab(route.key);
        };

        if (route.name === 'cart') {
          return (
            <Pressable key={route.key} onPress={onPress} style={styles.item} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={`Cart, ${count} items`}>
              <View style={styles.fab}>
                <Ionicons name={focused ? tab.iconActive : tab.icon} size={20} color={colors.ink} />
                {count > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{count}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.label, { color: colors.ink, fontFamily: fonts.bold }]}>{tab.label}</Text>
            </Pressable>
          );
        }

        return <TabItem key={route.key} tab={tab} focused={focused} onPress={onPress} />;
      })}
    </View>
  );
}

/** Active tab: solid orange pill with a dark filled icon that pops in; inactive: quiet outline icon. */
function TabItem({ tab, focused, onPress }: { tab: { label: string; icon: IconName; iconActive: IconName }; focused: boolean; onPress: () => void }) {
  const [on] = useState(() => new Animated.Value(focused ? 1 : 0));
  useEffect(() => {
    Animated.spring(on, { toValue: focused ? 1 : 0, friction: 6, tension: 120, useNativeDriver: false }).start();
  }, [focused, on]);
  return (
    <Pressable onPress={onPress} style={styles.item} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={tab.label}>
      <Animated.View
        style={[
          styles.iconWrap,
          focused && styles.iconWrapActive,
          { width: on.interpolate({ inputRange: [0, 1], outputRange: [32, 52] }), transform: [{ scale: on.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }] },
        ]}
      >
        <Ionicons name={focused ? tab.iconActive : tab.icon} size={20} color={focused ? colors.ink : colors.muted} />
      </Animated.View>
      <Text style={[styles.label, focused && styles.labelActive]}>{tab.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 8, shadowColor: '#1C1A17', shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: -4 }, elevation: 12 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  iconWrap: { width: 32, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  iconWrapActive: { backgroundColor: colors.brand, shadowColor: colors.brandDeep, shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  label: { fontFamily: fonts.semibold, fontSize: 11, color: colors.muted },
  labelActive: { fontFamily: fonts.heavy, color: colors.ink },
  fab: {
    width: 52,
    height: 52,
    marginTop: -22,
    borderRadius: 26,
    backgroundColor: colors.brand,
    borderWidth: 4,
    borderColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.brandGlow,
  },
  badge: { position: 'absolute', top: -6, right: -6, minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 5, backgroundColor: colors.ink, borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: fonts.heavy, fontSize: 11, color: '#FFFFFF' },
});
