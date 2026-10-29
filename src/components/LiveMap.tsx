import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { staticMapUrl } from '@/mapbox';
import { colors, fonts } from '@/theme';

type LL = { lat: number; lng: number };
const meters = (a: LL, b: LL) => {
  const R = 6371000; const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad; const dLng = (b.lng - a.lng) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

/**
 * Live map: store, delivery address and the driver moving in between. The picture is Mapbox's Static Images API,
 * so it needs no native map module; it is re-requested only when the driver has moved ~30 m (and at most every 6 s).
 */
export function LiveMap({ store, home, driver, height = 220 }: { store?: LL | null; home?: LL | null; driver?: LL | null; height?: number }) {
  const [width, setWidth] = useState(0);
  const [shownDriver, setShownDriver] = useState<LL | null>(driver ?? null);
  const last = useRef({ at: 0, p: driver ?? null as LL | null });
  const [loaded, setLoaded] = useState(false);

  // throttle driver movement into map refreshes
  useEffect(() => {
    if (!driver) return;
    const prev = last.current;
    const now = Date.now();
    if (!prev.p || (meters(prev.p, driver) > 30 && now - prev.at > 6000)) {
      last.current = { at: now, p: driver };
      setShownDriver(driver);
    }
  }, [driver]);

  const uri = width ? staticMapUrl({ store, home, driver: shownDriver, width, height }) : null;
  return (
    <View style={[m.box, { height }]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {uri ? (
        <>
          <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" onLoadEnd={() => setLoaded(true)} accessibilityLabel="Live map of your order" />
          {!loaded && <ActivityIndicator color={colors.brand} style={StyleSheet.absoluteFill} />}
        </>
      ) : (
        <View style={m.fallback}>
          <Ionicons name="map-outline" size={28} color={colors.muted} />
          <Text style={m.fallbackText}>Live map unavailable</Text>
        </View>
      )}
      <View style={m.legend}>
        <Dot color="#FF6819" label="Store" />
        <Dot color="#1C1A17" label="You" />
        {shownDriver ? <Dot color="#2F7A52" label="Driver" /> : null}
      </View>
    </View>
  );
}

function Dot({ color, label }: { color: string; label: string }) {
  return (
    <View style={m.legendItem}>
      <View style={[m.dot, { backgroundColor: color }]} />
      <Text style={m.legendText}>{label}</Text>
    </View>
  );
}

const m = StyleSheet.create({
  box: { borderRadius: 18, overflow: 'hidden', backgroundColor: '#ECE8DF' },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  fallbackText: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  legend: { position: 'absolute', left: 10, bottom: 10, flexDirection: 'row', gap: 10, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.ink },
});
