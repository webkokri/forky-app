import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, router, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Pressy as Pressable } from '@/components/Pressy';
import { useCart } from '@/cart';
import { useFavorites } from '@/favorites';
import { openInMaps, useStoreAddress } from '@/storeAddress';
import { typeStyle } from '@/storeTypes';
import { money, type MenuItem, type Store } from '@/data';
import { colors, fonts, radius, shadow } from '@/theme';

export const categoryIcon = (s: Pick<Store, 'storeType' | 'cuisine' | 'kind'>): keyof typeof Ionicons.glyphMap => {
  // restaurants get a more specific icon from their cuisine; everything else comes from the store type
  if (s.storeType === 'RESTAURANT' || (!s.storeType && s.kind === 'restaurant')) return /pizza/i.test(s.cuisine) ? 'pizza' : /burger/i.test(s.cuisine) ? 'fast-food' : /coffee|breakfast/i.test(s.cuisine) ? 'cafe' : /bakery|dessert/i.test(s.cuisine) ? 'ice-cream' : 'restaurant';
  return typeStyle(s.storeType ?? 'GROCERY').icon as keyof typeof Ionicons.glyphMap;
};

export const storeHref = (id: string) => ({ pathname: '/store/[id]', params: { id } }) as const;

/** Placeholder banner — swap for <Image source={{ uri: store.bannerUrl }} /> once merchants upload photos. */
export function Photo({
  tint,
  uri,
  icon,
  height,
  rounded = radius.lg,
  children,
  style,
}: {
  tint: { bg: string; ring: string; ring2: string };
  uri?: string;
  /** Shown large in the placeholder when there is no photo. */
  icon?: keyof typeof Ionicons.glyphMap;
  height: number;
  rounded?: number;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ height, borderRadius: rounded, backgroundColor: tint.bg, overflow: 'hidden' }, style]}>
      <View style={[styles.ring, { width: height * 1.15, height: height * 1.15, right: -height * 0.3, bottom: -height * 0.35, backgroundColor: tint.ring }]} />
      <View style={[styles.ring, { width: height * 0.65, height: height * 0.65, right: 4, bottom: -height * 0.1, backgroundColor: tint.ring2 }]} />
      {!uri && icon ? <Ionicons name={icon} size={height * 0.55} color="rgba(255,255,255,0.7)" style={{ position: 'absolute', right: height * 0.12, bottom: height * 0.08 }} /> : null}
      {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
      {children}
    </View>
  );
}

export function Monogram({ store, size = 34, square = false }: { store: Pick<Store, 'mono' | 'logoBg' | 'logoFg' | 'logoUrl'>; size?: number; square?: boolean }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: square ? size * 0.3 : size / 2,
        backgroundColor: store.logoBg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(28,26,23,0.08)',
      }}
    >
      {store.logoUrl ? (
        <Image source={{ uri: store.logoUrl }} style={{ width: size, height: size, borderRadius: square ? size * 0.3 : size / 2 }} />
      ) : (
        <Text style={{ fontFamily: fonts.heavy, fontSize: size * 0.34, color: store.logoFg }}>{store.mono}</Text>
      )}
    </View>
  );
}

export function SectionHeader({ title, onSeeAll, link }: { title: string; onSeeAll?: () => void; link?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.h2} accessibilityRole="header">
        {title}
      </Text>
      {onSeeAll && (link ? (
        <Pressable onPress={onSeeAll} hitSlop={8}>
          <Text style={styles.link}>{link}</Text>
        </Pressable>
      ) : (
        <Pressable onPress={onSeeAll} style={styles.roundBtn} accessibilityLabel={`See all ${title}`}>
          <Ionicons name="arrow-forward" size={15} color={colors.ink} />
        </Pressable>
      ))}
    </View>
  );
}

export function Stepper({ item, dark = false }: { item: MenuItem; dark?: boolean }) {
  const { qty, add, remove } = useCart();
  const n = qty(item.id);
  if (item.available === false && n === 0) {
    return <Text style={styles.soldOut}>Sold out</Text>;
  }
  if (n === 0) {
    return (
      <Pressable scaleTo={0.8} onPress={() => add(item.id)} style={[styles.addBtn, dark && { backgroundColor: colors.ink }]} accessibilityLabel={`Add ${item.name}`}>
        <Ionicons name="add" size={19} color={dark ? '#FFFFFF' : colors.ink} />
      </Pressable>
    );
  }
  return (
    <View style={styles.stepper}>
      <Pressable scaleTo={0.75} onPress={() => remove(item.id)} style={styles.stepBtn} accessibilityLabel={`Remove one ${item.name}`}>
        <Ionicons name="remove" size={15} color={colors.ink} />
      </Pressable>
      <Text style={styles.stepQty}>{n}</Text>
      <Pressable scaleTo={0.75} onPress={() => add(item.id)} style={styles.stepBtn} accessibilityLabel={`Add one more ${item.name}`}>
        <Ionicons name="add" size={15} color={colors.ink} />
      </Pressable>
    </View>
  );
}

/** Forky store card: inset photo, ETA pill + save button on the photo, round logo beside the name. */
export function StoreCard({ store, full = false }: { store: Store; full?: boolean }) {
  const { mode } = useCart();
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(store.apiId);
  const pickup = mode === 'pickup';
  return (
    <Pressable onPress={() => router.push(storeHref(store.id))} style={[styles.card, full ? null : { width: 196 }]} accessibilityLabel={`${store.name}, ${store.cuisine}`}>
      <Photo tint={store.photo} uri={store.bannerUrl} icon={categoryIcon(store)} height={full ? 136 : 118}>
        <View style={styles.etaPill}>
          <Ionicons name="time-outline" size={14} color={colors.brandDeep} />
          <Text style={styles.etaText}>{pickup ? store.pickupEta : store.deliveryEta}</Text>
        </View>
        <Pressable scaleTo={0.78} style={styles.heart} onPress={() => void toggle(store.apiId)} accessibilityLabel={fav ? `Remove ${store.name} from saved` : `Save ${store.name}`} hitSlop={6}>
          <Ionicons name={fav ? 'heart' : 'heart-outline'} size={16} color={fav ? '#E5484D' : colors.ink} />
        </Pressable>
        {store.hours === 'Closed' ? (
          <View style={styles.closed}><Text style={styles.promoText}>Closed now</Text></View>
        ) : store.promo ? (
          <View style={styles.promo}>
            <Text style={styles.promoText}>{store.promo}</Text>
          </View>
        ) : null}
      </Photo>
      <View style={styles.cardRow}>
        <Monogram store={store} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName} numberOfLines={1}>{store.name}</Text>
          <Text style={styles.cardSub} numberOfLines={1}>{store.cuisine}</Text>
        </View>
      </View>
      <View style={[styles.cardRow, { justifyContent: 'space-between', gap: 8, paddingBottom: 6 }]}>
        <View style={styles.ratingPill}>
          <Ionicons name="star" size={13} color={colors.brandDeep} />
          <Text style={styles.ratingText}>{store.rating ? store.rating.toFixed(1) : 'New'}</Text>
        </View>
        {/* shrinks and truncates instead of spilling out of the card; the narrow horizontal cards use the short wording */}
        <Text style={[styles.cardDetail, { flexShrink: 1, textAlign: 'right' }]} numberOfLines={1}>
          {pickup ? (full ? `${store.distanceKm} km away` : `${store.distanceKm} km`) : full ? `${money(store.deliveryFee)} delivery · ${store.distanceKm} km` : `${money(store.deliveryFee)} · ${store.distanceKm} km`}
        </Text>
      </View>
      <AddressRow store={store} />
    </Pressable>
  );
}

export function DealTicket({ deal }: { deal: { big: string; small: string; bg: string; fg: string; title: string; store: string; storeId: string } }) {
  return (
    <View style={styles.ticket}>
      <View style={[styles.ticketStub, { backgroundColor: deal.bg }]}>
        <Text style={[styles.ticketBig, { color: deal.fg }]}>{deal.big}</Text>
        <Text style={[styles.ticketSmall, { color: deal.fg }]}>{deal.small}</Text>
      </View>
      <View style={styles.ticketBody}>
        <View>
          <Text style={styles.ticketTitle}>{deal.title}</Text>
          <Text style={styles.cardSub}>{deal.store}</Text>
        </View>
        <Pressable style={styles.claim} onPress={() => router.push(deal.storeId ? storeHref(deal.storeId) : '/explore')}>
          <Text style={styles.claimText}>Claim</Text>
        </Pressable>
      </View>
      <View style={[styles.notch, { top: -8 }]} />
      <View style={[styles.notch, { bottom: -8 }]} />
    </View>
  );
}

/** Street address + "Map" button: opens the store's location in the phone's maps app. */
export function AddressRow({ store }: { store: Store }) {
  const addr = useStoreAddress(store);
  if (addr === null) return null; // no address on file
  return (
    <View style={styles.addrRow}>
      <Ionicons name="location" size={13} color={colors.brandDeep} />
      <Text style={styles.addrText} numberOfLines={1}>{addr ? addr.line : 'Finding address…'}</Text>
      <Pressable
        scaleTo={0.88}
        disabled={!addr}
        onPress={() => addr && openInMaps(addr, store.name)}
        style={[styles.mapBtn, !addr && { opacity: 0.5 }]}
        accessibilityRole="button"
        accessibilityLabel={`View ${store.name} on map`}
        hitSlop={6}
      >
        <Ionicons name="map-outline" size={12} color={colors.ink} />
        <Text style={styles.mapText}>Map</Text>
      </Pressable>
    </View>
  );
}

/** Promotion banner from the API (banner image optional — falls back to a colour block). */
export function PromoCard({ promo, index = 0, width = 268, onPress }: { width?: number; promo: { title: string; subtitle?: string; imageUrl?: string | null; code?: string }; index?: number; onPress?: () => void }) {
  const [broken, setBroken] = useState(false);
  const tints = [['#1C1A17', '#FFFFFF'], ['#2F7A52', '#FFFFFF'], ['#FFE3D3', '#1C1A17'], ['#2E5E9E', '#FFFFFF']] as const;
  const [bg, fg] = tints[index % tints.length];
  const img = promo.imageUrl && !broken ? promo.imageUrl : null;
  return (
    <Pressable onPress={onPress} style={[styles.promo2, { backgroundColor: bg, width }]} accessibilityRole="button" accessibilityLabel={promo.title}>
      {img ? <Image source={{ uri: img }} onError={() => setBroken(true)} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
      {img ? <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.38)' }]} /> : <View style={styles.promoBlob} />}
      <View style={{ flex: 1, justifyContent: 'flex-end', gap: 3 }}>
        {promo.code ? (
          <View style={styles.codePill}>
            <Ionicons name="pricetag" size={11} color={colors.ink} />
            <Text style={styles.codeText}>{promo.code}</Text>
          </View>
        ) : null}
        <Text style={[styles.promoTitle, { color: img ? '#FFFFFF' : fg }]} numberOfLines={2}>{promo.title}</Text>
        {promo.subtitle ? <Text style={[styles.promoSub, { color: img ? '#FFFFFF' : fg }]} numberOfLines={2}>{promo.subtitle}</Text> : null}
      </View>
    </Pressable>
  );
}

export function BackButton({ href }: { href?: Href }) {
  return (
    <Pressable
      scaleTo={0.8}
      onPress={() => (router.canGoBack() ? router.back() : router.replace(href ?? '/'))}
      style={styles.backBtn}
      accessibilityLabel="Back"
    >
      <Ionicons name="chevron-back" size={19} color={colors.ink} />
    </Pressable>
  );
}

export function PrimaryButton({ label, right, onPress, href }: { label: string; right?: string; onPress?: () => void; href?: Href }) {
  const body = (
    <View style={styles.primary}>
      <Text style={styles.primaryText}>{label}</Text>
      {right ? <Text style={styles.primaryText}>{right}</Text> : null}
    </View>
  );
  if (href) {
    return (
      <Link href={href} asChild>
        <Pressable accessibilityRole="button">{body}</Pressable>
      </Link>
    );
  }
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {body}
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  addrRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, paddingBottom: 6 },
  addrText: { flex: 1, minWidth: 0, fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  mapBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: colors.brandTintSoft, borderWidth: 1, borderColor: colors.brandTint },
  mapText: { fontFamily: fonts.bold, fontSize: 11, color: colors.ink },
  soldOut: { fontFamily: fonts.bold, fontSize: 11, color: colors.muted, backgroundColor: colors.sand, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5, overflow: 'hidden' },
  closed: { position: 'absolute', left: 10, bottom: 10, backgroundColor: 'rgba(28,26,23,0.85)', borderRadius: 9, paddingHorizontal: 9, paddingVertical: 3 },
  promo2: { width: 268, height: 128, borderRadius: 20, padding: 14, overflow: 'hidden' },
  promoBlob: { position: 'absolute', right: -30, top: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.12)' },
  promoTitle: { fontFamily: fonts.display, fontSize: 17, lineHeight: 21 },
  promoSub: { fontFamily: fonts.medium, fontSize: 12, opacity: 0.9, lineHeight: 16 },
  codePill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.brand, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 2 },
  codeText: { fontFamily: fonts.heavy, fontSize: 11, color: colors.ink, letterSpacing: 0.5 },

  ring: { position: 'absolute', borderRadius: 999 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 26, marginBottom: 12 },
  h2: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  link: { fontFamily: fonts.bold, fontSize: 13, color: colors.brandText },
  roundBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },

  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  stepper: { height: 40, borderRadius: 20, backgroundColor: colors.brand, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  stepBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  stepQty: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink, minWidth: 16, textAlign: 'center' },

  card: { backgroundColor: colors.surface, borderRadius: 21, padding: 8, gap: 10 },
  etaPill: { position: 'absolute', left: 10, top: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
  etaText: { fontFamily: fonts.bold, fontSize: 12, color: colors.ink },
  heart: { position: 'absolute', right: 8, top: 8, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  promo: { position: 'absolute', left: 10, bottom: 10, backgroundColor: colors.ink, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 4 },
  promoText: { fontFamily: fonts.heavy, fontSize: 11, color: '#FFFFFF' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 },
  cardName: { fontFamily: fonts.heavy, fontSize: 14, color: colors.ink },
  cardSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  cardDetail: { fontFamily: fonts.semibold, fontSize: 12, color: colors.ink2 },
  ratingPill: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.brandTintSoft, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 3 },
  ratingText: { fontFamily: fonts.bold, fontSize: 12, color: '#8A3208' },

  ticket: { width: 225, height: 86, flexDirection: 'row' },
  ticketStub: { width: 72, borderTopLeftRadius: 18, borderBottomLeftRadius: 18, alignItems: 'center', justifyContent: 'center' },
  ticketBig: { fontFamily: fonts.display, fontSize: 20 },
  ticketSmall: { fontFamily: fonts.bold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 },
  ticketBody: { flex: 1, backgroundColor: colors.surface, borderTopRightRadius: 18, borderBottomRightRadius: 18, borderLeftWidth: 2, borderStyle: 'dashed', borderLeftColor: colors.line, padding: 12, justifyContent: 'space-between' },
  ticketTitle: { fontFamily: fonts.heavy, fontSize: 14, color: colors.ink },
  claim: { alignSelf: 'flex-start', height: 30, paddingHorizontal: 12, borderRadius: 15, borderWidth: 1.5, borderColor: colors.ink, justifyContent: 'center' },
  claimText: { fontFamily: fonts.bold, fontSize: 12, color: colors.ink },
  notch: { position: 'absolute', left: 76, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.bg },

  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  primary: { height: 48, borderRadius: 14, backgroundColor: colors.brand, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 },
  primaryText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
});
