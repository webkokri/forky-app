import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { SavedCard } from '@/app/cards';

// The customer's saved cards (brand, last 4, expiry, Stripe ids: never card numbers) and the card chosen for checkout are kept on the phone,
// per account, so the checkout shows the card at once and also when the network is slow. The server stays the source of truth: the list is refreshed from it.
const key = (uid: string) => `forky_cards_${uid.replace(/[^A-Za-z0-9._-]/g, '')}`;

export type CardCache = { cards: SavedCard[]; chosen: string | null };

const read = async (k: string) => {
  try {
    return Platform.OS === 'web' ? globalThis.localStorage?.getItem(k) ?? null : await SecureStore.getItemAsync(k);
  } catch {
    return null;
  }
};
const write = async (k: string, v: string | null) => {
  try {
    if (Platform.OS === 'web') {
      if (v === null) globalThis.localStorage?.removeItem(k);
      else globalThis.localStorage?.setItem(k, v);
    } else if (v === null) await SecureStore.deleteItemAsync(k);
    else await SecureStore.setItemAsync(k, v);
  } catch {
    /* the cache is a convenience only */
  }
};

export const cardCache = {
  async load(uid: string): Promise<CardCache> {
    try {
      const raw = await read(key(uid));
      const j = raw ? JSON.parse(raw) : null;
      return { cards: Array.isArray(j?.cards) ? j.cards : [], chosen: typeof j?.chosen === 'string' ? j.chosen : null };
    } catch {
      return { cards: [], chosen: null };
    }
  },
  async save(uid: string, c: CardCache) {
    // SecureStore values are limited to ~2 KB: keep only what the checkout shows
    const slim = c.cards.slice(0, 6).map((x) => ({ id: x.id, brand: x.brand, last4: x.last4, expMonth: x.expMonth, expYear: x.expYear, isDefault: x.isDefault }));
    await write(key(uid), JSON.stringify({ cards: slim, chosen: c.chosen }));
  },
  async clear(uid: string) {
    await write(key(uid), null);
  },
};
