import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type Vertical } from '@/api';
import { useCart } from '@/cart';
import { useCatalog } from '@/catalog';
import type { Store } from '@/data';

export type StoreQuery = { vertical?: Vertical; storeType?: string; cuisine?: string; q?: string; sort?: string; openNow?: boolean };

const PAGE = 50; // largest page the API serves
const MAX_PAGES = 10;

/** Nearest first; stores without a distance go last. */
export const byDistance = (a: Store, b: Store) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);

/**
 * Stores for a query, ordered by distance from the chosen address (nearest on top, then the next
 * ring, and so on). The API's own order groups by delivery zone, so for the default "nearest" sort
 * every page is fetched and sorted here; other sorts (rating, speed…) keep the API's order.
 * The list is revealed 10 at a time as you scroll — call `loadMore()` from onEndReached / a scroll handler.
 */
export function useSortedStores(query: StoreQuery, pageSize = 10) {
  const { geo } = useCatalog();
  const { mode } = useCart();
  const fulfilment = mode === 'pickup' ? 'PICKUP' : undefined;
  const sort = query.sort ?? 'distance';
  const key = JSON.stringify([query, sort, geo?.lat, geo?.lng, fulfilment]);
  const ready = geo !== null;

  const [state, setState] = useState<{ key: string; all: Store[]; error: boolean }>({ key: '', all: [], error: false });
  const [shown, setShown] = useState({ key: '', n: pageSize });
  const [attempt, setAttempt] = useState(0);
  const runId = useRef(0);

  useEffect(() => {
    if (!ready) return;
    const id = ++runId.current;
    (async () => {
      try {
        // Without a fulfilment filter the API hides stores outside the delivery area, so also ask for
        // pickup-capable stores and merge — the list then holds every store near the address.
        const fetchAll = async (fulfil?: 'PICKUP') => {
          const out: Store[] = [];
          for (let page = 1; page <= MAX_PAGES; page++) {
            const res = await api.storesPage({ ...query, sort, fulfilment: fulfil, ...(geo ?? {}) }, page, PAGE);
            out.push(...res.items);
            if (page >= res.meta.totalPages) break;
          }
          return out;
        };
        const lists = await Promise.all([fetchAll(fulfilment), ...(fulfilment ? [] : [fetchAll('PICKUP')])]);
        const all: Store[] = [];
        const seen = new Set<string>();
        for (const st of lists.flat()) if (!seen.has(st.id)) { seen.add(st.id); all.push(st); }
        if (id === runId.current) setState({ key, all: sort === 'distance' ? all.sort(byDistance) : all, error: false });
      } catch {
        if (id === runId.current) setState({ key, all: [], error: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures query, sort, location and mode
  }, [key, ready, attempt]);

  const current = state.key === key;
  const n = shown.key === key ? shown.n : pageSize;
  const all = current ? state.all : [];

  const loadMore = useCallback(() => {
    setShown((s) => ({ key, n: (s.key === key ? s.n : pageSize) + pageSize }));
  }, [key, pageSize]);
  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  return {
    items: all.slice(0, n),
    total: all.length,
    loading: !ready || !current,
    loadingMore: false,
    hasMore: n < all.length,
    error: current && state.error,
    loadMore,
    retry,
  };
}

/** True when a scroll event is within `threshold` px of the end of the content. */
export const nearEnd = (e: { nativeEvent: { layoutMeasurement: { height: number }; contentOffset: { y: number }; contentSize: { height: number } } }, threshold = 600) => {
  const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
  return layoutMeasurement.height + contentOffset.y >= contentSize.height - threshold;
};

/** Pull-to-refresh state for a screen: `refreshing` + `onRefresh` for <RefreshControl>. Keeps the spinner up for at least ~0.7 s so it feels deliberate. */
export function usePullRefresh(reload: () => Promise<unknown> | unknown) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([Promise.resolve(reload()).catch(() => {}), new Promise((r) => setTimeout(r, 700))]);
    } finally {
      setRefreshing(false);
    }
  }, [reload]);
  return { refreshing, onRefresh };
}
