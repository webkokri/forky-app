import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import type { Store } from '@/data';
import { colors, fonts } from '@/theme';

const BAND = 5; // km per ring

const band = (s: Store) => (s.distanceKm == null ? Infinity : Math.floor(s.distanceKm / BAND));
const bandTitle = (b: number) => (b === Infinity ? 'Distance unknown' : b === 0 ? `Within ${BAND} km` : `${b * BAND}–${(b + 1) * BAND} km`);

/**
 * Lists are ordered nearest-first, so stores fall into rings: within 5 km, 5–10 km, 10–15 km…
 * Returns the heading to show above item `i` — only where a new ring starts.
 */
export function groupHeading(items: Store[], i: number, enabled = true): { title: string; icon: keyof typeof Ionicons.glyphMap } | null {
  if (!enabled) return null;
  const b = band(items[i]);
  if (i > 0 && band(items[i - 1]) === b) return null;
  return { title: bandTitle(b), icon: 'navigate-circle' };
}

export function GroupLabel({ title, icon }: { title: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={g.row}>
      <Ionicons name={icon} size={16} color={colors.brandDeep} />
      <Text style={g.title}>{title}</Text>
      <View style={g.line} />
    </View>
  );
}

const g = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  title: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  line: { flex: 1, height: 1, backgroundColor: colors.line, marginLeft: 4 },
});
