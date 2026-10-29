import type { MenuItem, Store } from '@/data';

// Converts Forky API payloads into the shapes the screens already use.
const PALETTE: Store['photo'][] = [
  { bg: '#F6D3C4', ring: '#EFB79F', ring2: '#E39373' },
  { bg: '#E3F1EA', ring: '#C8E3D3', ring2: '#A7D1B8' },
  { bg: '#F6E7BF', ring: '#EED598', ring2: '#E3BE6A' },
  { bg: '#E2ECF7', ring: '#C9DBF0', ring2: '#A9C4E5' },
  { bg: '#ECE6F5', ring: '#DCD1EC', ring2: '#C7B6E0' },
];
const TINTS = ['#F6D3C4', '#FDF1D8', '#ECE6F5', '#FDE0B8', '#E3F1EA', '#E2ECF7'];
const hash = (s = '') => [...s].reduce((a, c) => a + c.charCodeAt(0), 0);
const mono = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'F';

export function toStore(r: any): Store {
  const retail = !!r.retail;
  const photo = PALETTE[hash(r.id) % PALETTE.length];
  return {
    id: r.slug ?? r.id,
    apiId: r.id,
    name: r.name,
    kind: retail ? 'grocery' : 'restaurant',
    category: r.storeTypeLabel || (retail ? 'Store' : 'Restaurant'),
    storeType: r.storeType,
    cuisine: (r.cuisines?.length ? r.cuisines.join(' · ') : r.storeTypeLabel) || (retail ? 'Grocery' : 'Restaurant'),
    mono: mono(r.name),
    logoBg: '#FFFFFF',
    logoFg: '#1C1A17',
    logoUrl: r.logoUrl ?? undefined,
    bannerUrl: r.coverUrl ?? r.logoUrl ?? undefined,
    photo,
    deliveryEta: r.etaRange ? `${r.etaRange.min}–${r.etaRange.max} min` : r.etaMinutes ? `${r.etaMinutes} min` : '—',
    pickupEta: r.etaRange ? `${Math.max(5, Math.round(r.etaRange.min / 2))} min` : '10 min',
    deliveryFee: Number(r.deliveryFee ?? 0),
    distanceKm: Number(r.distanceKm ?? 0),
    address: r.area || r.address?.line1 || '',
    rating: Number(r.rating ?? 0),
    hours: r.isOpen === false ? 'Closed' : retail ? 'Open now' : undefined,
    promo: typeof r.promo === 'string' ? r.promo : r.promo?.label || r.promo?.name || undefined,
    fullAddress: r.address?.line1 ? [r.address.line1, r.address.city].filter(Boolean).join(', ') : undefined,
    lat: r.address?.lat ?? undefined,
    lng: r.address?.lng ?? undefined,
    inDeliveryRange: r.inDeliveryRange,
    deliveryAvailable: r.deliveryAvailable,
    pickupAvailable: r.pickupAvailable,
    isOpen: r.isOpen,
    nextOpening: r.nextOpening ?? r.status?.opensAt ?? undefined,
    canSchedule: r.canSchedule,
    combinable: !/LIQUOR|ALCOHOL/.test(String(r.storeType)),
  };
}

export function toMenuItem(i: any, storeId: string, section: string): MenuItem {
  const byWeight = i.sellBy === 'WEIGHT' && i.stepPrice != null;
  return {
    id: i.id,
    storeId,
    name: i.name,
    description: i.description || undefined,
    size: (byWeight ? i.stepLabel : i.packSize) || undefined,
    price: Number(byWeight ? i.stepPrice : i.price),
    section,
    badge: i.isPopular ? 'Popular' : undefined,
    tint: TINTS[hash(i.id) % TINTS.length],
    imageUrl: i.imageUrl ?? undefined,
    available: i.available !== false && i.inStock !== false,
  };
}
