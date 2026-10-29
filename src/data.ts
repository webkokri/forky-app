// Sample catalogue. Replace with your API (stores, menus and products per merchant).

export type StoreKind = 'restaurant' | 'grocery';
/** Display name of the store's type, e.g. "Grocery store" — comes from the API. */
export type StoreCategory = string;

export type Store = {
  id: string; // route id (API slug)
  apiId?: string; // API restaurant id, used for cart/orders
  logoUrl?: string;
  bannerUrl?: string;
  name: string;
  kind: StoreKind;
  category: StoreCategory;
  /** API store type code (RESTAURANT, GROCERY, …) used for filtering. */
  storeType?: string;
  cuisine: string;
  mono: string; // monogram shown until a real logo image is uploaded
  logoBg: string;
  logoFg: string;
  photo: { bg: string; ring: string; ring2: string }; // placeholder banner colours
  deliveryEta: string;
  pickupEta: string;
  deliveryFee: number;
  distanceKm: number;
  address: string;
  rating: number;
  hours?: string;
  promo?: string;
  /** Within this store's delivery range of the selected address (false = further away, pickup only). */
  /** Street address and coordinates — present on store detail, fetched lazily for list cards. */
  fullAddress?: string;
  lat?: number;
  lng?: number;
  inDeliveryRange?: boolean;
  deliveryAvailable?: boolean;
  pickupAvailable?: boolean;
  isOpen?: boolean;
  /** When a closed store opens next (ISO) and whether the API accepts orders scheduled for later. */
  nextOpening?: string;
  canSchedule?: boolean;
  combinable: boolean; // can be added to another store's order for one delivery fee
};

export type MenuItem = {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  size?: string;
  price: number;
  section: string;
  badge?: string;
  tint: string;
  imageUrl?: string;
  available?: boolean;
};

export const stores: Store[] = [
  { id: 'saffron-house', name: 'Saffron House', kind: 'restaurant', category: 'Restaurants', cuisine: 'Indian · Curries', mono: 'SH', logoBg: '#9A3412', logoFg: '#FFFFFF', photo: { bg: '#F6D3C4', ring: '#EFB79F', ring2: '#E39373' }, deliveryEta: '25 min', pickupEta: '10 min', deliveryFee: 0.99, distanceKm: 1.2, address: '210 Main St N', rating: 4.7, combinable: true },
  { id: 'nonnas-slice', name: "Nonna's Slice", kind: 'restaurant', category: 'Restaurants', cuisine: 'Pizza · Italian', mono: 'NS', logoBg: '#FFFFFF', logoFg: '#B3261E', photo: { bg: '#F5D9C9', ring: '#EDBFA5', ring2: '#E3A07C' }, deliveryEta: '17 min', pickupEta: '8 min', deliveryFee: 1.99, distanceKm: 0.9, address: '75 Queen St E', rating: 4.8, promo: '$0 delivery over $20', combinable: true },
  { id: 'tokyo-bento', name: 'Tokyo Bento', kind: 'restaurant', category: 'Restaurants', cuisine: 'Japanese · Sushi', mono: 'TB', logoBg: '#1C1A17', logoFg: '#FFFFFF', photo: { bg: '#F6E7BF', ring: '#EED598', ring2: '#E3BE6A' }, deliveryEta: '19 min', pickupEta: '10 min', deliveryFee: 1.49, distanceKm: 1.6, address: '9 Kennedy Rd S', rating: 4.4, combinable: true },
  { id: 'jerk-junction', name: 'Jerk Junction', kind: 'restaurant', category: 'Restaurants', cuisine: 'Caribbean', mono: 'JJ', logoBg: '#FFFFFF', logoFg: '#2F5D3A', photo: { bg: '#D9E8D4', ring: '#C2DAB9', ring2: '#A7C99A' }, deliveryEta: '24 min', pickupEta: '12 min', deliveryFee: 2.29, distanceKm: 2.4, address: '25 Peel Centre Dr', rating: 4.9, promo: 'Buy 1, get 1', combinable: true },
  { id: 'tandoor-flame', name: 'Tandoor Flame', kind: 'restaurant', category: 'Restaurants', cuisine: 'Punjabi · Tandoori', mono: 'TF', logoBg: '#1C1A17', logoFg: '#FF6819', photo: { bg: '#F7D8B5', ring: '#F0C08D', ring2: '#E6A35F' }, deliveryEta: '26 min', pickupEta: '15 min', deliveryFee: 2.49, distanceKm: 3.0, address: '8 Steeles Ave E', rating: 4.8, promo: '20% off first order', combinable: true },
  { id: 'cedar-grill', name: 'Cedar Grill', kind: 'restaurant', category: 'Restaurants', cuisine: 'Lebanese · Shawarma', mono: 'CG', logoBg: '#2F5D3A', logoFg: '#FFFFFF', photo: { bg: '#E6E1D3', ring: '#D7CFB9', ring2: '#C4B897' }, deliveryEta: '22 min', pickupEta: '12 min', deliveryFee: 2.49, distanceKm: 2.1, address: '480 Vodden St', rating: 4.6, combinable: true },

  { id: 'freshfields', name: 'FreshFields Market', kind: 'grocery', category: 'Grocery', cuisine: 'Grocery', mono: 'FF', logoBg: '#2F7A52', logoFg: '#FFFFFF', photo: { bg: '#E3F1EA', ring: '#C8E3D3', ring2: '#A7D1B8' }, deliveryEta: '29 min', pickupEta: '15 min', deliveryFee: 2.49, distanceKm: 1.4, address: '150 Bovaird Dr W', rating: 4.8, hours: 'Open till 10 pm', combinable: true },
  { id: 'corner-24', name: 'Corner 24', kind: 'grocery', category: 'Convenience', cuisine: 'Convenience', mono: '24', logoBg: '#F4B43C', logoFg: '#1C1A17', photo: { bg: '#FDF1D8', ring: '#F7E1AE', ring2: '#EFCB7A' }, deliveryEta: '18 min', pickupEta: '5 min', deliveryFee: 1.99, distanceKm: 0.4, address: '12 Queen St W', rating: 4.6, hours: 'Open 24 hours', combinable: true },
  { id: 'green-cross', name: 'Green Cross Pharmacy', kind: 'grocery', category: 'Pharmacy', cuisine: 'Pharmacy', mono: 'GC', logoBg: '#2E5E9E', logoFg: '#FFFFFF', photo: { bg: '#E2ECF7', ring: '#C9DBF0', ring2: '#A9C4E5' }, deliveryEta: '29 min', pickupEta: '15 min', deliveryFee: 2.99, distanceKm: 1.8, address: '99 Main St S', rating: 4.9, hours: 'Open till 9 pm', combinable: true },
  { id: 'vine-barrel', name: 'Vine & Barrel', kind: 'grocery', category: 'Alcohol', cuisine: 'Beer & wine · 19+', mono: 'VB', logoBg: '#5B2E4F', logoFg: '#FFFFFF', photo: { bg: '#ECE6F5', ring: '#DCD1EC', ring2: '#C7B6E0' }, deliveryEta: '39 min', pickupEta: '15 min', deliveryFee: 3.99, distanceKm: 2.9, address: '300 Queen St E', rating: 4.5, hours: 'Open till 11 pm', combinable: false },
];

export const items: MenuItem[] = [
  { id: 'butter-chicken', storeId: 'saffron-house', section: 'Popular', name: 'Butter Chicken', description: 'Tandoori chicken in a tomato-cream sauce, with basmati rice.', price: 17.99, badge: '#1 most ordered', tint: '#F6D3C4' },
  { id: 'dum-biryani', storeId: 'saffron-house', section: 'Popular', name: 'Chicken Dum Biryani', description: 'Slow-cooked saffron rice, raita on the side.', price: 18.49, tint: '#FDF1D8' },
  { id: 'garlic-naan', storeId: 'saffron-house', section: 'Breads', name: 'Garlic Naan (2 pc)', description: 'Fresh from the tandoor, brushed with garlic butter.', price: 4.99, tint: '#ECE6F5' },
  { id: 'mango-lassi', storeId: 'saffron-house', section: 'Drinks', name: 'Mango Lassi', description: 'Chilled yogurt and Alphonso mango.', price: 4.49, tint: '#FDE0B8' },

  { id: 'bananas', storeId: 'freshfields', section: 'Produce', name: 'Bananas', size: 'per lb · about 5 in a bunch', price: 0.79, tint: '#FDF1D8' },
  { id: 'milk-4l', storeId: 'freshfields', section: 'Dairy', name: '2% Milk', size: '4 L bag', price: 6.49, tint: '#E2ECF7' },
  { id: 'eggs-12', storeId: 'freshfields', section: 'Dairy', name: 'Large Eggs', size: '12 pack · Grade A', price: 4.29, tint: '#FFE3D3' },
  { id: 'spinach', storeId: 'freshfields', section: 'Produce', name: 'Organic Baby Spinach', size: '312 g clamshell', price: 4.99, tint: '#E3F1EA' },
  { id: 'bread', storeId: 'freshfields', section: 'Bakery', name: 'Sourdough Loaf', size: '680 g', price: 5.49, tint: '#F1E4CF' },
  { id: 'chips', storeId: 'freshfields', section: 'Snacks', name: 'Kettle Chips', size: '220 g', price: 3.99, tint: '#FFE3D3' },
];

export const deals = [
  { id: 'd1', big: '2×1', small: 'BOGO', bg: '#FF6819', fg: '#1C1A17', title: 'Buy 1, get 1 free', store: 'Tandoor Flame · mains', storeId: 'tandoor-flame' },
  { id: 'd2', big: '$5', small: 'off', bg: '#1C1A17', fg: '#FFFFFF', title: '$5 off orders $30+', store: "Nonna's Slice", storeId: 'nonnas-slice' },
  { id: 'd3', big: '$0', small: 'fee', bg: '#2F7A52', fg: '#FFFFFF', title: 'Free combined delivery', store: 'Add a grocery store', storeId: 'freshfields' },
];

export const getStore = (id: string) => stores.find((s) => s.id === id);
export const getItems = (storeId: string) => items.filter((i) => i.storeId === storeId);
export const money = (n: number) => `$${n.toFixed(2)}`;
