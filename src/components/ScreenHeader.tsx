import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '@/theme';

type Props = { title?: string; subtitle?: string; icon?: keyof typeof Ionicons.glyphMap; right?: ReactNode; children?: ReactNode };

/** Clean white header with a soft shadow and an orange icon chip — shared by the tab screens. */
export function ScreenHeader({ title, subtitle, icon, right, children }: Props) {
  return (
    <SafeAreaView edges={['top']} style={h.band}>
      {title ? (
        <View style={h.row}>
          {icon ? <View style={h.icon}><Ionicons name={icon} size={20} color={colors.ink} /></View> : null}
          <View style={{ flex: 1 }}>
            <Text style={h.title}>{title}</Text>
            {subtitle ? <Text style={h.sub}>{subtitle}</Text> : null}
          </View>
          {right}
        </View>
      ) : null}
      {children}
    </SafeAreaView>
  );
}

export const h = StyleSheet.create({
  band: { backgroundColor: colors.surface, paddingHorizontal: 16, paddingBottom: 14, borderBottomLeftRadius: 22, borderBottomRightRadius: 22, shadowColor: '#1C1A17', shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 10 },
  icon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  sub: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted, marginTop: 1 },
});
