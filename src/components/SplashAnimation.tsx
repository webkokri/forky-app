import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { colors } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const NAMES: IconName[] = ['fast-food', 'pizza', 'nutrition', 'beer', 'basket', 'ice-cream', 'restaurant', 'cafe', 'fish', 'wine', 'egg', 'leaf', 'cart', 'bicycle'];
// Cream/white/sunny yellow read as "sparkle"; a few ink-coloured icons add contrast on the orange.
const PALETTE = ['#FFF4EA', '#FFFFFF', '#FFD25E', '#FFE3D3', '#FFF4EA', '#FFD25E', '#1C1A17'];
const ICONS = 34; // big icons, two waves
const DOTS = 26; // tiny sparkle dots
const LOGO = 176;
const CREAM = '#FFF4EA';
const ease = Easing.out(Easing.cubic);

// Deterministic pseudo-random so the burst looks the same every launch.
const rng = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

/**
 * Orange splash with a soft glow. The logo sits at the exact centre from the first frame (matching the native splash), a shine sweeps across it, it winds up (squash), then
 * punches out — a flash, a shockwave, two waves of colourful food icons and sparkle dots burst
 * across the screen. The logo zooms to fill the screen (its cream disc matches home) and dissolves.
 */
export function SplashAnimation({ ready: appReady, onDone }: { /** Home data has loaded — the zoom-out starts once this is true. */ ready: boolean; onDone: () => void }) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  // One master clock drives the whole intro on the native thread. Every element is an interpolation of
  // it, so a busy JS thread (slow network, big renders) can't make the animation stutter or drift.
  const [t] = useState(() => new Animated.Value(0));
  const [zoom] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(1));
  const [bursted, setBursted] = useState(false);
  const done = useRef(onDone);
  useEffect(() => { done.current = onDone; });

  const [n] = useState(() => {
    const BURST = 1190; // ms at which the logo punches and the burst starts
    const total = BURST + 280 + (ICONS / 2 - 1) * 20 + 1450 + 500;
    // The native animated module rejects interpolation `easing`, so the curve is baked into sampled keyframes.
    const SAMPLES = 14;
    const seg = (start: number, dur: number, easing: (x: number) => number = Easing.linear) => {
      const inputRange: number[] = [];
      const outputRange: number[] = [];
      for (let k = 0; k <= SAMPLES; k++) {
        inputRange.push((start + (dur * k) / SAMPLES) / total);
        outputRange.push(easing(k / SAMPLES));
      }
      return t.interpolate({ inputRange, outputRange, extrapolate: 'clamp' });
    };
    return {
      total,
      // the logo is on screen from the first frame; a light shine sweeps across it before the punch
      shine: seg(520, 650, Easing.inOut(Easing.quad)),
      glow: seg(120, 900, ease),
      // wind-up (squash) then punch then settle
      punch: t.interpolate({ inputRange: [1020 / total, BURST / total, 1300 / total, 1560 / total], outputRange: [1, 0.86, 1.14, 1], extrapolate: 'clamp' }),
      flash: seg(BURST, 520, ease),
      shock: seg(BURST, 1000, ease),
      dots: Array.from({ length: DOTS }, (_, i) => seg(BURST + i * 14, 900, Easing.out(Easing.quad))),
      icons: Array.from({ length: ICONS }, (_, i) => (i < ICONS / 2 ? seg(BURST + i * 20, 1250, Easing.out(Easing.quad)) : seg(BURST + 280 + (i - ICONS / 2) * 20, 1450, Easing.out(Easing.quad)))),
    };
  });
  const { shine, glow, shock, flash, icons, dots, punch } = n;

  const ready = size !== null;
  useEffect(() => {
    if (!ready) return;
    Animated.timing(t, { toValue: 1, duration: n.total, easing: Easing.linear, useNativeDriver: true }).start(({ finished }) => { if (finished) setBursted(true); });
  }, [ready, t, n.total]);

  // Once Home's data is in (or after 2.5s at most), zoom the logo in place and fade the whole splash out midway.
  useEffect(() => {
    if (!bursted) return;
    let started = false;
    const go = () => {
      if (started) return;
      started = true;
      Animated.parallel([
        Animated.timing(zoom, { toValue: 1, duration: 1100, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.sequence([Animated.delay(450), Animated.timing(fade, { toValue: 0, duration: 550, easing: Easing.out(Easing.quad), useNativeDriver: true })]),
      ]).start(() => done.current());
    };
    if (appReady) go();
    const max = setTimeout(go, 2500);
    return () => clearTimeout(max);
  }, [bursted, appReady, zoom, fade]);

  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const w = size?.w ?? 0;
  const h = size?.h ?? 0;
  const cx = w / 2;
  const cy = h / 2;
  const fullScale = (Math.hypot(w, h) / LOGO) * 1.1;

  const { bigs, smalls } = useMemo(() => {
    const r = rng(11);
    const reach = Math.hypot(w, h) / 2;
    const bigs = Array.from({ length: ICONS }, (_, i) => {
      const wave2 = i >= ICONS / 2;
      const n = wave2 ? ICONS - ICONS / 2 : ICONS / 2;
      const a = (((wave2 ? i - ICONS / 2 : i) / n) * 360 + (wave2 ? 360 / n / 2 : 0) + (r() - 0.5) * 18) * (Math.PI / 180);
      const dist = reach * (wave2 ? 0.8 + r() * 0.35 : 0.4 + r() * 0.4);
      return {
        name: NAMES[i % NAMES.length],
        color: PALETTE[Math.floor(r() * PALETTE.length)],
        x: Math.cos(a) * dist,
        y: Math.sin(a) * dist,
        size: wave2 ? 22 + Math.round(r() * 16) : 30 + Math.round(r() * 22),
        spin: (r() > 0.5 ? 1 : -1) * (140 + r() * 260),
      };
    });
    const smalls = Array.from({ length: DOTS }, () => {
      const a = r() * Math.PI * 2;
      const dist = reach * (0.35 + r() * 0.8);
      return { x: Math.cos(a) * dist, y: Math.sin(a) * dist, size: 5 + Math.round(r() * 7), color: PALETTE[Math.floor(r() * 6)] };
    });
    return { bigs, smalls };
  }, [w, h]);

  const logoScale = Animated.multiply(
    punch,
    zoom.interpolate({ inputRange: [0, 1], outputRange: [1, fullScale] }),
  );

  return (
    <Animated.View onLayout={onLayout} pointerEvents="none" style={[StyleSheet.absoluteFill, s.root, { opacity: fade }]}>
      {ready && (
        <View style={{ position: 'absolute', left: cx, top: cy, width: 0, height: 0 }}>
          {/* soft glow rings behind everything */}
          {[340, 560, 820].map((d, i) => (
            <Animated.View
              key={d}
              style={[s.at(d), s.glow, {
                opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0, 1 - i * 0.2] }),
                transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
              }]}
            />
          ))}

          {/* flash as the logo punches */}
          <Animated.View style={[s.at(420), s.flash, { opacity: flash.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 0.4, 0] }), transform: [{ scale: flash.interpolate({ inputRange: [0, 1], outputRange: [0.4, 3.4] }) }] }]} />

          {/* shockwave rings */}
          {[0, 0.18].map((d) => (
            <Animated.View
              key={d}
              style={[s.at(LOGO), s.ring, {
                opacity: shock.interpolate({ inputRange: [d, d + 0.12, 1], outputRange: [0, 0.75, 0], extrapolate: 'clamp' }),
                transform: [{ scale: shock.interpolate({ inputRange: [d, 1], outputRange: [0.9, 8], extrapolate: 'clamp' }) }],
              }]}
            />
          ))}

          {/* sparkle dots */}
          {smalls.map((b, i) => (
            <Animated.View
              key={`d${i}`}
              style={{
                position: 'absolute',
                left: -b.size / 2,
                top: -b.size / 2,
                width: b.size,
                height: b.size,
                borderRadius: b.size / 2,
                backgroundColor: b.color,
                opacity: dots[i].interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 1, 1, 0] }),
                transform: [
                  { translateX: dots[i].interpolate({ inputRange: [0, 1], outputRange: [0, b.x] }) },
                  { translateY: dots[i].interpolate({ inputRange: [0, 1], outputRange: [0, b.y] }) },
                  { scale: dots[i].interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.2, 1.3, 0.3] }) },
                ],
              }}
            />
          ))}

          {/* food icons, two waves */}
          {bigs.map((b, i) => (
            <Animated.View
              key={`i${i}`}
              style={{
                position: 'absolute',
                left: -b.size / 2,
                top: -b.size / 2,
                opacity: icons[i].interpolate({ inputRange: [0, 0.08, 0.68, 1], outputRange: [0, 1, 1, 0] }),
                transform: [
                  { translateX: icons[i].interpolate({ inputRange: [0, 1], outputRange: [0, b.x] }) },
                  { translateY: icons[i].interpolate({ inputRange: [0, 1], outputRange: [0, b.y] }) },
                  { scale: icons[i].interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.2, 1.2, 0.85] }) },
                  { rotate: icons[i].interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${b.spin}deg`] }) },
                ],
              }}
            >
              <Ionicons name={b.name} size={b.size} color={b.color} />
            </Animated.View>
          ))}

          {/* logo — absolutely positioned so its centre is the anchor */}
          <Animated.View
            style={{
              position: 'absolute',
              left: -LOGO / 2,
              top: -LOGO / 2,
              width: LOGO,
              height: LOGO,
              transform: [
                { scale: logoScale },
              ],
            }}
          >
            <View style={{ width: LOGO, height: LOGO, borderRadius: LOGO / 2, overflow: 'hidden' }}>
              <Image source={require('../../assets/images/logo-round.png')} style={{ width: LOGO, height: LOGO }} accessibilityLabel="Forky" />
              {/* shine: a soft diagonal band of light sliding across the logo */}
              <Animated.View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: -LOGO * 0.3,
                  left: 0,
                  width: LOGO * 0.28,
                  height: LOGO * 1.6,
                  backgroundColor: 'rgba(255,255,255,0.55)',
                  opacity: shine.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 1, 1, 0] }),
                  transform: [{ translateX: shine.interpolate({ inputRange: [0, 1], outputRange: [-LOGO * 0.4, LOGO * 1.2] }) }, { rotate: '20deg' }],
                }}
              />
            </View>
          </Animated.View>
        </View>
      )}
    </Animated.View>
  );
}

// Circle of diameter d centred on the anchor.
const circle = (d: number) => ({ position: 'absolute' as const, left: -d / 2, top: -d / 2, width: d, height: d, borderRadius: d / 2 });

const s = {
  root: { backgroundColor: colors.brand, zIndex: 100, elevation: 100, overflow: 'hidden' as const },
  at: circle,
  glow: { backgroundColor: 'rgba(255,255,255,0.08)' },
  flash: { backgroundColor: '#FFFFFF' },
  ring: { borderWidth: 3, borderColor: CREAM },
};
