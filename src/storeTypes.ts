// Store types come from the API (/public/store-types) so new categories appear without an app update.
export type StoreTypeInfo = {
  type: string; // e.g. GROCERY — also the `storeType` filter value
  label: string;
  pluralLabel: string;
  vertical: 'FOOD' | 'RETAIL' | string;
  retail: boolean;
  count: number;
  openCount: number;
};

// Look for a known type; anything new from the database gets a rotating palette + generic icon.
// bg/bg2 = soft card gradient, accent = solid icon chip, fg = text colour on the card.
export type Style = { icon: string; bg: string; bg2: string; accent: string; fg: string; deco: string };
const KNOWN: Record<string, Style> = {
  RESTAURANT: { icon: 'restaurant', bg: '#FF6819', bg2: '#FF9A4D', accent: '#1C1A17', fg: '#1C1A17', deco: 'rgba(255,255,255,0.3)' },
  CAFE: { icon: 'cafe', bg: '#F6E6D2', bg2: '#EBCFA9', accent: '#8B5E34', fg: '#4A2F12', deco: 'rgba(139,94,52,0.18)' },
  BAKERY: { icon: 'ice-cream', bg: '#FFF0CC', bg2: '#FBD98A', accent: '#E08A12', fg: '#6B4300', deco: 'rgba(224,138,18,0.2)' },
  GROCERY: { icon: 'basket', bg: '#DDF3E6', bg2: '#B5E3C7', accent: '#2F7A52', fg: '#14472C', deco: 'rgba(47,122,82,0.18)' },
  CONVENIENCE: { icon: 'storefront', bg: '#FFF3C9', bg2: '#FFE08A', accent: '#E0A21A', fg: '#6B4A00', deco: 'rgba(224,162,26,0.22)' },
  SPECIALTY: { icon: 'nutrition', bg: '#FBE0E6', bg2: '#F4B8C6', accent: '#C2415D', fg: '#6E1730', deco: 'rgba(194,65,93,0.18)' },
  PHARMACY: { icon: 'medkit', bg: '#DCEBFA', bg2: '#B3D2F2', accent: '#2E5E9E', fg: '#12325C', deco: 'rgba(46,94,158,0.18)' },
  LIQUOR: { icon: 'wine', bg: '#EADFF7', bg2: '#CFB8EC', accent: '#7C4DBB', fg: '#3E1F6B', deco: 'rgba(124,77,187,0.18)' },
  ALCOHOL: { icon: 'wine', bg: '#EADFF7', bg2: '#CFB8EC', accent: '#7C4DBB', fg: '#3E1F6B', deco: 'rgba(124,77,187,0.18)' },
  FLORIST: { icon: 'flower', bg: '#FDE3EC', bg2: '#F8BBD0', accent: '#D6336C', fg: '#6E1038', deco: 'rgba(214,51,108,0.18)' },
  PET: { icon: 'paw', bg: '#DCEBFA', bg2: '#B3D2F2', accent: '#2E5E9E', fg: '#12325C', deco: 'rgba(46,94,158,0.18)' },
};
const FALLBACK: Style[] = [
  { icon: 'bag-handle', bg: '#DDF3E6', bg2: '#B5E3C7', accent: '#2F7A52', fg: '#14472C', deco: 'rgba(47,122,82,0.18)' },
  { icon: 'cube', bg: '#EADFF7', bg2: '#CFB8EC', accent: '#7C4DBB', fg: '#3E1F6B', deco: 'rgba(124,77,187,0.18)' },
  { icon: 'pricetag', bg: '#FFF3C9', bg2: '#FFE08A', accent: '#E0A21A', fg: '#6B4A00', deco: 'rgba(224,162,26,0.22)' },
];

export const typeStyle = (type: string): Style => KNOWN[type.toUpperCase()] ?? FALLBACK[[...type].reduce((a, c) => a + c.charCodeAt(0), 0) % FALLBACK.length];
