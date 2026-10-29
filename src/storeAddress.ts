import { useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { http } from '@/api/client';
import type { Store } from '@/data';

export type StoreAddress = { line: string; lat: number; lng: number };

// The store list doesn't carry addresses; each store's detail does. Fetch lazily, cache forever,
// and run at most 4 requests at once so a screen full of cards doesn't flood a slow connection.
const cache = new Map<string, Promise<StoreAddress | null>>();
const waiting: (() => void)[] = [];
let active = 0;
const MAX = 4;

const pump = () => {
  while (active < MAX && waiting.length) { active++; waiting.shift()!(); }
};

export function loadStoreAddress(slug: string): Promise<StoreAddress | null> {
  let p = cache.get(slug);
  if (!p) {
    p = new Promise<StoreAddress | null>((resolve) => {
      waiting.push(async () => {
        try {
          const d = await http(`/public/restaurants/${slug}`, { auth: false, params: { perCategory: 1 } });
          const a = d?.restaurant?.address;
          resolve(a && a.lat != null && a.lng != null ? { line: [a.line1, a.city].filter(Boolean).join(', '), lat: a.lat, lng: a.lng } : null);
        } catch {
          cache.delete(slug); // allow a retry later
          resolve(null);
        } finally {
          active--; pump();
        }
      });
      pump();
    });
    cache.set(slug, p);
  }
  return p;
}

/** Address of a store: from the store itself if known, otherwise fetched. `undefined` while loading, `null` if unavailable. */
export function useStoreAddress(store: Pick<Store, 'id' | 'fullAddress' | 'lat' | 'lng'>): StoreAddress | null | undefined {
  const known = store.fullAddress && store.lat != null && store.lng != null ? { line: store.fullAddress, lat: store.lat, lng: store.lng } : null;
  const hasKnown = known !== null;
  const [fetched, setFetched] = useState<{ id: string; addr: StoreAddress | null } | null>(null);
  useEffect(() => {
    if (hasKnown) return;
    let live = true;
    loadStoreAddress(store.id).then((addr) => { if (live) setFetched({ id: store.id, addr }); });
    return () => { live = false; };
  }, [store.id, hasKnown]);
  if (known) return known;
  return fetched?.id === store.id ? fetched.addr : undefined;
}

/** Opens the platform's maps app at the store's location. */
export function openInMaps(addr: Pick<StoreAddress, 'lat' | 'lng'>, name: string) {
  const label = encodeURIComponent(name);
  const url = Platform.select({
    ios: `http://maps.apple.com/?ll=${addr.lat},${addr.lng}&q=${label}`,
    android: `geo:${addr.lat},${addr.lng}?q=${addr.lat},${addr.lng}(${label})`,
    default: `https://www.google.com/maps/search/?api=1&query=${addr.lat},${addr.lng}`,
  });
  Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${addr.lat},${addr.lng}`));
}
