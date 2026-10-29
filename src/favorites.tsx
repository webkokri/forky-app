import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '@/api';
import { useAuth } from '@/auth';

type FavState = {
  isFavorite: (apiId?: string) => boolean;
  /** Saves/unsaves a store; sends signed-out users to sign in. */
  toggle: (apiId?: string) => Promise<void>;
  count: number;
};
const Ctx = createContext<FavState | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const uid = user?.id;

  useEffect(() => {
    if (!uid) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clears saved stores on sign-out
      setIds(new Set());
      return;
    }
    api.favoriteIds().then((l) => setIds(new Set(l))).catch(() => {});
  }, [uid]);

  const toggle = useCallback(async (apiId?: string) => {
    if (!apiId) return;
    if (!uid) return void router.push('/sign-in');
    const had = ids.has(apiId);
    setIds((s) => { const n = new Set(s); if (had) n.delete(apiId); else n.add(apiId); return n; });
    try {
      if (had) await api.removeFavorite(apiId); else await api.addFavorite(apiId);
    } catch {
      setIds((s) => { const n = new Set(s); if (had) n.add(apiId); else n.delete(apiId); return n; });
    }
  }, [ids, uid]);

  const value = useMemo<FavState>(() => ({ isFavorite: (id) => !!id && ids.has(id), toggle, count: ids.size }), [ids, toggle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFavorites() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useFavorites must be used inside <FavoritesProvider>');
  return ctx;
}
