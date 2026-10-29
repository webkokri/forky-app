import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';
import { Pressy as Pressable } from '@/components/Pressy';
import { colors, fonts } from '@/theme';

export function Empty({ icon, title, sub, action, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; sub?: string; action?: string; onPress?: () => void }) {
  return (
    <View style={{ alignItems: 'center', gap: 10, padding: 40 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.brandTintSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={28} color={colors.brandDeep} />
      </View>
      <Text style={{ fontFamily: fonts.display, fontSize: 18, color: colors.ink, textAlign: 'center' }}>{title}</Text>
      {sub ? <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted, textAlign: 'center' }}>{sub}</Text> : null}
      {action ? (
        <Pressable onPress={onPress} style={{ height: 44, paddingHorizontal: 22, borderRadius: 14, backgroundColor: colors.brand, justifyContent: 'center', marginTop: 6 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.ink }}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
