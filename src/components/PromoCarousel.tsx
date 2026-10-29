import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View, type ScrollViewInstance } from 'react-native';
import { colors } from '@/theme';
import { PromoCard } from './ui';

export type PromoItem = { id: string; title: string; subtitle?: string; imageUrl?: string | null; code?: string };

const GAP = 12;
const INTERVAL = 3800;

/** Offers carousel: snaps card by card, advances on its own, pauses while touched, with page dots. */
export function PromoCarousel({ items, onPress }: { items: PromoItem[]; onPress?: (p: PromoItem) => void }) {
  const { width } = useWindowDimensions();
  const cardW = Math.min(width - 56, 360); // leaves a peek of the next card
  const step = cardW + GAP;
  const ref = useRef<ScrollViewInstance>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = items.length;

  // auto-advance; wraps back to the first card
  useEffect(() => {
    if (n < 2 || paused) return;
    const id = setTimeout(() => {
      const next = (index + 1) % n;
      ref.current?.scrollTo({ x: next * step, animated: true });
      setIndex(next);
    }, INTERVAL);
    return () => clearTimeout(id);
  }, [index, paused, n, step]);

  return (
    <View>
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 16, gap: GAP }}
        scrollEventThrottle={32}
        onScrollBeginDrag={() => setPaused(true)}
        onMomentumScrollEnd={(e) => {
          setIndex(Math.max(0, Math.min(n - 1, Math.round(e.nativeEvent.contentOffset.x / step))));
          setPaused(false);
        }}
        onScrollEndDrag={(e) => {
          // a drag that doesn't glide still needs to resume
          if (Math.abs(e.nativeEvent.velocity?.x ?? 0) < 0.05) {
            setIndex(Math.max(0, Math.min(n - 1, Math.round(e.nativeEvent.contentOffset.x / step))));
            setPaused(false);
          }
        }}
      >
        {items.map((p, i) => <PromoCard key={p.id} promo={p} index={i} width={cardW} onPress={() => onPress?.(p)} />)}
      </ScrollView>
      {n > 1 && (
        <View style={s.dots} accessibilityElementsHidden>
          {items.map((p, i) => <View key={p.id} style={[s.dot, i === index && s.dotOn]} />)}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.line },
  dotOn: { width: 18, backgroundColor: colors.brand },
});
