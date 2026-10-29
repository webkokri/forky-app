import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useCatalog } from './catalog';
import type { MenuItem, Store } from './data';

export type Mode = 'delivery' | 'pickup';

type CartLine = { item: MenuItem; qty: number };
type CartGroup = { store: Store; lines: CartLine[]; subtotal: number };

type CartState = {
  mode: Mode;
  setMode: (m: Mode) => void;
  qty: (itemId: string) => number;
  add: (itemId: string) => void;
  remove: (itemId: string) => void;
  clear: () => void;
  groups: CartGroup[];
  count: number;
  subtotal: number;
  /** One fee for the whole trip: the highest fee among the stores in the cart. */
  deliveryFee: number;
  /** What separate orders would have cost in delivery fees. */
  separateFees: number;
};

const CartContext = createContext<CartState | null>(null);


export function CartProvider({ children }: { children: ReactNode }) {
  const { getStore, allItems } = useCatalog();
  const [mode, setMode] = useState<Mode>('delivery');
  const [lines, setLines] = useState<Record<string, number>>({});

  const value = useMemo<CartState>(() => {
    const byStore = new Map<string, CartGroup>();
    for (const item of allItems) {
      const q = lines[item.id] ?? 0;
      if (q <= 0) continue;
      const store = getStore(item.storeId);
      if (!store) continue;
      const g = byStore.get(store.id) ?? { store, lines: [], subtotal: 0 };
      g.lines.push({ item, qty: q });
      g.subtotal += q * item.price;
      byStore.set(store.id, g);
    }
    const groups = [...byStore.values()];
    const fees = groups.map((g) => g.store.deliveryFee);
    return {
      mode,
      setMode,
      qty: (id) => lines[id] ?? 0,
      add: (id) => setLines((l) => ({ ...l, [id]: (l[id] ?? 0) + 1 })),
      remove: (id) => setLines((l) => ({ ...l, [id]: Math.max(0, (l[id] ?? 0) - 1) })),
      clear: () => setLines({}),
      groups,
      count: groups.reduce((n, g) => n + g.lines.reduce((m, l) => m + l.qty, 0), 0),
      subtotal: groups.reduce((n, g) => n + g.subtotal, 0),
      deliveryFee: fees.length ? Math.max(...fees) : 0,
      separateFees: fees.reduce((a, b) => a + b, 0),
    };
  }, [mode, lines, getStore, allItems]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
