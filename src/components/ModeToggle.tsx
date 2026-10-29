import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useCart, type Mode } from '@/cart';
import { colors, fonts } from '@/theme';

const OPTIONS: { id: Mode; label: string; icon: keyof typeof Ionicons.glyphMap; activePad: number }[] = [
  { id: 'delivery', label: 'Delivery', icon: 'car-outline', activePad: 15 },
  { id: 'pickup', label: 'Pickup', icon: 'bag-handle-outline', activePad: 19 },
];

// Fixed geometry: the track is always WA + WI wide. The active option is the wide one (icon + title),
// the other is a compact icon-only slot — the two swap places while the thumb glides across.
const WA = 96; // active slot
const WI = 36; // inactive slot
const PAD = 3;
const HEIGHT = 34;
const ICON_PAD = (WI - 15) / 2; // centres the lone icon in the compact slot

/**
 * Delivery / Pickup switch at a constant size. Only the active option shows its title; the other shows
 * just its icon. The white thumb springs to the newly selected option, widths swap, the title fades in.
 */
export function ModeToggle() {
  const { mode, setMode } = useCart();
  const index = OPTIONS.findIndex((o) => o.id === mode);
  const [p] = useState(() => new Animated.Value(index)); // 0 = delivery active, 1 = pickup active

  useEffect(() => {
    Animated.spring(p, { toValue: index, speed: 15, bounciness: 8, useNativeDriver: false }).start();
  }, [index, p]);

  // For slot i: how "active" it is (1 when selected, 0 when not)
  const activeOf = (i: number) => (i === 0 ? p.interpolate({ inputRange: [0, 1], outputRange: [1, 0], extrapolate: 'clamp' }) : p.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }));

  return (
    <View style={styles.track} accessibilityRole="radiogroup" accessibilityLabel="Order type">
      <Animated.View
        pointerEvents="none"
        style={[styles.thumb, { left: p.interpolate({ inputRange: [0, 1], outputRange: [PAD, PAD + WI] }) }]}
      />
      {OPTIONS.map((o, i) => {
        const a = activeOf(i);
        const active = i === index;
        return (
          <Pressable key={o.id} onPress={() => setMode(o.id)} accessibilityRole="radio" accessibilityState={{ checked: active }} accessibilityLabel={o.label} hitSlop={4}>
            <Animated.View
              style={[
                styles.slot,
                {
                  width: a.interpolate({ inputRange: [0, 1], outputRange: [WI, WA] }),
                  paddingLeft: a.interpolate({ inputRange: [0, 1], outputRange: [ICON_PAD, o.activePad] }),
                },
              ]}
            >
              <Animated.View style={{ transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) }, { rotate: a.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-8deg'] }) }] }}>
                <Ionicons name={o.icon} size={15} color={active ? colors.brandDeep : colors.muted} />
              </Animated.View>
              <Animated.Text
                numberOfLines={1}
                style={[styles.label, { opacity: a.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0, 1] }), transform: [{ translateX: a.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }] }]}
                importantForAccessibility="no"
              >
                {o.label}
              </Animated.Text>
            </Animated.View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: WA + WI + PAD * 2, height: HEIGHT, flexDirection: 'row', backgroundColor: colors.sand, borderRadius: HEIGHT / 2, padding: PAD },
  thumb: {
    position: 'absolute',
    top: PAD,
    width: WA,
    height: HEIGHT - PAD * 2,
    borderRadius: (HEIGHT - PAD * 2) / 2,
    backgroundColor: '#FFFFFF',
    shadowColor: colors.brandDeep,
    shadowOpacity: 0.22,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  slot: { height: HEIGHT - PAD * 2, flexDirection: 'row', alignItems: 'center', gap: 5, overflow: 'hidden' },
  label: { fontFamily: fonts.bold, fontSize: 11, color: colors.ink },
});
