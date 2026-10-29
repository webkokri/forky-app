import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '@/theme';

export type WalletTx = { id: string; amount: number | string; balanceAfter?: number | string; type: string; note?: string | null; orderId?: string | null; createdAt: string };

const KIND: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  TOPUP: { label: 'Wallet top-up', icon: 'add-circle' },
  REFUND: { label: 'Refund', icon: 'return-down-back' },
  CREDIT: { label: 'Credit', icon: 'gift' },
  PURCHASE: { label: 'Order payment', icon: 'bag-handle' },
  GIFT_CARD: { label: 'Gift card', icon: 'gift' },
  REFERRAL: { label: 'Referral bonus', icon: 'people' },
  ADJUSTMENT: { label: 'Adjustment', icon: 'construct' },
  PROMO: { label: 'Promotion credit', icon: 'pricetag' },
};
export const txKind = (type: string) => KIND[type] ?? { label: type, icon: 'wallet' as const };

export const dateTime = (iso?: string) => (iso ? new Date(iso).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');
export const signedMoney = (n: number) => `${n < 0 ? '−' : '+'}$${Math.abs(n).toFixed(2)}`;

export function TxRow({ tx }: { tx: WalletTx }) {
  const k = txKind(tx.type);
  const amt = Number(tx.amount);
  return (
    <View style={t.row}>
      <View style={[t.icon, { backgroundColor: amt < 0 ? colors.brandTintSoft : '#E3F1EA' }]}>
        <Ionicons name={k.icon} size={17} color={amt < 0 ? colors.brandText : colors.green} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={t.name}>{k.label}</Text>
        <Text style={t.sub} numberOfLines={1}>{tx.note ? `${tx.note} · ` : ''}{dateTime(tx.createdAt)}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[t.amt, { color: amt < 0 ? colors.ink : colors.green }]}>{signedMoney(amt)}</Text>
        {tx.balanceAfter != null ? <Text style={t.sub}>Bal ${Number(tx.balanceAfter).toFixed(2)}</Text> : null}
      </View>
    </View>
  );
}

const t = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 16, padding: 12 },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  amt: { fontFamily: fonts.bold, fontSize: 14 },
});
