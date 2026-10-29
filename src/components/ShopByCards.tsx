import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { StoreTypeInfo } from '@/storeTypes';
import { typeStyle } from '@/storeTypes';
import { colors, fonts } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;
const APressable = Animated.createAnimatedComponent(Pressable);

/** Card shell: staggered entrance, press-to-shrink, and a `pop` value the icon uses when tapped. */
function useCard(index: number) {
  const [enter] = useState(() => new Animated.Value(0));
  const [press] = useState(() => new Animated.Value(1));
  const [pop] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 520, delay: 120 + index * 90, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }).start();
  }, [enter, index]);
  const down = () => Animated.spring(press, { toValue: 0.95, speed: 40, bounciness: 0, useNativeDriver: true }).start();
  const up = () => Animated.spring(press, { toValue: 1, speed: 24, bounciness: 14, useNativeDriver: true }).start();
  const boing = () => { pop.setValue(0); Animated.timing(pop, { toValue: 1, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(); };
  const shell = {
    opacity: enter,
    transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }, { scale: Animated.multiply(enter.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }), press) }],
  };
  // icon: squash-and-wiggle when tapped
  const iconStyle = {
    transform: [
      { scale: pop.interpolate({ inputRange: [0, 0.25, 0.55, 1], outputRange: [1, 1.4, 0.9, 1] }) },
      { rotate: pop.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: ['0deg', '-18deg', '14deg', '-6deg', '0deg'] }) },
    ],
  };
  return { shell, iconStyle, down, up, boing };
}

function Hero({ hero, pickup, onPress }: { hero: StoreTypeInfo; pickup: boolean; onPress: () => void }) {
  const st = typeStyle(hero.type);
  const c = useCard(0);
  const [bob] = useState(() => new Animated.Value(0));
  const [arrow] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const l = Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(bob, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    l.start();
    const a = Animated.loop(Animated.sequence([
      Animated.timing(arrow, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(arrow, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    a.start();
    return () => { l.stop(); a.stop(); };
  }, [bob, arrow]);

  return (
    <APressable onPressIn={c.down} onPressOut={c.up} onPress={() => { c.boing(); setTimeout(onPress, 260); }} style={[s.hero, c.shell]} accessibilityRole="button" accessibilityLabel={hero.pluralLabel}>
      <LinearGradient colors={[st.bg, st.bg2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={s.ringA} />
      <View style={s.ringB} />
      <Animated.View style={[s.heroDeco, { transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }, { rotate: bob.interpolate({ inputRange: [0, 1], outputRange: ['-6deg', '6deg'] }) }] }]}>
        <Ionicons name={st.icon as IconName} size={104} color={st.deco} />
      </Animated.View>
      <View style={s.pill}>
        <View style={[s.liveDot, { backgroundColor: hero.openCount > 0 ? '#2F7A52' : colors.muted }]} />
        <Text style={s.pillText}>{hero.openCount > 0 ? `${hero.openCount} open now` : `${hero.count} places`}</Text>
      </View>
      <View style={{ marginTop: 'auto', flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
        <Animated.View style={[s.heroChip, { backgroundColor: st.accent }, c.iconStyle]}>
          <Ionicons name={st.icon as IconName} size={22} color="#FFFFFF" />
        </Animated.View>
        <View style={{ flex: 1 }}>
          <Text style={[s.heroTitle, { color: st.fg }]} numberOfLines={1} adjustsFontSizeToFit>{hero.pluralLabel}</Text>
          <Text style={[s.heroSub, { color: st.fg }]}>{pickup ? 'Order ahead, skip the line' : 'Hot meals, delivered fast'}</Text>
        </View>
        <Animated.View style={[s.arrow, { transform: [{ translateX: arrow.interpolate({ inputRange: [0, 1], outputRange: [0, 5] }) }] }]}>
          <Ionicons name="arrow-forward" size={17} color={colors.ink} />
        </Animated.View>
      </View>
    </APressable>
  );
}

function Tile({ t, index, width, onPress }: { t: StoreTypeInfo; index: number; width: number; onPress: () => void }) {
  const st = typeStyle(t.type);
  const c = useCard(index + 1);
  return (
    <APressable onPressIn={c.down} onPressOut={c.up} onPress={() => { c.boing(); setTimeout(onPress, 260); }} style={[s.tile, { width }, c.shell]} accessibilityRole="button" accessibilityLabel={t.pluralLabel}>
      <LinearGradient colors={[st.bg, st.bg2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Ionicons name={st.icon as IconName} size={64} color={st.deco} style={s.tileDeco} />
      <Animated.View style={[s.chip, { backgroundColor: st.accent }, c.iconStyle]}>
        <Ionicons name={st.icon as IconName} size={19} color="#FFFFFF" />
      </Animated.View>
      <View style={{ marginTop: 'auto', gap: 4 }}>
        <Text style={[s.tileTitle, { color: st.fg }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.85}>{t.pluralLabel}</Text>
        <View style={s.countRow}>
          <View style={[s.countDot, { backgroundColor: st.accent }]} />
          <Text style={[s.tileCount, { color: st.fg }]} numberOfLines={1}>{t.count} nearby</Text>
        </View>
      </View>
    </APressable>
  );
}

/** "Shop by" — gradient category cards built from the API's store types. */
export function ShopByCards({ hero, tiles, pickup, onSelect }: { hero: StoreTypeInfo; tiles: StoreTypeInfo[]; pickup: boolean; onSelect: (type: string) => void }) {
  const { width } = useWindowDimensions();
  const cols = tiles.length <= 1 ? 1 : tiles.length === 2 || tiles.length === 4 ? 2 : 3;
  const tileW = Math.floor((width - 32 - 10 * (cols - 1)) / cols);
  return (
    <View style={{ paddingHorizontal: 16, gap: 10 }}>
      <Hero hero={hero} pickup={pickup} onPress={() => onSelect(hero.type)} />
      {tiles.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'stretch' }}>
          {tiles.map((t, i) => <Tile key={t.type} t={t} index={i} width={tileW} onPress={() => onSelect(t.type)} />)}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  hero: { height: 150, borderRadius: 24, padding: 16, overflow: 'hidden' },
  ringA: { position: 'absolute', right: -50, top: -60, width: 190, height: 190, borderRadius: 95, borderWidth: 26, borderColor: 'rgba(255,255,255,0.14)' },
  ringB: { position: 'absolute', right: 70, bottom: -70, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.12)' },
  heroDeco: { position: 'absolute', right: 8, top: 14 },
  pill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontFamily: fonts.bold, fontSize: 11, color: colors.ink },
  heroChip: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontFamily: fonts.display, fontSize: 22 },
  heroSub: { fontFamily: fonts.medium, fontSize: 12, opacity: 0.85 },
  arrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },

  tile: { minHeight: 118, borderRadius: 20, padding: 12, overflow: 'hidden', gap: 10 },
  tileDeco: { position: 'absolute', right: -10, top: -8 },
  chip: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tileTitle: { fontFamily: fonts.display, fontSize: 14, lineHeight: 18 },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  countDot: { width: 6, height: 6, borderRadius: 3 },
  tileCount: { fontFamily: fonts.semibold, fontSize: 11, opacity: 0.85 },
});
